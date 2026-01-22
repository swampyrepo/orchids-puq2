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
  const url = searchParams.get("url");
  const quality = searchParams.get("quality") || "highest";

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "browser";

  if (!url) {
    return prettyJson({ status: false, error: "Parameter 'url' is required" }, 400);
  }

  const videoId = extractVideoId(url);
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

    const title = data.title || "YouTube Video";
    const duration = data.lengthSeconds || 0;
    const thumbnail = data.thumbnail?.url || data.thumbnails?.[0]?.url || "";

    let videos: any[] = [];
    let audios: any[] = [];

    if (data.videos && Array.isArray(data.videos.items)) {
      videos = data.videos.items.filter((v: any) => v.url);
    } else if (data.formats && Array.isArray(data.formats)) {
      videos = data.formats.filter((f: any) => f.url && f.mimeType?.includes("video"));
      audios = data.formats.filter((f: any) => f.url && f.mimeType?.includes("audio"));
    }

    if (data.audios && Array.isArray(data.audios.items)) {
      audios = data.audios.items.filter((a: any) => a.url);
    }

    const sortedVideos = videos.sort((a: any, b: any) => {
      const getQuality = (item: any) => {
        const q = item.quality || item.qualityLabel || "";
        const match = q.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      return getQuality(b) - getQuality(a);
    });

    const sortedAudios = audios.sort((a: any, b: any) => {
      const getBitrate = (item: any) => item.bitrate || item.audioBitrate || 0;
      return getBitrate(b) - getBitrate(a);
    });

    const bestVideo = sortedVideos[0];
    const bestAudio = sortedAudios[0];

    const videoFormats = sortedVideos.map((v: any) => ({
      quality: v.quality || v.qualityLabel || "unknown",
      url: v.url,
      mimeType: v.mimeType || v.extension || "video/mp4",
      hasAudio: v.hasAudio !== false && !v.qualityLabel?.includes("video only"),
      size: v.contentLength || v.size || null
    }));

    const audioFormats = sortedAudios.map((a: any) => ({
      quality: a.quality || `${a.audioBitrate || a.bitrate}kbps`,
      url: a.url,
      mimeType: a.mimeType || "audio/mp4",
      size: a.contentLength || a.size || null
    }));

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/youtube-hd",
      status: 200,
      user_agent: userAgent
    });

    return prettyJson({
      status: true,
      creator: "Vallzx APIs",
      result: {
        title,
        videoId,
        duration,
        thumbnail,
        bestVideo: bestVideo ? {
          quality: bestVideo.quality || bestVideo.qualityLabel,
          url: bestVideo.url,
          hasAudio: bestVideo.hasAudio !== false
        } : null,
        bestAudio: bestAudio ? {
          quality: bestAudio.quality || `${bestAudio.audioBitrate}kbps`,
          url: bestAudio.url
        } : null,
        videos: videoFormats,
        audios: audioFormats,
        note: "Untuk video HD tanpa audio, gunakan FFmpeg untuk merge dengan audio terpisah"
      }
    }, 200);

  } catch (error: any) {
    console.error("YouTube HD Downloader Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/youtube-hd",
      status: 500,
      user_agent: userAgent
    });
    return prettyJson({ status: false, error: error.message || "Gagal mengambil info video" }, 500);
  }
}
