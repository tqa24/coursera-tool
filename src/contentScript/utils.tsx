import { Course, Method, QuizItem } from './type';
import source from '../keys/MSM201c.json';
import toast from 'react-hot-toast';
import { wordList } from './constants';
// The student's use of the quote is incorrect because they shouldn't have capitalized the 'i' in "Intermediaries".

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

export const normalize = (text: string) => {
  return text
    .replaceAll('\u00A0', '')
    .replace(/\s+/g, ' ')
    .replaceAll('\n', ' ')
    .replaceAll('"', '"')
    .replaceAll('"', '"')
    .replaceAll("'", "'")
    .replaceAll("'", "'")
    .replaceAll('–', '-')
    .replaceAll('—', '-')
    .replaceAll('…', '...')
    .trim()
    .toLowerCase();
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

    return {
      ...info,
      name: item.querySelector('[data-test="rc-ItemName"]')?.textContent?.trim() ?? '',
    };
  });

  return data;
};

export const getAllMaterials = async () => {
  const slug = window.location.href.split('/')[4];
  let data = await fetch(
    `https://www.coursera.org/api/onDemandCourseMaterials.v2/?q=slug&slug=${slug}&includes=modules%2Clessons%2CpassableItemGroups%2CpassableItemGroupChoices%2CpassableLessonElements%2Citems%2Ctracks%2CgradePolicy%2CgradingParameters%2CembeddedContentMapping&fields=moduleIds%2ConDemandCourseMaterialModules.v1(name%2Cslug%2Cdescription%2CtimeCommitment%2ClessonIds%2Coptional%2ClearningObjectives)%2ConDemandCourseMaterialLessons.v1(name%2Cslug%2CtimeCommitment%2CelementIds%2Coptional%2CtrackId)%2ConDemandCourseMaterialPassableItemGroups.v1(requiredPassedCount%2CpassableItemGroupChoiceIds%2CtrackId)%2ConDemandCourseMaterialPassableItemGroupChoices.v1(name%2Cdescription%2CitemIds)%2ConDemandCourseMaterialPassableLessonElements.v1(gradingWeight%2CisRequiredForPassing)%2ConDemandCourseMaterialItems.v2(name%2CoriginalName%2Cslug%2CtimeCommitment%2CcontentSummary%2CisLocked%2ClockableByItem%2CitemLockedReasonCode%2CtrackId%2ClockedStatus%2CitemLockSummary)%2ConDemandCourseMaterialTracks.v1(passablesCount)%2ConDemandGradingParameters.v1(gradedAssignmentGroups)%2CcontentAtomRelations.v1(embeddedContentSourceCourseId%2CsubContainerId)&showLockedItems=true`,
  ).then((res) => res.json());

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
  const { csrf3Token } = await chrome.storage.sync.get(['csrf3Token']);

  // for (let item of data) {
  toast.promise(
    async () => {
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
          // console.log(result);
        } else if (item.contentSummary.typeName == 'supplement') {
          const result = await fetch(
            `https://www.coursera.org/api/onDemandSupplementCompletions.v1`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                courseId: courseId,
                itemId: item.id,
                userId: Number(userId),
              }),
            },
          ).then((res) => res.json());
          // console.log(result);
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
          // console.log(result);
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
    },
    {
      loading: `Skipping Videos & Readings`,
      success: `Skip Videos & Readings Completed!`,
      error: `Skipping failed!`,
    },
  );

  //> debug
  // await new Promise((resolve) => setTimeout(resolve, 1000));
  // console.log('done');
};

