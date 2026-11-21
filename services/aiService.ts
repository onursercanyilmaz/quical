import { EventDetails } from "../types";
import { AIConfig, getAIConfig } from "./aiConfig";
import {
  extractEventsFromImageOffline,
  extractEventsFromTextOffline,
} from "./offlineParserService";

const detectImageMimeType = (base64: string): string => {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBORw0KGgo")) return "image/png";
  if (base64.startsWith("UklGR")) return "image/webp";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  return "image/png";
};

const getErrorMessage = async (response: Response): Promise<string> => {
  try {
    const errorData = await response.json();
    if (Array.isArray(errorData) && errorData[0]?.error?.message) {
      return errorData[0].error.message;
    }
    return (
      errorData?.error?.message ||
      errorData?.message ||
      `API error: ${response.status} ${response.statusText}`
    );
  } catch {
    return `API error: ${response.status} ${response.statusText}`;
  }
};

const extractJsonCandidate = (text: string): string => {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  if (firstBrace === -1 && firstBracket === -1) {
    return cleaned;
  }

  const start =
    firstBrace === -1
      ? firstBracket
      : firstBracket === -1
      ? firstBrace
      : Math.min(firstBrace, firstBracket);

  const openChar = cleaned[start];
  const closeChar = openChar === "{" ? "}" : "]";
  const end = cleaned.lastIndexOf(closeChar);

  if (end > start) {
    return cleaned.slice(start, end + 1);
  }
  return cleaned;
};

const normalizeEvent = (raw: Partial<EventDetails>): EventDetails => {
  const now = new Date();
  const fallbackStart = now.toISOString().slice(0, 19);
  const fallbackEnd = new Date(now.getTime() + 3600000).toISOString().slice(0, 19);

  return {
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Untitled Event",
    startDate: typeof raw.startDate === "string" && raw.startDate.trim() ? raw.startDate.trim() : fallbackStart,
    endDate: typeof raw.endDate === "string" && raw.endDate.trim() ? raw.endDate.trim() : fallbackEnd,
    location: typeof raw.location === "string" ? raw.location : "",
    description: typeof raw.description === "string" ? raw.description : "",
    allDay: Boolean(raw.allDay),
    ...(typeof raw.reminder === "number" ? { reminder: raw.reminder } : {}),
  };
};

const parseEventResponse = (text: string): EventDetails[] => {
  const candidate = extractJsonCandidate(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (e) {
    console.error("Failed to parse AI response:", text, e);
    throw new Error("AI returned an invalid JSON response. Try another model or clearer input.");
  }

  let items: unknown[];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as { events?: unknown[] }).events)) {
    items = (parsed as { events: unknown[] }).events;
  } else if (parsed && typeof parsed === "object") {
    items = [parsed];
  } else {
    throw new Error("AI response did not contain any event data.");
  }

  const validItems = items.filter(
    (item): item is Partial<EventDetails> => Boolean(item) && typeof item === "object"
  );

  if (validItems.length === 0) {
    throw new Error("No events could be extracted from the input.");
  }

  return validItems.map(normalizeEvent);
};

const isLocalUrl = (url: string): boolean => {
  return url.includes("localhost") || url.includes("127.0.0.1");
};

const isGeminiNativeRequest = (config: AIConfig): boolean => {
  return (
    config.apiUrl.includes("generativelanguage.googleapis.com") &&
    !config.apiUrl.includes("/openai/")
  );
};

const validateConfig = (config: AIConfig, mode: "text" | "vision"): void => {
  if (!config.apiUrl) {
    throw new Error("API Endpoint URL is missing. Please configure it in Settings.");
  }
  if (!config.apiKey && !isLocalUrl(config.apiUrl) && config.provider !== "ollama") {
    throw new Error("API Key is missing. Please set the API key in Settings.");
  }
  const model = mode === "vision" ? config.visionModel : config.textModel;
  if (!model) {
    throw new Error(
      `${mode === "vision" ? "Vision" : "Text"} model is missing. Please select a model in Settings.`
    );
  }
};

const callGeminiNative = async (
  config: AIConfig,
  model: string,
  systemPrompt: string,
  userText: string,
  base64Image?: string
): Promise<string> => {
  const baseUrl = config.apiUrl.replace(/\/+$/, "");
  const endpoint = baseUrl.endsWith(":generateContent")
    ? baseUrl
    : `${baseUrl}/${encodeURIComponent(model)}:generateContent`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (base64Image) {
    parts.push({
      inlineData: {
        mimeType: detectImageMimeType(base64Image),
        data: base64Image,
      },
    });
  }
  parts.push({ text: userText });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errMsg = await getErrorMessage(response);
    console.error("Gemini API Error:", response.status, errMsg);
    throw new Error(errMsg);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text || "")
    .join("")
    .trim();

  if (!content) {
    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error(`Gemini blocked the request: ${blockReason}`);
    }
    throw new Error("No response content from Google Gemini.");
  }

  return content;
};

