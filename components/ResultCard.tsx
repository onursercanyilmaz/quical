import React from 'react';
import { EventDetails } from '../types';
import { downloadICS } from '../services/icsService';
import { Download, RefreshCw, Check } from 'lucide-react';

interface ResultCardProps {
  eventDetails: EventDetails;
  onReset: () => void;
  showReset?: boolean;
}

const ResultCard: React.FC<ResultCardProps> = ({ eventDetails, onReset, showReset = true }) => {
  const handleDownload = () => {
    downloadICS(eventDetails);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-center max-w-md mx-auto shadow-sm">
      <div className="p-8 pb-0 flex flex-col items-center">
        <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-6">
          <Check className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Ready to Add</h2>
      </div>

      <div className="p-8">
        <div className="mb-8 text-left border-l-2 border-black pl-4 py-1">
          <h3 className="font-bold text-gray-900 text-lg leading-tight">{eventDetails.title}</h3>
          <p className="text-gray-500 text-sm mt-1">
            {new Date(eventDetails.startDate).toLocaleString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </p>
          {eventDetails.location && (
            <p className="text-gray-400 text-xs mt-1 truncate">{eventDetails.location}</p>
          )}
        </div>

        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white py-3.5 px-6 rounded-lg font-semibold text-sm transition-all mb-4"
        >
          <Download className="w-4 h-4" />
          Download Calendar File
        </button>

        <p className="text-[10px] text-gray-400 mb-8 uppercase tracking-wide">
          Compatible with Apple, Google & Outlook
        </p>

        {showReset && (
          <button
            onClick={onReset}
            className="text-gray-400 hover:text-black text-sm font-medium flex items-center justify-center gap-2 mx-auto transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Start Over
          </button>
        )}
      </div>
    </div>
  );
};

export default ResultCard;