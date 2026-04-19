import admin from "firebase-admin";
import db from "../config/db.js";
import { formatSessionData, mapSessionDoc } from "../Model/Session.js";
import { mapUserDoc } from "../Model/User.js";

const BASE_URL = process.env.BACKEND_URL;

// ================= CREATE =================
const createSession = async ({ userId, payload }) => {
  const sessionRef = db.collection("sessions").doc();
  const sessionData = formatSessionData({ ...payload, owner: userId });

  await sessionRef.set(sessionData);
  return { _id: sessionRef.id, ...sessionData };
};

// ================= GET BY ID (WITH POPULATE) =================
const getSessionById = async (sessionId) => {
  const sessionDoc = await db.collection("sessions").doc(sessionId).get();
  if (!sessionDoc.exists) throw new Error("Session not found");

  const session = mapSessionDoc(sessionDoc);

  if (session.owner) {
    const userDoc = await db.collection("users").doc(session.owner).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      session.owner = {
        _id: userDoc.id,
        fullName: userData.fullName,
        email: userData.email,
      };
    }
  }

  return session;
};

// ================= LIST (ULTRA OPTIMIZED) =================
const listSessionsForUser = async (userId, page = 1, limit = 6) => {
  const skip = (page - 1) * limit;
  const sessionsRef = db.collection("sessions");

  // 🔥 FIX 1: Run Count and Data fetch in PARALLEL
  const [countSnapshot, snapshot] = await Promise.all([
    sessionsRef.where("owner", "==", userId).count().get(),
    sessionsRef
      .where("owner", "==", userId)
      .orderBy("createdAt", "desc")
      .offset(skip)
      .limit(limit)
      .get()
  ]);

  const total = countSnapshot.data().count;
  const sessions = snapshot.docs.map(mapSessionDoc);

  // 🔥 FIX 2: Early return if no sessions found
  if (sessions.length === 0) {
    return { data: [], page, total, totalPages: 0 };
  }

  // Batch fetch Resumes
  const uniqueResumeIds = [...new Set(sessions.map(s => s.resumeId).filter(Boolean))];
  const resumeCache = {};

  if (uniqueResumeIds.length > 0) {
    const resumesSnap = await db.collection("resumes")
      .where(admin.firestore.FieldPath.documentId(), "in", uniqueResumeIds)
      .get();

    resumesSnap.forEach(doc => {
      resumeCache[doc.id] = doc.data(); // Store raw data
    });
  }

  // 🔥 FIX 3: Optimized Mapping
  const mapped = sessions.map((s) => {
    const rData = resumeCache[s.resumeId];
    const isValid = rData && !rData.isDeleted;

    return {
      ...s,
      resumeId: isValid ? { _id: s.resumeId, title: rData.title } : null,
      resumeName: isValid ? rData.title : (s.selectedResumeName || "Deleted Resume"),
      resumePreviewUrl: isValid ? `${BASE_URL}/api/resume/view/${s.resumeId}` : null,
      resumeDownloadUrl: isValid ? `${BASE_URL}/api/resume/download/${s.resumeId}` : null,
    };
  });

  return {
    data: mapped,
    page,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

// ================= UPDATE =================
const updateSession = async ({ sessionId, userId, update }) => {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const doc = await sessionRef.get();

  if (!doc.exists) throw new Error("Session not found");
  if (doc.data().owner !== userId) throw new Error("Not authorized to update this session");

  const allowed = [
    "title", "company", "position", "jobDescription", "selectedResumeName",
    "resumePreviewUrl", "resumeUrl", "skills", "location", "timezone",
    "scheduledAt", "meetingLink", "language", "aiModel", "simpleEnglish",
    "extraContext", "saveTranscript", "shareAudio", "connectionMethod",
    "autoExtend", "trial", "creditsUsed", "durationMinutes", "status",
    "startAt", "endAt"
  ];

  const filteredUpdate = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  allowed.forEach((k) => {
    if (update[k] !== undefined) {
      if (["scheduledAt", "startAt", "endAt"].includes(k) && update[k]) {
        filteredUpdate[k] = admin.firestore.Timestamp.fromDate(new Date(update[k]));
      } else {
        filteredUpdate[k] = update[k];
      }
    }
  });

  await sessionRef.update(filteredUpdate);

  const updatedDoc = await sessionRef.get();
  return mapSessionDoc(updatedDoc);
};

// ================= START SESSION (WITH TRANSACTION) =================
const startSession = async ({ sessionId, userId, options = {} }) => {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const userRef = db.collection("users").doc(userId);
  const minRequired = 0.5;
  let updatedUser;

  await db.runTransaction(async (t) => {
    const sessionDoc = await t.get(sessionRef);
    if (!sessionDoc.exists) throw new Error("Session not found");
    if (sessionDoc.data().owner !== userId) throw new Error("Not authorized to start this session");

    const userDoc = await t.get(userRef);
    if (!userDoc.exists) throw new Error("User not found");

    const currentCredits = userDoc.data().credits || 0;
    if (currentCredits < minRequired) {
      throw new Error("Insufficient credits to start session");
    }

    t.update(userRef, { credits: admin.firestore.FieldValue.increment(-minRequired) });

    updatedUser = { ...mapUserDoc(userDoc), credits: currentCredits - minRequired };

    const sessionUpdate = {
      startAt: sessionDoc.data().startAt || admin.firestore.FieldValue.serverTimestamp(),
      status: "active",
      creditsUsed: (sessionDoc.data().creditsUsed || 0) + minRequired,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (options.shareAudio !== undefined) sessionUpdate.shareAudio = options.shareAudio;
    if (options.connectionMethod) sessionUpdate.connectionMethod = options.connectionMethod;
    if (options.meetingLink) sessionUpdate.meetingLink = options.meetingLink;
    if (options.language) sessionUpdate.language = options.language;
    if (options.aiModel) sessionUpdate.aiModel = options.aiModel;

    t.update(sessionRef, sessionUpdate);
  });

  const finalSessionDoc = await sessionRef.get();
  return { session: mapSessionDoc(finalSessionDoc), user: updatedUser };
};

// ================= END SESSION (WITH TRANSACTION) =================
const endSession = async ({ sessionId, userId, endAt }) => {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const userRef = db.collection("users").doc(userId);

  const sessionDoc = await sessionRef.get();
  if (!sessionDoc.exists) throw new Error("Session not found");

  const sessionData = sessionDoc.data();
  if (sessionData.owner !== userId) throw new Error("Not authorized to end this session");
  if (!sessionData.startAt) throw new Error("Session has not been started");

  const startAtDate = sessionData.startAt.toDate();
  const finishedAt = endAt ? new Date(endAt) : new Date();

  const durationMs = finishedAt - startAtDate;
  const durationMinutes = Math.ceil(durationMs / 60000);

  const planned = sessionData.durationMinutes || 30;
  const totalCreditsRequired = durationMinutes > planned ? 1 : 0.5;
  const alreadyCharged = sessionData.creditsUsed || 0;
  const extraToDeduct = Math.max(0, totalCreditsRequired - alreadyCharged);

  let updatedUser;

  if (extraToDeduct > 0) {
    await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      const currentCredits = userDoc.data().credits || 0;

      if (currentCredits < extraToDeduct) {
        throw new Error("Insufficient credits to end session");
      }

      t.update(userRef, {
        credits: admin.firestore.FieldValue.increment(-extraToDeduct),
        "interviewStats.sessionsTaken": admin.firestore.FieldValue.increment(1)
      });

      updatedUser = { ...mapUserDoc(userDoc), credits: currentCredits - extraToDeduct };
    });
  } else {
    await userRef.update({
      "interviewStats.sessionsTaken": admin.firestore.FieldValue.increment(1)
    });
    const freshUserDoc = await userRef.get();
    updatedUser = mapUserDoc(freshUserDoc);
  }

  const exceededPlanned = durationMinutes > planned;
  const finalStatus = (exceededPlanned && sessionData.autoExtend === false) ? "expired" : "completed";

  await sessionRef.update({
    endAt: admin.firestore.Timestamp.fromDate(finishedAt),
    actualDurationMinutes: durationMinutes,
    creditsUsed: alreadyCharged + extraToDeduct,
    status: finalStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const finalSessionDoc = await sessionRef.get();

  return {
    session: mapSessionDoc(finalSessionDoc),
    creditsDeducted: extraToDeduct,
    user: updatedUser
  };
};

// ================= DELETE =================
const deleteSession = async ({ sessionId, userId }) => {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const doc = await sessionRef.get();

  if (!doc.exists) throw new Error("Session not found");
  if (doc.data().owner !== userId) throw new Error("Not authorized to delete this session");

  await sessionRef.delete();
  return true;
};

// ================= DUPLICATE =================
const duplicateSession = async ({ sessionId, userId }) => {
  const doc = await db.collection("sessions").doc(sessionId).get();
  if (!doc.exists) throw new Error("Session not found");

  const originalData = doc.data();
  if (originalData.owner !== userId) throw new Error("Not authorized to duplicate this session");

  const duplicatedData = {
    ...originalData,
    status: "draft",
    startAt: null,
    endAt: null,
    creditsUsed: 0,
    actualDurationMinutes: null,
    title: `${originalData.title || "Session"} (Copy)`,
  };

  delete duplicatedData.createdAt;
  delete duplicatedData.updatedAt;

  const newSessionRef = db.collection("sessions").doc();
  const formattedData = formatSessionData(duplicatedData);

  await newSessionRef.set(formattedData);

  return { _id: newSessionRef.id, ...formattedData };
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