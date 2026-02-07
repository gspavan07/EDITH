import logging
import asyncio
import os
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters
from app.core.config import settings
import httpx

logger = logging.getLogger(__name__)

class TelegramBotService:
    def __init__(self):
        self.token = settings.TELEGRAM_BOT_TOKEN
        self.api_url = f"http://localhost:8000{settings.API_V1_STR}/chat/"
        self.enabled = settings.ENABLE_TELEGRAM
        self.agent_files_path = os.path.join(os.getcwd(), "agent_files")
        os.makedirs(self.agent_files_path, exist_ok=True)

    async def _process_chat_request(self, update: Update, text: str):
        chat_id = update.effective_chat.id
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    json={
                        "message": text,
                        "session_id": f"telegram_{chat_id}",
                        "user_id": 1
                    },
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    reply = data.get("response", "I'm sorry, I couldn't process that.")
                    
                    try:
                        # Try Markdown first for nice formatting
                        await update.message.reply_text(reply, parse_mode='Markdown')
                    except Exception as parse_err:
                        logger.warning(f"Markdown parse failed, falling back to plain text: {parse_err}")
                        # Fallback to plain text if Markdown is malformed
                        await update.message.reply_text(reply)
                else:
                    await update.message.reply_text("Error: Backend is not responding.")
        except Exception as e:
            logger.error(f"Telegram Adapter Error: {e}")
            await update.message.reply_text("Sorry, I encountered an internal error connecting to my core processing unit.")

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not update.message:
            return

        # Handle text messages
        if update.message.text:
            await self._process_chat_request(update, update.message.text)
        
        # Handle documents/photos with captions
        elif update.message.caption:
            await self._process_chat_request(update, update.message.caption)

    async def handle_document(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        doc = update.message.document
        file_name = doc.file_name
        dest_path = os.path.join(self.agent_files_path, file_name)
        
        await update.message.reply_text(f"📥 Receiving: `{file_name}`... (Indexing for V3.0 RAG)", parse_mode='Markdown')
        
        file = await context.bot.get_file(doc.file_id)
        await file.download_to_drive(dest_path)
        
        # Notify backend to index
        await self._process_chat_request(update, f"I have uploaded a document named '{file_name}'. Please index it and analyze it.")

    async def handle_photo(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        # Get highest resolution photo
        photo = update.message.photo[-1]
        file_name = f"telegram_photo_{update.message.message_id}.jpg"
        dest_path = os.path.join(self.agent_files_path, file_name)
        
        await update.message.reply_text("📸 Receiving image... Processing for Tactical Visual Intelligence.", parse_mode='Markdown')
        
        file = await context.bot.get_file(photo.file_id)
        await file.download_to_drive(dest_path)
        
        caption = update.message.caption or "Analyze this image."
        await self._process_chat_request(update, f"I have uploaded an image saved as '{file_name}'. {caption}")

    def run(self):
        if not self.enabled or not self.token:
            logger.warning("Telegram Bot is disabled or token is missing.")
            return

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        application = ApplicationBuilder().token(self.token).build()
        
        # Command & Text Handler
        application.add_handler(MessageHandler(filters.TEXT | filters.COMMAND, self.handle_message))
        
        # Document Handler
        application.add_handler(MessageHandler(filters.Document.ALL, self.handle_document))
        
        # Photo Handler
        application.add_handler(MessageHandler(filters.PHOTO, self.handle_photo))
        
        logger.info("Telegram Bot listener (V3.0 Files Support) starting...")
        application.run_polling(stop_signals=False)

if __name__ == "__main__":
    service = TelegramBotService()
    service.run()
