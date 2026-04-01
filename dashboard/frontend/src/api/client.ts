import type { Session, Message, SessionEvent, SessionStats, FileEntry, GitInfo, AgentStatus, LiveAgents, Bookmark } from "./types";

const BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function baseFetch<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  let url = BASE + path;
  if (params) {
    const searchParams = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    );
    const qs = searchParams.toString();
    if (qs) url += "?" + qs;
  }
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// Sessions
export async function getSessions(params: {
  limit?: number;
  offset?: number;
  source?: string;
}) {
  return baseFetch<{ sessions: Session[]; total: number; limit: number; offset: number }>("/sessions", params);
}

export async function getActiveSessions() {
  return baseFetch<{ sessions: Session[] }>("/sessions/active");
}

export async function getRecentEvents(limit = 20) {
  return baseFetch<{ events: SessionEvent[] }>("/sessions/events", { limit });
}

export async function getSession(sessionId: string) {
  return baseFetch<{ session: Session }>(`/sessions/${sessionId}`);
}

export async function getSessionMessages(sessionId: string) {
  return baseFetch<{ session_id: string; messages: Message[]; count: number }>(
    `/sessions/${sessionId}/messages`
  );
}

export async function getSessionStats() {
  return baseFetch<{ stats: SessionStats }>("/sessions/stats");
}

// Files
export async function getFileTree(path: string, recursive = false, childrenOf?: string) {
  const params: Record<string, string | number | undefined> = { path, recursive: recursive ? 1 : 0 };
  if (childrenOf) params["children_of"] = childrenOf;
  return baseFetch<{ path: string; entries: FileEntry[]; error: string | null }>("/files/tree", params);
  return baseFetch<{ path: string; entries: FileEntry[] }>("/files/tree", { path });
}

export async function getFileRead(path: string) {
  return baseFetch<{
    path: string;
    content: string;
    size: number;
    modified: number | null;
    encoding: string;
    language: string | null;
  }>("/files/read", { path });
}

export async function getGitInfo(workspace?: string) {
  return baseFetch<GitInfo>("/files/git", { workspace });
}

// Agents
export async function getAgentsStatus() {
  return baseFetch<AgentStatus>("/agents/status");
}

export async function getLiveAgents() {
  return baseFetch<LiveAgents>("/agents/live");
}

// Bookmarks
export async function getBookmarks() {
  return baseFetch<{ bookmarks: Bookmark[] }>("/files/bookmarks");
}
