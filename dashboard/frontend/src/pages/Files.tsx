import { useState, useEffect, useMemo } from "react";
import { FolderOpen, Folder, File, FileText, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import { useFileTree, useFileRead, useGitInfo } from "~/hooks/useQueries";
import { cn, formatBytes, formatTimestamp } from "~/lib/utils";
import type { FileEntry } from "~/api/types";

function getParentPath(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || "/";
}

function getName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

type TreeNodeEntry = FileEntry & { children: TreeNodeEntry[] };

function buildNode(path: string, allEntries: Map<string, FileEntry>): TreeNodeEntry {
  const entry = allEntries.get(path);
  const name = entry?.name ?? getName(path);
  const type = entry?.type ?? "dir";
  const size = entry?.size ?? null;
  const modified = entry?.modified ?? null;
  const symlink_target = entry?.symlink_target ?? null;

  const childPaths = Array.from(allEntries.keys()).filter((p) => getParentPath(p) === path);
  const children = childPaths
    .sort((a, b) => a.localeCompare(b))
    .map((cp) => buildNode(cp, allEntries));

  return { name, path, type, size, modified, symlink_target, children };
}

function FileIcon({ entry }: { entry: FileEntry }) {
  if (entry.type === "dir") {
    return <Folder className="w-4 h-4 text-[hsl(217,91%,60%)]" />;
  }
  if (entry.type === "symlink") {
    return <FileText className="w-4 h-4 text-[hsl(215,20%,65%)]" />;
  }
  const ext = entry.name.split(".").pop()?.toLowerCase();
  const codeExts = new Set([
    "ts", "tsx", "js", "jsx", "py", "rs", "go", "java", "c", "cpp", "h", "hpp",
    "cs", "rb", "php", "swift", "kt", "scala", "sh", "bash", "zsh", "ps1",
    "sql", "html", "css", "scss", "json", "yaml", "yml", "toml", "xml", "md",
    "txt", "log", "env", "gitignore", "dockerfile", "makefile", "nginx", "conf",
  ]);
  if (ext && codeExts.has(ext)) {
    return <FileText className="w-4 h-4 text-[hsl(213,31%,91%)]" />;
  }
  return <File className="w-4 h-4 text-[hsl(215,20%,65%)]" />;
}

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
  expandedDirs,
  onToggleDir,
}: {
  node: TreeNodeEntry;
  depth: number;
  selectedPath: string;
  onSelect: (path: string) => void;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
}) {
  const isDir = node.type === "dir";
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = selectedPath === node.path;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 cursor-pointer rounded text-sm select-none",
          isSelected
            ? "bg-[hsl(217,91%,60%)] text-white"
            : "text-[hsl(215,20%,65%)] hover:bg-[hsl(216,34%,17%)] hover:text-[hsl(213,31%,91%)]"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (isDir) {
            onToggleDir(node.path);
          } else {
            onSelect(node.path);
          }
        }}
      >
        {isDir && (isExpanded
          ? <ChevronDown className="w-3 h-3 flex-shrink-0" />
          : <ChevronRight className="w-3 h-3 flex-shrink-0" />
        )}
        {!isDir && <span className="w-3" />}
        <FileIcon entry={node} />
        <span className="truncate">{node.name}</span>
        {node.type === "symlink" && node.symlink_target && (
          <span className="text-xs text-[hsl(215,20%,65%)] ml-1">→ {node.symlink_target}</span>
        )}
      </div>
      {isDir && isExpanded && node.children.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
          expandedDirs={expandedDirs}
          onToggleDir={onToggleDir}
        />
      ))}
    </>
  );
}

