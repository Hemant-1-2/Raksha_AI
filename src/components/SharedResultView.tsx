import { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle, CheckCircle, Info, Loader2, ArrowRight, ShieldAlert, FileText, Globe } from "lucide-react";
import { motion } from "motion/react";

interface SharedResultViewProps {
  shareId: string;
  onClose: () => void;
}

interface SharedData {
  id: string;
  type: "scam" | "payment" | "investment";
  verdict: string;
  riskScore: number;
  explanation: string;
  flags: string[];
  createdAt: string;
  expiresAt: string;
}

export default function SharedResultView({ shareId, onClose }: SharedResultViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSharedResult() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/shared-result/${shareId}`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || "Failed to retrieve the shared report.");
        }
        
        setData(result.data);
      } catch (err: any) {
        console.error("Error fetching shared result:", err);
        setError(err.message || "This shared diagnostic link could not be loaded. It may have expired or is invalid.");
      } finally {
        setLoading(false);
      }
    }

    if (shareId) {
      fetchSharedResult();
    }
  }, [shareId]);

  const getRiskTheme = (score: number, verdict: string) => {
    const isScam = score >= 70 || verdict.toLowerCase().includes("scam") || verdict.toLowerCase().includes("debit") || verdict.toLowerCase().includes("send");
    const isSuspicious = score >= 26 || verdict.toLowerCase().includes("suspicious");

    if (isScam) {
      return {
        bg: "bg-red-50 border-red-200 text-red-900",
        badge: "bg-red-600 text-white",
        iconColor: "text-red-600",
        bar: "bg-red-600",
        accentText: "text-red-700",
        icon: AlertTriangle,
        heading: "CRITICAL RISK IDENTIFIED"
      };
    } else if (isSuspicious) {
      return {
        bg: "bg-amber-50 border-amber-200 text-amber-900",
        badge: "bg-amber-500 text-slate-900 font-semibold",
        iconColor: "text-amber-600",
        bar: "bg-amber-500",
        accentText: "text-amber-700",
        icon: AlertTriangle,
        heading: "SUSPICIOUS THREAT SIGNATURES"
      };
    } else {
      return {
        bg: "bg-teal-50 border-teal-200 text-teal-900",
        badge: "bg-teal-600 text-white",
        iconColor: "text-teal-600",
        bar: "bg-teal-600",
        accentText: "text-teal-800",
        icon: CheckCircle,
        heading: "VERIFIED HIGH CONFIDENCE SAFE"
      };
    }
  };

  const cleanQueryAndExit = () => {
    // Clear url query params without full page reload
    const url = new URL(window.location.href);
    url.searchParams.delete("share");
    window.history.replaceState({}, document.title, url.toString());
    onClose();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center mx-auto text-white">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800">Retrieving Diagnostic Report</h2>
            <p className="text-sm text-slate-500">
              Querying Raksha AI secure ledger. Verifying integrity signatures...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-red-100 shadow-xs space-y-6">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto text-red-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Link Invalid or Expired</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {error || "This shared result is no longer available. Generated shareable reports automatically self-destruct after 7 days to keep citizen data completely clean."}
            </p>
          </div>
          <button
            onClick={cleanQueryAndExit}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition uppercase tracking-wider cursor-pointer"
          >
            Go to Raksha AI Safety Terminal
          </button>
        </div>
      </div>
    );
  }

  const theme = getRiskTheme(data.riskScore, data.verdict);
  const VerdictIcon = theme.icon;

  const getTypeName = (type: string) => {
    switch (type) {
      case "scam":
        return "Scam & Arrest Check";
      case "payment":
        return "Payment Request & QR Check";
      case "investment":
        return "Investment Scheme Check";
      default:
        return "Safety Check";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-sans">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Brand Emblem */}
        <div className="flex justify-center items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">
              RAKSHA AI
            </span>
            <span className="text-[9px] font-bold text-slate-500 rounded uppercase tracking-widest mt-1">
              Public Safety Diagnostic Report
            </span>
          </div>
        </div>

        {/* Primary Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Privacy Banner - Key Requirement */}
          <div className="bg-slate-900 text-slate-100 px-6 py-4 flex items-start gap-3 border-b border-slate-800">
            <Globe className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Privacy Shield Activated
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                The original raw transcript, sensitive pasted inputs, and screenshot image submitted by the citizen have been <strong>permanently redacted</strong> from this report. Only the final safety assessment is shared below.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Header metadata */}
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                  {getTypeName(data.type)}
                </span>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Report ID: #{data.id} • Issued: {new Date(data.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="text-right text-[10px] text-slate-400 font-mono leading-tight">
                <div>Expires: {new Date(data.expiresAt).toLocaleDateString()}</div>
                <div className="text-rose-500 font-bold uppercase tracking-wider mt-0.5">Self-Destruct Active</div>
              </div>
            </div>

            {/* Verdict Display block */}
            <div className={`border rounded-2xl p-6 space-y-6 ${theme.bg}`}>
              
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold uppercase tracking-widest opacity-75">
                    DIAGNOSTIC STATUS
                  </div>
                  <div className="text-xl font-black flex items-center gap-2">
                    <VerdictIcon className={`w-5 h-5 ${theme.iconColor}`} />
                    {data.verdict}
                  </div>
                </div>

                <div className={`px-4 py-2 rounded-xl text-center border font-mono ${theme.badge} flex flex-col justify-center items-center`}>
                  <span className="text-[9px] uppercase tracking-wider opacity-90">Risk Index</span>
                  <span className="text-xl font-black">{data.riskScore}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  <span>Safe (0)</span>
                  <span>Scam Signatures (100)</span>
                </div>
                <div className="w-full h-3 bg-slate-200/50 rounded-full overflow-hidden border border-slate-200/50">
                  <div
                    className={`h-full transition-all duration-500 ${theme.bar}`}
                    style={{ width: `${data.riskScore}%` }}
                  />
                </div>
              </div>

              {/* Flags */}
              {data.flags && data.flags.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    Intercepted Fraud Markers
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.flags.map((flag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-900 text-white border border-slate-800 font-mono"
                      >
                        ⚠️ {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Explanation */}
              <div className="space-y-1.5 pt-4 border-t border-slate-950/10">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  Visual Analysis & Diagnostic Breakdown
                </div>
                <p className="text-sm text-slate-800 leading-relaxed font-sans">
                  {data.explanation}
                </p>
              </div>

            </div>

            {/* Public safety tip */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1.5 font-mono text-[11px] leading-relaxed text-slate-600">
              <div className="text-slate-800 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-500" />
                Citizen Security Advice
              </div>
              <p className="font-sans text-xs">
                Cyber fraudsters leverage fear, urgency, and false authority. Always check payment addresses, report suspicious digital arrest threats, and verify before transferring any assets.
              </p>
            </div>

            {/* Bottom Call to Action */}
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center gap-4">
              <button
                onClick={cleanQueryAndExit}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                Go to Raksha AI Safety Terminal
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-[10px] text-slate-400 font-mono">
          Raksha AI Public Safety Platform • Keeping citizens safe from digital fraud
        </p>

      </div>
    </div>
  );
}
