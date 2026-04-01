import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSessions, useActiveSessions, useSessionStats } from "~/hooks/useQueries";
import { getSessionMessages } from "~/api/client";
import type { Session } from "~/api/types";

const PAGE_SIZE = 20;

function formatTokens(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` :
    String(n);
}

function useSessionMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ["session-messages", sessionId],
    queryFn: () => getSessionMessages(sessionId!),
    enabled: sessionId !== null,
    staleTime: 5000,
  });
}

function StatusBadge({ endedAt }: { endedAt: number | null }) {
  if (endedAt) {
    return <span className="text-[hsl(215,20%,65%)] text-xs">ended</span>;
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
      active
    </span>
  );
}

function SessionRow({ session, isExpanded, onClick }: { session: Session; isExpanded: boolean; onClick: () => void }) {
  const totalTokens = session.input_tokens + session.output_tokens;
  const startedTime = new Date(session.started_at * 1000).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <tr
        onClick={onClick}
        className="border-b border-[hsl(216,34%,17%)] hover:bg-[hsl(216,34%,20%)] cursor-pointer transition-colors"
      >
        <td className="py-2 px-3 font-mono text-xs text-[hsl(213,31%,91%)]">
          {session.id.slice(0, 16)}
        </td>
        <td className="py-2 px-3">
          <span className="text-xs px-2 py-0.5 rounded bg-[hsl(216,34%,25%)] text-[hsl(213,31%,91%)]">
            {session.source}
          </span>
        </td>
        <td className="py-2 px-3 text-xs text-[hsl(215,20%,65%)]">{session.model}</td>
        <td className="py-2 px-3 font-mono text-xs text-[hsl(213,31%,91%)] text-right">
          {session.message_count}
        </td>
        <td className="py-2 px-3 font-mono text-xs text-[hsl(213,31%,91%)] text-right">
          {formatTokens(totalTokens)}
        </td>
        <td className="py-2 px-3 font-mono text-xs text-[hsl(215,20%,65%)]">
          {startedTime}
        </td>
        <td className="py-2 px-3">
          <StatusBadge endedAt={session.ended_at} />
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <ExpandedMessages sessionId={session.id} />
          </td>
        </tr>
      )}
    </>
  );
}

function ExpandedMessages({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useSessionMessages(sessionId);

  if (isLoading) {
    return (
      <div className="px-4 py-3 bg-[hsl(223,47%,9%)] border-b border-[hsl(216,34%,17%)]">
        <p className="text-xs text-[hsl(215,20%,65%)]">Loading messages...</p>
      </div>
    );
  }

  const messages = data?.messages ?? [];
  const lastMessages = messages.slice(-5);

  return (
    <div className="px-4 py-3 bg-[hsl(223,47%,9%)] border-b border-[hsl(216,34%,17%)]">
      <p className="text-xs text-[hsl(215,20%,65%)] mb-2 uppercase tracking-wide">Messages</p>
      <div className="space-y-2">
        {lastMessages.map((msg) => (
          <div key={msg.id} className="flex gap-2 text-xs">
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                msg.role === "user"
                  ? "bg-blue-900/50 text-blue-300"
                  : msg.role === "assistant"
                  ? "bg-purple-900/50 text-purple-300"
                  : "bg-[hsl(216,34%,25%)] text-[hsl(215,20%,65%)]"
              }`}
            >
              {msg.role}
            </span>
            <span className="text-[hsl(213,31%,91%)] line-clamp-2 flex-1">
              {msg.content ?? (msg.tool_calls ? `[tool calls: ${msg.tool_calls.length}]` : "")}
            </span>
          </div>
        ))}
        {lastMessages.length === 0 && (
          <p className="text-xs text-[hsl(215,20%,65%)]">No messages</p>
        )}
      </div>
    </div>
  );
}

export default function Sessions() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data, isLoading, isError } = useSessions(PAGE_SIZE, page * PAGE_SIZE);
  const { data: activeData } = useActiveSessions();
  // prefetch stats for header context
  useSessionStats();

  if (isError) {
    return <p className="text-red-400 p-6">Failed to load sessions</p>;
  }

  if (isLoading) {
    return <p className="text-[hsl(215,20%,65%)] p-6">Loading sessions...</p>;
  }

  const sessions = data?.sessions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeCount = activeData?.sessions?.length ?? 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[hsl(213,31%,91%)]">
          Sessions {total > 0 && <span className="text-[hsl(215,20%,65%)] text-sm font-normal">({total} total{activeCount > 0 ? `, ${activeCount} active` : ""})</span>}
        </h2>
        <button
          onClick={() => {
            setExpandedId(null);
            setPage(0);
          }}
          className="text-xs px-3 py-1.5 rounded border border-[hsl(216,34%,17%)] text-[hsl(215,20%,65%)] hover:bg-[hsl(216,34%,20%)] transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="border border-[hsl(216,34%,17%)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[hsl(223,47%,11%)]">
              <th className="py-2 px-3 text-left text-xs font-medium text-[hsl(215,20%,65%)] uppercase tracking-wide">ID</th>
              <th className="py-2 px-3 text-left text-xs font-medium text-[hsl(215,20%,65%)] uppercase tracking-wide">Source</th>
              <th className="py-2 px-3 text-left text-xs font-medium text-[hsl(215,20%,65%)] uppercase tracking-wide">Model</th>
              <th className="py-2 px-3 text-right text-xs font-medium text-[hsl(215,20%,65%)] uppercase tracking-wide">Msg</th>
              <th className="py-2 px-3 text-right text-xs font-medium text-[hsl(215,20%,65%)] uppercase tracking-wide">Tokens</th>
              <th className="py-2 px-3 text-left text-xs font-medium text-[hsl(215,20%,65%)] uppercase tracking-wide">Started</th>
              <th className="py-2 px-3 text-left text-xs font-medium text-[hsl(215,20%,65%)] uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                isExpanded={expandedId === session.id}
                onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
              />
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[hsl(215,20%,65%)] text-sm">
                  No sessions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-[hsl(215,20%,65%)]">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs px-3 py-1.5 rounded border border-[hsl(216,34%,17%)] text-[hsl(215,20%,65%)] hover:bg-[hsl(216,34%,20%)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="text-xs px-3 py-1.5 rounded border border-[hsl(216,34%,17%)] text-[hsl(215,20%,65%)] hover:bg-[hsl(216,34%,20%)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
