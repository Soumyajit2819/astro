import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      (await req.json()) as {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      };

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay secret not configured." }, { status: 500 });
    }

    // Razorpay signature verification
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return NextResponse.json({ verified: false, error: "Invalid signature." }, { status: 400 });
    }

    return NextResponse.json({ verified: true, payment_id: razorpay_payment_id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed." },
      { status: 500 }
    );
  }
}
