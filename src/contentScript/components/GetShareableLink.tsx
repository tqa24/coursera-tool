import React, { useEffect, useState } from 'react';
import { LoadingIcon } from './Icon';
import { getMaterial, getMetadata } from '../index';

export default function GetShareableLink() {
  const [url, setUrl] = React.useState("Your submission's url here");
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (location.href.includes('/give-feedback')) {
      getLink();
    }
  }, []);

  const handleCopy = () => {
    setIsCopied(true);
    navigator.clipboard.writeText(url);
    setTimeout(() => {
      setIsCopied(false);
    }, 1000);
  };

  const getLink = async () => {
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
      )
      .catch((error) => {
        setUrl("You haven't done your assignment yet");
        return '';
      });
    if (!submissionId) {
      setUrl("You haven't done your assignment yet");
      return;
    }

    let url = `coursera.org/learn/${metadata.open_course_slug}/peer/${metadata.item_id}/course-project/review/${submissionId}`;
    setUrl(url);
  };

  return (
    <div className="flex items-center mt-3 text-sm">
      <span
        className="flex-shrink-0 z-10 inline-flex items-center py-2 px-3 font-medium text-center text-white border border-blue-500 rounded-s-lg hover:bg-blue-700 hover:border-blue-700 bg-blue-600 cursor-pointer"
        onClick={async () => {
          setIsLoading(true);
          await getLink();
          setIsLoading(false);
        }}
      >
        Get URL
      </span>
      <div className="relative w-full">
        <input
          id="website-url"
          type="text"
          aria-describedby="helper-text-explanation"
          className="bg-gray-50 border border-e-0 !text-black border-zinc-500 border-s-0 focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
          value={url}
          readOnly
          disabled
        />
      </div>
      <button
        data-tooltip-target="tooltip-website-url"
        data-copy-to-clipboard-target="website-url"
        className="flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center text-white bg-blue-700 rounded-e-lg hover:bg-blue-800 focus:ring-0 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 border border-blue-700 dark:border-blue-600 hover:border-blue-800 dark:hover:border-blue-700"
        type="button"
        onClick={handleCopy}
      >
        {!isCopied ? (
          isLoading ? (
            <LoadingIcon />
          ) : (
            <span id="default-icon">
              <svg
                className="w-4 h-4"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 18 20"
              >
                <path d="M16 1h-3.278A1.992 1.992 0 0 0 11 0H7a1.993 1.993 0 0 0-1.722 1H2a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2Zm-3 14H5a1 1 0 0 1 0-2h8a1 1 0 0 1 0 2Zm0-4H5a1 1 0 0 1 0-2h8a1 1 0 1 1 0 2Zm0-5H5a1 1 0 0 1 0-2h2V2h4v2h2a1 1 0 1 1 0 2Z" />
              </svg>
            </span>
          )
        ) : (
          <span id="success-icon" className="items-center">
            <svg
              className="w-4 h-4"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 16 12"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M1 5.917 5.724 10.5 15 1.5"
              />
            </svg>
          </span>
        )}
      </button>
      <br />
    </div>
  );
}
