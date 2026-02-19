// test-local.js
require('dotenv').config();
const bot = require('./lib/bot');

console.log('🤖 Telegram Bot is starting...');
console.log('✅ Press Ctrl+C to stop');
console.log('');
console.log('Open Telegram and send /start to your bot!');
console.log('');

// Start bot in polling mode (for local testing only)
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => {
  console.log('\n👋 Stopping bot...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('\n👋 Stopping bot...');
  bot.stop('SIGTERM');
});