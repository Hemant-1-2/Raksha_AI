import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  ArrowLeft, 
  Loader2, 
  AlertTriangle, 
  LogIn, 
  User, 
  Lock, 
  Smartphone, 
  Mail, 
  MapPin, 
  UserCheck, 
  UserPlus, 
  Eye, 
  EyeOff, 
  Settings 
} from "lucide-react";
import { motion } from "motion/react";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";
import { ScreenType } from "../types";

interface OfficerLoginProps {
  onNavigate: (screen: ScreenType) => void;
  onAuthSuccess: (user: any) => void;
}

export default function OfficerLogin({ onNavigate, onAuthSuccess }: OfficerLoginProps) {
  // Tabs
  const [activeTab, setActiveTab] = useState<"citizen" | "official">("citizen");
  const [citizenMode, setCitizenMode] = useState<"login" | "register" | "complete-google-profile">("login");

  // Loading & Errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Field states for Registration & Profile Setup
  const [name, setName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [address, setAddress] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Temporary Google User data for first-time sign-ins needing profile completion
  const [googleUserTemp, setGoogleUserTemp] = useState<any>(null);

  // Field states for Citizen Login
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Field states for Official Login
  const [officialUsername, setOfficialUsername] = useState("");
  const [officialPassword, setOfficialPassword] = useState("");

  // Reset inputs when swapping modes
  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [activeTab, citizenMode]);

  // Handle Citizen Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const userEmail = result.user.email || "";
        
        // Query users collection for a matching email
        const q = query(collection(db, "users"), where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // User exists! Load profile and log in
          const userData = querySnapshot.docs[0].data();
          const citizenSession = {
            username: userData.username,
            email: userData.email,
            displayName: userData.name,
            mobileNo: userData.mobileNo,
            address: userData.address,
            isGoogle: true
          };

          localStorage.setItem("raksha_user", JSON.stringify(citizenSession));
          localStorage.setItem("raksha_user_type", "custom");
          localStorage.setItem("raksha_authorized", "false");
          onAuthSuccess(citizenSession);
          setSuccess("Authentication successful! Welcome to Raksha AI.");
          setTimeout(() => {
            onNavigate("citizen-dashboard");
          }, 1000);
        } else {
          // First time sign-in: must fill out details
          setGoogleUserTemp(result.user);
          setName(result.user.displayName || "");
          setEmailId(userEmail);
          setCitizenMode("complete-google-profile");
        }
      }
    } catch (err: any) {
      console.error("Google Sign-In failed:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Failed to authenticate with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Citizen Login with Username/Password
  const handleCitizenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) {
      setError("Please fill in both username and password.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const uName = loginUsername.trim().toLowerCase();
      const userDocRef = doc(db, "users", uName);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.password === loginPassword) {
          // Success!
          const citizenSession = {
            username: userData.username,
            email: userData.email,
            displayName: userData.name,
            mobileNo: userData.mobileNo,
            address: userData.address,
            isGoogle: false
          };

          localStorage.setItem("raksha_user", JSON.stringify(citizenSession));
          localStorage.setItem("raksha_user_type", "custom");
          localStorage.setItem("raksha_authorized", "false");
          onAuthSuccess(citizenSession);
          setSuccess(`Welcome back, ${userData.name}!`);
          setTimeout(() => {
            onNavigate("citizen-dashboard");
          }, 1000);
        } else {
          setError("Invalid password. Please check your credentials.");
        }
      } else {
        setError("Username not found. If you are new, please register a profile first.");
      }
    } catch (err: any) {
      console.error("Citizen Login error:", err);
      setError(err.message || "Error logging in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Citizen Profile Registration / Completion
  const handleCitizenRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !emailId.trim() || !mobileNo.trim() || !address.trim() || !username.trim() || !password) {
      setError("All fields are mandatory. Please fill out every detail.");
      return;
    }

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const targetUsername = username.trim().toLowerCase();
      const userDocRef = doc(db, "users", targetUsername);
      const userDocSnap = await getDoc(userDocRef);

      // Check if username already exists
      if (userDocSnap.exists()) {
        setError("Username is already taken. Please set a different, unique username.");
        setLoading(false);
        return;
      }

      // Check if email already registered (for non-Google registration)
      if (!googleUserTemp) {
        const emailQuery = query(collection(db, "users"), where("email", "==", emailId.trim().toLowerCase()));
        const emailSnap = await getDocs(emailQuery);
        if (!emailSnap.empty) {
          setError("An account with this email address already exists. Please log in.");
          setLoading(false);
          return;
        }
      }

      // Save user profile to Firestore
      const profileData = {
        username: targetUsername,
        password: password, // Store for credential check
        name: name.trim(),
        email: emailId.trim().toLowerCase(),
        mobileNo: mobileNo.trim(),
        address: address.trim(),
        authMethod: googleUserTemp ? "google" : "password",
        createdAt: new Date().toISOString()
      };

      await setDoc(userDocRef, profileData);

      // Login session setup
      const citizenSession = {
        username: profileData.username,
        email: profileData.email,
        displayName: profileData.name,
        mobileNo: profileData.mobileNo,
        address: profileData.address,
        isGoogle: !!googleUserTemp
      };

      localStorage.setItem("raksha_user", JSON.stringify(citizenSession));
      localStorage.setItem("raksha_user_type", "custom");
      localStorage.setItem("raksha_authorized", "false");
      
      onAuthSuccess(citizenSession);
      setSuccess("Profile registered successfully! Logging in...");
      setTimeout(() => {
        onNavigate("citizen-dashboard");
      }, 1000);

    } catch (err: any) {
      console.error("Profile registration error:", err);
      setError(err.message || "Failed to register profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Official & Government Officials Login
  const handleOfficialLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialUsername.trim() || !officialPassword) {
      setError("Please input both official username and secure password.");
      return;
    }

    setLoading(true);
    setError(null);

    // Verify Password against "rakshakai"
    if (officialPassword === "rakshakai") {
      const uName = officialUsername.trim();
      const officialSession = {
        username: uName.toLowerCase(),
        email: uName.includes("@") ? uName : `${uName}@rakshaai.gov.in`,
        displayName: `Official [${uName}]`,
        isOfficial: true
      };

      localStorage.setItem("raksha_user", JSON.stringify(officialSession));
      localStorage.setItem("raksha_user_type", "custom");
      localStorage.setItem("raksha_authorized", "true");

      onAuthSuccess(officialSession);
      setSuccess("Decryption & Official authentication successful!");
      setTimeout(() => {
        onNavigate("officer-dashboard");
      }, 1000);
    } else {
      setError("Unauthorized Credentials: Password does not match Department specifications. Try again.");
      setLoading(false);
    }
  };

  const handleCancelGoogleCompletion = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Failed to sign out on cancel:", err);
    }
    setGoogleUserTemp(null);
    setCitizenMode("login");
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0b0c16]/95 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,240,255,0.04)] backdrop-blur-md relative overflow-hidden"
      >
        {/* Glow header decoration */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

        {/* Navigation back option */}
        <button
          onClick={() => onNavigate("home")}
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold transition mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sovereign Portal
        </button>

        {/* Portal Branding and Tab Selectors */}
        <div className="text-center space-y-4 mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.08)]">
            <ShieldCheck className="w-7 h-7 text-cyan-400" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-white tracking-tight">
              Raksha AI Security & Identity Portal
            </h2>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase font-mono">
              Sovereign Verification Gateway
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        {citizenMode !== "complete-google-profile" && (
          <div className="grid grid-cols-2 p-1 bg-[#05060e] rounded-xl border border-slate-900 mb-6">
            <button
              onClick={() => setActiveTab("citizen")}
              className={`py-2 rounded-lg text-xs font-bold transition uppercase tracking-wider cursor-pointer ${
                activeTab === "citizen"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Citizen Portal
            </button>
            <button
              onClick={() => setActiveTab("official")}
              className={`py-2 rounded-lg text-xs font-bold transition uppercase tracking-wider cursor-pointer ${
                activeTab === "official"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Official Terminal
            </button>
          </div>
        )}

        {/* Feedback alerts */}
        {error && (
          <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl flex items-start gap-2.5 mb-5">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="text-[11px] text-slate-300 leading-normal font-sans">
              {error}
            </span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 mb-5">
            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-[11px] text-slate-300 leading-normal font-sans">
              {success}
            </span>
          </div>
        )}

        {/* Render Citizen Views */}
        {activeTab === "citizen" && (
          <div>
            {citizenMode === "login" && (
              <div className="space-y-4">
                {/* Google Auth Button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 bg-[#0e1022] hover:bg-[#151833] border border-slate-800 hover:border-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                      />
                    </svg>
                  )}
                  Sign In with Google
                </button>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-[1px] bg-slate-800 flex-grow"></div>
                  <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Or Username Login</span>
                  <div className="h-[1px] bg-slate-800 flex-grow"></div>
                </div>

                {/* Password-based Form */}
                <form onSubmit={handleCitizenLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Username</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Enter your unique username"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter account password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-500 hover:text-white transition cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-black tracking-wider transition-all uppercase cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 text-slate-950 animate-spin" /> : <LogIn className="w-4 h-4 text-slate-950" />}
                    Citizen Sign In
                  </button>
                </form>

                <div className="text-center pt-3">
                  <button
                    onClick={() => setCitizenMode("register")}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold tracking-wide transition cursor-pointer"
                  >
                    Don't have an account? Register Profile
                  </button>
                </div>
              </div>
            )}

            {/* Direct Citizen Registration Profile Form */}
            {(citizenMode === "register" || citizenMode === "complete-google-profile") && (
              <form onSubmit={handleCitizenRegistration} className="space-y-4">
                <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-1.5 mb-2 text-center">
                  <h3 className="text-xs font-extrabold text-white uppercase font-mono tracking-wide">
                    {citizenMode === "complete-google-profile" ? "Complete Your Security Profile" : "Register Citizen Profile"}
                  </h3>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {citizenMode === "complete-google-profile" 
                      ? "First time login with Google. Please set a username, password, and contact details to proceed."
                      : "Provide credentials to secure your citizen file registry."
                    }
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Full Name</label>
                  <input
                    type="text"
                    placeholder="E.g. Hemant Parmar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Email ID</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="email"
                        placeholder="email@example.com"
                        value={emailId}
                        onChange={(e) => setEmailId(e.target.value)}
                        disabled={citizenMode === "complete-google-profile"}
                        className="w-full pl-9 pr-3 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Mobile No</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-3 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="tel"
                        placeholder="10-digit mobile no."
                        value={mobileNo}
                        onChange={(e) => setMobileNo(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Residential Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <textarea
                      placeholder="Enter full physical address details"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors resize-none font-sans"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Choose Username</label>
                    <input
                      type="text"
                      placeholder="e.g. hemant150"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Set Password</label>
                    <input
                      type="password"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-black tracking-wider transition-all uppercase cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                >
                  {loading ? <Loader2 className="w-4 h-4 text-slate-950 animate-spin" /> : <UserPlus className="w-4 h-4 text-slate-950" />}
                  {citizenMode === "complete-google-profile" ? "Submit & Sync Profile" : "Register Profile"}
                </button>

                <div className="text-center pt-2">
                  {citizenMode === "complete-google-profile" ? (
                    <button
                      type="button"
                      onClick={handleCancelGoogleCompletion}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-bold tracking-wide transition cursor-pointer"
                    >
                      Cancel and Sign Out
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCitizenMode("login")}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold tracking-wide transition cursor-pointer"
                    >
                      Already have an account? Log In
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* Render Official / Government Officials Terminal */}
        {activeTab === "official" && (
          <form onSubmit={handleOfficialLogin} className="space-y-5">
            <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl flex items-start gap-2.5">
              <Settings className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 animate-spin-slow" />
              <div className="space-y-1">
                <h4 className="text-[10px] font-extrabold text-white uppercase font-mono tracking-wide">Official Safety Node</h4>
                <p className="text-[9px] text-slate-400 leading-normal leading-relaxed">
                  Department terminals require valid administrative identity keys. Set password to <strong className="text-indigo-300">rakshakai</strong> to inspect system checks.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Official Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. inspector_hemant"
                  value={officialUsername}
                  onChange={(e) => setOfficialUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password matches department key"
                  value={officialPassword}
                  onChange={(e) => setOfficialPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-[#05060e] border border-slate-800 focus:border-cyan-500 text-xs rounded-xl outline-none text-white transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-white transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-black tracking-wider transition-all uppercase cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
            >
              {loading ? <Loader2 className="w-4 h-4 text-slate-950 animate-spin" /> : <LogIn className="w-4 h-4 text-slate-950" />}
              Officials Sign In
            </button>
          </form>
        )}

        <div className="mt-8 pt-5 border-t border-slate-900/60 text-center">
          <span className="text-[8px] text-slate-500 font-mono tracking-widest uppercase">
            Protected by sovereign cyber defense shield
          </span>
        </div>
      </motion.div>
    </div>
  );
}
