import React, { useRef } from 'react';
import { 
  X, 
  FolderOpen, 
  Trash2, 
  Download, 
  Upload, 
  Clock, 
  Film, 
  FileJson,
  CheckCircle2
} from 'lucide-react';
import { SavedProject } from '../types';
import { exportProjectToJson, importProjectFromJson } from '../utils/storage';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedProjects: SavedProject[];
  onLoadProject: (project: SavedProject) => void;
  onDeleteProject: (id: string) => void;
  currentProject: SavedProject;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  savedProjects,
  onLoadProject,
  onDeleteProject,
  currentProject,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      const imported = await importProjectFromJson(file);
      onLoadProject(imported);
      onClose();
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse project file');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-cinzel text-lg font-bold text-white">
                Saved Manga Projects
              </h3>
              <p className="text-[11px] text-zinc-400">
                Manage, restore, or export projects locally
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {importError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300">
            {importError}
          </div>
        )}

        {/* Project List */}
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {savedProjects.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-800">
              No saved projects yet. Click "Save" on the top bar to save your current work.
            </div>
          ) : (
            savedProjects.map((p) => {
              const isCurrent = p.id === currentProject.id;
              const formattedDate = new Date(p.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    isCurrent
                      ? 'bg-zinc-800 border-amber-500 shadow-md'
                      : 'bg-zinc-900 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white truncate">
                        {p.title}
                      </h4>
                      {isCurrent && (
                        <span className="text-[10px] bg-amber-500 text-zinc-950 px-1.5 py-0.2 rounded font-bold uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5">
                      <span>{p.scenes?.length || 0} Scenes</span>
                      <span>•</span>
                      <span>{p.language === 'hi' ? 'Hindi' : 'English'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => {
                          onLoadProject(p);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Load
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteProject(p.id)}
                      title="Delete saved project"
                      className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-zinc-700 border border-zinc-700 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* JSON Export & Import Section */}
        <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportProjectToJson(currentProject)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all cursor-pointer border border-zinc-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
