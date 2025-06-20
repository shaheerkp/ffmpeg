const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

const tempDir = path.resolve("tmp");

// Ensure tmp directory exists
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const VIDEO_RESOLUTION = "640:360";
const FRAME_RATE = 30;
const IMAGE_DURATION = 6;

// Create individual video clips from images
async function createClip(name) {
    console.time("Total Time");
    const clips = await Promise.all(
        [0, 1, 2, 3, 4].map(index => {
            const imagePath = path.join(tempDir, `${name}-${index}.jpg`);
            const videoPath = path.join(tempDir, `${name}-${index}.mp4`);
            return createImageVideo(imagePath, videoPath, IMAGE_DURATION);
        })
    );

    const concatenatedVideo = await concatenateClips(name, clips);
    await addAudio(concatenatedVideo, name);
    console.timeEnd("Total Time");
    console.log(`🎉 Final video created at: ${path.join(tempDir, `${name}.mp4`)}`);
}

// Create video from a single image
function createImageVideo(imagePath, outputPath, duration) {
    return new Promise((resolve, reject) => {
        ffmpeg(imagePath)
            .loop(duration)
            .outputOptions([
                `-t ${duration}`,
                `-vf scale=${VIDEO_RESOLUTION}`,
                `-r ${FRAME_RATE}`,
                "-pix_fmt yuv420p",
                "-preset ultrafast",
                "-c:v libx264"
            ])
            .save(outputPath)
            .on("end", () => resolve(outputPath))
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
            .outputOptions(["-c:v copy", "-c:a aac", "-shortest"])
            .save(finalOutput)
            .on("end", resolve)
            .on("error", reject);
    });
}

module.exports = { createClip };
