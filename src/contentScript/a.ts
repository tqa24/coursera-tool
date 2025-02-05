// export const resolveWeekMaterial = async () => {
//   if (!location.href.includes('/learn/')) {
//     alert('This is not a course page, please go to your course page first');
//     return;
//   }
//   const data = await getMaterial();

//   const matchId1 = (document.querySelector('body > script:nth-child(3)') as any)?.innerText.match(
//     /(\d+~[A-Za-z0-9-_]+)/,
//   );
//   const userId = matchId1?.[1].split('~')[0];

//   let isNotDoneAll = data.some(
//     (item) =>
//       !item.completed &&
//       !item.locked &&
//       (item.href.includes('/lecture/') || item.href.includes('/supplement/')),
//     // ||  item.href.includes('/discussionPrompt/')
//   );
//   // isNotDoneAll = true;

//   if (isNotDoneAll) {
//     const moocSlug = data?.[0]?.href?.split('/')[2];

//     data.forEach(async (item) => {
//       if (item.href.includes('/lecture/')) {
//         if (!item.completed) {
//           const result = await fetch(
//             `https://www.coursera.org/api/opencourse.v1/user/${userId}/course/${moocSlug}/item/${item.itemId}/lecture/videoEvents/ended?autoEnroll=false`,
//             {
//               method: 'POST',
//               headers: {
//                 'Content-Type': 'application/json',
//               },
//               body: JSON.stringify({ contentRequestBody: {} }),
//             },
//           ).then((res) => res.json());
//         }
//       } else if (item.href.includes('/supplement/')) {
//         if (!item.completed) {
//           const result = await fetch(
//             `https://www.coursera.org/api/onDemandSupplementCompletions.v1`,
//             {
//               method: 'POST',
//               headers: {
//                 'Content-Type': 'application/json',
//               },
//               body: JSON.stringify({
//                 courseId: item.course_id,
//                 itemId: item.itemId,
//                 userId: Number(userId),
//               }),
//             },
//           ).then((res) => res.json());
//         }
//       } else if (item.href.includes('/ungradedLti/')) {
//         if (item.completed) {
//           const result = await fetch(
//             `https://www.coursera.org/api/onDemandLtiUngradedLaunches.v1/?fields=endpointUrl%2CauthRequestUrl%2CsignedProperties`,
//             {
//               method: 'POST',
//               headers: {
//                 'Content-Type': 'application/json',
//               },
//               body: JSON.stringify({
//                 courseId: item.course_id,
//                 itemId: item.itemId,
//                 learnerId: Number(userId),
//               }),
//             },
//           ).then((res) => res.json());
//           // console.log(result);
//         }
//       } else if (item.href.includes('/ungradedWidget/')) {
//         const sessionId = await fetch(
//           `https://www.coursera.org/api/onDemandSessionMemberships.v1?courseId=${item.course_id}&userId=${userId}&q=activeByUserAndCourse&fields=id,createdAt,sessionId,userId`,
//         )
//           .then((res) => res.json())
//           .then((res) => res?.elements?.[0]?.sessionId);
//         // console.log('sesssion');
//         // console.log(sessionId);

//         const result = await fetch(
//           `https://www.coursera.org/api/onDemandWidgetProgress.v1/${userId}~${item.course_id}~${item.itemId}`,
//           {
//             method: 'PUT',
//             headers: {
//               'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//               progressState: 'Completed',
//               sessionId,
//             }),
//           },
//         ).then((res) => res.json());
//         // console.log('lti upgrade');
//         // console.log(result);
//       }
//     });
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     location.reload();
//   }
// };
