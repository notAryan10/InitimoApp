const axios = require("axios");
const { AI_URL } = require("../config");

async function analyzeMessage(message) {
  try {
    const response = await axios.post(`${AI_URL}/analyze`, {
      message: message,
    });

    return JSON.parse(response.data.analysis);
  } catch (err) {
    console.log(err.message);
    return null;
  }
}

module.exports = { analyzeMessage };
