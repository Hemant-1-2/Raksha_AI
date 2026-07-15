import React, { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Info, Copy, ClipboardCheck, ArrowRight, CornerDownLeft, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScamResult } from "../types";
import ResultShareButton from "./ResultShareButton";

export default function ScamChecker() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<ScamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sample templates to load instantly for testing
  const presets = [
    {
      title: "🚨 Skype 'Digital Arrest'",
      preview: "CBI Officer Skype Call about custom parcels",
      text: "This is CBI Senior Officer Shinde calling you via Skype. A FedEx package containing 15 fake passports and 300g of MDMA has been intercepted in Mumbai custom warehouse. The package has your Aadhaar card number linked. You must remain on this Skype video call continuously for digital custody surveillance, lock your room doors, and do not contact any family members. To verify your assets and prove you are innocent, you must transfer ₹4,80,000 to the Supreme Court digital clearance escrow account. It will be refunded in 30 minutes after RBI clearance."
    },
    {
      title: "📞 TRAI SIM Disconnection",
      preview: "Your mobile number will be blocked in 2 hours",
      text: "ATTENTION: This is an automated notification from the Telecom Regulatory Authority of India (TRAI). Your active mobile number is flagged for generating 1,450 illegal spam harassment messages. Your SIM card and all associated telecom service lines will be permanently disconnected and blacklisted in exactly 2 hours. Your legal file has been transferred to the cybercrime cell. To speak to an executive and resolve this immediately, press 9 now or call our verification team back on 1800-410-TRAI."
    },
    {
      title: "📦 Custody Package Courier",
      preview: "Illegal parcel confiscated at customs",
      text: "Hello, this is Delhi Customs Department. A parcel from Taiwan addressed to your name has been confiscated because it contains highly confidential documents and restricted electronic parts. We have arrested the courier driver who claims you paid him. To avoid permanent court prosecution, you must immediately report to our online portal or make an immediate security deposit of ₹95,000 to verify your signature."
    },
    {
      title: "✅ Safe Bank Receipt",
      preview: "Standard utility bill auto-debit notification",
      text: "Dear Customer, Your monthly utility electricity bill payment of ₹2,840 to BSES Yamuna Power Limited has been successfully processed on 10-Jul-2206 at 11:32 AM. Your payment transaction reference ID is TXN89274911. Your HDFC bank savings account has been debited. If you did not authorize this, please contact HDFC customer safety care on 1800-22-4000."
    }
  ];

  const handlePresetClick = (text: string) => {
    setInputText(text);
    setError(null);
  };

  const handleClear = () => {
    setInputText("");
    setResult(null);
    setError(null);
  };

  const handleCopyAction = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/check-scam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "The server failed to process the scam check.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze. Please ensure your Gemini API Key is configured in Settings.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to color code risk indicators
  const getRiskColor = (score: number, verdict: string) => {
    if (score >= 70 || verdict === "Likely Scam") {
      return {
        bg: "bg-rose-500/10 border-rose-500/25 text-rose-200",
        badge: "bg-rose-600 text-slate-950 font-black",
        iconColor: "text-rose-400",
        bar: "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]",
        ring: "ring-rose-500/20",
        accentText: "text-rose-300",
        icon: AlertTriangle
      };
    } else if (score >= 26 || verdict === "Suspicious") {
      return {
        bg: "bg-amber-500/10 border-amber-500/25 text-amber-200",
        badge: "bg-amber-500 text-slate-950 font-black",
        iconColor: "text-amber-400",
        bar: "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]",
        ring: "ring-amber-500/20",
        accentText: "text-amber-300",
        icon: Info
      };
    } else {
      return {
        bg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-200",
        badge: "bg-emerald-600 text-slate-950 font-black",
        iconColor: "text-emerald-400",
        bar: "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]",
        ring: "ring-emerald-500/20",
        accentText: "text-emerald-300",
        icon: CheckCircle
      };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-sans">
      {/* Input Side - 7 Cols */}
      <div className="lg:col-span-7 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-wider text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-400" />
            SCAM DETECTION & PRESSURE SIGNALS CHANNELS
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Verify transcripts, WhatsApp threads, emails, or written texts. Our neural engine visually flags emergency escalation triggers, spoofed police mandates, and coercive transfers.
          </p>
        </div>

        {/* Preset Presets */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
            Load Threat Profile Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetClick(preset.text)}
                className="text-left p-3 rounded-2xl border border-slate-800 bg-[#0b0c16]/70 hover:border-cyan-500/40 hover:bg-[#12142d]/80 transition-all text-xs space-y-1 cursor-pointer"
              >
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>{preset.title}</span>
                  <span className="text-[9px] text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20 font-mono font-normal">Test case</span>
                </div>
                <div className="text-slate-400 truncate text-[11px] font-sans">{preset.preview}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Text Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative border border-slate-800 bg-[#090b16]/90 rounded-2xl shadow-lg overflow-hidden focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/15 transition-all">
            <textarea
              id="scam-text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste suspect text messages, WhatsApp threat transcripts, or type out live statements told to you over suspicious calls..."
              className="w-full h-48 p-4 text-xs sm:text-sm text-slate-200 bg-transparent outline-hidden resize-none border-none placeholder-slate-500 leading-relaxed font-sans"
              maxLength={4000}
            />
            
            <div className="px-4 py-2 bg-[#0b0d1e]/80 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{inputText.length}/4000 characters</span>
              {inputText && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Clear Terminal
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider transition duration-150 inline-flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.25)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing scam signature index via Gemini...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                Submit Verification Request <CornerDownLeft className="w-3.5 h-3.5 font-bold" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Output Side - 5 Cols */}
      <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
          Diagnostic Analysis Terminal
        </label>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 border border-slate-800 bg-[#070914]/90 rounded-2xl shadow-xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-bold text-white uppercase tracking-wider font-mono">Reading Scam Blueprints</div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Gemini is parsing linguistic pressure triggers, spoof authority headers, and coercive billing loops...
                </p>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-5 border border-red-500/20 bg-rose-500/10 text-rose-200 rounded-2xl space-y-3 text-sm"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white uppercase tracking-wider font-mono text-xs">Heuristic Fault</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {!result && !loading && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 border border-dashed border-slate-800 bg-[#070914]/40 text-slate-400 rounded-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl border border-slate-800 bg-[#0a0c16] flex items-center justify-center mx-auto">
                <Shield className="w-5 h-5 text-slate-500" />
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">
                Awaiting Telemetry Input
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Select a preset threat signature template or paste custom suspect conversation logs above to trigger diagnostic scan sequence.
              </p>
            </motion.div>
          )}

          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 animate-in fade-in"
            >
              {/* Color coded results card */}
              {(() => {
                const config = getRiskColor(result.risk_score, result.verdict);
                const ResultIcon = config.icon;
                return (
                  <div className={`border rounded-3xl p-6 space-y-6 shadow-xl transition-all duration-300 ${config.bg}`}>
                    {/* Verdict Title & Score */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                          Assessment Verdict
                        </div>
                        <div className="text-lg font-black flex items-center gap-1.5 uppercase text-white tracking-wide">
                          <ResultIcon className={`w-5 h-5 ${config.iconColor}`} />
                          {result.verdict}
                        </div>
                      </div>

                      <div className={`px-4 py-2 rounded-2xl text-center border font-mono ${config.badge} flex flex-col justify-center items-center`}>
                        <span className="text-[8px] uppercase tracking-wider font-extrabold opacity-90">Risk Index</span>
                        <span className="text-xl font-black">{result.risk_score}%</span>
                      </div>
                    </div>

                    {/* Progress Bar visual indicator */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                        <span>Safe (0)</span>
                        <span>Coercion threshold (100)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-950/60 border border-slate-800 rounded-full overflow-hidden p-[2px]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${config.bar}`}
                          style={{ width: `${result.risk_score}%` }}
                        />
                      </div>
                    </div>

                    {/* Flags if present */}
                    {result.flags && result.flags.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                          Threat Flags Intercepted
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.flags.map((flag, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-950/80 text-white border border-slate-800 font-mono uppercase tracking-wide"
                            >
                              ⚠️ {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    <div className="space-y-1.5 pt-3 border-t border-slate-800/60">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                        Visual Analysis & Heuristic Breakdown
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans font-normal">
                        {result.explanation}
                      </p>
                    </div>

                    {/* Recommended Action */}
                    <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-2">
                      <div className={`text-[10px] font-mono font-bold uppercase tracking-widest ${config.accentText} flex items-center gap-1.5`}>
                        <Shield className="w-3.5 h-3.5" />
                        Recommended Safety Actions
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {result.recommended_action}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-4 border-t border-slate-800/60">
                      <div className="w-full sm:max-w-md">
                        <ResultShareButton
                          type="scam"
                          result={{
                            verdict: result.verdict,
                            riskScore: result.risk_score,
                            explanation: result.explanation,
                            flags: result.flags
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAction(JSON.stringify(result, null, 2))}
                        className="px-3 py-1.5 mt-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition flex items-center gap-1.5 font-bold cursor-pointer text-[10px] h-fit self-end sm:self-auto flex-shrink-0 font-mono uppercase tracking-wider"
                      >
                        {copied ? (
                          <>
                            <ClipboardCheck className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                            Copied Report
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy JSON Data
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
