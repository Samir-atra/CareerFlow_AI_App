import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { analyzeDocuments, findRelevantJobs } from './services/geminiService';
import { AnalysisResult, AnalysisStatus, InputData, JobSearchResult, JobLink } from './types';
import { Sparkles, ArrowRight, RefreshCw, AlertCircle, Search, Hash, Briefcase } from 'lucide-react';
import { PRESET_JOB_BOARDS } from './constants';
import { ApiKeyPromptModal } from './components/ApiKeyPromptModal';

// Declare window.aistudio to avoid TypeScript errors
// This block is removed as per coding guidelines, assuming window.aistudio is globally available.

const App: React.FC = () => {
  // Document Inputs
  const [resume, setResume] = useState<InputData>({ mimeType: 'text/plain', data: '' });
  const [coverLetter, setCoverLetter] = useState<InputData>({ mimeType: 'text/plain', data: '' });
  
  // Job Search Inputs
  const [targetUrl, setTargetUrl] = useState('');
  const [jobCount, setJobCount] = useState(5); // Default higher for better initial experience

  // State
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [jobResults, setJobResults] = useState<JobSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API Key Management State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyCheckDone, setApiKeyCheckDone] = useState(false);
  const [isInitialApiKeyCheck, setIsInitialApiKeyCheck] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          setIsInitialApiKeyCheck(true);
          setShowApiKeyModal(true);
        }
      }
      setApiKeyCheckDone(true);
    };
    checkApiKey();
  }, []);

  const handleOpenSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        setShowApiKeyModal(false); // Assume user selected key, close modal
        // After selecting, the environment variable API_KEY should be updated,
        // so `getClient()` in services/geminiService.ts will pick up the new key on the next call.
        // We don't need to re-run the previous failed action immediately, user can click Analyze again.
      } catch (e) {
        console.error("Failed to open API key selection dialog:", e);
        setError("Failed to open API key selection. Please try again or check your environment.");
      }
    } else {
      setError("API key selection mechanism not available in this environment.");
    }
  };

  const handleProcessAll = async () => {
    if (!resume.data || !coverLetter.data) {
      setError("Please provide both Resume and Cover Letter content.");
      return;
    }

    setStatus(AnalysisStatus.ANALYZING);
    setError(null);
    setAnalysisResult(null);
    setJobResults(null);
    setShowApiKeyModal(false); // Hide any existing API key prompts

    try {
      // 1. Start Analysis
      const analysisPromise = analyzeDocuments(resume, coverLetter);
      
      // Wait for analysis to get the best keywords
      const analysis = await analysisPromise;
      setAnalysisResult(analysis);

      // 2. Prepare Search Targets (Prioritized List)
      const tasks: { type: 'USER' | 'PRESET' | 'OPEN', url: string | null, priority: number, limit: number }[] = [];

      // High Priority: User provided URL
      if (targetUrl.trim()) {
        let url = targetUrl.trim();
        if (!url.startsWith('http')) {
          url = 'https://' + url;
        }
        tasks.push({ type: 'USER', url, priority: 1, limit: jobCount });
      }

      // Medium Priority: Presets
      // Round-robin distribution of jobCount across presets
      const presetDistribution = new Map<string, number>();
      for (let i = 0; i < jobCount; i++) {
         const url = PRESET_JOB_BOARDS[i % PRESET_JOB_BOARDS.length];
         presetDistribution.set(url, (presetDistribution.get(url) || 0) + 1);
      }
      
      presetDistribution.forEach((limit, url) => {
        // Avoid duplicate scanning if user entered a preset URL
        if (tasks.find(t => t.url === url)) return;
        tasks.push({ type: 'PRESET', url, priority: 2, limit });
      });

      // Low Priority: Open Search (General web search for keywords)
      // Fallback: request the full jobCount to ensure we find something if presets yield nothing
      tasks.push({ type: 'OPEN', url: null, priority: 3, limit: jobCount });

      // 3. Run Search in Parallel
      // We search all sources to ensure we can fill the requested quota with the best possible mix,
      // respecting the priority order in the final sort.
      const searchPromises = tasks.map(task => 
        findRelevantJobs(analysis.keywords, task.url, task.limit)
          .then(res => ({ ...res, priority: task.priority }))
          .catch(err => {
            console.warn(`Search failed for ${task.url || 'Open Search'}:`, err);
            // Re-throw if it's a quota error to be caught by the main handler
            if (err.message && err.message.includes("RESOURCE_EXHAUSTED")) {
              throw err; 
            }
            return { text: '', links: [] as JobLink[], priority: task.priority };
          })
      );

      const results = await Promise.all(searchPromises);

      // 4. Aggregate & Prioritize Results
      // Flatten the results and tag with priority
      const allLinks = results.flatMap(r => r.links.map(link => ({ ...link, priority: r.priority })));
      
      // Sort: Priority ascending (1 -> 2 -> 3)
      // This ensures User URL links come first, then Presets, then Open Search.
      allLinks.sort((a, b) => a.priority - b.priority);
      
      // Deduplicate by URI
      const uniqueLinks: JobLink[] = [];
      const seen = new Set<string>();
      
      for (const item of allLinks) {
        if (!seen.has(item.uri)) {
          seen.add(item.uri);
          uniqueLinks.push({ title: item.title, uri: item.uri });
        }
      }

      // Apply the total limit (waterfall fill)
      const finalLinks = uniqueLinks.slice(0, jobCount);

      const combinedResult: JobSearchResult = {
        text: "Aggregated Search Results",
        links: finalLinks
      };

      setJobResults(combinedResult);
      setStatus(AnalysisStatus.SUCCESS);

    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("RESOURCE_EXHAUSTED")) {
        setIsInitialApiKeyCheck(false); // It's an error, not initial check
        setShowApiKeyModal(true);
        setError("API Quota Exceeded. Please select a billing-enabled API key.");
      } else {
        setError(err.message || "An unexpected error occurred during processing.");
      }
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleEdit = () => {
    setAnalysisResult(null);
    setJobResults(null);
    setStatus(AnalysisStatus.IDLE);
    setError(null);
    setShowApiKeyModal(false);
    // Note: We do NOT clear resume, coverLetter, targetUrl, or jobCount here.
    // This allows the user to return to the editor with their data preserved.
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Sparkles size={20} className="text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">CareerFlow AI</span>
            </div>
            {(status === AnalysisStatus.SUCCESS || showApiKeyModal) && ( // Show reset even if modal is open for error
              <div className="flex items-center">
                <button 
                  onClick={handleProcessAll}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  <RefreshCw size={16} />
                  New Analysis
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Intro Header */}
        {status === AnalysisStatus.IDLE && !showApiKeyModal && ( // Only show intro if no modal
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Your AI Career Copilot
            </h1>
            <p className="text-lg text-slate-600">
              Provide your documents. We'll analyze your profile and find matching roles at <b>Google, Microsoft, Apple</b>, and any other target you specify.
            </p>
          </div>
        )}

        {/* Input Section - Only show when not viewing results and not showing API key modal */}
        {status !== AnalysisStatus.SUCCESS && !showApiKeyModal && (
          <div className={`transition-all duration-500 max-w-5xl mx-auto ${status === AnalysisStatus.ANALYZING ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            
            {/* Step 1: Documents */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">1</div>
                <h3 className="text-lg font-bold text-slate-800">Upload Documents</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FileUpload 
                  label="Resume" 
                  data={resume}
                  onChange={setResume}
                  placeholder="Paste your resume text here..."
                />
                <FileUpload 
                  label="Cover Letter" 
                  data={coverLetter}
                  onChange={setCoverLetter}
                  placeholder="Paste your cover letter text here..."
                />
              </div>
            </div>

            {/* Step 2: Job Search Parameters */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">2</div>
                <h3 className="text-lg font-bold text-slate-800">Job Target</h3>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                <p className="text-sm text-slate-600 mb-4 flex items-center gap-2">
                  <Briefcase size={16} />
                  <span>
                    We automatically search <span className="font-semibold text-slate-700">Google, Microsoft, and Apple</span>.
                    <br/>
                    Optionally add another specific job board URL below.
                  </span>
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search size={18} />
                    </div>
                    <input
                      type="text"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="e.g., jobs.netflix.com, boards.greenhouse.io/airbnb"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  
                  <div className="relative w-full sm:w-36">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Hash size={16} />
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={jobCount}
                      onChange={(e) => {
                        let val = parseInt(e.target.value);
                        if (isNaN(val)) val = 1;
                        if (val > 20) val = 20;
                        if (val < 1) val = 1;
                        setJobCount(val);
                      }}
                      placeholder="Qty"
                      className="w-full pl-9 pr-16 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-left"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-xs text-slate-400 font-medium border-l border-slate-200 pl-2">Total Jobs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={handleProcessAll}
                disabled={status === AnalysisStatus.ANALYZING || !resume.data || !coverLetter.data}
                className="group relative inline-flex items-center justify-center px-10 py-5 text-lg font-semibold text-white transition-all duration-200 bg-indigo-600 rounded-2xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-70 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                {status === AnalysisStatus.ANALYZING ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching Job Boards...
                  </>
                ) : (
                  <>
                    Analyze & Find Jobs
                    <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {status === AnalysisStatus.SUCCESS && analysisResult && (
          <AnalysisDisplay 
            result={analysisResult} 
            resume={resume} 
            jobResults={jobResults}
            onBack={handleEdit}
          />
        )}
      </main>

      {/* API Key Prompt Modal */}
      {apiKeyCheckDone && ( // Only render after initial check to avoid flash
        <ApiKeyPromptModal 
          isOpen={showApiKeyModal} 
          onClose={() => setShowApiKeyModal(false)} 
          onSelectKey={handleOpenSelectKey}
          initialCheck={isInitialApiKeyCheck}
        />
      )}
    </div>
  );
};

export default App;