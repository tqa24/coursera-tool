import * as cheerio from 'cheerio';
import { Course, QuizItem } from './type';
import data from '../keys/WED201c.json';

String.prototype.normalize = function () {
  return (
    this.replaceAll('\u00A0', '')
      .replace(/\s+/g, ' ')
      .replaceAll('\n', ' ')
      // .replace(/\s{2,}/g, ' ')
      .trim()
  );
};

const waitForSelector = (selector: string, timeout = 5000) => {
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

export const getMaterial = async () => {
  await waitForSelector('button.nostyle.link-button[aria-expanded="false"]', 20000).catch(
    (error) => {},
  );
  document
    .querySelectorAll('button.nostyle.link-button[aria-expanded="false"]')
    .forEach(async (item) => {
      (item as HTMLElement).click();
    });

  const $ = cheerio.load(document.querySelector('html')?.innerHTML || '');
  const data = $('.rc-LessonItems li > a')
    .map((i, item) => {
      let info = JSON.parse($(item).attr('data-click-value') ?? '');
      info.completed = $(item).find('.rc-NavItemIcon').text().includes('Completed');
      info.locked = $(item).attr('aria-label')!.includes('Locked');
      return info;
    })
    .get();

  return data;
};

export const resolveWeekMaterial = async () => {
  const data = await getMaterial();
  const matchId1 = (document.querySelector('body > script:nth-child(3)') as any)?.innerText.match(
    /(\d+~[A-Za-z0-9-_]+)/,
  );
  const userId = matchId1?.[1].split('~')[0];

  let isNotDoneAll = data.some(
    (item) =>
      !item.completed &&
      !item.locked &&
      (item.href.includes('/lecture/') || item.href.includes('/supplement/')),
    // ||  item.href.includes('/discussionPrompt/')
  );

  if (isNotDoneAll) {
    const moocSlug = data?.[0]?.href?.split('/')[2];

    data.forEach(async (item) => {
      if (item.href.includes('/lecture/')) {
        if (!item.completed) {
          const result = await fetch(
            `https://www.coursera.org/api/opencourse.v1/user/${userId}/course/${moocSlug}/item/${item.itemId}/lecture/videoEvents/ended?autoEnroll=false`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ contentRequestBody: {} }),
            },
          ).then((res) => res.json());
        }
      } else if (item.href.includes('/supplement/')) {
        if (!item.completed) {
          const result = await fetch(
            `https://www.coursera.org/api/onDemandSupplementCompletions.v1`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                courseId: item.course_id,
                itemId: item.itemId,
                userId: Number(userId),
              }),
            },
          ).then((res) => res.json());
        }
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    location.reload();
  }
};

export const handleAutoquiz = async (isWithGemini: boolean = false) => {
  let prod = false;
  if (!location.href.includes('assignment-submission')) {
    return;
  }
  try {
    (document.querySelector("button[aria-label='Back']") as HTMLInputElement).click();
  } catch (error) {}
  let button = document.querySelector("button[data-testid='CoverPageActionButton']");
  while (button === null) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    button = document.querySelector("button[data-testid='CoverPageActionButton']");
  }
  // const courseMap = await fetch('https://ecec123ecec.github.io/coursera-db/courseMap.json').then(
  //   (res) => res.json(),
  // );
  // const course = findKeyForUrl(location.href, courseMap) || '';
  const { isAutoSubmitQuiz } = await chrome.storage.local.get('isAutoSubmitQuiz');
  const { course } = await chrome.storage.local.get('course');
  let courses: Course;
  if (prod) {
    courses = await fetch(`https://ecec123ecec.github.io/coursera-db/${course}.json`).then((res) =>
      res.json(),
    );
  } else {
    courses = data;
  }

  (document.querySelector("button[data-testid='CoverPageActionButton']") as HTMLElement)?.click();
  (
    document.querySelector("button[data-testid='StartAttemptModal__primary-button']") as HTMLElement
  )?.click();

  await waitForSelector('.css-1hhf6i');
  let questions = document.querySelectorAll('.css-1hhf6i');

  if (isWithGemini) {
    await doWithGemini(questions);
  } else {
    await doWithLocal(questions, courses);
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));
  waitForSelector('input#agreement-checkbox-base').then((element: HTMLInputElement) =>
    element.click(),
  );
  waitForSelector('button[data-testid="submit-button"]').then((element: HTMLInputElement) =>
    element.click(),
  );
  if (isAutoSubmitQuiz) {
    waitForSelector('button[data-testid="dialog-submit-button"]').then(
      (element: HTMLInputElement) => element.click(),
    );
    // //> =====================================
    // let yourGrade = document.querySelector('div[data-testid="AssignmentViewTopBanner"]');
    // while (!yourGrade) {
    //   await new Promise((resolve) => setTimeout(resolve, 1000));
    //   yourGrade = document.querySelector('div[data-testid="AssignmentViewTopBanner"]');
    // }
    // console.log(yourGrade.innerText);
    // (document.querySelector('button[aria-label="Back"]') as HTMLElement)?.click();
    // const data = getMaterial();
    // resolveQuizMaterial(data);
  }
};

