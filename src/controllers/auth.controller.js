// controllers/authController.js
import { createUser, validatePassword, findUserByEmail, upsertSocialUser } from "../Services/AuthService.js";
import { signJwt } from "../utils/jwt.utils.js";

/**
 * POST /auth/signup
 * body: { name, email, password, role }
 */
export async function signup(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });
    const user = await createUser({ name, email, password, role });
    const token = signJwt({ sub: user._id, email: user.email });
    res.status(201).json({ user: { id: user._id, email: user.email, name: user.name }, token });
  } catch (err) {
    res.status(400).json({ message: err.message || "Signup failed" });
  }
}

/**
 * POST /auth/login
 * body: { email, password }
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await validatePassword(email, password);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const token = signJwt({ sub: user._id, email: user.email });
    res.json({ user: { id: user._id, email: user.email, name: user.name }, token });
  } catch (err) {
    res.status(500).json({ message: "Login error" });
  }
}

/**
 * GET /auth/me
 * header: Authorization: Bearer <token>
 */
export async function me(req, res) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Not authenticated" });
  res.json({ id: user._id, email: user.email, name: user.name, role: user.role });
}

/**
 * SOCIAL CALLBACK HANDLER (used by passport)
 * We'll standardize the profile data and upsert user & emit token or redirect.
 */
export async function socialCallback(req, res) {
  // Passport will attach profile to req.user (when using the strategies below).
  // But to keep generic, accept data via req.authInfo or req.user
  // For demo flows, the demo routes call this controller directly with required query/body.
  try {
    const demo = req.body?.demo || req.query?.demo;
    let provider, providerId, email, name, avatar;

    if (demo && req.body) {
      // demo mode sends provider info in body
      ({ provider, providerId, email, name, avatar } = req.body);
    } else if (req.user && req.user.providerProfile) {
      // our passport wrapper can set providerProfile
      ({ provider, providerId, email, name, avatar } = req.user.providerProfile);
    } else if (req.authInfo) {
      ({ provider, providerId, email, name, avatar } = req.authInfo);
    } else {
      return res.status(400).json({ message: "No social profile found" });
    }

    const user = await upsertSocialUser({ provider, providerId, email, name, avatar });
    const token = signJwt({ sub: user._id, email: user.email });
    // For API clients, return JSON with token
    // For browser OAuth flows you might want to redirect back to frontend with token in query/hash
    if (req.query.redirect_url) {
      // careful: in production you should validate redirect_url against whitelist
      const redirectUrl = new URL(req.query.redirect_url);
      redirectUrl.searchParams.set("token", token);
      return res.redirect(redirectUrl.toString());
    }

    return res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("socialCallback err:", err);
    return res.status(500).json({ message: "Social login failed" });
  }
}
