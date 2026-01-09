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
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,

    line_items: [
      {
        price_data: {
          currency: "inr",
          product_data: {
            name: `${plan.title} Interview Credits`,
          },
          unit_amount: plan.amount * 100,
        },
        quantity: 1,
      },
    ],

    success_url: `${process.env.CLIENT_ORIGIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_ORIGIN}/payment-cancel`,

    metadata: {
      userId: user.userId,
      credits: plan.credits,
    },
  });

  await Payment.create({
    userId: user.userId,
    stripeSessionId: session.id,
    amount: plan.amount,
    currency: "INR",
    credits: plan.credits,
    status: "pending",
  });

  // ✅ RETURN URL, NOT ID
  return session.url;
};


const fulfillPayment = async (session) => {
  const payment = await Payment.findOne({
    stripeSessionId: session.id,
  });

  if (!payment || payment.status === "paid") return;

  payment.status = "paid";
  await payment.save();

  await User.findByIdAndUpdate(payment.userId, {
    $inc: { credits: payment.credits },
  });
};

export default {
  createCheckoutSession,
  fulfillPayment,
};
