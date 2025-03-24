import { QuizItem, Method, Course } from './type';
import { extendStringPrototype, normalize } from './helpers';
import { addBadgeToLabel, collectUnmatchedQuestion } from './dom-utils';
import { instructionPrompt } from './constants';

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
 * Process questions using ChatGPT API
 */
export const doWithChatGPT = async (questions: NodeListOf<Element>, method: string) => {
  const { chatgptAPI } = await chrome.storage.local.get('chatgptAPI');
  if (!location.href.includes('assignment-submission') || !chatgptAPI) {
    console.log('Not on assignment page or GPT API key not found');
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
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: instructionPrompt },
      { role: 'user', content: prompt },
    ],
  };

  try {
    // Make API request
    const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
      body: JSON.stringify(body),
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chatgptAPI}` },
    });

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

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
 * Process questions using Gemini API
 */
export const doWithGemini = async (questions: NodeListOf<Element>, method: string) => {
  const { geminiAPI } = await chrome.storage.local.get('geminiAPI');
  if (!geminiAPI && Method.Gemini == method) {
    alert(
      'Gemini API key not found, see the tutorial video to get one: https://www.youtube.com/watch?v=OVnnVnLZPEo and put it in the extension settings',
    );
    return;
  }

  // Extract question data
  const questionData = extractQuestionData(questions);

  // Prepare the prompt
  const prompt = JSON.stringify(questionData.map((q) => ({ term: q.term, definition: '' })));

  // API request body
  const body = {
    system_instruction: { parts: { text: instructionPrompt } },
    contents: [{ parts: [{ text: prompt }] }],
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
    if (!response.ok && method == Method.Gemini) {
      alert(
        'Wrong Gemini API key, see the tutorial video to get one: https://www.youtube.com/watch?v=OVnnVnLZPEo and put it in the extension settings',
      );
      return;
    }

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
  try {
  } catch (error) {}
  const { deepseekAPI } = await chrome.storage.local.get('deepseekAPI');
  if (!location.href.includes('assignment-submission') || !deepseekAPI) {
    return;
  }

  // Extract question data
  const questionData = extractQuestionData(questions);

  // Prepare the prompt
  const prompt = JSON.stringify(questionData.map((q) => ({ term: q.term, definition: '' })));

  // API request body
  const body = {
    model: 'deepseek/deepseek-r1-zero:free',
    messages: [{ role: 'user', content: prompt + instructionPrompt }],
    stream: false,
  };

  try {
    // Make API request
    const answerData = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      body: JSON.stringify(body),
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deepseekAPI}` },
    }).then((res) => res.json());

    let text = answerData?.choices?.[0]?.message?.content;
    text = text.replace(/^\\boxed{\n?|\n?}$/g, '');
    console.log('DeepSeek response:', text);

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

/**
 * Process quiz questions using source material
 * @param questions The list of quiz questions
 * @param course The course data
 * @param method The processing method
 */
export const doWithSource = async (
  questions: NodeListOf<Element>,
  course: Course,
  method: string,
) => {
  if (!location.href.includes('assignment-submission')) {
    return;
  }

  const { isDebugMode } = await chrome.storage.local.get('isDebugMode');

  // Ensure normalize is available
  extendStringPrototype();

  // Questions without matching answers in source
  let unmatched: any[] = [];

  // Process each question
  questions.forEach((question: any, i: number) => {
    const questionChild = question.querySelector('.css-x3q7o9 > div:nth-child(2), .rc-CML');
    if (!questionChild) {
      if (isDebugMode) console.log('Question child not found for question', i);
      return;
    }

    const text = questionChild.textContent?.normalize() ?? '';

    // Find matching questions in the source database
    const matchingQuestions =
      course?.quizSrc?.filter(
        (item) =>
          item.term.toLowerCase().includes(text.toLowerCase()) ||
          text.toLowerCase().includes(item.term.toLowerCase()),
      ) || [];

    if (matchingQuestions.length > 0) {
      // Process questions with matches in the source
      let answered = false;

      matchingQuestions.forEach((matchedQuestion) => {
        const options = question.querySelectorAll('.rc-Option');

        if (options.length > 0) {
          // Multiple choice question
          for (const option of options) {
            const optionText =
              option?.querySelector('span:nth-child(3)')?.textContent?.normalize() ?? '';

            if (matchedQuestion.definition.toLowerCase().includes(optionText.toLowerCase())) {
              answered = true;
              const input = option.querySelector('input');

              if (input) {
                if (isDebugMode) console.log('Found matching option:', optionText);

                method === Method.Source && input.click();
                addBadgeToLabel(input, 'Source FPT');
              }
            }
          }
        } else {
          // Text input question
          try {
            const inputElement = question.querySelector(
              'input[type="text"], textarea, input[type="number"]',
            );

            if (inputElement) {
              answered = true;
              inputElement.click();
              inputElement.value = matchedQuestion.definition;
              inputElement.dispatchEvent(new Event('change', { bubbles: true }));

              if (isDebugMode) console.log('Filled text input with:', matchedQuestion.definition);
            }
          } catch (error) {
            console.error('Error filling text input:', error);
          }
        }
      });

      if (!answered) {
        if (isDebugMode) console.log('No matching answer found for question', i);

        // No matching answers found, try to select first option
        const input = question.querySelector('input, textarea');
        if (input) {
          method === Method.Source && input.click();
        }

        // Add to unmatched list
        collectUnmatchedQuestion(question, unmatched, method as Method);
      }
    } else {
      // No matching questions in source, collect for AI processing
      if (isDebugMode) console.log('No matching question found in source for:', text);
      collectUnmatchedQuestion(question, unmatched, method as Method);
    }
  });

  // Log unmatched questions for debugging
  if (unmatched.length > 0 && isDebugMode) {
    console.log(`${unmatched.length} questions not found in source:`, unmatched);
  }
};
