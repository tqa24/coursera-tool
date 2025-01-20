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
  isAutoGrade: boolean;
};
