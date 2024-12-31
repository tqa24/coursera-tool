import { useEffect, useState } from 'react';

function replaceLast(x: string, y: string, z: string) {
  var a = x.split('');
  var length = y.length;
  if (x.lastIndexOf(y) != -1) {
    for (var i = x.lastIndexOf(y); i < x.lastIndexOf(y) + length; i++) {
      if (i == x.lastIndexOf(y)) {
        a[i] = z;
      } else {
        delete a[i];
      }
    }
  }
  return a.join('');
}

export function truncateUrl(url: string, maxLength = 50) {
  if (url.length <= maxLength) return url;

  const start = url.slice(0, Math.ceil(maxLength / 2) - 0); // Start portion
  const end = url.slice(-30); // End portion
  return `${start}...${end}`;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    getLink();
  }, []);

  const getLink = async () => {
    let lureId = '';
    const text = (document.querySelector('body > script:nth-child(3)') as any)?.innerText;

    const matchId1 = text.match(/(\d+~[A-Za-z0-9-_]+)/);
    if (matchId1) {
      lureId += matchId1[0];
    } else {
      setUrl("You haven't done your assignment yet");
      return;
    }

    const matchId2 = window.location.href.match(/\/peer\/([^\/]+)/);
    if (matchId2) {
      lureId += '~' + matchId2[1];
    } else {
      setUrl("You haven't done your assignment yet");
      return;
    }

    try {
      const data = await fetch(
        `https://www.coursera.org/api/onDemandPeerAssignmentPermissions.v1/${lureId}/?fields=deleteSubmission%2ClistSubmissions%2CreviewPeers%2CviewReviewSchema%2CanonymousPeerReview%2ConDemandPeerSubmissionProgresses.v1(latestSubmissionSummary%2ClatestDraftSummary%2ClatestAttemptSummary)%2ConDemandPeerReceivedReviewProgresses.v1(evaluationIfReady%2CearliestCompletionTime%2CreviewCount%2CdefaultReceivedReviewRequiredCount)%2ConDemandPeerDisplayablePhaseSchedules.v1(currentPhase%2CphaseEnds%2CphaseStarts)&includes=receivedReviewsProgress%2CsubmissionProgress%2CphaseSchedule`,
      ).then((res) => res.json());
      const id =
        data.linked?.['onDemandPeerSubmissionProgresses.v1'][0]?.latestSubmissionSummary?.computed
          .id;
      setUrl(replaceLast(window.location.href, 'submit', '') + '/review/' + id);
    } catch (error) {
      setUrl('Go to assignment page, then refresh');
    }
  };

  const handleCopy = () => {
    setIsCopied(true);
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="w-full">
      <div className="flex items-center">
        <span className="flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center text-gray-900 bg-gray-100 border border-gray-300 rounded-s-lg dark:bg-gray-600 dark:text-white dark:border-gray-600">
          URL
        </span>
        <div className="relative w-full">
          <input
            id="website-url"
            type="text"
            aria-describedby="helper-text-explanation"
            className="border border-e-0 border-gray-300 dark:!text-gray-400 text-sm border-s-0 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 !bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
            defaultValue={url}
            readOnly
            disabled
          />
        </div>
        <button
          data-tooltip-target="tooltip-website-url"
          data-copy-to-clipboard-target="website-url"
          className="flex-shrink-0 z-10 inline-flex items-center py-3 px-4 text-sm font-medium text-center text-white bg-blue-700 rounded-e-lg hover:bg-blue-800 focus:ring-0 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 border border-blue-700 dark:border-blue-600 hover:border-blue-800 dark:hover:border-blue-700"
          type="button"
          onClick={handleCopy}
        >
          {!isCopied ? (
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
      </div>
    </div>
  );
}
