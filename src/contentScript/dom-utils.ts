import { generateRandomString } from './helpers';

/**
 * Adds a badge to the label parent of an input element
 * @param inputElement The input element to find the parent label for
 * @param text Text to display in the badge
 */
export const addBadgeToLabel = (inputElement: Element, text: string) => {
  if (inputElement) {
    const labelElement = inputElement.closest('label');
    if (labelElement) {
      // Define color mapping based on text
      const colorMap: { [key: string]: string } = {
        Source: '#007bff', // Blue
        ChatGPT: '#ffc107', // Yellow
        Gemini: '#dc3545', // Red
        DeepSeek: '#28a745', // Green
      };

      // Set the badge color based on the text
      const badgeColor = colorMap[text] || '#007bff'; // Default to blue if not found

      // Check if the badge already exists
      const existingBadge = labelElement.querySelector(`.badge[data-text="${text}"]`);
      if (!existingBadge) {
        labelElement.style.border = `1px solid ${badgeColor}`;
        labelElement.style.borderRadius = '12px';
        labelElement.style.padding = '2px 4px';

        // Create the badge element
        const badge = document.createElement('span');
        badge.textContent = text;
        badge.className = 'badge'; // Add a class for styling if needed
        badge.style.backgroundColor = badgeColor; // Set the background color
        badge.style.color = '#fff'; // Text color
        badge.style.borderRadius = '12px'; // Rounded corners
        badge.style.padding = '2px 8px'; // Padding
        badge.style.marginTop = '2px'; // Margin
        badge.style.marginLeft = '8px'; // Margin
        badge.setAttribute('data-text', text); // Set a data attribute to identify the badge

        // Append the badge to the label
        labelElement.appendChild(badge);
      }
    }
  }
};

/**
 * Appends a warning message for unsupported text inputs
 */
export const appendNotSupported = async () => {
  const text = (document.querySelector('body > script:nth-child(3)') as any)?.innerText;
  const matchId1 = text?.match(/(\d+~[A-Za-z0-9-_]+)/);
  const userId = matchId1?.[1]?.split('~')[0];

  Array.from(document.querySelectorAll('.parts > div')).forEach((item) => {
    let richText = item.querySelector('div[role="textbox"]');
    if (richText) {
      if (!item.textContent?.includes('This extension currently does not support')) {
        let span = document.createElement('span');
        const content = `<div class="my-2 flex items-center gap-4 border border-yellow-600 bg-yellow-100 px-4 py-3 rounded-md font-normal">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        class="text-yellow-600"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
      <div>
        This extension currently does not support the above text box, please input this mannually
      </div>
    </div>`;
        span.innerHTML = content;
        item.appendChild(span);
        span.scrollIntoView();
      }
    }
  });
};

/**
 * Helper to collect unmatched questions
 */
export const collectUnmatchedQuestion = (question: Element, unmatched: any[]) => {
  const questionChild = question.querySelector('.css-x3q7o9 > div:nth-child(2), .rc-CML');
  const text = questionChild?.textContent?.normalize() ?? '';
  const options = question.querySelectorAll('.rc-Option');

  unmatched.push({
    term: `${text} | ${Array.from(options)
      .map((item: any) => item.textContent.normalize())
      .join(' | ')}`,
    definition: '',
  });

  // Try to select the first option or fill a random value
  const inputs = question.querySelectorAll('input, textarea');
  if (inputs.length > 0) {
    try {
      const input = inputs[0] as HTMLInputElement | HTMLTextAreaElement;
      input.click();

      if (input instanceof HTMLInputElement) {
        if (input.type === 'text' || input.type === 'textarea') {
          input.value = generateRandomString(10);
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (input.type === 'number') {
          input.value = '10';
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else if (input instanceof HTMLTextAreaElement) {
        input.value = generateRandomString(10);
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } catch (error) {
      console.error('Error selecting default option:', error);
    }
  }
};
