const express = require("express");
const router = express.Router();
const Character = require("../models/Character");
const authMiddleware = require("../middleware/authMiddleware");

function assignVoice(personality, gender) {
  const p = (personality || "").toLowerCase();

  const femaleVoices = [12, 45, 68, 90, 120, 150, 180];
  
  const maleVoices = [220, 250, 280, 310, 340, 370, 400];

  if (gender === "female") {
    if (p.includes("shy") || p.includes("cute") || p.includes("soft")) return 12;
    if (p.includes("caring") || p.includes("kind")) return 45;
    if (p.includes("energetic") || p.includes("funny")) return 90;
    if (p.includes("cold") || p.includes("serious")) return 120;
    return femaleVoices[Math.floor(Math.random() * femaleVoices.length)];
  }

  if (gender === "male") {
    if (p.includes("dominant") || p.includes("confident")) return 220;
    if (p.includes("cold") || p.includes("serious")) return 250;
    if (p.includes("kind") || p.includes("caring")) return 280;
    if (p.includes("funny")) return 310;
    return maleVoices[Math.floor(Math.random() * maleVoices.length)];
  }

  return Math.floor(Math.random() * 700);
}

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { name, personality, emotion, description, image, visibility, voice, gender,
            startAffection, startTrust, startIntimacy } = req.body;

    const speakerId = (voice && voice.speakerId) || assignVoice(personality, gender);

    const character = new Character({
      userId: req.userId,
      name,
      personality,
      emotion,
      description,
      image,
      startAffection: startAffection || 0,
      startTrust: startTrust || 0,
      startIntimacy: startIntimacy || 0,
      visibility,
      voice: {
        ...voice,
        speakerId,
        gender: gender || "female"
      }
    });

    await character.save();
    res.json(character);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/my", authMiddleware, async (req, res) => {
  const characters = await Character.find({ userId: req.userId });
  res.json(characters);
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const character = await Character.findOne({ _id: req.params.id, userId: req.userId });
    if (!character) return res.status(404).json({ error: "Character not found" });
    res.json(character);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit a character you own. Only the owner's doc is matched, so this is the
// authorization check. Relationship start-stats aren't editable here — the
// relationship already exists once a chat has begun.
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { name, personality, description, image, gender, visibility } = req.body;
    if (name !== undefined && !name.trim())
      return res.status(400).json({ message: "Name cannot be empty" });

    const updates = { name, personality, description, image, gender, visibility };
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const character = await Character.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: updates },
      { new: true }
    );
    if (!character) return res.status(404).json({ error: "Character not found" });
    res.json(character);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Memory = require("../models/Memory");
const Relationship = require("../models/Relationship");

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const characterId = req.params.id;
    const userId = req.userId;

    await Character.deleteOne({ _id: characterId, userId });

    const chats = await Chat.find({ characterId, userId });
    const chatIds = chats.map(chat => chat._id);

    await Chat.deleteMany({ characterId, userId });
    await Message.deleteMany({ chatId: { $in: chatIds } });

    await Memory.deleteMany({ characterId, userId });

    await Relationship.deleteMany({ characterId, userId });

    res.json({ message: "Character and all related data deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
