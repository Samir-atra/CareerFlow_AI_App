import React from 'react';
import { AnalysisResult, Skill, SkillType, InputData, JobSearchResult } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { BadgeCheck, Lightbulb, List, FileText, CheckCircle2, Search, ExternalLink, ArrowLeft } from 'lucide-react';
import { JobSearch } from './JobSearch';

interface AnalysisDisplayProps {
  result: AnalysisResult;
  resume: InputData;
  jobResults: JobSearchResult | null;
  onBack: () => void;
}

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6'];

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result, resume, jobResults, onBack }) => {
  const technicalSkills = result.topSkills.filter(s => s.type === SkillType.TECHNICAL).sort((a, b) => b.score - a.score).slice(0, 8);
  const softSkills = result.topSkills.filter(s => s.type === SkillType.SOFT).sort((a, b) => b.score - a.score).slice(0, 6);

  // Generate Smart Search Links based on extracted keywords
  const generateSearchLinks = () => {
    // Take top 3 keywords + "Job"
    const query = result.keywords.slice(0, 3).join(' ');
    const encodedQuery = encodeURIComponent(query);
    
    return [
      {
        name: 'LinkedIn Jobs',
        url: `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        name: 'Google Jobs',
        url: `https://www.google.com/search?q=${encodedQuery}+jobs&ibp=htl;jobs`,
        color: 'bg-red-500',
        textColor: 'text-red-600',
        bgColor: 'bg-red-50'
      },
      {
        name: 'Indeed',
        url: `https://www.indeed.com/jobs?q=${encodedQuery}`,
        color: 'bg-indigo-600',
        textColor: 'text-indigo-600',
        bgColor: 'bg-indigo-50'
      }
    ];
  };

  const smartLinks = generateSearchLinks();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Go Back Button */}
      <div className="flex justify-start">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl transition-all hover:shadow-md active:scale-95"
        >
          <ArrowLeft size={18} />
          Go Back to Editor
        </button>
      </div>

      {/* Header Summary */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4 text-indigo-600">
          <BadgeCheck size={24} />
          <h2 className="text-xl font-bold">Professional Summary</h2>
        </div>
        <p className="text-slate-700 leading-relaxed text-lg">
          {result.professionalSummary}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Technical Skills Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-96">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-2 text-slate-800">
                <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                <h3 className="font-bold text-lg">Technical Proficiency</h3>
             </div>
             <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded">Score (0-100)</span>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={technicalSkills}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                  {technicalSkills.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Soft Skills & Insights */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-96 overflow-hidden">
           <div className="flex items-center gap-2 text-slate-800 mb-6">
              <div className="w-2 h-6 bg-pink-500 rounded-full"></div>
              <h3 className="font-bold text-lg">Soft Skills & Qualities</h3>
           </div>
           
           <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
             <div className="flex flex-wrap gap-2 mb-6">
               {softSkills.map((skill, idx) => (
                 <span key={idx} className="px-3 py-1.5 bg-pink-50 text-pink-700 text-sm font-medium rounded-lg">
                   {skill.name}
                 </span>
               ))}
             </div>

             <div className="space-y-3">
               <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Insights</h4>
               {result.keyInsights.map((insight, idx) => (
                 <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                   <Lightbulb size={18} className="text-amber-500 mt-0.5 shrink-0" />
                   <p className="text-sm text-slate-700">{insight}</p>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Extracted Keywords & Smart Search */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 text-slate-800 mb-4">
                <List size={20} className="text-slate-400" />
                <h3 className="font-bold text-lg">Optimized Keywords</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((kw, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-default">
                    #{kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <div className="flex items-center gap-2 text-slate-800 mb-4">
                <Search size={18} className="text-indigo-500" />
                <h3 className="font-bold text-md">Instant Job Search</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {smartLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all hover:shadow-md ${link.bgColor} ${link.textColor}`}
                  >
                    {link.name}
                    <ExternalLink size={14} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Consistency Analysis */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-800 mb-4">
              <FileText size={20} className="text-slate-400" />
              <h3 className="font-bold text-lg">Match Analysis</h3>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
               <div className="flex gap-3">
                 <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                 <p className="text-emerald-800 text-sm leading-relaxed">
                   {result.matchAnalysis}
                 </p>
               </div>
            </div>
          </div>
      </div>

      {/* Job Search Section Results (Only shown if results exist) */}
      {jobResults && (
        <div className="pt-4 border-t border-slate-200">
          <JobSearch results={jobResults} resume={resume} />
        </div>
      )}
    </div>
  );
};