export const doWithGemini = async (questions: NodeListOf<Element>) => {
  if (!location.href.includes('assignment-submission')) {
    return;
  }
  let qList: any[] = Array.from(questions).map((item: any) => {
    const text =
      item
        .querySelector('.css-x3q7o9 > div:nth-child(2)')
        .innerText?.normalize()
        .replace(/\s{2,}/g, ' ') ?? '';
    let answer = item.querySelectorAll('.rc-Option');
    return {
      term: `${text} | ${Array.from(answer)
        .map((item: any) => item.innerText)
        .join(' | ')}`,
      definition: '',
    };
  });
  const prompt = JSON.stringify(qList);
  // console.log(prompt);

  const body = {
    system_instruction: {
      parts: {
        text: `You are given a json, answer this json by choosing the answer from the term which were divided by the | symbol and fill that to this json but with definition field filled, give me the json only, dont modify the term field and the answer in definition field must be a string included in the term field, just give the answer, doesn't need to explain it`,
      },
    },
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };
  const GOOGLE_API_KEY = 'zzzz';
  const ans = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
    {
      body: JSON.stringify(body),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
    .then((resp) => resp?.json())
    .then((resp: any) => resp?.candidates[0]?.content?.parts?.[0]?.text);

  const kList: QuizItem[] = JSON.parse(ans.replace('```json', '').replace('```', ''));
  let zoSrc = 0;

  questions.forEach((question: any, i: number) => {
    const text =
      question
        .querySelector('.css-x3q7o9 > div:nth-child(2)')
        .innerText?.normalize()
        .replace(/\s{2,}/g, ' ') ?? '';
    // console.log(text);
    // console.log(kList[i].definition);

    let ok = false;
    for (const key of question.querySelectorAll('.rc-Option')) {
      const keyText = key.querySelector('p span')?.innerText?.normalize().toLowerCase() ?? '';
      // console.log(keyText);
      // console.log(kList[i].definition.toLowerCase().includes(keyText));
      if (
        kList[i].definition.toLowerCase().includes(keyText) ||
        keyText.includes(kList[i].definition.toLowerCase())
      ) {
        ok = true;
        let input = key.querySelector('input');
        if (input) {
          // console.log('zo answer');
          input.click();
        }
      }
    }
    if (ok) {
      console.log(`zo src ${i + 1}`);
      zoSrc++;
    }
  });
  console.log(`zo source ${zoSrc}/${questions.length}`);

  console.log('done');
};

export const doWithLocal = async (questions: any, courses: Course) => {
  let outSrcList: any[] = [];

  questions.forEach((question: any, i: number) => {
    const questionChild = question.querySelector('.css-x3q7o9 > div:nth-child(2)');
    const text = questionChild.innerText?.normalize() ?? '';

    const foundedQuestions = courses.quizSrc.filter(
      (item) =>
        item.term.toLowerCase().includes(text.toLowerCase()) ||
        text.toLowerCase().includes(item.term.toLowerCase()),
    );
    // console.log(text); // console.log(foundedQuestions);

    if (foundedQuestions.length > 0) {
      let choosed = false;
      foundedQuestions.forEach((foundedQuestion) => {
        let keys = question.querySelectorAll('.rc-Option');
        if (keys.length > 0) {
          for (const key of keys) {
            const keyText = key.querySelector('p span')?.innerText?.normalize().toLowerCase() ?? '';
            // console.log(keyText);
            if (
              foundedQuestion.definition.toLowerCase().includes(keyText) &&
              foundedQuestion.term.toLocaleLowerCase().includes(keyText)
            ) {
              choosed = true;
              let input = key.querySelector('input');
              // console.log(input);
              if (input) {
                input.click();
              }
            }
          }
        } else {
          try {
            let inputText = question.querySelector('input[type="text"]');
            (inputText as HTMLInputElement).click();
            (inputText as HTMLInputElement).value = foundedQuestion.definition;
            const event = new Event('change', { bubbles: true });
            inputText.dispatchEvent(event);
          } catch (error) {}
        }
      });
      if (!choosed) {
        let input = question.querySelector('input');
        if (input) {
          input.click();
        }
      }
    } else {
      console.log(`${text.normalize()}`);

      let answer = question.querySelectorAll('.rc-Option');
      outSrcList.push({
        term: `${text} | ${Array.from(answer)
          .map((item: any) => item.innerText.normalize())
          .join(' | ')}`,
        definition: '',
      });

      let input = question.querySelectorAll('.rc-Option input');
      if (input) {
        try {
          input[0].click();
        } catch (error) {}
      }
    }
  });
  const prompt = `${JSON.stringify(outSrcList)} You are given a json, answer this json by choosing the answer from the term which were divided by the | symbol and fill that to this json but with definition field filled, give me the json only, and remember not to modify anything in the attribute term, you are only allowed to modify definition attribute. The answer in definition field must be a string included in the term field, just give the answer, doesn't need to explain it, if the question has more than 1 answer, give the answer join by \" | \" `;
  console.log(prompt);

  const textQuestions = document.querySelectorAll(
    'div[data-testid="part-Submission_RegexQuestion"], div[data-testid="part-Submission_TextReflectQuestion"], div[data-testid="part-Submission_NumericQuestion"]',
  );

  textQuestions.forEach(async (question: any, i) => {
    const answer =
      "Entrepreneurial motivation, the driving force behind an entrepreneur's actions, is crucial for strategic decision-making.  Three key factors initiate, energize, and maintain goal-directed behavior in this context:  Firstly, *initiation* stems from a perceived opportunity, often fueled by a strong need for achievement or autonomy.  This could be identifying an unmet market need, developing a novel technology, or capitalizing on a trend.";
    try {
      const inputText = question.querySelector('input[type="text"]');
      (inputText as HTMLInputElement).click();
      (inputText as HTMLInputElement).value = answer;
      const event = new Event('change', { bubbles: true });
      inputText.dispatchEvent(event);
    } catch (error) {}
    try {
      const areaText = question.querySelector('textarea');
      (areaText as HTMLInputElement).click();
      (areaText as HTMLInputElement).value = answer;
      const event = new Event('change', { bubbles: true });
      areaText.dispatchEvent(event);
    } catch (error) {}
    try {
      const inputText = question.querySelector('input[type="number"]');
      (inputText as HTMLInputElement).click();
      (inputText as HTMLInputElement).value = '5';
      const event = new Event('change', { bubbles: true });
      inputText.dispatchEvent(event);
    } catch (error) {}
  });
};

export const waitMain = async () => {
  let main = document.querySelector('#main');
  while (main === null) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    main = document.querySelector('#main');
  }
  return main;
};

