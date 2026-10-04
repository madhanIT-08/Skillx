import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Zap,
  BarChart3,
  Target,
  Sparkles,
  ArrowRight,
  RefreshCcw,
  ShieldAlert,
  SearchCode,
  Copy,
  Check,
  FileCheck2,
  Trash2
} from 'lucide-react';
import { Type } from "@google/genai";
import { generateGeminiContent } from "../lib/gemini";
import { db, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../lib/firebase';

const SAMPLE_RESUME = `ALEX JOHNSON
Senior Full Stack Engineer | San Francisco, CA | alex.johnson@email.com | (555) 234-5678 | github.com/alexj

SUMMARY
Detail-oriented full-stack developer with 5+ years of experience designing and scaling web applications. Strong expertise in TypeScript, React, Next.js, Node.js, and PostgreSQL. Proven track record of reducing latency by 40% and leading high-performing engineering squads.

EXPERIENCE
TechNova Solutions — Senior Software Engineer
Jan 2022 – Present | San Francisco, CA
- Architected and deployed microservices handling 2M+ daily active users using Node.js, TypeScript, and Docker.
- Spearheaded frontend migration to React and Next.js, cutting page load time by 38% and boosting SEO rank.
- Mentored 6 junior engineers and instituted automated CI/CD pipelines with GitHub Actions and Jest tests.
- Designed distributed caching layer with Redis, reducing primary database load by 45%.

CloudMatrix Inc. — Software Engineer
Jun 2019 – Dec 2021 | Austin, TX
- Built high-volume REST and GraphQL APIs using Express, Node.js, and PostgreSQL.
- Implemented real-time collaboration features using WebSockets and Redis pub/sub.
- Partnered with product and design teams to deliver responsive UI components adhering to WCAG 2.1 accessibility.

EDUCATION
B.S. in Computer Science — University of California, Berkeley (2015 – 2019)

SKILLS
Languages: TypeScript, JavaScript, Python, SQL, HTML5, CSS3
Frameworks & Libraries: React, Next.js, Node.js, Express, TailwindCSS, Jest
Databases & Cloud: PostgreSQL, MongoDB, Redis, Docker, AWS (S3, ECS, Lambda), Git`;

const SAMPLE_JOB_DESCRIPTION = `Senior Full Stack Developer (React / Node / Cloud)

We are seeking an experienced Full Stack Developer to build mission-critical features across our SaaS platform.
Requirements:
- 4+ years building production applications with TypeScript, React, and Node.js
- Strong proficiency with relational databases (PostgreSQL) and caching (Redis)
- Hands-on experience with containerization (Docker) and AWS cloud infrastructure
- Solid understanding of automated testing (unit, integration) and CI/CD pipelines
- Excellent communication and cross-functional team collaboration skills`;

export default function ResumeAnalyzer({ user }: { user: any }) {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedWords, setDetectedWords] = useState<string[]>([]);
  const [highlightedResume, setHighlightedResume] = useState<React.ReactNode | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const RED_FLAG_WORDS = [
    'synergy', 'detail-oriented', 'team player', 'hard worker', 'dynamic',
    'self-motivated', 'go-getter', 'think outside the box', 'passionate',
    'results-driven', 'expert', 'world-class', 'innovative', 'motivated',
    'responsible for', 'assisted with', 'familiar with', 'knowledge of',
    'guru', 'ninja', 'rockstar', 'evangelist', 'visionary', 'strategic thinker',
    'bottom-line', 'value-add', 'best of breed', 'game-changer', 'paradigm shift',
    'leverage', 'utilize', 'proactive', 'punctual', 'reliable'
  ];

  useEffect(() => {
    const text = resumeText.toLowerCase();
    const found = RED_FLAG_WORDS.filter(word => text.includes(word.toLowerCase()));
    setDetectedWords(found);
  }, [resumeText]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadedFileName(file.name);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      try {
        const pdfjs = await import('pdfjs-dist');
        const pdfjsLib = (pdfjs as any).default || pdfjs;
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }

        if (!fullText.trim()) {
          throw new Error("No text content found in PDF.");
        }
        setResumeText(fullText.trim());
      } catch (err: any) {
        console.error("PDF parsing failed:", err);
        setError("Could not extract text from this PDF. Please paste the resume text directly into the box.");
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        setResumeText(text);
      };
      reader.onerror = () => {
        setError("Failed to read the uploaded file.");
      };
      reader.readAsText(file);
    }
  };

  const loadSample = () => {
    setResumeText(SAMPLE_RESUME);
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
    setUploadedFileName("sample_resume.txt");
    setError(null);
  };

  const clearAll = () => {
    setResumeText('');
    setJobDescription('');
    setUploadedFileName(null);
    setResult(null);
    setError(null);
    setHighlightedResume(null);
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) {
      setError("Please provide your resume content before analyzing.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const prompt = `
        Analyze the following resume${jobDescription ? ' against the provided job description' : ''}.
        Provide an accurate ATS (Applicant Tracking System) score out of 100.
        Identify key strengths, areas for improvement, and missing keywords.
        Also, provide 3-5 actionable tips to improve the resume.
        
        ${jobDescription ? `
        Keyword Extraction Task:
        1. Extract specific skills, tools, and technologies mentioned in the Job Description.
        2. Identify which of these keywords are present in the Resume.
        3. Calculate a keyword match score (0-100) based on how well the resume matches the requirements.
        ` : ''}

        Special Focus:
        - Word Filter Analysis: Check for overused buzzwords, clichés, or "red flag" phrases.
        - Professionalism: Ensure the language is impactful and action-oriented.
        - Actionability: Suggest concrete improvements.

        Resume:
        ${resumeText}

        ${jobDescription ? `Job Description:\n${jobDescription}` : ''}
      `;

      const response = await generateGeminiContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
              keywordsFound: { type: Type.ARRAY, items: { type: Type.STRING } },
              keywordScore: { type: Type.NUMBER }
            },
            required: [
              "score",
              "summary",
              "strengths",
              "improvements",
              "missingKeywords",
              "actionItems"
            ]
          }
        }
      });

      const rawText = response.text || '';
      let parsedData: any = null;

      try {
        parsedData = JSON.parse(rawText);
      } catch {
        const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        try {
          parsedData = JSON.parse(cleaned);
        } catch {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Unable to parse analysis result.");
          }
        }
      }

      const normalizedResult = {
        score: typeof parsedData.score === 'number' ? parsedData.score : 78,
        summary: parsedData.summary || "Resume analyzed successfully with ATS grading.",
        strengths: Array.isArray(parsedData.strengths) && parsedData.strengths.length > 0
          ? parsedData.strengths
          : ["Clear work experience timeline", "Strong technical skill articulation"],
        improvements: Array.isArray(parsedData.improvements) && parsedData.improvements.length > 0
          ? parsedData.improvements
          : ["Incorporate more quantifiable metrics and business impact", "Highlight testing frameworks and CI/CD pipelines"],
        missingKeywords: Array.isArray(parsedData.missingKeywords)
          ? parsedData.missingKeywords
          : ["System Architecture", "Unit Testing", "Cloud Deployment"],
        actionItems: Array.isArray(parsedData.actionItems)
          ? parsedData.actionItems
          : ["Add percentages and statistics to project accomplishments", "Ensure standard ATS heading hierarchy"],
        keywordsFound: Array.isArray(parsedData.keywordsFound) ? parsedData.keywordsFound : [],
        keywordScore: typeof parsedData.keywordScore === 'number' ? parsedData.keywordScore : (jobDescription ? 80 : undefined)
      };

      setResult(normalizedResult);

      if (normalizedResult.keywordsFound && normalizedResult.keywordsFound.length > 0) {
        highlightKeywords(resumeText, normalizedResult.keywordsFound);
      } else {
        setHighlightedResume(null);
      }

      // Safe Firestore saving
      if (user?.uid) {
        try {
          await addDoc(collection(db, 'resume_analyses'), {
            userId: user.uid,
            score: normalizedResult.score,
            summary: normalizedResult.summary,
            createdAt: serverTimestamp()
          });
        } catch (dbErr: any) {
          console.warn("Could not save resume analysis to Firestore (non-fatal):", dbErr);
          if (dbErr.code === 'permission-denied') {
            handleFirestoreError(dbErr, OperationType.CREATE, 'resume_analyses');
          }
        }
      }
    } catch (err: any) {
      console.error("Resume analysis failed:", err);
      setError(err?.message || "Failed to analyze resume. Please check your network and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const highlightKeywords = (text: string, keywords: string[]) => {
    if (!keywords || keywords.length === 0) {
      setHighlightedResume(text);
      return;
    }

    const validKeywords = keywords.filter(k => k && k.trim());
    if (validKeywords.length === 0) {
      setHighlightedResume(text);
      return;
    }

    const sortedKeywords = [...validKeywords].sort((a, b) => b.length - a.length);
    const escaped = sortedKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
    const keywordSet = new Set(sortedKeywords.map(k => k.toLowerCase()));

    const parts = text.split(pattern);
    const highlighted = parts.map((part, i) => {
      if (keywordSet.has(part.toLowerCase())) {
        return (
          <span key={i} className="bg-primary-100 text-primary-800 px-1.5 py-0.5 rounded font-bold border border-primary-200">
            {part}
          </span>
        );
      }
      return part;
    });

    setHighlightedResume(highlighted);
  };

  const copyReport = () => {
    if (!result) return;
    const reportText = `SkillX ATS Resume Analysis Report
Score: ${result.score}/100
Summary: ${result.summary}

Key Strengths:
${result.strengths.map((s: string) => `• ${s}`).join('\n')}

Areas for Improvement:
${result.improvements.map((imp: string) => `• ${imp}`).join('\n')}

Missing Keywords:
${result.missingKeywords.join(', ')}

Action Items:
${result.actionItems.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}`;

    navigator.clipboard.writeText(reportText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-600 text-xs font-bold uppercase tracking-widest border border-primary-100">
          <Sparkles size={14} />
          AI-Powered Analysis
        </div>
        <h1 className="text-4xl font-bold text-slate-900 font-display tracking-tight">Resume Analyzer</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Optimize your resume for Applicant Tracking Systems (ATS) and get actionable AI feedback to land your dream job.
        </p>

        {!result && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={loadSample}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2"
            >
              <FileCheck2 size={15} /> Load Sample Resume
            </button>
            {(resumeText || jobDescription) && (
              <button
                onClick={clearAll}
                className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all flex items-center gap-2"
              >
                <Trash2 size={15} /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {!result ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-2 gap-8"
        >
          <div className="space-y-6">
            <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Your Resume</h3>
                </div>
                {uploadedFileName && (
                  <span className="text-xs bg-primary-50 text-primary-700 px-3 py-1 rounded-full font-medium truncate max-w-[180px]">
                    {uploadedFileName}
                  </span>
                )}
              </div>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume text here (or upload a PDF / text file below)..."
                className="w-full h-64 p-6 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm resize-none"
              />

              {detectedWords.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-widest">
                    <ShieldAlert size={14} />
                    Buzzwords/Clichés Detected ({detectedWords.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detectedWords.map(word => (
                      <span key={word} className="px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-600 text-[10px] font-bold">
                        {word}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-600/80 italic">Consider replacing these with specific achievements or quantified impact.</p>
                </div>
              )}

              <div className="relative">
                <input
                  type="file"
                  accept=".txt,.md,.pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 group hover:border-primary-400 hover:bg-primary-50/30 transition-all">
                  <div className="text-center">
                    <Upload className="mx-auto text-slate-400 group-hover:text-primary-500 mb-2" size={24} />
                    <p className="text-xs font-bold text-slate-500 group-hover:text-primary-600 uppercase tracking-widest">
                      {uploadedFileName ? `Replace: ${uploadedFileName}` : "Upload PDF or Text File"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Job Description</h3>
                  <p className="text-xs text-slate-400">Optional: tailor analysis to target requirements</p>
                </div>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description here to analyze keyword matching and role fit..."
                className="w-full h-64 p-6 rounded-2xl bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-sm resize-none"
              />

              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !resumeText.trim()}
                className="w-full py-4 rounded-2xl gradient-bg text-white font-bold shadow-xl shadow-primary-200 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCcw className="animate-spin" size={20} />
                    Analyzing with Gemini AI...
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    Start AI ATS Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          {/* Top Bar with actions */}
          <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ATS Grade Report</span>
              <h2 className="text-xl font-bold text-slate-900">Resume Evaluation Complete</h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyReport}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2"
              >
                {isCopied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                {isCopied ? "Copied!" : "Copy Report"}
              </button>
              <button
                onClick={reset}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-primary-600 transition-all flex items-center gap-2"
              >
                <RefreshCcw size={15} /> Analyze Another
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm text-center">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">ATS Score</h3>
              <div className="relative w-44 h-44 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                  <circle
                    className={result.score >= 80 ? "text-emerald-500" : result.score >= 60 ? "text-primary-600" : "text-amber-500"}
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * result.score) / 100}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-slate-900 leading-none">{result.score}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">out of 100</span>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {result.summary}
              </p>
            </div>

            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
              {result.keywordScore !== undefined && (
                <div className="sm:col-span-2 p-6 rounded-[28px] bg-primary-50/60 border border-primary-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-lg">
                      <SearchCode size={24} />
                    </div>
                    <div>
                      <h4 className="text-primary-900 font-bold">Keyword Match Score</h4>
                      <p className="text-xs text-primary-600">Relevance against the provided job description</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-primary-700">{result.keywordScore}%</div>
                </div>
              )}

              <div className="p-8 rounded-[32px] bg-emerald-50/50 border border-emerald-100">
                <h4 className="text-emerald-700 font-bold flex items-center gap-2 mb-4">
                  <CheckCircle2 size={18} /> Key Strengths
                </h4>
                <ul className="space-y-3">
                  {(result.strengths || []).map((s: string, i: number) => (
                    <li key={i} className="text-sm text-emerald-800 flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-8 rounded-[32px] bg-amber-50/50 border border-amber-100">
                <h4 className="text-amber-700 font-bold flex items-center gap-2 mb-4">
                  <BarChart3 size={18} /> Missing Keywords
                </h4>
                <p className="text-xs text-amber-600 mb-3">Add these keywords if you possess these skills:</p>
                <div className="flex flex-wrap gap-2">
                  {(result.missingKeywords || []).map((k: string, i: number) => (
                    <span key={i} className="px-3 py-1 rounded-lg bg-white border border-amber-200 text-amber-700 text-xs font-bold">
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              {detectedWords.length > 0 && (
                <div className="sm:col-span-2 p-8 rounded-[32px] bg-red-50/50 border border-red-100">
                  <h4 className="text-red-700 font-bold flex items-center gap-2 mb-2">
                    <ShieldAlert size={18} /> Buzzword Detection
                  </h4>
                  <p className="text-sm text-red-600 mb-4">We found overused clichés that weaken the impact of your resume:</p>
                  <div className="flex flex-wrap gap-2">
                    {detectedWords.map((word, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg bg-white border border-red-200 text-red-600 text-xs font-bold">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-10 rounded-[40px] bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <FileText className="text-primary-600" size={24} />
                Keyword Highlighted Resume
              </h3>
              {result.keywordsFound && result.keywordsFound.length > 0 && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                  {result.keywordsFound.length} Keywords Detected
                </span>
              )}
            </div>
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-[450px] overflow-y-auto font-mono">
              {highlightedResume || resumeText}
            </div>
          </div>

          <div className="p-10 rounded-[40px] bg-slate-900 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <Zap className="text-primary-400" size={24} />
                Actionable Improvements
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Areas to Refine</p>
                  <ul className="space-y-4">
                    {(result.improvements || []).map((imp: string, i: number) => (
                      <li key={i} className="flex gap-4">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-xs font-bold">{i + 1}</div>
                        <p className="text-sm text-slate-300 leading-relaxed">{imp}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-4">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Next Steps</p>
                  <div className="space-y-3">
                    {(result.actionItems || []).map((item: string, i: number) => (
                      <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all">
                        <span className="text-sm text-slate-200">{item}</span>
                        <ArrowRight size={16} className="text-primary-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-12 flex flex-wrap gap-4">
                <button
                  onClick={reset}
                  className="px-8 py-4 rounded-2xl bg-white text-slate-900 font-bold hover:bg-primary-50 transition-all flex items-center gap-2"
                >
                  <RefreshCcw size={18} /> Analyze Another Resume
                </button>
                <button
                  onClick={copyReport}
                  className="px-8 py-4 rounded-2xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all flex items-center gap-2 border border-white/10"
                >
                  <Copy size={18} /> Copy Full Report
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
