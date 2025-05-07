import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  handleAutoquiz,
  handleReview,
  handlePeerGradedAssignment,
  handleDiscussionPrompt,
  requestGradingByPeer,
  waitForSelector,
  resolveWeekMaterial,
  getMaterial,
  getAllMaterials,
} from './index';
import { Button } from './components/Button';
import Checkbox from './components/Checkbox';
import { LoadingProps, Method, SettingOptions } from './type';
import Footer from './components/Footer';
import {
  ChevronRightIcon,
  Clapper,
  LoadingIcon,
  Note,
  Paintbrush,
  Play,
  Quiz,
  Setting,
} from './components/Icon';
import GetShareableLink from './components/GetShareableLink';
import toast, { Toaster } from 'react-hot-toast';
import { courseraLogo } from './constants';
import { sendTrackingEvent } from './tracking';

export default function App() {
  const [courseList, setCourseList] = useState<any>([]);
  const methods = [
    {
      name: 'Source FPT',
      value: 'source',
    },
    {
      name: 'Gemini',
      value: 'gemini',
    },
    // {
    //   name: 'ChatGPT',
    //   value: 'chatgpt',
    // },
    // {
    //   name: 'DeepSeek',
    //   value: 'deepseek',
    // },
  ];

  const [currentCourse, setCurrentCourse] = useState('SSL101c');
  const [isShowControlPanel, setIsShowControlPanel] = useState(false);

  const [options, setOptions] = useState<SettingOptions>({
    isAutoSubmitQuiz: true,
    isDebugMode: false,
    method: Method.Gemini,
  });
  const [isLoading, setIsLoading] = useState<LoadingProps>({
    isLoadingReview: false,
    isLoadingQuiz: false,
    isLoadingSubmitPeerGrading: false,
    isLoadingDiscuss: false,
    isLoadingCompleteWeek: false,
    isLoadingDisableAI: false,
  });
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({
    sourceAPI: '',
    chatgptAPI: '',
    geminiAPI: '',
    deepseekAPI: '',
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
      const { isShowControlPanel } = await chrome.storage.local.get('isShowControlPanel');
      const { isDebugMode } = await chrome.storage.local.get('isDebugMode');
      const { method } = await chrome.storage.local.get('method');

      // console.log(isAutoSubmitQuiz);
      setCourseList(courseMap);
      setOptions({
        isAutoSubmitQuiz: isAutoSubmitQuiz,
        isDebugMode: isDebugMode == undefined ? false : isDebugMode,
        method: method == undefined ? Method.Source : method,
      });
      setIsShowControlPanel(isShowControlPanel == undefined ? true : isShowControlPanel);
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

  useEffect(() => {
    const fetchApiKeys = async () => {
      const keys = await chrome.storage.local.get([
        'sourceAPI',
        'chatgptAPI',
        'geminiAPI',
        'deepseekAPI',
      ]);
      setApiKeys(keys);
    };

    fetchApiKeys();
  }, []);

  return (
    <>
      <div
        className={`w-10 h-10 rounded-full fixed bottom-3 right-6 p-2 cursor-pointer bg-no-repeat bg-center bg-cover transition-all duration-300 ${!isShowControlPanel ? 'translate-y-0 opacity-100' : 'translate-y-[100px] opacity-0'}`}
        onClick={() => {
          setIsShowControlPanel(true);
          chrome.storage.local.set({ isShowControlPanel: true });
        }}
        style={{
          backgroundImage: `url(${courseraLogo})`,
          zIndex: 1000,
        }}
      ></div>

      <div
        className={`bg-white absolute border border-black -bottom-4 p-4 right-0 rounded-md transition-all ${isShowControlPanel ? '-translate-x-0 opacity-100' : 'translate-x-[500px] opacity-0'}`}
      >
        <div
          className="absolute top-2 right-2 cursor-pointer"
          onClick={() => {
            setIsShowControlPanel(false);
            chrome.storage.local.set({ isShowControlPanel: false });
          }}
        >
          <ChevronRightIcon />
        </div>
        <div className="font-bold text-sm mb-3 flex gap-2">
          <Clapper width={20} height={20} />
          Course Progress
        </div>
        <div className="flex gap-2">
          <Button
            icon={<Paintbrush />}
            className=""
            title="Auto skip all readings & videos"
            onClick={async () => {
              setIsLoading((prev: LoadingProps) => ({ ...prev, isLoadingCompleteWeek: true }));
              await sendTrackingEvent();
              await resolveWeekMaterial();
              setIsLoading((prev: LoadingProps) => ({ ...prev, isLoadingCompleteWeek: false }));
              location.reload();
            }}
            isLoading={isLoading.isLoadingCompleteWeek}
          >
            Skip videos & readings
          </Button>
          <Button
            className=""
            title="Auto skip all readings & videos"
            onClick={async () => {
              setIsLoading((prev: LoadingProps) => ({ ...prev, isLoadingDiscuss: true }));
              await sendTrackingEvent();
              await handleDiscussionPrompt();
              setIsLoading((prev: LoadingProps) => ({ ...prev, isLoadingDiscuss: false }));
              location.reload();
            }}
            isLoading={isLoading.isLoadingDiscuss}
          >
            Skip discussions
          </Button>
        </div>

        <div className="font-bold my-3 flex gap-2 text-sm">
          <Note width={20} height={20} />
          Assignment
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            title="Auto submit assignments (May not work)"
            onClick={async () => {
              setIsLoading((prev: LoadingProps) => ({ ...prev, isLoadingSubmitPeerGrading: true }));
              await sendTrackingEvent();
              await handlePeerGradedAssignment();
              setIsLoading((prev: LoadingProps) => ({
                ...prev,
                isLoadingSubmitPeerGrading: false,
              }));
            }}
            isLoading={isLoading.isLoadingSubmitPeerGrading}
          >
            Auto submit
          </Button>
          <Button
            title="Auto grade assignments"
            onClick={async () => {
              setIsLoading((prev: LoadingProps) => ({ ...prev, isLoadingReview: true }));
              await sendTrackingEvent();
              toast.promise(
                async () => {
                  await handleReview();
                },
                {
                  loading: 'Grading ...',
                  success: <p>Grading done!</p>,
                  error: <p>Grading failed!</p>,
                },
              );
              setIsLoading((prev: LoadingProps) => ({ ...prev, isLoadingReview: false }));
            }}
            isLoading={isLoading.isLoadingReview}
          >
            Auto grade
          </Button>
          <Button
            title="Disable AI grading for your submission"
            onClick={async () => {
              setIsLoading((prev: LoadingProps) => ({ ...prev, isLoadingDisableAI: true }));
              await sendTrackingEvent();
              await requestGradingByPeer();
              setIsLoading((prev: LoadingProps) => ({ ...prev, isLoadingDisableAI: false }));
            }}
            isLoading={isLoading.isLoadingDisableAI}
          >
            Disable AI grading
          </Button>
        </div>
        <GetShareableLink />
        <div className="font-bold text-sm my-3 flex gap-2">
          <Quiz width={20} height={20} />
          Quiz Automation
        </div>
        <div className="flex gap-4 items-center w-full text-sm">
          <span className="font-semibold">Source:</span>
          <select
            className="py-1 px-3 border rounded-lg focus-visible:outline-none text-sm border-zinc-500"
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
            className="!py-1"
            title="Start auto quiz"
            onClick={async () => {
              await sendTrackingEvent();
              try {
                await handleAutoquiz(currentCourse);
              } catch (error) {
                console.log(error);
              }
            }}
            isLoading={isLoading.isLoadingQuiz}
            icon={<Play width={22} height={22} />}
          >
            Start
          </Button>
        </div>

        <div className="grid grid-cols-1 text-sm">
          <div className="font-bold text-sm my-3 flex gap-2 cursor-pointer">
            <Setting width={20} height={20} />
            Settings
          </div>

          <div className="col-span-2">
            <div className="grid grid-cols-2 gap-2">
              <span className="flex items-center gap-2">
                <span className="text-sm">Picker: </span>
                <select
                  className="py-1 px-3 border border-zinc-500 rounded-lg focus-visible:outline-none text-sm"
                  onChange={(e) => {
                    chrome.storage.local.set({ method: e.target.value });
                    setOptions((prev) => ({ ...prev, method: e.target.value as Method }));
                  }}
                  value={options.method + ''}
                >
                  {methods.map((value) => (
                    <option key={value.value} value={value.value}>
                      {value.name}
                    </option>
                  ))}
                </select>
              </span>
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
            </div>

            {methods.slice(1).map((method) => (
              <div className="mt-3 flex gap-4 items-center" key={method.value}>
                <label htmlFor={`${method.value}-api`} className="inline-block mb-1 text-sm">
                  {method.name} API:
                </label>
                <input
                  id={`${method.value}-api`}
                  type="text"
                  className="border rounded-lg px-2 py-1 flex-1 no-ring border-zinc-500 focus:border-blue-600 text-zinc-500 focus:text-black"
                  placeholder={`Enter ${method.name} API`}
                  value={apiKeys[`${method.value}API`] || ''}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    chrome.storage.local.set({ [`${method.value}API`]: newValue });
                    setApiKeys((prev) => ({
                      ...prev,
                      [`${method.value}API`]: newValue,
                    }));
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        {location.href.includes('debug=true') && (
          <div className="flex gap-4 items-center justify-start my-2">
            <Checkbox
              id={'is-debug-mode'}
              checked={options.isDebugMode}
              children={'Debug mode'}
              onChange={(e: HTMLInputElement) => {
                setOptions((prev) => {
                  chrome.storage.local.set({ isDebugMode: !prev.isDebugMode });
                  return { ...prev, isDebugMode: !prev.isDebugMode };
                });
              }}
            />
          </div>
        )}

        <Footer />
      </div>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{ success: { duration: 4000 } }}
      />
    </>
  );
}
