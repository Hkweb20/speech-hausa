import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export async function normalizeToLinear16Mono16k(input: Buffer): Promise<Buffer> {
  const inPath = join(tmpdir(), `in-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`);
  const outPath = join(tmpdir(), `out-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
  writeFileSync(inPath, input);
  return new Promise<Buffer>((resolve, reject) => {
    ffmpeg(inPath)
      .audioChannels(1)
      .audioFrequency(16000)
      .toFormat('wav')
      .outputOptions(['-acodec pcm_s16le'])
      .on('end', () => {
        try {
          const buf = readFileSync(outPath);
          unlinkSync(inPath);
          unlinkSync(outPath);
          resolve(buf);
        } catch (e) {
          reject(e);
        }
      })
      .on('error', (err) => {
        try { unlinkSync(inPath); } catch {}
        try { unlinkSync(outPath); } catch {}
        reject(err);
      })
      .save(outPath);
  });
}


