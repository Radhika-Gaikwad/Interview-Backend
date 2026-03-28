import sessionService from "../Services/sessionService.js";
import redis from "../config/redis.js";

/* ================= CACHE HELPERS ================= */

const clearSessionCache = async (userId, sessionId = null) => {
  try {
    const keys = [
      `session:list:${userId}`, // list cache
    ];

    if (sessionId) {
      keys.push(`session:${userId}:${sessionId}`); // single session cache
    }

    await redis.del(keys);

  } catch (err) {
    console.error("Cache clear error:", err);
  }
};

/* ================= CREATE ================= */

export const createSession = async (req, res) => {
  try {
    const session = await sessionService.createSession({
      userId: req.user.id,
      payload: req.body,
    });
await clearSessionCache(req.user.id);

    res.json(session);
  } catch (err) {
    console.error("createSession error:", err);
    res.status(500).json({ message: "Failed to create session" });
  }
};

/* ================= GET ONE (CACHEABLE) ================= */

export const getSession = async (req, res) => {
  try {
    const session = await sessionService.getSessionById(req.params.id);
    res.json(session);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

/* ================= LIST (CACHEABLE) ================= */

export const listMySessions = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;

    const result = await sessionService.listSessionsForUser(
      req.user.id,
      page,
      limit
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= UPDATE ================= */

export const updateSession = async (req, res) => {
  try {
    const updated = await sessionService.updateSession({
      sessionId: req.params.id,
      userId: req.user.id,
      update: req.body,
    });

await clearSessionCache(req.user.id, req.params.id);

    res.json(updated);
  } catch (err) {
    console.error("updateSession error:", err);
    res.status(400).json({ message: err.message });
  }
};

/* ================= DELETE ================= */

export const deleteSession = async (req, res) => {
  try {
    await sessionService.deleteSession({
      sessionId: req.params.id,
      userId: req.user.id,
    });

    // ❗ Invalidate cache
    await clearSessionCache(req.user.id);

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* ================= START SESSION ================= */

export const startSession = async (req, res) => {
  try {
    const result = await sessionService.startSession({
      sessionId: req.params.id,
      userId: req.user.id,
      options: req.body,
    });

   await clearSessionCache(req.user.id, req.params.id);

    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* ================= END SESSION ================= */

export const endSession = async (req, res) => {
  try {
    const { endAt } = req.body || {};

    const result = await sessionService.endSession({
      sessionId: req.params.id,
      userId: req.user.id,
      endAt,
    });
await clearSessionCache(req.user.id, req.params.id);

    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* ================= DUPLICATE ================= */

export const duplicateSession = async (req, res) => {
  try {
    const session = await sessionService.duplicateSession({
      sessionId: req.params.id,
      userId: req.user.id,
    });

await clearSessionCache(req.user.id, req.params.id);

    res.json(session);
  } catch (err) {
    console.error("duplicateSession error:", err);
    res.status(400).json({ message: err.message });
  }
};