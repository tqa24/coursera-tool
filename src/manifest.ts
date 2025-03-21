import { defineManifest } from '@crxjs/vite-plugin';
import packageData from '../package.json';

//@ts-ignore
const isDev = process.env.NODE_ENV == 'development';

export default defineManifest({
  name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ''}`,
  description: packageData.description,
  version: packageData.version,
  manifest_version: 3,
  icons: {
    16: 'img/favicon-v2-194x194.png',
    32: 'img/favicon-v2-194x194.png',
    48: 'img/favicon-v2-194x194.png',
    128: 'img/favicon-v2-194x194.png',
  },
  action: {
    // default_popup: 'popup.html',
    default_icon: 'img/favicon-v2-194x194.png',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://www.coursera.org/*'],
      js: ['src/contentScript/index.ts'],
    },
  ],
  homepage_url: 'https://www.facebook.com/au.kien.thanh.2307',
  web_accessible_resources: [
    {
      resources: [
        'img/favicon-v2-194x194.png',
        'img/favicon-v2-194x194.png',
        'img/favicon-v2-194x194.png',
        'img/favicon-v2-194x194.png',
      ],
      matches: [],
    },
  ],
  permissions: ['storage', 'cookies'],
  host_permissions: ['https://www.coursera.org/*', 'https://generativelanguage.googleapis.com/*'],
});
