// Compte de démonstration jetable, créé sur une pile LOCALE (jamais la prod) : candidatures et CV
// fictifs. Le mot de passe est généré à chaque exécution et ne quitte pas le processus.
import { randomBytes, randomUUID } from 'node:crypto';
import { CV_MARKDOWN, DEMO_USER, JOBS } from './demo-data.mjs';

/** Crée le compte, se connecte dans le contexte du navigateur (cookies) et remplit les données. */
export async function seedDemoAccount(context, apiUrl) {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(`${apiUrl}/`)) {
    throw new Error(`Les captures se font sur une pile locale, pas sur ${apiUrl}`);
  }
  const email = `demo-${Date.now()}@candidash.test`;
  const password = `${randomBytes(18).toString('base64url')}Aa1!`;
  const request = context.request;

  await expectOk(() =>
    request.post(`${apiUrl}/accounts/registration`, {
      data: { email, password, username: DEMO_USER.username },
    }),
  );
  await expectOk(() => request.post(`${apiUrl}/auth/login`, { data: { email, password } }));

  const ids = {};
  for (const { key, ...job } of JOBS) {
    const id = randomUUID();
    await expectOk(() =>
      request.put(`${apiUrl}/jobtrack/${id}/with-reminder?upsert=true`, { data: job }),
    );
    if (key) ids[key] = id;
  }

  const cv = await expectOk(() =>
    request.post(`${apiUrl}/documents`, {
      data: {
        kind: 'CV',
        title: 'CV Développeuse Angular',
        markdown: CV_MARKDOWN,
        jobTrackId: ids.target,
      },
    }),
  );
  // Jeton d'accès de l'extension, comme après « Se connecter » dans le popup
  const token = await expectOk(() =>
    request.post(`${apiUrl}/api-tokens`, { data: { nomAffiche: 'Chrome' } }),
  );

  await new Promise((resolve) => setTimeout(resolve, THROTTLE_WINDOW_MS));
  return {
    email,
    password,
    apiToken: (await token.json()).token,
    targetJobId: ids.target,
    cvId: (await cv.json()).id,
  };
}

/** Connexion par le vrai formulaire : le front tient sa session dans localStorage. */
export async function signIn(page, baseUrl, { email, password }) {
  await page.goto(`${baseUrl}/auth/signin`);
  await page.getByPlaceholder('votre@email.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(`${baseUrl}/dashboard`);
}

// Le limiteur de l'API accepte 30 requêtes par minute et par IP : le seed reste en dessous, et
// laisse ensuite la fenêtre se vider avant que les scènes ne naviguent.
const REQUEST_SPACING_MS = 2_200;
export const THROTTLE_WINDOW_MS = 61_000;
let lastRequest = 0;

async function paced() {
  const wait = lastRequest + REQUEST_SPACING_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequest = Date.now();
}

async function expectOk(send) {
  await paced();
  const response = await send();
  if (!response.ok()) {
    throw new Error(`${response.url()} → ${response.status()} ${await response.text()}`);
  }
  return response;
}
