const express = require('express');
const { createClip } = require('./service/ffmepg');
const { downloadFromS3, uploadVideoToS3, ensureTmpDirExists } = require('./service/aws');
const app = express();
const port = 3001;

app.use(express.json());

app.get('/generatevideo', async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: "Missing name parameter" });

  try {
    console.log("started video generation");
    ensureTmpDirExists();
    await downloadFromS3(name);
    await createClip(name);  // make sure this doesn't throw
    const url = await uploadVideoToS3(name);
    res.status(200).json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed generating video" });
  }
});

app.listen(port, () => {
  console.log(`FFmpeg server listening on port ${port}`);
})
