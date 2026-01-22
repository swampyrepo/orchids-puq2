import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if profile exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("token")
        .eq("id", data.user.id)
        .single();

      if (!profile || !profile.token) {
        // Try to get a reserved token first
        const { data: reservedToken } = await supabase
          .from("reserved_tokens")
          .select("token")
          .eq("is_used", false)
          .limit(1)
          .single();

        let tokenToAssign: string;

        if (reservedToken) {
          tokenToAssign = reservedToken.token;
          await supabase
            .from("reserved_tokens")
            .update({ is_used: true })
            .eq("token", tokenToAssign);
        } else {
          // Generate a random token
          tokenToAssign = "VREDEN-" + Math.random().toString(36).substring(2, 15).toUpperCase();
        }

        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
          avatar_url: data.user.user_metadata?.avatar_url,
          token: tokenToAssign,
        });
      } else {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
          avatar_url: data.user.user_metadata?.avatar_url,
        });
      }
    }
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
