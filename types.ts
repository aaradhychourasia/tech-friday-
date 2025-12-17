export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  groundingMetadata?: GroundingMetadata;
  isLoading?: boolean;
  attachment?: Attachment; // Allow messages to carry attachments (like generated images)
}

export interface GroundingMetadata {
  searchEntryPoint?: {
    renderedContent: string;
  };
  groundingChunks?: Array<{
    web?: {
      uri: string;
      title: string;
    };
  }>;
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  error: string | null;
}

export type Attachment = {
  file: File | null; // Null if from library or generated
  previewUrl: string;
  mimeType: string;
  type?: 'image' | 'video' | 'model';
  name?: string;
};