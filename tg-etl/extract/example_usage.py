"""
Example usage of the Telegram Parser library
"""

import asyncio
import sys
import os

# Add the extract directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from telegram_parser import TelegramParser, extract_channel, extract_channels


async def example_single_channel():
    """Example: Extract from a single channel"""
    print("=== Single Channel Extraction ===")
    
    # Method 1: Using convenience function
    try:
        output_file = await extract_channel(
            identifier="militarysummary",
            config_path="config.ini",
            limit=50  # Extract last 50 messages
        )
        print(f"Extracted to: {output_file}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Method 2: Using the parser class directly
    try:
        parser = TelegramParser("config.ini")
        await parser.connect()
        
        # Get messages as Python objects
        messages = await parser.extract_messages("militarysummary", limit=10)
        print(f"Extracted {len(messages)} messages")
        
        # Print first message as example
        if messages:
            first_msg = messages[0]
            print(f"First message: {first_msg['text'][:100]}...")
        
        await parser.disconnect()
    except Exception as e:
        print(f"Error: {e}")


async def example_multiple_channels():
    """Example: Extract from multiple channels"""
    print("\n=== Multiple Channels Extraction ===")
    
    channels = ["militarysummary", "ClashReport"]
    
    try:
        output_files = await extract_channels(
            identifiers=channels,
            config_path="config.ini",
            limit_per_channel=25
        )
        
        print(f"Extracted from {len(output_files)} channels:")
        for file_path in output_files:
            print(f"  - {file_path}")
            
    except Exception as e:
        print(f"Error: {e}")


async def example_custom_parser():
    """Example: Using the parser with custom settings"""
    print("\n=== Custom Parser Usage ===")
    
    try:
        parser = TelegramParser("config.ini")
        await parser.connect()
        
        # Extract with custom parameters
        output_file = await parser.extract_to_jsonl(
            identifier="militarysummary",
            limit=100,
            reverse=True,  # Get oldest messages first
            offset_id=0
        )
        
        print(f"Custom extraction completed: {output_file}")
        
        await parser.disconnect()
        
    except Exception as e:
        print(f"Error: {e}")


async def example_entity_resolution():
    """Example: Different ways to specify channels"""
    print("\n=== Entity Resolution Examples ===")
    
    try:
        parser = TelegramParser("config.ini")
        await parser.connect()
        
        # Different ways to specify the same channel
        identifiers = [
            "militarysummary",      # Username without @
            "@militarysummary",     # Username with @
            "https://t.me/militarysummary",  # Invite link
            # "1234567890",         # Channel ID (if you have it)
        ]
        
        for identifier in identifiers:
            try:
                entity = await parser.get_entity(identifier)
                print(f"✓ Resolved '{identifier}' -> {getattr(entity, 'title', 'Unknown')}")
            except Exception as e:
                print(f"✗ Failed to resolve '{identifier}': {e}")
        
        await parser.disconnect()
        
    except Exception as e:
        print(f"Error: {e}")


async def main():
    """Run all examples"""
    print("Telegram Parser Examples")
    print("=" * 50)
    
    # Check if config exists
    if not os.path.exists("config.ini"):
        print("❌ config.ini not found!")
        print("Please create config.ini with your Telegram API credentials:")
        print("""
[telegram]
api_id = YOUR_API_ID_HERE
api_hash = YOUR_API_HASH_HERE

[extraction]
output_dir = ../data/unprocessed
session_file = ../extract_session.session
batch_size = 100
max_messages = 1000
        """)
        return
    
    # Run examples
    await example_single_channel()
    await example_multiple_channels()
    await example_custom_parser()
    await example_entity_resolution()
    
    print("\n" + "=" * 50)
    print("Examples completed!")


if __name__ == "__main__":
    asyncio.run(main()) 