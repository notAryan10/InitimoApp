const axios = require("axios");
const Memory = require("../models/Memory");
const { AI_URL } = require("../config");

async function extractAndStoreMemory(userId, characterId, message) {
  try {
    const response = await axios.post(`${AI_URL}/extract-memory`, {
      message: message,
    });

    const data = response.data.memory;

    if (data !== "NONE") {
      const memory = JSON.parse(data);

      await Memory.create({
        userId,
        characterId,
        content: memory.content,
        type: memory.type,
        importance: memory.importance || 1,
      });
    }
  } catch (err) {
    console.log("Memory error:", err.message);
  }
}

module.exports = { extractAndStoreMemory };
