const mongoose = require("mongoose");

const CharacterSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  personality: String,
  emotion: String,
  mood: { type: String, default: "Neutral" },
  description: String,
  image: String, // optional avatar/cover image URL
  // Seed stats for the user↔character relationship, set from backstory at creation.
  startAffection: { type: Number, default: 0 },
  startTrust: { type: Number, default: 0 },
  startIntimacy: { type: Number, default: 0 },
  visibility: {
    type: String,
    enum: ["private", "public"],
    default: "private"
  },
  voice: {
    speakerId: { type: Number, default: 0 },
    gender: {
      type: String,
      enum: ["male", "female"],
      default: "female"
    },
    style: {
      type: String,
      enum: ["soft", "cute", "serious", "deep", "energetic"],
      default: "soft"
    },
    pitch: { type: Number, default: 1.0 },
    rate: { type: Number, default: 1.0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Character", CharacterSchema);
