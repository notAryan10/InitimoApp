const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
    required: true
  },
  sender: {
    type: String,
    enum: ["user", "character"],
    required: true
  },
  text: String,
  type: {
    type: String,
    enum: ["intro", "chat", "return_greeting"],
    default: "chat"
  },
  audioUrl: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Message", MessageSchema);
