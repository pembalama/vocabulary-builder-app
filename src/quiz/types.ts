export type QuizType =
  | "wordToMeaning"
  | "meaningToWord"
  | "typed"
  | "flashcard"
  | "confusables"
  | "cloze";

export type PoolMode = "due" | "all";

export interface QuizFilters {
  partOfSpeech: string;
  difficulty: string;
  tag: string;
}

export const EMPTY_QUIZ_FILTERS: QuizFilters = {
  partOfSpeech: "",
  difficulty: "",
  tag: "",
};

interface QuestionBase {
  type: QuizType;
  wordId: string;
  word: string;
  partOfSpeech: string;
  pronunciation: string;
  meaning: string;
  examples: string;
  synonyms: string;
  antonyms: string;
  wordFamily: string;
  roots: string;
  memory: string;
  confusableWith: string;
}

export type McQuestion = QuestionBase & {
  kind: "mc";
  promptKind: "word" | "meaning";
  promptText: string;
  options: string[];
  correctIndex: number;
};

export type TypedQuestion = QuestionBase & {
  kind: "typed";
  promptText: string;
};

export type FlashcardQuestion = QuestionBase & {
  kind: "flashcard";
};

export type ClozeQuestion = QuestionBase & {
  kind: "cloze";
  sentence: string; // original sentence (case-preserved)
  prompt: string; // sentence with target masked
  blank: string; // exact placeholder text inserted in `prompt`
  matchTarget: string; // expected typed answer (the matched substring)
};

export type Question =
  | McQuestion
  | TypedQuestion
  | FlashcardQuestion
  | ClozeQuestion;

export const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  wordToMeaning: "Word → Meaning",
  meaningToWord: "Meaning → Word",
  typed: "Typed",
  flashcard: "Flashcard",
  confusables: "Confusables",
  cloze: "Cloze",
};
