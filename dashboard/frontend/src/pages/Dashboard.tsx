import { useActiveSessions, useSessionStats, useGitInfo } from "~/hooks/useQueries";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[hsl(223,47%,11%)] border border-[hsl(216,34%,17%)] rounded-lg p-4">
      <p className="text-xs text-[hsl(215,20%,65%)] mb-1">{label}</p>
      <p className="text-2xl font-mono font-semibold text-[hsl(213,31%,91%)]">{value}</p>
      {sub && <p className="text-xs text-[hsl(215,20%,65%)] mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data: activeData } = useActiveSessions();
  const { data: statsData } = useSessionStats();
  const { data: gitData } = useGitInfo();

  const stats = statsData?.stats;
  const activeSessions = activeData?.sessions ?? [];
  const gitInfo = gitData;

  const formatTokens = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` :
    String(n);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[hsl(213,31%,91%)]">Hermes Dashboard</h2>
        {stats && (
          <span className="text-xs text-[hsl(215,20%,65%)]">
            Token period: {stats.period}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Sessions" value={activeSessions.length} sub="sessions" />
        <StatCard label="Total Sessions" value={stats?.session_count ?? "—"} sub="this month" />
        <StatCard label="Input Tokens" value={formatTokens(stats?.input_tokens ?? 0)} sub="this month" />
        <StatCard label="Output Tokens" value={formatTokens(stats?.output_tokens ?? 0)} sub="this month" />
      </div>

      <div className="flex gap-4 flex-wrap">
        {gitInfo && gitInfo.is_repo && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[hsl(223,47%,11%)] border border-[hsl(216,34%,17%)] text-sm">
            <span className="text-[hsl(215,20%,65%)]">Git:</span>
            <span className="text-[hsl(213,31%,91%)]">{gitInfo.branch ?? "—"}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                gitInfo.status ? "bg-yellow-500" : "bg-green-500"
              }`}
            />
            <span className="text-[hsl(215,20%,65%)]">
              {gitInfo.status ? "dirty" : "clean"}
            </span>
          </div>
        )}
        {gitInfo?.last_commit && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[hsl(223,47%,11%)] border border-[hsl(216,34%,17%)] text-sm text-[hsl(215,20%,65%)]">
            <span>Last commit:</span>
            <span className="text-[hsl(213,31%,91%)]">
              {gitInfo.last_commit.message.slice(0, 60)}
            </span>
          </div>
        )}
      </div>

      {!stats && (
        <p className="text-sm text-[hsl(215,20%,65%)]">Loading dashboard data...</p>
      )}
    </div>
  );
}
