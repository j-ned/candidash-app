// config.json lu par le front au démarrage, écrit au build depuis les variables du projet Vercel
// (API_URL, EXTENSION_ID, FIREFOX_ADDON_URL). Sans API_URL (dev local), la version versionnée
// (API locale) reste en place.
import { writeFileSync } from 'node:fs';

const { API_URL, EXTENSION_ID, FIREFOX_ADDON_URL } = process.env;
if (API_URL) {
  const config = {
    apiUrl: API_URL,
    ...(EXTENSION_ID && { extensionId: EXTENSION_ID }),
    ...(FIREFOX_ADDON_URL && { firefoxAddonUrl: FIREFOX_ADDON_URL }),
  };
  writeFileSync('public/config.json', `${JSON.stringify(config, null, 2)}\n`);
  console.log(`config.json -> ${API_URL}`);
}
