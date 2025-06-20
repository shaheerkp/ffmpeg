const express = require('express');
const { exec } = require('child_process');
const { createClip } = require('./service/ffmepg');
const { downloadFromS3, uploadVideoToS3 } = require('./service/aws');
const app = express();
const port = 3000;

app.use(express.json());

app.get('/generatevideo', async (req, res) => {
  const name = req.query.name
  try {
    // For demo: assume file already exists at inputPath
    await downloadFromS3(name)
    await createClip(name)
    const url = await uploadVideoToS3(name)
    res.status(200).json(url)

  } catch (error) {
    throw new Error("failed generating video")
  }

});

app.listen(port, () => {
  console.log(`FFmpeg server listening on port ${port}`);
});
