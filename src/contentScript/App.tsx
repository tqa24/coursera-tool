import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  handleAutoquiz,
  handleReview,
  handlePeerGradedAssignment,
  handleDiscussionPrompt,
  getMaterial,
  requestGradingByPeer,
  waitForSelector,
  getAllMaterials,
  resolveWeekMaterial,
} from './utils';
import { Button } from './components/Button';
import Checkbox from './components/Checkbox';
import { SettingOptions } from './type';
import Footer from './components/Footer';
import {
  ChevronRightIcon,
  Clapper,
  LoadingIcon,
  Note,
  Play,
  Quiz,
  Setting,
} from './components/Icon';
import GetShareableLink from './components/GetShareableLink';

export default function App() {
  const [courseList, setCourseList] = useState<any>([]);
  const [currentCourse, setCurrentCourse] = useState('SSL101c');
  const [isHidden, setIsHidden] = useState(true);
  const [options, setOptions] = useState<SettingOptions>({
    isAutoSubmitQuiz: true,
    isAutoGrade: false,
    isAlwaysShowControlPanel: true,
  });
  const [isVisible, setIsVisible] = useState(false);
  const [assignmentList, setAssignmentList] = useState<any>([]);
  const [isLoading, setIsLoading] = useState<any>({
    isLoadingReview: false,
    isLoadingQuiz: false,
    isLoadingSubmitPeerGrading: false,
    isLoadingDiscuss: false,
    isLoadingCompleteWeek: false,
    isLoadingDisableAI: false,
  });

  useEffect(() => {
    (async () => {
      let courseMap = await fetch('https://ecec123ecec.github.io/coursera-db/courseMap.json', {
        cache: 'no-store',
      }).then((res) => res.json());
      // console.log(courseMap);

      const { course } = await chrome.storage.local.get('course');
      let flag = false;
      let courseCode = '';
      Object.entries(courseMap).forEach(([key, value]: any) => {
        value.related.forEach((item: string) => {
          if (location.href.includes(item)) {
            chrome.storage.local.set({ course: key });
            setCurrentCourse(key);
            courseCode = key;
            flag = true;
          }
        });
      });

      const { isAutoSubmitQuiz } = await chrome.storage.local.get('isAutoSubmitQuiz');
      const { isAlwaysShowControlPanel } = await chrome.storage.local.get(
        'isAlwaysShowControlPanel',
      );
      // console.log(isAlwaysShowControlPanel);
      // console.log(isAutoSubmitQuiz);
      setCourseList(courseMap);
      setOptions({
        isAutoSubmitQuiz: isAutoSubmitQuiz,
        isAutoGrade: false,
        isAlwaysShowControlPanel:
          isAlwaysShowControlPanel == undefined ? true : isAlwaysShowControlPanel,
      });
      let autoSubmit = isAutoSubmitQuiz == undefined ? true : isAutoSubmitQuiz;
      if (
        autoSubmit &&
        (location.href.includes('/assignment-submission') ||
          location.href.includes('/exam') ||
          location.href.includes('/quiz'))
      ) {
        setIsLoading((prev: any) => ({ ...prev, isLoadingQuiz: true }));
        await handleAutoquiz(courseCode);
        setIsLoading((prev: any) => ({ ...prev, isLoadingQuiz: false }));
      }
    })();
  }, []);

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
      {/* <div className="fixed top-4 right-4 bg-blue-400 text-white font-semibold p-4 text-xl">
          <LoadingIcon />
          Doing quiz...
        </div> */}
      {
        <div
          className={`transition-all fixed top-4 right-8 bg-blue-700 dark:bg-blue-600 font-bold text-white flex justify-center items-center gap-4 text-xl px-6 py-3 rounded-lg ${
            isLoading.isLoadingQuiz ||
            isLoading.isLoadingDiscuss ||
            isLoading.isLoadingCompleteWeek ||
            isLoading.isLoadingSubmitPeerGrading ||
            isLoading.isLoadingReview
              ? '-translate-y-0'
              : '-translate-y-20'
          }`}
        >
          <LoadingIcon size={30} />
          Loading
        </div>
      }
      <div
        className={`bg-white absolute border border-black -bottom-4 p-4 w-[450px] right-0 rounded-md transition-all ${isHidden ? '-translate-x-0' : 'translate-x-[500px]'}`}
      >
        <div
          className="absolute top-2 right-2 cursor-pointer"
          onClick={() => setIsHidden((prev) => !prev)}
        >
          <ChevronRightIcon />
        </div>
        <div className="font-bold text-base mb-3 flex gap-2">
          <Clapper />
          Skipping
        </div>
        <div className="flex gap-2">
          <Button
            title="Auto skip all readings & videos"
            onClick={async () => {
              setIsLoading((prev: any) => ({ ...prev, isLoadingCompleteWeek: true }));
              await resolveWeekMaterial();
              setIsLoading((prev: any) => ({ ...prev, isLoadingCompleteWeek: false }));
            }}
            isLoading={isLoading.isLoadingCompleteWeek}
          >
            Skip videos & readings
          </Button>
          <Button
            title="Auto do all discussion prompt"
            onClick={async () => {
              setIsLoading((prev: any) => ({ ...prev, isLoadingDiscuss: true }));
              await handleDiscussionPrompt();
              setIsLoading((prev: any) => ({ ...prev, isLoadingDiscuss: false }));
            }}
            isLoading={isLoading.isLoadingDiscuss}
          >
            Skip discussions
          </Button>
        </div>

        <div className="font-bold text-base my-3 flex gap-2">
          <Note />
          Assignment
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            title="Auto submit assignments (May not work)"
            onClick={async () => {
              setIsLoading((prev: any) => ({ ...prev, isLoadingSubmitPeerGrading: true }));
              await handlePeerGradedAssignment();
              setIsLoading((prev: any) => ({ ...prev, isLoadingSubmitPeerGrading: false }));
            }}
            isLoading={isLoading.isLoadingSubmitPeerGrading}
          >
            Auto submit
          </Button>
          <Button
            title="Auto grade assignments"
            onClick={async () => {
              setIsLoading((prev: any) => ({ ...prev, isLoadingReview: true }));
              await handleReview();
              setIsLoading((prev: any) => ({ ...prev, isLoadingReview: false }));
            }}
            isLoading={isLoading.isLoadingReview}
          >
            Auto grade
          </Button>
          <Button
            title="Disable AI grading for your submission"
            onClick={async () => {
              setIsLoading((prev: any) => ({ ...prev, isLoadingDisableAI: true }));
              await requestGradingByPeer();
              setIsLoading((prev: any) => ({ ...prev, isLoadingDisableAI: false }));
            }}
            isLoading={isLoading.isLoadingDisableAI}
          >
            Disable AI grading
          </Button>
        </div>
        <GetShareableLink />
        <div className="font-bold text-base my-3 flex gap-2">
          <Quiz />
          Quiz Automation
        </div>
        <div className="flex gap-4 items-center">
          <span className="font-semibold">Source:</span>
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
          <Button
            title="Start auto quiz"
            onClick={async () => {
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
              // showToast();
              setIsLoading((prev: any) => ({ ...prev, isLoadingQuiz: true }));
              await handleAutoquiz(currentCourse);
              setIsLoading((prev: any) => ({ ...prev, isLoadingQuiz: false }));
            }}
            isLoading={isLoading.isLoadingQuiz}
            icon={<Play width={22} height={22} />}
          >
            Start
          </Button>
        </div>
        <div className="font-bold text-base my-3 flex gap-2">
          <Setting />
          Setting
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
            }}
          />
          <Checkbox
            id={'always-show-ui'}
            checked={options.isAlwaysShowControlPanel}
            children={'Always show control panel'}
            onChange={(e: HTMLInputElement) => {
              setOptions((prev) => {
                chrome.storage.local.set({
                  isAlwaysShowControlPanel: !prev.isAlwaysShowControlPanel,
                });
                return { ...prev, isAlwaysShowControlPanel: !prev.isAlwaysShowControlPanel };
              });
            }}
          />
        </div>
        <Footer />
      </div>
    </>
  );
}
