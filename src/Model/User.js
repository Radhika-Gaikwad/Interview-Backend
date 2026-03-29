import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
      select: false,
    },

    role: {
      type: String,
      enum: ["Student", "Job Seeker", "Working Professional", "HR / Recruiter"],
      default: "Job Seeker",
    },

    resumeUrl: {
      type: String,
    },

    authProvider: {
      type: String,
      enum: ["local", "google", "linkedin", "facebook", "microsoft"],
      default: "local",
    },

    authProviderId: {
      type: String,
      default: null,
    },

    onboardingCompleted: {
      type: Boolean,
      default: false,
    },

    interviewStats: {
      sessionsTaken: {
        type: Number,
        default: 0,
      },
      averageScore: {
        type: Number,
        default: 0,
      },
    },

    credits: {
      type: Number,
      default: 0,
    },

    resetOtp: {
      type: String,
    },

    resetOtpExpiry: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);