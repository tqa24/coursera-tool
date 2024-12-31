import ReactDOM from 'react-dom/client';
import App from './App.js';
import React from 'react';
import '../index.css';

console.info('contentScript is running');

const rootPath = 'div.rc-SplitPeerSubmissionPage div.rc-PeerReviewHeader';
// const rootPath = ".rc-PageHeader > div.rc";

const isElementLoaded = async (selector: any) => {
  while (document.querySelector(selector) === null) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return document.querySelector(selector);
};

isElementLoaded(rootPath).then((selector: any) => {
  const container = document.createElement('div');
  container.id = 'coursera-link-getter';
  selector.appendChild(container);
  ReactDOM.createRoot(container).render(React.createElement(App));
});
