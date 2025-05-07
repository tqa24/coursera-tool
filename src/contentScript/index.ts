import ReactDOM from 'react-dom/client';
import App from './App';
import React from 'react';
import '../index.css';
import { waitForSelector, generateRandomString, extendStringPrototype } from './helpers';
import {
  handleAutoquiz,
  handlePeerGradedAssignment,
  handleDiscussionPrompt,
  handleReview,
  requestGradingByPeer,
  resolveWeekMaterial,
  getMaterial,
  getAllMaterials,
  getMetadata,
} from './assignment-handlers';
import { doWithGemini, doWithDeepSeek, doWithSource } from './api-services';
import { sendTrackingEvent } from './tracking';
import { addBadgeToLabel, appendNotSupported, collectUnmatchedQuestion } from './dom-utils';

const isElementLoaded = async (selector: any) => {
  while (document.querySelector(selector) === null) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return document.querySelector(selector);
};

isElementLoaded('html').then((selector: any) => {
  const container = document.createElement('div');
  container.id = 'coursera-tool';
  container.style.zIndex = '5000';
  container.style.position = 'fixed';
  container.style.bottom = '36px';
  container.style.right = '36px';
  selector.appendChild(container);
  // if (location.href.includes('coursera.org/learn')) {
  ReactDOM.createRoot(container).render(React.createElement(App));
  // }
});

// Export all utility functions
export {
  // Helpers
  waitForSelector,
  generateRandomString,
  extendStringPrototype,

  // Assignment handlers
  handleAutoquiz,
  handlePeerGradedAssignment,
  handleDiscussionPrompt,
  handleReview,
  requestGradingByPeer,
  resolveWeekMaterial,
  getMaterial,
  getAllMaterials,
  getMetadata,

  // Quiz Processor
  doWithGemini,
  doWithDeepSeek,
  doWithSource,

  // DOM Utilities
  addBadgeToLabel,
  appendNotSupported,
  collectUnmatchedQuestion,

  // Tracking
  sendTrackingEvent,
};
