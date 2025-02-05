import { Course, QuizItem } from './type';
import source from '../keys/LAW201c.json';
// The student’s use of the quote is incorrect because they shouldn’t have capitalized the ‘i’ in “Intermediaries”.

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

export const getMaterial = async () => {
  await waitForSelector('button.cds-iconButton-small[aria-label^="Open"]', 500)
    .then((item) => item.click())
    .catch((error) => {});
  await waitForSelector('button.nostyle.link-button[aria-expanded="false"]', 1000).catch(
    (error) => {},
  );
  document
    .querySelectorAll('button.nostyle.link-button[aria-expanded="false"]')
    .forEach(async (item) => {
      (item as HTMLElement).click();
    });

  await waitForSelector(
    '.rc-LessonItems li a, [data-testid="named-item-list-list"] li a',
    1000,
  ).catch((error) => {});

  //> debug
  // console.log(
  //   Array.from(
  //     document.querySelectorAll('.rc-LessonItems li a, [data-testid="named-item-list-list"] li a'),
  //   ).length,
  // );

  const data = Array.from(
    document.querySelectorAll('.rc-LessonItems li a, [data-testid="named-item-list-list"] li a'),
  ).map((item) => {
    let info = JSON.parse(item.getAttribute('data-click-value') ?? '{}');
    info.completed = item.textContent?.includes('Completed');
    info.locked = item.textContent?.includes('Locked');
    return info;
  });

  return data;
};

export const getAllMaterials = async () => {
  const slug = window.location.href.split('/')[4];
  let data = await fetch(
    `https://www.coursera.org/api/onDemandCourseMaterials.v2/?q=slug&slug=${slug}&includes=modules%2Clessons%2CpassableItemGroups%2CpassableItemGroupChoices%2CpassableLessonElements%2Citems%2Ctracks%2CgradePolicy%2CgradingParameters%2CembeddedContentMapping&fields=moduleIds%2ConDemandCourseMaterialModules.v1(name%2Cslug%2Cdescription%2CtimeCommitment%2ClessonIds%2Coptional%2ClearningObjectives)%2ConDemandCourseMaterialLessons.v1(name%2Cslug%2CtimeCommitment%2CelementIds%2Coptional%2CtrackId)%2ConDemandCourseMaterialPassableItemGroups.v1(requiredPassedCount%2CpassableItemGroupChoiceIds%2CtrackId)%2ConDemandCourseMaterialPassableItemGroupChoices.v1(name%2Cdescription%2CitemIds)%2ConDemandCourseMaterialPassableLessonElements.v1(gradingWeight%2CisRequiredForPassing)%2ConDemandCourseMaterialItems.v2(name%2CoriginalName%2Cslug%2CtimeCommitment%2CcontentSummary%2CisLocked%2ClockableByItem%2CitemLockedReasonCode%2CtrackId%2ClockedStatus%2CitemLockSummary)%2ConDemandCourseMaterialTracks.v1(passablesCount)%2ConDemandGradingParameters.v1(gradedAssignmentGroups)%2CcontentAtomRelations.v1(embeddedContentSourceCourseId%2CsubContainerId)&showLockedItems=true`,
    {
      method: 'GET',
    },
  ).then((res) => res.json());

  //> debug
  // console.log(slug);
  // console.log(data);
  console.log(data?.linked?.['onDemandCourseMaterialItems.v2']);

  return {
    data: data?.linked?.['onDemandCourseMaterialItems.v2'],
    courseId: data?.linked?.['onDemandCourseMaterialGradePolicy.v1']?.[0]?.id,
    slug: slug,
  };
};

