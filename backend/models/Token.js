const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    tokenNumber: { type: Number, required: true },
    patientName: { type: String, required: true },
    status: {
      type: String,
      enum: ["waiting", "serving", "done"],
      default: "waiting",
    },
    calledAt: { type: Date },
    doneAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Token", tokenSchema);