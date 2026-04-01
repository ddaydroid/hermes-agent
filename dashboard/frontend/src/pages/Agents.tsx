import { useAgentsStatus } from "~/hooks/useQueries";
import { getLiveAgents } from "~/api/client";
import { useQuery } from "@tanstack/react-query";

function StatusBadge({ available }: { available: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
        available
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/20 text-red-400"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${available ? "bg-green-400" : "bg-red-400"}`}
      />
      {available ? "Online" : "Offline"}
    </span>
  );
}

function formatUptime(seconds: number | null): string {
  if (seconds === null) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTokens(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
         n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` :
         String(n);
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function LiveAgentRow({ agent }: { agent: import("~/api/types").LiveAgent }) {
  return (
    <div className="bg-[hsl(223,47%,11%)] border border-[hsl(216,34%,17%)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-[hsl(213,31%,91%)]">{agent.session_id.slice(0, 8)}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              agent.status === "running"
                ? "bg-blue-500/20 text-blue-400"
                : agent.status === "idle"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-gray-500/20 text-gray-400"
            }`}
          >
            {agent.status}
          </span>
          <span className="text-xs text-[hsl(215,20%,65%)]">depth {agent.depth}</span>
          <span className="text-xs text-[hsl(215,20%,65%)]">iter {agent.iterations}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[hsl(215,20%,65%)]">
          <span>In: {formatTokens(agent.input_tokens)}</span>
          <span>Out: {formatTokens(agent.output_tokens)}</span>
          <span>{formatTimestamp(agent.started_at)}</span>
        </div>
      </div>

      {agent.active_tool_calls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {agent.active_tool_calls.map((tc) => (
            <span
              key={tc.tool_call_id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[hsl(216,34%,17%)] text-[hsl(215,20%,65%)]"
            >
              <span className="w-1 h-1 rounded-full bg-orange-400" />
              {tc.tool_name}
            </span>
          ))}
        </div>
      )}

      {agent.children.length > 0 && (
        <div className="mt-2 flex items-center gap-2 text-xs text-[hsl(215,20%,65%)]">
          <span>children:</span>
          {agent.children.map((child) => (
            <span key={child} className="font-mono">{child.slice(0, 8)}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Agents() {
  const { data: statusData } = useAgentsStatus();

  const { data: liveData, isLoading: liveLoading } = useQuery({
    queryKey: ["agents", "live"],
    queryFn: getLiveAgents,
    refetchInterval: 3000,
    staleTime: 2000,
  });

  const status = statusData;
  const liveAgents = liveData?.agents ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[hsl(213,31%,91%)]">Agents</h2>
        {status && (
          <div className="flex items-center gap-3 text-sm">
            <StatusBadge available={status.gateway_available} />
            <span className="text-[hsl(215,20%,65%)]">
              Uptime: {formatUptime(status.uptime_seconds)}
            </span>
          </div>
        )}
      </div>

      {/* Gateway Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[hsl(223,47%,11%)] border border-[hsl(216,34%,17%)] rounded-lg p-4">
          <p className="text-xs text-[hsl(215,20%,65%)] mb-1">Gateway</p>
          <StatusBadge available={status?.gateway_available ?? false} />
        </div>
        <div className="bg-[hsl(223,47%,11%)] border border-[hsl(216,34%,17%)] rounded-lg p-4">
          <p className="text-xs text-[hsl(215,20%,65%)] mb-1">Total Agents</p>
          <p className="text-2xl font-mono font-semibold text-[hsl(213,31%,91%)]">
            {status?.agents_count ?? "—"}
          </p>
        </div>
        <div className="bg-[hsl(223,47%,11%)] border border-[hsl(216,34%,17%)] rounded-lg p-4">
          <p className="text-xs text-[hsl(215,20%,65%)] mb-1">Running</p>
          <p className="text-2xl font-mono font-semibold text-[hsl(213,31%,91%)]">
            {liveAgents.filter((a) => a.status === "running").length}
          </p>
        </div>
        <div className="bg-[hsl(223,47%,11%)] border border-[hsl(216,34%,17%)] rounded-lg p-4">
          <p className="text-xs text-[hsl(215,20%,65%)] mb-1">Budget Remaining</p>
          <p className="text-2xl font-mono font-semibold text-[hsl(213,31%,91%)]">
            {status?.subagent_budget_remaining != null
              ? `$${status.subagent_budget_remaining.toFixed(2)}`
              : "—"}
          </p>
        </div>
      </div>

      {/* Live Agents */}
      <div>
        <h3 className="text-sm font-medium text-[hsl(213,31%,91%)] mb-3">Live Agents</h3>
        {liveLoading ? (
          <p className="text-sm text-[hsl(215,20%,65%)]">Loading...</p>
        ) : liveAgents.length === 0 ? (
          <p className="text-sm text-[hsl(215,20%,65%)]">No active agents</p>
        ) : (
          <div className="space-y-2">
            {liveAgents.map((agent) => (
              <LiveAgentRow key={agent.session_key} agent={agent} />
            ))}
          </div>
        )}
      </div>

      {!status && (
        <p className="text-sm text-[hsl(215,20%,65%)]">Loading agent status...</p>
      )}
    </div>
  );
}
