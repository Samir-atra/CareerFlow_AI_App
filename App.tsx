import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { analyzeDocuments } from './services/geminiService';
import { AnalysisResult, AnalysisStatus, InputData } from './types';
import { Sparkles, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [resume, setResume] = useState<InputData>({ mimeType: 'text/plain', data: '' });
  const [coverLetter, setCoverLetter] = useState<InputData>({ mimeType: 'text/plain', data: '' });
  
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!resume.data || !coverLetter.data) {
      setError("Please provide both Resume and Cover Letter content.");
      return;
    }

    setStatus(AnalysisStatus.ANALYZING);
    setError(null);

    try {
      const analysis = await analyzeDocuments(resume, coverLetter);
      setResult(analysis);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during analysis.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleReset = () => {
    setResult(null);
    setStatus(AnalysisStatus.IDLE);
    setError(null);
    setResume({ mimeType: 'text/plain', data: '' });
    setCoverLetter({ mimeType: 'text/plain', data: '' });
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
              Upload your resume and cover letter to analyze skills, discover relevant job openings, and auto-generate tailored application responses.
            </p>
          </div>
        )}

        {/* Input Section - Only show when not viewing results */}
        {status !== AnalysisStatus.SUCCESS && (
          <div className={`transition-all duration-500 ${status === AnalysisStatus.ANALYZING ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
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

            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={handleAnalyze}
                disabled={status === AnalysisStatus.ANALYZING || !resume.data || !coverLetter.data}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                {status === AnalysisStatus.ANALYZING ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Analyze & Start
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {status === AnalysisStatus.SUCCESS && result && (
          <AnalysisDisplay result={result} resume={resume} />
        )}
      </main>
    </div>
  );
};

export default App;