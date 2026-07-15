import { useState, useEffect } from "react";
import { Shield, Coins, Activity, PhoneCall, ArrowRight, ShieldCheck, Landmark, Loader2, AlertTriangle, CheckCircle, Info, QrCode, TrendingUp, HeartHandshake, UserCheck } from "lucide-react";
import { motion } from "motion/react";
import { ScreenType } from "../types";

interface HomeProps {
  onNavigate: (screen: ScreenType) => void;
}

export default function Home({ onNavigate }: HomeProps) {
  const [recentChecks, setRecentChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Stat items
  const stats = [
    { label: "Attacks Neutralized", value: "1.24M", isAccent: false },
    { label: "Detection Accuracy", value: "98.4%", isAccent: false },
    { label: "National Helpline", value: "1930", isAccent: true },
    { label: "Fraud Reports Filed", value: "45,200+", isAccent: false }
  ];

  const features = [
    {
      id: "scam-checker" as ScreenType,
      title: "Scam Checker",
      description: "Paste suspicious call transcripts, WhatsApp messages, or threat letters. Raksha AI flags urgency tactics, authority impersonation, and coercion using server-side Gemini intelligence.",
      icon: Shield,
      tag: "Verify Risk Score",
      colorClass: "text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white group-hover:bg-rose-600 group-hover:text-white",
      actionColor: "text-rose-600"
    },
    {
      id: "currency-checker" as ScreenType,
      title: "Currency Check",
      description: "Upload a photo of any high-denomination banknote. Our neural heuristic prototype checks design cues, watermark areas, and serial alignments against known specifications.",
      icon: Coins,
      tag: "Scan Banknote",
      colorClass: "text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white group-hover:bg-emerald-600 group-hover:text-white",
      actionColor: "text-emerald-600"
    },
    {
      id: "fraud-graph" as ScreenType,
      title: "Fraud Graph",
      description: "Inspect interactive connection records showing how scammers route money through clusters of device IDs, shared IP addresses, and digital mule bank accounts.",
      icon: Activity,
      tag: "View Network",
      colorClass: "text-slate-600 bg-slate-50 hover:bg-slate-900 hover:text-white group-hover:bg-slate-900 group-hover:text-white",
      actionColor: "text-slate-950"
    },
    {
      id: "payment-checker" as ScreenType,
      title: "Payment Checker",
      description: "Upload a screenshot of a UPI request or QR code. Detect collect requests disguised as 'receive' scams and verify transaction safety.",
      icon: QrCode,
      tag: "Scan QR/Request",
      colorClass: "text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white group-hover:bg-blue-600 group-hover:text-white",
      actionColor: "text-blue-600"
    },
    {
      id: "investment-checker" as ScreenType,
      title: "Investment Scheme",
      description: "Paste a chat pitch or offer description to run SEBI credibility checks against high-yield returns, pyramid recruiting, and VIP pump scams.",
      icon: TrendingUp,
      tag: "Audit Scheme",
      colorClass: "text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white group-hover:bg-emerald-600 group-hover:text-white",
      actionColor: "text-emerald-600"
    },
    {
      id: "threat-support" as ScreenType,
      title: "Threat Support",
      description: "Faced with pressure, blackmail, or digital harassment? Reach out here for a safe, confidential evaluation of coercion tactics to get a clear, step-by-step resolution plan. You are not in trouble.",
      icon: HeartHandshake,
      tag: "Get Reassurance & Help",
      colorClass: "text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white group-hover:bg-rose-600 group-hover:text-white",
      actionColor: "text-rose-600"
    },
    {
      id: "officer-dashboard" as ScreenType,
      title: "Officer Dashboard",
      description: "Secure diagnostic terminal displaying recent public safety checks retrieved from Firestore, sorted automatically by maximum threat risk indexes descending.",
      icon: ShieldCheck,
      tag: "Inspect Logs",
      colorClass: "text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white group-hover:bg-indigo-600 group-hover:text-white",
      actionColor: "text-indigo-650"
    },
    {
      id: "citizen-dashboard" as ScreenType,
      title: "Citizen Dashboard",
      description: "Access your personalized citizen profile, report extortion calls, view logged complaints, and receive official safety advisory responses from cybersecurity officers.",
      icon: UserCheck,
      tag: "Your Complaints",
      colorClass: "text-teal-600 bg-teal-50 hover:bg-teal-600 hover:text-white group-hover:bg-teal-600 group-hover:text-white",
      actionColor: "text-teal-650"
    }
  ];

  useEffect(() => {
    const fetchRecentChecks = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/recent-checks");
        const data = await res.json();
        if (data.checks) {
          setRecentChecks(data.checks.slice(0, 4));
        }
      } catch (err) {
        console.error("Failed to load recent checks:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentChecks();
  }, []);

  return (
    <div className="space-y-16 py-4 font-sans">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-4xl mx-auto text-center space-y-6 pt-4"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-wider uppercase mx-auto font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          PUBLIC DEFENSE INTEL TERMINAL v1.2
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight max-w-3xl mx-auto">
          Your Intelligent Shield Against<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400">Modern Fraud Signatures.</span>
        </h1>
        
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mt-4">
          Raksha AI leverages deep heuristic diagnostics and secure Gemini nodes to inspect, isolate, and disrupt cyber threats—ranging from coercive social engineering to counterfeit banknote analysis.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <button
            onClick={() => onNavigate("scam-checker")}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.45)] transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            Check a Scam Threat <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            onClick={() => onNavigate("resources")}
            className="px-6 py-3 bg-slate-950 text-slate-200 border border-slate-800 hover:bg-slate-900 rounded-2xl font-bold text-xs uppercase tracking-wider transition inline-flex items-center gap-2 cursor-pointer"
          >
            Emergency Helplines <PhoneCall className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </motion.div>

      {/* Trust Stats Strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="bg-[#0b0c16]/90 border border-slate-800/80 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-around gap-6 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/60 shadow-xl"
      >
        {stats.map((stat, idx) => (
          <div key={idx} className="text-center w-full sm:w-auto pt-4 sm:pt-0 sm:pl-4 first:pt-0 first:pl-0">
            <div className={`text-2xl md:text-3xl font-black tracking-tight ${stat.isAccent ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(0,240,255,0.2)]" : "text-white"}`}>
              {stat.value}
            </div>
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-1 font-mono">
              {stat.label}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Live Threat Intelligence Ledger */}
      <div className="cyber-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-[10px] font-bold text-cyan-400 border border-cyan-500/20 uppercase font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> SECURE RADAR FEED
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">
              Sovereign Safety Diagnostics Ledger
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Decentralized ledger of safety audits processed across messages, payment handles, and notes.
            </p>
          </div>

          <button
            onClick={() => onNavigate("officer-dashboard")}
            className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer font-mono"
          >
            Access Incident Logs <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
            <span className="text-xs font-mono">Synchronizing telemetry matrices...</span>
          </div>
        ) : recentChecks.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs font-mono">
            // No safety checks registered on secure nodes.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentChecks.map((check, idx) => {
              const isHighRisk = check.riskScore >= 70;
              const isMediumRisk = check.riskScore >= 26 && check.riskScore < 70;
              
              let badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
              let RiskIcon = CheckCircle;
              if (isHighRisk) {
                badgeColor = "bg-red-500/10 text-red-400 border-red-500/20";
                RiskIcon = AlertTriangle;
              } else if (isMediumRisk) {
                badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                RiskIcon = Info;
              }

              return (
                <motion.div
                  key={check.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 bg-[#090b16]/70 border border-slate-800/80 rounded-2xl space-y-3 flex flex-col justify-between hover:border-cyan-500/30 hover:bg-[#0b0d1e]/80 transition-all duration-200"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-400">
                      <span className="flex items-center gap-1.5 uppercase">
                        {check.type === "scam" ? (
                          <Shield className="w-3 h-3 text-cyan-400" />
                        ) : check.type === "payment" ? (
                          <QrCode className="w-3 h-3 text-blue-400" />
                        ) : check.type === "investment" ? (
                          <TrendingUp className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <Coins className="w-3 h-3 text-emerald-400" />
                        )}
                        {check.type === "scam" ? "Scam Scan" : check.type === "payment" ? "Payment Check" : check.type === "investment" ? "Investment Scheme" : "Currency Check"}
                      </span>
                      <span>
                        {new Date(check.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-2">
                      {check.inputSummary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/40 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-400">Threat Index: {check.riskScore}%</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 uppercase ${badgeColor} font-mono`}>
                      <RiskIcon className="w-3.5 h-3.5" />
                      {check.verdict}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature Section */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">National Sovereign Safety Instruments</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Choose from modular safety diagnostics built on top-tier cyber defense principles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            
            // Set up clean custom neon color boxes for icons
            let boxColor = "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(0,240,255,0.1)]";
            if (feat.id === "scam-checker" || feat.id === "threat-support") {
              boxColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]";
            } else if (feat.id === "currency-checker" || feat.id === "investment-checker") {
              boxColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
            } else if (feat.id === "fraud-graph") {
              boxColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]";
            } else if (feat.id === "officer-dashboard") {
              boxColor = "bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]";
            }

            return (
              <motion.div
                key={feat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (idx + 1), duration: 0.5 }}
                className="cyber-card p-6 rounded-2xl border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                onClick={() => onNavigate(feat.id)}
              >
                <div>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-105 ${boxColor}`}>
                    <Icon className="w-5.5 h-5.5 stroke-[2]" />
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-2 tracking-tight group-hover:text-cyan-400 transition-colors">
                    {feat.title}
                  </h3>
                  
                  <p className="text-xs text-slate-400 leading-relaxed mb-6 font-sans">
                    {feat.description}
                  </p>
                </div>

                <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-auto text-cyan-400 group-hover:text-cyan-300 transition-colors font-mono">
                  {feat.tag} <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-1" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Notice / Architecture Disclaimer Strip */}
      <div className="p-4 bg-cyan-500/5 border border-cyan-500/15 rounded-2xl flex items-start gap-3 max-w-3xl mx-auto">
        <Landmark className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-400 leading-relaxed">
          <strong>Official Sandbox Notice:</strong> Raksha AI operates strictly as a software-only, non-commercial public safety diagnostic simulation. It does not interface with telecom carrier cell towers, intercept GSM broadcasts, require IoT physical hardware, or conduct active surveillance.
        </div>
      </div>
    </div>
  );
}
