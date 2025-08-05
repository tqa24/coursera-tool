import { Course, Method } from './type';
import { waitForSelector, generateRandomString } from './helpers';
import { appendNotSupported } from './dom-utils';
import { doWithGemini, doWithDeepSeek, doWithSource, doWithChatGPT } from './api-services';
import toast from 'react-hot-toast';

/**
 * Gets course material from the current page
 */
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

/**
 * Gets all materials for a course
 */
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

/**
 * Resolves materials for a week
 */
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

  toast.promise(
    async () => {
      data.forEach(async (item: any) => {
        if (item.contentSummary.typeName == 'lecture') {
          const result = await fetch(
            `https://www.coursera.org/api/opencourse.v1/user/${userId}/course/${slug}/item/${item.id}/lecture/videoEvents/ended?autoEnroll=false`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contentRequestBody: {} }),
            },
          ).then((res) => res.json());
        } else if (item.contentSummary.typeName == 'supplement') {
          const result = await fetch(
            `https://www.coursera.org/api/onDemandSupplementCompletions.v1`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                courseId: courseId,
                itemId: item.id,
                userId: Number(userId),
              }),
            },
          ).then((res) => res.json());
        } else if (item.contentSummary.typeName == 'ungradedLti') {
          const result = await fetch(
            `https://www.coursera.org/api/onDemandLtiUngradedLaunches.v1/?fields=endpointUrl%2CauthRequestUrl%2CsignedProperties`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                courseId: courseId,
                itemId: item.id,
                learnerId: Number(userId),
              }),
            },
          ).then((res) => res.json());
        } else if (item.contentSummary.typeName == 'ungradedWidget') {
          const sessionId = await fetch(
            `https://www.coursera.org/api/onDemandSessionMemberships.v1?courseId=${courseId}&userId=${userId}&q=activeByUserAndCourse&fields=id,createdAt,sessionId,userId`,
          )
            .then((res) => res.json())
            .then((res) => res?.elements?.[0]?.sessionId);

          const result = await fetch(
            `https://www.coursera.org/api/onDemandWidgetProgress.v1/${userId}~${courseId}~${item.id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                progressState: 'Completed',
                sessionId,
              }),
            },
          ).then((res) => res.json());
        }
      });
    },
    {
      loading: `Skipping Videos & Readings`,
      success: `Skip Videos & Readings Completed!`,
      error: `Skipping failed!`,
    },
  );
};

/**
 * Automatically handles quizzes
 */
export const handleAutoquiz = async (course: string, setIsLoading: any) => {
  setIsLoading((prev: any) => ({ ...prev, isLoadingQuiz: true }));
  const { isAutoSubmitQuiz } = await chrome.storage.local.get('isAutoSubmitQuiz');
  let autoSubmit = isAutoSubmitQuiz == undefined ? true : isAutoSubmitQuiz;
  if (
    autoSubmit &&
    (location.href.includes('/assignment-submission') ||
      location.href.includes('/exam') ||
      location.href.includes('/quiz'))
  ) {
    await toast.promise(
      async () => {
        // if (!location.href.includes('/learn/')) {
        //   alert('This is not a course page, please go to your course page first');
        //   return;
        // }

        await checkQuizPage(); // Redirect to a quiz page if not already on one

        // Get user settings and course data
        const { isAutoSubmitQuiz } = await chrome.storage.local.get('isAutoSubmitQuiz');
        let { method: method1 } = await chrome.storage.local.get('method');
        let method = method1 ?? Method.Source;

        // Fetch course data
        let courses: Course;
        courses = await fetch(`https://pear104.github.io/fuquiz-db/${course}.json`, {
          cache: 'no-store',
        })
          .then((res) => res.json())
          .catch((err) => {
            console.log('Error fetching course data:', err);
            return { quizSrc: [] };
          });

        // Start the quiz attempt if needed
        if (!location.href.includes('/attempt')) {
          await waitForSelector("button[data-testid='CoverPageActionButton']", 3600000)
            .then((item) => {
              item.click();
            })
            .catch((error) => console.log(error));
          await waitForSelector(
            "button[data-testid='StartAttemptModal__primary-button'], [data-testid='action-button']",
          )
            .then((item) => item.click())
            .catch((error) => console.log(error));
        }

        // Wait for questions to load
        await waitForSelector('.css-1hhf6i, .rc-FormPartsQuestion', 20000);
        let questions = document.querySelectorAll('.css-1hhf6i, .rc-FormPartsQuestion');
        const progressBar = document.querySelector('.css-mocfly');
        if (progressBar) {
          const progressCountText = document
            .querySelector('.css-ox29tz')
            ?.textContent?.replace('Question ', '');
          const [currentText, progressLength] = progressCountText?.split(' of ') ?? [0, 0];
          let current = parseInt(currentText + '');

          do {
            questions = document.querySelectorAll('.css-1hhf6i, .rc-FormPartsQuestion');
            await doWithGemini(questions, method);
            await doWithSource(questions, courses, method);
            const button: HTMLElement = document.querySelector(
              '.css-17bdvh .cds-105.cds-button-disableElevation.css-1drt86s',
            )!;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            button?.click();
            current = parseInt(
              document
                .querySelector('.css-ox29tz')
                ?.textContent?.replace('Question ', '')
                .split(' of ')[0] + '',
            );
            console.log('current', current);
            await waitForSelector(
              '.cds-105.cds-button-disableElevation.cds-button-primary.css-rii46o',
              1000,
            )
              .then(async (button) => {
                button.click();
                await waitForSelector("button[data-testid='dialog-submit-button']", 4000)
                  .then((agreeButton) => agreeButton.click())
                  .catch((error) => console.log(error));
              })
              .catch((error) => console.log(error));
          } while (current < parseInt(progressLength + ''));
        } else {
          await doWithGemini(questions, method);
          await doWithSource(questions, courses, method);
        }

        // Process questions using available methods based on the selected method
        // await doWithChatGPT(questions, method);
        // await doWithDeepSeek(questions, method);

        // Check agreement checkbox
        await new Promise((resolve) => setTimeout(resolve, 6000));
        waitForSelector('input#agreement-checkbox-base')
          .then((element: HTMLInputElement) => {
            element.scrollIntoView();
            element.click();
          })
          .catch((error) => console.log('Error checking agreement checkbox:', error));

        // Auto-submit if enabled
        let autoSubmit = isAutoSubmitQuiz ?? true;
        if (autoSubmit) {
          if (progressBar) {
          } else {
            waitForSelector(
              'button[data-testid="submit-button"], button[data-test="submit-button"]',
            )
              .then((element: HTMLInputElement) => {
                element.click();
                element.scrollIntoView();
              })
              .catch((error) => console.log('Error submitting quiz:', error));
            waitForSelector('button[data-testid="dialog-submit-button"]', 10000)
              .then(async (element: HTMLInputElement) => {
                element.click();
                // await new Promise((resolve) => setTimeout(resolve, 8000));
                // chrome.runtime.sendMessage({ action: 'closeCurrentTab' });
              })
              .catch((error) => console.log('Error confirming submission:', error));
          }
          // close the tab after the quiz is done
          // chrome.tabs.remove(tabId);
        }
      },
      {
        loading: `Processing quiz...`,
        success: `Quiz completed!`,
        error: `Failed to process quiz`,
      },
    );
  }
  setIsLoading((prev: any) => ({ ...prev, isLoadingQuiz: false }));
};

