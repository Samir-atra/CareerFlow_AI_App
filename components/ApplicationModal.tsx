import React, { useState } from 'react';
import { ApplicationData } from '../types';
import { X, Copy, Check, Briefcase, User, FileText, ExternalLink } from 'lucide-react';

interface ApplicationModalProps {
  data: ApplicationData;
  jobTitle: string;
  jobUrl: string;
  onClose: () => void;
}

export const ApplicationModal: React.FC<ApplicationModalProps> = ({ data, jobTitle, jobUrl, onClose }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const FieldBlock = ({ label, value, id }: { label: string, value: string, id: string }) => (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-indigo-200 transition-colors group">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <button 
          onClick={() => handleCopy(value, id)}
          className="text-slate-400 hover:text-indigo-600 transition-colors opacity-60 group-hover:opacity-100"
          title="Copy to clipboard"
        >
          {copiedField === id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
        </button>
      </div>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{value || "Not found"}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Briefcase size={20} className="text-indigo-600" />
              Application Draft
            </h2>
            <p className="text-sm text-slate-500 mt-1">Generated content for <span className="font-medium text-slate-700">{jobTitle}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-200">
          
          <div className="flex flex-col gap-3">
             <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
                <FileText className="text-indigo-600 mt-0.5 shrink-0" size={20} />
                <div>
                   <h3 className="font-semibold text-indigo-900 text-sm">Ready to Apply</h3>
                   <p className="text-sm text-indigo-700 mt-1">
                      Review the generated content below. Copy and paste the responses into the job application form.
                   </p>
                </div>
                <a 
                  href={data.applyUrl || jobUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-auto px-4 py-2 bg-white text-indigo-600 text-xs font-bold uppercase tracking-wider rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm"
                >
                  Go to Job <ExternalLink size={12} />
                </a>
             </div>
          </div>

          {/* Personal Info Section */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-slate-800">
              <User size={18} className="text-indigo-500" />
              <h3 className="font-bold text-md">Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FieldBlock label="Full Name" value={data.personalInfo.fullName} id="name" />
               <FieldBlock label="Email" value={data.personalInfo.email} id="email" />
               <FieldBlock label="Phone" value={data.personalInfo.phone} id="phone" />
               <FieldBlock label="LinkedIn" value={data.personalInfo.linkedin} id="linkedin" />
               {data.personalInfo.website && <FieldBlock label="Portfolio/Website" value={data.personalInfo.website} id="website" />}
            </div>
          </section>

          {/* Responses Section */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-slate-800">
              <FileText size={18} className="text-indigo-500" />
              <h3 className="font-bold text-md">Tailored Responses</h3>
            </div>
            <div className="space-y-4">
              <FieldBlock label="Why do you want this job?" value={data.responses.whyThisRole} id="why" />
              <FieldBlock label="Relevant Experience" value={data.responses.relevantExperience} id="exp" />
              <FieldBlock label="Salary Expectation" value={data.responses.salaryExpectation} id="salary" />
              <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 relative group">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Cover Letter</span>
                   <button 
                      onClick={() => handleCopy(data.responses.coverLetter, 'cover')}
                      className="text-indigo-400 hover:text-indigo-700 transition-colors"
                   >
                      {copiedField === 'cover' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                   </button>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-serif">{data.responses.coverLetter}</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-400">
          Content generated by AI. Please review before submitting your application.
        </div>
      </div>
    </div>
  );
};