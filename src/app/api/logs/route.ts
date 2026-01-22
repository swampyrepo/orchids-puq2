import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export async function GET() {
  try {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    
    const { data: successLogs, error: successError } = await supabase
      .from("usage_logs")
      .select("*")
      .eq("is_success", true)
      .gte("created_at", fiveHoursAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: errorLogs, error: errorError } = await supabase
      .from("usage_logs")
      .select("*")
      .eq("is_success", false)
      .gte("created_at", fiveHoursAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    if (successError) throw successError;
    if (errorError) throw errorError;

    // Fetch user profiles for the logs
    const allLogs = [...(successLogs || []), ...(errorLogs || [])];
    const userIds = [...new Set(allLogs.map(log => log.user_id).filter(Boolean))];
    
    let profileMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_number")
        .in("id", userIds);
      
      profiles?.forEach(p => profileMap.set(p.id, p.user_number));
    }

    const formatLogs = (logs: any[]) => logs?.map(log => ({
      ...log,
      router: log.endpoint,
      method: log.method,
      status: log.status_code,
      user_agent: log.user_agent,
      ip_address: log.ip_address,
      username: profileMap.has(log.user_id) ? `user${profileMap.get(log.user_id)}` : 'Guest',
      timestamp: new Date(log.created_at).toLocaleTimeString(),
      date_now: new Date(log.created_at).toLocaleString()
    })) || [];

    return prettyJson({
      success: true,
      latest_command: formatLogs(successLogs),
      latest_error: formatLogs(errorLogs)
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return prettyJson({ error: "Failed to fetch logs" }, 500);
  }
}
