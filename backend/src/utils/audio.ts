import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export async function normalizeToLinear16Mono16k(input: Buffer): Promise<Buffer> {
  console.log('Audio normalization input size:', input.length, 'bytes');
  const inPath = join(tmpdir(), `in-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`);
  const outPath = join(tmpdir(), `out-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
  writeFileSync(inPath, input);
  console.log('Audio normalization input file written to:', inPath);
  return new Promise<Buffer>((resolve, reject) => {
    ffmpeg(inPath)
      .inputOptions(['-f', 'webm']) // Specify input format for webm files
      .audioChannels(1)
      .audioFrequency(16000)
      .toFormat('wav')
      .outputOptions(['-acodec pcm_s16le'])
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('end', () => {
        try {
          const buf = readFileSync(outPath);
          console.log('Audio normalization output size:', buf.length, 'bytes');
          unlinkSync(inPath);
          unlinkSync(outPath);
          resolve(buf);
        } catch (e) {
          console.error('Error reading normalized audio:', e);
          reject(e);
        }
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        try { unlinkSync(inPath); } catch {}
        try { unlinkSync(outPath); } catch {}
        reject(err);
      })
      .save(outPath);
  });
}


