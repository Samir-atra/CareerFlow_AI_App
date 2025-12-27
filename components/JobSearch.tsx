import React, { useState } from 'react';
import { Search, ExternalLink, Briefcase, Loader2, AlertCircle, Hash, Sparkles, PenTool } from 'lucide-react';
import { findRelevantJobs, generateApplicationData } from '../services/geminiService';
import { JobLink, InputData, ApplicationData } from '../types';
import { ApplicationModal } from './ApplicationModal';

interface JobSearchProps {
  keywords: string[];
  resume: InputData;
}

export const JobSearch: React.FC<JobSearchProps> = ({ keywords, resume }) => {
  const [targetUrl, setTargetUrl] = useState('');
  const [jobCount, setJobCount] = useState(3);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{ text: string, links: JobLink[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State for Auto-Fill feature
  const [generatingForUri, setGeneratingForUri] = useState<string | null>(null);
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;

    // Validate range
    let count = Math.max(1, Math.min(20, jobCount));
    if (isNaN(count)) count = 3;

    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      // Basic URL validation/cleanup
      let url = targetUrl.trim();
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      
      const searchResult = await findRelevantJobs(keywords, url, count);
      setResults(searchResult);
    } catch (err: any) {
      setError("Failed to perform search. Please check the URL and try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAutoFill = async (link: JobLink) => {
    if (!resume.data) {
       setModalError("Resume data is missing. Please upload a resume first.");
       return;
    }
    
    setGeneratingForUri(link.uri);
    setModalError(null);
    setSelectedJobTitle(link.title);

    try {
      const data = await generateApplicationData(resume, link.title, link.uri);
      setApplicationData(data);
    } catch (err) {
      setModalError("Failed to generate application content. Please try again.");
      console.error(err);
    } finally {
      setGeneratingForUri(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-6 text-indigo-600">
        <Briefcase size={24} />
        <h2 className="text-xl font-bold">Job Discovery</h2>
      </div>
      
      <p className="text-slate-600 mb-6">
        Paste a Company Careers Page or Job Board URL (a "Collection Page"). We will find specific "Leaf Page" job postings tailored to your skills.
      </p>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
             <Search size={18} />
           </div>
           <input
             type="text"
             value={targetUrl}
             onChange={(e) => setTargetUrl(e.target.value)}
             placeholder="e.g., boards.greenhouse.io/airbnb, linkedin.com/jobs/search"
             className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
           />
        </div>
        
        <div className="relative w-full sm:w-28">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
             <Hash size={16} />
           </div>
           <input
             type="number"
             min="1"
             max="20"
             value={jobCount}
             onChange={(e) => setJobCount(parseInt(e.target.value))}
             placeholder="Qty"
             className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
             title="Number of jobs to return (1-20)"
           />
        </div>

        <button
          type="submit"
          disabled={isSearching || !targetUrl.trim()}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg sm:w-auto w-full"
        >
          {isSearching ? <Loader2 className="animate-spin" size={20} /> : "Find Jobs"}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 mb-6">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      
      {modalError && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 mb-6">
          <AlertCircle size={20} />
          <span>{modalError}</span>
        </div>
      )}

      {results && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
          
          {/* Direct Links Section */}
          <div>
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
               Specific Opportunities Found
             </h3>
             {results.links.length > 0 ? (
               <div className="grid gap-3">
                 {results.links.map((link, idx) => (
                   <div
                     key={idx}
                     className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all group gap-4"
                   >
                     <div className="flex items-center gap-3 overflow-hidden flex-1">
                       <div className="bg-slate-100 p-2 rounded-lg text-slate-500 shrink-0">
                          <ExternalLink size={18} />
                       </div>
                       <div className="min-w-0">
                         <h4 className="font-medium text-slate-800 truncate" title={link.title}>{link.title}</h4>
                         <a href={link.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline truncate block">
                           {link.uri}
                         </a>
                       </div>
                     </div>
                     
                     <button
                       onClick={() => handleAutoFill(link)}
                       disabled={generatingForUri === link.uri}
                       className="shrink-0 flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-60"
                     >
                       {generatingForUri === link.uri ? (
                         <>
                           <Loader2 size={16} className="animate-spin" />
                           Generating...
                         </>
                       ) : (
                         <>
                           <PenTool size={16} />
                           Auto-Fill App
                         </>
                       )}
                     </button>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm">
                 <p className="font-medium">No direct "Leaf Page" links were found.</p>
                 <p className="mt-1">The AI might have only found generic list pages. Try being more specific with the URL (e.g. use the direct careers subdomain like `careers.airbnb.com` instead of just `airbnb.com`).</p>
               </div>
             )}
          </div>
        </div>
      )}

      {applicationData && (
        <ApplicationModal 
          data={applicationData} 
          jobTitle={selectedJobTitle}
          onClose={() => setApplicationData(null)} 
        />
      )}
    </div>
  );
};