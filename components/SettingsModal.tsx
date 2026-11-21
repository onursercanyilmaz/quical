import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Shield,
  Cpu,
  Globe,
  Layers,
  Image,
  Type,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { PROVIDERS, getAIConfig, getDefaultAIConfig, normalizeApiUrl } from '../services/aiConfig';
import { fetchProviderModels, ModelOption, testAIConnection } from '../services/aiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const initial = getAIConfig();

  const [provider, setProvider] = useState<string>(initial.provider);
  const [apiUrl, setApiUrl] = useState<string>(initial.apiUrl);
  const [apiKey, setApiKey] = useState<string>(initial.apiKey);

  const [textModel, setTextModel] = useState<string>(initial.textModel);
  const [visionModel, setVisionModel] = useState<string>(initial.visionModel);

  const [availableTextModels, setAvailableTextModels] = useState<ModelOption[]>([]);
  const [availableVisionModels, setAvailableVisionModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string>('');

  const [showApiKey, setShowApiKey] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  const loadModels = useCallback(
    async (targetProvider: string, targetUrl: string, targetKey: string) => {
      if (targetProvider === 'offline') {
        setAvailableTextModels([]);
        setAvailableVisionModels([]);
        setModelsError('');
        setModelsLoading(false);
        return;
      }

      const needsKey = targetProvider !== 'ollama' && targetProvider !== 'custom';
      if (needsKey && !targetKey.trim()) {
        setAvailableTextModels([]);
        setAvailableVisionModels([]);
        setModelsError('');
        setModelsLoading(false);
        return;
      }

      if (!targetUrl.trim()) {
        setAvailableTextModels([]);
        setAvailableVisionModels([]);
        setModelsError('Enter an API Endpoint URL to load models.');
        setModelsLoading(false);
        return;
      }

      setModelsLoading(true);
      setModelsError('');
      try {
        const result = await fetchProviderModels(
          targetProvider,
          normalizeApiUrl(targetUrl, targetProvider),
          targetKey
        );
        setAvailableTextModels(result.textModels);
        setAvailableVisionModels(result.visionModels);

        const preset = PROVIDERS[targetProvider];
        setTextModel((prev) => {
          if (result.textModels.some((m) => m.value === prev)) return prev;
          if (preset && result.textModels.some((m) => m.value === preset.defaultTextModel)) {
            return preset.defaultTextModel;
          }
          return result.textModels[0]?.value || '';
        });

        setVisionModel((prev) => {
          if (result.visionModels.some((m) => m.value === prev)) return prev;
          if (preset && result.visionModels.some((m) => m.value === preset.defaultVisionModel)) {
            return preset.defaultVisionModel;
          }
          return result.visionModels[0]?.value || '';
        });
      } catch (err) {
        setAvailableTextModels([]);
        setAvailableVisionModels([]);
        setModelsError(err instanceof Error ? err.message : 'Failed to load models.');
      } finally {
        setModelsLoading(false);
      }
    },
    []
  );

  // Sync state when modal is opened
  useEffect(() => {
    if (isOpen) {
      const current = getAIConfig();
      setProvider(current.provider);
      setApiUrl(current.apiUrl);
      setApiKey(current.apiKey);
      setTextModel(current.textModel);
      setVisionModel(current.visionModel);
      setTestStatus('idle');
      setTestMessage('');
      setModelsError('');
    }
  }, [isOpen]);

  // Automatically fetch models after key / provider / url changes (debounced)
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      loadModels(provider, apiUrl, apiKey);
    }, 450);
    return () => clearTimeout(timer);
  }, [isOpen, provider, apiUrl, apiKey, loadModels]);

  if (!isOpen) return null;

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextProv = e.target.value;
    setProvider(nextProv);
    setAvailableTextModels([]);
    setAvailableVisionModels([]);
    setModelsError('');
    setTestStatus('idle');
    setTestMessage('');

    const config = PROVIDERS[nextProv];
    if (config && nextProv !== 'custom') {
      setApiUrl(config.defaultUrl);
      setTextModel(config.defaultTextModel);
      setVisionModel(config.defaultVisionModel);
    } else if (nextProv === 'custom') {
      setApiUrl('');
      setTextModel('');
      setVisionModel('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    localStorage.setItem('QUICAL_PROVIDER', provider);
    localStorage.setItem('QUICAL_API_URL', normalizeApiUrl(apiUrl, provider));
    localStorage.setItem('QUICAL_TEXT_MODEL', textModel.trim());
    localStorage.setItem('QUICAL_VISION_MODEL', visionModel.trim());
    localStorage.setItem('QUICAL_API_KEY', apiKey.trim());

    localStorage.removeItem('QUICAL_MODEL');
    localStorage.removeItem('QUICAL_OPENROUTER_MODEL');

    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
      onClose();
    }, 1000);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to application defaults?')) {
      localStorage.removeItem('QUICAL_PROVIDER');
      localStorage.removeItem('QUICAL_API_URL');
      localStorage.removeItem('QUICAL_TEXT_MODEL');
      localStorage.removeItem('QUICAL_VISION_MODEL');
      localStorage.removeItem('QUICAL_API_KEY');
      localStorage.removeItem('QUICAL_MODEL');
      localStorage.removeItem('QUICAL_OPENROUTER_API_URL');
      localStorage.removeItem('QUICAL_OPENROUTER_MODEL');
      localStorage.removeItem('QUICAL_OPENROUTER_API_KEY');

      const defaults = getDefaultAIConfig();
      setProvider(defaults.provider);
      setApiUrl(defaults.apiUrl);
      setApiKey(defaults.apiKey);
      setTextModel(defaults.textModel);
      setVisionModel(defaults.visionModel);
      setAvailableTextModels([]);
      setAvailableVisionModels([]);
      setModelsError('');
      setTestStatus('idle');
      setTestMessage('');

      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 1000);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    try {
      await testAIConnection({
        provider,
        apiUrl: normalizeApiUrl(apiUrl, provider),
        apiKey: apiKey.trim(),
        textModel: textModel.trim(),
        visionModel: visionModel.trim(),
      });
      setTestStatus('success');
      setTestMessage('Connection successful! AI provider responded.');
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err instanceof Error ? err.message : 'Connection failed.');
    }
  };

  const currentProviderConfig = PROVIDERS[provider] || PROVIDERS.custom;
  const isOffline = provider === 'offline';
  const isKeyRequired = provider !== 'ollama' && !isOffline;
  const waitingForKey = isKeyRequired && provider !== 'custom' && !apiKey.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div>
            <h3 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-gray-500" />
              AI Service Settings
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              BYOK: Keys are stored only in your browser&apos;s localStorage.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Provider Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              Provider / Mode
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

          {isOffline ? (
            <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <p className="font-semibold text-black dark:text-white">
                Offline Mode Active (No AI / No API Key)
              </p>
              <p>
                • <strong>Text:</strong> Uses <code className="font-mono">chrono-node</code> + Turkish &amp; English regex rules directly in your browser.
              </p>
              <p>
                • <strong>Images:</strong> Uses <code className="font-mono">Tesseract.js</code> OCR (<code className="font-mono">tur+eng</code>) to read text from images and extract events locally.
              </p>
            </div>
          ) : (
            <>
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
                    Get an API key from the{' '}
                    <a
                      href={currentProviderConfig.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-black dark:hover:text-white transition-colors"
                    >
                      Developer Dashboard
                    </a>
                    .
                  </p>
                )}
              </div>

              {/* Model Loading / Error Status */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Models
                </span>
                <button
                  type="button"
                  onClick={() => loadModels(provider, apiUrl, apiKey)}
                  disabled={modelsLoading || waitingForKey}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white disabled:opacity-40 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${modelsLoading ? 'animate-spin' : ''}`} />
                  Refresh Models
                </button>
              </div>

              {waitingForKey ? (
                <div className="bg-gray-50 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                  Enter your API key above to fetch and select available models for this provider.
                </div>
              ) : modelsLoading ? (
                <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading available models...
                </div>
              ) : modelsError ? (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3 flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modelsError}</span>
                </div>
              ) : (
                <>
                  {/* Text Model Selector */}
                  <div className="bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
                    <div className="flex items-center gap-2 text-black dark:text-white">
                      <Type className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold tracking-tight">1. Text Processing Model</span>
                    </div>
                    <select
                      value={textModel}
                      onChange={(e) => setTextModel(e.target.value)}
                      disabled={availableTextModels.length === 0}
                      required
                      className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all disabled:opacity-50"
                    >
                      {availableTextModels.length === 0 ? (
                        <option value="">No models available</option>
                      ) : (
                        availableTextModels.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-white dark:bg-gray-900">
                            {opt.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Vision Model Selector */}
                  <div className="bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
                    <div className="flex items-center gap-2 text-black dark:text-white">
                      <Image className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold tracking-tight">2. Image / Screenshot Model (Vision)</span>
                    </div>
                    <select
                      value={visionModel}
                      onChange={(e) => setVisionModel(e.target.value)}
                      disabled={availableVisionModels.length === 0}
                      required
                      className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all disabled:opacity-50"
                    >
                      {availableVisionModels.length === 0 ? (
                        <option value="">No vision models available</option>
                      ) : (
                        availableVisionModels.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-white dark:bg-gray-900">
                            {opt.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </>
              )}

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
            </>
          )}

          {testStatus !== 'idle' && (
            <div
              className={`rounded-lg p-3 flex items-center gap-2 text-xs font-medium border ${
                testStatus === 'testing'
                  ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  : testStatus === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-800 dark:text-red-400'
              }`}
            >
              {testStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {testStatus === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{testStatus === 'testing' ? 'Testing AI connection...' : testMessage}</span>
            </div>
          )}

          {showSavedToast && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg p-3 flex items-center justify-center text-sm font-medium text-emerald-800 dark:text-emerald-400 animate-pulse transition-all">
              Settings updated successfully!
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-black dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold tracking-tight transition-all duration-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold tracking-tight transition-all duration-200 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              Test
            </button>
          </div>

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
              disabled={!isOffline && (!textModel || !visionModel)}
              className="flex items-center gap-1.5 px-5 py-2 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-lg text-sm font-medium transition-all duration-200 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
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
