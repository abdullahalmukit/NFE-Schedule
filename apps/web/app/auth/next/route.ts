import { NextResponse, type NextRequest } from "next/server";
import { getAppState, pathForStage } from "@/lib/app-state";

/** After any sign-in: active → home, pending / disabled → N-17. */
export async function GET(request: NextRequest) {
  const { stage } = await getAppState();
  return NextResponse.redirect(new URL(pathForStage(stage), request.nextUrl.origin));
}
