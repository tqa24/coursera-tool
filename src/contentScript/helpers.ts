import { wordList } from './constants';

/**
 * Waits for an element matching the selector to appear in the DOM
 * @param selector CSS selector to wait for
 * @param timeout Maximum time to wait in milliseconds
 * @returns Promise resolving to the found element
 */
export const waitForSelector = (selector: string, timeout = 5000) => {
  return new Promise<any>((resolve, reject) => {
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error(`Element not found within ${timeout}ms`));
    }, timeout);
  });
};

/**
 * Generates a random string of specified length
 * @param numWords Number of words to include in the string
 * @param delimiter Character to use between words
 * @returns Random string
 */
export function generateRandomString(numWords: number = 10, delimiter: string = ' '): string {
  const words: string[] = [];
  for (let i = 0; i < numWords; i++) {
    const randomIndex = Math.floor(Math.random() * wordList.length);
    words.push(wordList[randomIndex]);
  }

  return words.join(delimiter);
}

/**
 * Extends String prototype with normalize method (used in various places)
 */
export const extendStringPrototype = () => {
  String.prototype.normalize = function () {
    return this.replaceAll('\u00A0', '')
      .replace(/\s+/g, ' ')
      .replaceAll('\n', ' ')
      .replaceAll('“', '"')
      .replaceAll('”', '"')
      .replaceAll('‘', "'")
      .replaceAll('’', "'")
      .replaceAll('–', '-')
      .replaceAll('—', '-')
      .replaceAll('…', '...')
      .replaceAll('Gemini', '')
      .replaceAll('Source FPT', '')
      .trim();
  };
};
