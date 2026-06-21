// Base URL of the Python AI service. Local by default; set AI_URL in production
// to wherever the LLM is hosted (Colab/Vast/AWS tunnel, etc.).
module.exports = {
  AI_URL: process.env.AI_URL || "http://localhost:8000",
};
