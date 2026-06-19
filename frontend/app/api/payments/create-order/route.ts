import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { amount, currency = "INR", receipt } = (await req.json()) as {
      amount: number;
      currency?: string;
      receipt?: string;
    };

    if (!amount || amount < 1) {
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay keys not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local." },
        { status: 500 }
      );
    }

    // Razorpay amount is in paise (multiply ₹ by 100)
    const body = JSON.stringify({
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt ?? `rcpt_${Date.now()}`,
    });

    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body,
    });

    if (!rzpRes.ok) {
      const err = await rzpRes.text();
      return NextResponse.json({ error: err }, { status: rzpRes.status });
    }

    const order = await rzpRes.json();
    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Order creation failed." },
      { status: 500 }
    );
  }
}
