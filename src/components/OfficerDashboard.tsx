import React, { useState, useEffect } from "react";
import { Activity, ShieldAlert, Coins, RefreshCw, Calendar, Eye, Search, AlertTriangle, CheckCircle, Info, Filter, ArrowDownWideNarrow, ShieldAlert as PoliceIcon, QrCode, TrendingUp, LogOut, MessageSquare, FileText, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SafetyCheckRecord } from "../types";
import { collection, query, orderBy, limit as firestoreLimit, getDocs, startAfter, doc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase";

export default function OfficerDashboard() {
  const [dashboardTab, setDashboardTab] = useState<"scans" | "complaints">("scans");
  const [checks, setChecks] = useState<SafetyCheckRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "scam" | "currency" | "payment" | "investment">("all");
  const [filterRisk, setFilterRisk] = useState<"all" | "high" | "medium" | "low">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCheck, setSelectedCheck] = useState<SafetyCheckRecord | null>(null);

  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Complaints states
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintsError, setComplaintsError] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentSaving, setCommentSaving] = useState<Record<string, boolean>>({});

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoadingComplaints(true);
      setComplaintsError(null);
      const complaintsCol = collection(db, "reports");
      const q = query(complaintsCol, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      setComplaints(list);

      // Initialize comment input values
      const initialComments: Record<string, string> = {};
      list.forEach((c) => {
        initialComments[c.id] = c.officerComment || "";
      });
      setCommentInputs(prev => ({ ...initialComments, ...prev }));
    } catch (err: any) {
      console.error("[OfficerDashboard] Error fetching complaints:", err);
      setComplaintsError(err.message || "Failed to fetch user complaints database.");
    } finally {
      setLoadingComplaints(false);
    }
  };

  const handleSaveComment = async (complaintId: string) => {
    const text = commentInputs[complaintId] || "";
    try {
      setCommentSaving(prev => ({ ...prev, [complaintId]: true }));
      const docRef = doc(db, "reports", complaintId);
      await updateDoc(docRef, {
        officerComment: text.trim(),
        officerCommentAt: new Date().toISOString()
      });

      // Update local complaints state
      setComplaints(prev => prev.map(c => c.id === complaintId ? {
        ...c,
        officerComment: text.trim(),
        officerCommentAt: new Date().toISOString()
      } : c));

      alert("Comment successfully published and pushed to Citizen's ledger dashboard!");
    } catch (err: any) {
      console.error("[OfficerDashboard] Failed to save comment:", err);
      alert("Failed to save comment: " + err.message);
    } finally {
      setCommentSaving(prev => ({ ...prev, [complaintId]: false }));
    }
  };

  const fetchRecentChecks = async (isLoadMore: any = false) => {
    const actualLoadMore = isLoadMore === true;
    try {
      if (actualLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }
      
      const checksList: SafetyCheckRecord[] = [];
      let nextLastVisible = null;
      let snapshotSize = 0;

      try {
        const checksCol = collection(db, "checks");
        let q;
        if (actualLoadMore && lastVisible) {
          q = query(
            checksCol,
            orderBy("timestamp", "desc"),
            startAfter(lastVisible),
            firestoreLimit(50)
          );
        } else {
          q = query(
            checksCol,
            orderBy("timestamp", "desc"),
            firestoreLimit(50)
          );
        }

        const snapshot = await getDocs(q);
        snapshotSize = snapshot.size;
        nextLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

        snapshot.forEach((doc) => {
          checksList.push({
            id: doc.id,
            ...(doc.data() as any)
          } as SafetyCheckRecord);
        });

      } catch (dbErr: any) {
        console.error("[Firestore] Direct read failed:", dbErr);
        if (dbErr.code === "permission-denied" || dbErr.message?.toLowerCase().includes("permission")) {
          const authError = {
            error: "Missing or insufficient permissions",
            collection: "checks",
            operation: "list",
            authenticated: !!auth.currentUser,
            email: auth.currentUser?.email || "anonymous"
          };
          throw new Error(JSON.stringify(authError));
        }
        throw dbErr;
      }

      // Default pre-seeded demo checks to ensure the Officer Dashboard always looks populated
      const fallbackChecks: SafetyCheckRecord[] = [
        {
          id: "f1",
          type: "scam",
          inputSummary: "WhatsApp message demanding ₹50,000 to clear a FedEx package alleged to contain illegal MDMA. Threatened immediate CBI arrest if call disconnected.",
          verdict: "Likely Scam",
          riskScore: 98,
          timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
        },
        {
          id: "f2",
          type: "currency",
          inputSummary: "Banknote Visual Diagnostic (Confidence: 85%) - ₹500 series with shifted security thread and blurred watermark boundary.",
          verdict: "Suspicious",
          riskScore: 75,
          timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
        },
        {
          id: "f3",
          type: "scam",
          inputSummary: "Automated robocall from 'TRAI' warning that the user's Aadhaar SIM is linked to illegal texting and will be suspended within 2 hours unless they dial 9.",
          verdict: "Likely Scam",
          riskScore: 92,
          timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
        },
        {
          id: "f4",
          type: "scam",
          inputSummary: "Inquiry about standard passport renewal process, checking whether a private verification fee is needed.",
          verdict: "Likely Safe",
          riskScore: 12,
          timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
        },
        {
          id: "f5",
          type: "currency",
          inputSummary: "Banknote Visual Diagnostic (Confidence: 94%) - ₹2000 series with crisp microprinting and correct watermark alignments.",
          verdict: "Likely Genuine",
          riskScore: 10,
          timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString()
        },
        {
          id: "f6",
          type: "payment",
          inputSummary: "Payment Check: QR Code cashback request labeled 'Scan to receive ₹2,000 credit'. Scan triggers actual outbound debit request.",
          verdict: "This will SEND money from your account",
          riskScore: 95,
          timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
        },
        {
          id: "f7",
          type: "payment",
          inputSummary: "Payment Check: Static profile QR code for payee 'Delhi Metro Rail Corp'.",
          verdict: "This will SEND money from your account",
          riskScore: 55,
          timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString()
        },
        {
          id: "f8",
          type: "investment",
          inputSummary: "Investment Check: 'VIP Trading Signals WhatsApp Group' promising 5% daily compounded returns via an offshore trading app.",
          verdict: "Likely Scam",
          riskScore: 98,
          timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
        },
        {
          id: "f9",
          type: "investment",
          inputSummary: "Investment Check: Standard Treasury Bond mutual fund inquiry about public sector bank yields.",
          verdict: "Likely Safe",
          riskScore: 5,
          timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
        }
      ];

      if (actualLoadMore) {
        setChecks((prev) => {
          const combined = [...prev, ...checksList];
          const seen = new Set();
          const unique = combined.filter((c) => {
            if (seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
          });
          unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          return unique;
        });
        setLastVisible(nextLastVisible);
        setHasMore(snapshotSize === 50);
      } else {
        const existingIds = new Set(checksList.map(c => c.id));
        const filteredFallbacks = fallbackChecks.filter(c => !existingIds.has(c.id));
        const combined = [...checksList, ...filteredFallbacks];
        combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setChecks(combined);
        setLastVisible(nextLastVisible);
        setHasMore(snapshotSize === 50);
      }
    } catch (err: any) {
      console.error("Failed to fetch checks:", err);
      try {
        const jsonErr = JSON.parse(err.message);
        if (jsonErr.error === "Missing or insufficient permissions") {
          setError(`Access Denied: ${jsonErr.error} on collection '${jsonErr.collection}'. Authenticated email: ${jsonErr.email}`);
          return;
        }
      } catch (e) {
        // not a JSON error
      }
      setError(err.message || "Failed to load recent checks.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchRecentChecks();
  }, []);

  useEffect(() => {
    if (dashboardTab === "complaints") {
      fetchComplaints();
    }
  }, [dashboardTab]);

  const filteredChecks = checks.filter((c) => {
    // Type Filter
    if (filterType !== "all" && c.type !== filterType) return false;

    // Risk Filter
    if (filterRisk === "high" && c.riskScore < 70) return false;
    if (filterRisk === "medium" && (c.riskScore < 40 || c.riskScore >= 70)) return false;
    if (filterRisk === "low" && c.riskScore >= 40) return false;

    // Search Term Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.inputSummary.toLowerCase().includes(term) ||
        c.verdict.toLowerCase().includes(term) ||
        c.type.toLowerCase().includes(term)
      );
    }

    return true;
  });

  const filteredComplaints = complaints.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.reporterName || "").toLowerCase().includes(term) ||
      (c.description || "").toLowerCase().includes(term) ||
      (c.referenceId || "").toLowerCase().includes(term) ||
      (c.category || "").toLowerCase().includes(term) ||
      (c.username || "").toLowerCase().includes(term)
    );
  });

  // Calculate high-level metrics
  const totalScams = checks.filter(c => c.type === "scam").length;
  const totalCurrency = checks.filter(c => c.type === "currency").length;
  const totalPayment = checks.filter(c => c.type === "payment").length;
  const totalInvestment = checks.filter(c => c.type === "investment").length;
  const highRiskCount = checks.filter(c => c.riskScore >= 70).length;
  const averageRisk = checks.length > 0 ? Math.round(checks.reduce((acc, c) => acc + c.riskScore, 0) / checks.length) : 0;

  const getRiskColor = (score: number) => {
    if (score >= 70) return { bg: "bg-red-50 text-red-700 border-red-200", bar: "bg-red-600" };
    if (score >= 40) return { bg: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-500" };
    return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-600" };
  };

  return (
    <div className="space-y-8 py-4 max-w-7xl mx-auto">
      {/* Title Header area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest border border-slate-200">
            <PoliceIcon className="w-3.5 h-3.5 text-slate-800" /> Public Safety Operations
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Officer Diagnostic Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Heuristic intelligence log monitor and risk analysis for civil protection.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              if (dashboardTab === "scans") {
                fetchRecentChecks();
              } else {
                fetchComplaints();
              }
            }}
            disabled={dashboardTab === "scans" ? loading : loadingComplaints}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(dashboardTab === "scans" ? loading : loadingComplaints) ? "animate-spin" : ""}`} />
            {dashboardTab === "scans" ? "Refresh Logs" : "Refresh Complaints"}
          </button>

          <button
            onClick={handleSignOut}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs font-bold transition-colors inline-flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Tab Switcher: Scans vs Complaints */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setDashboardTab("scans")}
          className={`px-6 py-3 text-xs uppercase font-extrabold tracking-widest border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            dashboardTab === "scans"
              ? "border-slate-900 text-slate-900 bg-slate-50/50"
              : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/10"
          }`}
        >
          <Activity className="w-4 h-4" />
          Diagnostic Scan Logs
        </button>
        <button
          onClick={() => setDashboardTab("complaints")}
          className={`px-6 py-3 text-xs uppercase font-extrabold tracking-widest border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            dashboardTab === "complaints"
              ? "border-slate-900 text-slate-900 bg-slate-50/50"
              : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/10"
          }`}
        >
          <FileText className="w-4 h-4" />
          Citizen Complaints
          {complaints.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 bg-rose-500 text-white font-mono text-[9px] font-black rounded-full">
              {complaints.length}
            </span>
          )}
        </button>
      </div>

      {dashboardTab === "scans" ? (
        <>
          {/* Metric summary boxes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Safety Scans</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">{checks.length}</div>
              <div className="text-[10px] text-slate-500 mt-1">Real-time combined registry</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">High Risk Incidents</div>
              <div className="text-3xl font-extrabold text-red-600 mt-1">{highRiskCount}</div>
              <div className="text-[10px] text-red-500 font-medium mt-1">Threat index &gt;= 70%</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Avg Threat Rating</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">{averageRisk}%</div>
              <div className="text-[10px] text-slate-500 mt-1">Overall platform heuristic</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Channels Checked</div>
              <div className="text-xl font-extrabold text-slate-900 mt-2">
                {totalScams}<span className="text-[10px] font-normal text-slate-400 ml-0.5">scam</span>
                <span className="text-slate-300 mx-0.5">/</span>
                {totalCurrency}<span className="text-[10px] font-normal text-slate-400 ml-0.5">cash</span>
                <span className="text-slate-300 mx-0.5">/</span>
                {totalPayment}<span className="text-[10px] font-normal text-slate-400 ml-0.5">pay</span>
                <span className="text-slate-300 mx-0.5">/</span>
                {totalInvestment}<span className="text-[10px] font-normal text-slate-400 ml-0.5">inv</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Multi-modal classification</div>
            </div>
          </div>

          {/* Filter and search bar controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full text-xs focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              {/* Type dropdown */}
              <div className="flex items-center gap-1.5 border border-slate-200 rounded-full px-3 py-1.5 bg-slate-50">
                <Filter className="w-3 h-3 text-slate-400" />
                <select
                  value={filterType}
                  onChange={(e: any) => setFilterType(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">All Channels</option>
                  <option value="scam">Scam Inputs</option>
                  <option value="currency">Currency Scans</option>
                  <option value="payment">Payment Scans</option>
                  <option value="investment">Investment Scans</option>
                </select>
              </div>

              {/* Risk Level Dropdown */}
              <div className="flex items-center gap-1.5 border border-slate-200 rounded-full px-3 py-1.5 bg-slate-50">
                <ArrowDownWideNarrow className="w-3 h-3 text-slate-400" />
                <select
                  value={filterRisk}
                  onChange={(e: any) => setFilterRisk(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">All Risk Indices</option>
                  <option value="high">High Risk (&gt;=70)</option>
                  <option value="medium">Medium Risk (40-69)</option>
                  <option value="low">Low Risk (&lt;40)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Logs Table Area */}
          {loading ? (
            <div className="py-20 text-center space-y-4 bg-white border border-slate-200 rounded-2xl">
              <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Querying secure Firestore safety database...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center space-y-4 bg-white border border-red-200 rounded-2xl">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Operational Log Fetch Failed</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
              <button
                onClick={fetchRecentChecks}
                className="px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold"
              >
                Retry Connection
              </button>
            </div>
          ) : filteredChecks.length === 0 ? (
            <div className="py-20 text-center bg-white border border-slate-200 rounded-2xl space-y-2">
              <CheckCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No matching threat signatures found</p>
              <p className="text-xs text-slate-400">Try loosening your search query or filter presets.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-4 pl-6 w-12">Type</th>
                      <th className="p-4">Incident Log / Input Abstract</th>
                      <th className="p-4 w-36">Verdict / Rating</th>
                      <th className="p-4 w-36 text-right">Risk Score</th>
                      <th className="p-4 pr-6 w-24 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredChecks.map((item, idx) => {
                      const riskConfig = getRiskColor(item.riskScore);
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 pl-6">
                            {item.type === "scam" ? (
                              <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 inline-block" title="Scam Threat Record">
                                <ShieldAlert className="w-4 h-4" />
                              </div>
                            ) : item.type === "payment" ? (
                              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 inline-block" title="Payment Request Scan">
                                <QrCode className="w-4 h-4" />
                              </div>
                            ) : item.type === "investment" ? (
                              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 inline-block" title="Investment Scheme Audit">
                                <TrendingUp className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="p-2 rounded-lg bg-teal-50 text-teal-600 border border-teal-100 inline-block" title="Banknote Visual Check">
                                <Coins className="w-4 h-4" />
                              </div>
                            )}
                          </td>
                          <td className="p-4 max-w-md">
                            <div className="font-medium text-slate-800 line-clamp-2 leading-relaxed">
                              {item.inputSummary}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 font-mono">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (IST)
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 border text-[10px] font-extrabold uppercase rounded-full ${riskConfig.bg}`}>
                              {item.verdict}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                <div className={`h-full ${riskConfig.bar}`} style={{ width: `${item.riskScore}%` }}></div>
                              </div>
                              <span className="font-mono font-bold text-slate-800 text-sm">
                                {item.riskScore}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <button
                              onClick={() => setSelectedCheck(item)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-[10px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {hasMore ? (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center">
                  <button
                    onClick={() => fetchRecentChecks(true)}
                    disabled={loadingMore}
                    className="px-6 py-2 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white rounded-full text-xs font-bold transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm animate-none"
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Loading older logs...
                      </>
                    ) : (
                      "Load More Logs"
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center text-[10px] text-slate-400 font-mono">
                  All available records loaded
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Complaints Metric boxes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Complaints</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">{complaints.length}</div>
              <div className="text-[10px] text-slate-500 mt-1">Submitted via public ledger portal</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Capital Lost</div>
              <div className="text-3xl font-extrabold text-rose-600 mt-1">
                ₹{complaints.reduce((sum, c) => sum + (Number(c.amountLost) || 0), 0).toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-red-500 font-medium mt-1">Combined citizen financial impact</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Awaiting Action</div>
              <div className="text-3xl font-extrabold text-amber-500 mt-1">
                {complaints.filter(c => !c.officerComment).length}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">Unresolved reports without comments</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Addressed Complaints</div>
              <div className="text-3xl font-extrabold text-emerald-600 mt-1">
                {complaints.filter(c => c.officerComment).length}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Officer advisory comment attached</div>
            </div>
          </div>

          {/* Complaints Search bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search complaints (reporter, category, description)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full text-xs focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium italic">
              Showing {filteredComplaints.length} of {complaints.length} registered reports
            </div>
          </div>

          {/* Complaints List Area */}
          {loadingComplaints ? (
            <div className="py-20 text-center space-y-4 bg-white border border-slate-200 rounded-2xl">
              <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Querying secure Firestore citizen complaint ledger...</p>
            </div>
          ) : complaintsError ? (
            <div className="p-6 text-center space-y-4 bg-white border border-red-200 rounded-2xl">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Operational Log Fetch Failed</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">{complaintsError}</p>
              <button
                onClick={fetchComplaints}
                className="px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold"
              >
                Retry Connection
              </button>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="py-20 text-center bg-white border border-slate-200 rounded-2xl space-y-2">
              <CheckCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No matching citizen reports found</p>
              <p className="text-xs text-slate-400">All citizens are safe, or no reports match filter criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComplaints.map((item) => {
                const isSaving = commentSaving[item.id] || false;
                const currentVal = commentInputs[item.id] || "";
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition space-y-5 text-left"
                  >
                    {/* Header: Badge & ID & Timestamp */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase rounded-full">
                          {item.category?.toUpperCase() || "CYBER FRAUD"}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Ref: <strong className="text-slate-600 font-bold">{item.referenceId || "N/A"}</strong>
                        </span>
                        {item.username && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 border border-cyan-200 rounded-full text-[10px] text-cyan-700 font-mono">
                            <UserCheck className="w-3 h-3" /> @{item.username}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A"} (IST)
                      </span>
                    </div>

                    {/* Complaint Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="md:col-span-2 space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Incident Narrative / Description</span>
                          <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 border border-slate-100 rounded-xl italic font-medium">
                            "{item.description}"
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-xl space-y-3 flex flex-col justify-center">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Reporter Identity</span>
                          <span className="font-bold text-slate-800 text-xs">
                            {item.isAnonymous ? "Anonymous Citizen" : (item.reporterName || "Registered User")}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Financial Extortion Loss</span>
                          <span className="font-mono font-bold text-rose-600 text-sm">
                            {item.amountLost > 0 ? `₹${Number(item.amountLost).toLocaleString()}` : "No funds lost"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Threat Extortion Contact / Source</span>
                          <span className="font-medium text-slate-700 truncate block text-xs" title={item.scammerDetails}>
                            {item.scammerDetails || "Not Specified"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Officer Advisory Comments Panel */}
                    <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-3.5 text-left">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-800" />
                          Official Advisory Comment Ledger
                        </div>
                        {item.officerCommentAt && (
                          <span className="text-[9px] font-mono text-slate-400">
                            Last Updated: {new Date(item.officerCommentAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <textarea
                          placeholder="Write case review comments, guidance advice, alert status updates, or instructional countermeasures to protect this citizen..."
                          value={currentVal}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-full h-20 p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-1 focus:ring-slate-900 outline-none transition resize-none leading-relaxed"
                        />
                        
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSaveComment(item.id)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            {isSaving ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Publishing comment...
                              </>
                            ) : (
                              <>
                                <MessageSquare className="w-3.5 h-3.5" />
                                {item.officerComment ? "Update Comment Ledger" : "Publish Advisory Comment"}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Inspect Item Overlay Modal */}
      <AnimatePresence>
        {selectedCheck && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCheck(null)}
              className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs"
            ></motion.div>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-xl w-full relative z-10 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className={`px-2.5 py-0.5 border text-[10px] font-extrabold uppercase rounded-full inline-block ${getRiskColor(selectedCheck.riskScore).bg}`}>
                    {selectedCheck.type === "scam" ? "Scam" : selectedCheck.type === "payment" ? "Payment" : selectedCheck.type === "investment" ? "Investment" : "Currency"} &bull; {selectedCheck.verdict}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mt-2">
                    Threat Record Inspection
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-extrabold font-mono text-slate-900 leading-none">
                    {selectedCheck.riskScore}%
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Risk index
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Input Summary / Transcript Snippet</span>
                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl leading-relaxed text-slate-700 italic font-medium whitespace-pre-wrap">
                    "{selectedCheck.inputSummary}"
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block">Logging Channel</span>
                    <span className="font-bold text-slate-800 uppercase text-xs">
                      {selectedCheck.type === "scam" ? "Scam & Coercion Analyzer" : selectedCheck.type === "payment" ? "UPI QR / Request Checker" : selectedCheck.type === "investment" ? "Investment Scheme Analyzer" : "Visual Note Scanner"}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block">Registry Timestamp</span>
                    <span className="font-mono text-slate-600">
                      {new Date(selectedCheck.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedCheck(null)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-xs transition cursor-pointer"
                >
                  Close Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
