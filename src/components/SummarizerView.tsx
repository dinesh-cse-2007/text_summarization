import { useState, useCallback, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Trash2,
  Save,
  Loader2,
  ChevronRight,
  Clock,
  ArrowLeft,
  BarChart3,
  ScrollText,
} from 'lucide-react';
import { summarizeText, generateTitle, type SummaryLength, type SummarizationResult } from '@/lib/summarizer';
import { supabase, type SummaryRecord } from '@/lib/supabase';

const SAMPLE_TEXT = `Artificial intelligence is transforming industries across the globe. From healthcare to finance, AI-powered tools are enabling professionals to work faster and more accurately than ever before. In medicine, machine learning models can detect diseases like cancer in medical images with precision that rivals experienced radiologists. Financial institutions use AI algorithms to detect fraudulent transactions in real time, protecting millions of customers from theft. In the transportation sector, autonomous vehicles are being tested on public roads, promising to reduce accidents caused by human error. Despite these advances, experts caution that AI also presents significant challenges. Bias in training data can lead to unfair outcomes in hiring, lending, and criminal justice. Privacy concerns have emerged as companies collect vast amounts of personal data to train their models. Policymakers around the world are grappling with how to regulate AI without stifling innovation. The European Union has introduced the AI Act, which categorizes AI systems by risk level and imposes requirements accordingly. In the United States, discussions continue about the need for federal AI legislation. Meanwhile, researchers are working on making AI systems more transparent and explainable, so that users can understand how decisions are made. The future of AI will depend not only on technological progress but also on the choices society makes about how to deploy it responsibly.`;

const LENGTH_OPTIONS: { value: SummaryLength; label: string; description: string }[] = [
  { value: 'brief', label: 'Brief', description: '~15% of original' },
  { value: 'moderate', label: 'Moderate', description: '~30% of original' },
  { value: 'detailed', label: 'Detailed', description: '~50% of original' },
];

type View = 'summarizer' | 'history' | 'detail';

