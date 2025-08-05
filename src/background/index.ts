import Mellowtel from 'mellowtel';

let mellowtel: any;

(async () => {
  mellowtel = new Mellowtel('24e87438', {
    MAX_DAILY_RATE: 400,
    disableLogs: true,
  });
  await mellowtel.initBackground();
})();

chrome.runtime.onInstalled.addListener(async function (details) {
  await mellowtel.generateAndOpenOptInLink();
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.url) {
    chrome.cookies.get(
      {
        url: 'https://www.coursera.org',
        name: 'CSRF3-Token',
      },
      function (cookie) {
        if (cookie) {
          chrome.storage.sync.set({ csrf3Token: cookie.value });
        } else {
          console.log('Cookie not found');
        }
      },
    );
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openTab' && message.url) {
    chrome.tabs.create({ url: message.url });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'closeCurrentTab' && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id);
  }
});
