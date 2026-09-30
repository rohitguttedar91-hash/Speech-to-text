import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Download,
  FileAudio,
  History,
  Languages,
  Mic,
  Moon,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Upload,
  Volume2,
  XCircle,
} from "lucide-react";

const API = "/api";

function App() {
  const [languages, setLanguages] = useState({});
  const [speechLanguage, setSpeechLanguage] = useState("kn");
  const [targetLanguage, setTargetLanguage] = useState("hi");
  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [dark, setDark] = useState(false);
  const [dragging, setDragging] = useState(false);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/languages`).then((r) => r.json()),
      fetch(`${API}/history`).then((r) => r.json()),
    ])
      .then(([langData, historyData]) => {
        setLanguages(langData.languages || {});
        setHistory(historyData.items || []);
      })
      .catch(() => setError("Backend is not running. Start FastAPI on port 8000."));
  }, []);

  const languageList = useMemo(
    () => Object.entries(languages),
    [languages]
  );

  function setSelectedFile(selected) {
    if (!selected) return;
    setError("");
    setResult(null);
    setStatus("idle");
    setFile(selected);

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(selected));
  }

  function clearInput() {
    setFile(null);
    setResult(null);
    setStatus("idle");
    setError("");
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
  }

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not supported by this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : undefined,
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const recordedFile = new File(
          [blob],
          `recording-${Date.now()}.webm`,
          { type: blob.type }
        );
        setSelectedFile(recordedFile);
        streamRef.current?.getTracks().forEach((track) => track.stop());
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone permission was denied or unavailable.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribe() {
    if (!file) {
      setError("Record speech or upload an audio file first.");
      return;
    }

    setStatus("processing");
    setError("");
    setResult(null);

    const form = new FormData();
    form.append("file", file);
    form.append("language", speechLanguage);
    form.append("translate_to", targetLanguage);

    try {
      const response = await fetch(`${API}/transcribe`, {
        method: "POST",
        body: form,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Transcription failed.");

      setResult(data);
      setStatus("success");
      loadHistory();
    } catch (err) {
      setError(err.message || "Unable to process audio.");
      setStatus("error");
    }
  }

  async function loadHistory() {
    try {
      const response = await fetch(`${API}/history`);
      const data = await response.json();
      setHistory(data.items || []);
    } catch {}
  }

  async function deleteHistory() {
    await fetch(`${API}/history`, { method: "DELETE" });
    setHistory([]);
  }

  async function copyText(text) {
    await navigator.clipboard.writeText(text);
  }

  function downloadText() {
    if (!result) return;
    const content = [
      `Language: ${result.language_name}`,
      "",
      "Transcription:",
      result.text,
      "",
      result.translated_text
        ? `Translation (${languages[result.translation_language]?.name || result.translation_language}):\n${result.translated_text}`
        : "",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcription.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadHistoryItem(item) {
    setResult({
      ...item,
      language_name:
        item.language_name || languages[item.language]?.name || item.language,
    });
    setStatus("success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className={dark ? "min-h-screen bg-slate-950 text-white" : "min-h-screen bg-[#f6f8fc] text-slate-900"}>
      <header className={`sticky top-0 z-20 border-b ${dark ? "border-slate-800 bg-slate-950/90" : "border-slate-200 bg-white/90"} backdrop-blur`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-900 p-2.5 text-white">
              <AudioLines size={22} />
            </div>
            <div>
              <div className="font-bold tracking-tight">Bhasha Voice AI</div>
              <div className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                Indian Language Speech Intelligence
              </div>
            </div>
          </div>
          <button
            onClick={() => setDark(!dark)}
            className={`rounded-xl border p-2.5 ${dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <section className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            <Sparkles size={14} /> AI-powered transcription
          </div>
          <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
            Turn Indian language speech into accurate text.
          </h1>
          <p className="mt-3 max-w-2xl text-slate-500">
            Record or upload speech, select the language, transcribe it with
            Whisper, and optionally translate the result into another Indian language.
          </p>
        </section>

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <XCircle size={20} />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")}><XCircle size={18} /></button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <section className={`rounded-3xl border p-5 shadow-sm ${dark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <SelectBox
                label="Speech language"
                icon={<Languages size={17} />}
                value={speechLanguage}
                onChange={setSpeechLanguage}
                options={languageList}
                languages={languages}
              />
              <SelectBox
                label="Translate result to"
                icon={<Languages size={17} />}
                value={targetLanguage}
                onChange={setTargetLanguage}
                options={languageList}
                languages={languages}
              />
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                setSelectedFile(e.dataTransfer.files?.[0]);
              }}
              className={`rounded-3xl border-2 border-dashed p-7 text-center transition ${
                dragging
                  ? "border-slate-900 bg-slate-50"
                  : dark
                    ? "border-slate-700 bg-slate-950/50"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Mic size={28} />
              </div>
              <h2 className="text-lg font-bold">Speak or upload audio</h2>
              <p className="mt-1 text-sm text-slate-500">
                WAV, MP3, M4A, OGG, WebM, FLAC and AAC
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                {!recording ? (
                  <button
                    onClick={startRecording}
                    disabled={status === "processing"}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Mic size={18} /> Start recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white"
                  >
                    <Square size={17} /> Stop recording
                  </button>
                )}

                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50">
                  <Upload size={18} /> Choose audio
                  <input
                    type="file"
                    accept="audio/*,.m4a,.webm"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0])}
                  />
                </label>
              </div>

              {recording && (
                <div className="mt-5 flex items-end justify-center gap-1.5">
                  {[12, 25, 18, 34, 20, 29, 14, 31, 21, 16].map((h, i) => (
                    <span
                      key={i}
                      className="wave w-1.5 rounded-full bg-slate-900"
                      style={{ height: `${h}px`, animationDelay: `${i * 70}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {file && (
              <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 p-2.5">
                    <FileAudio size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{file.name}</div>
                    <div className="text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <button onClick={clearInput} className="rounded-lg p-2 hover:bg-slate-100">
                    <Trash2 size={18} />
                  </button>
                </div>
                {audioUrl && (
                  <audio controls src={audioUrl} className="mt-4 w-full" />
                )}
              </div>
            )}

            <button
              onClick={transcribe}
              disabled={!file || status === "processing"}
              className="mt-5 w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "processing" ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing speech...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <AudioLines size={19} /> Transcribe speech
                </span>
              )}
            </button>
          </section>

          <section className={`rounded-3xl border p-5 shadow-sm ${dark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Transcription result</h2>
                <p className="text-sm text-slate-500">Your processed speech appears here.</p>
              </div>
              {status === "success" && <CheckCircle2 className="text-emerald-600" size={22} />}
            </div>

            {status === "processing" ? (
              <LoadingResult />
            ) : result ? (
              <ResultCard
                result={result}
                languages={languages}
                onCopy={copyText}
                onDownload={downloadText}
              />
            ) : (
              <EmptyResult />
            )}
          </section>
        </div>

        <section className={`mt-6 rounded-3xl border p-5 shadow-sm ${dark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={19} />
              <h2 className="font-bold">Recent transcriptions</h2>
            </div>
            {history.length > 0 && (
              <button
                onClick={deleteHistory}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={15} /> Clear
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No transcription history yet.
            </p>
          ) : (
            <div className="grid gap-3">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadHistoryItem(item)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50"
                >
                  <div className="rounded-xl bg-slate-100 p-2.5">
                    <Languages size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {languages[item.language]?.native || item.language_name}
                    </div>
                    <div className="truncate text-sm text-slate-500">{item.text}</div>
                  </div>
                  <ChevronDown size={17} className="-rotate-90 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SelectBox({ label, icon, value, onChange, options, languages }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon} {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
        >
          {options.map(([code, info]) => (
            <option key={code} value={code}>
              {info.name} — {info.native}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={18} />
      </div>
    </label>
  );
}

function EmptyResult() {
  return (
    <div className="flex min-h-[390px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <FileAudio size={30} className="text-slate-400" />
      </div>
      <h3 className="mt-4 font-bold">No transcription yet</h3>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        Select a language, record or upload speech, then start transcription.
      </p>
    </div>
  );
}

function LoadingResult() {
  return (
    <div className="flex min-h-[390px] flex-col items-center justify-center rounded-3xl bg-slate-50 p-8 text-center">
      <div className="relative rounded-full bg-white p-5 shadow-sm">
        <AudioLines size={34} className="animate-pulse" />
      </div>
      <h3 className="mt-5 font-bold">Analyzing your speech</h3>
      <p className="mt-1 text-sm text-slate-500">
        The AI model is converting speech into text.
      </p>
      <div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-slate-900" />
      </div>
    </div>
  );
}

function ResultCard({ result, languages, onCopy, onDownload }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          Detected: {result.language_name}
        </span>
        {result.duration && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {result.duration.toFixed(1)} sec
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Transcription
          </span>
          <button
            onClick={() => onCopy(result.text)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold shadow-sm"
          >
            <Clipboard size={14} /> Copy
          </button>
        </div>
        <p className="whitespace-pre-wrap text-lg leading-8">{result.text}</p>
      </div>

      {result.translated_text && (
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Languages size={14} />
            Translation — {languages[result.translation_language]?.name}
          </div>
          <p className="whitespace-pre-wrap text-lg leading-8">
            {result.translated_text}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onCopy(result.text)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold hover:bg-slate-50"
        >
          <Clipboard size={17} /> Copy
        </button>
        <button
          onClick={onDownload}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Download size={17} /> Download TXT
        </button>
      </div>
    </div>
  );
}

export default App;
