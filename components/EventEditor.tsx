import React from 'react';
import { EventDetails } from '../types';
import { MapPin, AlignLeft, Calendar, Clock } from 'lucide-react';

interface EventEditorProps {
  eventDetails: EventDetails;
  uploadedImage?: string | null;
  onChange: (details: EventDetails) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const EventEditor: React.FC<EventEditorProps> = ({ eventDetails, uploadedImage, onChange, onConfirm, onCancel }) => {

  const handleChange = (field: keyof EventDetails, value: string | boolean | number) => {
    onChange({ ...eventDetails, [field]: value });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Uploaded Image Preview */}
      {uploadedImage && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <img
              src={`data:image/png;base64,${uploadedImage}`}
              alt="Uploaded event"
              className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Source Image
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Review Details</h2>
        </div>
        <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
          AI GENERATED
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Event Title
          </label>
          <input
            type="text"
            value={eventDetails.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none py-2 bg-transparent placeholder-gray-300 dark:placeholder-gray-600 transition-colors"
            placeholder="Untitled Event"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Start Date */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Starts
            </label>
            <input
              type="datetime-local"
              value={eventDetails.startDate.slice(0, 16)}
              onChange={(e) => handleChange('startDate', new Date(e.target.value).toISOString())}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-none transition-all"
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3 h-3" /> Ends
            </label>
            <input
              type="datetime-local"
              value={eventDetails.endDate.slice(0, 16)}
              onChange={(e) => handleChange('endDate', new Date(e.target.value).toISOString())}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-none transition-all"
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-3 h-3" /> Location
          </label>
          <input
            type="text"
            value={eventDetails.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-none transition-all"
            placeholder="Add location"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <AlignLeft className="w-3 h-3" /> Description
          </label>
          <textarea
            value={eventDetails.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-none min-h-[100px] resize-y transition-all"
            placeholder="Add notes or description"
          />
        </div>

        {/* Reminder */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
            🔔 Reminder
          </label>
          <select
            value={eventDetails.reminder || 0}
            onChange={(e) => handleChange('reminder', Number(e.target.value))}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-none transition-all"
          >
            <option value={0}>No reminder</option>
            <option value={15}>15 minutes before</option>
            <option value={30}>30 minutes before</option>
            <option value={60}>1 hour before</option>
            <option value={120}>2 hours before</option>
            <option value={1440}>1 day before</option>
            <option value={10080}>1 week before</option>
          </select>
        </div>
      </div>

      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-lg shadow-gray-200 dark:shadow-none"
        >
          Create Link
        </button>
      </div>
    </div>
  );
};

export default EventEditor;