export interface Session {
  id: string;
  source: string;
  user_id: string | null;
  model: string;
  model_config: string;
  system_prompt: string | null;
  parent_session_id: string | null;
  started_at: number;  // unix timestamp
  ended_at: number | null;
  end_reason: string | null;
  message_count: number;
  tool_call_count: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  reasoning_tokens: number;
  billing_provider: string | null;
  estimated_cost_usd: number;
  actual_cost_usd: number | null;
  cost_status: string;
  title: string | null;
}

export interface Message {
  id: number;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string | null;
  tool_call_id: string | null;
  tool_calls: ToolCall[] | null;
  tool_name: string | null;
  timestamp: number;
  token_count: number | null;
  finish_reason: string | null;
  reasoning: string | null;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface SessionEvent {
  session_id: string;
  message_id: number;
  role: string;
  content: string | null;
  tool_name: string | null;
  timestamp: number;
  token_count: number | null;
}

export interface SessionStats {
  period: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  reasoning_tokens: number;
  estimated_cost_usd: number;
  session_count: number;
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink";
  size: number | null;
  modified: number | null;
  symlink_target: string | null;
}

export interface GitInfo {
  workspace_path: string;
  is_repo: boolean;
  branch: string | null;
  status: string | null;
  last_commit: {
    hash: string;
    message: string;
    author: string;
    timestamp: number;
  } | null;
}

export interface AgentStatus {
  gateway_available: boolean;
  agents_count: number;
  uptime_seconds: number | null;
  subagent_budget_total: number | null;
  subagent_budget_remaining: number | null;
}

export interface LiveAgents {
  agents: LiveAgent[];
  gateway_uptime_seconds: number;
  gateway_started_at: number | null;
  max_concurrent_agents: number;
  subagent_budget_total: number;
  subagent_budget_remaining: number;
}

export interface LiveAgent {
  session_key: string;
  session_id: string;
  status: "running" | "idle" | "waiting";
  depth: number;
  iterations: number;
  input_tokens: number;
  output_tokens: number;
  started_at: number;
  active_tool_calls: ActiveToolCall[];
  children: string[];
}

export interface ActiveToolCall {
  tool_call_id: string;
  tool_name: string;
  status: string;
  started_at: number;
}

export interface Bookmark {
  name: string;
  path: string;
}
