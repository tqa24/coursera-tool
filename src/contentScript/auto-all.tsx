import toast from 'react-hot-toast';
import { waitForSelector } from './helpers';
import { Method } from './type';

export const autoJoinAll = async () => {
  if (location.href.includes('coursera.org/programs/')) {
    const { course } = await chrome.storage.local.get('course');
    const courseMap = await fetch('https://pear104.github.io/fuquiz-db/courseMap.json').then(
      (res) => res.json(),
    );
    const program = await waitForSelector(
      'a[data-click-key="program_home_v3.home_page.click.logo"]',
      4000,
    ).then((item) => item.getAttribute('data-track-href'));
    courseMap[course]?.related.forEach(async (item: string) => {
      const url = `https://www.coursera.org${program}/learn${item}`;
      chrome.runtime.sendMessage({ action: 'openTab', url });
    });
  }
};

export const getSpecializationMaterials = async () => {
  const { course } = await chrome.storage.local.get('course');
  const courseMap = await fetch('https://pear104.github.io/fuquiz-db/courseMap.json').then((res) =>
    res.json(),
  );
  const materialData: any[] = [];

  for (const item of courseMap[course]?.related || []) {
    const slug = item.replaceAll('/', '');
    const data = await fetch(
      `https://www.coursera.org/api/onDemandCourseMaterials.v2/?q=slug&slug=${slug}&includes=modules%2Clessons%2CpassableItemGroups%2CpassableItemGroupChoices%2CpassableLessonElements%2Citems%2Ctracks%2CgradePolicy%2CgradingParameters%2CembeddedContentMapping&fields=moduleIds%2ConDemandCourseMaterialModules.v1(name%2Cslug%2Cdescription%2CtimeCommitment%2ClessonIds%2Coptional%2ClearningObjectives)%2ConDemandCourseMaterialLessons.v1(name%2Cslug%2CtimeCommitment%2CelementIds%2Coptional%2CtrackId)%2ConDemandCourseMaterialPassableItemGroups.v1(requiredPassedCount%2CpassableItemGroupChoiceIds%2CtrackId)%2ConDemandCourseMaterialPassableItemGroupChoices.v1(name%2Cdescription%2CitemIds)%2ConDemandCourseMaterialPassableLessonElements.v1(gradingWeight%2CisRequiredForPassing)%2ConDemandCourseMaterialItems.v2(name%2CoriginalName%2Cslug%2CtimeCommitment%2CcontentSummary%2CisLocked%2ClockableByItem%2CitemLockedReasonCode%2CtrackId%2ClockedStatus%2CitemLockSummary)%2ConDemandCourseMaterialTracks.v1(passablesCount)%2ConDemandGradingParameters.v1(gradedAssignmentGroups)%2CcontentAtomRelations.v1(embeddedContentSourceCourseId%2CsubContainerId)&showLockedItems=true`,
    ).then((res) => res.json());

    const items =
      data?.linked?.['onDemandCourseMaterialItems.v2'].map((item: any) => ({
        ...item,
        moocSlug: slug,
        courseId: data?.linked?.['onDemandCourseMaterialGradePolicy.v1']?.[0]?.id,
      })) || [];
    materialData.push(...items);
  }

  return materialData;
};

