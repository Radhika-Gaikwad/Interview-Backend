import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import AzureAdOAuth2Strategy from "passport-azure-ad-oauth2";

import { upsertSocialUser } from "../Services/AuthService.js";

/**
 * Convert provider profile to standardized shape:
 * { provider, providerId, email, name, avatar }
 */
function normalizeProfile(provider, profile) {
  switch (provider) {
    case "google":
      return {
        provider: "google",
        providerId: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value,
      };
    case "facebook":
      return {
        provider: "facebook",
        providerId: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value,
      };
    case "linkedin":
      return {
        provider: "linkedin",
        providerId: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value,
      };
    case "azure_ad_oauth2":
      return {
        provider: "microsoft",
        providerId: profile.id,
        email: profile.emails?.[0]?.value || profile._json?.upn,
        name: profile.displayName || profile._json?.name,
        avatar: profile.photos?.[0]?.value,
      };
    default:
      return null;
  }
}

/* Google */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, cb) => {
    try {
      const p = normalizeProfile("google", profile);
      // attach providerProfile to req.user by passing in cb second arg
      cb(null, { providerProfile: p });
    } catch (err) {
      cb(err);
    }
  }));
}

/* Facebook */
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    profileFields: ['id', 'displayName', 'photos', 'email']
  }, async (accessToken, refreshToken, profile, cb) => {
    try {
      const p = normalizeProfile("facebook", profile);
      cb(null, { providerProfile: p });
    } catch (err) { cb(err); }
  }));
}

/* LinkedIn */
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: process.env.LINKEDIN_CALLBACK_URL,
    scope: ['r_emailaddress', 'r_liteprofile'],
    state: true
  }, async (accessToken, refreshToken, profile, cb) => {
    try {
      const p = normalizeProfile("linkedin", profile);
      cb(null, { providerProfile: p });
    } catch (err) { cb(err); }
  }));
}

/* Microsoft / Azure AD OAuth2 */
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use('azure_ad_oauth2', new AzureAdOAuth2Strategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: process.env.MICROSOFT_CALLBACK_URL
  }, async (accessToken, refreshToken, params, profile, cb) => {
    // Azure strategy often needs additional userinfo fetch using accessToken
    // For demo-simple approach we can parse id_token if present
    try {
      const idToken = params.id_token;
      // decode id_token if you want, or fetch /userinfo endpoint.
      // For simplicity, put minimal profile:
      const p = {
        provider: "microsoft",
        providerId: params.oid || params.sub || Date.now().toString(),
        email: params.upn || params.preferred_username,
        name: params.name || params.preferred_username,
        avatar: null
      };
      cb(null, { providerProfile: p });
    } catch (err) { cb(err); }
  }));
}

/**
 * When passport returns a user object, we just forward it to next middleware:
 * we don't persist passport sessions (session: false in routes).
 */
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

export default passport;
