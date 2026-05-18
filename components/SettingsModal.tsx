import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Save, RotateCcw, Shield, Cpu, Globe, Layers } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProviderConfig {
  name: string;
  defaultUrl: string;
  defaultModel: string;
  keyUrl: string;
  keyPlaceholder: string;
  models: { value: string; label: string }[];
}

const PROVIDERS: Record<string, ProviderConfig> = {
  openrouter: {
    name: 'OpenRouter (Default)',
    defaultUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'google/gemini-2.5-flash',
    keyUrl: 'https://openrouter.ai/keys',
    keyPlaceholder: 'sk-or-v1-...',
    models: [
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'google/gemini-2.5-flash:free', label: 'Gemini 2.5 Flash (Free)' },
      { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct (Free)' },
      { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Premium)' },
      { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat (V3)' }
    ]
  },
  openai: {
    name: 'OpenAI',
    defaultUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-proj-...',
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Recommended)' },
      { value: 'gpt-4o', label: 'GPT-4o (Premium)' }
    ]
  },
  groq: {
    name: 'Groq',
    defaultUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.2-11b-vision-preview',
    keyUrl: 'https://console.groq.com/keys',
    keyPlaceholder: 'gsk_...',
    models: [
      { value: 'llama-3.2-11b-vision-preview', label: 'Llama 3.2 11B Vision (Recommended)' },
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' }
    ]
  },
  gemini: {
    name: 'Google AI Studio (Gemini)',
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    defaultModel: 'gemini-2.5-flash',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIzaSy...',
    models: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }
    ]
  },
  ollama: {
    name: 'Ollama (Local / Self-hosted)',
    defaultUrl: 'http://localhost:11434/v1/chat/completions',
    defaultModel: 'llama3.2-vision',
    keyUrl: 'https://ollama.com',
    keyPlaceholder: 'No API key needed for Ollama (optional)',
    models: [
      { value: 'llama3.2-vision', label: 'Llama 3.2 Vision' },
      { value: 'llava', label: 'LLaVA' }
    ]
  },
  custom: {
    name: 'Custom Provider',
    defaultUrl: '',
    defaultModel: '',
    keyUrl: '',
    keyPlaceholder: 'Enter custom API Key...',
    models: []
  }
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const defaultUrl = import.meta.env.VITE_OPENROUTER_API_URL || PROVIDERS.openrouter.defaultUrl;
  const defaultModel = import.meta.env.VITE_OPENROUTER_MODEL || PROVIDERS.openrouter.defaultModel;
  const defaultKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';

  const [provider, setProvider] = useState<string>(() => localStorage.getItem('QUICAL_PROVIDER') || 'openrouter');
  const [apiUrl, setApiUrl] = useState<string>(() => localStorage.getItem('QUICAL_API_URL') || localStorage.getItem('QUICAL_OPENROUTER_API_URL') || defaultUrl);
  const [model, setModel] = useState<string>(() => localStorage.getItem('QUICAL_MODEL') || localStorage.getItem('QUICAL_OPENROUTER_MODEL') || defaultModel);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('QUICAL_API_KEY') || localStorage.getItem('QUICAL_OPENROUTER_API_KEY') || defaultKey);

  const [selectedModelPreset, setSelectedModelPreset] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>('');

  const [showApiKey, setShowApiKey] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Sync state when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      const savedProv = localStorage.getItem('QUICAL_PROVIDER') || 'openrouter';
      const savedUrl = localStorage.getItem('QUICAL_API_URL') || localStorage.getItem('QUICAL_OPENROUTER_API_URL') || defaultUrl;
      const savedModel = localStorage.getItem('QUICAL_MODEL') || localStorage.getItem('QUICAL_OPENROUTER_MODEL') || defaultModel;
      const savedKey = localStorage.getItem('QUICAL_API_KEY') || localStorage.getItem('QUICAL_OPENROUTER_API_KEY') || defaultKey;

      setProvider(savedProv);
      setApiUrl(savedUrl);
      setApiKey(savedKey);
      setModel(savedModel);

      const config = PROVIDERS[savedProv];
      if (config && config.models) {
        const found = config.models.find(m => m.value === savedModel);
        if (found) {
          setSelectedModelPreset(savedModel);
          setCustomModel('');
        } else {
          setSelectedModelPreset('custom');
          setCustomModel(savedModel);
        }
      } else {
        setSelectedModelPreset('custom');
        setCustomModel(savedModel);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle provider changes (update URL & Model defaults)
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextProv = e.target.value;
    setProvider(nextProv);
    
    const config = PROVIDERS[nextProv];
    if (config) {
      if (nextProv !== 'custom') {
        setApiUrl(config.defaultUrl);
        setModel(config.defaultModel);
        if (config.models.length > 0) {
          setSelectedModelPreset(config.defaultModel);
          setCustomModel('');
        } else {
          setSelectedModelPreset('custom');
          setCustomModel(config.defaultModel);
        }
      } else {
        setSelectedModelPreset('custom');
      }
    }
  };

  const handleModelPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedModelPreset(val);
    if (val !== 'custom') {
      setModel(val);
    } else {
      setModel(customModel);
    }
  };

  const handleCustomModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomModel(val);
    setModel(val);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save provider and parameters to localStorage
    localStorage.setItem('QUICAL_PROVIDER', provider);
    localStorage.setItem('QUICAL_API_URL', apiUrl.trim());
    localStorage.setItem('QUICAL_MODEL', model.trim());
    localStorage.setItem('QUICAL_API_KEY', apiKey.trim());

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
      localStorage.removeItem('QUICAL_MODEL');
      localStorage.removeItem('QUICAL_API_KEY');
      localStorage.removeItem('QUICAL_OPENROUTER_API_URL');
      localStorage.removeItem('QUICAL_OPENROUTER_MODEL');
      localStorage.removeItem('QUICAL_OPENROUTER_API_KEY');

      // Reset local state to system env values
      setProvider('openrouter');
      setApiUrl(defaultUrl);
      setApiKey(defaultKey);
      setModel(defaultModel);

      const found = PROVIDERS.openrouter.models.find(m => m.value === defaultModel);
      if (found) {
        setSelectedModelPreset(defaultModel);
        setCustomModel('');
      } else {
        setSelectedModelPreset('custom');
        setCustomModel(defaultModel);
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
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Provider Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-400" />
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
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
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Get an API key from the <a href={currentProviderConfig.keyUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-black dark:hover:text-white transition-colors">Developer Dashboard</a>.
              </p>
            )}
          </div>

          {/* Model Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-gray-400" />
              Model Name <span className="text-red-500">*</span>
            </label>
            
            {currentProviderConfig.models.length > 0 ? (
              <select
                value={selectedModelPreset}
                onChange={handleModelPresetChange}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
              >
                {currentProviderConfig.models.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-gray-900">
                    {opt.label}
                  </option>
                ))}
                <option value="custom" className="bg-white dark:bg-gray-900">Custom Model Name...</option>
              </select>
            ) : null}

            {(currentProviderConfig.models.length === 0 || selectedModelPreset === 'custom') && (
              <input
                type="text"
                value={customModel}
                onChange={handleCustomModelChange}
                placeholder="e.g. gpt-4o or claude-3-haiku"
                required
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
              />
            )}
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Selected model: <code className="font-mono text-gray-600 dark:text-gray-300">{model || '(none)'}</code>. Make sure this model is vision-capable if uploading screenshots.
            </p>
          </div>

          {/* API Endpoint URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
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