export const resolveMaterial = async (data: any[]) => {
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
            `https://www.coursera.org/api/opencourse.v1/user/${userId}/course/${item.moocSlug}/item/${item.id}/lecture/videoEvents/ended?autoEnroll=false`,
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
                courseId: item.courseId,
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
                courseId: item.courseId,
                itemId: item.id,
                learnerId: Number(userId),
              }),
            },
          ).then((res) => res.json());
        } else if (item.contentSummary.typeName == 'ungradedWidget') {
          const sessionId = await fetch(
            `https://www.coursera.org/api/onDemandSessionMemberships.v1?courseId=${item.courseId}&userId=${userId}&q=activeByUserAndCourse&fields=id,createdAt,sessionId,userId`,
          )
            .then((res) => res.json())
            .then((res) => res?.elements?.[0]?.sessionId);

          const result = await fetch(
            `https://www.coursera.org/api/onDemandWidgetProgress.v1/${userId}~${item.courseId}~${item.id}`,
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

export const resolveDiscussion = async (data: any[]) => {
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
      `https://www.coursera.org/api/onDemandDiscussionPrompts.v1/${userId}~${item.courseId}~${item.id}?fields=onDemandDiscussionPromptQuestions.v1(content,creatorId,createdAt,forumId,sessionId,lastAnsweredBy,lastAnsweredAt,totalAnswerCount,topLevelAnswerCount,viewCount),promptType,question&includes=question`,
      { method: 'GET' },
    ).then((res) => res.json());
    const discussionId =
      result?.elements?.[0]?.promptType?.definition?.courseItemForumQuestionId.split('~')[2];

    await toast.promise(
      async () => {
        const answer = await getGeminiResponse(
          'Give me a short answer about the topic: ' + item.name,
        );
        await fetch(
          `https://www.coursera.org/api/onDemandCourseForumAnswers.v1/?fields=content%2CforumQuestionId%2CparentForumAnswerId%2Cstate%2CcreatorId%2CcreatedAt%2Corder%2CupvoteCount%2CchildAnswerCount%2CisFlagged%2CisUpvoted%2CcourseItemForumQuestionId%2CparentCourseItemForumAnswerId%2ConDemandSocialProfiles.v1(userId%2CexternalUserId%2CfullName%2CphotoUrl%2CcourseRole)%2ConDemandCourseForumAnswers.v1(content%2CforumQuestionId%2CparentForumAnswerId%2Cstate%2CcreatorId%2CcreatedAt%2Corder%2CupvoteCount%2CchildAnswerCount%2CisFlagged%2CisUpvoted%2CcourseItemForumQuestionId%2CparentCourseItemForumAnswerId)&includes=profiles%2Cchildren%2CuserId`,
          {
            method: 'POST',
            headers: { 'x-csrf3-token': csrf3Token },
            body: JSON.stringify({
              content: {
                typeName: 'cml',
                definition: {
                  dtdId: 'discussion/1',
                  value: `<co-content><text> ${answer}...</text></co-content>`,
                },
              },
              courseForumQuestionId: `${item.courseId}~${discussionId}`,
            }),
          },
        );

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

export const getGeminiResponse = async (question: string) => {
  const { geminiAPI } = await chrome.storage.local.get('geminiAPI');
  if (!geminiAPI) {
    alert(
      'Gemini API key not found, see the tutorial video to get one: https://www.youtube.com/watch?v=OVnnVnLZPEo and put it in the extension settings',
    );
    return;
  }
  const body = {
    contents: [{ parts: [{ text: question }] }],
  };

  try {
    // Make API request
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiAPI}`,
      {
        body: JSON.stringify(body),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    // console.log('response', response);
    if (!response.ok) {
      if (response.status == 503) {
        const data = await response.json();
        alert(data?.error?.message);
      } else {
        alert(
          'Wrong Gemini API key, see the tutorial video to get one: https://www.youtube.com/watch?v=OVnnVnLZPEo and put it in the extension settings',
        );
      }
      return;
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error('Error processing with Gemini:', error);
  }
};

export const openAllQuiz = async (data: any[]) => {
  for (let item of data) {
    if (
      item.contentSummary.typeName == 'staffGraded' ||
      item.contentSummary.typeName == 'ungradedAssignment'
    ) {
      // open a new tab with the quiz url
      const url = `https://www.coursera.org/learn/${item.moocSlug}/assignment-submission/${item.id}/${item.slug}`;
      location.href = url;
      // chrome.runtime.sendMessage({ action: 'openTab', url });
    }
  }
};
