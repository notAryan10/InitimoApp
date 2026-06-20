function buildPrompt(character, relationship, messages, userMessage, mode, memoryText, currentEmotion, relationshipLevel) {
  let history = "";

  messages.forEach((msg) => {
    if (msg.sender === "user") {
      history += `<|im_start|>user\n${msg.text}\n<|im_end|>\n`;
    } else {
      history += `<|im_start|>assistant\n${msg.text}\n<|im_end|>\n`;
    }
  });

  return `
<|im_start|>system
### Character:
Name: ${character.name}
Personality: ${character.personality}
Emotion: ${currentEmotion || character.emotion}
Mood: ${character.mood || "Neutral"}

### Relationship:
Affection: ${relationship.affection}/100
Trust: ${relationship.trust}/100
Intimacy: ${relationship.intimacy}/100
Anger: ${relationship.anger}/100
Relationship Level: ${relationshipLevel || "Stranger"}

### Roleplay Rules:
- Only write as ${character.name}.
- Never write dialogue, thoughts, or actions for the User.
- Never continue the story for the User.
- Only respond as ${character.name}.
- Replies should be 3-5 sentences.
- Use this format:

Narration in italic using * *
Dialogue in "quotes"

Example:
*She looks at you and smiles softly.*
"Hi... I'm glad you came."

Do NOT write anything for the User.
Do NOT describe User actions.
Do NOT continue the scene as a narrator.
Only respond as ${character.name}.
- ${memoryText ? `Important memories:\n${memoryText}` : ""}

### Conversation:
${history}
<|im_start|>user
${userMessage}
<|im_end|>
<|im_start|>assistant
`.trim();
}

module.exports = { buildPrompt };


