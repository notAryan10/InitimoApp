const Relationship = require("../models/Relationship");
const Chat = require("../models/Chat");
const { getRelationshipLevel } = require("./relationshipLevel.js");

/**
 * Clamps a value between min and max inclusive.
 */
function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Updates relationship metrics for a specific chat based on AI analysis.
 * @param {string} chatId - The ID of the chat.
 * @param {Object} analysis - The analysis object { affection, trust, intimacy, anger }.
 * @returns {Promise<Object>} The updated relationship and level data.
 */
async function updateRelationship(chatId, analysis) {
  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error(`Chat with ID ${chatId} not found`);
    }

    const { userId, characterId } = chat;

    let relationship = await Relationship.findOne({ userId, characterId });
    if (!relationship) {
      relationship = new Relationship({
        userId,
        characterId,
        affection: 0,
        trust: 0,
        intimacy: 0,
        anger: 0
      });
    }

    relationship.affection = clamp(relationship.affection + (analysis.affection || 0));
    relationship.trust = clamp(relationship.trust + (analysis.trust || 0));
    relationship.intimacy = clamp(relationship.intimacy + (analysis.intimacy || 0));
    relationship.anger = clamp(relationship.anger + (analysis.anger || 0));
    relationship.updatedAt = Date.now();

    await relationship.save();

    const { level, emoji } = getRelationshipLevel(relationship);

    chat.relationshipLevel = level;
    chat.relationshipEmoji = emoji;
    chat.lastSeen = Date.now();
    await chat.save();

    return {
      relationship: {
        affection: relationship.affection,
        trust: relationship.trust,
        intimacy: relationship.intimacy,
        anger: relationship.anger
      },
      relationshipLevel: level,
      relationshipEmoji: emoji
    };
  } catch (error) {
    console.error("Error updating relationship:", error);
    throw error;
  }
}

module.exports = {
  updateRelationship,
  clamp
};
