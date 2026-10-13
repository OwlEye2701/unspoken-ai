import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redeemCoupon } from "@/lib/coupons";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

    // Check Bearer token if cookies not present
    if (!user) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7).trim();
        if (token) {
          const { data: tokenData } = await supabase.auth.getUser(token);
          if (tokenData?.user) {
            user = tokenData.user;
          }
        }
      }
    }

    // In local dev sandbox, fallback to mock guest or session
    if (!user) {
      if (process.env.NODE_ENV !== "production") {
        user = {
          id: "00000000-0000-0000-0000-000000000000",
        } as unknown as typeof user;
      } else {
        return NextResponse.json({ error: "Please log in to redeem coupons." }, { status: 401 });
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Please log in to redeem coupons." }, { status: 401 });
    }

    const body = await request.json();
    const code = body?.code;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Please enter a coupon code." }, { status: 400 });
    }

    const result = await redeemCoupon(user.id, code);

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Invalid coupon code." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      tokens: result.tokens,
      newBalance: result.newBalance,
      message: `Success! Added ${result.tokens} tokens to your account.`,
    });
  } catch (err: unknown) {
    console.error("[api/redeem-coupon] Error:", err);
    return NextResponse.json({ error: "Failed to redeem coupon. Please try again." }, { status: 500 });
  }
}
