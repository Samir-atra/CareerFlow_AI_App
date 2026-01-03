import React from 'react';
import { X, Key, Info, ExternalLink } from 'lucide-react';

interface ApiKeyPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectKey: () => void;
  initialCheck?: boolean; // True if shown on initial load, false if due to error
}

export const ApiKeyPromptModal: React.FC<ApiKeyPromptModalProps> = ({ isOpen, onClose, onSelectKey, initialCheck = false }) => {
  if (!isOpen) return null;

  const handleSelectKeyClick = () => {
    onSelectKey();
    // Assume success and close the modal. App.tsx will retry the operation.
    onClose(); 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Key size={20} className="text-indigo-600" />
            {initialCheck ? "API Key Required" : "API Quota Exceeded"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-700">
          <p className="text-sm">
            A valid, billing-enabled Google Gemini API key is required for this application's functionality.
            {initialCheck 
              ? " Please select your API key to proceed."
              : " Your current key may have exceeded its quota or is not properly configured for billing."
            }
          </p>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
            <Info className="text-amber-600 mt-0.5 shrink-0" size={20} />
            <div>
              <h3 className="font-semibold text-amber-900 text-sm">Billing Information</h3>
              <p className="text-sm text-amber-700 mt-1">
                Ensure your selected API key is linked to a Google Cloud project with billing enabled.
                <br/>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-indigo-600 hover:underline flex items-center gap-1 mt-1 font-medium"
                >
                  Learn more about Gemini API billing
                  <ExternalLink size={14} />
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white">
          <button 
            onClick={handleSelectKeyClick}
            className="group relative inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white transition-all duration-200 bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 shadow-md hover:shadow-lg"
          >
            Select API Key
          </button>
        </div>
      </div>
    </div>
  );
};