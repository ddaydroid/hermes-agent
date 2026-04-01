import { Routes, Route } from "react-router-dom";
import Sidebar from "~/components/layout/Sidebar";
import Dashboard from "~/pages/Dashboard";
import Sessions from "~/pages/Sessions";
import Files from "~/pages/Files";
import Agents from "~/pages/Agents";

export default function App() {
  return (
    <div className="flex h-full dark">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-[hsl(224,71%,4%)]">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/sessions/:sessionId" element={<Sessions />} />
          <Route path="/files" element={<Files />} />
          <Route path="/agents" element={<Agents />} />
        </Routes>
      </main>
    </div>
  );
}
