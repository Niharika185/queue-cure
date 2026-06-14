const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    avgConsultationTime: { type: Number, default: 5 }, // in minutes
    lastTokenNumber: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);