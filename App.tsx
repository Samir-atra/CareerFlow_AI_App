import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { analyzeDocuments, findRelevantJobs } from './services/geminiService';
import { AnalysisResult, AnalysisStatus, InputData, JobSearchResult } from './types';
import { Sparkles, ArrowRight, RefreshCw, AlertCircle, Search, Hash, Briefcase } from 'lucide-react';

const App: React.FC = () => {
  // Document Inputs
  const [resume, setResume] = useState<InputData>({ mimeType: 'text/plain', data: '' });
  const [coverLetter, setCoverLetter] = useState<InputData>({ mimeType: 'text/plain', data: '' });
  
  // Job Search Inputs
  const [targetUrl, setTargetUrl] = useState('');
  const [jobCount, setJobCount] = useState(3);

  // State
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [jobResults, setJobResults] = useState<JobSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcessAll = async () => {
    if (!resume.data || !coverLetter.data) {
      setError("Please provide both Resume and Cover Letter content.");
      return;
    }

    setStatus(AnalysisStatus.ANALYZING);
    setError(null);
    setAnalysisResult(null);
    setJobResults(null);

    try {
      // 1. Start Analysis
      const analysisPromise = analyzeDocuments(resume, coverLetter);
      
      let searchPromise: Promise<JobSearchResult> | Promise<null> = Promise.resolve(null);

      // 2. Start Job Search (if URL provided)
      // We need to wait for keywords from analysis? 
      // Actually, strictly speaking, we can run them in parallel if we had keywords, 
      // but we need the analysis to get the best keywords.
      // However, to keep it fast, we can use the raw text or wait. 
      // Let's Wait for analysis first to get the *best* keywords for the search.
      
      const analysis = await analysisPromise;
      setAnalysisResult(analysis);

      // 3. Run Search if URL is present using the extracted keywords
      if (targetUrl.trim()) {
        let url = targetUrl.trim();
        if (!url.startsWith('http')) {
          url = 'https://' + url;
        }
        // Use the extracted keywords from the analysis
        const searchRes = await findRelevantJobs(analysis.keywords, url, jobCount);
        setJobResults(searchRes);
      }

      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during processing.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setJobResults(null);
    setStatus(AnalysisStatus.IDLE);
    setError(null);
    setResume({ mimeType: 'text/plain', data: '' });
    setCoverLetter({ mimeType: 'text/plain', data: '' });
    setTargetUrl('');
    setJobCount(3);
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
            {status === AnalysisStatus.SUCCESS && (
              <div className="flex items-center">
                <button 
                  onClick={handleReset}
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
        {status === AnalysisStatus.IDLE && (
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Your AI Career Copilot
            </h1>
            <p className="text-lg text-slate-600">
              Provide your documents and a target job board. We'll analyze your profile, find specific matching roles, and prepare your applications instantly.
            </p>
          </div>
        )}

        {/* Input Section - Only show when not viewing results */}
        {status !== AnalysisStatus.SUCCESS && (
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
                <h3 className="text-lg font-bold text-slate-800">Job Target (Optional)</h3>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                <p className="text-sm text-slate-600 mb-4 flex items-center gap-2">
                  <Briefcase size={16} />
                  Paste a "Collection Page" URL (e.g., generic careers page). We will find specific "Leaf Page" job postings for you.
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
                      placeholder="e.g., boards.greenhouse.io/airbnb, linkedin.com/jobs/search"
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
                      <span className="text-xs text-slate-400 font-medium border-l border-slate-200 pl-2">Max 20</span>
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
                    Processing...
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
          />
        )}
      </main>
    </div>
  );
};

export default App;