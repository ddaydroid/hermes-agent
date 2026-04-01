import { NavLink } from "react-router-dom";
import { LayoutDashboard, MessagesSquare, FolderOpen, Cpu } from "lucide-react";
import { cn } from "~/lib/utils";

const tabs = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/sessions", label: "Sessions", Icon: MessagesSquare },
  { to: "/files", label: "Files", Icon: FolderOpen },
  { to: "/agents", label: "Agents", Icon: Cpu },
];

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-48 h-full bg-[hsl(223,47%,11%)] border-r border-[hsl(216,34%,17%)]">
      <div className="p-4 border-b border-[hsl(216,34%,17%)]">
        <h1 className="text-sm font-semibold text-[hsl(213,31%,91%)]">Hermes</h1>
        <p className="text-xs text-[hsl(215,20%,65%)]">Dashboard</p>
      </div>
      <nav className="flex-1 p-2">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 transition-colors",
                isActive
                  ? "bg-[hsl(217,91%,60%)] text-white"
                  : "text-[hsl(215,20%,65%)] hover:text-[hsl(213,31%,91%)] hover:bg-[hsl(216,34%,17%)]"
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
