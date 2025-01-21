import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  handleAutoquiz,
  handleReview,
  handlePeerGradedAssignment,
  resolveWeekMaterial,
  handleDiscussionPrompt,
  getMaterial,
} from './utils';
import { Button } from './components/Button';
import Checkbox from './components/Checkbox';
import { SettingOptions } from './type';
import Feedback from './components/Feedback';
import { ChevronRightIcon } from './components/Icon';

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
  const [courseList, setCourseList] = useState<any>([]);
  const [currentCourse, setCurrentCourse] = useState('');
  const [isHidden, setIsHidden] = useState(true);
  const [options, setOptions] = useState<SettingOptions>({
    isAutoSubmitQuiz: false,
    isAutoGrade: false,
  });
  const [assignmentList, setAssignmentList] = useState<any>([]);
  const [isLoading, setIsLoading] = useState<any>({
    isLoadingReview: false,
    isLoadingQuiz: false,
    isLoadingSubmitPeerGrading: false,
    isLoadingDiscuss: false,
    isLoadingCompleteWeek: false,
  });

  useEffect(() => {
    (async () => {
      let courseList = await fetch('https://ecec123ecec.github.io/coursera-db/courseMap.json').then(
        (res) => res.json(),
      );
      const { course } = await chrome.storage.local.get('course');
      const { isAutoSubmitQuiz } = await chrome.storage.local.get('isAutoSubmitQuiz');
      // console.log(isAutoSubmitQuiz);

      setCurrentCourse(course);
      setCourseList(courseList);
      setOptions({ isAutoSubmitQuiz: isAutoSubmitQuiz, isAutoGrade: false });
      // await getMaterial();
      // await handleAutoquiz();
    })();
  }, []);

  // useEffect(() => {
  //   (async () => {
  //     await resolveWeekMaterial();
  //     if (location.href.includes('assignment-submission')) {
  //       await handleAutoquiz();
  //     } else if (location.href.includes('/peer/')) {
  //       if (location.href.includes('/give-feedback') || location.href.includes('/review-next')) {
  //         await handleReview();
  //       } else {
  //         await handlePeerGradedAssignment();
  //       }
  //     } else if (location.href.includes('/discussionPrompt/')) {
  //       await handleDiscussionPrompt();
  //       console.log('zo');
  //     }
  //   })();
  // }, []);

  return (
    <>
      <div
        className={`w-10 h-10 rounded-full fixed bottom-3 right-6 p-2 cursor-pointer bg-no-repeat bg-center bg-cover transition-all duration-300 ${!isHidden ? 'translate-y-0' : 'translate-y-[100px]'}`}
        onClick={() => setIsHidden((pre) => !pre)}
        style={{
          backgroundImage:
            'url(https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://coursera_assets.s3.amazonaws.com/images/71180874e10407031ecd7b62e27dec77.png?auto=format%2Ccompress&dpr=1&w=32&h=32)',
          zIndex: 1000,
        }}
      ></div>
      <div
        className={`bg-white absolute border border-black bottom-2 p-4 right-0 w-[400px] rounded-md transition-all ${isHidden ? '-translate-x-0' : 'translate-x-[500px]'}`}
      >
        <div
          className="absolute top-2 right-2 cursor-pointer"
          onClick={() => setIsHidden((prev) => !prev)}
        >
          <ChevronRightIcon />
        </div>

        <div className="flex gap-2">
          <Button
            title="Auto do readings skip watching videos"
            onClick={async () => {
              setIsLoading((prev: any) => ({ ...prev, isLoadingCompleteWeek: true }));
              await resolveWeekMaterial();
              setIsLoading((prev: any) => ({ ...prev, isLoadingCompleteWeek: false }));
            }}
            isLoading={isLoading.isLoadingCompleteWeek}
          >
            Auto complete week
          </Button>
          <Button
            title="Auto do discussion prompt"
            onClick={async () => {
              setIsLoading((prev: any) => ({ ...prev, isLoadingDiscuss: true }));
              await handleDiscussionPrompt();
              setIsLoading((prev: any) => ({ ...prev, isLoadingDiscuss: false }));
            }}
            isLoading={isLoading.isLoadingDiscuss}
          >
            Auto discussion
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            onClick={async () => {
              setIsLoading((prev: any) => ({ ...prev, isLoadingSubmitPeerGrading: true }));
              await handlePeerGradedAssignment();
              setIsLoading((prev: any) => ({ ...prev, isLoadingSubmitPeerGrading: false }));
            }}
            isLoading={isLoading.isLoadingSubmitPeerGrading}
          >
            Auto submit assignment
          </Button>
          <Button
            onClick={async () => {
              setIsLoading((prev: any) => ({ ...prev, isLoadingReview: true }));
              await handleReview();
              setIsLoading((prev: any) => ({ ...prev, isLoadingReview: false }));
            }}
            isLoading={isLoading.isLoadingReview}
          >
            Auto grade
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          {/* {courseList[currentCourse]?.status === 'done' && ( */}
          <Button
            onClick={async () => {
              String.prototype.normalize = function () {
                return this.replaceAll('\u00A0', '')
                  .replace(/\s+/g, ' ')
                  .replaceAll('\n', ' ')
                  .trim();
              };
              setIsLoading((prev: any) => ({ ...prev, isLoadingQuiz: true }));
              await handleAutoquiz();
              setIsLoading((prev: any) => ({ ...prev, isLoadingQuiz: false }));
            }}
            isLoading={isLoading.isLoadingQuiz}
          >
            Auto quiz
          </Button>
          {/* )} */}
        </div>
        <div className="grid grid-cols-2 mt-3">
          <Checkbox
            id={'auto-submit-quiz'}
            checked={options.isAutoSubmitQuiz}
            children={'Auto submit quiz'}
            onChange={(e: HTMLInputElement) => {
              setOptions((prev) => {
                chrome.storage.local.set({ isAutoSubmitQuiz: !prev.isAutoSubmitQuiz });
                return { ...prev, isAutoSubmitQuiz: !prev.isAutoSubmitQuiz };
              });
              // console.log(options.isAutoSubmitQuiz);
            }}
          />
          {/* <Checkbox
            id={'auto-grade'}
            checked={options.isAutoGrade}
            children={'Auto grade'}
            onChange={(e: HTMLInputElement) =>
              setOptions((prev) => ({ ...prev, isAutoGrade: !prev.isAutoGrade }))
            }
          /> */}
        </div>
        <div>
          <span className="font-semibold mr-2">Source:</span>
          <select
            className="py-1 px-3 border rounded-lg focus-visible:outline-none"
            onChange={(e) => {
              chrome.storage.local.set({ course: e.target.value });
              setCurrentCourse(e.target.value);
            }}
            value={currentCourse}
          >
            {Object.entries(courseList).map(([key, value]: any) => (
              <option key={key} value={key} disabled={value?.status === 'ongoing'}>
                {`${key}  -  (${value?.status.toUpperCase()})`}
              </option>
            ))}
          </select>
        </div>
        <Feedback />
      </div>
    </>
  );
}
