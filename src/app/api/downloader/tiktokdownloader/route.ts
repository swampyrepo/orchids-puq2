import { NextRequest, NextResponse } from "next/server";
import { incrementStat, logApiRequest, supabase } from "@/lib/supabase";
import { prettyJson } from "@/lib/utils";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tiktokvid_url = searchParams.get("tiktokvid_url");

    if (!tiktokvid_url) {
      return prettyJson({ status: false, error: "Parameter 'tiktokvid_url' is required" }, 400);
    }

  const userIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const realUA = req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  await incrementStat("total_hits");

    try {
      const targetUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokvid_url)}&hd=1`;
      
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": realUA,
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from provider: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.code !== 0 || !data.data) {
        throw new Error(data.msg || "Failed to get data from provider response");
      }

      const videoUrl = data.data.hdplay || data.data.play;
      const musicUrl = data.data.music || data.data.music_info?.play;
    const title = data.data.title || "TikTok Video";
    const author = data.data.author?.nickname || "Unknown";
    const thumbnailUrl = data.data.cover || data.data.origin_cover || null;

    if (!videoUrl) {
      throw new Error("No video URL found in provider response");
    }

    const videoResponse = await fetch(videoUrl, {
      headers: { "User-Agent": realUA }
    });
    if (!videoResponse.ok) throw new Error("Failed to fetch video file");
    const videoBuffer = await videoResponse.arrayBuffer();

    let musicBuffer: ArrayBuffer | null = null;
    if (musicUrl) {
      const musicResponse = await fetch(musicUrl, {
        headers: { "User-Agent": realUA }
      });
      if (musicResponse.ok) {
        musicBuffer = await musicResponse.arrayBuffer();
      }
    }

    const id = crypto.randomUUID();
    const mp4FileName = `${id}.mp4`;
    const mp3FileName = musicBuffer ? `${id}.mp3` : null;

    const { error: videoUploadError } = await supabase.storage
      .from("tiktok-downloads")
      .upload(mp4FileName, videoBuffer, {
        contentType: "video/mp4",
        upsert: true
      });

    if (videoUploadError) {
      throw new Error(`Failed to upload video to storage: ${videoUploadError.message}`);
    }

    if (musicBuffer && mp3FileName) {
      await supabase.storage
        .from("tiktok-downloads")
        .upload(mp3FileName, musicBuffer, {
          contentType: "audio/mpeg",
          upsert: true
        });
    }

    const { error: dbError } = await supabase
      .from("tiktok_downloads")
      .insert({
        id,
        tiktok_url: tiktokvid_url,
        mp4_path: mp4FileName,
        mp3_path: mp3FileName,
        thumbnail_url: thumbnailUrl,
        title,
        author
      });

    if (dbError) {
      throw new Error(`Failed to save metadata: ${dbError.message}`);
    }

    await incrementStat("total_success");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/tiktokdownloader",
      status: 200,
      user_agent: realUA
    });

    const resultPageUrl = `${req.nextUrl.origin}/result/mp4/tiktokdownloader.app/view/${id}`;
    return NextResponse.redirect(resultPageUrl);
  } catch (error: any) {
    console.error("TikTok Downloader API Error:", error);
    await incrementStat("total_errors");
    await logApiRequest({
      ip_address: userIP,
      method: "GET",
      router: "/api/downloader/tiktokdownloader",
      status: 500,
      user_agent: realUA
    });
    return prettyJson({ status: false, error: error.message }, 500);
  }
}
