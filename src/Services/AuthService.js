// services/authService.js
import User from "../Model/User.js";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function createUser({ name, email, password, role, resumeUrl }) {
  if (!email) throw new Error("Email required");
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new Error("User already exists");

  const hashed = password ? await bcrypt.hash(password, SALT_ROUNDS) : undefined;

  const user = new User({
    name,
    email,
    password: hashed,
    role,
    resumeUrl,
  });

  await user.save();
  return user;
}

export async function validatePassword(email, plainPassword) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.password) return null;
  const ok = await bcrypt.compare(plainPassword, user.password);
  return ok ? user : null;
}

export async function findUserByEmail(email) {
  return User.findOne({ email: email?.toLowerCase() });
}

export async function findUserById(id) {
  return User.findById(id);
}

/**
 * Upsert a social login entry:
 * - If a user with the social provider id exists -> return user
 * - Else if a user with same email exists -> attach social entry and return user
 * - Else create new user with that social info
 */
export async function upsertSocialUser({ provider, providerId, email, name, avatar }) {
  // 1) find by provider id
  let user = await User.findOne({ "socials.provider": provider, "socials.id": providerId });

  if (user) return user;

  // 2) find by email -> attach provider
  if (email) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user.socials.push({ provider, id: providerId, email: email.toLowerCase(), name, avatar });
      await user.save();
      return user;
    }
  }

  // 3) create new user
  const newUser = new User({
    name,
    email: email?.toLowerCase(),
    socials: [{ provider, id: providerId, email: email?.toLowerCase(), name, avatar }],
  });

  await newUser.save();
  return newUser;
}
