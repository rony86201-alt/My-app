import React from 'react';
import { X, Download, Sparkles, Copy, Check } from 'lucide-react';

interface ImageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  sceneNumber: number;
  prompt: string;
}

export const ImageDetailsModal: React.FC<ImageDetailsModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  sceneNumber,
  prompt,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `manga_scene_0${sceneNumber}_artwork.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl rounded-2xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-cinzel text-lg font-bold text-white">
              Scene #{sceneNumber} Artwork
            </span>
            <span className="text-[11px] bg-zinc-900 text-amber-400 px-2.5 py-0.5 rounded border border-zinc-700 font-semibold">
              Cinematic Dark Fantasy Anime
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview Box */}
        <div className="relative flex-1 min-h-[300px] max-h-[62vh] rounded-xl overflow-hidden bg-black flex items-center justify-center border border-zinc-800">
          <img
            src={imageUrl}
            alt={`Scene ${sceneNumber}`}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Prompt & Actions Footer */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-zinc-800">
          <div className="text-xs text-zinc-400 max-w-xl truncate">
            <span className="font-semibold text-white">Prompt:</span> {prompt}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Art</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
