// Captures et vidéos de la landing, enregistrées sur l'application réelle (pile LOCALE) avec un
// compte et des données fictifs. Rien ne part vers la prod : toute requête vers un domaine de
// production est réacheminée vers l'API locale (popup de l'extension) ou bloquée.
//
// Prérequis : front local (image Docker, http://localhost), API locale (http://localhost:53000),
// Gotenberg, extension construite (../chrome-candidash-extension, `pnpm build:chrome`).
// Usage : pnpm capture  (CAPTURE_THEMES=light,dark  CAPTURE_SCENES=stats,board,cv,extension,tour)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { startRecording } from './recorder.mjs';
import { THROTTLE_WINDOW_MS, seedDemoAccount, signIn } from './seed.mjs';

const BASE = process.env.CAPTURE_BASE_URL ?? 'http://localhost';
const API = process.env.CAPTURE_API_URL ?? 'http://localhost:53000/api/v1';
const EXTENSION_DIST = resolve(
  process.env.CAPTURE_EXTENSION_DIST ?? '../chrome-candidash-extension/dist/chrome',
);
const STAGE_DIR = resolve('scripts/capture/stage');
const OUT = resolve('public/demo');
const THEMES = (process.env.CAPTURE_THEMES ?? 'light,dark').split(',');
const SCENES = (process.env.CAPTURE_SCENES ?? 'stats,board,cv,extension,tour').split(',');

const VIEWPORT = { width: 1280, height: 800 };
const STAGE = 'https://extension.candidash.test';
const PROD_HOST = /(^|\.)nedellec-julien\.fr$/;
const PROD_API = 'https://api-candidash.nedellec-julien.fr';
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

const pause = (ms) => new Promise((done) => setTimeout(done, ms));

// ---------------------------------------------------------------- contexte et réseau

async function newThemedContext(browser, theme) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: theme,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    acceptDownloads: true,
  });
  await context.addInitScript((value) => {
    try {
      localStorage.setItem('theme', value);
    } catch {
      // stockage indisponible sur une page sans origine
    }
  }, theme);
  await context.addInitScript(installCursor);
  await context.route(
    (url) => PROD_HOST.test(url.hostname),
    (route) => routeProd(route),
  );
  await context.route(`${STAGE}/**`, (route) => serveStage(route));
  return context;
}

/** Le popup appelle l'API de prod (adresse compilée) : on répond avec l'API locale. */
async function routeProd(route) {
  const request = route.request();
  if (!request.url().startsWith(PROD_API)) return route.abort();
  const cors = {
    'access-control-allow-origin': STAGE,
    'access-control-allow-headers': 'Authorization, Content-Type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  };
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const local = request.url().replace(`${PROD_API}/api/v1`, API);
  const response = await route.fetch({ url: local });
  return route.fulfill({ response, headers: { ...response.headers(), ...cors } });
}

/** Scène de l'extension : la page d'offre, et le popup construit servi tel quel. */
async function serveStage(route) {
  const { pathname } = new URL(route.request().url());
  const file =
    pathname === '/'
      ? join(STAGE_DIR, 'stage.html')
      : pathname === '/offer.html'
        ? join(STAGE_DIR, 'offer.html')
        : join(EXTENSION_DIST, pathname);
  try {
    const body = await readFile(file);
    return route.fulfill({ body, contentType: MIME[extname(file)] ?? 'application/octet-stream' });
  } catch {
    return route.fulfill({ status: 404 });
  }
}

/** API chrome.* minimales pour le popup hors extension : onglet d'offre, stockage, permissions. */
function installChromeShim({ apiToken, email, job }) {
  if (!location.pathname.endsWith('/src/popup/popup.html')) return;
  const store = { candidashConfig: { apiToken, userEmail: email } };
  window.chrome = {
    ...(window.chrome ?? {}),
    storage: {
      local: {
        get: async (key) => (key in store ? { [key]: store[key] } : {}),
        set: async (values) => Object.assign(store, values),
        remove: async (key) => delete store[key],
      },
    },
    tabs: {
      query: async () => [{ id: 1, url: job.jobUrl, title: job.title }],
      // Ce que renvoie le script de contenu sur cette page d'offre (JSON-LD)
      sendMessage: async () => ({ kind: 'job', job }),
    },
    permissions: { request: async () => true },
  };
}

// ---------------------------------------------------------------- curseur et gestes

/** Curseur dessiné dans la page (le screencast n'affiche pas celui du système). */
function installCursor() {
  if (window.top !== window) return;
  window.__cursor = (x, y) => {
    let cursor = document.getElementById('__capture-cursor');
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = '__capture-cursor';
      cursor.innerHTML =
        '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.3-6.8L4 20z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
      Object.assign(cursor.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        zIndex: '2147483647',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / 0.35))',
      });
      document.documentElement.append(cursor);
    }
    cursor.style.transform = `translate(${x - 4}px, ${y - 2}px)`;
  };
}

