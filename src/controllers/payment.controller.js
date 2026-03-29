import paymentService from "../Services/paymentService.js";
import Stripe from "stripe";
import redis from "../config/redis.js";

/* ================= CACHE HELPERS ================= */

// Clear user-related cache (credits, profile, etc.)
const clearUserCache = async (userId) => {
  try {
    const keys = await redis.keys(`user:${userId}*`);
    if (keys.length) {
      await redis.del(keys);
    }
  } catch (err) {
    console.error("User cache clear error:", err);
  }
};

/* ================= CREATE CHECKOUT ================= */

export const createCheckout = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({ message: "Plan is required" });
    }

    const user = {
      _id: req.user._id || req.user.id,
      email: req.user.email,
    };

    const checkoutUrl = await paymentService.createCheckoutSession({
      user,
      plan,
    });

    return res.json({ url: checkoutUrl });

  } catch (err) {
    console.error("createCheckout error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/* ================= VERIFY CHECKOUT ================= */

export const verifyCheckout = async (req, res) => {
  try {
    const sessionId = req.body.session_id || req.query.session_id;

    if (!sessionId) {
      return res.status(400).json({ message: "Missing session_id" });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      // Fulfill payment (idempotent inside service)
      const result = await paymentService.fulfillPayment(session);

      // ❗ Invalidate user cache (credits updated)
      if (session.metadata?.userId) {
        await clearUserCache(session.metadata.userId);
      }

      return res.json({
        ok: true,
        creditsAdded: result?.credits || true,
      });
    }

    return res.json({
      ok: false,
      payment_status: session.payment_status,
    });

  } catch (err) {
    console.error("verifyCheckout error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/* ================= STRIPE WEBHOOK ================= */

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

  } catch (err) {
    console.error("❌ Webhook verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Fulfill payment (idempotent)
      await paymentService.fulfillPayment(session);

      // ❗ Invalidate cache
      if (session.metadata?.userId) {
        await clearUserCache(session.metadata.userId);
      }
    }

    return res.json({ received: true });

  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    return res.status(500).json({ message: "Webhook handler failed" });
  }
};