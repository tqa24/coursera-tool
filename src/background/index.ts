chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  // Check if the URL has changed
  if (changeInfo.url) {
    chrome.cookies.get(
      {
        url: 'https://www.coursera.org',
        name: 'CSRF3-Token',
      },
      function (cookie) {
        if (cookie) {
          chrome.storage.sync.set({ csrf3Token: cookie.value });
          // console.log(`Cookie found: ${cookie.name} = ${cookie.value}`);
        } else {
          // console.log('Cookie not found');
        }
      },
    );
  }
});