export const resolveWeekMaterial = async () => {
  if (!location.href.includes('/learn/')) {
    alert('This is not a course page, please go to your course page first');
    return;
  }
  const { data, courseId, slug } = await getAllMaterials();

  const matchId1 = (document.querySelector('body > script:nth-child(3)') as any)?.innerText.match(
    /(\d+~[A-Za-z0-9-_]+)/,
  );
  const userId = matchId1?.[1].split('~')[0];

  data.forEach(async (item: any) => {
    if (item.contentSummary.typeName == 'lecture') {
      const result = await fetch(
        `https://www.coursera.org/api/opencourse.v1/user/${userId}/course/${slug}/item/${item.id}/lecture/videoEvents/ended?autoEnroll=false`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contentRequestBody: {} }),
        },
      ).then((res) => res.json());
      console.log(result);
    } else if (item.contentSummary.typeName == 'supplement') {
      const result = await fetch(`https://www.coursera.org/api/onDemandSupplementCompletions.v1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: courseId,
          itemId: item.id,
          userId: Number(userId),
        }),
      }).then((res) => res.json());
      console.log(result);
    } else if (item.contentSummary.typeName == 'ungradedLti') {
      const result = await fetch(
        `https://www.coursera.org/api/onDemandLtiUngradedLaunches.v1/?fields=endpointUrl%2CauthRequestUrl%2CsignedProperties`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId: courseId,
            itemId: item.id,
            learnerId: Number(userId),
          }),
        },
      ).then((res) => res.json());
      console.log(result);
    } else if (item.contentSummary.typeName == 'ungradedWidget') {
      const sessionId = await fetch(
        `https://www.coursera.org/api/onDemandSessionMemberships.v1?courseId=${courseId}&userId=${userId}&q=activeByUserAndCourse&fields=id,createdAt,sessionId,userId`,
      )
        .then((res) => res.json())
        .then((res) => res?.elements?.[0]?.sessionId);
      // console.log('sesssion');
      // console.log(sessionId);

      const result = await fetch(
        `https://www.coursera.org/api/onDemandWidgetProgress.v1/${userId}~${courseId}~${item.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            progressState: 'Completed',
            sessionId,
          }),
        },
      ).then((res) => res.json());
      // console.log('lti upgrade');
      // console.log(result);
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  //> debug
  location.reload();
};

export const handleAutoquiz = async (course: string, isWithGemini: boolean = false) => {
  if (!location.href.includes('/learn/')) {
    alert('This is not a course page, please go to your course page first');
    return;
  }
  if (
    !location.href.includes('/assignment-submission') &&
    !location.href.includes('/exam') &&
    !location.href.includes('/quiz')
  ) {
    const data = await getMaterial();
    let flag = false;
    data.forEach((item) => {
      if (
        !item.completed &&
        !item.locked &&
        (item.href.includes('/assignment-submission') ||
          item.href.includes('/exam') ||
          item.href.includes('/quiz'))
      ) {
        flag = true;
        // const accepted = confirm(`Go to assignment page?`);
        // if (!accepted) return;
        location.href = item.href;
      }
    });
    if (!flag) {
      return;
    }
  }

  const { isAutoSubmitQuiz } = await chrome.storage.local.get('isAutoSubmitQuiz');
  let courses: Course;
  courses = await fetch(`https://ecec123ecec.github.io/coursera-db/${course}.json`, {
    cache: 'no-store',
  })
    .then((res) => res.json())
    .catch((err) => {});
  //> debug
  // courses = source;
  if (!location.href.includes('/attempt')) {
    await waitForSelector("button[data-testid='CoverPageActionButton']", 3600000)
      .then((item) => item.click())
      .catch((error) => {
        console.log(error);
      });
    await waitForSelector(
      "button[data-testid='StartAttemptModal__primary-button'], [data-testid='action-button']",
    )
      .then((item) => item.click())
      .catch((error) => {});
  }

  await waitForSelector('.css-1hhf6i, .rc-FormPartsQuestion', 20000);
  let questions = document.querySelectorAll('.css-1hhf6i, .rc-FormPartsQuestion');

  if (isWithGemini) {
    await doWithGemini(questions);
  } else {
    await doWithLocal(questions, courses);
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
  waitForSelector('input#agreement-checkbox-base')
    .then((element: HTMLInputElement) => {
      element.scrollIntoView();
      element.click();
    })
    .catch((error) => {
      console.log(error);
    });
  let autoSubmit = isAutoSubmitQuiz == undefined ? true : isAutoSubmitQuiz;

  if (autoSubmit) {
    waitForSelector('button[data-testid="submit-button"], button[data-test="submit-button"]')
      .then((element: HTMLInputElement) => {
        element.click();
        element.scrollIntoView();
      })
      .catch((error) => {
        console.log(error);
      });
    waitForSelector('button[data-testid="dialog-submit-button"]', 2000)
      .then((element: HTMLInputElement) => element.click())
      .catch((error) => {});
    // //> =====================================
    // await waitForSelector('div[data-testid="AssignmentViewTopBanner"]', 20000);
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
        kList[i].definition.toLowerCase().includes(keyText)
        // || keyText.includes(kList[i].definition.toLowerCase())
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
  String.prototype.normalize = function () {
    return this.replaceAll('\u00A0', '')
      .replace(/\s+/g, ' ')
      .replaceAll('\n', ' ')
      .replaceAll('“', '"')
      .replaceAll('”', '"')
      .replaceAll('‘', "'")
      .replaceAll('’', "'")
      .replaceAll('–', '-')
      .trim();
  };
  let outSrcList: any[] = [];

  questions.forEach((question: any, i: number) => {
    const questionChild = question.querySelector('.css-x3q7o9 > div:nth-child(2), .rc-CML');
    const text = questionChild.textContent?.normalize() ?? '';
    // console.log(text);

    // const foundedQuestions = [{ term: '', definition: '' }];
    const foundedQuestions = courses.quizSrc.filter(
      (item) =>
        item.term.toLowerCase().includes(text.toLowerCase()) ||
        text.toLowerCase().includes(item.term.toLowerCase()),
    );
    // console.log(text);
    // console.log(foundedQuestions);

    if (foundedQuestions.length > 0) {
      let choosed = false;
      foundedQuestions.forEach((foundedQuestion) => {
        let keys = question.querySelectorAll('.rc-Option');
        if (keys.length > 0) {
          for (const key of keys) {
            const keyText = key?.textContent?.normalize() ?? '';

            // console.log(keyText);
            if (
              foundedQuestion.definition.toLowerCase().includes(keyText.toLowerCase())
              // || keyText.includes(foundedQuestion.definition.toLowerCase())
            ) {
              choosed = true;
              let input = key.querySelector('input');
              //> debug
              // console.log(input);
              if (input) {
                input.click();
              }
            }
          }
        } else {
          try {
            let inputText = question.querySelector(
              'input[type="text"], textarea, input[type="number"]',
            );
            (inputText as HTMLInputElement).click();
            (inputText as HTMLInputElement).value = foundedQuestion.definition;
            const event = new Event('change', { bubbles: true });
            inputText.dispatchEvent(event);
          } catch (error) {}
        }
      });
      if (!choosed) {
        //> debug
        // console.log('out dap an');

        let input = question.querySelector('input, textarea');
        if (input) {
          input.click();
        }
      }
    } else {
      //> debug
      // console.log(`${text.normalize()}`);

      let answer = question.querySelectorAll('.rc-Option');
      outSrcList.push({
        term: `${text} | ${Array.from(answer)
          .map((item: any) => item.textContent.normalize())
          .join(' | ')}`,
        definition: '',
      });

      let input = question.querySelectorAll('input, textarea');
      if (input) {
        try {
          input[0].click();
        } catch (error) {}
        try {
          (input[0] as HTMLInputElement).click();
          input[0].value = generateRandomString(10);
          if (input[0].type == 'number') {
            (input[0] as HTMLInputElement).value = '10';
          }
          const event = new Event('change', { bubbles: true });
          input[0].dispatchEvent(event);
        } catch (error) {}
      }
    }
  });
  const prompt = `${JSON.stringify(outSrcList)} You are given a json, answer this json by choosing the answer from the term which were divided by the | symbol and fill that to this json but with definition field filled, give me the json only, and remember not to modify anything in the attribute term, you are only allowed to modify definition attribute. The answer in definition field must be a string included in the term field, just give the answer, doesn't need to explain it, if the question has more than 1 answer, give the answer join by \" | \" `;
  //> debug
  // console.log(prompt);
};

export const handlePeerGradedAssignment = async () => {
  if (!location.href.includes('/learn/')) {
    alert('This is not a course page, please go to your course page first');
    return;
  }
  if (!location.href.includes('/peer/') || location.href.includes('/give-feedback')) {
    const data = await getMaterial();
    let flag = false;
    data.forEach((item) => {
      if (
        !item.completed &&
        !item.locked &&
        item.href.includes('/peer/') &&
        !item.href.includes('/give-feedback')
      ) {
        flag = true;
        const accepted = confirm(`Go to assignment page?`);
        if (!accepted) return;
        location.href = item.href;
      }
    });
  }

  await waitForSelector('div[role="tablist"] button:nth-child(2)')
    .then((item) => item.click())
    .catch((error) => {});
  let tempAns = generateRandomString(10);
  try {
    await waitForSelector('#main input[aria-label="Project Title"]', 20000)
      .then(async (item) => {
        (item as HTMLInputElement).click();
        (item as HTMLInputElement).value = tempAns;
        const event = new Event('change', { bubbles: true });
        item!.dispatchEvent(event);
      })
      .catch((error) => {});
    let textInputs = document.querySelectorAll(
      '#main input[type="text"]:not([aria-label="URL"]), textarea:not([aria-label="URL"])',
    );
    textInputs.forEach((input) => {
      // (input as HTMLInputElement).click();
      (input as HTMLInputElement).value = tempAns;
      const event = new Event('change', { bubbles: true });
      input!.dispatchEvent(event);
    });
  } catch (error) {
    console.log(error);
  }
  appendNotSupported();

  document.querySelectorAll('.rc-UppyFileUploader button').forEach(async (item) => {
    await (item as HTMLElement).click();
    const content = generateRandomString(2000);
    const file = new File([content], `${generateRandomString(4, '-')}.md`, {
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
  await waitForSelector('#agreement-checkbox-base', 10000)
    .then((element: HTMLInputElement) => element.click())
    .catch((error) => {});
  console.log('click submit');

  await waitForSelector('button[aria-label="Submit"]', 10000)
    .then((element: HTMLInputElement) => element.click())
    .catch((error) => {
      console.log(error);
    });
  await waitForSelector('button[data-testid="dialog-submit-button"]', 10000)
    .then((element: HTMLInputElement) => element.click())
    .catch((error) => {});
};

export const handleReview = async () => {
  if (!location.href.includes('/learn/')) {
    alert('This is not a course page, please go to your course page first');
    return;
  }

  //todo: fix waiting time too long while reviewing
  waitForSelector('button[data-js="open-course-link"]', 1000)
    .then((element: HTMLInputElement) => element.click())
    .catch((error) => {});
  await new Promise((resolve) => setTimeout(resolve, 1000));
  waitForSelector('button[data-js="open-course-link"]', 1000)
    .then((element: HTMLInputElement) => element.click())
    .catch((error) => {});

  let countTxt = '';
  // await review();
  do {
    countTxt = await waitForSelector('td[data-testid="review-count"]', 1000)
      .then((item) => item.innerText)
      .catch((error) => {});
    await review();
  } while (countTxt?.includes('left to complete'));
};

export const review = async () => {
  try {
    const comment = 'Good ';
    await waitForSelector('.rc-FormPart', 1000);
    let formParts = document.getElementsByClassName('rc-FormPart');

    for (const form of formParts) {
      let e = form.querySelectorAll('.peer-option-input .cds-checkboxAndRadio-label');

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
      submitBtn!.scrollIntoView();
      (submitBtn as HTMLElement).click();
    }, 700);
  } catch (error) {
    // console.log(error);
  }
};

export const handleDiscussionPrompt = async () => {
  if (!location.href.includes('/learn/')) {
    alert('This is not a course page, please go to your course page first');
    return;
  }
  const { data, courseId } = await getAllMaterials();
  const matchId1 = (document.querySelector('body > script:nth-child(3)') as any)?.innerText.match(
    /(\d+~[A-Za-z0-9-_]+)/,
  );
  const { csrf3Token } = await chrome.storage.sync.get(['csrf3Token']);
  const userId = matchId1?.[1].split('~')[0];
  data.forEach(async (item: any) => {
    // if (item.href.includes('/discussionPrompt/') && !item.completed && !item.locked) {
    const result = await fetch(
      `https://www.coursera.org/api/onDemandDiscussionPrompts.v1/${userId}~${courseId}~${item.id}?fields=onDemandDiscussionPromptQuestions.v1(content,creatorId,createdAt,forumId,sessionId,lastAnsweredBy,lastAnsweredAt,totalAnswerCount,topLevelAnswerCount,viewCount),promptType,question&includes=question`,
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
              value: `<co-content><text>${generateRandomString(10)}</text></co-content>`,
            },
          },
          courseForumQuestionId: `${courseId}~${discussionId}`,
        }),
      },
    ).then((res) => res.json());

    // console.log(result1);
    // }
  });
  //todo: fix wait to read all the response status before reloading
  await new Promise((resolve) => setTimeout(resolve, 2000));
  location.reload();
};

