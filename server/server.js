const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const characterRoutes = require("./routes/character");
const chatRoutes = require("./routes/chat");

const app = express();

app.use(cors());
app.use(express.json());

// Strict limit on auth to slow brute-force; looser limit on chat to protect the LLM.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { message: "Too many attempts, try again later." } });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { message: "Slow down a moment." } });

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/character", characterRoutes);
app.use("/api/chat", chatLimiter, chatRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
