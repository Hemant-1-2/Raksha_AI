import React, { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Info, Copy, ClipboardCheck, ArrowRight, CornerDownLeft, Loader2, Sparkles, Landmark, DollarSign, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScamResult } from "../types";
import ResultShareButton from "./ResultShareButton";

export default function InvestmentChecker() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<ScamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sample investment scheme templates
  const presets = [
    {
      title: "📈 WhatsApp VIP Stock Club",
      preview: "Guaranteed 10% weekly profits inside VIP group",
      text: "Welcome to the VIP Institutional Trading Syndicate. Under the guidance of Professor James, we offer guaranteed 10% to 15% weekly compounding profits on Indian equity listings. We use screenshots of our institutional trading platform showing ₹14,50,000 profits made this morning by our registered members. To join the VIP channel, you must immediately migrate your conversation to Telegram, download our custom private trading APK (Goldman-Sovereign-Trade.apk), and transfer your initial investment of ₹50,000 directly to our VIP treasury coordinator's UPI ID."
    },
    {
      title: "💰 Decentralized Token staking",
      preview: "300% APY guaranteed coin pool with 2h deadline",
      text: "ALERT: The Hyper-Yield BTC/USDT staking pool is now live! Lock your tokens for 30 days to get a guaranteed 300% APY fixed returns. Act now! Only 4 VIP spots remain and the registration window expires in exactly 2 hours. If you recruit 3 active friends into this liquidity pool, you will unlock an instant 15% referral bonus directly into your Metamask wallet. No KYC required, move to WhatsApp group link chat to request the smart contract transfer address."
    },
    {
      title: "🏛️ Registered Index Mutual Fund",
      preview: "Verified low-cost domestic equity tracker fund",
      text: "Invest in the India Sovereign Growth Index Fund. This is an open-ended equity scheme tracking the Nifty 50 Index, managed by our SEBI-registered Asset Management Company (SEBI Reg No: MF/012/99/8). Historically, the index has provided an annual compound return of 12% to 14% over a 5-year investment horizon. Investment involves standard market risks. Intermediaries are strictly regulated and subject to regular compliance audits by the Securities and Exchange Board of India."
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
      const response = await fetch("/api/check-investment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "The server failed to process the investment scam check.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze. Please ensure your Gemini API Key is configured in Settings.");
    } finally {
      setLoading(false);
    }
  };

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
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            PORTFOLIO RISK & INTEGRITY ASSESSOR
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Verify custom private trading APKs, Telegram stock pumps, unregulated offshore yield syndicates, and binary currency bots before locking up your savings.
          </p>
        </div>

        {/* Warning Banner */}
        <div className="p-4 bg-emerald-950/80 border border-emerald-900/60 rounded-2xl flex items-start gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <Landmark className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <strong>SEBI Safe Shield Check:</strong> Domestic financial portals must display official SEBI registration numbers. Verify security credentials via the SEBI database before routing capital.
          </div>
        </div>

        {/* Preset Presets */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
            Load Investment Threat Profile Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetClick(preset.text)}
                className="text-left p-3.5 rounded-2xl border border-slate-800 bg-[#0b0c16]/70 hover:border-cyan-500/40 hover:bg-[#12142d]/80 transition-all text-xs space-y-1 cursor-pointer flex flex-col justify-between h-full group"
              >
                <div>
                  <div className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                    {preset.title}
                  </div>
                  <p className="text-slate-400 text-[11px] line-clamp-3 leading-relaxed mt-1 font-sans">
                    {preset.preview}
                  </p>
                </div>
                <div className="text-[9px] text-cyan-400 font-mono font-bold uppercase tracking-widest mt-3">
                  Inspect template &rarr;
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Text Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative border border-slate-800 bg-[#090b16]/90 rounded-2xl shadow-lg overflow-hidden focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/15 transition-all">
            <textarea
              id="investment-text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste suspicious investment pitch copy, VIP stock tip text, or describe what the agent promises you..."
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
                Screening Financial Integrity Triggers...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                Audit Investment Credibility <CornerDownLeft className="w-3.5 h-3.5 font-bold" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Output Side - 5 Cols */}
      <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
          Financial Fraud Audit Report
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
                <div className="text-sm font-bold text-white uppercase tracking-wider font-mono">Assessing Yield Credibility</div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto font-sans">
                  Gemini is evaluating promises against compounding realistic yields, verifying migration channels, and screening for unregistered app footprints...
                </p>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-5 border border-red-500/20 bg-rose-500/10 text-rose-200 rounded-2xl space-y-3 text-sm font-sans"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white uppercase tracking-wider font-mono text-xs font-black font-black">Audit Interrupted</div>
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
              className="p-8 border border-dashed border-slate-800 bg-[#070914]/40 text-slate-400 rounded-2xl text-center space-y-4 font-sans"
            >
              <div className="w-12 h-12 rounded-2xl border border-slate-800 bg-[#0a0c16] flex items-center justify-center mx-auto">
                <DollarSign className="w-5 h-5 text-slate-500" />
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">
                Awaiting Investment Profile
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Select one of the preset trading club templates or copy and paste an active offer details to analyze risk markers.
              </p>
            </motion.div>
          )}

          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 font-sans"
            >
              {(() => {
                const config = getRiskColor(result.risk_score, result.verdict);
                const ResultIcon = config.icon;
                return (
                  <div className="cyber-card border border-slate-800/80 rounded-3xl p-6 space-y-6 shadow-xl">
                    {/* Verdict Title & Score */}
                    <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 font-bold">
                          Security Assessment
                        </div>
                        <div className={`text-base font-black flex items-center gap-1.5 uppercase ${result.risk_score >= 70 ? 'text-rose-400' : result.risk_score >= 26 ? 'text-amber-400' : 'text-emerald-400'}`}>
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
                        <span>Sovereign / Regulated (0)</span>
                        <span>Highly Fraudulent (100)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-950/60 rounded-full overflow-hidden border border-slate-800 p-[2px]">
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
                          Intercepted Risk Patterns
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
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                        Visual Analysis & Explanation
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                        {result.explanation}
                      </p>
                    </div>

                    {/* Recommended Action */}
                    <div className={`p-4 border rounded-2xl space-y-2 ${config.bg}`}>
                      <div className={`text-[10px] font-mono font-bold uppercase tracking-widest ${config.accentText} flex items-center gap-1.5`}>
                        <Shield className="w-3.5 h-3.5" />
                        Recommended Safety Actions
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans">
                        {result.recommended_action}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-4 border-t border-slate-800/60">
                      <div className="w-full sm:max-w-md">
                        <ResultShareButton
                          type="investment"
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
