import { NextRequest, NextResponse } from "next/server";
import { verifyStripeSignature, verifyRazorpaySignature } from "@/lib/webhooks";
import { applySubscriptionCycle, updateSubscriptionStatus } from "@/lib/subscriptions";

/**
 * Public Webhook Handler for Payment Providers (Stripe / Razorpay).
 * Fully idempotent, cryptographically verified, and server-controlled.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const provider = request.nextUrl.searchParams.get("provider") ?? "stripe";

    if (provider === "stripe") {
      const signature = request.headers.get("stripe-signature");
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        return NextResponse.json(
          { error: "Stripe webhook secret not configured on server" },
          { status: 500 }
        );
      }

      if (!signature) {
        return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
      }

      const { isValid, error } = verifyStripeSignature({
        payload: rawBody,
        signatureHeader: signature,
        secret: webhookSecret,
      });

      if (!isValid) {
        return NextResponse.json({ error: error ?? "Invalid webhook signature" }, { status: 400 });
      }

      const event = JSON.parse(rawBody);

      switch (event.type) {
        case "customer.subscription.created":
        case "invoice.paid": {
          const invoice = event.data.object;
          const userId = invoice.subscription_details?.metadata?.user_id || invoice.metadata?.user_id;

          if (!userId) {
            return NextResponse.json({ received: true, note: "No user_id found in metadata" });
          }

          const periodStart = new Date(invoice.period_start * 1000).toISOString();
          const periodEnd = new Date(invoice.period_end * 1000).toISOString();

          await applySubscriptionCycle({
            userId,
            plan: "pro",
            billingCycle: invoice.lines?.data?.[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly",
            provider: "stripe",
            providerSubscriptionId: invoice.subscription ?? invoice.id,
            providerCustomerId: invoice.customer,
            periodStart,
            periodEnd,
            eventId: event.id,
          });
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          const userId = subscription.metadata?.user_id;
          if (userId) {
            await updateSubscriptionStatus({
              userId,
              status: "canceled",
              canceledAt: new Date().toISOString(),
            });
          }
          break;
        }

        default:
          break;
      }

      return NextResponse.json({ received: true });
    }

    if (provider === "razorpay") {
      const signature = request.headers.get("x-razorpay-signature");
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

      if (!webhookSecret) {
        return NextResponse.json(
          { error: "Razorpay webhook secret not configured on server" },
          { status: 500 }
        );
      }

      if (!signature) {
        return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
      }

      const isValid = verifyRazorpaySignature({
        payload: rawBody,
        signature,
        secret: webhookSecret,
      });

      if (!isValid) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }

      const event = JSON.parse(rawBody);

      if (event.event === "subscription.charged") {
        const payload = event.payload.subscription.entity;
        const userId = payload.notes?.user_id;

        if (userId) {
          await applySubscriptionCycle({
            userId,
            plan: "pro",
            billingCycle: "monthly",
            provider: "razorpay",
            providerSubscriptionId: payload.id,
            providerCustomerId: payload.customer_id,
            periodStart: new Date(payload.current_start * 1000).toISOString(),
            periodEnd: new Date(payload.current_end * 1000).toISOString(),
            eventId: event.id ?? payload.id,
          });
        }
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[webhooks] Handler error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
