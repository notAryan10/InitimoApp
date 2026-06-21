const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Character = require("../models/Character");
const Relationship = require("../models/Relationship");
const authMiddleware = require("../middleware/authMiddleware");

const { getAIResponse } = require("../services/aiService");
const { analyzeMessage } = require("../services/analyzerService");
const { extractAndStoreMemory } = require("../services/memoryService");
const { getLastMessages } = require("../memory/memoryManager");
const { buildPrompt } = require("../prompt/promptBuilder");
const { updateEmotion } = require("../services/emotionEngine");
const { getRelationshipLevel } = require("../services/relationshipLevel");
const axios = require("axios");
const Memory = require("../models/Memory");
const { AI_URL } = require("../config");

async function generateInitialMessage(character) {
  try {
    const response = await axios.post(`${AI_URL}/generate-intro-scene`, {
      character_name: character.name,
      personality: character.personality,
      emotion: character.emotion,
      description: character.description
    });

    return response.data.intro;
  } catch (err) {
    console.error("Error generating intro:", err);
    return `*You see ${character.name} standing there.* "Hey there... I'm glad you're here."`;
  }
}

async function generateReturnGreeting(character, relationship, memoryText, hoursAway) {
  try {
    const levelInfo = relationship ? getRelationshipLevel(relationship) : { level: "Stranger" };
    const response = await axios.post(`${AI_URL}/generate-return-greeting`, {
      character_name: character.name,
      personality: character.personality,
      emotion: character.emotion,
      relationship_level: levelInfo.level,
      memory: memoryText,
      hours_away: hoursAway
    });
    return response.data.greeting;
  } catch (err) {
    console.error("Error generating return greeting:", err);
    return null;
  }
}

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { characterId, mode } = req.body;
    const userId = req.userId;

    let chat = await Chat.findOne({ userId, characterId });

    if (!chat) {
      chat = new Chat({
        userId,
        characterId,
        chatMode: mode || "romantic",
      });
      await chat.save();
    }

    // Seed the relationship from the character's starting stats so the meter
    // reflects the backstory (e.g. childhood friends) from the first open.
    const existing = await Relationship.findOne({ userId, characterId });
    if (!existing) {
      const character = await Character.findById(characterId);
      await Relationship.create({
        userId,
        characterId,
        affection: character?.startAffection || 0,
        trust: character?.startTrust || 0,
        intimacy: character?.startIntimacy || 0,
      });
    }

    res.json({ chatId: chat._id });

  } catch (err) {
    console.error("Error in /create:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/message", authMiddleware, async (req, res) => {
  const { chatId, message } = req.body;

  const chat = await Chat.findById(chatId);
  const character = await Character.findById(chat.characterId);

  let relationship = await Relationship.findOne({
    userId: req.userId,
    characterId: character._id,
  });

  if (!relationship) {
    relationship = new Relationship({
      userId: req.userId,
      characterId: character._id,
      affection: character.startAffection || 0,
      trust: character.startTrust || 0,
      intimacy: character.startIntimacy || 0,
    });
    await relationship.save();
  }

  const previousLevelInfo = getRelationshipLevel(relationship);

  relationship.affection = Math.max(0, relationship.affection - 0.1);
  relationship.trust = Math.max(0, relationship.trust - 0.05);
  relationship.intimacy = Math.max(0, relationship.intimacy - 0.08);

  const analysis = await analyzeMessage(message);

  if (analysis) {
    if (analysis.affection !== undefined) relationship.affection += analysis.affection;
    if (analysis.trust !== undefined) relationship.trust += analysis.trust;
    if (analysis.intimacy !== undefined) relationship.intimacy += analysis.intimacy;
    if (analysis.anger !== undefined) relationship.anger += analysis.anger;
  }

  relationship.affection = Math.max(0, Math.min(100, relationship.affection));
  relationship.trust = Math.max(0, Math.min(100, relationship.trust));
  relationship.intimacy = Math.max(0, Math.min(100, relationship.intimacy));
  relationship.anger = Math.max(0, Math.min(100, relationship.anger));

  await relationship.save();

  const currentLevelInfo = getRelationshipLevel(relationship);
  
  let levelChangeEvent = null;
  if (previousLevelInfo.level !== currentLevelInfo.level) {
    levelChangeEvent = `Relationship changed to ${currentLevelInfo.level}`;
  }
  chat.relationshipLevel = currentLevelInfo.level;
  chat.relationshipEmoji = currentLevelInfo.emoji;
  chat.lastSeen = new Date();
  await chat.save();

  if (analysis && analysis.emotion) {
    character.emotion = analysis.emotion;
    await character.save();
  }

  const currentEmotion = updateEmotion(relationship);
  character.emotion = currentEmotion;
  await character.save();

  let specialEvent = null;
  const events = relationship.eventTriggered || new Map();

  if (relationship.intimacy > 80 && !events.get("confession")) {
    specialEvent = "confession";
    events.set("confession", true);
  } else if (relationship.affection > 60 && !events.get("likes_you")) {
    specialEvent = "likes_you";
    events.set("likes_you", true);
  } else if (relationship.anger > 60 && !events.get("fight")) {
    specialEvent = "fight";
    events.set("fight", true);
  }

  if (specialEvent) {
    relationship.eventTriggered = events;
    await relationship.save();
  }

  await Message.create({
    chatId,
    sender: "user",
    text: message,
    type: "chat"
  });

  // ponytail: memory extraction is for FUTURE turns — don't block this reply
  // on it. Fire it after responding (see end of handler).

  const memories = await Memory.find({
    userId: req.userId,
    characterId: character._id,
  })
  .sort({ importance: -1, createdAt: -1 })
  .limit(5);

  let memoryText = "";
  memories.forEach(mem => {
    memoryText += `- ${mem.content} (Importance: ${mem.importance})\n`;
  });

  const messages = await getLastMessages(chatId);

  const promptContext = levelChangeEvent ? `${levelChangeEvent}. ${memoryText}` : memoryText;

  const prompt = buildPrompt(
    character,
    relationship,
    messages,
    message,
    chat.chatMode,
    promptContext,
    currentEmotion,
    currentLevelInfo.level
  );

  console.log("------ PROMPT START ------");
  console.log(prompt);
  console.log("------ PROMPT END ------");
  console.log("Calling AI...");

  // Stream: first line is metadata JSON, then raw reply text as it generates.
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.write(
    JSON.stringify({
      relationship: {
        affection: relationship.affection,
        trust: relationship.trust,
        intimacy: relationship.intimacy,
        anger: relationship.anger,
      },
      level: currentLevelInfo.level,
      emoji: currentLevelInfo.emoji,
      emotion: currentEmotion,
      event: specialEvent || levelChangeEvent,
    }) + "\n"
  );

  let full = "";
  try {
    const aiResp = await axios.post(
      `${AI_URL}/generate-stream`,
      { prompt, character_name: character.name },
      { responseType: "stream" }
    );
    aiResp.data.on("data", (buf) => {
      const s = buf.toString();
      full += s;
      res.write(s);
    });
    aiResp.data.on("end", async () => {
      res.end();
      if (full.trim()) {
        await Message.create({ chatId, sender: "character", text: full.trim(), type: "chat" });
      }
      extractAndStoreMemory(req.userId, character._id, message).catch((e) =>
        console.error("memory extract failed:", e.message)
      );
    });
    aiResp.data.on("error", (e) => {
      console.error("AI stream error:", e.message);
      res.end();
    });
  } catch (err) {
    console.error("Error starting AI stream:", err.message);
    res.end();
  }
});

// List the user's chats for the History tab, newest first.
// ponytail: per-chat last-message lookup is N+1, fine for a single user's handful
// of chats; switch to an aggregate if this ever serves many users.
router.get("/list", authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.userId }).sort({ lastSeen: -1 });
    const characters = await Character.find({
      _id: { $in: chats.map((ch) => ch.characterId) },
    });
    const byId = Object.fromEntries(characters.map((c) => [String(c._id), c]));

    const items = await Promise.all(
      chats.map(async (ch) => {
        const last = await Message.findOne({ chatId: ch._id }).sort({ createdAt: -1 });
        const char = byId[String(ch.characterId)];
        return {
          chatId: ch._id,
          characterId: ch.characterId,
          name: char?.name || "Unknown",
          image: char?.image || null,
          level: ch.relationshipLevel,
          emoji: ch.relationshipEmoji,
          lastSeen: ch.lastSeen,
          preview: last ? last.text.replace(/[*"]/g, "").trim().slice(0, 80) : "",
        };
      })
    );
    res.json(items.filter((i) => byId[String(i.characterId)])); // skip deleted characters
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:chatId", authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    const character = await Character.findById(chat.characterId);

    // Generate intro ONLY if no intro exists
    if (!chat.initialMessageGenerated) {
      const text = await generateInitialMessage(character);

      await Message.create({
        chatId: chat._id,
        sender: "character",
        text,
        type: "intro"
      });

      chat.initialMessageGenerated = true;
      chat.lastSeen = new Date();
      await chat.save();
    }

    const messages = await Message.find({ chatId: chat._id }).sort({ createdAt: 1 });

    const relationship = await Relationship.findOne({
      userId: req.userId,
      characterId: chat.characterId,
    });

    const levelInfo = relationship
      ? getRelationshipLevel(relationship)
      : { level: "Stranger", emoji: "👋" };

    res.json({
      messages,
      relationship: relationship || { affection: 0, trust: 0, intimacy: 0, anger: 0 },
      level: levelInfo.level,
      emoji: levelInfo.emoji
    });

  } catch (err) {
    console.error("Error loading chat:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/regenerate/:chatId", authMiddleware, async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const userId = req.userId;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const lastAI = await Message.findOne({ chatId, sender: "character" }).sort({ createdAt: -1 });
    if (lastAI) {
      await Message.deleteOne({ _id: lastAI._id });
    }

    const lastUser = await Message.findOne({ chatId, sender: "user" }).sort({ createdAt: -1 });
    if (!lastUser) return res.status(400).json({ error: "No user message to regenerate from" });

    const character = await Character.findById(chat.characterId);
    let relationship = await Relationship.findOne({ userId, characterId: character._id });
    const currentLevelInfo = getRelationshipLevel(relationship);
    const currentEmotion = updateEmotion(relationship);

    const memories = await Memory.find({ userId, characterId: character._id })
      .sort({ importance: -1, createdAt: -1 })
      .limit(5);

    let memoryText = "";
    memories.forEach(mem => {
      memoryText += `- ${mem.content} (Importance: ${mem.importance})\n`;
    });

    const messages = await getLastMessages(chatId);

    const prompt = buildPrompt(
      character,
      relationship,
      messages,
      lastUser.text,
      chat.chatMode,
      memoryText,
      currentEmotion,
      currentLevelInfo.level
    );

    const aiReply = await getAIResponse(prompt, character.name);

    await Message.create({
      chatId,
      sender: "character",
      text: aiReply,
      type: "chat"
    });

    chat.relationshipLevel = currentLevelInfo.level;
    chat.relationshipEmoji = currentLevelInfo.emoji;
    await chat.save();

    res.json({
      reply: aiReply,
      relationship: {
        affection: relationship.affection,
        trust: relationship.trust,
        intimacy: relationship.intimacy,
        anger: relationship.anger
      },
      level: chat.relationshipLevel,
      emoji: chat.relationshipEmoji,
      emotion: currentEmotion
    });
  } catch (err) {
    console.error("Error in /regenerate:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
