import Mellowtel from 'mellowtel';

const mellowtel = new Mellowtel('24e87438', {
  MAX_DAILY_RATE: 400,
  disableLogs: true,
});

async function openSettings() {
  try {
    const settingsLink = await mellowtel.generateSettingsLink();
    browser.tabs.create({ url: settingsLink });
  } catch (error) {
    console.error('Error generating settings link:', error);
  }
}

document.getElementById('openSettings').addEventListener('click', openSettings);