export const handleAutoquiz = async (course: string, isWithGemini: boolean = false) => {
  toast.promise(
    async () => {
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
      const { isDebugMode } = await chrome.storage.local.get('isDebugMode');
      const { method } = await chrome.storage.local.get('method');
      let courses: Course;
      courses = await fetch(`https://ecec123ecec.github.io/coursera-db/${course}.json`, {
        cache: 'no-store',
      })
        .then((res) => res.json())
        .catch((err) => {
          console.log('Error fetching course data:', err);
          return { quizSrc: [] };
        });
      //> debug
      if (isDebugMode === true) {
        // courses = source;
        console.log('debugging');
        console.log(course);
      }
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

      // Process questions using available methods based on the selected method
      if (method === Method.DeepSeek || !method) {
        try {
          await doWithDeepSeek(questions, method);
        } catch (error) {
          console.log('Error processing with DeepSeek:', error);
        }
      }

      if (method === Method.Gemini || !method) {
        try {
          await doWithGemini(questions, method);
        } catch (error) {
          console.log('Error processing with Gemini:', error);
        }
      }

      if (method === Method.Source || !method) {
        try {
          await doWithSource(questions, courses, method);
        } catch (error) {
          console.log('Error processing with Source:', error);
        }
      }

      console.log('Quiz processing completed');

      await new Promise((resolve) => setTimeout(resolve, 500));
      waitForSelector('input#agreement-checkbox-base')
        .then((element: HTMLInputElement) => {
          element.scrollIntoView();
          element.click();
        })
        .catch((error) => {
          console.log('Error checking agreement checkbox:', error);
        });
      let autoSubmit = isAutoSubmitQuiz == undefined ? true : isAutoSubmitQuiz;

      if (autoSubmit) {
        waitForSelector('button[data-testid="submit-button"], button[data-test="submit-button"]')
          .then((element: HTMLInputElement) => {
            element.click();
            element.scrollIntoView();
          })
          .catch((error) => {
            console.log('Error submitting quiz:', error);
          });
        waitForSelector('button[data-testid="dialog-submit-button"]', 2000)
          .then((element: HTMLInputElement) => element.click())
          .catch((error) => {
            console.log('Error confirming submission:', error);
          });
      }
    },
    {
      loading: `Processing quiz...`,
      success: `Quiz completed!`,
      error: `Failed to process quiz`,
    },
  );
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

  appendNotSupported();
  // const editor = document.querySelector('[role="textbox"]')!;
  // const editor2 = document.querySelector('[data-slate-placeholder="true"]')!;
  // (editor as HTMLElement).focus();
  // document.execCommand('insertText', false, generateRandomString(10));

  // editor.dispatchEvent(new Event('change', { bubbles: true }));

  await new Promise((resolve) => setTimeout(resolve, 4000));
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
      const submitBtn = document
        .getElementsByClassName('rc-FormSubmit')?.[0]
        ?.querySelector('button');
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
  await resolveWeekMaterial();
  const { data, courseId } = await getAllMaterials();
  // const data = await getMaterial();
  // const { data, courseId, slug } = await getAllMaterials();
  console.log(courseId);
  console.log(data);

  const matchId1 = (document.querySelector('body > script:nth-child(3)') as any)?.innerText.match(
    /(\d+~[A-Za-z0-9-_]+)/,
  );
  const { csrf3Token } = await chrome.storage.sync.get(['csrf3Token']);
  const userId = matchId1?.[1].split('~')[0];

  // data.forEach(async (item: any) => {
  let discussion = data?.filter((item: any) =>
    item?.contentSummary?.typeName.includes('discussionPrompt'),
  );
  let progress = 1;

  if (discussion.length > 0) {
    toast.loading(
      <p>
        It will take a bit slowly for preventing blocked by{' '}
        <a
          target="_blank"
          className="text-blue-500 underline"
          href="https://www.coursera.support/s/question/0D51U00003BlYiuSAF/you-are-temporarily-blocked-as-you-have-made-too-many-requests-please-try-again-later?language=es"
        >
          Coursera's rate limit policy
        </a>{' '}
        <br />
        Handled (<span id="discussionProgress">{progress}</span>/{discussion.length}) discussions
        <progress
          id="progressBar"
          className="w-full mt-2 rounded-full"
          value={progress}
          max={discussion.length}
        ></progress>
      </p>,
      {
        style: {
          border: '1px solid #0356fc',
        },
        position: 'top-right',
      },
    );
  }

  for (let item of discussion) {
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
    await toast.promise(
      async () => {
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
        console.log(result1);
        const discussionProgress = document.querySelector('#discussionProgress');
        const progressBar = document.querySelector('#progressBar');
        if (discussionProgress) {
          discussionProgress.innerHTML = progress + '';
          progressBar!.setAttribute('value', progress + '');
        }
        progress++;

        if (discussion.length >= 3) {
          await new Promise((resolve) => setTimeout(resolve, 9000));
        }
      },
      {
        loading: `Doing disccussion: ${item.name}`,
        success: `Done ${item.name}!`,
        error: `Discuss failed!`,
      },
    );
    // console.log(result1);
  }
  //todo: fix wait to read all the response status before reloading
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // location.reload();
};

export const getMetadata = () => {
  const metadata = JSON.parse(
    document
      .querySelector('[data-testid="page-header-wrapper"] a[data-track-app="open_course_home"]')
      ?.getAttribute('data-click-value') ?? '',
  );

  return metadata;
};

export const appendNotSupported = async () => {
  const text = (document.querySelector('body > script:nth-child(3)') as any)?.innerText;
  const matchId1 = text.match(/(\d+~[A-Za-z0-9-_]+)/);
  const userId = matchId1?.[1].split('~')[0];

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

export const requestGradingByPeer = async () => {
  console.log('zo disable');

  if (!location.href.includes('/learn/')) {
    alert('This is not a course page, please go to your course page first');
    return;
  }
  const text = (document.querySelector('body > script:nth-child(3)') as any)?.innerText;
  const matchId1 = text.match(/(\d+~[A-Za-z0-9-_]+)/);
  const userId = matchId1?.[1].split('~')[0];
  const metadata = getMetadata();

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
  const words: string[] = [];
  for (let i = 0; i < numWords; i++) {
    //> Pick a random word from the wordList
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

const addBadgeToLabel = (inputElement: Element, text: string) => {
  if (inputElement) {
    const labelElement = inputElement.closest('label');
    if (labelElement) {
      // Define color mapping based on text
      const colorMap: { [key: string]: string } = {
        Source: '#007bff', // Blue
        ChatGPT: '#ffc107', // Yellow
        Gemini: '#dc3545', // Red
        DeepSeek: '#28a745', // Green
        // Add more mappings as needed
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
  String.prototype.normalize = function () {
    return this.replaceAll('\u00A0', '')
      .replace(/\s+/g, ' ')
      .replaceAll('\n', ' ')
      .replaceAll('"', '"')
      .replaceAll('"', '"')
      .replaceAll("'", "'")
      .replaceAll("'", "'")
      .replaceAll('–', '-')
      .replaceAll('—', '-')
      .replaceAll('…', '...')
      .trim();
  };

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

// Helper to collect unmatched questions
const collectUnmatchedQuestion = (question: Element, unmatched: any[]) => {
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

// Extract question data from DOM elements
const extractQuestionData = (questions: NodeListOf<Element>): any[] => {
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

// Process answers and update UI
const processAnswers = (
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
