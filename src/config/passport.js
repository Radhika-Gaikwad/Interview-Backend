import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import AzureAdOAuth2Strategy from "passport-azure-ad-oauth2";

/**
 * Normalize provider profile to common shape
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

    default:
      return null;
  }
}

/* ===================== GOOGLE ===================== */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        proxy: true, // IMPORTANT for Render
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const p = normalizeProfile("google", profile);
          done(null, { providerProfile: p });
        } catch (err) {
          done(err);
        }
      }
    )
  );
}

/* ===================== FACEBOOK ===================== */
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL,
        profileFields: ["id", "displayName", "photos", "email"],
        scope: ["email"], // REQUIRED
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const p = normalizeProfile("facebook", profile);
          done(null, { providerProfile: p });
        } catch (err) {
          done(err);
        }
      }
    )
  );
}

/* ===================== LINKEDIN (OPENID) ===================== */
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(
    new LinkedInStrategy(
      {
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: process.env.LINKEDIN_CALLBACK_URL,
        scope: ["openid", "profile", "email"], // FIXED (new LinkedIn)
        state: true,
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const p = normalizeProfile("linkedin", profile);
          done(null, { providerProfile: p });
        } catch (err) {
          done(err);
        }
      }
    )
  );
}

/* ===================== MICROSOFT / AZURE AD ===================== */
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(
    "azure_ad_oauth2",
    new AzureAdOAuth2Strategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: process.env.MICROSOFT_CALLBACK_URL,
        scope: ["openid", "profile", "email"],
        proxy: true,
      },
      async (accessToken, refreshToken, params, done) => {
        try {
          const p = {
            provider: "microsoft",
            providerId: params.oid || params.sub,
            email: params.preferred_username,
            name: params.name || params.preferred_username,
            avatar: null,
          };
          done(null, { providerProfile: p });
        } catch (err) {
          done(err);
        }
      }
    )
  );
}

/* ===================== PASSPORT BOILERPLATE ===================== */
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

export default passport;