function FileViewer({ path }: { path: string }) {
  const { data, isLoading, error } = useFileRead(path);

  useEffect(() => {
    if (data?.content) {
      const blocks = document.querySelectorAll("pre code");
      blocks.forEach((block) => {
        const el = block as HTMLElement;
        if (!el.dataset.highlighted) {
          hljs.highlightElement(el);
        }
      });
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-[hsl(215,20%,65%)] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-sm text-red-400">Failed to load file: {(error as Error).message}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(216,34%,17%)] bg-[hsl(223,47%,11%)]">
        <div className="flex items-center gap-4">
          <span className="text-sm text-[hsl(215,20%,65%)]">{formatBytes(data.size)}</span>
          {data.modified && (
            <span className="text-xs text-[hsl(215,20%,65%)]">
              Modified: {formatTimestamp(data.modified)}
            </span>
          )}
          {data.language && (
            <span className="text-xs px-2 py-0.5 rounded bg-[hsl(216,34%,17%)] text-[hsl(215,20%,65%)]">
              {data.language}
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {data.encoding === "base64" ? (
          <pre className="text-xs text-[hsl(215,20%,65%)] whitespace-pre-wrap">
            [Binary file — {formatBytes(data.size)}]
          </pre>
        ) : (
          <pre className="text-sm">
            <code className={`language-${data.language ?? "plaintext"}`}>
              {data.content}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}

export default function Files() {
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [allEntries, setAllEntries] = useState<Map<string, FileEntry>>(new Map());

  const { data: gitData } = useGitInfo();
  const rootPath = gitData?.workspace_path ?? "/";

  const effectiveRoot = currentPath === "/" ? rootPath : currentPath;

  const { data: treeResult, isLoading: treeLoading } = useFileTree(effectiveRoot);

  useEffect(() => {
    if (treeResult) {
      setAllEntries((prev) => {
        const next = new Map(prev);
        treeResult.entries.forEach((e) => next.set(e.path, e));
        return next;
      });
    }
  }, [treeResult]);

  const rootNode = useMemo<TreeNodeEntry | null>(() => {
    if (allEntries.size === 0) return null;
    return buildNode(effectiveRoot, allEntries);
  }, [allEntries, effectiveRoot]);

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    setSelectedFile(null);
  };

  const pathParts = currentPath.split("/").filter(Boolean);

  return (
    <div className="flex h-full">
      {/* File tree panel */}
      <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-[hsl(216,34%,17%)] bg-[hsl(223,47%,11%)]">
        <div className="px-3 py-2 border-b border-[hsl(216,34%,17%)]">
          <h2 className="text-sm font-semibold text-[hsl(213,31%,91%)]">Files</h2>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-3 py-2 text-xs text-[hsl(215,20%,65%)] border-b border-[hsl(216,34%,17%)] overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => navigateTo("/")}
            className="hover:text-[hsl(213,31%,91%)] transition-colors"
          >
            {rootPath.split("/").pop() || "/"}
          </button>
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-[hsl(216,34%,17%)]">/</span>
              <button
                onClick={() => navigateTo("/" + pathParts.slice(0, i + 1).join("/"))}
                className="hover:text-[hsl(213,31%,91%)] transition-colors"
              >
                {part}
              </button>
            </span>
          ))}
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-auto py-1">
          {treeLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-[hsl(215,20%,65%)] animate-spin" />
            </div>
          ) : !rootNode ? (
            <p className="text-xs text-[hsl(215,20%,65%)] px-3 py-2">Loading...</p>
          ) : rootNode.children.length === 0 ? (
            <p className="text-xs text-[hsl(215,20%,65%)] px-3 py-2">Empty directory</p>
          ) : (
            rootNode.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={0}
                selectedPath={selectedFile ?? ""}
                onSelect={(path) => setSelectedFile(path)}
                expandedDirs={expandedDirs}
                onToggleDir={toggleDir}
              />
            ))
          )}
        </div>
      </div>

      {/* File viewer panel */}
      <div className="flex-1 overflow-hidden bg-[hsl(224,71%,4%)]">
        {selectedFile ? (
          <FileViewer key={selectedFile} path={selectedFile} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FolderOpen className="w-12 h-12 text-[hsl(216,34%,17%)] mx-auto mb-3" />
              <p className="text-sm text-[hsl(215,20%,65%)]">Select a file to view its contents</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
