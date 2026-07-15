import React, { useState, useEffect } from "react";
import { PhoneCall, Globe, AlertOctagon, HelpCircle, Shield, ArrowUpRight, CheckSquare, FileWarning, ShieldAlert, Send, CheckCircle, User, Loader2, Landmark, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CitizenReport {
  id: string;
  category: string;
  description: string;
  scammerDetails: string;
  amountLost: number;
  reporterName: string;
  isAnonymous: boolean;
  referenceId: string;
  timestamp: string;
}

export default function Resources() {
  const [activeTab, setActiveTab] = useState<"directories" | "reporting">("directories");
  
  // Form states
  const [category, setCategory] = useState("digital_arrest");
  const [description, setDescription] = useState("");
  const [scammerDetails, setScammerDetails] = useState("");
  const [amountLost, setAmountLost] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedReceipt, setSubmittedReceipt] = useState<{ referenceId: string; category: string } | null>(null);

  // Live reports state
  const [recentReports, setRecentReports] = useState<CitizenReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const categories = [
    { id: "digital_arrest", label: "Digital Arrest", description: "Video call extortion claiming police/customs arrest" },
    { id: "whatsapp_phishing", label: "WhatsApp Phishing", description: "Job offers, lottery, or gift scams via chat" },
    { id: "customs_courier", label: "Customs & Courier", description: "Threats about illegal drug parcel seizures" },
    { id: "identity_theft", label: "Identity Theft", description: "Aadhaar spoofing or SIM clone attempts" },
    { id: "other", label: "Other Financial Fraud", description: "Stock market, crypto, or direct banking scams" }
  ];

  const emergencyActions = [
    {
      step: "01",
      title: "Hang Up and Disconnect Immediately",
      description: "Sovereign law enforcement (CBI, Police, Customs, Court officials) will never interrogate citizens on Skype, WhatsApp video, or Telegram. Hang up immediately."
    },
    {
      step: "02",
      title: "Never Share OTPs or Make Money Transfers",
      description: "Do not transfer money to any 'security clearance verification account' or 'digital escrow'. Officials never demand escrow transfers over phone calls."
    },
    {
      step: "03",
      title: "Report to Helpline 1930 within 2 Hours",
      description: "If you have lost money, report immediately to the National Helpline '1930'. Fast reporting increases the chance of banks freezing scammed funds in time."
    },
    {
      step: "04",
      title: "Submit a Complaint on Cybercrime Portal",
      description: "File a formal record on cybercrime.gov.in. Keep screenshots of phone numbers, call records, chat histories, and bank transaction receipts."
    }
  ];

  const helplines = [
    {
      name: "National Cyber Crime Reporting Portal",
      description: "The primary government agency portal to register and track digital scam complaints.",
      url: "https://cybercrime.gov.in",
      displayUrl: "cybercrime.gov.in",
      actionLabel: "Submit Formal Portal Complaint",
      badge: "Primary Citizen Portal"
    },
    {
      name: "Sanchar Saathi Portal (DoT)",
      description: "Check active SIM connections registered under your Aadhaar card and report spoofed mobile connections.",
      url: "https://sancharsaathi.gov.in",
      displayUrl: "sancharsaathi.gov.in",
      actionLabel: "Verify Your Aadhaar SIMs",
      badge: "Telecom Safety"
    },
    {
      name: "Chakshu Portal (Sanchar Saathi)",
      description: "Report fraudulent WhatsApp or SMS calls claiming package confiscation, TRAI blocks, or lottery winnings.",
      url: "https://sancharsaathi.gov.in/susu/ReportSuspected.jsp",
      displayUrl: "sancharsaathi.gov.in/chakshu",
      actionLabel: "Report Phishing Contacts",
      badge: "Phishing Intercept"
    }
  ];

  const scamGuides = [
    {
      title: "Digital Arrest Fraud",
      indicators: [
        "Skype/WhatsApp video interrogation calls",
        "Demands to stay locked alone inside a room",
        "Threats of drug package seizures (FedEx/DHL)",
        "Demands for immediate RBI verification deposits"
      ],
      defense: "Supreme Court and Police NEVER conduct video call court hearings. Hang up instantly."
    },
    {
      title: "TRAI SIM Block Warning",
      indicators: [
        "Automated phone system telling you to press 9",
        "Claiming illegal messages were sent from your SIM",
        "Saying disconnection will occur within 2 hours",
        "Requesting money to override the block"
      ],
      defense: "TRAI never calls individual citizens to block SIM cards. Use Sanchar Saathi to check your mobile list."
    },
    {
      title: "Courier Custom Clearance",
      indicators: [
        "Claims that customs intercepted MDMA/illegal passports",
        "Asks for Aadhaar card number to clarify case",
        "Claims Mumbai/Delhi police has registered an FIR",
        "Asks to pay bribe/escrow to clear your name"
      ],
      defense: "Customs will never call you to request online transfers. Contact the official courier agency directly."
    }
  ];

  const fetchRecentReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch("/api/recent-reports");
      const data = await res.json();
      if (data.status === "success") {
        setRecentReports(data.reports);
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchRecentReports();
  }, []);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    // Retrieve active logged-in citizen session
    let activeUsername = undefined;
    try {
      const savedUser = localStorage.getItem("raksha_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.username) {
          activeUsername = parsed.username.toLowerCase();
        }
      }
    } catch (err) {
      console.error("Failed to parse citizen session:", err);
    }

    try {
      const response = await fetch("/api/submit-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description,
          scammerDetails,
          amountLost: amountLost ? Number(amountLost) : 0,
          reporterName,
          isAnonymous,
          username: activeUsername
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit report.");
      }

      setSubmittedReceipt({
        referenceId: data.referenceId,
        category: category
      });
      
      // Reset form fields
      setDescription("");
      setScammerDetails("");
      setAmountLost("");
      setReporterName("");
      setIsAnonymous(true);
      
      // Refresh reports list
      fetchRecentReports();
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryLabel = (id: string) => {
    return categories.find(c => c.id === id)?.label || id;
  };

  return (
    <div className="space-y-10 font-sans">
      
      {/* Visual Emergency Ribbon */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-gradient-to-r from-red-950 via-rose-950 to-[#2c0f16]/90 border border-red-500/25 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
      >
        <div className="space-y-2 flex-grow">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest font-mono">
            <AlertOctagon className="w-4 h-4" /> Immediate Cyber Emergency
          </div>
          <h2 className="text-xl md:text-2xl font-black font-sans text-white tracking-wider">HAVE YOU LOST FUNDS TO A DIGITAL SCAM?</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            Do not wait. Dial <strong className="text-rose-400 font-extrabold font-mono">1930</strong> immediately to report financial loss. Inform your bank to trigger immediate freeze protocols on scammed transactions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <a
            href="tel:1930"
            className="px-5 py-3 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition text-center inline-flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.3)]"
          >
            <PhoneCall className="w-4 h-4 text-slate-950 stroke-[2.5]" /> Dial 1930 Helpline
          </a>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 bg-[#0d0714] text-rose-400 border border-rose-500/25 hover:border-rose-500/50 rounded-xl text-xs font-mono uppercase tracking-widest transition text-center inline-flex items-center justify-center gap-2"
          >
            <Globe className="w-4 h-4" /> cybercrime.gov.in <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </motion.div>

      {/* Main Tab Controller */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab("directories")}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer font-mono ${
            activeTab === "directories"
              ? "border-cyan-400 text-cyan-400 shadow-[0_4px_12px_rgba(6,182,212,0.15)]"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          Safety hotlines & guides
        </button>
        <button
          onClick={() => setActiveTab("reporting")}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer flex items-center gap-2 font-mono ${
            activeTab === "reporting"
              ? "border-rose-400 text-rose-400 shadow-[0_4px_12px_rgba(244,63,94,0.15)]"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          Citizen reporting desk
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "directories" ? (
          <motion.div
            key="directories-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-12"
          >
            {/* Immediate Defensive Procedure */}
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wider">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  Standard Defensive Procedure (SDP)
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  If you are actively contacted by anyone threatening arrest, parcel confiscation, or phone line blocking:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {emergencyActions.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-5 border border-slate-800 bg-[#090b16]/70 rounded-2xl space-y-4 hover:border-cyan-500/20 transition-all flex flex-col justify-between"
                  >
                    <div className="text-2xl font-black font-mono text-cyan-400 tracking-wider">
                      {action.step}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-200 leading-snug">
                        {action.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans font-normal">
                        {action.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Sovereign Helplines Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              
              {/* Directories (7 Cols) */}
              <div className="md:col-span-7 space-y-6">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Verified Sovereign Directories</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Only use verified official government portals to register phishing incidents or request safety lookups.
                  </p>
                </div>

                <div className="space-y-4">
                  {helplines.map((help, idx) => (
                    <div key={idx} className="p-5 border border-slate-800 bg-[#090b16]/70 rounded-2xl space-y-4 hover:border-cyan-500/20 transition-all shadow-xl">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold bg-[#0d0714] text-cyan-400 border border-cyan-500/15 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                            {help.badge}
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-slate-200 pt-1.5">
                            {help.name}
                          </h4>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed font-sans font-normal">
                        {help.description}
                      </p>

                      <div className="pt-2">
                        <a
                          href={help.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-widest font-mono cursor-pointer"
                        >
                          {help.actionLabel} &rarr;
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Threat Playbooks (5 Cols) */}
              <div className="md:col-span-5 space-y-6">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Digital Threat Playbooks</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Recognize the recurring visual and linguistic patterns scammed networks rely on.
                  </p>
                </div>

                <div className="space-y-4">
                  {scamGuides.map((guide, idx) => (
                    <div key={idx} className="p-5 border border-slate-800 bg-[#0b0c16]/50 rounded-2xl space-y-4 shadow-xl">
                      <h4 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                        <FileWarning className="w-4 h-4 text-rose-400" />
                        {guide.title}
                      </h4>

                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-widest">Key pressure indicators:</span>
                        <ul className="space-y-1.5 text-xs text-slate-400 font-sans font-normal">
                          {guide.indicators.map((ind, i) => (
                            <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                              <span className="text-rose-400 mt-0.5">•</span>
                              {ind}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                        <strong className="text-cyan-400 font-mono text-[10px] uppercase tracking-wider block mb-1">Defensive action:</strong> {guide.defense}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reporting-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Form Side (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-wider text-white flex items-center gap-2 uppercase">
                  <ShieldAlert className="w-6 h-6 text-rose-400" />
                  INCIDENT REGISTRY PORTAL
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Submit a digital fraud report. Incidents are securely recorded to Firestore public ledger nodes, aiding law enforcement officers in analyzing syndicated threat patterns across regions.
                </p>
              </div>

              {submittedReceipt ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-6 space-y-6 shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">Incident Report Logged Successfully</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Raksha Digital Protection Protocol Reference Issued</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-center">
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Reference tracking code</span>
                    <span className="text-2xl font-black font-mono tracking-widest text-cyan-400 select-all">
                      {submittedReceipt.referenceId}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    <p className="font-bold text-white uppercase tracking-wider text-xs">Next mandatory procedures for your security:</p>
                    <ul className="list-decimal list-inside space-y-1.5 text-xs text-slate-400">
                      <li>Note down the reference code above.</li>
                      <li>Call Helpline <strong className="text-rose-400 font-mono">1930</strong> immediately to block any direct bank transfers.</li>
                      <li>Contact your telecom carrier to freeze the compromised mobile number.</li>
                      <li>File official files on <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-mono">cybercrime.gov.in</a>.</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setSubmittedReceipt(null)}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                  >
                    File Another Threat Incident
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-6 bg-[#090b16]/90 p-6 border border-slate-800 rounded-2xl shadow-xl">
                  {/* Category selector */}
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block font-mono">
                      Incident classification *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`text-left p-3 rounded-xl border transition-all text-xs space-y-1 cursor-pointer ${
                            category === cat.id
                              ? "border-rose-500 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                              : "border-slate-800 bg-[#070914]/70 hover:bg-[#12142d]/80"
                          }`}
                        >
                          <div className="font-bold text-slate-200">{cat.label}</div>
                          <div className="text-slate-400 text-[10px] leading-tight font-sans font-normal">{cat.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Incident narrative */}
                  <div className="space-y-1.5">
                    <label htmlFor="narrative" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block font-mono">
                      Description of threat / incident *
                    </label>
                    <textarea
                      id="narrative"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please detail exactly what happened. (e.g. Scammer contacted me on WhatsApp pretending to be customs officer, telling me I have drug packets under my name. Instructed to stay on a continuous video call...)"
                      className="w-full h-32 p-3 text-xs sm:text-sm text-slate-200 border border-slate-800 bg-[#070914] rounded-xl outline-hidden focus:border-rose-500 resize-none font-sans placeholder-slate-600"
                    />
                  </div>

                  {/* Scammer details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="scammer-details" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block font-mono">
                        Scammer contacts (Phone/Skype/Web)
                      </label>
                      <input
                        id="scammer-details"
                        type="text"
                        value={scammerDetails}
                        onChange={(e) => setScammerDetails(e.target.value)}
                        placeholder="e.g. Skype ID or +91 98XXX..."
                        className="w-full p-2.5 text-xs sm:text-sm text-slate-200 border border-slate-800 bg-[#070914] rounded-xl outline-hidden focus:border-rose-500 placeholder-slate-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="amount-lost" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block font-mono">
                        Financial loss incurred (INR)
                      </label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          id="amount-lost"
                          type="number"
                          value={amountLost}
                          onChange={(e) => setAmountLost(e.target.value)}
                          placeholder="e.g. 15000 (0 if none)"
                          className="w-full pl-9 pr-3 p-2.5 text-xs sm:text-sm text-slate-200 border border-slate-800 bg-[#070914] rounded-xl outline-hidden focus:border-rose-500 placeholder-slate-600 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Identity preferences */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">File Report Anonymously</span>
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="w-4 h-4 text-rose-500 border-slate-800 rounded-sm focus:ring-rose-400 cursor-pointer"
                      />
                    </div>

                    {!isAnonymous && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-1.5 pt-2.5 border-t border-slate-800/60"
                      >
                        <label htmlFor="reporter-name" className="text-[10px] font-bold text-slate-400 block font-mono uppercase tracking-wider">Reporter full name</label>
                        <input
                          id="reporter-name"
                          type="text"
                          required
                          value={reporterName}
                          onChange={(e) => setReporterName(e.target.value)}
                          placeholder="Enter your name"
                          className="w-full p-2.5 text-xs text-slate-200 border border-slate-800 rounded-lg outline-hidden bg-[#070914]"
                        />
                      </motion.div>
                    )}
                  </div>

                  {submitError && (
                    <div className="p-3 bg-rose-500/10 text-rose-200 border border-rose-500/20 rounded-xl text-xs font-medium font-sans">
                      ⚠️ Submission failed: {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !description.trim()}
                    className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.25)]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Logging threat to firestore public database...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 stroke-[2.5]" />
                        File Incident Report and Alert Citizens
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Live bulletin Feed (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block font-mono">
                  Live community warnings feed
                </label>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-[9px] font-bold text-rose-400 border border-rose-500/20 uppercase tracking-widest font-mono animate-pulse">
                  ● ACTIVE ALERT RADAR
                </span>
              </div>

              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {loadingReports ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                    <span className="text-xs font-mono">Syncing public feed...</span>
                  </div>
                ) : recentReports.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-[#070914]/40 border border-dashed border-slate-800 rounded-2xl">
                    <Shield className="w-8 h-8 mx-auto opacity-30 text-slate-400 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest font-mono">No active logs</p>
                  </div>
                ) : (
                  recentReports.map((report) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-[#090b16]/90 border border-slate-800 rounded-2xl shadow-xl space-y-3 hover:border-rose-500/30 transition-all font-sans"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 bg-rose-500/10 border border-rose-500/15 text-rose-400 rounded-md">
                            {getCategoryLabel(report.category)}
                          </span>
                          <div className="text-[10px] font-mono font-bold text-slate-500 pt-1.5">
                            Ref: {report.referenceId}
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-3">
                        {report.description}
                      </p>

                      <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wide">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-cyan-400" />
                          {report.reporterName}
                        </span>

                        <span className={`font-mono font-bold ${report.amountLost > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                          {report.amountLost > 0 ? `Loss: ₹${report.amountLost.toLocaleString()}` : "No direct loss reported"}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
