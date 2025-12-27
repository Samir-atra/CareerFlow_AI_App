import React, { useState, useMemo } from 'react';
import { ExternalLink, Briefcase, Loader2, PenTool, AlertCircle, Building2 } from 'lucide-react';
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

  const groupedLinks = useMemo(() => {
    const groups: Record<string, JobLink[]> = {};
    if (!results) return groups;
    
    results.links.forEach(link => {
      try {
        const url = new URL(link.uri);
        // Remove www. and get hostname
        const domain = url.hostname.replace(/^www\./, '');
        if (!groups[domain]) groups[domain] = [];
        groups[domain].push(link);
      } catch (e) {
        if (!groups['Other Links']) groups['Other Links'] = [];
        groups['Other Links'].push(link);
      }
    });
    return groups;
  }, [results]);

  if (!results) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 text-indigo-600">
          <Briefcase size={24} />
          <h2 className="text-xl font-bold">Found Opportunities</h2>
        </div>
        <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {results.links.length} Results
        </span>
      </div>

      {modalError && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 mb-6">
          <AlertCircle size={20} />
          <span>{modalError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
        
        {Object.keys(groupedLinks).length > 0 ? (
          Object.entries(groupedLinks).map(([domain, links]) => {
            const jobLinks = links as JobLink[];
            return (
              <div key={domain} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-slate-50/50 flex flex-col">
                {/* Domain Header */}
                <div className="bg-white p-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                      <Building2 size={16} />
                    </div>
                    <span className="font-semibold text-slate-800 truncate text-sm" title={domain}>
                      {domain}
                    </span>
                  </div>
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md shrink-0">
                    {jobLinks.length}
                  </span>
                </div>

                {/* Jobs List */}
                <div className="divide-y divide-slate-100 flex-1 flex flex-col">
                  {jobLinks.map((link, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => window.open(link.uri, '_blank')}
                      className="p-4 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-medium text-slate-700 truncate group-hover:text-indigo-600 transition-colors" title={link.title}>
                            {link.title}
                          </h4>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 w-full max-w-full">
                          <ExternalLink size={10} className="shrink-0" />
                          <span className="truncate">{link.uri}</span>
                        </div>
                      </div>

                      <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAutoFill(link);
                          }}
                          disabled={generatingForUri === link.uri}
                          className="shrink-0 flex items-center gap-2 px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait text-sm font-medium"
                          title="Auto-Fill Application"
                        >
                          {generatingForUri === link.uri ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span className="hidden sm:inline">Working...</span>
                            </>
                          ) : (
                            <>
                              <PenTool size={16} />
                              <span className="hidden sm:inline">Auto-Fill</span>
                            </>
                          )}
                        </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm">
            <p className="font-medium">No direct job links were found.</p>
            <p className="mt-1">Try refining your job target or checking the company's main career page.</p>
          </div>
        )}
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