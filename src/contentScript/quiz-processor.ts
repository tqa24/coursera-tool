import { Method, Course } from './type';
import { collectUnmatchedQuestion } from './dom-utils';
import { addBadgeToLabel } from './dom-utils';
import { extendStringPrototype } from './helpers';

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
    console.log('Not on assignment page');
    return;
  }
  console.log('Processing with Source');

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

                if (method === Method.Source || method === undefined) {
                  input.click();
                }
                addBadgeToLabel(input, 'Source');
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
          input.click();
        }

        // Add to unmatched list
        collectUnmatchedQuestion(question, unmatched);
      }
    } else {
      // No matching questions in source, collect for AI processing
      if (isDebugMode) console.log('No matching question found in source for:', text);
      collectUnmatchedQuestion(question, unmatched);
    }
  });

  // Log unmatched questions for debugging
  if (unmatched.length > 0 && isDebugMode) {
    console.log(`${unmatched.length} questions not found in source:`, unmatched);
  }
};
