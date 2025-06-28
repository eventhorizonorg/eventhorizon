"""
Telegram Parser - Python library for extracting Telegram messages
Based on xirrer/telegram_parser with enhanced Python interface
"""

import asyncio
import json
import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Union, Any

import configparser
from telethon import TelegramClient, events
from telethon.tl.types import Message, Channel, User, Chat
from telethon.errors import SessionPasswordNeededError, FloodWaitError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TelegramParser:
    """Main Telegram parser class for extracting messages from channels/users"""
    
    def __init__(self, config_path: str = "config.ini"):
        """
        Initialize the Telegram parser
        
        Args:
            config_path: Path to config.ini file with API credentials
        """
        self.config = self._load_config(config_path)
        self.client = None
        self.session_file = self.config.get('extraction', 'session_file')
        
    def _load_config(self, config_path: str) -> configparser.ConfigParser:
        """Load configuration from config.ini file"""
        config = configparser.ConfigParser()
        
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Config file not found: {config_path}")
            
        config.read(config_path)
        
        # Validate required fields
        required_fields = ['api_id', 'api_hash']
        for field in required_fields:
            if not config.get('telegram', field) or config.get('telegram', field) == f'YOUR_{field.upper()}_HERE':
                raise ValueError(f"Please set {field} in {config_path}")
                
        return config
    
    async def connect(self) -> None:
        """Connect to Telegram API"""
        try:
            api_id = int(self.config.get('telegram', 'api_id'))
            api_hash = self.config.get('telegram', 'api_hash')
            
            self.client = TelegramClient(
                self.session_file,
                api_id,
                api_hash
            )
            
            await self.client.start()
            logger.info("Successfully connected to Telegram API")
            
        except Exception as e:
            logger.error(f"Failed to connect to Telegram API: {e}")
            raise
    
    async def disconnect(self) -> None:
        """Disconnect from Telegram API"""
        if self.client:
            await self.client.disconnect()
            logger.info("Disconnected from Telegram API")
    
    async def get_entity(self, identifier: str) -> Union[Channel, User, Chat]:
        """
        Get entity (channel/user/chat) by username, ID, or link
        
        Args:
            identifier: Username (with or without @), channel ID, or invite link
            
        Returns:
            Telegram entity object
        """
        try:
            # Try different methods to resolve the entity
            entity = None
            
            # Method 1: Direct username
            if identifier.startswith('@'):
                entity = await self.client.get_entity(identifier)
            elif not identifier.startswith('@') and not identifier.isdigit():
                entity = await self.client.get_entity(f"@{identifier}")
            
            # Method 2: Channel ID (if numeric)
            elif identifier.isdigit():
                entity = await self.client.get_entity(int(identifier))
            
            # Method 3: Invite link
            elif 't.me/' in identifier or 'telegram.me/' in identifier:
                entity = await self.client.get_entity(identifier)
            
            if entity:
                logger.info(f"Found entity: {getattr(entity, 'title', getattr(entity, 'username', 'Unknown'))}")
                return entity
            else:
                raise ValueError(f"Could not resolve entity: {identifier}")
                
        except Exception as e:
            logger.error(f"Failed to get entity {identifier}: {e}")
            raise
    
    def _extract_message_text(self, message: Message) -> str:
        """
        Extract text content from a message, including captions and forwarded content
        
        Args:
            message: Telegram message object
            
        Returns:
            Extracted text content
        """
        text_parts = []
        
        # Main message text
        if hasattr(message, 'text') and message.text:
            text_parts.append(message.text)
        
        # Caption (for media messages)
        if hasattr(message, 'caption') and message.caption:
            text_parts.append(message.caption)
        
        # Forwarded message text
        if hasattr(message, 'forward') and message.forward:
            if hasattr(message.forward, 'text') and message.forward.text:
                text_parts.append(f"[Forwarded] {message.forward.text}")
            if hasattr(message.forward, 'caption') and message.forward.caption:
                text_parts.append(f"[Forwarded Caption] {message.forward.caption}")
        
        # Reply message text
        if hasattr(message, 'reply_to') and message.reply_to:
            reply_msg = message.reply_to
            if hasattr(reply_msg, 'text') and reply_msg.text:
                text_parts.append(f"[Reply to] {reply_msg.text}")
            if hasattr(reply_msg, 'caption') and reply_msg.caption:
                text_parts.append(f"[Reply Caption] {reply_msg.caption}")
        
        # Raw message content (fallback)
        if not text_parts and hasattr(message, 'raw_text'):
            text_parts.append(message.raw_text)
        
        # Filter out None values and join
        filtered_parts = [part for part in text_parts if part is not None]
        return " | ".join(filtered_parts) if filtered_parts else ""
    
    def _generate_telegram_url(self, entity_info: Dict, message_id: int) -> str:
        """
        Generate a direct link to a Telegram post
        
        Args:
            entity_info: Information about the source entity
            message_id: Message ID
            
        Returns:
            Telegram post URL
        """
        username = entity_info.get('username')
        if username:
            return f"https://t.me/{username}/{message_id}"
        else:
            # Fallback for channels without username (using channel ID)
            channel_id = entity_info.get('id')
            if channel_id:
                return f"https://t.me/c/{channel_id}/{message_id}"
            else:
                return None

    def _message_to_dict(self, message: Message, entity_info: Dict) -> Dict[str, Any]:
        """
        Convert a Telegram message to a dictionary format
        
        Args:
            message: Telegram message object
            entity_info: Information about the source entity
            
        Returns:
            Dictionary representation of the message
        """
        # Extract text content
        text = self._extract_message_text(message)
        
        # Get message date
        date = message.date.isoformat() if hasattr(message, 'date') and message.date else None
        
        # Get message ID
        msg_id = message.id if hasattr(message, 'id') else None
        
        # Generate Telegram post URL
        telegram_url = self._generate_telegram_url(entity_info, msg_id) if msg_id else None
        
        # Get sender info
        sender = None
        if hasattr(message, 'sender_id'):
            sender = str(message.sender_id)
        
        # Get media info
        media_type = None
        media_url = None
        if hasattr(message, 'media') and message.media:
            media_type = type(message.media).__name__
            # Note: Media URLs require additional processing
        
        # Get views and reactions
        views = getattr(message, 'views', None)
        forwards = getattr(message, 'forwards', None)
        
        # Get reply info
        reply_to = None
        if hasattr(message, 'reply_to') and message.reply_to:
            reply_to = message.reply_to.id if hasattr(message.reply_to, 'id') else None
        
        # Get forward info
        forward_from = None
        if hasattr(message, 'forward') and message.forward:
            if hasattr(message.forward, 'chat_id'):
                forward_from = str(message.forward.chat_id)
        
        return {
            "id": msg_id,
            "date": date,
            "text": text,
            "telegram_url": telegram_url,
            "sender_id": sender,
            "media_type": media_type,
            "media_url": media_url,
            "views": views,
            "forwards": forwards,
            "reply_to": reply_to,
            "forward_from": forward_from,
            "source": entity_info,
            "raw_message": str(message)  # For debugging
        }
    
    async def extract_messages(
        self, 
        identifier: str, 
        limit: Optional[int] = None,
        offset_id: int = 0,
        reverse: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Extract messages from a channel/user/chat
        
        Args:
            identifier: Username, ID, or invite link
            limit: Maximum number of messages to extract (None for all)
            offset_id: Start from message ID (0 for most recent)
            reverse: If True, get messages in reverse order (oldest first)
            
        Returns:
            List of message dictionaries
        """
        try:
            # Get entity
            entity = await self.get_entity(identifier)
            
            # Prepare entity info
            entity_info = {
                "id": getattr(entity, 'id', None),
                "title": getattr(entity, 'title', None),
                "username": getattr(entity, 'username', None),
                "type": type(entity).__name__
            }
            
            # Get messages
            messages = []
            batch_size = int(self.config.get('extraction', 'batch_size', fallback=100))
            
            async for message in self.client.iter_messages(
                entity,
                limit=limit,
                offset_id=offset_id,
                reverse=reverse
            ):
                if message:
                    msg_dict = self._message_to_dict(message, entity_info)
                    messages.append(msg_dict)
                    
                    if len(messages) % batch_size == 0:
                        logger.info(f"Extracted {len(messages)} messages from {identifier}")
            
            logger.info(f"Total messages extracted from {identifier}: {len(messages)}")
            return messages
            
        except Exception as e:
            logger.error(f"Failed to extract messages from {identifier}: {e}")
            raise
    
    async def extract_to_jsonl(
        self, 
        identifier: str, 
        output_file: Optional[str] = None,
        limit: Optional[int] = None,
        offset_id: int = 0,
        reverse: bool = False
    ) -> str:
        """
        Extract messages and save to JSONL file
        
        Args:
            identifier: Username, ID, or invite link
            output_file: Output file path (auto-generated if None)
            limit: Maximum number of messages to extract
            offset_id: Start from message ID
            reverse: If True, get messages in reverse order
            
        Returns:
            Path to the output file
        """
        try:
            # Generate output filename if not provided
            if not output_file:
                timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")
                output_dir = self.config.get('extraction', 'output_dir')
                os.makedirs(output_dir, exist_ok=True)
                output_file = os.path.join(output_dir, f"msgs_{timestamp}.jsonl")
            
            # Extract messages
            messages = await self.extract_messages(
                identifier, 
                limit=limit, 
                offset_id=offset_id, 
                reverse=reverse
            )
            
            # Write to JSONL file
            with open(output_file, 'w', encoding='utf-8') as f:
                for msg in messages:
                    f.write(json.dumps(msg, ensure_ascii=False) + '\n')
            
            logger.info(f"Saved {len(messages)} messages to {output_file}")
            return output_file
            
        except Exception as e:
            logger.error(f"Failed to extract to JSONL: {e}")
            raise
    
    async def extract_multiple_channels(
        self, 
        identifiers: List[str], 
        output_dir: Optional[str] = None,
        limit_per_channel: Optional[int] = None
    ) -> List[str]:
        """
        Extract messages from multiple channels
        
        Args:
            identifiers: List of channel identifiers
            output_dir: Output directory (uses config default if None)
            limit_per_channel: Messages per channel limit
            
        Returns:
            List of output file paths
        """
        output_files = []
        
        for identifier in identifiers:
            try:
                logger.info(f"Extracting from {identifier}...")
                
                if output_dir:
                    timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")
                    output_file = os.path.join(output_dir, f"msgs_{identifier}_{timestamp}.jsonl")
                else:
                    output_file = None
                
                file_path = await self.extract_to_jsonl(
                    identifier, 
                    output_file=output_file,
                    limit=limit_per_channel
                )
                output_files.append(file_path)
                
            except Exception as e:
                logger.error(f"Failed to extract from {identifier}: {e}")
                continue
        
        return output_files


# Convenience functions for easy usage
async def extract_channel(
    identifier: str, 
    config_path: str = "config.ini",
    output_file: Optional[str] = None,
    limit: Optional[int] = None
) -> str:
    """
    Convenience function to extract messages from a single channel
    
    Args:
        identifier: Channel identifier
        config_path: Path to config file
        output_file: Output file path
        limit: Message limit
        
    Returns:
        Output file path
    """
    parser = TelegramParser(config_path)
    try:
        await parser.connect()
        return await parser.extract_to_jsonl(identifier, output_file, limit)
    finally:
        await parser.disconnect()


async def extract_channels(
    identifiers: List[str], 
    config_path: str = "config.ini",
    output_dir: Optional[str] = None,
    limit_per_channel: Optional[int] = None
) -> List[str]:
    """
    Convenience function to extract messages from multiple channels
    
    Args:
        identifiers: List of channel identifiers
        config_path: Path to config file
        output_dir: Output directory
        limit_per_channel: Messages per channel limit
        
    Returns:
        List of output file paths
    """
    parser = TelegramParser(config_path)
    try:
        await parser.connect()
        return await parser.extract_multiple_channels(identifiers, output_dir, limit_per_channel)
    finally:
        await parser.disconnect() 