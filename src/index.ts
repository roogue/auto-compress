import { input, select } from "@inquirer/prompts";
import ffmpeg from "fluent-ffmpeg";
import _path from "path";

interface VideoData {
  fps: number;
  duration: number;
  name: string;
}

(async () => {
  const rawPathToVideo = await input({message: "Path to File: "});
  const pathToVideo = _path.resolve(__dirname, rawPathToVideo);

  const videoData = {} as VideoData;
  ffmpeg.ffprobe(pathToVideo, (_, metadata) => {
    // FPS
    const frameRateString =
      metadata.streams[0].r_frame_rate?.split("/") || null;
    if (frameRateString) {
      const frameRateUpper = Number(frameRateString[0]);
      const frameRateLower = Number(frameRateString[1]);
      videoData.fps = Math.ceil(frameRateUpper / frameRateLower);
    } else {
      videoData.fps = 30;
    }

    // Duration
    videoData.duration = Number(metadata.format.duration);
    if (isNaN(videoData.duration)) {
      throw "Duration is null";
    }

    // File name
    videoData.name = metadata.format.filename || "Untitled.mp4";
  });

  let targetFPS = await select({
    message: "Targetted FPS: ",
    default: 30,
    choices: [
      { name: "24 fps", description: "general for movies", value: 24 },
      { name: "30 fps", description: "best for social media", value: 30 },
      { name: "60 fps", description: "for smoother video", value: 60 },
      { name: "default", description: "use the input video's fps", value: 0 },
    ],
  });
  if (targetFPS > videoData.fps) {
    targetFPS = videoData.fps;
  }

  const targetAudioBitrate = await select({
    message: "Targetted FPS: ",
    default: "128k",
    choices: [
      {
        name: "32kbps",
        description: "very compressed (literally no details)",
        value: "32k",
      },
      { name: "64kbps", description: "low quality streaming", value: "64k" },
      { name: "128kbps", description: "best for social media", value: "128k" },
      { name: "192kbps", description: "better audio quality", value: "192k" },
      { name: "No compression", value: "" },
    ],
  });

  let targetSize = await select({
    message: "Targetted File Size: ",
    default: 35,
    choices: [
      { name: "8 MB", description: "Discord", value: 8 },
      { name: "25 MB", description: "Facebook", value: 25 },
      { name: "35 MB", description: "Whatsapp", value: 35 },
      { name: "100 MB", description: "Discord Nitro", value: 100 },
      { name: "287 MB", description: "Tiktok", value: 287 },
      { name: "512 MB", description: "Tweeter", value: 512 },
      { name: "Other", value: 0 },
    ],
  });
  if (!targetSize) {
    targetSize = Number(await input({ message: "Targetted File Size(MB): " }));
  }

  const targetBitrate =
    ((targetSize * 1e6 * 8) / videoData.duration / 1000) * 0.90; // 10% less

  ffmpeg()
    .addInput(pathToVideo)
    .withOutputFps(targetFPS)
    .videoCodec("nvenc_hevc")
    .videoBitrate(targetBitrate + "k")
    .audioBitrate(targetAudioBitrate)
    .addOutput(
      _path.format({
        ..._path.parse(pathToVideo),
        base: "",
        ext: "_resized.mp4",
      })
    )
    .run();
})();
