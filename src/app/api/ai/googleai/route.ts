import { NextRequest } from "next/server";
import { incrementStat, logApiRequest } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get("prompt") || "";
  const type = searchParams.get("type") || "Chat";
  const imageUrl = searchParams.get("imageUrl") || "";
  const imageUrl2 = searchParams.get("imageUrl2") || "";
  const imageUrl3 = searchParams.get("imageUrl3") || "";
  const imageUrl4 = searchParams.get("imageUrl4") || "";
  const cookie = searchParams.get("cookie") || "";

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "browser";

  const validTypes = ["Chat", "NanoBanana", "StoryBook", "StudyGuide"];
  
  if (!validTypes.includes(type)) {
    return prettyJson({ 
      status: false, 
      error: `Invalid type. Valid types: ${validTypes.join(", ")}` 
    }, 400);
  }

  await incrementStat("total_requests");

  try {
    const apiUrl = new URL("https://anabot.my.id/api/ai/geminiOption");
    apiUrl.searchParams.set("prompt", prompt);
    apiUrl.searchParams.set("type", type);
    apiUrl.searchParams.set("imageUrl", imageUrl);
    apiUrl.searchParams.set("imageUrl2", imageUrl2);
    apiUrl.searchParams.set("imageUrl3", imageUrl3);
    apiUrl.searchParams.set("imageUrl4", imageUrl4);
    apiUrl.searchParams.set("cookie", cookie);
    apiUrl.searchParams.set("apikey", "freeApikey");

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    const data = await response.json();

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/ai/googleai",
      status: 200,
      user_agent: userAgent
    });

    return prettyJson({
      status: true,
      creator: "Vallzx APIs",
      provider: "google.com",
      type,
      result: data
    }, 200);

  } catch (error: any) {
    console.error("Google AI Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/ai/googleai",
      status: 500,
      user_agent: userAgent
    });
    return prettyJson({ status: false, error: error.message || "Failed to process AI request" }, 500);
  }
}
