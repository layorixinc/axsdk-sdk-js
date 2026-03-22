export interface MessageTime {
  created: number;
  updated?: number;
  completed?: number;
}

export interface ChatSession {
  id: string;
  status: string;
  title: string;
  time: MessageTime;
}

export interface MessageModel {
  providerID: string;
  modelID: string;
}

export interface TokenInfo {
  total: number;
  input: number;
  output: number;
  reasoning: number;
  cache: {
    read: number;
    write: number;
  };
}

export interface OpenRouterReasoningDetail {
  type: string;
  text: string;
  format: string;
  index: number;
}

export interface OpenRouterMetadata {
  reasoning_details: OpenRouterReasoningDetail[];
}

export interface BasePart {
  type: string;
  id: string;
  sessionID: string;
  messageID: string;
}

export interface TextPart extends BasePart {
  type: "text" | "reasoning";
  text?: string;
  time: {
    start: number;
    end: number;
  };
}

export interface ReasoningPart extends TextPart {
  type: "reasoning";
  text?: string;
  metadata?: {
    openrouter: OpenRouterMetadata;
  };
}

export interface StepStartPart extends BasePart {
  type: "step-start";
  snapshot?: string;
  text?: string;
}

export interface StepFinishPart extends BasePart {
  type: "step-finish";
  text?: string;
  reason?: string;
  snapshot?: string;
  cost?: number;
  tokens?: TokenInfo;
}

export interface ToolPartState {
  status: string;
  input?: Record<string, unknown>;
  output?: string;
  title?: string;
  metadata?: Record<string, unknown>;
  time?: {
    start: number;
    end: number;
  };
}

export interface ToolPart extends BasePart {
  type: "tool";
  callID: string;
  tool: string;
  state: ToolPartState;
  metadata?: Record<string, unknown>;
}

export type MessagePart = TextPart | ReasoningPart | StepStartPart | StepFinishPart | ToolPart;

export interface MessageErrorData {
  message: string;
  statusCode: number;
  isRetryable: boolean;
  responseHeaders: Record<string, string>;
  responseBody: string;
  metadata: {
    url: string;
  };
}

export interface MessageError {
  name: string;
  data: MessageErrorData;
}

export interface UserMessageInfo {
  role: "user";
  time: MessageTime;
  error?: MessageError;
  agent: string;
  model: MessageModel;
  id: string;
  sessionID: string;
  finish?: string;
}

export interface AssistantMessageInfo {
  role: "assistant";
  time: MessageTime;
  error?: MessageError;
  agent: string;
  parentID?: string;
  modelID?: string;
  providerID?: string;
  mode?: string;
  cost?: number;
  tokens?: TokenInfo;
  finish?: string;
  id: string;
  sessionID: string;
}

export type MessageInfo = UserMessageInfo | AssistantMessageInfo;

export interface ChatMessagePayload {
  info: MessageInfo;
  parts: MessagePart[];
}

export interface ChatMessage {
  info: MessageInfo;
  parts?: MessagePart[];
  role?: string;
  timestamp?: Date | string | number;
  finish?: string;
}

export interface QuestionOption {
  label: string;
  description: string;
}

export interface Question {
  question: string;
  header: string;
  options: QuestionOption[];
}

export interface QuestionTool {
  messageID: string;
  callID: string;
}

export interface QuestionData {
  id: string;
  sessionID: string;
  questions: Question[];
  tool: QuestionTool;
}
