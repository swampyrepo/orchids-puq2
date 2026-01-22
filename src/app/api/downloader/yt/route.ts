import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY!;
const RAPIDAPI_HOST = "youtube-media-downloader.p.rapidapi.com";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const youtubeUrl = searchParams.get("youtube_url");
  const type = searchParams.get("type");

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "browser";

  if (!youtubeUrl) {
    return prettyJson({ status: false, error: "Parameter 'youtube_url' is required" }, 400);
  }

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    return prettyJson({ status: false, error: "Invalid YouTube URL" }, 400);
  }

  await incrementStat("total_requests");

  try {
    const apiUrl = `https://${RAPIDAPI_HOST}/v2/video/details?videoId=${videoId}`;
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`RapidAPI request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.status === "fail") {
      throw new Error(data.message || "Failed to get video info");
    }

    let allUrls: string[] = [];

    const extractGoogleVideoUrls = (obj: any): string[] => {
      const urls: string[] = [];
      const jsonStr = JSON.stringify(obj);
      const regex = /https:\/\/[^"]*googlevideo\.com[^"]*/g;
      const matches = jsonStr.match(regex);
      if (matches) {
        urls.push(...matches);
      }
      return urls;
    };

    allUrls = extractGoogleVideoUrls(data);

    if (allUrls.length === 0) {
      throw new Error("No media URLs found");
    }

    const uniqueUrls = [...new Set(allUrls)];
    const randomIndex = Math.floor(Math.random() * uniqueUrls.length);
    const selectedUrl = uniqueUrls[randomIndex];

    let mp3Url: string | null = null;
    let mp4Url: string | null = null;

    for (const url of uniqueUrls) {
      if (url.includes("mime=audio") || url.includes("audio")) {
        if (!mp3Url) mp3Url = url;
      } else if (url.includes("mime=video") || url.includes("video")) {
        if (!mp4Url) mp4Url = url;
      }
    }

    if (!mp3Url && uniqueUrls.length > 0) {
      mp3Url = uniqueUrls[uniqueUrls.length - 1];
    }
    if (!mp4Url && uniqueUrls.length > 0) {
      mp4Url = uniqueUrls[0];
    }

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/yt",
      status: 200,
      user_agent: userAgent
    });

    if (type === "mp3") {
      return NextResponse.redirect(mp3Url || selectedUrl);
    } else if (type === "mp4") {
      return NextResponse.redirect(mp4Url || selectedUrl);
    }

    return prettyJson({
      status: true,
      creator: "Vallzx APIs",
      result: {
        title: data.title || "YouTube Video",
        videoId,
        mp3_url: mp3Url,
        mp4_url: mp4Url
      }
    }, 200);

  } catch (error: any) {
    console.error("YouTube Downloader Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/yt",
      status: 500,
      user_agent: userAgent
    });
    return prettyJson({ status: false, error: error.message || "Gagal mengambil info video" }, 500);
  }
}
