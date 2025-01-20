import { useState, useEffect } from 'react';
import './Popup.css';
import { truncateUrl } from '../contentScript/App';

function replaceLast(x: string, y: string, z: string) {
  var a = x.split('');
  var length = y.length;
  if (x.lastIndexOf(y) !== -1) {
    for (var i = x.lastIndexOf(y); i < x.lastIndexOf(y) + length; i++) {
      if (i === x.lastIndexOf(y)) {
        a[i] = z;
      } else {
        delete a[i];
      }
    }
  }
  return a.join('');
}

export const Popup = () => {
  const [url, setUrl] = useState('');
  const [courseList, setCourseList] = useState<any>([]);
  const [currentCourse, setCurrentCourse] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  useEffect(() => {
    (async () => {
      let courseList = await fetch('https://ecec123ecec.github.io/coursera-db/courseMap.json').then(
        (res) => res.json(),
      );
      const { course } = await chrome.storage.local.get('course');
      setCurrentCourse(course);
      setCourseList(courseList);
    })();
  }, []);

  useEffect(() => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'UPDATE_GRADING_STATUS') {
        setIsGrading(message.isGrading);
      }
    });
    getLink();
  }, []);

  const getLink = async () => {
    setIsLoading(true);
    const html = await fetchHtmlSource();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');

    const text = (doc.querySelector('body > script:nth-child(3)') as any)?.innerText;
    const matchId1 = text.match(/(\d+~[A-Za-z0-9-_]+)/);
    const userId = matchId1?.[1].split('~')[0];
    const metadata = JSON.parse(
      doc.querySelector('.m-a-0.body > a')?.getAttribute('data-click-value') ?? '',
    );
    // console.log(metadata);
    let lureId = `${userId}~${metadata.course_id}~${metadata.item_id}`;

    try {
      const data = await fetch(
        `https://www.coursera.org/api/onDemandPeerAssignmentPermissions.v1/${lureId}/?fields=deleteSubmission%2ClistSubmissions%2CreviewPeers%2CviewReviewSchema%2CanonymousPeerReview%2ConDemandPeerSubmissionProgresses.v1(latestSubmissionSummary%2ClatestDraftSummary%2ClatestAttemptSummary)%2ConDemandPeerReceivedReviewProgresses.v1(evaluationIfReady%2CearliestCompletionTime%2CreviewCount%2CdefaultReceivedReviewRequiredCount)%2ConDemandPeerDisplayablePhaseSchedules.v1(currentPhase%2CphaseEnds%2CphaseStarts)&includes=receivedReviewsProgress%2CsubmissionProgress%2CphaseSchedule`,
      ).then((res) => res.json());
      const id =
        data.linked?.['onDemandPeerSubmissionProgresses.v1'][0]?.latestSubmissionSummary?.computed
          .id;

      let url = `https:/www.coursera.org/learn/${metadata.open_course_slug}/peer/${metadata.item_id}/course-project/review/${id}`;
      setUrl(url);
      setIsLoading(false);
    } catch (error) {
      setUrl("You haven't done your assignment yet");
    }
  };

  const handleCopy = () => {
    setIsCopied(true);
    navigator.clipboard.writeText(url);
  };

  const fetchHtmlSource = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        alert('No active tab found');
        return;
      }

      const [{ result: html }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.documentElement.outerHTML,
      });
      return html;
    } catch (error) {
      console.error('Error reading HTML:', error);
      alert('Failed to fetch HTML. Check console for details.');
    }
  };

  async function handleGrade() {
    setIsGrading(true);
    setTimeout(() => {
      setIsGrading(false);
    }, 2000);
    await chrome.tabs.query(
      {
        active: true,
        windowType: 'normal',
        currentWindow: true,
      },
      function (tabs) {
        chrome.scripting.executeScript({
          target: {
            tabId: tabs[0].id ?? 0,
          },
          func: function () {
            chrome.storage.sync.get([], async () => {
              try {
                (
                  document.querySelector('button[data-js="open-course-link"]') as HTMLInputElement
                ).click();
              } catch (error) {
                console.log(error);
              }
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
            });
          },
        });
      },
    );
  }

  return (
    <main className="w-full h-[160px] bg-white gap-4 py-4 px-8">
      <div className="text-base font-bold mb-2">Get Link:</div>

      <div className="w-full max-w-sm">
        <div className="flex items-center">
          <span className="flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center text-gray-900 bg-gray-100 border border-gray-300 rounded-s-lg dark:bg-gray-600 dark:text-white dark:border-gray-600">
            URL
          </span>
          <div className="relative w-full">
            <input
              id="website-url"
              type="text"
              aria-describedby="helper-text-explanation"
              className="bg-gray-50 border border-e-0 border-gray-300 text-gray-500 dark:text-gray-400 text-sm border-s-0 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:focus:ring-blue-500 dark:focus:border-blue-500"
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
        <div className="my-4 flex gap-3 items-center">
          <div className="font-bold text-base mb-1">Autograde:</div>
          <button
            id="submit-btn"
            onClick={handleGrade}
            className="flex-shrink-0 inline-flex items-center py-1 px-4 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-0 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 border border-blue-700 dark:border-blue-600 hover:border-blue-800 dark:hover:border-blue-700 gap-2"
          >
            {isGrading ? <LoadingIcon /> : ''}
            Start
          </button>
        </div>
        <select
          className="outline py-1 px-3 border-4 border-transparent rounded-lg"
          onChange={(e) => {
            chrome.storage.local.set({ course: e.target.value });
          }}
        >
          {Object.entries(courseList).map(([key, value]) => (
            <option key={key} value={key} selected={key == currentCourse}>
              {key}
            </option>
          ))}
        </select>
        <div className="pb-4"></div>
      </div>
    </main>
  );
};

const LoadingIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-rotate-cw rotate"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
};

export default Popup;
