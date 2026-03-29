import Stripe from "stripe";
import Payment from "../Model/Payment.js";
import User from "../Model/User.js";

let _stripe;
function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key);
  return _stripe;
}

const createCheckoutSession = async ({ user, plan }) => {
  if (!user || !user._id) {
    throw new Error("Invalid user: _id missing");
  }

  const stripe = getStripe();
  const clientOrigin = process.env.CLIENT_ORIGIN;
  if (!clientOrigin) throw new Error("CLIENT_ORIGIN is not set");

  const successUrl = `${clientOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${clientOrigin}/payment-cancel`;

  // Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "inr",
          product_data: { name: `${plan.title} Interview Credits` },
          unit_amount: plan.amount * 100,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: user._id.toString(), // ✅ safe now
      credits: plan.credits.toString(),
    },
  });

  // Save payment record
  await Payment.create({
    userId: user._id,
    stripeSessionId: session.id,
    amount: plan.amount,
    currency: "INR",
    credits: plan.credits,
    status: "pending",
  });

  return session.url;
};

const fulfillPayment = async (session) => {
  const payment = await Payment.findOne({ stripeSessionId: session.id });
  if (!payment || payment.status === "paid") return;

  payment.status = "paid";
  await payment.save();

  await User.findByIdAndUpdate(payment.userId, { $inc: { credits: payment.credits } });
};

export default {
  createCheckoutSession,
  fulfillPayment,
};