const callOpenAICompatible = async (
  config: AIConfig,
  model: string,
  systemPrompt: string,
  userText: string,
  base64Image?: string
): Promise<string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  if (config.apiUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = "https://Quical.ai";
    headers["X-Title"] = "Quical";
  }

  const userContent = base64Image
    ? [
        {
          type: "image_url",
          image_url: {
            url: `data:${detectImageMimeType(base64Image)};base64,${base64Image}`,
          },
        },
        {
          type: "text",
          text: userText,
        },
      ]
    : userText;

  const basePayload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  };

  const shouldTryJsonFormat = config.provider !== "ollama";
  const sendRequest = async (includeResponseFormat: boolean) => {
    const payload = includeResponseFormat
      ? { ...basePayload, response_format: { type: "json_object" } }
      : basePayload;

    return fetch(config.apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  };

  let response = await sendRequest(shouldTryJsonFormat);

  // Some providers/models reject response_format: { type: "json_object" } with 400
  if (!response.ok && response.status === 400 && shouldTryJsonFormat) {
    const errMsg = await getErrorMessage(response);
    if (/response_format|json_object|structured/i.test(errMsg)) {
      response = await sendRequest(false);
    } else {
      console.error("API Error status:", response.status, errMsg);
      throw new Error(errMsg);
    }
  }

  if (!response.ok) {
    const errMsg = await getErrorMessage(response);
    console.error("API Error status:", response.status, errMsg);
    throw new Error(errMsg);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response content from AI provider.");
  }

  return content;
};

const callAI = async (
  config: AIConfig,
  mode: "text" | "vision",
  systemPrompt: string,
  userText: string,
  base64Image?: string
): Promise<string> => {
  validateConfig(config, mode);
  const model = mode === "vision" ? config.visionModel : config.textModel;

  if (isGeminiNativeRequest(config)) {
    return callGeminiNative(config, model, systemPrompt, userText, base64Image);
  }
  return callOpenAICompatible(config, model, systemPrompt, userText, base64Image);
};

const buildImageSystemPrompt = (today: string, currentTime: string) =>
  `You are an intelligent assistant that extracts calendar event details from images (screenshots, flyers, posters, bills, invoices, handwritten notes, and general photos).
Today's date is: ${today}
Current time is: ${currentTime}

Analyze the image provided and extract ALL events found. For EACH event, extract:
- Title of the event (For bills/invoices, use the Payee or Service Name, e.g., "Electricity Bill", "Internet Invoice")
- Start date and time (ISO 8601 format). IMPORTANT: For bills/invoices, use the "Due Date" or "Payment Date" as the start date.
- End date and time (ISO 8601 format). If not specified, assume 1 hour duration.
- Location (Venue name or address)
- Description (Brief summary, key details, or amount due for bills e.g., "Amount: $50.00")
- All Day (boolean, true if it's an all-day event like a holiday or festival without specific hours)

IMPORTANT DATE & TIME RULES:
- If NO date is found in the image, use TODAY's date (${today}).
- If NO time/hours are found in the image, use the CURRENT time (${currentTime}).
- NEVER use past dates. If a date appears to be in the past, use the next future occurrence of that date.
- NEVER use past times for TODAY's events. If the event is today and the time is in the past, round to the next full hour from now.
- If the year is missing, assume the next occurrence of that date from today.
- For general photos (e.g. a schedule on a wall), infer the event details from any visible text.

IMPORTANT: Respond ONLY with a valid JSON object containing an "events" array:
{
  "events": [
    {
      "title": "Event Title",
      "startDate": "2024-12-25T19:00:00",
      "endDate": "2024-12-25T21:00:00",
      "location": "Venue Address",
      "description": "Brief description",
      "allDay": false
    }
  ]
}

If there is only ONE event, still return it in the events array. If there are MULTIPLE events, include all of them in the array.`;

