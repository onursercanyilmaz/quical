import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Save, RotateCcw, Shield, Cpu, Globe, Layers, Image, Type } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProviderConfig {
  name: string;
  defaultUrl: string;
  defaultTextModel: string;
  defaultVisionModel: string;
  keyUrl: string;
  keyPlaceholder: string;
  textModels: { value: string; label: string }[];
  visionModels: { value: string; label: string }[];
}

const PROVIDERS: Record<string, ProviderConfig> = {
  openrouter: {
    name: 'OpenRouter (Default)',
    defaultUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultTextModel: 'google/gemini-2.5-flash',
    defaultVisionModel: 'google/gemini-2.5-flash',
    keyUrl: 'https://openrouter.ai/keys',
    keyPlaceholder: 'sk-or-v1-...',
    textModels: [
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'google/gemini-2.5-flash:free', label: 'Gemini 2.5 Flash (Free)' },
      { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct (Free)' },
      { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat (V3)' }
    ],
    visionModels: [
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'google/gemini-2.5-flash:free', label: 'Gemini 2.5 Flash (Free)' },
      { value: 'meta-llama/llama-3.2-11b-vision-instruct:free', label: 'Llama 3.2 11B Vision (Free)' },
      { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Premium)' }
    ]
  },
  openai: {
    name: 'OpenAI',
    defaultUrl: 'https://api.openai.com/v1/chat/completions',
    defaultTextModel: 'gpt-4o-mini',
    defaultVisionModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-proj-...',
    textModels: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
      { value: 'gpt-4o', label: 'GPT-4o (Premium)' }
    ],
    visionModels: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
      { value: 'gpt-4o', label: 'GPT-4o (Premium)' }
    ]
  },
  groq: {
    name: 'Groq',
    defaultUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultTextModel: 'llama-3.3-70b-versatile',
    defaultVisionModel: 'llama-3.2-11b-vision-preview',
    keyUrl: 'https://console.groq.com/keys',
    keyPlaceholder: 'gsk_...',
    textModels: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' }
    ],
    visionModels: [
      { value: 'llama-3.2-11b-vision-preview', label: 'Llama 3.2 11B Vision (Recommended)' },
      { value: 'llama-3.2-90b-vision-preview', label: 'Llama 3.2 90B Vision' }
    ]
  },
  gemini: {
    name: 'Google AI Studio (Gemini)',
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    defaultTextModel: 'gemini-2.5-flash',
    defaultVisionModel: 'gemini-2.5-flash',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIzaSy...',
    textModels: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }
    ],
    visionModels: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }
    ]
  },
  ollama: {
    name: 'Ollama (Local / Self-hosted)',
    defaultUrl: 'http://localhost:11434/v1/chat/completions',
    defaultTextModel: 'llama3.2',
    defaultVisionModel: 'llama3.2-vision',
    keyUrl: 'https://ollama.com',
    keyPlaceholder: 'No API key needed for Ollama (optional)',
    textModels: [
      { value: 'llama3.2', label: 'Llama 3.2' },
      { value: 'mistral', label: 'Mistral' }
    ],
    visionModels: [
      { value: 'llama3.2-vision', label: 'Llama 3.2 Vision' },
      { value: 'llava', label: 'LLaVA' }
    ]
  },
  custom: {
    name: 'Custom Provider',
    defaultUrl: '',
    defaultTextModel: '',
    defaultVisionModel: '',
    keyUrl: '',
    keyPlaceholder: 'Enter custom API Key...',
    textModels: [],
    visionModels: []
  }
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const defaultUrl = import.meta.env.VITE_OPENROUTER_API_URL || PROVIDERS.openrouter.defaultUrl;
  const defaultTextModel = import.meta.env.VITE_OPENROUTER_MODEL || PROVIDERS.openrouter.defaultTextModel;
  const defaultVisionModel = import.meta.env.VITE_OPENROUTER_MODEL || PROVIDERS.openrouter.defaultVisionModel;
  const defaultKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';

  const [provider, setProvider] = useState<string>(() => localStorage.getItem('QUICAL_PROVIDER') || 'openrouter');
  const [apiUrl, setApiUrl] = useState<string>(() => localStorage.getItem('QUICAL_API_URL') || localStorage.getItem('QUICAL_OPENROUTER_API_URL') || defaultUrl);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('QUICAL_API_KEY') || localStorage.getItem('QUICAL_OPENROUTER_API_KEY') || defaultKey);

  const [textModel, setTextModel] = useState<string>(() => localStorage.getItem('QUICAL_TEXT_MODEL') || localStorage.getItem('QUICAL_MODEL') || localStorage.getItem('QUICAL_OPENROUTER_MODEL') || defaultTextModel);
  const [visionModel, setVisionModel] = useState<string>(() => localStorage.getItem('QUICAL_VISION_MODEL') || localStorage.getItem('QUICAL_MODEL') || localStorage.getItem('QUICAL_OPENROUTER_MODEL') || defaultVisionModel);

  const [selectedTextPreset, setSelectedTextPreset] = useState<string>('');
  const [customTextModel, setCustomTextModel] = useState<string>('');

  const [selectedVisionPreset, setSelectedVisionPreset] = useState<string>('');
  const [customVisionModel, setCustomVisionModel] = useState<string>('');

  const [showApiKey, setShowApiKey] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Sync state when modal is opened
  useEffect(() => {
    if (isOpen) {
      const savedProv = localStorage.getItem('QUICAL_PROVIDER') || 'openrouter';
      const savedUrl = localStorage.getItem('QUICAL_API_URL') || localStorage.getItem('QUICAL_OPENROUTER_API_URL') || defaultUrl;
      const savedKey = localStorage.getItem('QUICAL_API_KEY') || localStorage.getItem('QUICAL_OPENROUTER_API_KEY') || defaultKey;
      
      const savedTextModel = localStorage.getItem('QUICAL_TEXT_MODEL') || localStorage.getItem('QUICAL_MODEL') || localStorage.getItem('QUICAL_OPENROUTER_MODEL') || defaultTextModel;
      const savedVisionModel = localStorage.getItem('QUICAL_VISION_MODEL') || localStorage.getItem('QUICAL_MODEL') || localStorage.getItem('QUICAL_OPENROUTER_MODEL') || defaultVisionModel;

      setProvider(savedProv);
      setApiUrl(savedUrl);
      setApiKey(savedKey);
      setTextModel(savedTextModel);
      setVisionModel(savedVisionModel);

      const config = PROVIDERS[savedProv];
      
      // Text Model Preset sync
      if (config && config.textModels) {
        const found = config.textModels.find(m => m.value === savedTextModel);
        if (found) {
          setSelectedTextPreset(savedTextModel);
          setCustomTextModel('');
        } else {
          setSelectedTextPreset('custom');
          setCustomTextModel(savedTextModel);
        }
      } else {
        setSelectedTextPreset('custom');
        setCustomTextModel(savedTextModel);
      }

      // Vision Model Preset sync
      if (config && config.visionModels) {
        const found = config.visionModels.find(m => m.value === savedVisionModel);
        if (found) {
          setSelectedVisionPreset(savedVisionModel);
          setCustomVisionModel('');
        } else {
          setSelectedVisionPreset('custom');
          setCustomVisionModel(savedVisionModel);
        }
      } else {
        setSelectedVisionPreset('custom');
        setCustomVisionModel(savedVisionModel);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle provider changes
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextProv = e.target.value;
    setProvider(nextProv);
    
    const config = PROVIDERS[nextProv];
    if (config) {
      if (nextProv !== 'custom') {
        setApiUrl(config.defaultUrl);
        setTextModel(config.defaultTextModel);
        setVisionModel(config.defaultVisionModel);

        if (config.textModels.length > 0) {
          setSelectedTextPreset(config.defaultTextModel);
          setCustomTextModel('');
        } else {
          setSelectedTextPreset('custom');
          setCustomTextModel(config.defaultTextModel);
        }

        if (config.visionModels.length > 0) {
          setSelectedVisionPreset(config.defaultVisionModel);
          setCustomVisionModel('');
        } else {
          setSelectedVisionPreset('custom');
          setCustomVisionModel(config.defaultVisionModel);
        }
      } else {
        setSelectedTextPreset('custom');
        setSelectedVisionPreset('custom');
      }
    }
  };

  const handleTextPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTextPreset(val);
    if (val !== 'custom') {
      setTextModel(val);
    } else {
      setTextModel(customTextModel);
    }
  };

  const handleCustomTextModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomTextModel(val);
    setTextModel(val);
  };

  const handleVisionPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedVisionPreset(val);
    if (val !== 'custom') {
      setVisionModel(val);
    } else {
      setVisionModel(customVisionModel);
    }
  };

  const handleCustomVisionModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomVisionModel(val);
    setVisionModel(val);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save settings individually
    localStorage.setItem('QUICAL_PROVIDER', provider);
    localStorage.setItem('QUICAL_API_URL', apiUrl.trim());
    localStorage.setItem('QUICAL_TEXT_MODEL', textModel.trim());
    localStorage.setItem('QUICAL_VISION_MODEL', visionModel.trim());
    localStorage.setItem('QUICAL_API_KEY', apiKey.trim());
    
    // Wipe single model configurations to prevent ambiguity
    localStorage.removeItem('QUICAL_MODEL');
    localStorage.removeItem('QUICAL_OPENROUTER_MODEL');

    // Show visual confirmation
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to application defaults?')) {
      // Clear localStorage
      localStorage.removeItem('QUICAL_PROVIDER');
      localStorage.removeItem('QUICAL_API_URL');
      localStorage.removeItem('QUICAL_TEXT_MODEL');
      localStorage.removeItem('QUICAL_VISION_MODEL');
      localStorage.removeItem('QUICAL_API_KEY');
      localStorage.removeItem('QUICAL_MODEL');
      localStorage.removeItem('QUICAL_OPENROUTER_API_URL');
      localStorage.removeItem('QUICAL_OPENROUTER_MODEL');
      localStorage.removeItem('QUICAL_OPENROUTER_API_KEY');

      // Reset local state to system env values
      setProvider('openrouter');
      setApiUrl(defaultUrl);
      setApiKey(defaultKey);
      setTextModel(defaultTextModel);
      setVisionModel(defaultVisionModel);

      // Reset text preset
      const foundText = PROVIDERS.openrouter.textModels.find(m => m.value === defaultTextModel);
      if (foundText) {
        setSelectedTextPreset(defaultTextModel);
        setCustomTextModel('');
      } else {
        setSelectedTextPreset('custom');
        setCustomTextModel(defaultTextModel);
      }

      // Reset vision preset
      const foundVision = PROVIDERS.openrouter.visionModels.find(m => m.value === defaultVisionModel);
      if (foundVision) {
        setSelectedVisionPreset(defaultVisionModel);
        setCustomVisionModel('');
      } else {
        setSelectedVisionPreset('custom');
        setCustomVisionModel(defaultVisionModel);
      }

      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 1000);
    }
  };

  const currentProviderConfig = PROVIDERS[provider] || PROVIDERS.custom;
  const isKeyRequired = provider !== 'ollama';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div>
            <h3 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-gray-500" />
              AI Service Settings
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Customize your AI provider, models, and endpoints. Saved locally.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body / Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Provider Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              AI Provider
            </label>
            <select
              value={provider}
              onChange={handleProviderChange}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            >
              {Object.entries(PROVIDERS).map(([key, value]) => (
                <option key={key} value={key} className="bg-white dark:bg-gray-900">
                  {value.name}
                </option>
              ))}
            </select>
          </div>

          {/* API Key Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-gray-400" />
              API Key {isKeyRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="relative rounded-lg shadow-sm">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={currentProviderConfig.keyPlaceholder}
                required={isKeyRequired}
                className="w-full pl-3 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {currentProviderConfig.keyUrl && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Get an API key from the <a href={currentProviderConfig.keyUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-black dark:hover:text-white transition-colors">Developer Dashboard</a>.
              </p>
            )}
          </div>

          {/* Text Model Selector */}
          <div className="bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-3">
            <div className="flex items-center gap-2 text-black dark:text-white">
              <Type className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold tracking-tight">1. Text Processing Model</span>
            </div>
            
            <div className="space-y-1.5">
              {currentProviderConfig.textModels.length > 0 ? (
                <select
                  value={selectedTextPreset}
                  onChange={handleTextPresetChange}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                >
                  {currentProviderConfig.textModels.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-white dark:bg-gray-900">
                      {opt.label}
                    </option>
                  ))}
                  <option value="custom" className="bg-white dark:bg-gray-900">Custom Model Name...</option>
                </select>
              ) : null}

              {(currentProviderConfig.textModels.length === 0 || selectedTextPreset === 'custom') && (
                <input
                  type="text"
                  value={customTextModel}
                  onChange={handleCustomTextModelChange}
                  placeholder="e.g. gpt-4o-mini"
                  required
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                />
              )}
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Active text model: <code className="font-mono text-gray-600 dark:text-gray-300">{textModel || '(none)'}</code>
              </p>
            </div>
          </div>

          {/* Vision Model Selector */}
          <div className="bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-3">
            <div className="flex items-center gap-2 text-black dark:text-white">
              <Image className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold tracking-tight">2. Image / Screenshot Model (Vision)</span>
            </div>
            
            <div className="space-y-1.5">
              {currentProviderConfig.visionModels.length > 0 ? (
                <select
                  value={selectedVisionPreset}
                  onChange={handleVisionPresetChange}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                >
                  {currentProviderConfig.visionModels.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-white dark:bg-gray-900">
                      {opt.label}
                    </option>
                  ))}
                  <option value="custom" className="bg-white dark:bg-gray-900">Custom Model Name...</option>
                </select>
              ) : null}

              {(currentProviderConfig.visionModels.length === 0 || selectedVisionPreset === 'custom') && (
                <input
                  type="text"
                  value={customVisionModel}
                  onChange={handleCustomVisionModelChange}
                  placeholder="e.g. gpt-4o or gemini-2.5-flash"
                  required
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                />
              )}
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Active vision model: <code className="font-mono text-gray-600 dark:text-gray-300">{visionModel || '(none)'}</code>. **Must** support image inputs.
              </p>
            </div>
          </div>

          {/* API Endpoint URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              API Endpoint URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.openai.com/v1/chat/completions"
              required
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            />
          </div>

          {showSavedToast && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg p-3 flex items-center justify-center text-sm font-medium text-emerald-800 dark:text-emerald-400 animate-pulse transition-all">
              Settings updated successfully!
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-black dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold tracking-tight transition-all duration-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-lg text-sm font-medium transition-all duration-200 shadow-md"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
