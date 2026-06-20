const axios = require("axios");

async function analyzeMessage(message) {
  try {
    const response = await axios.post("http://127.0.0.1:8000/analyze", {
      message: message,
    });

    return JSON.parse(response.data.analysis);
  } catch (err) {
    console.log(err.message);
    return null;
  }
}

module.exports = { analyzeMessage };
