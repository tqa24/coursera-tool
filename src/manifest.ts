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
    {
      matches: ['<all_urls>'],
      js: ['src/third-party/mellowtel.js'],
      run_at: 'document_start',
      all_frames: true,
    },
  ],
  homepage_url: 'https://www.facebook.com/au.kien.thanh.2307',
  web_accessible_resources: [
    {
      resources: ['img/favicon-v2-194x194.png'],
      matches: [],
    },
    {
      resources: ['src/third-party/burke.js'],
      matches: ['<all_urls>'],
    },
    {
      resources: ['src/third-party/pascoli.html'],
      matches: ['<all_urls>'],
    },
  ],
  permissions: ['storage', 'cookies', 'tabs', 'declarativeNetRequest'],
  host_permissions: [
    'https://www.coursera.org/*',
    'https://generativelanguage.googleapis.com/*',
    '<all_urls>',
  ],
});
