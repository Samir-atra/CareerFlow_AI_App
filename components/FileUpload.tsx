import React, { useState, ChangeEvent, useRef } from 'react';
import { FileText, Clipboard, UploadCloud, X, FileType, Check } from 'lucide-react';
import * as mammoth from 'mammoth';
import { InputData } from '../types';

interface FileUploadProps {
  label: string;
  data: InputData;
  onChange: (data: InputData) => void;
  placeholder?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, data, onChange, placeholder }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Helper to determine if we are currently holding a binary file (like PDF)
  const isBinaryFile = data.mimeType === 'application/pdf';

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ mimeType: 'text/plain', data: e.target.value });
  };

  const handleClear = () => {
    onChange({ mimeType: 'text/plain', data: '' });
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64String = (event.target?.result as string).split(',')[1];
          onChange({
            mimeType: 'application/pdf',
            data: base64String,
            fileName: file.name
          });
          setIsProcessing(false);
          // Stay on upload tab for PDFs to show the success badge in the upload area
        };
        reader.readAsDataURL(file);
      } 
      else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        onChange({
          mimeType: 'text/plain',
          data: result.value,
          fileName: file.name
        });
        setIsProcessing(false);
        setActiveTab('paste'); // Switch to paste so they can see/edit the extracted text
      } 
      else {
        // Fallback for .txt, .md, etc.
        const text = await file.text();
        onChange({
          mimeType: 'text/plain',
          data: text,
          fileName: file.name
        });
        setIsProcessing(false);
        setActiveTab('paste');
      }
    } catch (error) {
      console.error("File processing error:", error);
      alert("Error processing file. Please try a different format or copy-paste content.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{label}</label>
        <div className="flex bg-slate-100 rounded-lg p-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'upload' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'paste' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Editor
          </button>
        </div>
      </div>

      <div className="relative group transition-all duration-200 ease-in-out">
        {activeTab === 'paste' ? (
          <div className="relative">
            {isBinaryFile ? (
               <div className="w-full h-64 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-white rounded-full shadow-sm mb-3">
                    <FileType className="text-indigo-600" size={32} />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800">{data.fileName}</h3>
                  <p className="text-sm text-slate-500 mt-1">PDF loaded successfully.</p>
                  <button 
                    onClick={handleClear}
                    className="mt-4 text-xs font-medium text-red-500 hover:text-red-700 hover:underline"
                  >
                    Remove File
                  </button>
               </div>
            ) : (
              <>
                <textarea
                  className="w-full h-64 p-4 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none shadow-sm text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent placeholder:text-slate-400"
                  placeholder={placeholder || "Paste content here..."}
                  value={data.data}
                  onChange={handleTextChange}
                />
                {data.data && (
                  <button
                    onClick={handleClear}
                    className="absolute top-2 right-2 p-1.5 bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Clear text"
                  >
                    <X size={14} />
                  </button>
                )}
                <div className="absolute bottom-4 right-4 text-slate-300 pointer-events-none">
                  <Clipboard size={20} />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="h-64 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors relative cursor-pointer overflow-hidden">
            <input
              type="file"
              accept=".txt,.md,.pdf,.docx"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={isProcessing}
            />
            
            {isProcessing ? (
               <div className="flex flex-col items-center gap-3 animate-pulse">
                 <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                 <p className="text-sm font-medium text-indigo-600">Processing file...</p>
               </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-6 text-center pointer-events-none">
                <div className="p-3 bg-white rounded-full shadow-sm text-indigo-500">
                  <UploadCloud size={28} />
                </div>
                <div>
                  <p className="font-medium text-slate-700">Click to upload or drag & drop</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT, or MD</p>
                </div>
                {data.data && (
                  <div className="mt-4 flex items-center gap-2 text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-medium">
                    <Check size={12} />
                    <span>{data.fileName || 'Content loaded'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};