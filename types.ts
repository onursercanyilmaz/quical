export interface EventDetails {
  title: string;
  startDate: string; // ISO string YYYY-MM-DDTHH:mm:ss
  endDate: string;   // ISO string YYYY-MM-DDTHH:mm:ss
  location: string;
  description: string;
  allDay: boolean;
  reminder?: number; // Minutes before event to trigger reminder (e.g., 60 = 1 hour before)
  image?: string;    // Base64 string of the original image
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  REVIEW = 'REVIEW',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface AIError {
  message: string;
}