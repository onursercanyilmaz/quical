import { EventDetails } from "../types";

const getApiUrl = () => {
  return localStorage.getItem('QUICAL_OPENROUTER_API_URL') || 
         import.meta.env.VITE_OPENROUTER_API_URL || 
         'https://openrouter.ai/api/v1/chat/completions';
};

const getModel = () => {
  return localStorage.getItem('QUICAL_OPENROUTER_MODEL') || 
         import.meta.env.VITE_OPENROUTER_MODEL || 
         'google/gemini-2.5-flash';
};

const getApiKey = () => {
  return localStorage.getItem('QUICAL_API_KEY') || 
         localStorage.getItem('QUICAL_OPENROUTER_API_KEY') || 
         import.meta.env.VITE_OPENROUTER_API_KEY || 
         '';
};

const getErrorMessage = async (response: Response): Promise<string> => {
  try {
    const errorData = await response.json();
    return errorData?.error?.message || errorData?.message || `API error: ${response.status}`;
  } catch {
    return `API error: ${response.status}`;
  }
};

const parseEventResponse = (text: string): EventDetails[] => {
  try {
    // Clean potential markdown code blocks
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    // Handle both single event object and array of events
    if (Array.isArray(parsed)) {
      return parsed as EventDetails[];
    } else if (parsed.events && Array.isArray(parsed.events)) {
      return parsed.events as EventDetails[];
    } else {
      // Single event object
      return [parsed as EventDetails];
    }
  } catch (e) {
    console.error("Failed to parse AI response", e);
    // Return a fallback empty event if parsing fails completely
    return [{
      title: "New Event",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 3600000).toISOString(),
      location: "",
      description: "",
      allDay: false
    }];
  }
};

export const extractEventsFromImage = async (base64Image: string): Promise<EventDetails[]> => {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();
  const model = getModel();

  if (!apiKey && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
    throw new Error("API Key is missing. Please set the API key in Settings.");
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  const systemPrompt = `You are an intelligent assistant that extracts calendar event details from images (screenshots, flyers, posters, bills, invoices, handwritten notes, and general photos).
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

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://Quical.ai", // Optional: for OpenRouter rankings
        "X-Title": "Quical" // Optional: for OpenRouter rankings
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`
                }
              },
              {
                type: "text",
                text: "Extract ALL event details from this image. If there are multiple events, include all of them."
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errMsg = await getErrorMessage(response);
      console.error("API Error status:", response.status, errMsg);
      throw new Error(errMsg);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      const events = parseEventResponse(content);
      // Attach the original image to each event
      return events.map(event => ({
        ...event,
        image: base64Image
      }));
    } else {
      throw new Error("No response content from OpenRouter.");
    }
  } catch (error: any) {
    console.error("API Error:", error);
    throw new Error(error.message || "Failed to process image. Please try again.");
  }
};

// Extract events from pasted/typed text
export const extractEventsFromText = async (text: string): Promise<EventDetails[]> => {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();
  const model = getModel();

  if (!apiKey && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
    throw new Error("API Key is missing. Please set the API key in Settings.");
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  const systemPrompt = `You are an intelligent assistant that extracts calendar event details from text.
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

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://Quical.ai",
        "X-Title": "Quical"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Extract ALL event details from this text. If there are multiple events, include all of them:\n\n${text}`
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errMsg = await getErrorMessage(response);
      console.error("API Error status:", response.status, errMsg);
      throw new Error(errMsg);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      return parseEventResponse(content);
    } else {
      throw new Error("No response content from OpenRouter.");
    }
  } catch (error: any) {
    console.error("API Error:", error);
    throw new Error(error.message || "Failed to process text. Please try again.");
  }
};