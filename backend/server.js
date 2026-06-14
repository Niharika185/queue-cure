require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const Token = require("./models/Token");
const Settings = require("./models/Settings");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] },
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// ---------- DB CONNECT ----------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ---------- HELPERS ----------

// Ensure a settings doc exists, return it
async function getSettings() {
  let settings = await Settings.findOne({ key: "global" });
  if (!settings) {
    settings = await Settings.create({ key: "global" });
  }
  return settings;
}

// Build the full queue state sent to both screens
async function getQueueState() {
  const settings = await getSettings();
  const serving = await Token.findOne({ status: "serving" }).sort({
    tokenNumber: 1,
  });
  const waiting = await Token.find({ status: "waiting" }).sort({
    tokenNumber: 1,
  });

  const waitingWithEstimates = waiting.map((t, idx) => ({
    _id: t._id,
    tokenNumber: t.tokenNumber,
    patientName: t.patientName,
    tokensAhead: idx,
    estimatedWaitMinutes: idx * settings.avgConsultationTime,
  }));

  return {
    avgConsultationTime: settings.avgConsultationTime,
    serving: serving
      ? {
          _id: serving._id,
          tokenNumber: serving.tokenNumber,
          patientName: serving.patientName,
          calledAt: serving.calledAt,
        }
      : null,
    waiting: waitingWithEstimates,
    totalWaiting: waitingWithEstimates.length,
  };
}

// Broadcast the latest state to everyone
async function broadcastQueueState() {
  const state = await getQueueState();
  io.emit("queue:updated", state);
  return state;
}

// ---------- ROUTES ----------

app.get("/api/queue", async (req, res) => {
  try {
    const state = await getQueueState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/queue/add", async (req, res) => {
  try {
    const { patientName } = req.body;
    if (!patientName || !patientName.trim()) {
      return res.status(400).json({ error: "patientName is required" });
    }

    const settings = await Settings.findOneAndUpdate(
      { key: "global" },
      { $inc: { lastTokenNumber: 1 } },
      { new: true, upsert: true }
    );

    const token = await Token.create({
      tokenNumber: settings.lastTokenNumber,
      patientName: patientName.trim(),
      status: "waiting",
    });

    const state = await broadcastQueueState();
    res.status(201).json({ token, state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/queue/call-next", async (req, res) => {
  try {
    await Token.findOneAndUpdate(
      { status: "serving" },
      { status: "done", doneAt: new Date() }
    );

    const next = await Token.findOneAndUpdate(
      { status: "waiting" },
      { status: "serving", calledAt: new Date() },
      { sort: { tokenNumber: 1 }, new: true }
    );

    const state = await broadcastQueueState();
    res.json({ next, state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/queue/settings", async (req, res) => {
  try {
    const { avgConsultationTime } = req.body;
    const value = Number(avgConsultationTime);
    if (!Number.isFinite(value) || value <= 0) {
      return res
        .status(400)
        .json({ error: "avgConsultationTime must be a positive number" });
    }

    await Settings.findOneAndUpdate(
      { key: "global" },
      { avgConsultationTime: value },
      { upsert: true }
    );

    const state = await broadcastQueueState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/queue/reset", async (req, res) => {
  try {
    await Token.deleteMany({});
    await Settings.findOneAndUpdate(
      { key: "global" },
      { lastTokenNumber: 0 },
      { upsert: true }
    );
    const state = await broadcastQueueState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- SOCKET.IO ----------
io.on("connection", async (socket) => {
  console.log("Client connected:", socket.id);
  const state = await getQueueState();
  socket.emit("queue:updated", state);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));