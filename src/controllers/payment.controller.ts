import { Request, Response } from "express";
import Stripe from "stripe";
import { StripePaymentModel } from "../models/stripePayment.model";
import { PaymentModel } from "../models/payment.model";
import { ItemModel } from "../models/item.model";

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(stripeSecret, {} as Stripe.StripeConfig);

export class PaymentController {
  async createStripeCheckout(req: Request, res: Response) {
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
      } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const origin = (req.headers.origin as string) || process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000";

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
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/stripe/cancel?order_id=${encodeURIComponent(orderId || productId || "")}`,
        customer_email: buyerEmail || undefined,
        metadata: {
          orderId: orderId || "",
          productId: productId || "",
          buyerName: buyerName || "",
          buyerPhone: buyerPhone || "",
          // include eSewa-like fields so webhook can persist PaymentModel
          fullName: fullName || buyerName || "",
          phoneNo: phoneNo || buyerPhone || "",
          phoneModel: phoneModel || "",
          sellerId: sellerId || "",
          price: price || amount,
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
      return res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  }

  // Stripe webhook handler — expects raw body (register route with express.raw middleware)
  async handleStripeWebhook(req: Request, res: Response) {
    const sig = req.headers["stripe-signature"] as string | undefined;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    let event: Stripe.Event;
    try {
      const rawBody = req.body as Buffer;
      if (!sig) throw new Error("Missing stripe-signature header");
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log("Checkout session completed:", session.id);
          try {
            const existing = await StripePaymentModel.findOne({ sessionId: session.id });
            if (!existing) {
              // extract metadata
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
                amount: session.amount_total ? (Number(session.amount_total) / 100) : 0,
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

              // Also create legacy eSewa-like PaymentModel entry if metadata contains required fields
              try {
                const paymentExists = await PaymentModel.findOne({ refId: meta.refId || orderId || session.id });
                if (!paymentExists) {
                  const paymentDoc = {
                    fullName: meta.fullName || meta.buyerName || buyerName || "",
                    phoneNo: meta.phoneNo || meta.buyerPhone || buyerPhone || "",
                    email: session.customer_email || meta.email || "",
                    phoneModel: meta.phoneModel || "",
                    sellerId: meta.sellerId || "",
                    price: Number(meta.price || (session.amount_total ? (Number(session.amount_total) / 100) : 0)),
                    location: meta.location || "",
                    date: meta.date || new Date().toISOString().split("T")[0],
                    time: meta.time || new Date().toLocaleTimeString(),
                    oid: meta.oid || orderId || session.id,
                    refId: meta.refId || orderId || session.id,
                    amt: String(meta.amt || (session.amount_total ? String(session.amount_total) : "0")),
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
