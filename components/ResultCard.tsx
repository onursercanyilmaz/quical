import React from 'react';
import { EventDetails } from '../types';
import { downloadICS, getGoogleCalendarUrl, getAppleCalendarDataUri, getOutlookCalendarUrl } from '../services/icsService';
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

  const googleUrl = getGoogleCalendarUrl(eventDetails);
  const appleDataUri = getAppleCalendarDataUri(eventDetails);
  const outlookUrl = getOutlookCalendarUrl(eventDetails);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-center max-w-md mx-auto shadow-sm">
      <div className="p-8 pb-0 flex flex-col items-center">
        <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-6">
          <Check className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Ready to Add</h2>
      </div>

      <div className="p-8">
        <div className="mb-6 text-left border-l-2 border-black pl-4 py-1">
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

        {/* Calendar Provider Options */}
        <div className="space-y-3 mb-6">
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium text-sm transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google Calendar
          </a>

          <a
            href={appleDataUri}
            download={`${eventDetails.title.replace(/\s+/g, '_')}.ics`}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium text-sm transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            Apple Calendar
          </a>

          <a
            href={outlookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium text-sm transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M24 7.387v10.478c0 .23-.08.424-.238.576-.16.156-.354.234-.578.234h-8.333v-6.09l1.458 1.042c.07.05.15.076.24.076.09 0 .17-.026.24-.076l1.25-.938.3-.208 5.15-3.72c.06-.042.1-.058.14-.058.07 0 .12.032.16.096.04.064.06.138.06.222v-2.634h.15z" fill="#0072C6" />
              <path d="M15 7.5l-.83.625-5.17 3.72-.3.21-1.25.945c-.07.05-.15.075-.24.075-.09 0-.17-.025-.24-.075L5.5 11.958V18.5h9.5V7.5z" fill="#0072C6" />
              <path d="M15 5.5H5.5v6.458l1.47-1.042c.07-.05.15-.076.24-.076.09 0 .17.026.24.076L9 12.083l.3.209 5.17 3.72.53.38V5.5z" fill="#0072C6" />
              <path d="M0 6.125v11.75c0 .17.06.316.18.434.12.118.27.178.45.178h9.37V5.513H.63c-.18 0-.33.06-.45.178-.12.118-.18.264-.18.434z" fill="#0072C6" />
              <path d="M5 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="white" />
            </svg>
            Outlook Calendar
          </a>
        </div>

        {/* Download ICS fallback */}
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white py-3.5 px-6 rounded-lg font-semibold text-sm transition-all mb-4"
        >
          <Download className="w-4 h-4" />
          Download .ics File
        </button>

        <p className="text-[10px] text-gray-400 mb-6 uppercase tracking-wide">
          Works with any calendar app
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