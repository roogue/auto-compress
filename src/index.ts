import { input, select } from "@inquirer/prompts";
import ffmpeg from "fluent-ffmpeg";
import _path from "path";
import { exec } from "child_process";

interface VideoData {
  path: string;
  fps: number;
  duration: number;
  name: string;
}

(async () => {
  const videoData = {} as VideoData;

  const cwd = process.cwd();
  const linuxCommand = `bash ${_path.join(cwd, "/script/openDialog.sh")}`;
  const winCommand = `powershell -ExecutionPolicy Bypass -File ${_path.join(
    cwd,
    "/script/openDialog.ps1"
  )}`;

  if (process.platform === "linux" || process.platform === "win32") {
    await new Promise<void>((resolve, reject) => {
      exec(
        process.platform === "linux" ? linuxCommand : winCommand,
        (err, stdout, stderr) => {
          if (err || stderr) {
            console.log(err, stderr);
            reject();
          }

          const output = stdout.trim();
          if (output === "UserCancelled") {
            process.exit();
          } else {
            videoData.path = _path.resolve(cwd, output);
          }

          resolve();
        }
      );
    });
  }

  ffmpeg.ffprobe(videoData.path, (_, metadata) => {
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
    message: "Targetted Audio Bitrate(kbps): ",
    default: 128,
    choices: [
      {
        name: "32kbps",
        description: "very compressed (literally no details)",
        value: 32,
      },
      { name: "64kbps", description: "low quality streaming", value: 64 },
      { name: "128kbps", description: "best for social media", value: 128 },
      { name: "192kbps", description: "better audio quality", value: 192 },
      { name: "No compression", value: 0 },
    ],
  });

  let targetSize = await select({
    message: "Targetted File Size(MB): ",
    default: 30,
    choices: [
      { name: "8 MB", description: "Discord", value: 7 },
      { name: "25 MB", description: "Facebook", value: 20 },
      { name: "35 MB", description: "Whatsapp", value: 30 },
      { name: "100 MB", description: "Discord Nitro", value: 90 },
      { name: "287 MB", description: "Tiktok", value: 270 },
      { name: "512 MB", description: "Tweeter", value: 500 },
      { name: "Other", value: 0 },
    ],
  });
  if (!targetSize) {
    targetSize = Number(await input({ message: "Targetted File Size(MB): " }));
  }

  const targetBitrate =
    ((targetSize * 1e6 * 8) / videoData.duration / 1000 - targetAudioBitrate) *
    0.97; // 3% less

  let totalTime: number;
  const ffmpegCommand = ffmpeg()
    .on("start", () => {
      console.log("Compressing...");
    })
    .on("codecData", (data) => {
      totalTime = parseInt(data.duration.replace(/:/g, ""));
    })
    .on("progress", (progress) => {
      const time = parseInt(progress.timemark.replace(/:/g, ""));
      const percent = Math.round((time / totalTime) * 100);

      console.log(percent + "%");
    })
    .on("error", (err) => {
      console.log(err);
    })
    .addInput(videoData.path)
    .withOutputFps(targetFPS)
    .videoCodec("nvenc_hevc")
    .videoBitrate(targetBitrate + "k")
    .addOutput(
      _path.format({
        ..._path.parse(videoData.path),
        base: "",
        ext: "_resized.mp4",
      })
    );

  if (targetAudioBitrate) {
    ffmpegCommand.audioBitrate(targetAudioBitrate + "k");
  }

  ffmpegCommand.run();
})();
