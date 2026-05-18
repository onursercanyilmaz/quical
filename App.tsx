import React, { useState } from 'react';
import { AppState, EventDetails } from './types';
import { extractEventsFromImage, extractEventsFromText } from './services/openRouterService';
import Header from './components/Header';
import UploadZone from './components/UploadZone';
import TextInputZone from './components/TextInputZone';
import EventEditor from './components/EventEditor';
import ResultCard from './components/ResultCard';
import { SettingsModal } from './components/SettingsModal';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, Image, Type } from 'lucide-react';

type InputMode = 'screenshot' | 'text';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [inputMode, setInputMode] = useState<InputMode>('screenshot');
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleImagesSelected = async (base64Images: string[]) => {
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);
    setUploadedImages(base64Images);
    try {
      // Process all images and combine results
      const allEventsPromises = base64Images.map(img => extractEventsFromImage(img));
      const allEventsArrays = await Promise.all(allEventsPromises);
      const allEvents = allEventsArrays.flat();

      if (allEvents.length === 0) {
        throw new Error("No events found in the images.");
      }

      setEvents(allEvents);
      setCurrentEventIndex(0);
      setAppState(AppState.REVIEW);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        if (err.message.includes("API Key is missing")) {
          setErrorMsg("API Key is missing. Please configure your API key in the settings panel by clicking the gear icon at the top right.");
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg("We couldn't read the images. Please try clearer screenshots.");
      }
      setAppState(AppState.ERROR);
    }
  };

  const handleTextSubmit = async (text: string) => {
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);
    setUploadedImages([]);
    try {
      const extractedEvents = await extractEventsFromText(text);
      setEvents(extractedEvents);
      setCurrentEventIndex(0);
      setAppState(AppState.REVIEW);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        if (err.message.includes("API Key is missing")) {
          setErrorMsg("API Key is missing. Please configure your API key in the settings panel by clicking the gear icon at the top right.");
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg("We couldn't parse that text. Please try again with clearer event details.");
      }
      setAppState(AppState.ERROR);
    }
  };

  const handleDetailsChange = (details: EventDetails) => {
    setEvents(prev => {
      const updated = [...prev];
      updated[currentEventIndex] = details;
      return updated;
    });
  };

  const handleConfirm = () => {
    setAppState(AppState.SUCCESS);
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setEvents([]);
    setCurrentEventIndex(0);
    setErrorMsg(null);
    setUploadedImages([]);
  };

  const handleNextEvent = () => {
    if (currentEventIndex < events.length - 1) {
      setCurrentEventIndex(prev => prev + 1);
    }
  };

  const handlePrevEvent = () => {
    if (currentEventIndex > 0) {
      setCurrentEventIndex(prev => prev - 1);
    }
  };

  const currentEvent = events[currentEventIndex];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-200">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      <main className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-8 flex flex-col">
        {/* Intro Text */}
        {appState === AppState.IDLE && (
          <div className="text-center mb-8 mt-10">
            <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-6 tracking-tighter">
              Anything to<br />
              <span className="text-gray-400 dark:text-gray-500">Calendar Events</span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-md mx-auto leading-relaxed font-light">
              Upload a screenshot or paste text. We extract the details. You get a calendar file.
            </p>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col justify-center w-full">

          {appState === AppState.IDLE && (
            <div className="max-w-xl mx-auto w-full">
              {/* Input Mode Tabs */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <button
                  onClick={() => setInputMode('screenshot')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${inputMode === 'screenshot'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                >
                  <Image className="w-4 h-4" />
                  Screenshot
                </button>
                <button
                  onClick={() => setInputMode('text')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${inputMode === 'text'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                >
                  <Type className="w-4 h-4" />
                  Copy & Paste
                </button>
              </div>

              {/* Input Zone */}
              {inputMode === 'screenshot' ? (
                <UploadZone onImagesSelected={handleImagesSelected} />
              ) : (
                <TextInputZone onTextSubmit={handleTextSubmit} />
              )}

              {/* Demo hints */}
              <div className="mt-12 flex justify-center gap-8 text-center text-gray-400 dark:text-gray-600">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xl">📸</span>
                  <span className="text-xs uppercase tracking-widest">Screenshots</span>
                </div>
                <div className="w-px bg-gray-100 h-10"></div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xl">📩</span>
                  <span className="text-xs uppercase tracking-widest">Emails</span>
                </div>
                <div className="w-px bg-gray-100 h-10"></div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xl">🎫</span>
                  <span className="text-xs uppercase tracking-widest">Flyers</span>
                </div>
              </div>
            </div>
          )}

          {appState === AppState.ANALYZING && (
            <div className="text-center py-20">
              <Loader2 className="w-10 h-10 text-black dark:text-white animate-spin mx-auto mb-6" />
              <h3 className="text-lg font-medium text-black dark:text-white">Processing</h3>
              <p className="text-gray-400 dark:text-gray-500 mt-2 text-sm font-light">Analyzing dates and times...</p>
            </div>
          )}

          {appState === AppState.ERROR && (
            <div className="max-w-md mx-auto text-center bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-black dark:text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Processing Failed</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2 mb-8 text-sm">{errorMsg}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
                {errorMsg?.includes("API Key is missing") && (
                  <button
                    onClick={() => {
                      handleReset();
                      setIsSettingsOpen(true);
                    }}
                    className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Configure API Key
                  </button>
                )}
              </div>
            </div>
          )}

          {appState === AppState.REVIEW && currentEvent && (
            <div className="max-w-xl mx-auto w-full">
              {/* Event Navigation */}
              {events.length > 1 && (
                <div className="flex items-center justify-between mb-4 px-2">
                  <button
                    onClick={handlePrevEvent}
                    disabled={currentEventIndex === 0}
                    className={`flex items-center gap-1 text-sm font-medium transition-colors ${currentEventIndex === 0 ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed' : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                      }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-sm font-medium text-gray-500">
                    Event {currentEventIndex + 1} of {events.length}
                  </span>
                  <button
                    onClick={handleNextEvent}
                    disabled={currentEventIndex === events.length - 1}
                    className={`flex items-center gap-1 text-sm font-medium transition-colors ${currentEventIndex === events.length - 1 ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed' : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                      }`}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <EventEditor
                eventDetails={currentEvent}
                uploadedImage={uploadedImages[0]}
                onChange={handleDetailsChange}
                onConfirm={handleConfirm}
                onCancel={handleReset}
              />
            </div>
          )}

          {appState === AppState.SUCCESS && events.length > 0 && (
            <div className="max-w-xl mx-auto w-full">
              {/* Event Navigation */}
              {events.length > 1 && (
                <div className="flex items-center justify-between mb-4 px-2">
                  <button
                    onClick={handlePrevEvent}
                    disabled={currentEventIndex === 0}
                    className={`flex items-center gap-1 text-sm font-medium transition-colors ${currentEventIndex === 0 ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed' : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                      }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-sm font-medium text-gray-500">
                    Event {currentEventIndex + 1} of {events.length}
                  </span>
                  <button
                    onClick={handleNextEvent}
                    disabled={currentEventIndex === events.length - 1}
                    className={`flex items-center gap-1 text-sm font-medium transition-colors ${currentEventIndex === events.length - 1 ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed' : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                      }`}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <ResultCard
                eventDetails={events[currentEventIndex]}
                allEvents={events}
                onReset={handleReset}
                showReset={true}
              />
            </div>
          )}
        </div>
      </main>

      <footer className="py-8 text-center text-gray-300 dark:text-gray-700 text-xs uppercase tracking-widest">
        <p>Quical</p>
      </footer>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default App;