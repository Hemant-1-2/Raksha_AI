import React, { useState, useEffect } from "react";
import { User, Mail, Smartphone, MapPin, Edit3, ShieldAlert, Loader2, FileText, CheckCircle, Save, Plus, AlertCircle, RefreshCw, MessageSquare, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, where, orderBy, limit as firestoreLimit, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

interface CitizenDashboardProps {
  user: any;
  onUpdateUser: (updatedUser: any) => void;
  onNavigate: (screen: any) => void;
}

interface UserReport {
  id: string;
  category: string;
  description: string;
  scammerDetails: string;
  amountLost: number;
  reporterName: string;
  isAnonymous: boolean;
  referenceId: string;
  timestamp: string;
  username?: string;
  officerComment?: string;
  officerCommentAt?: string;
}

export default function CitizenDashboard({ user, onUpdateUser, onNavigate }: CitizenDashboardProps) {
  const [activeTab, setActiveTab] = useState<"details" | "edit" | "complaints">("details");

  // Profile Edit fields
  const [editName, setEditName] = useState(user?.displayName || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [editMobile, setEditMobile] = useState(user?.mobileNo || "");
  const [editAddress, setEditAddress] = useState(user?.address || "");

  // Status states
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Complaints state
  const [complaints, setComplaints] = useState<UserReport[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintsError, setComplaintsError] = useState<string | null>(null);

  // Initialize edit states when user changes
  useEffect(() => {
    if (user) {
      setEditName(user.displayName || "");
      setEditEmail(user.email || "");
      setEditMobile(user.mobileNo || "");
      setEditAddress(user.address || "");
    }
  }, [user]);

  // Fetch citizen's complaints/reports
  const fetchUserComplaints = async () => {
    if (!user || !user.username) return;
    setLoadingComplaints(true);
    setComplaintsError(null);

    try {
      const reportsList: UserReport[] = [];
      const reportsCol = collection(db, "reports");
      
      // Query specific user reports using indexed query with safety limit
      const q = query(
        reportsCol,
        where("username", "==", user.username.toLowerCase()),
        orderBy("timestamp", "desc"),
        firestoreLimit(15)
      );

      const snapshot = await getDocs(q);
      snapshot.forEach((docSnap) => {
        reportsList.push({
          id: docSnap.id,
          ...docSnap.data()
        } as UserReport);
      });

      setComplaints(reportsList);
    } catch (err: any) {
      console.error("[CitizenDashboard] Error loading complaints:", err);
      setComplaintsError("Could not retrieve complaints from database. Some indexes may be generating, or Firestore is in offline mode.");
      
      // Fallback: check local storage or show empty
      setComplaints([]);
    } finally {
      setLoadingComplaints(false);
    }
  };

  // Fetch complaints on load or tab active
  useEffect(() => {
    if (activeTab === "complaints") {
      fetchUserComplaints();
    }
  }, [activeTab, user]);

  // Submit Profile Changes
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.username) return;

    if (!editName.trim() || !editEmail.trim() || !editMobile.trim() || !editAddress.trim()) {
      setSaveError("All fields are required. Please fill in all information.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const uName = user.username.toLowerCase();
      const userDocRef = doc(db, "users", uName);

      const updatedProfile = {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        mobileNo: editMobile.trim(),
        address: editAddress.trim(),
        updatedAt: new Date().toISOString()
      };

      // Write changes to Firestore
      await updateDoc(userDocRef, updatedProfile);

      // Create new local session object
      const updatedSession = {
        ...user,
        displayName: updatedProfile.name,
        email: updatedProfile.email,
        mobileNo: updatedProfile.mobileNo,
        address: updatedProfile.address
      };

      // Update Parent State & localStorage
      onUpdateUser(updatedSession);
      localStorage.setItem("raksha_user", JSON.stringify(updatedSession));

      setSaveSuccess("Your profile details have been successfully updated!");
      setTimeout(() => {
        setActiveTab("details");
        setSaveSuccess(null);
      }, 1500);

    } catch (err: any) {
      console.error("[CitizenDashboard] Error updating profile:", err);
      setSaveError(err.message || "Failed to update profile details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "digital_arrest": return "Digital Arrest";
      case "whatsapp_phishing": return "WhatsApp Phishing";
      case "customs_courier": return "Customs & Courier";
      case "identity_theft": return "Identity Theft";
      default: return "Financial Fraud / Other";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans">
      
      {/* 1. Header Hero Panel */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900/90 via-[#0a0d1d] to-slate-900/90 border border-slate-800/80 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-cyan-500/10 text-[9px] font-black font-mono tracking-widest text-cyan-400 rounded-full border border-cyan-500/20 uppercase">
              Citizen Protection Node
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Active Secure Connection</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            WELCOME BACK, <span className="text-cyan-400 uppercase">{user?.displayName || user?.username}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Inspect your profile, modify secure registration coordinates, and monitor the real-time resolution status of your safety complaints.
          </p>
        </div>
        
        <button
          onClick={() => onNavigate("resources")}
          className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition shadow-[0_0_15px_rgba(0,240,255,0.25)] flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          File New Complaint
        </button>
      </div>

      {/* 2. Sub-navigation tabs */}
      <div className="flex border-b border-slate-800/80 pb-px gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("details")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === "details"
              ? "border-cyan-400 text-cyan-400 bg-cyan-500/5 rounded-t-xl"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Your Details
        </button>
        <button
          onClick={() => setActiveTab("edit")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === "edit"
              ? "border-cyan-400 text-cyan-400 bg-cyan-500/5 rounded-t-xl"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit Details
        </button>
        <button
          onClick={() => setActiveTab("complaints")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === "complaints"
              ? "border-cyan-400 text-cyan-400 bg-cyan-500/5 rounded-t-xl"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Your Complaints
          {complaints.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-cyan-500 text-slate-950 text-[9px] font-black rounded-full leading-none">
              {complaints.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-[#070914]/40 border border-slate-800/50 rounded-3xl p-6 sm:p-8 min-h-[300px]">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: YOUR DETAILS */}
          {activeTab === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/50">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Your Identity Coordinates</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Secured profile credentials currently saved in Raksha AI registries.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Username */}
                <div className="p-4 bg-slate-950/40 border border-slate-800/50 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest block">Unique Username</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">@{user?.username || "N/A"}</span>
                </div>

                {/* Name */}
                <div className="p-4 bg-slate-950/40 border border-slate-800/50 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest block">Full Legal Name</span>
                  <span className="text-xs font-bold text-white">{user?.displayName || "N/A"}</span>
                </div>

                {/* Email */}
                <div className="p-4 bg-slate-950/40 border border-slate-800/50 rounded-2xl space-y-1 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest block">Registered Email ID</span>
                    <span className="text-xs font-medium text-slate-200">{user?.email || "N/A"}</span>
                  </div>
                  <Mail className="w-4 h-4 text-slate-600 shrink-0" />
                </div>

                {/* Mobile */}
                <div className="p-4 bg-slate-950/40 border border-slate-800/50 rounded-2xl space-y-1 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest block">Mobile Number</span>
                    <span className="text-xs font-mono font-bold text-slate-200">{user?.mobileNo || "N/A"}</span>
                  </div>
                  <Smartphone className="w-4 h-4 text-slate-600 shrink-0" />
                </div>

                {/* Residential Address */}
                <div className="p-4 bg-slate-950/40 border border-slate-800/50 rounded-2xl space-y-1 md:col-span-2 flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest block">Residential Address (Coordinates)</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{user?.address || "No address provided."}</p>
                  </div>
                  <MapPin className="w-4 h-4 text-slate-600 shrink-0 mt-1" />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setActiveTab("edit")}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:border-cyan-500/30 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Modify Profile Details
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 2: EDIT DETAILS */}
          {activeTab === "edit" && (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/50">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Modify Profile Coordinates</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Modify your registered contact and residential parameters below.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Full Legal Name</label>
                    <input
                      type="text"
                      placeholder="Enter legal name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors"
                      required
                    />
                  </div>

                  {/* Email field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Registered Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. name@example.com"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors font-mono"
                      required
                    />
                  </div>

                  {/* Mobile field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Active Mobile Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={editMobile}
                      onChange={(e) => setEditMobile(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors font-mono"
                      required
                    />
                  </div>

                  {/* Username (Non-editable) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">User ID (Permanent)</label>
                    <div className="px-4 py-2.5 bg-slate-950/60 border border-slate-900 text-slate-500 text-xs rounded-xl font-mono select-none">
                      @{user?.username || "N/A"}
                    </div>
                  </div>

                  {/* Address field */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Residential Coordinates Address</label>
                    <textarea
                      placeholder="Provide full residential address for formal ledger records"
                      rows={3}
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors resize-none leading-relaxed"
                      required
                    />
                  </div>
                </div>

                {saveError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                {saveSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{saveSuccess}</span>
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("details")}
                    className="px-4 py-2 bg-[#0e1022] border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition shadow-[0_0_15px_rgba(0,240,255,0.2)] flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Parameters
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* TAB 3: YOUR COMPLAINTS */}
          {activeTab === "complaints" && (
            <motion.div
              key="complaints"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Your Registered Safety Complaints</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Official incident records filed under your identity token.</p>
                  </div>
                </div>

                <button
                  onClick={fetchUserComplaints}
                  title="Reload complaints list"
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingComplaints ? "animate-spin text-cyan-400" : ""}`} />
                </button>
              </div>

              {loadingComplaints ? (
                <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 animate-pulse">Reading complaint ledger records...</p>
                </div>
              ) : complaintsError ? (
                <div className="p-5 border border-dashed border-amber-500/25 bg-amber-500/5 rounded-2xl space-y-3 max-w-xl mx-auto text-center">
                  <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">Ledger Reading Warning</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {complaintsError}
                  </p>
                  <button
                    onClick={fetchUserComplaints}
                    className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[10px] uppercase font-mono font-black text-amber-300 hover:bg-amber-500/25 cursor-pointer transition"
                  >
                    Force Sync Retry
                  </button>
                </div>
              ) : complaints.length === 0 ? (
                <div className="py-16 text-center space-y-4 border border-dashed border-slate-800/80 rounded-2xl bg-slate-950/10 max-w-xl mx-auto px-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">No Incidents Logged</div>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                      You currently have no active or completed cybercrime reports recorded under your profile username.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate("resources")}
                    className="px-4 py-2 bg-[#0d1020] border border-slate-800 hover:border-cyan-500/30 text-cyan-400 hover:text-cyan-300 text-xs font-bold uppercase rounded-lg cursor-pointer transition tracking-wider"
                  >
                    File First Report
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {complaints.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 border border-slate-800 bg-[#080a14]/60 rounded-2xl hover:border-slate-700/60 transition space-y-4"
                    >
                      {/* Category Badge & Timestamp */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/25 text-[10px] font-black font-mono uppercase rounded-full text-rose-300">
                            {getCategoryLabel(item.category)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            ID: <strong className="text-slate-400">{item.referenceId}</strong>
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500" title={item.timestamp}>
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>

                      {/* Summary Description */}
                      <p className="text-xs text-slate-300 leading-relaxed bg-[#05060d]/80 border border-slate-900 p-3.5 rounded-xl font-sans">
                        {item.description}
                      </p>

                      {/* Metadata row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
                        <div className="space-y-0.5">
                          <span className="font-mono text-slate-500 uppercase tracking-wider text-[9px] block">Extortion Contact</span>
                          <span className="font-medium text-slate-300 truncate block">{item.scammerDetails}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="font-mono text-slate-500 uppercase tracking-wider text-[9px] block">Financial Loss</span>
                          <span className="font-mono font-bold text-rose-400">
                            {item.amountLost > 0 ? `₹${Number(item.amountLost).toLocaleString()}` : "No funds lost"}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="font-mono text-slate-500 uppercase tracking-wider text-[9px] block">Ledger Profile</span>
                          <span className="font-medium text-cyan-400">
                            {item.isAnonymous ? "Logged Anonymously" : "Logged Under Profile"}
                          </span>
                        </div>
                      </div>

                      {/* Officer comment section if available */}
                      {item.officerComment ? (
                        <div className="mt-3.5 p-4 border border-cyan-500/20 bg-cyan-950/10 rounded-xl space-y-2 text-left">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                            Official Officer Advisory Response
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                            {item.officerComment}
                          </p>
                          {item.officerCommentAt && (
                            <span className="text-[9px] font-mono text-slate-500 block text-right">
                              Logged in Ledger: {new Date(item.officerCommentAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3.5 p-3.5 border border-dashed border-slate-800/60 bg-slate-900/5 rounded-xl text-center text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-slate-600 animate-spin" />
                          Awaiting official review and countermeasures dispatch from active officers
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
