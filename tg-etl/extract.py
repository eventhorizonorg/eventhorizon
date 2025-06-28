#!/usr/bin/env python3
"""
extract_telegram_messages.py
----------------------------

Dump **all** messages from one or more Telegram channels into JSON-Lines files
inside ./data/unprocessed.  Each line is a single JSON object:

{
  "channel": "ClashReport",
  "link": "https://t.me/ClashReport/21300",
  "text": "…",
  "timestamp": "2025-06-28T19:31:17+00:00",
  "id": 21300
}

• Add -d N to back-fill the last N days, or omit -d to live-stream.
• Requires TG_API_ID and TG_API_HASH in env or .env file.
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from telethon import TelegramClient, events

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, continue without it

# ────────────────────────────── basic config ─────────────────────────────
DATA_DIR = Path("./data/unprocessed")
SESSION  = "extract_session"  # local *.session file name

# ──────────────────────────── helper functions ──────────────────────────
def ensure_output_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def make_outfile() -> Path:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return DATA_DIR / f"msgs_{ts}.jsonl"


def build_permalink(msg, chat) -> str | None:
    """
    Create a Telegram web link for this message if possible.
    • Public channels with a @username →  https://t.me/<username>/<msg_id>
    • Private/supergroups without username → https://t.me/c/<internal>/<msg_id>
      (strip the '-100' prefix)
    """
    username = getattr(chat, "username", None)
    if username:                                   # public channel
        return f"https://t.me/{username}/{msg.id}"

    cid = str(chat.id)
    if cid.startswith("-100"):                     # private / super-group
        return f"https://t.me/c/{cid[4:]}/{msg.id}"
    return None


def extract_message_text(msg) -> str:
    """
    Extract all possible text content from a Telegram message.
    Handles text messages, media captions, forwarded messages, and replies.
    """
    text_parts = []
    
    # Main message text
    if hasattr(msg, 'text') and msg.text:
        text_parts.append(msg.text)
    
    # Media caption
    if hasattr(msg, 'caption') and msg.caption:
        text_parts.append(msg.caption)
    
    # Forwarded message text
    if hasattr(msg, 'forward') and msg.forward and hasattr(msg.forward, 'text') and msg.forward.text:
        text_parts.append(f"[Forwarded: {msg.forward.text}]")
    
    # Reply text
    if hasattr(msg, 'reply_to') and msg.reply_to and hasattr(msg.reply_to, 'text') and msg.reply_to.text:
        text_parts.append(f"[Reply to: {msg.reply_to.text}]")
    
    # Raw message (fallback for some message types)
    if hasattr(msg, 'message') and msg.message and not (hasattr(msg, 'text') and msg.text):
        text_parts.append(msg.message)
    
    return " ".join(text_parts) if text_parts else ""


def dump_msg(msg, chat, fh) -> None:
    record = {
        "channel": getattr(chat, "title", chat.username or str(chat.id)),
        "link":   build_permalink(msg, chat),
        "text":   extract_message_text(msg),
        "timestamp": msg.date.astimezone(timezone.utc).isoformat(),
        "id": msg.id,
    }
    fh.write(json.dumps(record, ensure_ascii=False) + "\n")
    fh.flush()

# ──────────────────────────── async workers ─────────────────────────────
async def fetch_history(client, channels, days_back, fh):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
    for chan in channels:
        chat = await client.get_entity(chan)
        async for msg in client.iter_messages(chat):           # newest→oldest
            if msg.date < cutoff:
                break
            dump_msg(msg, chat, fh)


async def stream_live(client, channels, fh):
    @client.on(events.NewMessage(chats=channels))
    async def handler(event):
        chat = await event.get_chat()
        dump_msg(event.message, chat, fh)

    print("🟢  Streaming…  (Ctrl-C to quit)", file=sys.stderr)
    await client.run_until_disconnected()

# ──────────────────────────── main entry point ──────────────────────────
async def main_async(args):
    ensure_output_dir()
    out_path = make_outfile()

    api_id   = int(os.getenv("TG_API_ID", "0"))
    api_hash = os.getenv("TG_API_HASH")
    if not api_id or not api_hash:
        sys.exit("❌  Please set TG_API_ID and TG_API_HASH environment variables")

    async with TelegramClient(SESSION, api_id, api_hash) as client:
        with out_path.open("w", encoding="utf-8") as fh:
            if args.days > 0:
                await fetch_history(client, args.channels, args.days, fh)
            else:
                await stream_live(client, args.channels, fh)

    print(f"✅  Output written to {out_path}", file=sys.stderr)

# ───────────────────────── argparse / wrapper ───────────────────────────
def parse_args():
    p = argparse.ArgumentParser(description="Dump raw Telegram messages to JSONL")
    p.add_argument("-c", "--channels", nargs="+", required=True,
                   help="Channel usernames / @handles / t.me links")
    p.add_argument("-d", "--days", type=int, default=0,
                   help="Days of history to fetch (0 = live stream)")
    return p.parse_args()

def main():
    asyncio.run(main_async(parse_args()))

if __name__ == "__main__":
    main()