function pointer(page) {
  let position = { x: VIEWPORT.width * 0.6, y: VIEWPORT.height * 0.55 };
  const show = () => page.evaluate(({ x, y }) => window.__cursor?.(x, y), position).catch(() => {});

  async function glide(x, y, duration = 650) {
    const steps = Math.max(8, Math.round(duration / 16));
    const from = position;
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      position = { x: from.x + (x - from.x) * ease, y: from.y + (y - from.y) * ease };
      await page.mouse.move(position.x, position.y);
      await show();
      await pause(duration / steps);
    }
  }

  async function centerOf(locator) {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error(`Élément invisible : ${locator}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  return {
    show,
    glide,
    async click(locator, { duration } = {}) {
      const { x, y } = await centerOf(locator);
      await glide(x, y, duration);
      await pause(180);
      await page.mouse.down();
      await pause(90);
      await page.mouse.up();
    },
    async drag(source, target, { offsetY = 0 } = {}) {
      const from = await centerOf(source);
      await glide(from.x, from.y - 10);
      await page.mouse.down();
      await glide(from.x + 12, from.y, 160);
      const box = await target.boundingBox();
      await glide(box.x + box.width / 2, box.y + 110 + offsetY, 1100);
      await pause(250);
      await page.mouse.up();
    },
  };
}

async function smoothScrollTo(page, locator, offset = 24) {
  await locator.evaluate((element, gap) => {
    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY - gap,
      behavior: 'smooth',
    });
  }, offset);
  await pause(900);
}

/** Poster pris pendant un enregistrement : le curseur est masqué le temps de la capture. */
async function posterShot(page) {
  const cursor = page.locator('#__capture-cursor');
  await cursor.evaluate((element) => (element.style.visibility = 'hidden')).catch(() => {});
  const shot = await page.screenshot();
  await cursor.evaluate((element) => (element.style.visibility = '')).catch(() => {});
  return shot;
}

/** Les posters se prennent sans curseur. */
async function cleanShot(page, target = page) {
  await page.evaluate(() => document.getElementById('__capture-cursor')?.remove());
  return target.screenshot();
}

// Sous l'en-tête collant (64 px) de l'application
const HEADER_GAP = 88;

async function waitToastsGone(page) {
  await page
    .locator('app-toast')
    .first()
    .waitFor({ state: 'detached', timeout: 12_000 })
    .catch(() => {});
}

// ---------------------------------------------------------------- sorties

async function toWebp(context, png, file, width = 1600) {
  const page = await context.newPage();
  const base64 = await page.evaluate(
    async ({ source, targetWidth }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${source}`;
      await image.decode();
      const height = Math.round((image.height * targetWidth) / image.width);
      const canvas = new OffscreenCanvas(targetWidth, height);
      const context2d = canvas.getContext('2d');
      context2d.imageSmoothingQuality = 'high';
      context2d.drawImage(image, 0, 0, targetWidth, height);
      const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.86 });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return { data: btoa(binary), height };
    },
    { source: png.toString('base64'), targetWidth: width },
  );
  await page.close();
  await writeFile(file, Buffer.from(base64.data, 'base64'));
  console.log(`  ${file.replace(`${OUT}/`, '')} (${width}×${base64.height})`);
}

