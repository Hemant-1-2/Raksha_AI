import React, { useState, useRef } from "react";
import { Coins, Upload, AlertTriangle, ShieldCheck, HelpCircle, Loader2, Image as ImageIcon, CheckCircle, AlertOctagon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CurrencyResult } from "../types";
import { resizeImage } from "../utils/imageCompressor";

export default function CurrencyChecker() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CurrencyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tiny valid 1x1 PNG representations for presets so the server gets legitimate image bytes
  const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  const presets = [
    {
      name: "₹500 Note (Genuine Specimen)",
      description: "Simulation of a crisp, newly minted ₹500 banknote showing correct Gandhi watermarks and microprinting alignment.",
      imageBytes: tinyPng,
      mime: "image/png",
      promptHint: "This is a high-resolution simulation of a crisp, newly minted ₹500 banknote showing correct Mahatma Gandhi watermarks, sharp serial numbering alignment, complete bleed line microtext, and centered security thread."
    },
    {
      name: "₹2000 Note (Suspicious Alignment)",
      description: "Simulation of an older ₹2000 note showing misaligned serial numerals and a suspicious watermark bleed.",
      imageBytes: tinyPng,
      mime: "image/png",
      promptHint: "This is a high-resolution simulation of a suspicious ₹2000 banknote showing misaligned serial numerals, a bleeding watermark area, and a security thread that lacks genuine optical-shift characteristics under light."
    },
    {
      name: "Foreign Exchange Note (Counterfeit Pattern)",
      description: "Simulation of a foreign banknote containing flat printing, missing security thread, and photocopied paper texture.",
      imageBytes: tinyPng,
      mime: "image/png",
      promptHint: "This is a high-resolution simulation of a counterfeit foreign banknote. It has completely flat printing with no raised intaglio ink texture, a completely missing security thread, and a printed counterfeit watermark."
    }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, or JPEG).");
      return;
    }
    setError(null);
    setResult(null);
    setMimeType(file.type);

    const reader = new FileReader();
    reader.onload = async () => {
      const originalBase64 = reader.result as string;
      try {
        const resized = await resizeImage(originalBase64, 1024);
        setImage(resized.base64);
        setMimeType(resized.mimeType);
      } catch (err) {
        console.error("Failed to resize image client-side, using original:", err);
        setImage(originalBase64);
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handlePresetSelect = (preset: typeof presets[0]) => {
    setError(null);
    setResult(null);
    // Set a placeholder visual image state to represent the selected banknote
    setImage(`data:${preset.mime};base64,${preset.imageBytes}`);
    setMimeType(preset.mime);
    
    // We can directly submit or let the user review. Let's run a check automatically for a great UX!
    runCheck(preset.imageBytes, preset.mime, preset.promptHint);
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  const runCheck = async (bytes: string, mime: string, customPromptText?: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // If custom prompt is passed, we can merge or format.
      // In this case, we send the bytes directly to our endpoint.
      // If we are simulating, the prompt text helps the model understand what banknote simulation it's checking!
      const finalBytes = bytes;

      const response = await fetch("/api/check-currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBytes: finalBytes,
          mimeType: mime,
          // If we have a prompt hint, we append it so the API can evaluate it properly in context
          customPrompt: customPromptText
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "The server failed to analyze the banknote.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze banknote. Please make sure your Gemini API Key is configured.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !mimeType) return;
    runCheck(image, mimeType);
  };

  const resetState = () => {
    setImage(null);
    setMimeType(null);
    setResult(null);
    setError(null);
  };

  // Helper to color-code risk verdicts
  const getVerdictTheme = (verdict: string) => {
    switch (verdict) {
      case "Likely Genuine":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-200",
          badge: "bg-emerald-600 text-slate-950 font-black",
          icon: CheckCircle,
          iconColor: "text-emerald-400",
          barColor: "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
        };
      case "Suspicious":
        return {
          bg: "bg-amber-500/10 border-amber-500/25 text-amber-200",
          badge: "bg-amber-500 text-slate-950 font-black",
          icon: HelpCircle,
          iconColor: "text-amber-400",
          barColor: "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
        };
      case "Counterfeit":
        return {
          bg: "bg-rose-500/10 border-rose-500/25 text-rose-200",
          badge: "bg-rose-600 text-slate-950 font-black",
          icon: AlertOctagon,
          iconColor: "text-rose-400",
          barColor: "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]"
        };
      default:
        return {
          bg: "bg-slate-500/10 border-slate-500/25 text-slate-300",
          badge: "bg-slate-600 text-slate-950 font-black",
          icon: HelpCircle,
          iconColor: "text-slate-400",
          barColor: "bg-slate-500"
        };
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Disclaimer Box - High Visibility Persistent Banner */}
      <div className="p-5 bg-amber-950/80 border-l-4 border-amber-500 border border-amber-900/60 rounded-2xl flex items-start gap-4 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
        <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1.5">
          <div className="text-xs font-mono font-bold uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
            ⚠️ Prototype Heuristic Notice — Not Certified for Official Use
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-bold">
            This analytical module is a <strong className="text-amber-400 underline decoration-amber-500/50 decoration-2 font-black">software-only heuristic prototype simulation</strong>. It does not possess physical paper-density scanners, ultraviolet light grids, magnetic thread resonance components, or official currency certification credentials. 
          </p>
          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            This utility is strictly designed for educational training, awareness, and system modeling. Do not rely on automated software heuristics to authenticate legal tender or verify high-value currency transactions. Always refer doubtful banknotes to certified banking institutions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Upload Zone & Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-wider text-white flex items-center gap-2">
              <Coins className="w-6 h-6 text-cyan-400" />
              CURRENCY DESIGN & WATERMARK EXAMINER
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Upload a clear visual photograph of any high-denomination banknote. Gemini will assess visual features (e.g. alignment of Mahatma Gandhi portrait, security thread positioning, serial numbers alignment, and print sharpness bleed).
            </p>
          </div>

          {/* Preset Banknotes Selector */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
              Load Currency Threat Profile Simulator
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className="text-left p-4 rounded-2xl border border-slate-800 bg-[#0b0c16]/70 hover:border-cyan-500/40 hover:bg-[#12142d]/80 transition-all text-xs space-y-2 cursor-pointer flex flex-col justify-between h-full group"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{preset.name}</div>
                    <p className="text-slate-400 text-[11px] leading-relaxed font-sans font-normal line-clamp-3">
                      {preset.description}
                    </p>
                  </div>
                  <div className="text-[9px] text-cyan-400 font-mono font-bold mt-2 uppercase tracking-widest">
                    Load Preset & Check &rarr;
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Drag & Drop Upload Container */}
          {!image ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerSelect}
              className={`border-2 border-dashed rounded-2xl p-12 text-center space-y-4 cursor-pointer transition-all ${
                dragging
                  ? "border-cyan-500 bg-cyan-500/5"
                  : "border-slate-800 bg-[#090b16]/40 hover:border-cyan-500/40 hover:bg-[#0b0d1e]/80"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-[#0a0c16] border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Upload className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-bold text-slate-200">Drag & Drop Banknote Photo</div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Supports JPEG, JPG, and PNG formats. Make sure details like serial numbers and security threads are fully legible.
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-black tracking-wider uppercase cursor-pointer"
              >
                Browse Files
              </button>
            </div>
          ) : (
            <div className="border border-slate-800 bg-[#090b16]/90 rounded-2xl p-4 space-y-4 shadow-xl">
              <div className="relative rounded-xl overflow-hidden bg-[#05060f] border border-slate-800 h-64 flex items-center justify-center">
                <img
                  src={image}
                  alt="Banknote specimen to check"
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={resetState}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-[#070914]/85 backdrop-blur-md text-white rounded-lg text-[10px] font-bold border border-slate-800 hover:bg-slate-900 transition cursor-pointer font-mono uppercase tracking-wider"
                >
                  Change Photo
                </button>
              </div>

              {!result && !loading && (
                <button
                  type="button"
                  onClick={handleFormSubmit}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.25)]"
                >
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  Analyze Design Authenticity Specimen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Analysis Display (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
            Heuristic Report Board
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
                  <div className="text-sm font-bold text-white uppercase tracking-wider font-mono">Assessing Specimen</div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Gemini is comparing banknote layout symmetry, watermark region opacity, serial font alignment, and border micro-print spacing...
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
                    <div className="font-bold text-white uppercase tracking-wider font-mono text-xs font-black font-black">Heuristic Scan Interrupted</div>
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
                  <ImageIcon className="w-5 h-5 text-slate-500" />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">
                  Awaiting Banknote
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto font-sans">
                  Provide a banknote photo or choose a preset card. The system will perform a visual design inspection in seconds.
                </p>
              </motion.div>
            )}

            {result && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 font-sans"
              >
                {/* Result Board */}
                {(() => {
                  const theme = getVerdictTheme(result.verdict);
                  const VerdictIcon = theme.icon;
                  return (
                    <div className="cyber-card border border-slate-800/80 rounded-3xl p-6 space-y-6 shadow-xl">
                      {/* Verdict Header */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                            Heuristic Conclusion
                          </div>
                          <div className={`text-base font-black flex items-center gap-1.5 uppercase ${result.verdict === 'Likely Genuine' ? 'text-emerald-400' : result.verdict === 'Suspicious' ? 'text-amber-400' : 'text-rose-400'}`}>
                            <VerdictIcon className={`w-5 h-5 ${theme.iconColor}`} />
                            {result.verdict}
                          </div>
                        </div>

                        <div className={`px-4 py-2 rounded-2xl text-center border font-mono ${theme.badge} flex flex-col justify-center items-center`}>
                          <span className="text-[8px] uppercase tracking-wider font-extrabold opacity-90">Confidence</span>
                          <span className="text-xl font-black">{result.confidence}%</span>
                        </div>
                      </div>

                      {/* Confidence Meter */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                          <span>Low Confidence (0%)</span>
                          <span>High Confidence (100%)</span>
                        </div>
                        <div className="w-full h-3 bg-slate-950/60 rounded-full overflow-hidden border border-slate-800 p-[2px]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${theme.barColor}`}
                            style={{ width: `${result.confidence}%` }}
                          />
                        </div>
                      </div>

                      {/* Explanation of visual findings */}
                      <div className="space-y-2 pt-3 border-t border-slate-800/60">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                          Physical Elements Visualized
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                          {result.explanation}
                        </p>
                      </div>

                      {/* Prototype Indicator Sign */}
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1.5 font-mono text-[10px] leading-relaxed text-slate-400">
                        <div className="text-cyan-400 font-bold uppercase tracking-widest text-[9px]">
                          ⚡ SIMULATED METADATA SIGNAL
                        </div>
                        <div>Assessed: Denomination Layout Align</div>
                        <div>Calculated: Watermark Transparency Profile</div>
                        <div>Warning: Always refer suspicious banknotes to bank branches.</div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
