#!/usr/bin/env bash
# extract_tg.sh
# ------------------------------------------------------------
# Accountability ledger — list of public Telegram channels we
# currently extract with a 7‑day back‑fill. Run this script
# from the tg-etl directory.
#
# NOTE 2025‑06‑28: Private/unresolvable channels such as
# @OSINT_bdzholy are intentionally *omitted* until they expose
# a public username or invite link.
# ------------------------------------------------------------

set -e  # stop if any extraction fails

# Change to extract directory
cd extract

echo "🚀 Starting Telegram channel extraction..."
echo "📁 Output directory: ../data/unprocessed"
echo ""

# Middle East Spectator – last 7 days (approximately 100-200 messages)
echo "[+] Middle_East_Spectator" && \
python -c "
import asyncio
from telegram_parser import extract_channel
asyncio.run(extract_channel('Middle_East_Spectator', limit=200))
"

# Geopolitics Prime – last 7 days
echo "[+] geopolitics_prime" && \
python -c "
import asyncio
from telegram_parser import extract_channel
asyncio.run(extract_channel('geopolitics_prime', limit=200))
"

# ClashReport – last 7 days
echo "[+] ClashReport" && \
python -c "
import asyncio
from telegram_parser import extract_channel
asyncio.run(extract_channel('ClashReport', limit=200))
"

# War Monitor – last 7 days
echo "[+] WarMonitors" && \
python -c "
import asyncio
from telegram_parser import extract_channel
asyncio.run(extract_channel('WarMonitors', limit=200))
"

# Military Summary – last 7 days
echo "[+] militarysummary" && \
python -c "
import asyncio
from telegram_parser import extract_channel
asyncio.run(extract_channel('militarysummary', limit=200))
"

# Rybar in English – last 7 days
echo "[+] rybar_in_english" && \
python -c "
import asyncio
from telegram_parser import extract_channel
asyncio.run(extract_channel('rybar_in_english', limit=200))
"

# Deep State UA – last 7 days
echo "[+] DeepStateUA" && \
python -c "
import asyncio
from telegram_parser import extract_channel
asyncio.run(extract_channel('DeepStateUA', limit=200))
"

# OSINT Flow – last 7 days
echo "[+] OSINT_Flow" && \
python -c "
import asyncio
from telegram_parser import extract_channel
asyncio.run(extract_channel('OSINT_Flow', limit=200))
"

# Return to parent directory
cd ..

echo ""
echo "✅  All public channels extracted. Ledger up to date."
echo "📊 Files saved to: data/unprocessed/"
echo ""
echo "🔄 Next steps:"
echo "   1. Run: python transform.py"
echo "   2. Start web server: python -m http.server 8000"
echo "   3. Open: http://localhost:8000"