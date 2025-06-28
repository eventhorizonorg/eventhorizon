# Telegram Parser - Extract Module

A Python library for extracting messages from Telegram channels, users, and chats. Based on `xirrer/telegram_parser` with enhanced Python interface and better text extraction.

## Features

- **Multiple Input Formats**: Support for usernames, channel IDs, and invite links
- **Enhanced Text Extraction**: Extracts text from messages, captions, forwarded content, and replies
- **Flexible Output**: Return Python objects or save to JSONL files
- **Batch Processing**: Extract from multiple channels efficiently
- **Configurable**: Easy configuration via `config.ini` file
- **Session Management**: Automatic session handling for authentication

## Installation

1. Install required dependencies:
```bash
pip install telethon configparser
```

2. Set up your Telegram API credentials:
   - Go to https://my.telegram.org/apps
   - Create a new application
   - Get your `api_id` and `api_hash`

3. Configure the parser:
   - Copy your credentials to `config.ini`
   - Adjust extraction settings as needed

## Quick Start

### Basic Usage

```python
import asyncio
from extract.telegram_parser import extract_channel

# Extract from a single channel
async def main():
    output_file = await extract_channel(
        identifier="militarysummary",
        limit=100
    )
    print(f"Extracted to: {output_file}")

asyncio.run(main())
```

### Multiple Channels

```python
from extract.telegram_parser import extract_channels

async def main():
    channels = ["militarysummary", "ClashReport"]
    output_files = await extract_channels(
        identifiers=channels,
        limit_per_channel=50
    )
    print(f"Extracted to: {output_files}")

asyncio.run(main())
```

### Advanced Usage

```python
from extract.telegram_parser import TelegramParser

async def main():
    parser = TelegramParser("config.ini")
    await parser.connect()
    
    # Get messages as Python objects
    messages = await parser.extract_messages(
        identifier="militarysummary",
        limit=100,
        reverse=True  # Get oldest messages first
    )
    
    # Process messages
    for msg in messages:
        print(f"ID: {msg['id']}")
        print(f"Date: {msg['date']}")
        print(f"Text: {msg['text'][:100]}...")
        print(f"Source: {msg['source']['title']}")
        print("---")
    
    await parser.disconnect()

asyncio.run(main())
```

## Configuration

Create a `config.ini` file in the extract directory:

```ini
[telegram]
# Your Telegram API credentials
api_id = YOUR_API_ID_HERE
api_hash = YOUR_API_HASH_HERE

[extraction]
# Default extraction settings
output_dir = ../data/unprocessed
session_file = ../extract_session.session
batch_size = 100
max_messages = 1000
```

### Configuration Options

- **api_id**: Your Telegram API ID (integer)
- **api_hash**: Your Telegram API hash (string)
- **output_dir**: Directory for output JSONL files
- **session_file**: Path to session file for authentication
- **batch_size**: Number of messages to process before logging progress
- **max_messages**: Maximum messages to extract per channel (optional)

## Input Formats

The parser supports multiple ways to specify channels:

- **Username**: `"militarysummary"` or `"@militarysummary"`
- **Channel ID**: `"1234567890"` (numeric ID)
- **Invite Link**: `"https://t.me/militarysummary"`

## Output Format

Messages are extracted in the following JSON format:

```json
{
  "id": 12345,
  "date": "2024-01-15T10:30:00",
  "text": "Message text content...",
  "sender_id": "user123",
  "media_type": "MessageMediaPhoto",
  "media_url": null,
  "views": 1000,
  "forwards": 50,
  "reply_to": 12340,
  "forward_from": "channel456",
  "source": {
    "id": 987654321,
    "title": "Military Summary",
    "username": "militarysummary",
    "type": "Channel"
  },
  "raw_message": "Raw message object string"
}
```

## Text Extraction

The parser extracts text from multiple sources:

1. **Main message text** (`message.text`)
2. **Media captions** (`message.caption`)
3. **Forwarded message text** (with `[Forwarded]` prefix)
4. **Reply message text** (with `[Reply to]` prefix)
5. **Raw message content** (fallback)

## Error Handling

The parser includes comprehensive error handling:

- **Authentication errors**: Invalid API credentials
- **Entity resolution errors**: Channel not found or inaccessible
- **Rate limiting**: Automatic handling of Telegram API limits
- **Network errors**: Connection issues and timeouts

## Examples

Run the example script to see all features in action:

```bash
cd extract
python example_usage.py
```

## Integration with ETL Pipeline

This extractor is designed to work with the existing ETL pipeline:

1. **Extract**: Use this module to extract messages from Telegram
2. **Transform**: Use `transform.py` to process and geolocate messages
3. **Load**: Use the web app to visualize data on Mapbox

### Typical Workflow

```bash
# 1. Extract messages
cd extract
python -c "
import asyncio
from telegram_parser import extract_channel
asyncio.run(extract_channel('militarysummary', limit=1000))
"

# 2. Transform messages (from parent directory)
cd ..
python transform.py

# 3. View results in web app
python -m http.server 8000
# Open http://localhost:8000
```

## Troubleshooting

### Common Issues

1. **"Config file not found"**: Make sure `config.ini` exists in the extract directory
2. **"Please set api_id in config.ini"**: Add your Telegram API credentials
3. **"Could not resolve entity"**: Check channel username/ID is correct
4. **"Session password needed"**: Two-factor authentication required (not supported yet)

### Debug Mode

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## API Reference

### TelegramParser Class

#### Methods

- `__init__(config_path)`: Initialize parser with config file
- `connect()`: Connect to Telegram API
- `disconnect()`: Disconnect from API
- `get_entity(identifier)`: Resolve channel/user/chat entity
- `extract_messages(identifier, limit, offset_id, reverse)`: Extract messages as objects
- `extract_to_jsonl(identifier, output_file, limit, offset_id, reverse)`: Extract to JSONL file
- `extract_multiple_channels(identifiers, output_dir, limit_per_channel)`: Extract from multiple channels

### Convenience Functions

- `extract_channel(identifier, config_path, output_file, limit)`: Extract single channel
- `extract_channels(identifiers, config_path, output_dir, limit_per_channel)`: Extract multiple channels

## License

This module is part of the OpenConflict project and follows the same license terms. 