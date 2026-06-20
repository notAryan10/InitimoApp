const Message = require("../models/Message");

async function getLastMessages(chatId) {
  const messages = await Message.find({ chatId })
    .sort({ createdAt: -1 })
    .limit(6);

  return messages.reverse();
}

module.exports = { getLastMessages };
