// File: payment.controller.ts  (replace your existing file contents with this)
import { Request, Response } from "express";
import Stripe from "stripe";
import { StripePaymentModel } from "../models/stripePayment.model";
import { PaymentModel } from "../models/payment.model";
import { ItemModel } from "../models/item.model";

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripePublishable =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.STRIPE_PUBLISHABLE_KEY ||
  "";

if (!stripeSecret || !stripeSecret.startsWith("sk_")) {
  // Dev-time friendly error — ensures we catch misconfiguration early.
  console.error("Invalid STRIPE_SECRET_KEY. It must be the secret key (sk_...)");
  // Note: we don't throw here so the server can still start in some setups;
  // the handler below will return a 500 with a clear message when called.
}

const stripe = new Stripe(stripeSecret || "sk_undefined", {} as Stripe.StripeConfig);

export class PaymentController {
  async createStripeCheckout(req: Request, res: Response) {
    // Early guard: return a clear error if secret key is missing/invalid
    if (!stripeSecret || !stripeSecret.startsWith("sk_")) {
      console.error("Stripe secret key missing or invalid on createStripeCheckout.");
      return res.status(500).json({
        error: "Server misconfigured: STRIPE_SECRET_KEY must be set to Stripe secret key (sk_...).",
      });
    }

    try {
      const {
        amount,
        productName,
        productId,
        buyerName,
        buyerEmail,
        buyerPhone,
        orderId,
        // additional fields for payment record
        fullName,
        phoneNo,
        phoneModel,
        sellerId,
        price,
        location,
        date,
        time,
        oid,
        refId,
        metadata = {},
        flow, // new field: 'payment_intent' or 'checkout' (default)
      } = req.body;

      const origin =
        (req.headers.origin as string) ||
        process.env.NEXT_PUBLIC_APP_ORIGIN ||
        "http://localhost:3000";

      // Validate amount (expecting amount in major units as you currently send)
      const amountNum = Number(amount || price || 0);
      if (!amountNum || amountNum <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // Convert major units to smallest currency unit for Stripe (e.g., dollars -> cents)
      // Adjust this logic if your frontend already sends cents.
      const amountForStripe = Math.round(amountNum * 100);

      // If client asked for PaymentIntent (in-app PaymentSheet)
      if (flow === "payment_intent") {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountForStripe,
          currency: "usd", // change to appropriate currency if needed
          automatic_payment_methods: { enabled: true },
          metadata: {
            orderId: orderId || "",
            productId: productId || "",
            buyerName: buyerName || "",
            buyerPhone: buyerPhone || "",
            fullName: fullName || buyerName || "",
            phoneNo: phoneNo || buyerPhone || "",
            phoneModel: phoneModel || "",
            sellerId: sellerId || "",
            price: price || amountNum,
            location: location || "",
            date: date || new Date().toISOString().split("T")[0],
            time: time || new Date().toLocaleTimeString(),
            oid: oid || orderId || "",
            refId: refId || orderId || "",
            ...metadata,
          },
        });

        return res.status(200).json({
          clientSecret: paymentIntent.client_secret,
          publishableKey: stripePublishable,
          amount: amountForStripe,
          currency: paymentIntent.currency,
        });
      }

      // Default: existing Checkout Session (web flow)
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: productName || "Product",
                description: `Order ID: ${orderId || productId || "N/A"}`,
              },
              unit_amount: amountForStripe,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/stripe/cancel?order_id=${encodeURIComponent(
          orderId || productId || ""
        )}`,
        customer_email: buyerEmail || undefined,
        metadata: {
          orderId: orderId || "",
          productId: productId || "",
          buyerName: buyerName || "",
          buyerPhone: buyerPhone || "",
          fullName: fullName || buyerName || "",
          phoneNo: phoneNo || buyerPhone || "",
          phoneModel: phoneModel || "",
          sellerId: sellerId || "",
          price: price || amountNum,
          location: location || "",
          date: date || new Date().toISOString().split("T")[0],
          time: time || new Date().toLocaleTimeString(),
          oid: oid || orderId || "",
          refId: refId || orderId || "",
          ...metadata,
        },
      });

      return res.status(200).json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to create checkout session" });
    }
  }

  // Stripe webhook handler — expects raw body (register route with express.raw middleware)
  async handleStripeWebhook(req: Request, res: Response) {
    const sig = req.headers["stripe-signature"] as string | undefined;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    let event: Stripe.Event;
    try {
      const rawBody = req.body as Buffer;
      // Diagnostic logs to help debug webhook receipts and body parsing issues
      try {
        const bodyType = Buffer.isBuffer(rawBody) ? 'Buffer' : typeof rawBody;
        console.log(`Stripe webhook received. signature present=${Boolean(sig)}, webhookSecretConfigured=${Boolean(webhookSecret)}, bodyType=${bodyType}`);
        if (Buffer.isBuffer(rawBody)) console.log(`Raw body length=${rawBody.length}`);
      } catch (_) {}
      // If webhook secret is not configured, allow a test-mode where the
      // incoming JSON payload is used directly (useful for local testing).
      if (!webhookSecret) {
        try {
          const parsed = JSON.parse(rawBody.toString());
          console.warn(
            "STRIPE_WEBHOOK_SECRET not set — processing webhook without signature verification (TEST MODE)."
          );
          event = parsed as Stripe.Event;
        } catch (parseErr: any) {
          throw new Error("Invalid JSON payload for webhook");
        }
      } else {
        if (!sig) throw new Error("Missing stripe-signature header");
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle events
    try {
      // Log event type early for visibility
      try { console.log(`Stripe event parsed: type=${event.type}`); } catch (_) {}
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log("Checkout session completed:", session.id);
          // Use your existing persistence code here (same as before)
          // (Persist Stripe session to StripePaymentModel + PaymentModel)
          try {
            const existing = await StripePaymentModel.findOne({ sessionId: session.id });
            if (!existing) {
              const meta = session.metadata || {};
              const productId = (meta.productId as string) || undefined;
              const orderId = (meta.orderId as string) || undefined;
              const buyerName = (meta.buyerName as string) || undefined;
              const buyerPhone = (meta.buyerPhone as string) || undefined;

              // attempt to fetch item snapshot
              let itemSnapshot = null;
              if (productId) {
                try {
                  const item = await ItemModel.findById(productId).lean();
                  if (item) {
                    itemSnapshot = item;
                    // mark item as sold
                    try {
                      await ItemModel.updateOne({ _id: productId }, { $set: { isSold: true } });
                    } catch (markErr: any) {
                      console.error("Failed to mark item as sold:", markErr);
                    }
                  }
                } catch (itmErr: any) {
                  console.error("Failed to load item for payment snapshot:", itmErr);
                }
              }

              const created = await StripePaymentModel.create({
                sessionId: session.id,
                paymentIntentId: (session.payment_intent as string) || undefined,
                amount: session.amount_total ? Number(session.amount_total) / 100 : 0,
                currency: session.currency || "usd",
                customerEmail: session.customer_email || "",
                metadata: meta,
                productId,
                orderId,
                buyerName,
                buyerPhone,
                itemSnapshot,
                status: "completed",
                raw: session,
              });

              console.log("Saved StripePaymentModel (session):", created._id?.toString ? created._id.toString() : created._id);

              // Also create legacy eSewa-like PaymentModel entry if metadata contains required fields
              try {
                const paymentExists = await PaymentModel.findOne({
                  refId: meta.refId || orderId || session.id,
                });
                if (!paymentExists) {
                  const paymentDoc = {
                    fullName:
                      meta.fullName || meta.buyerName || buyerName || "",
                    phoneNo:
                      meta.phoneNo || meta.buyerPhone || buyerPhone || "",
                    email: session.customer_email || meta.email || "",
                    phoneModel: meta.phoneModel || "",
                    sellerId: meta.sellerId || "",
                    price:
                      Number(meta.price) ||
                      (session.amount_total ? Number(session.amount_total) / 100 : 0),
                    location: meta.location || "",
                    date: meta.date || new Date().toISOString().split("T")[0],
                    time: meta.time || new Date().toLocaleTimeString(),
                    oid: meta.oid || orderId || session.id,
                    refId: meta.refId || orderId || session.id,
                    amt:
                      String(meta.amt) ||
                      (session.amount_total ? String(session.amount_total) : "0"),
                    status: "Success",
                    raw: JSON.stringify(session),
                  };

                  await PaymentModel.create(paymentDoc as any);
                }
              } catch (pmErr: any) {
                console.error("Failed to create PaymentModel record:", pmErr);
              }
            }
          } catch (dbErr: any) {
            console.error("Failed to persist Stripe session:", dbErr);
          }
          break;
        }

        case "payment_intent.succeeded": {
          const pi = event.data.object as Stripe.PaymentIntent;
          console.log("PaymentIntent succeeded:", pi.id);
          try {
            const existing = await StripePaymentModel.findOne({ paymentIntentId: pi.id });
            if (!existing) {
              const meta = pi.metadata || {};
              const productId = (meta.productId as string) || undefined;
              const orderId = (meta.orderId as string) || undefined;
              const buyerName = (meta.buyerName as string) || undefined;
              const buyerPhone = (meta.buyerPhone as string) || undefined;

              // attempt to fetch item snapshot
              let itemSnapshot = null;
              if (productId) {
                try {
                  const item = await ItemModel.findById(productId).lean();
                  if (item) {
                    itemSnapshot = item;
                    // mark item as sold
                    try {
                      await ItemModel.updateOne({ _id: productId }, { $set: { isSold: true } });
                    } catch (markErr: any) {
                      console.error("Failed to mark item as sold:", markErr);
                    }
                  }
                } catch (itmErr: any) {
                  console.error("Failed to load item for payment snapshot:", itmErr);
                }
              }

              const created = await StripePaymentModel.create({
                sessionId: undefined,
                paymentIntentId: pi.id,
                amount: pi.amount ? Number(pi.amount) / 100 : 0,
                currency: pi.currency || "usd",
                customerEmail: pi.receipt_email || "",
                metadata: meta,
                productId,
                orderId,
                buyerName,
                buyerPhone,
                itemSnapshot,
                status: "completed",
                raw: pi,
              });

              console.log("Saved StripePaymentModel (payment_intent):", created._id?.toString ? created._id.toString() : created._id);

              // Also create legacy PaymentModel entry if needed
              try {
                const paymentExists = await PaymentModel.findOne({
                  refId: meta.refId || orderId || pi.id,
                });
                if (!paymentExists) {
                  const paymentDoc = {
                    fullName:
                      meta.fullName || meta.buyerName || buyerName || "",
                    phoneNo:
                      meta.phoneNo || meta.buyerPhone || buyerPhone || "",
                    email: pi.receipt_email || meta.email || "",
                    phoneModel: meta.phoneModel || "",
                    sellerId: meta.sellerId || "",
                    price:
                      Number(meta.price) ||
                      (pi.amount ? Number(pi.amount) / 100 : 0),
                    location: meta.location || "",
                    date: meta.date || new Date().toISOString().split("T")[0],
                    time: meta.time || new Date().toLocaleTimeString(),
                    oid: meta.oid || orderId || pi.id,
                    refId: meta.refId || orderId || pi.id,
                    amt:
                      String(meta.amt) ||
                      (pi.amount ? String(pi.amount) : "0"),
                    status: "Success",
                    raw: JSON.stringify(pi),
                  };

                  await PaymentModel.create(paymentDoc as any);
                }
              } catch (pmErr: any) {
                console.error("Failed to create PaymentModel record:", pmErr);
              }
            }
          } catch (dbErr: any) {
            console.error("Failed to persist PaymentIntent:", dbErr);
          }
          break;
        }

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      return res.json({ received: true });
    } catch (err: any) {
      console.error("Error handling webhook event:", err);
      return res.status(500).send("Webhook handler error");
    }
  }
}

export default new PaymentController();