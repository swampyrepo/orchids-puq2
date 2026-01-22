import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, endpoint, credits_cost = 1 } = body;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
               request.headers.get("x-real-ip") || 
               "unknown";

    if (user_id) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user_id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (profile.credits < credits_cost) {
        return NextResponse.json({ 
          error: "Insufficient credits",
          remaining_credits: profile.credits 
        }, { status: 403 });
      }

      const { error: deductError } = await supabase
        .from("profiles")
        .update({ credits: profile.credits - credits_cost })
        .eq("id", user_id);

      if (deductError) {
        return NextResponse.json({ error: "Failed to deduct credits" }, { status: 500 });
      }

      await supabase.from("api_usage").insert({
        user_id,
        endpoint,
        credits_used: credits_cost,
      });

      return NextResponse.json({
        success: true,
        remaining_credits: profile.credits - credits_cost,
      });
    } else {
      const weekStart = getWeekStart(new Date());

      const { data: guestUsage, error: guestError } = await supabase
        .from("guest_usage")
        .select("request_count")
        .eq("ip_address", ip)
        .eq("week_start", weekStart)
        .single();

      if (guestError && guestError.code !== "PGRST116") {
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }

      const currentCount = guestUsage?.request_count || 0;

      if (currentCount >= 10) {
        return NextResponse.json({
          error: "Weekly guest limit reached. Please login to continue.",
          limit: 10,
          used: currentCount,
        }, { status: 403 });
      }

      if (guestUsage) {
        await supabase
          .from("guest_usage")
          .update({ request_count: currentCount + 1 })
          .eq("ip_address", ip)
          .eq("week_start", weekStart);
      } else {
        await supabase.from("guest_usage").insert({
          ip_address: ip,
          week_start: weekStart,
          request_count: 1,
        });
      }

      return NextResponse.json({
        success: true,
        remaining_requests: 10 - (currentCount + 1),
        is_guest: true,
      });
    }
  } catch (error) {
    console.error("Credit usage error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
             request.headers.get("x-real-ip") || 
             "unknown";

  if (user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user_id)
      .single();

    return NextResponse.json({
      credits: profile?.credits || 0,
      is_guest: false,
    });
  } else {
    const weekStart = getWeekStart(new Date());
    
    const { data: guestUsage } = await supabase
      .from("guest_usage")
      .select("request_count")
      .eq("ip_address", ip)
      .eq("week_start", weekStart)
      .single();

    return NextResponse.json({
      remaining_requests: 10 - (guestUsage?.request_count || 0),
      weekly_limit: 10,
      is_guest: true,
    });
  }
}
