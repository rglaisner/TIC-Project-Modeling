import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const appPasscode = process.env.APP_ACCESS_PASSCODE;
    if (!appPasscode) {
      return NextResponse.json({ error: "APP_ACCESS_PASSCODE is not configured." }, { status: 500 });
    }

    const payload = (await request.json()) as { passcode?: string };
    const passcode = payload.passcode?.trim() ?? "";
    if (passcode.length === 0 || passcode !== appPasscode) {
      return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set("app_session", "valid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown session error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
