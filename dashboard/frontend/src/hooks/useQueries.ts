import { useQuery } from "@tanstack/react-query";
import {
  getSessions,
  getActiveSessions,
  getSessionStats,
  getFileTree,
  getFileRead,
  getGitInfo,
  getAgentsStatus,
} from "~/api/client";

const POLL_INTERVAL = 3000;
const STALE_TIME = 2000;

export function useSessions(limit = 20, offset = 0, source?: string) {
  return useQuery({
    queryKey: ["sessions", { limit, offset, source }],
    queryFn: () => getSessions({ limit, offset, source }),
    refetchInterval: POLL_INTERVAL,
    staleTime: STALE_TIME,
  });
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ["sessions", "active"],
    queryFn: () => getActiveSessions(),
    refetchInterval: POLL_INTERVAL,
    staleTime: STALE_TIME,
  });
}

export function useSessionStats() {
  return useQuery({
    queryKey: ["sessions", "stats"],
    queryFn: () => getSessionStats(),
    refetchInterval: POLL_INTERVAL,
    staleTime: STALE_TIME,
  });
}

export function useFileTree(path: string) {
  return useQuery({
    queryKey: ["files", "tree", path],
    queryFn: () => getFileTree(path),
    refetchInterval: POLL_INTERVAL,
    staleTime: STALE_TIME,
    enabled: path.length > 0,
  });
}

export function useFileRead(path: string) {
  return useQuery({
    queryKey: ["files", "read", path],
    queryFn: () => getFileRead(path),
    staleTime: STALE_TIME,
    enabled: path.length > 0,
  });
}

export function useGitInfo(workspace?: string) {
  return useQuery({
    queryKey: ["files", "git", workspace ?? "default"],
    queryFn: () => getGitInfo(workspace),
    staleTime: STALE_TIME,
  });
}

export function useAgentsStatus() {
  return useQuery({
    queryKey: ["agents", "status"],
    queryFn: () => getAgentsStatus(),
    refetchInterval: POLL_INTERVAL,
    staleTime: STALE_TIME,
  });
}
