export type ProviderId = 'openrouter' | 'gemini' | 'openai' | 'groq' | 'ollama' | 'offline' | 'custom';

export interface ProviderConfig {
  name: string;
  defaultUrl: string;
  defaultTextModel: string;
  defaultVisionModel: string;
  keyUrl: string;
  keyPlaceholder: string;
  textModels: { value: string; label: string }[];
  visionModels: { value: string; label: string }[];
}

export interface AIConfig {
  provider: ProviderId | string;
  apiUrl: string;
  apiKey: string;
  textModel: string;
  visionModel: string;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
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
  gemini: {
    name: 'Google AI Studio (Gemini)',
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultTextModel: 'gemini-2.5-flash',
    defaultVisionModel: 'gemini-2.5-flash',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIzaSy...',
    textModels: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }
    ],
    visionModels: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }
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
  offline: {
    name: 'Offline / No AI (OCR + Regex Parser)',
    defaultUrl: '',
    defaultTextModel: 'chrono-node + TR Regex',
    defaultVisionModel: 'Tesseract.js (tur+eng)',
    keyUrl: '',
    keyPlaceholder: 'No API key needed',
    textModels: [],
    visionModels: []
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

const BROKEN_GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/chat/completions';

export const normalizeApiUrl = (url: string, provider: string): string => {
  const trimmed = url.trim();
  if (trimmed === BROKEN_GEMINI_URL) {
    return provider === 'gemini'
      ? PROVIDERS.gemini.defaultUrl
      : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  }
  return trimmed;
};

export const getDefaultAIConfig = (): AIConfig => {
  const envProvider = import.meta.env.VITE_AI_PROVIDER as string | undefined;
  // Default to offline (no API key required). Users can switch to any AI provider
  // and enter their own key (BYOK) in Settings, stored only in localStorage.
  const provider = envProvider && PROVIDERS[envProvider] ? envProvider : 'offline';
  const preset = PROVIDERS[provider] || PROVIDERS.offline;

  const defaultModel =
    import.meta.env.VITE_AI_MODEL ||
    import.meta.env.VITE_OPENROUTER_MODEL ||
    preset.defaultTextModel;

  return {
    provider,
    apiUrl:
      import.meta.env.VITE_AI_API_URL ||
      import.meta.env.VITE_OPENROUTER_API_URL ||
      preset.defaultUrl,
    apiKey: '',
    textModel: import.meta.env.VITE_AI_TEXT_MODEL || defaultModel,
    visionModel: import.meta.env.VITE_AI_VISION_MODEL || defaultModel,
  };
};

export const getAIConfig = (): AIConfig => {
  const defaults = getDefaultAIConfig();
  const provider = localStorage.getItem('QUICAL_PROVIDER') || defaults.provider;
  const preset = PROVIDERS[provider];

  const rawUrl =
    localStorage.getItem('QUICAL_API_URL') ||
    localStorage.getItem('QUICAL_OPENROUTER_API_URL') ||
    defaults.apiUrl ||
    preset?.defaultUrl ||
    '';

  const apiUrl = normalizeApiUrl(rawUrl, provider);

  const apiKey = (
    localStorage.getItem('QUICAL_API_KEY') ||
    localStorage.getItem('QUICAL_OPENROUTER_API_KEY') ||
    defaults.apiKey ||
    ''
  ).trim();

  const textModel = (
    localStorage.getItem('QUICAL_TEXT_MODEL') ||
    localStorage.getItem('QUICAL_MODEL') ||
    localStorage.getItem('QUICAL_OPENROUTER_MODEL') ||
    defaults.textModel ||
    preset?.defaultTextModel ||
    ''
  ).trim();

  const visionModel = (
    localStorage.getItem('QUICAL_VISION_MODEL') ||
    localStorage.getItem('QUICAL_MODEL') ||
    localStorage.getItem('QUICAL_OPENROUTER_MODEL') ||
    defaults.visionModel ||
    preset?.defaultVisionModel ||
    ''
  ).trim();

  return {
    provider,
    apiUrl,
    apiKey,
    textModel,
    visionModel,
  };
};
