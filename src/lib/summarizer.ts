// Extractive summarization using a frequency-based scoring algorithm.
// Each sentence is scored by the sum of its word frequencies (normalized),
// then the top-ranked sentences are selected in original order.

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against',
  'between', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 's', 't', 'just', 'don', 'now', 'i', 'me', 'my', 'myself',
  'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
  'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
  'those', 'am', 'if', 'because', 'while', 'also', 'as', 'one', 'two',
]);

function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  // Split on sentence boundaries: period, exclamation, question mark followed by space or end
  const matches = cleaned.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g);
  return matches ? matches.map((s) => s.trim()).filter((s) => s.length > 0) : [cleaned];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function buildFrequencyMap(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  // Normalize by max frequency
  const maxFreq = Math.max(...freq.values(), 1);
  for (const [key, value] of freq) {
    freq.set(key, value / maxFreq);
  }
  return freq;
}

function scoreSentence(sentence: string, freqMap: Map<string, number>): number {
  const tokens = tokenize(sentence);
  if (tokens.length === 0) return 0;
  let score = 0;
  for (const token of tokens) {
    score += freqMap.get(token) ?? 0;
  }
  // Normalize by sentence length to avoid bias toward long sentences,
  // but give a slight boost to longer sentences for coherence
  return score / Math.sqrt(tokens.length);
}

export interface SummarizationResult {
  summary: string;
  summarySentences: string[];
  sentenceScores: { sentence: string; score: number; index: number }[];
  wordCountOriginal: number;
  wordCountSummary: number;
  ratio: number;
}

export type SummaryLength = 'brief' | 'moderate' | 'detailed';

const LENGTH_RATIOS: Record<SummaryLength, number> = {
  brief: 0.15,
  moderate: 0.3,
  detailed: 0.5,
};

export function summarizeText(
  text: string,
  length: SummaryLength = 'moderate',
): SummarizationResult {
  const sentences = splitSentences(text);
  const allTokens = tokenize(text);
  const wordCountOriginal = text.trim().split(/\s+/).filter(Boolean).length;

  if (sentences.length <= 1 || wordCountOriginal < 20) {
    // Too short to summarize — return the original
    return {
      summary: text.trim(),
      summarySentences: sentences,
      sentenceScores: sentences.map((s, i) => ({ sentence: s, score: 1, index: i })),
      wordCountOriginal,
      wordCountSummary: wordCountOriginal,
      ratio: 100,
    };
  }

  const freqMap = buildFrequencyMap(allTokens);

  const scored = sentences.map((sentence, index) => ({
    sentence,
    score: scoreSentence(sentence, freqMap),
    index,
  }));

  const targetRatio = LENGTH_RATIOS[length];
  const targetCount = Math.max(1, Math.round(sentences.length * targetRatio));

  // Sort by score descending, take top N, then re-sort by original index for coherent output
  const topSentences = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, targetCount)
    .sort((a, b) => a.index - b.index);

  const summaryText = topSentences.map((s) => s.sentence).join(' ');
  const wordCountSummary = summaryText.trim().split(/\s+/).filter(Boolean).length;
  const ratio = wordCountOriginal > 0
    ? Math.round((wordCountSummary / wordCountOriginal) * 100)
    : 0;

  return {
    summary: summaryText,
    summarySentences: topSentences.map((s) => s.sentence),
    sentenceScores: scored.sort((a, b) => b.score - a.score),
    wordCountOriginal,
    wordCountSummary,
    ratio,
  };
}

export function generateTitle(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return 'Untitled';
  const words = trimmed.split(/\s+/).slice(0, 5).join(' ');
  return words.length > 60 ? words.slice(0, 57) + '...' : words;
}
