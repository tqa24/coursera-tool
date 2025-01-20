const discussionPrompt = () => {
  // else if (item.href.includes('/discussionPrompt/')) {
  //     if (!item.completed) {
  //       const result = await fetch(
  //         `https://www.coursera.org/api/onDemandDiscussionPrompts.v1/${userId}~${item.course_id}~${item.itemId}?fields=onDemandDiscussionPromptQuestions.v1(content,creatorId,createdAt,forumId,sessionId,lastAnsweredBy,lastAnsweredAt,totalAnswerCount,topLevelAnswerCount,viewCount),promptType,question&includes=question`,
  //         {
  //           method: 'GET',
  //         },
  //       ).then((res) => res.json());
  //       const discussionId =
  //         result?.elements?.[0]?.promptType?.definition?.courseItemForumQuestionId.split('~')[2];
  //       console.log(csrf3Token);
  //       const result1 = await fetch(
  //         `https://www.coursera.org/api/onDemandCourseForumAnswers.v1/?fields=content%2CforumQuestionId%2CparentForumAnswerId%2Cstate%2CcreatorId%2CcreatedAt%2Corder%2CupvoteCount%2CchildAnswerCount%2CisFlagged%2CisUpvoted%2CcourseItemForumQuestionId%2CparentCourseItemForumAnswerId%2ConDemandSocialProfiles.v1(userId%2CexternalUserId%2CfullName%2CphotoUrl%2CcourseRole)%2ConDemandCourseForumAnswers.v1(content%2CforumQuestionId%2CparentForumAnswerId%2Cstate%2CcreatorId%2CcreatedAt%2Corder%2CupvoteCount%2CchildAnswerCount%2CisFlagged%2CisUpvoted%2CcourseItemForumQuestionId%2CparentCourseItemForumAnswerId)&includes=profiles%2Cchildren%2CuserId`,
  //         {
  //           method: 'POST',
  //           headers: {
  //             'x-csrf3-token': csrf3Token,
  //           },
  //           body: JSON.stringify({
  //             content: {
  //               typeName: 'cml',
  //               definition: {
  //                 dtdId: 'discussion/1',
  //                 value:
  //                   '<co-content><text>Since demand remains high and unconstrained, the hotel should consider yielding up the rates to maximize revenue from the strong demand.</text></co-content>',
  //               },
  //             },
  //             courseForumQuestionId: `${item.course_id}~${discussionId}`,
  //           }),
  //         },
  //       ).then((res) => res.json());
  //       console.log(result1);
  //     }
  //   }
};
