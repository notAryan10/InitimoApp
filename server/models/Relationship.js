const mongoose = require("mongoose");

const RelationshipSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  characterId: mongoose.Schema.Types.ObjectId,
  affection: { type: Number, default: 0 },
  trust: { type: Number, default: 0 },
  intimacy: { type: Number, default: 0 },
  anger: { type: Number, default: 0 },
  eventTriggered: {
    type: Map,
    of: Boolean,
    default: {}
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


module.exports = mongoose.model("Relationship", RelationshipSchema);