/**
 * Handles peer-graded assignments
 */
export const handlePeerGradedAssignment = async () => {
  if (!location.href.includes('/learn/')) {
    alert('This is not a course page, please go to your course page first');
    return;
  }

  // Navigate to peer assignment page if needed
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

  // Process peer assignment
  await waitForSelector('div[role="tablist"] button:nth-child(2)')
    .then((item) => item.click())
    .catch((error) => {});

  let tempAns = generateRandomString(10);

  try {
    // Fill in project title
    await waitForSelector('#main input[aria-label="Project Title"]', 20000)
      .then(async (item) => {
        (item as HTMLInputElement).click();
        (item as HTMLInputElement).value = tempAns;
        const event = new Event('change', { bubbles: true });
        item!.dispatchEvent(event);
      })
      .catch((error) => {});

    // Fill in all text inputs
    let textInputs = document.querySelectorAll(
      '#main input[type="text"]:not([aria-label="URL"]), textarea:not([aria-label="URL"])',
    );
    textInputs.forEach((input) => {
      (input as HTMLInputElement).value = tempAns;
      const event = new Event('change', { bubbles: true });
      input!.dispatchEvent(event);
    });
  } catch (error) {
    console.log(error);
  }

  // Handle file uploads
  document.querySelectorAll('.rc-UppyFileUploader button').forEach(async (item) => {
    await (item as HTMLElement).click();
    const content = generateRandomString(2000);
    const file = new File([content], `${generateRandomString(4, '-')}.md`, {
      type: 'text/plain',
    });

    const fileInput = document.querySelector('.uppy-Dashboard-input[type="file"]');

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

  // Handle unsupported elements
  appendNotSupported();

  // Submit the assignment
  await new Promise((resolve) => setTimeout(resolve, 4000));
  await waitForSelector('#agreement-checkbox-base', 10000)
    .then((element: HTMLInputElement) => element.click())
    .catch((error) => {});

  console.log('click submit');

  await waitForSelector('button[aria-label="Submit"]', 10000)
    .then((element: HTMLInputElement) => element.click())
    .catch((error) => console.log(error));
  await waitForSelector('button[data-testid="dialog-submit-button"]', 10000)
    .then((element: HTMLInputElement) => element.click())
    .catch((error) => {});
};

/**
 * Handles peer reviews
 */
export const handleReview = async () => {
  if (!location.href.includes('/learn/')) {
    alert('This is not a course page, please go to your course page first');
    return;
  }

  waitForSelector('button[data-js="open-course-link"]', 1000)
    .then((element: HTMLInputElement) => element.click())
    .catch((error) => {});
  await new Promise((resolve) => setTimeout(resolve, 1000));
  waitForSelector('button[data-js="open-course-link"]', 1000)
    .then((element: HTMLInputElement) => element.click())
    .catch((error) => {});
  waitForSelector('.css-2imjyh .css-7jkbgo a', 1000)
    .then((element: HTMLInputElement) => {
      console.log('element', element);
      element.click();
    })
    .catch((error) => {});

  let countTxt = '';
  if (location.href.includes('/review/')) {
    let currentLink = location.href;
    let count = 0;
    do {
      await review();
      if (location.href !== currentLink) {
        count++;
        currentLink = location.href;
      }
      console.log('count', count);
    } while (count < 5);
  }

  do {
    countTxt = await waitForSelector('td[data-testid="review-count"]', 1000)
      .then((item) => item.innerText)
      .catch((error) => {});
    await review();
  } while (countTxt?.includes('left to complete'));
  await requestGradingByPeer();
};

/**
 * Processes a single review
 */
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

/**
 * Handles discussion prompts
 */
export const handleDiscussionPrompt = async () => {
  if (!location.href.includes('/learn/')) {
    alert('This is not a course page, please go to your course page first');
    return;
  }

  await resolveWeekMaterial();
  const { data, courseId } = await getAllMaterials();
  console.log(courseId);
  console.log(data);

  const matchId1 = (document.querySelector('body > script:nth-child(3)') as any)?.innerText.match(
    /(\d+~[A-Za-z0-9-_]+)/,
  );
  const { csrf3Token } = await chrome.storage.sync.get(['csrf3Token']);
  console.log('csrfToken', csrf3Token);

  const userId = matchId1?.[1].split('~')[0];

  let discussion = data?.filter((item: any) =>
    item?.contentSummary?.typeName.includes('discussionPrompt'),
  );
  let progress = 0;

  if (discussion.length > 0) {
    toast.loading(
      <div>
        <div>
          Handling discussions slowly to prevent{' '}
          <a
            target="_blank"
            className="text-blue-600"
            href="https://www.coursera.support/s/question/0D51U00003BlYiuSAF/you-are-temporarily-blocked-as-you-have-made-too-many-requests-please-try-again-later?language=en_US"
          >
            Coursera's rate limit policy
          </a>
          .
        </div>
        <div>
          Progress: <span id="progress">{progress}</span>/{discussion.length}
        </div>
      </div>,
      {
        style: { border: '1px solid #0356fc' },
        position: 'top-right',
      },
    );
  }

  for (let item of discussion) {
    const result = await fetch(
      `https://www.coursera.org/api/onDemandDiscussionPrompts.v1/${userId}~${courseId}~${item.id}?fields=onDemandDiscussionPromptQuestions.v1(content,creatorId,createdAt,forumId,sessionId,lastAnsweredBy,lastAnsweredAt,totalAnswerCount,topLevelAnswerCount,viewCount),promptType,question&includes=question`,
      { method: 'GET' },
    ).then((res) => res.json());
    const discussionId =
      result?.elements?.[0]?.promptType?.definition?.courseItemForumQuestionId.split('~')[2];

    await toast.promise(
      async () => {
        const result1 = await fetch(
          `https://www.coursera.org/api/onDemandCourseForumAnswers.v1/?fields=content%2CforumQuestionId%2CparentForumAnswerId%2Cstate%2CcreatorId%2CcreatedAt%2Corder%2CupvoteCount%2CchildAnswerCount%2CisFlagged%2CisUpvoted%2CcourseItemForumQuestionId%2CparentCourseItemForumAnswerId%2ConDemandSocialProfiles.v1(userId%2CexternalUserId%2CfullName%2CphotoUrl%2CcourseRole)%2ConDemandCourseForumAnswers.v1(content%2CforumQuestionId%2CparentForumAnswerId%2Cstate%2CcreatorId%2CcreatedAt%2Corder%2CupvoteCount%2CchildAnswerCount%2CisFlagged%2CisUpvoted%2CcourseItemForumQuestionId%2CparentCourseItemForumAnswerId)&includes=profiles%2Cchildren%2CuserId`,
          {
            method: 'POST',
            headers: { 'x-csrf3-token': csrf3Token },
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

        // Update progress counter
        progress++;

        // Update the toast message with new progress
        document.getElementById('progress')!.innerHTML = progress + '';

        if (discussion.length >= 3) {
          await new Promise((resolve) => setTimeout(resolve, 30000));
        }
      },
      {
        loading: `Doing disccussion: ${item.name}`,
        success: `Done ${item.name}!`,
        error: `Discuss failed!`,
      },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));
};

/**
 * Gets metadata from the current page
 */
export const getMetadata = () => {
  const metadata = JSON.parse(
    document
      .querySelector('[data-testid="page-header-wrapper"] a[data-track-app="open_course_home"]')
      ?.getAttribute('data-click-value') ?? '',
  );

  return metadata;
};

/**
 * Requests grading by a peer instead of AI
 */
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

  await fetch('https://www.coursera.org/graphql-gateway?opname=RequestGradingByPeer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
      if (res.status === 200) location.reload();
    })
    .catch((error) => console.log(error));
};

export const checkQuizPage = async () => {
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
        location.href = item.href;
      }
    });
    if (!flag) {
      return;
    }
  }
};

export const autoJoin = async () => {
  if (location.href.includes('coursera.org/programs/') && location.href.includes('/learn/')) {
    waitForSelector('button[data-e2e="EnrollButton"]', 10000)
      .then((element: HTMLInputElement) => element.click())
      .catch((error) => {});
  }
};