const buildTextSystemPrompt = (today: string, currentTime: string) =>
  `You are an intelligent assistant that extracts calendar event details from text.
Today's date is: ${today}
Current time is: ${currentTime}

Analyze the text provided and extract ALL events found. For EACH event, extract:
- Title of the event
- Start date and time (ISO 8601 format)
- End date and time (ISO 8601 format). If not specified, assume 1 hour duration.
- Location (Venue name or address)
- Description (Brief summary or key details)
- All Day (boolean, true if it's an all-day event like a holiday or festival without specific hours)

IMPORTANT DATE & TIME RULES:
- If NO date is found in the text, use TODAY's date (${today}).
- If NO time/hours are found in the text, use the CURRENT time (${currentTime}).
- NEVER use past dates. If a date appears to be in the past, use the next future occurrence of that date.
- NEVER use past times for TODAY's events. If the event is today and the time is in the past, round to the next full hour from now.
- If the year is missing, assume the next occurrence of that date from today.

IMPORTANT: Respond ONLY with a valid JSON object containing an "events" array:
{
  "events": [
    {
      "title": "Event Title",
      "startDate": "2024-12-25T19:00:00",
      "endDate": "2024-12-25T21:00:00",
      "location": "Venue Address",
      "description": "Brief description",
      "allDay": false
    }
  ]
}

If there is only ONE event, still return it in the events array. If there are MULTIPLE events, include all of them in the array.`;

