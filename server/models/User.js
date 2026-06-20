const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  isAdult: Boolean,
  plan: {
    type: String,
    enum: ["free", "pro", "ultra"],
    default: "free"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", UserSchema);
