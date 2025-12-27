import React, { useState } from 'react';
import { ExternalLink, Briefcase, Loader2, PenTool, AlertCircle } from 'lucide-react';
import { generateApplicationData } from '../services/geminiService';
import { JobLink, InputData, ApplicationData, JobSearchResult } from '../types';
import { ApplicationModal } from './ApplicationModal';

interface JobSearchDisplayProps {
  results: JobSearchResult | null;
  resume: InputData;
}

export const JobSearch: React.FC<JobSearchDisplayProps> = ({ results, resume }) => {
  // State for Auto-Fill feature
  const [generatingForUri, setGeneratingForUri] = useState<string | null>(null);
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

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

  if (!results) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mt-8">
      <div className="flex items-center gap-3 mb-6 text-indigo-600">
        <Briefcase size={24} />
        <h2 className="text-xl font-bold">Job Search Results</h2>
      </div>

      {modalError && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 mb-6">
          <AlertCircle size={20} />
          <span>{modalError}</span>
        </div>
      )}

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
                <p className="mt-1">The AI might have only found generic list pages, or the domain didn't match.</p>
              </div>
            )}
        </div>
      </div>

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