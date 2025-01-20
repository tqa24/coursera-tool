import { Course, QuizItem } from '../contentScript/type';
import { getMaterial } from '../contentScript/utils';

console.log('background is running');

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'COUNT') {
    console.log('background has received a message from popup, and count is ', request?.count);
  }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  console.log(changeInfo);

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
          console.log(`Cookie found: ${cookie.name} = ${cookie.value}`);
        } else {
          console.log('Cookie not found');
        }
      },
    );
    // Send a message to the content script to show an alert
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: async () => {
        String.prototype.normalize = function () {
          return this.trim()
            .replaceAll('“', '"')
            .replaceAll('”', '"')
            .replaceAll('’', "'")
            .replaceAll('‛', "'")
            .replaceAll('‘', "'")
            .replaceAll('‛', "'")
            .replaceAll('\n', ' ')
            .replaceAll('	', ' ')
            .replaceAll('  ', ' ')
            .replaceAll('…', '...')
            .replaceAll('–', '-');
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

        const getMaterial = async () => {
          await waitForSelector('button.nostyle.link-button[aria-expanded="false"]', 20000).catch(
            (error) => {},
          );
          document
            .querySelectorAll('button.nostyle.link-button[aria-expanded="false"]')
            .forEach(async (item) => {
              (item as HTMLElement).click();
            });

          document.querySelector('html')?.innerHTML;
          const data = Array.from(document.querySelectorAll('.rc-LessonItems li > a')).map(
            (item) => {
              let info = JSON.parse(item.getAttribute('data-click-value') ?? '');
              info.completed = item
                .querySelector('.rc-NavItemIcon')
                ?.textContent!.includes('Completed');
              info.locked = item.getAttribute('aria-label')!.includes('Locked');
              return info;
            },
          );
          return data;
        };

        const resolveWeekMaterial = async () => {
          const data = await getMaterial();
          console.log('🚀 ~ resolveWeekMaterial ~ data:', data);
          const matchId1 = (
            document.querySelector('body > script:nth-child(3)') as any
          )?.innerText.match(/(\d+~[A-Za-z0-9-_]+)/);
          const userId = matchId1?.[1].split('~')[0];

          let isNotDoneAll = data.some(
            (item) =>
              !item.completed &&
              !item.locked &&
              (item.href.includes('/lecture/') || item.href.includes('/supplement/')),
            // ||  item.href.includes('/discussionPrompt/')
          );

          if (isNotDoneAll) {
            console.log(data);
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
                  console.log(result);
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
                  console.log(result);
                }
              }
            });
            await new Promise((resolve) => setTimeout(resolve, 1000));
            location.reload();
          } else {
          }
        };

        const handleAutoquiz = async (isWithGemini: boolean = false) => {
          if (!location.href.includes('assignment-submission')) {
            return;
          }
          let button = document.querySelector("button[data-testid='CoverPageActionButton']");
          while (button === null) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            button = document.querySelector("button[data-testid='CoverPageActionButton']");
          }
          const courseMap = await fetch(
            'https://ecec123ecec.github.io/coursera-db/courseMap.json',
          ).then((res) => res.json());
          const autoSubmit = true;
          // const autoSubmit = await chrome.storage.local.get('autoSubmit');
          // const course = findKeyForUrl(location.href, courseMap) || '';
          const { course } = await chrome.storage.local.get('course');
          let courses: Course = await fetch(
            `https://ecec123ecec.github.io/coursera-db/${course}.json`,
          ).then((res) => res.json());
          // console.log(courses);

          (
            document.querySelector("button[data-testid='CoverPageActionButton']") as HTMLElement
          )?.click();
          (
            document.querySelector(
              "button[data-testid='StartAttemptModal__primary-button']",
            ) as HTMLElement
          )?.click();
          let questions = document.querySelectorAll('.css-1hhf6i');
          while (questions.length === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            questions = document.querySelectorAll('.css-1hhf6i');
            console.log(questions.length);
          }
          if (isWithGemini) {
            await doWithGemini(questions);
          } else {
            await doWithLocal(questions, courses);
          }

          if (autoSubmit) {
            // await new Promise((resolve) => setTimeout(resolve, 1000));
            // (document.querySelector('input#agreement-checkbox-base') as HTMLElement)?.click();
            // (document.querySelector('button[data-testid="submit-button"]') as HTMLElement)?.click();
            // (document.querySelector('button[data-testid="dialog-submit-button"]') as HTMLElement)?.click();
            // //> =====================================
            // let yourGrade = document.querySelector('div[data-testid="AssignmentViewTopBanner"]');
            // while (!yourGrade) {
            //   await new Promise((resolve) => setTimeout(resolve, 1000));
            //   yourGrade = document.querySelector('div[data-testid="AssignmentViewTopBanner"]');
            // }
            // console.log(yourGrade.textContent);
            // (document.querySelector('button[aria-label="Back"]') as HTMLElement)?.click();
            // const data = getMaterial();
            // resolveQuizMaterial(data);
          }
        };

        const doWithGemini = async (questions: NodeListOf<Element>) => {
          if (!location.href.includes('assignment-submission')) {
            return;
          }
          let qList: any[] = Array.from(questions).map((item: any) => {
            const text =
              item
                .querySelector('.css-x3q7o9 > div:nth-child(2)')
                .textContent?.normalize()
                .replace(/\s{2,}/g, ' ') ?? '';
            let answer = item.querySelectorAll('.rc-Option');
            return {
              term: `${text} | ${Array.from(answer)
                .map((item: any) => item.textContent)
                .join(' , ')}`,
              definition: '',
            };
          });
          const prompt = JSON.stringify(qList);
          console.log(prompt);

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
          const GOOGLE_API_KEY = 'AIzaSyBDX1bPxSJl5U3riYSjS9JCs1pyfb3B4AE';
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
          console.log('🚀 ~ doWithGemini ~ kList:', kList);
          console.log('do quiz with gemini');
          let zoSrc = 0;

          questions.forEach((question: any, i: number) => {
            const text =
              question
                .querySelector('.css-x3q7o9 > div:nth-child(2)')
                .textContent?.normalize()
                .replace(/\s{2,}/g, ' ') ?? '';
            // console.log(text);
            // console.log(kList[i].definition);

            let ok = false;
            for (const key of question.querySelectorAll('.rc-Option')) {
              const keyText =
                key.querySelector('p span')?.textContent?.normalize().toLowerCase() ?? '';
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

        const doWithLocal = async (questions: any, courses: Course) => {
          let outSrcList: any[] = [];

          questions.forEach((question: any, i: number) => {
            const questionChild = question.querySelector('.css-x3q7o9 > div:nth-child(2)');
            const text = questionChild.textContent?.normalize().replace(/\s{2,}/g, ' ') ?? '';

            const foundedQuestions = courses.quizSrc.filter(
              (item) =>
                item.term.toLowerCase().includes(text.toLowerCase()) ||
                text.toLowerCase().includes(item.term.toLowerCase()),
            );
            console.log(text);
            console.log(foundedQuestions);

            if (foundedQuestions.length > 0) {
              let choosed = false;
              foundedQuestions.forEach((foundedQuestion) => {
                for (const key of question.querySelectorAll('.rc-Option')) {
                  const keyText =
                    key.querySelector('p span')?.textContent?.normalize().toLowerCase() ?? '';
                  console.log(keyText);

                  if (
                    foundedQuestion.definition.toLowerCase().includes(keyText) ||
                    keyText.includes(foundedQuestion.definition.toLowerCase())
                  ) {
                    choosed = true;
                    let input = key.querySelector('input');
                    console.log(input);
                    if (input) {
                      input.click();
                    }
                  }
                }
              });
              if (!choosed) {
                let input = question.querySelector('input');
                if (input) {
                  input.click();
                }
              }
            } else {
              let answer = question.querySelectorAll('.rc-Option');
              outSrcList.push({
                term: `${text} | ${Array.from(answer)
                  .map((item: any) => item.textContent)
                  .join(' , ')}`,
                definition: '',
              });
              console.log(
                `out source ${i + 1}: ${text} ${Array.from(answer)
                  .map((item: any) => item.textContent)
                  .join(' , ')}`,
              );

              let input = question.querySelectorAll('.rc-Option input');
              if (input) {
                try {
                  input[0].click();
                } catch (error) {}
              }
            }
          });
          const prompt =
            // console.log(
            `${JSON.stringify(outSrcList)} You are given a json, answer this json by choosing the answer from the term which were divided by the | symbol and fill that to this json but with definition field filled, give me the json only, dont modify the term field and the answer in definition field must be a string included in the term field, just give the answer, doesn't need to explain it, if the question has more than 1 answer, give the answer join by \" , \" `;
          // );
          console.log(prompt);

          const textQuestions = document.querySelectorAll(
            'div[data-testid="part-Submission_RegexQuestion"], div[data-testid="part-Submission_TextReflectQuestion"], div[data-testid="part-Submission_NumericQuestion"]',
          );

          let count = 0;
          textQuestions.forEach(async (question: any, i) => {
            const answer =
              "Entrepreneurial motivation, the driving force behind an entrepreneur's actions, is crucial for strategic decision-making.  Three key factors initiate, energize, and maintain goal-directed behavior in this context:  Firstly, *initiation* stems from a perceived opportunity, often fueled by a strong need for achievement or autonomy.  This could be identifying an unmet market need, developing a novel technology, or capitalizing on a trend.";
            try {
              const inputText = question.querySelector('input[type="text"]');
              (inputText as HTMLInputElement).click();
              (inputText as HTMLInputElement).value = answer;
              const event = new Event('change', { bubbles: true });
              inputText.dispatchEvent(event);
              count++;
            } catch (error) {}
            try {
              const areaText = question.querySelector('textarea');
              (areaText as HTMLInputElement).click();
              (areaText as HTMLInputElement).value = answer;
              const event = new Event('change', { bubbles: true });
              areaText.dispatchEvent(event);
              count++;
            } catch (error) {}
            try {
              const inputText = question.querySelector('input[type="number"]');
              (inputText as HTMLInputElement).click();
              (inputText as HTMLInputElement).value = '5';
              console.log(inputText);

              console.log('number inputed');

              const event = new Event('change', { bubbles: true });
              inputText.dispatchEvent(event);
              count++;
            } catch (error) {}
          });
        };

        const handlePeerGradedAssignment = async () => {
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
            let textInputs = document.querySelectorAll(
              '#main input[type="text"]:not([aria-label="URL"])',
            );
            textInputs.forEach((input) => {
              (input as HTMLInputElement).click();
              (input as HTMLInputElement).value = tempAns;
              const event = new Event('change', { bubbles: true });
              input!.dispatchEvent(event);
            });
          } catch (error) {
            console.log(error);
          }

          document.querySelectorAll('.rc-UppyFileUploader button').forEach(async (item) => {
            await (item as HTMLElement).click();
            const file = new File(['This is the content of the file'], 'myFile.md', {
              type: 'text/plain',
            });

            const fileInput = document.querySelector('.uppy-Dashboard-input[type="file"]');
            console.log(fileInput);

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

          await waitForSelector('#agreement-checkbox-base', 20000).then(
            (element: HTMLInputElement) => element.click(),
          );
          await waitForSelector('button[aria-label="Submit"]', 20000).then(
            (element: HTMLInputElement) => element.click(),
          );
          await waitForSelector('button[data-testid="dialog-submit-button"]', 20000).then(
            (element: HTMLInputElement) => element.click(),
          );
        };

        const handleReview = async () => {
          try {
            waitForSelector('button[data-js="open-course-link"]').then(
              (element: HTMLInputElement) => element.click(),
            );
          } catch (error) {}

          let countTxt = await waitForSelector('td[data-testid="review-count"]').then(
            (item) => item.textContent,
          );
          while (countTxt?.includes('left to complete')) {
            try {
              const txtVal = 'Good';
              let formParts = document.getElementsByClassName('rc-FormPart');

              // Wait until formParts are loaded
              while (formParts.length === 0) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                console.log(formParts);
                formParts = document.getElementsByClassName('rc-FormPart');
              }

              for (const form of formParts) {
                let e = form.getElementsByClassName('peer-option-input');

                let pts = Array.from(
                  form.querySelectorAll('.option-contents > div:nth-child(1)'),
                ).map((item) => {
                  const match = item.textContent?.match(/\d+/);
                  return match ? parseInt(match[0], 10) : 0;
                });

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
                  document.execCommand('insertText', false, txtVal);
                }
              }

              // Delay before submitting
              setTimeout(() => {
                const submitBtn = document
                  .getElementsByClassName('rc-FormSubmit')[0]
                  .querySelector('button');
                (submitBtn as HTMLElement).click();
              }, 700);
            } catch (error) {
              console.log(error);
            }
            countTxt = await waitForSelector('td[data-testid="review-count"]').then(
              (item) => item.textContent,
            );
          }
        };

        const handleDiscussionPrompt = async () => {
          waitForSelector('.c-prompt-card').then(async (item) => {
            console.log(item.textContent);
            if (item.textContent.includes('Your Reply')) {
              const matchId1 = (
                document.querySelector('body > script:nth-child(3)') as any
              )?.innerText.match(/(\d+~[A-Za-z0-9-_]+)/);
              const metadata = JSON.parse(
                document.querySelector('.m-a-0.body > a')?.getAttribute('data-click-value') ?? '',
              );
              const userId = matchId1?.[1].split('~')[0];
              console.log(metadata);
              console.log(userId);

              const result = await fetch(
                `https://www.coursera.org/api/onDemandDiscussionPrompts.v1/${userId}~${metadata.course_id}~${metadata.item_id}?fields=onDemandDiscussionPromptQuestions.v1(content,creatorId,createdAt,forumId,sessionId,lastAnsweredBy,lastAnsweredAt,totalAnswerCount,topLevelAnswerCount,viewCount),promptType,question&includes=question`,
                {
                  method: 'GET',
                },
              ).then((res) => res.json());
              console.log(result);

              const discussionId =
                result?.elements?.[0]?.promptType?.definition?.courseItemForumQuestionId.split(
                  '~',
                )[2];
              const { csrf3Token } = await chrome.storage.sync.get(['csrf3Token']);

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
                    courseForumQuestionId: `${metadata.course_id}~${discussionId}`,
                  }),
                },
              ).then((res) => res.json());
              console.log(result1);
              if (result1?.elements?.length) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                location.reload();
              }
            }
          });
        };
        await getMaterial();
        // waitForSelector('#main').then(async (item) => {
        //   if (location.href.includes('assignment-submission')) {
        //     await handleAutoquiz();
        //   }
        // });
      },
    });
  }
});
