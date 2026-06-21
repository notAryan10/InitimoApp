const axios = require("axios");

// Base URL of the Python AI service. Local by default; set AI_URL in production
// to wherever the LLM is hosted (AWS Elastic IP, tunnel, etc.).
const AI_URL = process.env.AI_URL || "http://localhost:8000";

// If the AI box is protected by a shared secret, attach it to every axios call
// (axios defaults are global, so this covers all services at once).
if (process.env.AI_KEY) {
  axios.defaults.headers.common["X-API-Key"] = process.env.AI_KEY;
}

module.exports = { AI_URL };