async function record(page, name, theme, run, { width = 1440, bitrate = '1400k' } = {}) {
  const recording = await startRecording(page, { width, bitrate });
  await run();
  const { seconds } = await recording.stop(join(OUT, `${name}-${theme}.webm`));
  console.log(`  ${name}-${theme}.webm (${seconds.toFixed(1)} s)`);
}

// ---------------------------------------------------------------- scènes

const scenes = {
  async stats({ page, context, theme }) {
    await page.goto(`${BASE}/dashboard`);
    await waitToastsGone(page);
    const stats = page.locator('section[aria-labelledby="dashboard-stats-title"]');
    await stats.waitFor();
    await pause(600);
    await toWebp(context, await cleanShot(page, stats), join(OUT, `stats-${theme}.webp`), 1400);
  },

  async board({ page, context, theme }) {
    await page.goto(`${BASE}/dashboard`);
    await page.getByRole('button', { name: 'Tableau' }).click();
    // La vue Tableau élargit la page : on ne défile qu'une fois les colonnes rendues
    await page.locator('[data-testid="board-column-APPLIED"]').waitFor();
    await pause(600);
    await waitToastsGone(page);
    const heading = page.getByRole('heading', { name: 'Mes candidatures' });
    await heading.evaluate(
      (element, gap) =>
        window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - gap),
      HEADER_GAP,
    );
    await pause(500);
    await toWebp(context, await cleanShot(page), join(OUT, `board-${theme}.webp`));
    const hand = pointer(page);
    await hand.show();
    await record(page, 'board', theme, async () => {
      await pause(700);
      const card = page
        .locator('[data-testid="board-column-TO_APPLY"] [data-testid="board-card-title"]')
        .first();
      await hand.drag(card, page.locator('[data-testid="board-column-APPLIED"]'));
      await pause(3200);
    });
  },

  async cv({ page, context, theme, demo }) {
    await page.goto(`${BASE}/dashboard/documents/${demo.cvId}`);
    await page.getByTestId('document-markdown').waitFor();
    await waitToastsGone(page);
    await toWebp(context, await cleanShot(page), join(OUT, `cv-${theme}.webp`));
    const hand = pointer(page);
    await hand.show();
    await record(page, 'cv', theme, async () => {
      await pause(600);
      await hand.click(page.getByTestId('document-analysis-toggle'));
      await page.getByTestId('analysis-score').waitFor();
      await smoothScrollTo(page, page.getByTestId('document-analysis-toggle'), HEADER_GAP + 60);
      await pause(1800);
      const editor = page.getByTestId('document-markdown');
      await smoothScrollTo(page, editor, HEADER_GAP + 40);
      await hand.click(editor);
      await editor.evaluate((textarea) => {
        textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
        textarea.scrollTop = textarea.scrollHeight;
      });
      await page.keyboard.type('\n**Outils** : GitLab CI/CD, Playwright, Agile Scrum', {
        delay: 45,
      });
      await pause(500);
      await smoothScrollTo(page, page.getByTestId('document-analysis-toggle'), HEADER_GAP + 60);
      await pause(2600);
    });
  },

  async extension({ context, theme, demo }) {
    const job = {
      title: 'Développeuse Angular (H/F)',
      company: 'Lumière Voyages',
      jobUrl: 'https://emplois.exemple/offres/developpeuse-angular-lumiere-voyages',
      details: { location: 'Nantes', remote: true, salary: '45 – 52 k€', contractType: 'CDI' },
      description:
        "Faire évoluer l'espace client Angular 22 (signals, RxJS), écrire les tests Vitest et Playwright, concevoir les API NestJS.",
    };
    await context.addInitScript(installChromeShim, {
      apiToken: demo.apiToken,
      // Adresse affichée par le popup : celle de la personne fictive, pas du compte jetable
      email: 'camille.martin@exemple.fr',
      job,
    });
    const page = await context.newPage();
    await page.goto(`${STAGE}/?theme=${theme}`);
    await page.frameLocator('iframe.offer').locator('h1').waitFor();
    const hand = pointer(page);
    await hand.show();
    await record(
      page,
      'extension',
      theme,
      async () => {
        await pause(700);
        await hand.click(page.locator('#ext-icon'));
        const popup = page.frameLocator('#popup');
        await popup.locator('#title').waitFor();
        await pause(400);
        await toWebp(context, await posterShot(page), join(OUT, `extension-${theme}.webp`));
        await pause(1200);
        await hand.click(popup.getByRole('button', { name: /Ajouter à Candidash/ }));
        await popup.locator('#quick-add-success').waitFor({ state: 'visible' });
        await pause(2200);
      },
      { width: 1440 },
    );
    await page.close();
  },

  async tour({ page, theme, demo }) {
    await page.goto(`${BASE}/auth/signin`);
    const hand = pointer(page);
    await hand.show();
    await record(
      page,
      'tour',
      theme,
      async () => {
        await pause(600);
        await hand.click(page.getByPlaceholder('votre@email.com'));
        await page.keyboard.type(demo.email, { delay: 28 });
        await hand.click(page.getByPlaceholder('••••••••'));
        await page.keyboard.type(demo.password, { delay: 18 });
        await hand.click(page.getByRole('button', { name: 'Se connecter' }));
        await page.waitForURL(`${BASE}/dashboard`);
        await pause(2600);
        // Le sélecteur de vue est au-dessus du titre : on le laisse sous l'en-tête collant
        await smoothScrollTo(
          page,
          page.getByRole('heading', { name: 'Mes candidatures' }),
          HEADER_GAP + 110,
        );
        // Contexte neuf : la vue mémorisée est la liste
        await hand.click(page.getByRole('button', { name: 'Tableau' }));
        await pause(700);
        await smoothScrollTo(
          page,
          page.getByRole('heading', { name: 'Mes candidatures' }),
          HEADER_GAP,
        );
        await pause(800);
        const card = page
          .locator('[data-testid="board-column-TO_APPLY"] [data-testid="board-card-title"]')
          .first();
        await hand.drag(card, page.locator('[data-testid="board-column-INTERVIEW"]'));
        await pause(2400);
        await hand.click(page.getByTestId('dashboard-documents-link'));
        await page
          .getByRole('link', { name: /CV Développeuse Angular/ })
          .first()
          .waitFor();
        await pause(1400);
        await hand.click(page.getByRole('link', { name: /CV Développeuse Angular/ }).first());
        await page.getByTestId('document-markdown').waitFor();
        await pause(2000);
        await hand.click(page.getByTestId('document-analysis-toggle'));
        await page.getByTestId('analysis-score').waitFor();
        await smoothScrollTo(page, page.getByTestId('document-analysis-toggle'), HEADER_GAP + 60);
        await pause(2800);
        await smoothScrollTo(page, page.getByRole('heading', { level: 1 }), HEADER_GAP + 40);
        const download = page.waitForEvent('download');
        await hand.click(page.getByTestId('document-export-pdf'));
        await download;
        await pause(2000);
      },
      { width: 1280, bitrate: '1200k' },
    );
  },
};

// ---------------------------------------------------------------- exécution

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const theme of THEMES) {
    console.log(`Thème ${theme} : compte de démonstration…`);
    const context = await newThemedContext(browser, theme);
    const demo = await seedDemoAccount(context, API);
    const page = await context.newPage();
    await signIn(page, BASE, demo);
    for (const name of SCENES.filter((scene) => scene !== 'tour')) {
      console.log(`Scène ${name} (${theme})`);
      await scenes[name]({ page, context, theme, demo });
      await pause(THROTTLE_WINDOW_MS / 2);
    }
    if (SCENES.includes('tour')) {
      // La visite commence déconnectée : nouveau contexte, après la fenêtre du limiteur
      await pause(THROTTLE_WINDOW_MS);
      const tourContext = await newThemedContext(browser, theme);
      console.log(`Scène tour (${theme})`);
      const tourPage = await tourContext.newPage();
      await scenes.tour({ page: tourPage, theme, demo }).catch(async (error) => {
        // L'état de l'écran au moment de l'échec, pour comprendre sans relancer à l'aveugle
        await tourPage.screenshot({ path: join(OUT, '..', '..', 'capture-error.png') });
        throw error;
      });
      await tourContext.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
