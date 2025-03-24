export type QuizItem = {
  term: string;
  definition: string;
};

export type Course = {
  // quizUrls: string[];
  quizSrc: QuizItem[];
  // strictQuizMode: boolean;
};

export type SettingOptions = {
  isAutoSubmitQuiz: boolean;
  isDebugMode: boolean;
  method: Method | null;
};

export type LoadingProps = {
  isLoadingReview: boolean;
  isLoadingQuiz: boolean;
  isLoadingSubmitPeerGrading: boolean;
  isLoadingDiscuss: boolean;
  isLoadingCompleteWeek: boolean;
  isLoadingDisableAI: boolean;
};

export enum Method {
  ChatGPT = 'chatgpt',
  Gemini = 'gemini',
  DeepSeek = 'deepseek',
  Source = 'source',
}
