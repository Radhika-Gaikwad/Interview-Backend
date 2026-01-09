import jwt from "jsonwebtoken";

export default (req, res, next) => {
  // Prefer cookie (HttpOnly) token, fallback to Authorization header
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

try {
  req.user = jwt.verify(token, process.env.JWT_SECRET);
  console.log("Authenticated user:", req.user); // Debug log
  next();
} catch (err) {
  res.status(401).json({ message: "Invalid token" });
}
};
