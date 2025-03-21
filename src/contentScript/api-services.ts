import { QuizItem, Method } from './type';
import { normalize } from './helpers';
import { addBadgeToLabel } from './dom-utils';

/**
 * Extract question data from DOM elements
 */
export const extractQuestionData = (questions: NodeListOf<Element>): any[] => {
  return Array.from(questions).map((item: any) => {
    const text =
      item
        .querySelector('.css-x3q7o9 > div:nth-child(2)')
        ?.innerText?.normalize()
        .replace(/\s{2,}/g, ' ') ?? '';
    let answers = item.querySelectorAll('.rc-Option');
    return {
      term: `Quiz type: ${item.querySelector('input')?.type}, ${text} | ${Array.from(answers)
        .map((item: any) => item.innerText)
        .join(' | ')}`,
      definition: '',
      element: item, // Store reference to the original element
    };
  });
};

/**
 * Process answers and update UI
 */
export const processAnswers = (
  questions: NodeListOf<Element>,
  answers: QuizItem[],
  method: string,
  provider: 'Source' | 'Gemini' | 'DeepSeek' | 'ChatGPT',
): number => {
  let correctCount = 0;

  questions.forEach((question: any, i: number) => {
    if (!answers[i]) return;

    let ok = false;
    let answer = normalize(answers[i].definition);
    console.log(`Processing answer for question ${i + 1}:`, answer);

    for (const key of question.querySelectorAll('.rc-Option')) {
      const keyText = normalize(key.querySelector('span:nth-child(3)')?.innerText) ?? '';
      if (answer.includes(keyText) || keyText.includes(answer)) {
        ok = true;
        let input = key.querySelector('input');
        if (input) {
          // Only click if this is the selected method
          if (method === provider.toLowerCase()) {
            input.click();
            console.log(`Selected answer "${keyText}" for question ${i + 1}`);
          }
          addBadgeToLabel(input, provider);
        }
      }
    }

    if (ok) {
      correctCount++;
      console.log(`Found match for question ${i + 1}`);
    }
  });

  return correctCount;
};

/**
 * Process questions using Gemini API
 */
export const doWithGemini = async (questions: NodeListOf<Element>, method: string) => {
  const { geminiAPI } = await chrome.storage.local.get('geminiAPI');
  if (!location.href.includes('assignment-submission') || !geminiAPI) {
    console.log('Not on assignment page or Gemini API key not found');
    return;
  }
  console.log('Processing with Gemini');

  // Extract question data
  const questionData = extractQuestionData(questions);
  console.log('Extracted question data for Gemini');

  // Prepare the prompt
  const prompt = JSON.stringify(questionData.map((q) => ({ term: q.term, definition: '' })));

  // API request body
  const body = {
    system_instruction: {
      parts: {
        text: `You are given a json, answer this json by choosing the answer from the term which were divided by the | symbol and fill that to this json but with definition field filled, give me the new json with the term attribute removed, im only need the definition attribute. The answer in definition field must be a string included in the term field, just give the answer, doesn't need to explain it, if the question has more than 1 answer, give the answer join by \" | \" `,
      },
    },
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  try {
    // Make API request
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiAPI}`,
      {
        body: JSON.stringify(body),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('No response from Gemini API');
      return;
    }

    // Parse the response
    const cleanText = text.replace('```json', '').replace('```', '');
    const answers: QuizItem[] = JSON.parse(cleanText);
    console.log('Gemini answers:', answers);

    // Process answers
    const correctCount = processAnswers(questions, answers, method, 'Gemini');
    console.log(`Gemini found answers for ${correctCount}/${questions.length} questions`);
  } catch (error) {
    console.error('Error processing with Gemini:', error);
  }
};

/**
 * Process questions using DeepSeek API
 */
export const doWithDeepSeek = async (questions: NodeListOf<Element>, method: string) => {
  const { deepseekAPI } = await chrome.storage.local.get('deepseekAPI');
  if (!location.href.includes('assignment-submission') || !deepseekAPI) {
    console.log('Not on assignment page or DeepSeek API key not found');
    return;
  }
  console.log('Processing with DeepSeek');

  // Extract question data
  const questionData = extractQuestionData(questions);
  console.log('Extracted question data for DeepSeek');

  // Prepare the prompt
  const prompt = JSON.stringify(questionData.map((q) => ({ term: q.term, definition: '' })));

  // API request body
  const body = {
    model: 'deepseek/deepseek-r1-zero:free',
    messages: [
      {
        role: 'user',
        content:
          prompt +
          ' You are given a JSON, answer this JSON by choosing the answer from the term which were divided by the | symbol and fill that to this JSON but with the definition field filled. Give me only the JSON response, and do not modify the term attribute. The answer in the definition field must be a string included in the term field. If multiple answers exist, separate them with " | ".',
      },
    ],
    stream: false,
  };

  try {
    // Make API request
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      body: JSON.stringify(body),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekAPI}`,
      },
    });

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      console.error('No response from DeepSeek API');
      return;
    }

    // Parse the response
    const cleanText = text.replace('```json', '').replace('```', '');
    const answers: QuizItem[] = JSON.parse(cleanText);
    console.log('DeepSeek answers:', answers);

    // Process answers
    const correctCount = processAnswers(questions, answers, method, 'DeepSeek');
    console.log(`DeepSeek found answers for ${correctCount}/${questions.length} questions`);
  } catch (error) {
    console.error('Error processing with DeepSeek:', error);
  }
};
