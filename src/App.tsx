import { useState, useEffect } from "react";
import { ShieldAlert, ShieldCheck, Coins, Activity, PhoneCall, Menu, X, Landmark, FileSpreadsheet, QrCode, TrendingUp, HeartHandshake, Loader2, LogOut, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScreenType } from "./types";
import Home from "./components/Home";
import ScamChecker from "./components/ScamChecker";
import CurrencyChecker from "./components/CurrencyChecker";
import PaymentChecker from "./components/PaymentChecker";
import InvestmentChecker from "./components/InvestmentChecker";
import ThreatSupport from "./components/ThreatSupport";
import FraudGraph from "./components/FraudGraph";
import Resources from "./components/Resources";
import OfficerDashboard from "./components/OfficerDashboard";
import SharedResultView from "./components/SharedResultView";
import OfficerLogin from "./components/OfficerLogin";
import CitizenDashboard from "./components/CitizenDashboard";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);

  // Authentication states
  const [user, setUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("raksha_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(() => {
    try {
      const saved = localStorage.getItem("raksha_authorized");
      return saved ? saved === "true" : null;
    } catch {
      return null;
    }
  });
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Parse share parameters from URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const share = params.get("share");
    if (share) {
      setShareId(share);
    }
  }, []);

  // Monitor Authentication and Authorization state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const savedType = localStorage.getItem("raksha_user_type");
      if (savedType === "custom") {
        setCheckingAuth(false);
        return;
      }

      setCheckingAuth(true);
      if (currentUser) {
        const userObj = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          isGoogle: true
        };
        setUser(userObj);
        localStorage.setItem("raksha_user", JSON.stringify(userObj));
        localStorage.setItem("raksha_user_type", "google");
        try {
          const docRef = doc(db, "authorized_officers", currentUser.email || "");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setIsAuthorized(true);
            localStorage.setItem("raksha_authorized", "true");
          } else {
            setIsAuthorized(false);
            localStorage.setItem("raksha_authorized", "false");
          }
        } catch (err) {
          console.error("[Auth] Role verification error:", err);
          setIsAuthorized(false);
          localStorage.setItem("raksha_authorized", "false");
        }
      } else {
        if (savedType === "google") {
          setUser(null);
          setIsAuthorized(false);
          localStorage.removeItem("raksha_user");
          localStorage.removeItem("raksha_user_type");
          localStorage.removeItem("raksha_authorized");
        }
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
    setUser(null);
    setIsAuthorized(false);
    localStorage.removeItem("raksha_user");
    localStorage.removeItem("raksha_user_type");
    localStorage.removeItem("raksha_authorized");
    handleNavigate("home");
  };

  // Synchronize currentScreen with window.location.pathname on load
  useEffect(() => {
    const path = window.location.pathname;
    const cleanPath = path.replace(/^\//, "");
    
    const validScreens: ScreenType[] = [
      "home", "scam-checker", "currency-checker", "payment-checker", 
      "investment-checker", "threat-support", "fraud-graph", 
      "resources", "officer-dashboard", "officer-login", "citizen-dashboard"
    ];
    
    if (validScreens.includes(cleanPath as ScreenType)) {
      setCurrentScreen(cleanPath as ScreenType);
    } else if (cleanPath === "") {
      setCurrentScreen("home");
    }
  }, []);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const cleanPath = path.replace(/^\//, "");
      const validScreens: ScreenType[] = [
        "home", "scam-checker", "currency-checker", "payment-checker", 
        "investment-checker", "threat-support", "fraud-graph", 
        "resources", "officer-dashboard", "officer-login", "citizen-dashboard"
      ];
      
      if (validScreens.includes(cleanPath as ScreenType)) {
        setCurrentScreen(cleanPath as ScreenType);
      } else if (cleanPath === "") {
        setCurrentScreen("home");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigationItems = [
    { id: "home" as ScreenType, label: "Home", icon: Landmark },
    { id: "scam-checker" as ScreenType, label: "Scam & Arrest Checker", icon: ShieldAlert },
    { id: "currency-checker" as ScreenType, label: "Currency Checker", icon: Coins },
    { id: "payment-checker" as ScreenType, label: "Payment Checker", icon: QrCode },
    { id: "investment-checker" as ScreenType, label: "Investment Scheme Checker", icon: TrendingUp },
    { id: "threat-support" as ScreenType, label: "Threat Support", icon: HeartHandshake },
    { id: "fraud-graph" as ScreenType, label: "Fraud Network Graph", icon: Activity },
    { id: "citizen-dashboard" as ScreenType, label: "Citizen Dashboard", icon: UserCheck },
    { id: "officer-dashboard" as ScreenType, label: "Officer Dashboard", icon: FileSpreadsheet },
    { id: "resources" as ScreenType, label: "Report & Resources", icon: PhoneCall }
  ];

  const handleNavigate = (screen: ScreenType) => {
    setCurrentScreen(screen);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const targetPath = screen === "home" ? "/" : `/${screen}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <Home onNavigate={handleNavigate} />;
      case "scam-checker":
        return <ScamChecker />;
      case "currency-checker":
        return <CurrencyChecker />;
      case "payment-checker":
        return <PaymentChecker />;
      case "investment-checker":
        return <InvestmentChecker />;
      case "threat-support":
        return <ThreatSupport />;
      case "fraud-graph":
        return <FraudGraph />;
      case "officer-dashboard":
        if (checkingAuth) {
          return (
            <div className="py-40 text-center flex flex-col items-center justify-center space-y-4 font-sans">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs text-cyan-400 font-mono tracking-widest uppercase animate-pulse">Verifying secure credentials...</p>
            </div>
          );
        }
        if (!user || !isAuthorized) {
          // Redirect unauthenticated/unauthorized users to /officer-login
          setTimeout(() => {
            handleNavigate("officer-login");
          }, 0);
          return null;
        }
        return <OfficerDashboard />;
      case "citizen-dashboard":
        if (checkingAuth) {
          return (
            <div className="py-40 text-center flex flex-col items-center justify-center space-y-4 font-sans">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs text-cyan-400 font-mono tracking-widest uppercase animate-pulse">Verifying citizen credentials...</p>
            </div>
          );
        }
        if (!user) {
          setTimeout(() => {
            handleNavigate("officer-login");
          }, 0);
          return null;
        }
        return <CitizenDashboard user={user} onUpdateUser={setUser} onNavigate={handleNavigate} />;
      case "officer-login":
        return (
          <OfficerLogin 
            onNavigate={handleNavigate} 
            onAuthSuccess={(authenticatedUser) => {
              setUser(authenticatedUser);
              setIsAuthorized(authenticatedUser.isOfficial === true);
            }} 
          />
        );
      case "resources":
        return <Resources />;
      default:
        return <Home onNavigate={handleNavigate} />;
    }
  };

  if (shareId) {
    return <SharedResultView shareId={shareId} onClose={() => setShareId(null)} />;
  }

  return (
    <div className="min-h-screen bg-transparent text-[#f1f5f9] flex flex-col justify-between font-sans">
      
      {/* 1. Header Area with Glassmorphism and Cyber lines */}
      <header className="sticky top-0 z-50 bg-[#070914]/80 border-b border-slate-800/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo Brand Emblem */}
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => handleNavigate("home")}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.35)] transition-transform group-hover:scale-105">
                <ShieldCheck className="w-5.5 h-5.5 text-slate-950 stroke-[2.5]" />
              </div>
              <div className="flex items-center">
                <span className="text-xl sm:text-2xl font-black tracking-wider text-white leading-none font-sans">
                  RAKSHA <span className="text-cyan-400">AI</span>
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 bg-cyan-500/10 text-[10px] font-bold text-cyan-400 rounded-full uppercase tracking-widest ml-3 border border-cyan-500/20 font-mono">
                  SECURE PROTOCOLS
                </span>
              </div>
            </div>

            {/* Desktop Nav Items */}
            <nav className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-1.5 p-1 bg-[#0b0c16] rounded-full border border-slate-800/80">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handleNavigate("resources")}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-full text-[10px] font-black tracking-wider transition-all duration-300 cursor-pointer uppercase shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:shadow-[0_0_25px_rgba(0,240,255,0.4)]"
              >
                REPORT
              </button>

              {user ? (
                <div className="flex items-center gap-2.5 px-3 py-1.5 bg-cyan-950/40 border border-cyan-500/20 rounded-full text-[10px] font-mono text-cyan-400">
                  <span className="max-w-[120px] truncate font-bold text-cyan-300" title={user.displayName || user.username || user.email || ""}>
                    {user.displayName || user.username || user.email || "Active Session"}
                  </span>
                  <button
                    onClick={handleSignOut}
                    title="Sign Out"
                    className="p-1 hover:bg-cyan-500/15 rounded-full text-cyan-300 hover:text-white transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleNavigate("officer-login")}
                  className="px-4 py-2 bg-[#0e1022] hover:bg-[#151833] border border-slate-800 hover:border-slate-700 text-white rounded-full text-[10px] font-bold tracking-wider transition-all cursor-pointer uppercase"
                >
                  Sign In
                </button>
              )}
            </nav>

            {/* Mobile Nav Menu Hamburger Toggle */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-300 hover:bg-white/5 border border-slate-800/40 outline-none cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Dropdown Tray */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-800 bg-[#070914] overflow-hidden shadow-2xl"
            >
              <div className="px-2 pt-2 pb-4 space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition cursor-pointer ${
                        isActive
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}

                {/* Mobile session control */}
                <div className="pt-3 px-4 border-t border-slate-900 mt-2">
                  {user ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-cyan-400 truncate max-w-[150px]">
                        {user.displayName || user.username || user.email}
                      </span>
                      <button
                        onClick={handleSignOut}
                        className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-500/20 rounded-lg text-[10px] font-bold text-rose-400 flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                      >
                        <LogOut className="w-3 h-3" /> Sign Out
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleNavigate("officer-login")}
                      className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black rounded-xl cursor-pointer uppercase tracking-wider text-center"
                    >
                      Sign In to Portal
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. Main Content Canvas */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. Global Sovereign Footer */}
      <footer className="bg-[#05060f]/90 border-t border-slate-800/60 py-12 text-slate-400 relative z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center border border-slate-700/50">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <span className="font-extrabold text-white tracking-wider text-xs uppercase block leading-none font-sans">
                  RAKSHA AI DIGITAL PUBLIC PROTECTIVE PROTOCOLS
                </span>
                <span className="text-[9px] font-mono font-medium text-cyan-500/70 uppercase tracking-widest block mt-1">
                  Sovereign Defense Simulation Platform v1.2
                </span>
              </div>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex flex-wrap gap-4 sm:gap-6 justify-center font-mono">
              <span className="hover:text-cyan-400 transition cursor-pointer">Privacy Policy</span>
              <span className="hover:text-cyan-400 transition cursor-pointer">Terms of Service</span>
              <span className="text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">Official Prototype v1.2.0</span>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-800/40 text-[10px] text-slate-500 text-center leading-relaxed font-sans max-w-4xl mx-auto font-normal">
            <strong>Disclaimer notice:</strong> This digital utility is a public safety software prototype simulation. It does not replace live human police investigation, judicial enforcement, direct emergency dispatcher triage, physical currency detection equipment, or official intelligence intercepts. Under cyber emergencies, immediately dial the national cyber hotline <strong>1930</strong> or register files officially via <strong>cybercrime.gov.in</strong>.
          </div>

          <div className="text-center text-[9px] font-medium text-slate-600 uppercase tracking-widest font-mono">
            &copy; {new Date().getFullYear()} Digital Public Safety Division &bull; Indian Cybercrime Coordination Centre (I4C)
          </div>
        </div>
      </footer>

    </div>
  );
}
