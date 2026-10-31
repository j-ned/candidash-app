// Enregistrement vidéo d'une page Playwright en haute définition, sans dépendance système.
// Le screencast Chrome DevTools fournit des images JPEG à la densité de l'écran (2x) ; elles sont
// rééchantillonnées à cadence constante puis encodées en VP8 (WebM) par le ffmpeg que Playwright
// installe avec Chromium (`pnpm exec playwright install chromium-headless-shell ffmpeg`).
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const FPS = 30;

function playwrightFfmpeg() {
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(homedir(), '.cache', 'ms-playwright');
  const dir = existsSync(cache)
    ? readdirSync(cache).find((name) => name.startsWith('ffmpeg-'))
    : null;
  const binary = dir ? join(cache, dir, 'ffmpeg-linux') : null;
  if (!binary || !existsSync(binary)) {
    throw new Error('ffmpeg de Playwright introuvable : pnpm exec playwright install ffmpeg');
  }
  return binary;
}

/** Démarre l'enregistrement de la page ; `stop(path)` écrit la vidéo WebM. */
export async function startRecording(page, { width = 1600, bitrate = '2500k' } = {}) {
  const session = await page.context().newCDPSession(page);
  const frames = [];
  session.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    frames.push({ buffer: Buffer.from(data, 'base64'), time: metadata.timestamp });
    session.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await session.send('Page.startScreencast', { format: 'jpeg', quality: 92 });

  return {
    async stop(path) {
      // La fin est l'instant de l'arrêt : un écran immobile n'envoie plus d'image, mais la pause
      // finale doit rester dans la vidéo
      const end = Date.now() / 1000;
      await session.send('Page.stopScreencast');
      await session.detach();
      if (frames.length === 0) throw new Error('Aucune image enregistrée');
      await encode(frames, end, path, width, bitrate);
      return { frames: frames.length, seconds: end - frames[0].time };
    },
  };
}

function encode(frames, end, path, width, bitrate) {
  const ffmpeg = spawn(
    playwrightFfmpeg(),
    [
      '-loglevel',
      'error',
      '-y',
      '-f',
      'image2pipe',
      '-c:v',
      'mjpeg',
      '-framerate',
      String(FPS),
      '-i',
      'pipe:0',
      '-vf',
      `scale=${width}:-2:flags=lanczos,format=yuv420p`,
      '-c:v',
      'libvpx',
      '-b:v',
      bitrate,
      '-crf',
      '8',
      '-quality',
      'good',
      '-cpu-used',
      '1',
      '-auto-alt-ref',
      '0',
      '-an',
      path,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = new Promise((resolve, reject) => {
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`))));
  });

  // Cadence constante : à chaque instant, la dernière image reçue (le screencast n'envoie rien
  // tant que l'écran ne change pas)
  const start = frames[0].time;
  let index = 0;
  for (let tick = start; tick <= end; tick += 1 / FPS) {
    while (index + 1 < frames.length && frames[index + 1].time <= tick) index++;
    ffmpeg.stdin.write(frames[index].buffer);
  }
  ffmpeg.stdin.end();
  return done;
}