export const handlePeerGradedAssignment = async () => {
  const mySubmissionTab = await waitForSelector('div[role="tablist"] button:nth-child(2)');
  (mySubmissionTab as HTMLElement).click();
  let tempAns =
    'Identify key elements of a successful content marketing campaign. Copying someone else’s content marketing ideas and publishing something';
  try {
    await waitForSelector('#main input[aria-label="Project Title"]', 20000).then((item) => {
      (item as HTMLInputElement).click();
      (item as HTMLInputElement).value = tempAns;
      const event = new Event('change', { bubbles: true });
      item!.dispatchEvent(event);
    });
    let textInputs = document.querySelectorAll('#main input[type="text"]:not([aria-label="URL"])');
    textInputs.forEach((input) => {
      (input as HTMLInputElement).click();
      (input as HTMLInputElement).value = tempAns;
      const event = new Event('change', { bubbles: true });
      input!.dispatchEvent(event);
    });
  } catch (error) {
    // console.log(error);
  }

  document.querySelectorAll('.rc-UppyFileUploader button').forEach(async (item) => {
    await (item as HTMLElement).click();
    const file = new File(['This is the content of the file'], 'myFile.md', {
      type: 'text/plain',
    });

    const fileInput = document.querySelector('.uppy-Dashboard-input[type="file"]');
    // console.log(fileInput);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    if (fileInput) {
      (fileInput as HTMLInputElement).files = dataTransfer.files;
    }
    (fileInput as HTMLInputElement).dispatchEvent(
      new Event('change', {
        bubbles: true,
      }),
    );
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  await waitForSelector('#agreement-checkbox-base', 20000).then((element: HTMLInputElement) =>
    element.click(),
  );
  await waitForSelector('button[aria-label="Submit"]', 20000).then((element: HTMLInputElement) =>
    element.click(),
  );
  await waitForSelector('button[data-testid="dialog-submit-button"]', 20000).then(
    (element: HTMLInputElement) => element.click(),
  );
};

export const handleReview = async () => {
  //todo: fix waiting time too long while reviewing
  waitForSelector('button[data-js="open-course-link"]', 1000)
    .then((element: HTMLInputElement) => element.click())
    .catch((error) => {});
  waitForSelector('button[data-js="open-course-link"]', 1000)
    .then((element: HTMLInputElement) => element.click())
    .catch((error) => {});

  let countTxt = await waitForSelector('td[data-testid="review-count"]', 1000)
    .then((item) => item.innerText)
    .catch((error) => {});
  console.log(countTxt);

  do {
    await review();
    console.log('review ne');

    countTxt = await waitForSelector('td[data-testid="review-count"]', 1000)
      .then((item) => item.innerText)
      .catch((error) => {});
  } while (countTxt?.includes('left to complete'));
};

export const review = async () => {
  try {
    const comment = 'Good ';
    await waitForSelector('.rc-FormPart', 1000);
    let formParts = document.getElementsByClassName('rc-FormPart');

    for (const form of formParts) {
      let e = form.getElementsByClassName('peer-option-input');

      let pts = Array.from(form.querySelectorAll('.option-contents > div:nth-child(1)')).map(
        (item) => {
          const match = item.textContent?.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        },
      );

      if (e.length > 0) {
        // Choose based on the points comparison
        if (pts[0] < pts[e.length - 1]) {
          (e[e.length - 1] as HTMLElement).click();
        } else {
          (e[0] as HTMLElement).click();
        }
      }

      const textAreas = form.querySelectorAll(
        '.c-peer-review-submit-textarea-input-field, div[data-testid="peer-review-multi-line-input-field"]',
      );

      for (let textArea of textAreas) {
        (textArea as HTMLElement).click();
        (textArea as HTMLElement).focus();
        document.execCommand('insertText', false, comment);
      }
    }

    // Delay before submitting
    setTimeout(() => {
      const submitBtn = document.getElementsByClassName('rc-FormSubmit')[0].querySelector('button');
      (submitBtn as HTMLElement).click();
    }, 700);
  } catch (error) {
    // console.log(error);
  }
};

export const handleDiscussionPrompt = async () => {
  const data = await getMaterial();
  const matchId1 = (document.querySelector('body > script:nth-child(3)') as any)?.innerText.match(
    /(\d+~[A-Za-z0-9-_]+)/,
  );
  const { csrf3Token } = await chrome.storage.sync.get(['csrf3Token']);
  const userId = matchId1?.[1].split('~')[0];
  data.forEach(async (item) => {
    if (item.href.includes('/discussionPrompt/') && !item.completed && !item.locked) {
      const result = await fetch(
        `https://www.coursera.org/api/onDemandDiscussionPrompts.v1/${userId}~${item.course_id}~${item.itemId}?fields=onDemandDiscussionPromptQuestions.v1(content,creatorId,createdAt,forumId,sessionId,lastAnsweredBy,lastAnsweredAt,totalAnswerCount,topLevelAnswerCount,viewCount),promptType,question&includes=question`,
        {
          method: 'GET',
        },
      ).then((res) => res.json());
      const discussionId =
        result?.elements?.[0]?.promptType?.definition?.courseItemForumQuestionId.split('~')[2];
      // console.log(csrf3Token);

      const result1 = await fetch(
        `https://www.coursera.org/api/onDemandCourseForumAnswers.v1/?fields=content%2CforumQuestionId%2CparentForumAnswerId%2Cstate%2CcreatorId%2CcreatedAt%2Corder%2CupvoteCount%2CchildAnswerCount%2CisFlagged%2CisUpvoted%2CcourseItemForumQuestionId%2CparentCourseItemForumAnswerId%2ConDemandSocialProfiles.v1(userId%2CexternalUserId%2CfullName%2CphotoUrl%2CcourseRole)%2ConDemandCourseForumAnswers.v1(content%2CforumQuestionId%2CparentForumAnswerId%2Cstate%2CcreatorId%2CcreatedAt%2Corder%2CupvoteCount%2CchildAnswerCount%2CisFlagged%2CisUpvoted%2CcourseItemForumQuestionId%2CparentCourseItemForumAnswerId)&includes=profiles%2Cchildren%2CuserId`,
        {
          method: 'POST',
          headers: {
            'x-csrf3-token': csrf3Token,
          },
          body: JSON.stringify({
            content: {
              typeName: 'cml',
              definition: {
                dtdId: 'discussion/1',
                value:
                  '<co-content><text>Since demand remains high and unconstrained, the hotel should consider yielding up the rates to maximize revenue from the strong demand.</text></co-content>',
              },
            },
            courseForumQuestionId: `${item.course_id}~${discussionId}`,
          }),
        },
      ).then((res) => res.json());

      console.log(result1);
    }
  });
  //todo: fix wait to read all the response status before reloading
  await new Promise((resolve) => setTimeout(resolve, 2000));
  location.reload();
};

export const switcToPeerReview = async () => {
  //todo
};
