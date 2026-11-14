import { NextResponse, type NextRequest } from "next/server";
import { getAppState, pathForStage } from "@/lib/app-state";
import { createClient } from "@/lib/supabase/server";

/** After any sign-in: active → home, pending / disabled → N-17. */
export async function GET(request: NextRequest) {
  const { stage } = await getAppState();
  if (stage === "ready") {
    // AUTH-3: claims the main role when auth.main_admin_email matches and none exists yet.
    await (await createClient()).rpc("claim_main_admin");
  }
  return NextResponse.redirect(new URL(pathForStage(stage), request.nextUrl.origin));
}