export const appendNotSupported = async () => {
  const text = (document.querySelector('body > script:nth-child(3)') as any)?.innerText;
  const matchId1 = text.match(/(\d+~[A-Za-z0-9-_]+)/);
  const userId = matchId1?.[1].split('~')[0];
  const metadata = JSON.parse(
    document.querySelector('.m-a-0.body > a')?.getAttribute('data-click-value') ?? '',
  );

  const partIds = Array.from(document.querySelectorAll('.parts > div')).map(
    (item) => item.getAttribute('id') as string,
  );
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
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
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

export const requestGradingByPeer = async () => {
  if (!location.href.includes('/learn/')) {
    alert('This is not a course page, please go to your course page first');
    return;
  }
  const text = (document.querySelector('body > script:nth-child(3)') as any)?.innerText;
  const matchId1 = text.match(/(\d+~[A-Za-z0-9-_]+)/);
  const userId = matchId1?.[1].split('~')[0];
  const metadata = JSON.parse(
    document.querySelector('.m-a-0.body > a')?.getAttribute('data-click-value') ?? '',
  );

  const submissionId = await fetch(
    `https://www.coursera.org/api/onDemandPeerAssignmentPermissions.v1/${userId}~${metadata.course_id}~${metadata.item_id}/?fields=deleteSubmission%2ClistSubmissions%2CreviewPeers%2CviewReviewSchema%2CanonymousPeerReview%2ConDemandPeerSubmissionProgresses.v1(latestSubmissionSummary%2ClatestDraftSummary%2ClatestAttemptSummary)%2ConDemandPeerReceivedReviewProgresses.v1(evaluationIfReady%2CearliestCompletionTime%2CreviewCount%2CdefaultReceivedReviewRequiredCount)%2ConDemandPeerDisplayablePhaseSchedules.v1(currentPhase%2CphaseEnds%2CphaseStarts)&includes=receivedReviewsProgress%2CsubmissionProgress%2CphaseSchedule`,
  )
    .then((res) => res.json())
    .then(
      (res) =>
        res.linked?.['onDemandPeerSubmissionProgresses.v1'][0]?.latestSubmissionSummary?.computed
          .id,
    );

  const a = await fetch('https://www.coursera.org/graphql-gateway?opname=RequestGradingByPeer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      {
        operationName: 'RequestGradingByPeer',
        variables: {
          input: {
            courseId: metadata.course_id,
            itemId: metadata.item_id,
            submissionId,
            reason: 'EXPECTED_HIGHER_SCORE|ok',
          },
        },
        query:
          'mutation RequestGradingByPeer($input: PeerReviewAi_RequestGradingByPeerInput!) {\n  PeerReviewAi_RequestGradingByPeer(input: $input) {\n    submissionId\n    __typename\n  }\n}\n',
      },
    ]),
  })
    .then((res) => {
      if (res.status === 200) {
        location.reload();
      }
    })
    .catch((error) => {
      console.log(error);
    });
};