export const extractEventsFromImage = async (base64Image: string): Promise<EventDetails[]> => {
  const config = getAIConfig();
  if (config.provider === "offline") {
    return extractEventsFromImageOffline(base64Image);
  }
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().slice(0, 5);

  try {
    const content = await callAI(
      config,
      "vision",
      buildImageSystemPrompt(today, currentTime),
      "Extract ALL event details from this image. If there are multiple events, include all of them.",
      base64Image
    );

    const events = parseEventResponse(content);
    return events.map((event) => ({
      ...event,
      image: base64Image,
    }));
  } catch (error: unknown) {
    console.error("API Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process image. Please try again.";
    throw new Error(message);
  }
};

export const extractEventsFromText = async (text: string): Promise<EventDetails[]> => {
  const config = getAIConfig();
  if (config.provider === "offline") {
    return extractEventsFromTextOffline(text);
  }
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().slice(0, 5);

  try {
    const content = await callAI(
      config,
      "text",
      buildTextSystemPrompt(today, currentTime),
      `Extract ALL event details from this text. If there are multiple events, include all of them:\n\n${text}`
    );

    return parseEventResponse(content);
  } catch (error: unknown) {
    console.error("API Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process text. Please try again.";
    throw new Error(message);
  }
};

export interface ModelOption {
  value: string;
  label: string;
}

export interface ProviderModelsResult {
  textModels: ModelOption[];
  visionModels: ModelOption[];
}

const deriveModelsUrl = (apiUrl: string): string => {
  const trimmed = apiUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed.replace(/\/chat\/completions$/, "/models");
  }
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/models`;
  }
  try {
    const parsed = new URL(trimmed);
    return `${parsed.origin}/v1/models`;
  } catch {
    return `${trimmed}/models`;
  }
};

export const fetchProviderModels = async (
  provider: string,
  apiUrl: string,
  apiKey: string
): Promise<ProviderModelsResult> => {
  if (provider === "offline") {
    return { textModels: [], visionModels: [] };
  }

  const trimmedKey = apiKey.trim();

  if (provider === "gemini" || isGeminiNativeRequest({ provider, apiUrl, apiKey: trimmedKey, textModel: "", visionModel: "" })) {
    if (!trimmedKey) {
      throw new Error("Enter your Google Gemini API key to load models.");
    }
    const baseUrl = apiUrl.trim().replace(/\/+$/, "").replace(/\/openai\/chat\/completions$/, "/models");
    const modelsEndpoint = baseUrl.endsWith("/models")
      ? baseUrl
      : "https://generativelanguage.googleapis.com/v1beta/models";

    const response = await fetch(modelsEndpoint, {
      headers: { "x-goog-api-key": trimmedKey },
    });
    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }
    const data = await response.json();
    const rawModels: Array<{
      name?: string;
      displayName?: string;
      supportedGenerationMethods?: string[];
    }> = Array.isArray(data?.models) ? data.models : [];

    const options: ModelOption[] = rawModels
      .filter(
        (m) =>
          m.name &&
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes("generateContent") &&
          !m.name.includes("embedding") &&
          !m.name.includes("aqa")
      )
      .map((m) => {
        const id = m.name!.replace(/^models\//, "");
        return {
          value: id,
          label: m.displayName ? `${m.displayName} (${id})` : id,
        };
      })
      .sort((a, b) => a.value.localeCompare(b.value));

    if (options.length === 0) {
      throw new Error("No compatible Gemini models found for this API key.");
    }
    return { textModels: options, visionModels: options };
  }

  if (provider === "openrouter") {
    if (!trimmedKey) {
      throw new Error("Enter your OpenRouter API key to load models.");
    }
    // Validate key first since /models is public on OpenRouter
    const authRes = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${trimmedKey}` },
    });
    if (!authRes.ok) {
      throw new Error(await getErrorMessage(authRes));
    }

    const modelsUrl = deriveModelsUrl(apiUrl || "https://openrouter.ai/api/v1/chat/completions");
    const response = await fetch(modelsUrl, {
      headers: { Authorization: `Bearer ${trimmedKey}` },
    });
    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }
    const data = await response.json();
    const raw: Array<{
      id?: string;
      name?: string;
      architecture?: { modality?: string; input_modalities?: string[] };
    }> = Array.isArray(data?.data) ? data.data : [];

    const textModels: ModelOption[] = raw
      .filter((m) => m.id)
      .map((m) => ({
        value: m.id!,
        label: m.name && m.name !== m.id ? `${m.name} (${m.id})` : m.id!,
      }))
      .sort((a, b) => a.value.localeCompare(b.value));

    const visionModels: ModelOption[] = raw
      .filter((m) => {
        if (!m.id) return false;
        const modalities = m.architecture?.input_modalities || [];
        const modStr = m.architecture?.modality || "";
        return modalities.includes("image") || modStr.includes("image");
      })
      .map((m) => ({
        value: m.id!,
        label: m.name && m.name !== m.id ? `${m.name} (${m.id})` : m.id!,
      }))
      .sort((a, b) => a.value.localeCompare(b.value));

    if (textModels.length === 0) {
      throw new Error("No models returned from OpenRouter.");
    }
    return {
      textModels,
      visionModels: visionModels.length > 0 ? visionModels : textModels,
    };
  }

  if (provider === "ollama") {
    const baseOrigin = (() => {
      try {
        return new URL(apiUrl || "http://localhost:11434/v1/chat/completions").origin;
      } catch {
        return "http://localhost:11434";
      }
    })();

    const tagsRes = await fetch(`${baseOrigin}/api/tags`);
    if (tagsRes.ok) {
      const data = await tagsRes.json();
      const raw: Array<{ name?: string }> = Array.isArray(data?.models) ? data.models : [];
      const options = raw
        .filter((m) => m.name)
        .map((m) => ({ value: m.name!, label: m.name! }))
        .sort((a, b) => a.value.localeCompare(b.value));
      if (options.length === 0) {
        throw new Error("No local Ollama models found. Pull a model with `ollama pull ...`.");
      }
      return { textModels: options, visionModels: options };
    }
    throw new Error(`Could not connect to Ollama at ${baseOrigin}. Make sure Ollama is running.`);
  }

  // OpenAI, Groq, or Custom OpenAI-compatible provider
  if (!trimmedKey && provider !== "custom") {
    throw new Error("Enter your API key to load available models.");
  }

  const modelsUrl = deriveModelsUrl(apiUrl);
  const headers: Record<string, string> = {};
  if (trimmedKey) {
    headers["Authorization"] = `Bearer ${trimmedKey}`;
  }

  const response = await fetch(modelsUrl, { headers });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const data = await response.json();
  const rawList: Array<{ id?: string; name?: string }> = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.models)
    ? data.models
    : [];

  let ids = rawList
    .map((m) => m.id || m.name || "")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  if (provider === "openai") {
    const chatIds = ids.filter(
      (id) =>
        /^(gpt-|o1|o3|o4|chatgpt-)/i.test(id) &&
        !/(realtime|audio|transcribe|tts|instruct|search|image)/i.test(id)
    );
    if (chatIds.length > 0) ids = chatIds;
  } else if (provider === "groq") {
    const chatIds = ids.filter((id) => !/(whisper|tts|guard|playai)/i.test(id));
    if (chatIds.length > 0) ids = chatIds;
  }

  if (ids.length === 0) {
    throw new Error("No models returned from this provider.");
  }

  const allOptions = ids.map((id) => ({ value: id, label: id }));

  if (provider === "groq") {
    const visionIds = ids.filter((id) => /(vision|llama-4|scout|maverick)/i.test(id));
    return {
      textModels: allOptions,
      visionModels:
        visionIds.length > 0 ? visionIds.map((id) => ({ value: id, label: id })) : allOptions,
    };
  }

  return { textModels: allOptions, visionModels: allOptions };
};

export const testAIConnection = async (config: AIConfig): Promise<void> => {
  if (config.provider === "offline") {
    extractEventsFromTextOffline("Test meeting tomorrow at 15:00");
    return;
  }
  await callAI(
    config,
    "text",
    "You are a connectivity test assistant. Respond with valid JSON.",
    'Reply with {"ok": true}'
  );
};
