import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADMIN_COOKIE = "astro_admin_session";

export async function POST(request: Request) {
  const { passcode } = (await request.json()) as { passcode?: string };
  const expectedPasscode = process.env.ADMIN_PASSCODE;

  if (!expectedPasscode) {
    return NextResponse.json({ error: "ADMIN_PASSCODE is not configured." }, { status: 500 });
  }

  if (!passcode || passcode !== expectedPasscode) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "authorized", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
