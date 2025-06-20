// const path = require(" path")
const fs =require("fs")
const ffmpeg=require("fluent-ffmpeg");
const path = require("path");

// Step 0: Define image list and tmp directory


const tempDir = path.resolve('tmp');

// Make sure tmp folder exists
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Resolve full paths for image and audio files (assume all in /tmp now)


// Step 1: Create clips for each image
function createClip(name) {
    const imageDurations = [0, 1, 2, 3, 4].map((ele, index) => ({
        file: `${name}-${index}.jpg`,
        duration: 6
    }));

    const resolvedImages = imageDurations.map(({ duration }, index) => ({
        file: path.join(tempDir, `${name}-${index}.jpg`),
        duration,
    }));

    return new Promise((resolve, reject) => {
        const clips = [];
        let index = 0;

        function processNextImage() {
            if (index >= resolvedImages.length) {
                return concatenateClips(name, clips).then(resolve).catch(reject);
            }

            const { file, duration } = resolvedImages[index];
            const outFile = path.join(tempDir, `${name}-${index}.mp4`);
            clips.push(outFile);

            ffmpeg()
                .input(file)
                .loop(duration)
                .outputOptions([
                    '-c:v libx264',
                    `-t ${duration}`,
                    '-pix_fmt yuv420p',
                    '-vf scale=1280:720',
                    '-r 30'
                ])
                .output(outFile)
                .on('end', () => {
                    index++;
                    processNextImage();
                })
                .on('error', (err) => reject(err))
                .run();
        }

        processNextImage();
    });
}

// Step 2: Concatenate all clips
function concatenateClips(name, clips) {
    const concatList = path.join(tempDir, 'concat_list.txt');
    const tempVideo = path.join(tempDir, `${name}-tmp.mp4`);

    fs.writeFileSync(concatList, clips.map(c => `file '${c}'`).join('\n'));

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(concatList)
            .inputOptions(['-f concat', '-safe 0'])
            .outputOptions(['-c copy'])
            .output(tempVideo)
            .on('end', () => {
                console.log('✅ Image video created');
                addAudio(tempVideo, name).then(resolve).catch(reject);
            })
            .on('error', reject)
            .run();
    });
}

function addAudio(tempVideo, name) {
    const finalOutput = path.join(tempDir, `${name}.mp4`);
    const audioFile = path.join(tempDir, `${name}.mp3`);

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(tempVideo)
            .input(audioFile)
            .outputOptions(['-c:v copy', '-c:a aac', '-shortest'])
            .output(finalOutput)
            .on('end', () => {
                console.log(`🎉 Final video created at: ${finalOutput}`);
                resolve();
            })
            .on('error', reject)
            .run();
    });
}



module.exports = { createClip };

