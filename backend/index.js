const fs = require('fs');
const path = require('path');
const speech = require('@google-cloud/speech');

const client = new speech.SpeechClient({
  keyFilename: path.join(__dirname, 'hausa-text-f0bae78a7264.json'),
});

async function transcribeHausa() {
    const filePath = path.join(__dirname, 'hausa_mono1.wav');
    console.log(`🎵 Reading file from: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error("❌ hausa.wav file not found!");
    return;
  }

  const file = fs.readFileSync(filePath);
  console.log(`📦 File size: ${file.length} bytes`);

  const audioBytes = file.toString('base64');

  const request = {
    audio: { content: fs.readFileSync(filePath).toString('base64') },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'ha-NG',
      enableAutomaticPunctuation: true,
    },
  };

  try {
    const [response] = await client.recognize(request);
    console.log("📡 Raw response:", JSON.stringify(response, null, 2));

    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    console.log(`📝 Hausa Transcription: ${transcription || '⚠️ (empty result)'}`);
  } catch (err) {
    console.error("❌ Error during transcription:", err);
  }
}

transcribeHausa();
