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

    // ⭐ reference resume
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
    },

    selectedResumeName: String,

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    },

    startAt: Date,
    endAt: Date,

    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Session", SessionSchema);