export default function SummarizerView() {
  const [view, setView] = useState<View>('summarizer');
  const [inputText, setInputText] = useState('');
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('moderate');
  const [result, setResult] = useState<SummarizationResult | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<SummaryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SummaryRecord | null>(null);

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;

  const handleSummarize = useCallback(() => {
    if (!inputText.trim()) return;
    setIsSummarizing(true);
    setSaved(false);
    // Use a short timeout to show the animation
    setTimeout(() => {
      const res = summarizeText(inputText, summaryLength);
      setResult(res);
      setIsSummarizing(false);
    }, 400);
  }, [inputText, summaryLength]);

  const handleCopy = useCallback(() => {
    if (result) {
      navigator.clipboard.writeText(result.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const handleSave = useCallback(async () => {
    if (!result || saved) return;
    setIsSaving(true);
    const title = generateTitle(inputText);
    const { data, error } = await supabase
      .from('summaries')
      .insert({
        title,
        original_text: inputText,
        summary_text: result.summary,
        summary_ratio: result.ratio,
        word_count_original: result.wordCountOriginal,
        word_count_summary: result.wordCountSummary,
      })
      .select()
      .single();

    if (!error && data) {
      setSaved(true);
      setHistory((prev) => [data as SummaryRecord, ...prev]);
    }
    setIsSaving(false);
  }, [result, saved, inputText]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) {
      setHistory(data as SummaryRecord[]);
    }
    setLoadingHistory(false);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from('summaries').delete().eq('id', id);
    if (!error) {
      setHistory((prev) => prev.filter((h) => h.id !== id));
    }
  }, []);

  const handleViewRecord = useCallback((record: SummaryRecord) => {
    setSelectedRecord(record);
    setView('detail');
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  useEffect(() => {
    if (view === 'history') {
      loadHistory();
    }
  }, [view, loadHistory]);

  // Detail view
  if (view === 'detail' && selectedRecord) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header onLogoClick={() => setView('summarizer')} />
        <div className="max-w-4xl mx-auto px-6 py-10">
          <button
            onClick={() => { setView('history'); setSelectedRecord(null); }}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-900 mb-6 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to History
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="p-8 border-b border-stone-100">
              <h1 className="text-2xl font-bold text-stone-900 mb-2">{selectedRecord.title}</h1>
              <div className="flex items-center gap-3 text-sm text-stone-500">
                <Clock className="w-4 h-4" />
                <span>{formatDate(selectedRecord.created_at)} at {formatTime(selectedRecord.created_at)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-stone-100 border-b border-stone-100">
              <StatCard label="Original Words" value={selectedRecord.word_count_original} />
              <StatCard label="Summary Words" value={selectedRecord.word_count_summary} />
              <StatCard label="Compression" value={`${selectedRecord.summary_ratio}%`} />
            </div>

            <div className="p-8">
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Summary
              </h3>
              <p className="text-stone-700 leading-relaxed text-lg mb-8">{selectedRecord.summary_text}</p>

              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <ScrollText className="w-4 h-4" /> Original Text
              </h3>
              <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">{selectedRecord.original_text}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // History view
  if (view === 'history') {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header onLogoClick={() => setView('summarizer')} />
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Summary History</h1>
              <p className="text-stone-500 mt-1">Your saved summaries, most recent first</p>
            </div>
            <button
              onClick={() => setView('summarizer')}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium"
            >
              New Summary <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-stone-400" />
              </div>
              <p className="text-stone-500 font-medium">No saved summaries yet</p>
              <p className="text-stone-400 text-sm mt-1">Summarize text and save it to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="bg-white rounded-xl border border-stone-200 p-5 hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => handleViewRecord(record)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-stone-900 truncate group-hover:text-stone-700">
                        {record.title}
                      </h3>
                      <p className="text-stone-500 text-sm mt-1 line-clamp-2">{record.summary_text}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-stone-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(record.created_at)}
                        </span>
                        <span>{record.word_count_original} words → {record.word_count_summary} words</span>
                        <span className="text-stone-500 font-medium">{record.summary_ratio}% compression</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(record.id);
                      }}
                      className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Delete summary"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main summarizer view
  return (
    <div className="min-h-screen bg-stone-50">
      <Header onLogoClick={() => setView('summarizer')} onHistoryClick={() => setView('history')} />

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Extractive Text Summarization
          </div>
          <h1 className="text-4xl font-bold text-stone-900 tracking-tight">
            Summarize any text instantly
          </h1>
          <p className="text-stone-500 mt-3 text-lg max-w-2xl mx-auto">
            Paste your text below and get a concise summary powered by a frequency-based
            sentence scoring algorithm.
          </p>
        </div>

        {/* Input and Output Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-stone-400" />
                Input Text
              </h2>
              {inputText && (
                <button
                  onClick={() => { setInputText(''); setResult(null); setSaved(false); }}
                  className="text-xs text-stone-400 hover:text-stone-700 transition-colors font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste or type your text here..."
              className="flex-1 p-5 text-stone-700 resize-none focus:outline-none min-h-[300px] text-[15px] leading-relaxed"
            />

            <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
              <span>{wordCount} words · {charCount} characters</span>
              <button
                onClick={() => setInputText(SAMPLE_TEXT)}
                className="text-stone-500 hover:text-stone-900 font-medium transition-colors"
              >
                Try sample text
              </button>
            </div>
          </div>

          {/* Output Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-emerald-500" />
                Summary
              </h2>
              {result && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
                    aria-label="Copy summary"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || saved}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-60"
                    style={{
                      backgroundColor: saved ? '#ecfdf5' : '#1c1917',
                      color: saved ? '#047857' : '#ffffff',
                    }}
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : saved ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {saved ? 'Saved' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-5 overflow-y-auto min-h-[300px]">
              {isSummarizing ? (
                <div className="flex flex-col items-center justify-center h-full text-stone-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3" />
                  <p className="text-sm">Analyzing and summarizing...</p>
                </div>
              ) : result ? (
                <div>
                  <p className="text-stone-700 leading-relaxed text-[15px]">
                    {result.summary}
                  </p>
                  <div className="mt-6 pt-5 border-t border-stone-100">
                    <div className="grid grid-cols-3 gap-3">
                      <MiniStat label="Original" value={`${result.wordCountOriginal}`} unit="words" />
                      <MiniStat label="Summary" value={`${result.wordCountSummary}`} unit="words" />
                      <MiniStat label="Ratio" value={`${result.ratio}`} unit="%" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-stone-300 text-center">
                  <BarChart3 className="w-12 h-12 mb-3" />
                  <p className="text-sm text-stone-400">Your summary will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Summary Length</span>
              <div className="flex items-center gap-2 mt-2">
                {LENGTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSummaryLength(opt.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      summaryLength === opt.value
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {opt.label}
                    <span className={`block text-[10px] font-normal ${summaryLength === opt.value ? 'text-stone-400' : 'text-stone-400'}`}>
                      {opt.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSummarize}
              disabled={!inputText.trim() || isSummarizing}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
            >
              {isSummarizing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {isSummarizing ? 'Summarizing...' : 'Summarize'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ onLogoClick, onHistoryClick }: { onLogoClick: () => void; onHistoryClick?: () => void }) {
  return (
    <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <button onClick={onLogoClick} className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-stone-900 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-stone-900 text-lg leading-none block">Summarly</span>
            <span className="text-[11px] text-stone-400 leading-none">Text Summarization Tool</span>
          </div>
        </button>
        {onHistoryClick && (
          <button
            onClick={onHistoryClick}
            className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors text-sm font-medium"
          >
            <Clock className="w-4 h-4" /> History
          </button>
        )}
      </div>
    </header>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-5 text-center">
      <div className="text-2xl font-bold text-stone-900">{value}</div>
      <div className="text-xs text-stone-400 mt-0.5">{label}</div>
    </div>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-stone-900">{value}<span className="text-sm font-normal text-stone-400 ml-0.5">{unit}</span></div>
      <div className="text-[11px] text-stone-400 mt-0.5">{label}</div>
    </div>
  );
}
