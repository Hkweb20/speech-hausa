import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export async function normalizeToLinear16Mono16k(input: Buffer, originalFormat?: string): Promise<Buffer> {
  console.log('Audio normalization input size:', input.length, 'bytes');
  console.log('Original format:', originalFormat || 'unknown');
  
  const inPath = join(tmpdir(), `in-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`);
  const outPath = join(tmpdir(), `out-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
  writeFileSync(inPath, input);
  console.log('Audio normalization input file written to:', inPath);
  
  return new Promise<Buffer>((resolve, reject) => {
    const ffmpegCommand = ffmpeg(inPath);
    
    // Only specify input format if we know it, otherwise let FFmpeg auto-detect
    if (originalFormat) {
      console.log('Using specified format:', originalFormat);
      ffmpegCommand.inputOptions(['-f', originalFormat]);
    } else {
      console.log('Auto-detecting audio format');
    }
    
    ffmpegCommand
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
        
        // Provide more helpful error messages
        if (err.message.includes('Invalid data found when processing input')) {
          reject(new Error(`Unsupported audio format. Please try uploading a different audio file. Supported formats: MP3, WAV, M4A, WebM, OGG, FLAC. Original format: ${originalFormat || 'unknown'}`));
        } else if (err.message.includes('No such file or directory')) {
          reject(new Error('Audio file not found or corrupted. Please try uploading again.'));
        } else {
          reject(new Error(`Audio processing failed: ${err.message}`));
        }
      })
      .save(outPath);
  });
}


