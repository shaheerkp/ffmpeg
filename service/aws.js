const fs = require('fs');
const path = require('path');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { pipeline } = require('stream');
const { promisify } = require('util');
const env =require("dotenv")

env.config()

const s3 = new S3Client({
    region: process.env.AWS_REGION, 
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const streamPipeline = promisify(pipeline);
const BUCKET="sports-reel-dev"

async function downloadFromS3(name) {
    const arr = [0, 1, 2, 3, 4]

    for (const [ele, index] of arr.entries()) {
        const localPath = path.join(__dirname, `../tmp/${name}-${index}.jpg`)
        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: `${name}/${name}-${index}.jpg`,
        });
        const response = await s3.send(command);
        await streamPipeline(response.Body, fs.createWriteStream(localPath));
        console.log(`Downloaded `);
    }

    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: `${name}/audio.mp3`,
    });

    const audioPath = path.join(__dirname, `../tmp/${name}.mp3`)

    const response = await s3.send(command);
    await streamPipeline(response.Body, fs.createWriteStream(audioPath));
    console.log(`audio downloaded `);

}



async function uploadVideoToS3(name) {
  try {
    const tempDir = path.resolve("tmp", `${name}.mp4`);
    const fileStream = fs.createReadStream(tempDir);

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `videos/${name}.mp4`,
        Body: fileStream,
        ContentType: "video/mp4",
      })
    );

    // Clean up local temp files
    const dirPath = path.resolve("tmp");
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      fs.unlinkSync(path.join(dirPath, file));
    }
    fs.rmdirSync(dirPath);

    return `https://${BUCKET}.s3.ap-south-1.amazonaws.com/videos/${name}.mp4`;
  } catch (error) {
    console.error("S3 upload failed:", error);
  }
}



module.exports = { downloadFromS3,uploadVideoToS3 };