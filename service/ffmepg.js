const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
let pMap;
(async () => {
    pMap = (await import("p-map")).default;
})();

const tempDir = path.resolve("tmp");

// Ensure tmp directory exists
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const VIDEO_RESOLUTION = "720:1280";
const FRAME_RATE = 30;
const IMAGE_DURATION = 5;
const CONCURRENCY_LIMIT = 2; // Adjust for your CPU

async function createClip(name) {
    console.time("Total");

    console.time("ImageVideos");

    const clips = await pMap(
        [0, 1, 2, 3, 4],
        async (index) => {
            const imagePath = path.join(tempDir, `${name}-${index}.jpg`);
            const videoPath = path.join(tempDir, `${name}-${index}.mp4`);
            await createImageVideo(imagePath, videoPath, IMAGE_DURATION);
            return videoPath;
        },
        { concurrency: CONCURRENCY_LIMIT }
    );

    console.timeEnd("ImageVideos");

    console.time("Concatenation");
    const concatenatedVideo = await concatenateClips(name, clips);
    console.timeEnd("Concatenation");

    console.time("AddAudio");
    await addAudio(concatenatedVideo, name);
    console.timeEnd("AddAudio");

    console.timeEnd("Total");

    console.log(`🎉 Final video created at: ${path.join(tempDir, `${name}.mp4`)}`);
}

// Create video from a single image
function createImageVideo(imagePath, outputPath, duration) {
    return new Promise((resolve, reject) => {
        ffmpeg(imagePath)
            .loop(duration)
            .outputOptions([
                `-t ${duration}`,
                `-vf scale='iw*min(720/iw\\,1280/ih)':'ih*min(720/iw\\,1280/ih)',pad=720:1280:(720-iw*min(720/iw\\,1280/ih))/2:(1280-ih*min(720/iw\\,1280/ih))/2,format=yuv420p`,
                `-r ${FRAME_RATE}`,
                `-r ${FRAME_RATE}`,
                "-preset ultrafast",
                "-c:v libx264",
                "-pix_fmt yuv420p",
                "-movflags +faststart",
                "-threads 2"
            ])
            .save(outputPath)
            .on("end", () => {
                console.log(`📸 Created clip: ${outputPath}`);
                resolve(outputPath);
            })
            .on("error", reject);
    });
}

// Concatenate video clips
function concatenateClips(name, clips) {
    const concatListPath = path.join(tempDir, `concat_list.txt`);
    const outputPath = path.join(tempDir, `${name}-tmp.mp4`);

    // Write list file for ffmpeg concat
    fs.writeFileSync(concatListPath, clips.map(file => `file '${file}'`).join("\n"));

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(concatListPath)
            .inputOptions(["-f concat", "-safe 0"])
            .outputOptions(["-c copy"])
            .save(outputPath)
            .on("end", () => {
                console.log("✅ Concatenated video created");
                resolve(outputPath);
            })
            .on("error", reject);
    });
}

// Add background audio to video
function addAudio(videoPath, name) {
    const audioPath = path.join(tempDir, `${name}.mp3`);
    const finalOutput = path.join(tempDir, `${name}.mp4`);

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions([
                "-c:v copy",
                "-c:a aac",
                "-shortest"
            ])
            .save(finalOutput)
            .on("end", () => {
                console.log("🎵 Audio added to video");
                resolve();
            })
            .on("error", reject);
    });
}

module.exports = { createClip };
