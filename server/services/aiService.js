const axios = require("axios");

async function getAIResponse(prompt, characterName = "") {
  try {
    console.log("Sending request to Python AI...");

    const response = await axios.post(
      "http://127.0.0.1:8000/generate",
      { prompt: prompt, character_name: characterName },
      {
        timeout: 120000, 
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("AI replied");
    return response.data.reply;
  } catch (err) {
    console.log("AI ERROR FULL:", err);
    return "Error generating response";
  }
}

module.exports = { getAIResponse };
