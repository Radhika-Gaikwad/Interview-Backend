import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    version: {
      type: Number,
      required: true,
    },

    resumePath: {
      type: String,
      required: true,
    },
    previewPdfPath: {
      type: String,
    },
    textPath: String,
    jsonPath: String,

    parsedData: Object,
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },

    deletedAt: {
      type: Date,
      default: null
    },
    isDefault: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

export default mongoose.model("Resume", resumeSchema);