import Mellowtel from 'mellowtel';

(async () => {
  const mellowtel = new Mellowtel('24e87438', {
    MAX_DAILY_RATE: 400,
    disableLogs: false,
  });
  await mellowtel.initContentScript({
    pascoliFilePath: 'pascoli.html',
    meucciFilePath: 'meucci.js',
  });
})();
