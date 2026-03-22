import Session from "../Model/Session.js";
import User from "../Model/User.js";
const BASE_URL = process.env.BACKEND_URL;

const createSession = async ({ userId, payload }) => {
  const doc = new Session({ ...payload, owner: userId });
  await doc.save();
  return doc;
};

const getSessionById = async (sessionId) => {
  const session = await Session.findById(sessionId).populate("owner", "fullName email");
  if (!session) throw new Error("Session not found");
  return session;
};

const listSessionsForUser = async (userId, page = 1, limit = 6) => {
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    Session.find({ owner: userId })
      .populate({
        path: "resumeId",
        match: { isDeleted: false },
        select: "title",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Session.countDocuments({ owner: userId }),
  ]);

  const mapped = sessions.map((s) => ({
    ...s,

    resumeName: s.resumeId?.title || s.selectedResumeName || "Deleted Resume",

     resumePreviewUrl: s.resumeId
    ? `${BASE_URL}/api/resume/view/${s.resumeId._id}`
    : null,

  resumeDownloadUrl: s.resumeId
    ? `${BASE_URL}/api/resume/download/${s.resumeId._id}`
    : null,
  }));

  return {
    data: mapped,
    page,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

const updateSession = async ({ sessionId, userId, update }) => {
  const session = await Session.findById(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.owner.toString() !== userId.toString()) {
    throw new Error("Not authorized to update this session");
  }

  // Only allow certain fields to be updated
  const allowed = [
    "title",
    "company",
    "position",
    "jobDescription",
    "selectedResumeName",
    "resumePreviewUrl",
    "resumeUrl",
    "skills",
    "location",
    "timezone",
    "scheduledAt",
    "meetingLink",
    "language",
    "aiModel",
    "simpleEnglish",
    "extraContext",
    "saveTranscript",
    "shareAudio",
    "connectionMethod",
    "autoExtend",
    "trial",
    "creditsUsed",
    "durationMinutes",
    "status",
    "startAt",
    "endAt",
  ];

  allowed.forEach((k) => {
    if (update[k] !== undefined) session[k] = update[k];
  });

  await session.save();
  return session;
};


const startSession = async ({ sessionId, userId, options = {} }) => {
  const session = await Session.findById(sessionId);
  if (!session) throw new Error("Session not found");

  if (session.owner.toString() !== userId.toString()) {
    throw new Error("Not authorized to start this session");
  }

  const minRequired = 0.5;

  // Deduct credits atomically
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, credits: { $gte: minRequired } },
    { $inc: { credits: -minRequired } },
    { new: true }
  );

  if (!updatedUser) {
    throw new Error("Insufficient credits to start session");
  }

  // Update session regardless of previous status
  session.startAt = session.startAt || new Date();
  session.status = "active";
  session.creditsUsed = (session.creditsUsed || 0) + minRequired;

  // Apply options
  const { shareAudio, connectionMethod, meetingLink, language, aiModel } = options;
  if (shareAudio !== undefined) session.shareAudio = shareAudio;
  if (connectionMethod) session.connectionMethod = connectionMethod;
  if (meetingLink) session.meetingLink = meetingLink;
  if (language) session.language = language;
  if (aiModel) session.aiModel = aiModel;

  await session.save();

  return { session, user: updatedUser };
};

const endSession = async ({ sessionId, userId, endAt }) => {
  const session = await Session.findById(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.owner.toString() !== userId.toString()) {
    throw new Error("Not authorized to end this session");
  }

  if (!session.startAt) throw new Error("Session has not been started");

  const finishedAt = endAt ? new Date(endAt) : new Date();
  session.endAt = finishedAt;

  const durationMs = finishedAt - session.startAt;
  const durationMinutes = Math.ceil(durationMs / 60000);

  session.actualDurationMinutes = durationMinutes;

  const planned = session.durationMinutes || 30;

  const totalCreditsRequired = durationMinutes > planned ? 1 : 0.5;
  const alreadyCharged = session.creditsUsed || 0;
  const extraToDeduct = Math.max(0, totalCreditsRequired - alreadyCharged);

  let updatedUser = null;
  if (extraToDeduct > 0) {
    // atomic deduction for the extra amount
    updatedUser = await User.findOneAndUpdate(
      { _id: userId, credits: { $gte: extraToDeduct } },
      { $inc: { credits: -extraToDeduct } },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error("Insufficient credits to end session");
    }

    session.creditsUsed = alreadyCharged + extraToDeduct;
  } else {
    // No further deduction needed; fetch current user for response
    updatedUser = await User.findById(userId);
  }

  // mark expired when user exceeded planned duration and autoExtend is false
  const exceededPlanned = durationMinutes > planned;
  if (exceededPlanned && session.autoExtend === false) {
    session.status = "expired";
  } else {
    session.status = "completed";
  }
  await session.save();

  // update user interview stats (increment sessionsTaken)
  await User.findByIdAndUpdate(userId, { $inc: { "interviewStats.sessionsTaken": 1 } });

  return { session, creditsDeducted: extraToDeduct, user: updatedUser };
};

const deleteSession = async ({ sessionId, userId }) => {

  const deleted = await Session.findOneAndDelete({ _id: sessionId, owner: userId });
  if (!deleted) {
    const exists = await Session.exists({ _id: sessionId });
    if (!exists) throw new Error("Session not found");
    throw new Error("Not authorized to delete this session");
  }
  return true;
};


const duplicateSession = async ({ sessionId, userId }) => {
  const session = await Session.findById(sessionId);

  if (!session) throw new Error("Session not found");

  // Ownership check
  if (session.owner.toString() !== userId.toString()) {
    throw new Error("Not authorized to duplicate this session");
  }

  // Convert to object & remove fields we don't want to copy
  const sessionObj = session.toObject();

  delete sessionObj._id;
  delete sessionObj.createdAt;
  delete sessionObj.updatedAt;

  // Reset important fields
  sessionObj.status = "draft";
  sessionObj.startAt = null;
  sessionObj.endAt = null;
  sessionObj.creditsUsed = 0;
  sessionObj.actualDurationMinutes = null;

  // Optional: change title so user knows it's a copy
  sessionObj.title = `${session.title || "Session"} (Copy)`;

  // Create new session
  const newSession = new Session({
    ...sessionObj,
    owner: userId,
  });

  await newSession.save();

  return newSession;
};
export default {
  createSession,
  getSessionById,
  listSessionsForUser,
  updateSession,
  startSession,
  endSession,
  deleteSession,
  duplicateSession,
};
