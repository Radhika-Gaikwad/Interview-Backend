// middleware/authMiddleware.js
import { verifyJwt } from "../utils/jwt.utils.js";
import { findUserById } from "../Services/AuthService.js";

export async function protect(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
  const token = auth.split(" ")[1];
  const payload = verifyJwt(token);
  if (!payload) return res.status(401).json({ message: "Invalid token" });
  const user = await findUserById(payload.sub);
  if (!user) return res.status(401).json({ message: "User not found" });
  req.user = user;
  next();
}
