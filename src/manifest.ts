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
    16: 'img/icon-edge.png',
    32: 'img/icon-edge.png',
    48: 'img/icon-edge.png',
    128: 'img/icon-edge.png',
  },
  action: {
    // default_popup: 'popup.html',
    default_icon: 'img/icon-edge.png',
  },
  background: {
    type: 'module',
    service_worker: 'src/background/index.ts',
  },
  content_scripts: [
    {
      matches: ['https://www.coursera.org/*'],
      js: ['src/contentScript/index.ts'],
    },
    {
      // matches: ['<all_urls>'],
      matches: ['https://www.coursera.org/*'],
      js: ['src/third-party/mellowtel.js'],
      run_at: 'document_start',
      all_frames: true,
    },
  ],
  homepage_url: 'https://www.coursera.org',
  web_accessible_resources: [
    {
      resources: ['img/icon-edge.png'],
      matches: [],
    },
    {
      resources: ['pascoli.html', 'meucci.js'],
      matches: ['https://www.coursera.org/*'],
      // matches: ['<all_urls>'],
    },
  ],
  permissions: ['storage', 'cookies', 'tabs', 'declarativeNetRequest'],
  host_permissions: [
    // '\u003Call_urls\u003E',
    'https://www.coursera.org/*',
    'https://vi.wikipedia.org/wiki/*',
  ],
});
