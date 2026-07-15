import { useState } from "react";
import { Share2, Copy, Check, Loader2, Link as LinkIcon, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ResultShareButtonProps {
  type: "scam" | "payment" | "investment";
  result: {
    verdict: string;
    riskScore: number;
    explanation: string;
    flags?: string[];
  };
}

export default function ResultShareButton({ type, result }: ResultShareButtonProps) {
  const [loading, setLoading] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const getShareUrl = (id: string) => {
    return `${window.location.origin}?share=${id}`;
  };

  const handleCreateShare = async () => {
    if (shareId) {
      // If already generated, toggle or trigger share/copy immediately
      triggerShareFlow(shareId);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/share-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          verdict: result.verdict,
          riskScore: result.riskScore,
          explanation: result.explanation,
          flags: result.flags || []
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate share link.");
      }

      setShareId(data.id);
      triggerShareFlow(data.id);
    } catch (err: any) {
      console.error("Error creating share link:", err);
      setError(err.message || "Could not generate a shareable link.");
    } finally {
      setLoading(false);
    }
  };

  const triggerShareFlow = async (id: string) => {
    const shareUrl = getShareUrl(id);
    
    // Check if native sharing is supported (mainly mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Raksha AI - Safety Verification Report",
          text: `Check out this safety diagnostic verdict: ${result.verdict} (Risk Score: ${result.riskScore}%). Read-only report generated securely.`,
          url: shareUrl,
        });
        return; // successfully shared natively
      } catch (shareErr) {
        // user cancelled or share failed, fallback to copy UI
        console.log("Native share cancelled or failed, falling back to copy:", shareErr);
      }
    }

    // Default clipboard copy
    handleCopy(shareUrl);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = shareId ? getShareUrl(shareId) : "";

  return (
    <div className="space-y-2 mt-2 w-full">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCreateShare}
          disabled={loading}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 border border-slate-900 shadow-xs"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating Secure Link...
            </>
          ) : shareId ? (
            <>
              <Share2 className="w-3.5 h-3.5" />
              Share Report Link
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              Share Safe Result
            </>
          )}
        </button>

        {shareId && (
          <button
            type="button"
            onClick={() => handleCopy(shareUrl)}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-teal-600" />
                Copied Link!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Link
              </>
            )}
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-[11px] text-red-600 flex items-center gap-1 mt-1 font-medium"
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {shareId && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 mt-2"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              <LinkIcon className="w-3 h-3 text-slate-400" />
              Secure Diagnostic Share Link
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-slate-600 focus:outline-hidden"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              • Valid for 7 days. Raw inputs, chat logs, or uploaded images are strictly redacted to protect your privacy.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