function generateRandomString(numWords: number = 10, delimiter: string = ' '): string {
  const wordList = [
    'apple',
    'banana',
    'cherry',
    'dog',
    'elephant',
    'fish',
    'giraffe',
    'house',
    'ice',
    'jungle',
    'kiwi',
    'lemon',
    'mountain',
    'orange',
    'piano',
    'queen',
    'river',
    'sunflower',
    'tree',
    'umbrella',
    'violet',
    'watermelon',
    'xylophone',
    'yellow',
    'zebra',
    'adventure',
    'balloon',
    'carpet',
    'diamond',
    'echo',
    'flame',
    'grape',
    'harmony',
    'illusion',
    'jewel',
    'kitchen',
    'lighthouse',
    'magnet',
    'notebook',
    'ocean',
    'paradise',
    'question',
    'rocket',
    'storm',
    'telescope',
    'universe',
    'vortex',
    'whisper',
    'xenon',
    'yarn',
    'zephyr',
    'abundance',
    'bravery',
    'calm',
    'delight',
    'euphoria',
    'freedom',
    'grace',
    'hope',
    'inspire',
    'joyful',
    'kingdom',
    'lunar',
    'mystic',
    'novel',
    'oblivion',
    'puzzle',
    'quaint',
    'rainbow',
    'serenity',
    'tranquility',
    'utopia',
    'vivid',
    'wanderlust',
    'zenith',
    'allegory',
    'breeze',
    'courage',
    'dawn',
    'evergreen',
    'frost',
    'galaxy',
    'horizon',
    'infinity',
    'journey',
    'knowledge',
    'lullaby',
    'moondust',
    'neon',
    'opportunity',
    'pulse',
    'quicksilver',
    'reflex',
    'solace',
    'timeless',
    'unity',
    'vanguard',
    'whimsy',
    'xenial',
    'yellowstone',
    'zeal',
    'appletree',
    'butterfly',
    'carousel',
    'driftwood',
    'enigma',
    'firefly',
    'gravity',
    'hologram',
    'infinity',
    'jubilee',
    'kaleidoscope',
    'luminary',
    'memento',
    'nebula',
    'obelisk',
    'phantom',
    'quicksand',
    'reverie',
    'seraph',
    'tornado',
    'underworld',
    'vortex',
    'whirlpool',
    'xenophobia',
    'yesteryear',
    'zeppelin',
    'alchemy',
    'bastion',
    'cerebral',
    'doppelganger',
    'ethereal',
    'fable',
    'gale',
    'harmony',
    'illusion',
    'juxtapose',
    'kismet',
    'lullaby',
    'mosaic',
    'nostalgia',
    'oracle',
    'prism',
    'quiver',
    'rejuvenate',
    'solitude',
    'tapestry',
    'unveil',
    'vigilant',
    'wanderlust',
    'xylophonist',
    'yearning',
    'zenith',
    'arcane',
    'believe',
    'cliffhanger',
    'delirium',
    'eclipse',
    'frostbite',
    'gossamer',
    'hollow',
    'insight',
    'jovial',
    'keen',
    'luminous',
    'mystify',
    'nocturnal',
    'obscure',
    'pinnacle',
    'quest',
    'radiance',
    'synergy',
    'timeless',
    'ultimate',
    'visionary',
    'whimsy',
    'xenophile',
    'yield',
    'zealot',
    'alchemy',
    'bliss',
    'catalyst',
    'dawn',
    'epiphany',
    'fervor',
    'grip',
    'horizon',
    'inspire',
    'juggernaut',
    'keystone',
    'leverage',
    'mindset',
    'notorious',
    'oracle',
    'paradigm',
    'quintessential',
    'resilience',
    'serendipity',
    'thrive',
    'underpinning',
    'velocity',
    'whisper',
    'yearn',
    'zest',
    'amethyst',
    'brilliance',
    'calibration',
    'dynamic',
    'exuberant',
    'foundation',
    'galvanize',
    'harbinger',
    'interlude',
    'juxtaposition',
    'kaleidoscope',
    'legendary',
    'mysticism',
    'nomadic',
    'opulent',
    'platinum',
    'quench',
    'remedy',
    'subtle',
    'torrent',
    'untamed',
    'vanguard',
    'whirlwind',
    'xenial',
    'yielding',
    'zephyr',
    'aspire',
    'belong',
    'clarity',
    'discern',
    'elixir',
    'fortitude',
    'gallant',
    'harmony',
    'illusion',
    'jubilant',
    'keynote',
    'luminescent',
    'memento',
    'nexus',
    'quixotic',
    'revelation',
    'soar',
    'triumph',
    'unravel',
    'vivid',
    'whimsical',
    'x-factor',
    'yonder',
    'zodiac',
    'aberration',
    'anomaly',
    'benign',
    'catalyst',
    'dichotomy',
    'epistemology',
    'fluctuate',
    'gravitas',
    'heuristic',
    'inference',
    'juxtapose',
    'kinetics',
    'lexicon',
    'magnitude',
    'neologism',
    'ontology',
    'paradigm',
    'quintessential',
    'resilience',
    'synergy',
    'thesis',
    'ubiquitous',
    'vicissitude',
    'warrant',
    'xenophobia',
    'yields',
    'zealous',
    'abrogate',
    'banal',
    'cogent',
    'dilapidated',
    'ephemeral',
    'fallacy',
    'germane',
    'heterogeneous',
    'incontrovertible',
    'juxtaposition',
    'kaleidoscope',
    'legitimate',
    'manifest',
    'narrative',
    'objective',
    'proclivity',
    'qualitative',
    'reflexive',
    'synthesis',
    'taxonomy',
    'underpinning',
    'validity',
    'warranted',
    'xerophyte',
    'yielding',
    'zealot',
    'acumen',
    'brevity',
    'catharsis',
    'discourse',
    'equilibrium',
    'facilitate',
    'gravitate',
    'hubris',
    'intermediate',
    'juxtapose',
    'kinesis',
    'lexical',
    'monograph',
    'nuance',
    'opinion',
    'paradox',
    'quantitative',
    'reduction',
    'significance',
    'thesis',
    'utilitarian',
    'volition',
    'warranted',
    'xenial',
    'yarn',
    'zephyr',
    'allegory',
    'bifurcate',
    'coherent',
    'deconstruction',
    'ethereal',
    'falsifiability',
    'genuine',
    'heuristic',
    'intuition',
    'jurisprudence',
    'knell',
    'luminous',
    'methodology',
    'noteworthy',
    'ontology',
    'phenomenon',
    'qualitative',
    'reductionism',
    'scalability',
    'theoretical',
    'universal',
    'vernacular',
    'westernize',
    'xenogenesis',
    'yesterday',
    'zeal',
    'academic',
    'bibliography',
    'cumulative',
    'dialectic',
    'exegesis',
    'fallacious',
    'gestalt',
    'hyperbole',
    'impartial',
    'juxtaposition',
    'knowledge',
    'logical',
    'malleable',
    'neoteric',
    'obfuscate',
    'pragmatic',
    'quixotic',
    'repartee',
    'scholarship',
    'tangible',
    'unanimous',
    'vanguard',
    'webinar',
    'xenogenesis',
    'yogic',
    'zeitgeist',
    'analytic',
    'bipartisan',
    'cogitate',
    'diplomatic',
    'entropic',
    'foment',
    'grammatical',
    'heuristic',
    'interlocutor',
    'juxtaposition',
    'kaleidoscopic',
    'literacy',
    'monolithic',
    'nuance',
    'ontology',
    'phenomenology',
    'quantification',
    'resilience',
    'synergy',
    'taxonomy',
    'unsubstantiated',
    'validity',
    'warrant',
    'xenophobia',
    'youth',
    'zoology',
  ];
  const words: string[] = [];

  for (let i = 0; i < numWords; i++) {
    // Pick a random word from the wordList
    const randomIndex = Math.floor(Math.random() * wordList.length);
    words.push(wordList[randomIndex]);
  }

  return words.join(delimiter);
}

export const removeFlag = async () => {
  let incidentId = await waitForSelector('meta[property="og:url"]', 1000).then(
    (item) => item.getAttribute('content')?.split('/incident/')[1].split('/')[0],
  );
  console.log(incidentId);
};
