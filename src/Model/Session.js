import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema(
  {
    title: String,
    company: String,
    jobDescription: String,
    position: String,
    skills: [{ type: String }],
    location: String,
    timezone: String,
    scheduledAt: Date,
    meetingLink: String,

    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
    },

    selectedResumeName: String,

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // ✅ single index
    },

    language: { type: String, default: "English" },
    aiModel: String,
    simpleEnglish: { type: Boolean, default: false },
    extraContext: String,
    saveTranscript: { type: Boolean, default: false },
    shareAudio: { type: Boolean, default: false },
    connectionMethod: String,
    autoExtend: { type: Boolean, default: true },
    trial: { type: Boolean, default: false },

    creditsUsed: { type: Number, default: 0 },
    durationMinutes: { type: Number, default: 30 },
    actualDurationMinutes: Number,

    status: {
      type: String,
      enum: ["draft","scheduled","active","completed","cancelled","expired"],
      default: "draft",
      index: true, // ✅ useful filter index
    },

    startAt: Date,
    endAt: Date,

    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

/* ================= COMPOUND INDEXES (CRITICAL) ================= */

// 🔥 MOST IMPORTANT (your main query)
SessionSchema.index({ owner: 1, createdAt: -1 });

// 🔥 for filtering by status + owner
SessionSchema.index({ owner: 1, status: 1 });

// 🔥 optional (if you query scheduled sessions)
SessionSchema.index({ owner: 1, scheduledAt: 1 });

export default mongoose.model("Session", SessionSchema);