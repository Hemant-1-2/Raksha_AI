import React, { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Info, Copy, ClipboardCheck, ArrowRight, CornerDownLeft, Loader2, Sparkles, HeartHandshake, ShieldAlert, FileText, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScamResult } from "../types";
import { resizeImage } from "../utils/imageCompressor";

export default function ThreatSupport() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<ScamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Optional image states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBytes, setImageBytes] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Reassuring, safe sample threat scenario descriptions
  const presets = [
    {
      title: "📱 Instagram Blackmail Threat",
      preview: "Private message threat with friend list screenshots",
      text: "An unknown account followed me yesterday and started chatting. Today they did a video call and then sent me screenshots of my follower list. They are demanding ₹15,000 via UPI within the next hour, threatening that if I don't pay, they will send video clips and edited screenshots to everyone on my contact list."
    },
    {
      title: "🎭 Face-swap / Deepfake Extortion",
      preview: "Modified photo blackmail on WhatsApp",
      text: "Someone messaged me on WhatsApp from an international number (+44) and sent an obviously fake, edited photo where they swapped my face onto another image. They are threatening to post this deepfake image on public forums and tag my friends unless I purchase a ₹5,000 Amazon gift card and send them the code."
    },
    {
      title: "📞 Fake Authority Arrest Coercion",
      preview: "Fake police department blackmail on video call",
      text: "I received a call from someone claiming to be from a law enforcement agency saying my name is linked to a seized parcel. They forced me to stay on a video call, told me I am under digital house arrest, and said I must transfer my entire bank balance of ₹2,50,000 to a verification account to clear my name or face immediate arrest."
    }
  ];

  const handlePresetClick = (text: string) => {
    setInputText(text);
    setError(null);
  };

  const handleImageChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, JPEG, WebP).");
      return;
    }
    
    setError(null);
    setImageFile(file);
    setImageMimeType(file.type);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const originalBase64 = reader.result as string;
      try {
        const resized = await resizeImage(originalBase64, 1024);
        setImagePreview(resized.base64);
        setImageBytes(resized.base64);
        setImageMimeType(resized.mimeType);
      } catch (err) {
        console.error("Failed to resize threat image client-side, using original:", err);
        setImagePreview(originalBase64);
        setImageBytes(originalBase64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageChange(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageBytes(null);
    setImageMimeType(null);
  };

  const handleClear = () => {
    setInputText("");
    handleRemoveImage();
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
    if (!inputText.trim() && !imageBytes) {
      setError("Please provide either a threat description text or upload a threat screenshot.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/check-threat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          imageBytes: imageBytes,
          mimeType: imageMimeType
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "The server failed to evaluate the threat pattern.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze. Please ensure your development server is active and Gemini API is ready.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number, verdict: string) => {
    if (score >= 70 || verdict === "Likely Scam") {
      return {
        bg: "bg-[#2c0f16]/90 border-rose-500/25 text-rose-200",
        badge: "bg-rose-600 text-slate-950 font-black animate-pulse",
        iconColor: "text-rose-400",
        bar: "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]",
        ring: "ring-rose-500/20",
        accentText: "text-rose-300",
        icon: ShieldAlert
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
            <HeartHandshake className="w-6 h-6 text-cyan-400" />
            EXTORTION DEFENSE & SAFETY COORD
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            If someone is threatening to leak edited visuals, private channels, or posing as police authorities to extort funds, know that you are safe. This matrix analyzes blackmail manipulation tactics to build a safe, confidential resolution plan.
          </p>
        </div>

        {/* Permanent Reassurance Note Required */}
        <div className="p-4 bg-rose-950/80 border-l-4 border-rose-500 border border-rose-900/60 rounded-2xl flex items-start gap-3 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse">
          <Shield className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-bold">
            You are not in trouble and this is not your fault. This tool is completely local/client and does not store or leak any images.
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
            Load Blackmail Attack Vectors Simulator
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetClick(preset.text)}
                className="text-left p-3.5 rounded-2xl border border-slate-800 bg-[#0b0c16]/70 hover:border-rose-500/40 hover:bg-[#1c121e]/80 transition-all text-xs space-y-1 cursor-pointer flex flex-col justify-between h-full group"
              >
                <div>
                  <div className="font-bold text-slate-200 group-hover:text-rose-400 transition-colors">
                    {preset.title}
                  </div>
                  <p className="text-slate-400 text-[11px] line-clamp-3 leading-relaxed mt-1 font-sans">
                    {preset.preview}
                  </p>
                </div>
                <div className="text-[9px] text-rose-400 font-mono font-bold uppercase tracking-widest mt-3">
                  Inspect scenario &rarr;
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Text & Image Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* File Upload Component */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-rose-400" />
              Upload Threat screenshot (Optional)
            </label>
            
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
                isDragActive
                  ? "border-rose-500 bg-rose-500/5"
                  : imagePreview
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-slate-800 bg-[#090b16]/40 hover:border-rose-500/40 hover:bg-[#0b0d1e]/80"
              }`}
            >
              <input
                type="file"
                id="threat-image-input"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageChange(e.target.files[0]);
                  }
                }}
              />

              <AnimatePresence mode="wait">
                {imagePreview ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col sm:flex-row items-center gap-4 text-left justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={imagePreview}
                        alt="Threat preview"
                        className="w-16 h-16 object-cover rounded-xl border border-slate-800 shadow-sm flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate font-mono">
                          {imageFile?.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {( (imageFile?.size || 0) / 1024).toFixed(1)} KB &bull; Threat Matrix Loaded
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer flex-shrink-0 font-mono uppercase tracking-wider"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove Image
                    </button>
                  </motion.div>
                ) : (
                  <label
                    htmlFor="threat-image-input"
                    className="flex flex-col items-center justify-center gap-2 cursor-pointer py-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#0a0c16] border border-slate-800 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-rose-400 hover:text-rose-300">Click to upload specimen</span>
                      <span className="text-xs sm:text-sm text-slate-400"> or drag screenshot here</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                      PNG, JPG, WEBP &bull; PROCESSED CONFIDENTIALLY BY LOCAL AI
                    </p>
                  </label>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Textarea Input Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              Describe extortion threat or paste demands (Optional)
            </label>
            <div className="relative border border-slate-800 bg-[#090b16]/90 rounded-2xl shadow-lg overflow-hidden focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/15 transition-all">
              <textarea
                id="threat-text-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describe the coercion here. What is the blackmailer demanding? What are they threatening to release? (No real identification data needed)"
                className="w-full h-40 p-4 text-xs sm:text-sm text-slate-200 bg-transparent outline-hidden resize-none border-none placeholder-slate-500 leading-relaxed font-sans"
                maxLength={4000}
              />
              
              <div className="px-4 py-2 bg-[#0b0d1e]/80 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {inputText.length}/4000 characters
                </span>
                {inputText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (!inputText.trim() && !imageBytes)}
            className="w-full py-3 px-4 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider transition duration-150 inline-flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.25)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Evaluating Coercion & Fraud Footprints...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                CONFIRM BLACKMAIL DIAGNOSTICS & ACTION MAP <CornerDownLeft className="w-3.5 h-3.5 font-bold" />
              </>
            )}
          </button>
        </form>

        {/* Informative Help Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b0c16]/70 space-y-1 flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Cyber Helpline</h4>
              <p className="text-xl font-black text-cyan-400 font-mono mt-0.5">Call 1930</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans mt-2">Toll-free national cyber crime assistance, active 24/7 in India.</p>
          </div>
          <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b0c16]/70 space-y-1 flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">National Cyber Portal</h4>
              <p className="text-sm font-bold text-cyan-400 font-mono mt-1">cybercrime.gov.in</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans mt-2">Official portal of Government of India to report digital abuse anonymously.</p>
          </div>
        </div>
      </div>

      {/* Output Side - 5 Cols */}
      <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
          Support Plan & Risk Evaluation
        </label>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 border border-slate-800 bg-[#070914]/90 rounded-2xl shadow-xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)] animate-pulse">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-bold text-white uppercase tracking-wider font-mono">Analyzing Coercion Mechanics</div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto font-sans">
                  Gemini is mapping threat urgency signatures, checking known extortion networks, and preparing safety steps. We never look at or request explicit media files.
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
                  <div className="font-bold text-white uppercase tracking-wider font-mono text-xs font-black">Evaluation Interrupted</div>
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
                <Shield className="w-5 h-5 text-rose-400" />
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">
                Awaiting Threat Input
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Upload a screenshot of the threat or describe the demands in the input fields above to generate a safe, confidential resolution plan.
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
                const isHighRisk = result.risk_score >= 70;
                return (
                  <div className="cyber-card border border-slate-800/80 rounded-3xl p-6 space-y-6 shadow-xl">
                    {/* Verdict Title & Score */}
                    <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                          Safety Diagnosis
                        </div>
                        <div className={`text-base font-black flex items-center gap-1.5 uppercase ${isHighRisk ? 'text-rose-400' : 'text-amber-400'}`}>
                          <ResultIcon className={`w-5 h-5 ${config.iconColor}`} />
                          {isHighRisk ? 'Coercion Pattern Identified' : result.verdict}
                        </div>
                      </div>

                      <div className={`px-4 py-2 rounded-2xl text-center border font-mono ${config.badge} flex flex-col justify-center items-center`}>
                        <span className="text-[8px] uppercase tracking-wider font-extrabold opacity-90 font-bold">Coercion Index</span>
                        <span className="text-xl font-black">{result.risk_score}%</span>
                      </div>
                    </div>

                    {/* Progress Bar visual indicator */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                        <span>Safe Profile (0)</span>
                        <span>Active Blackmail (100)</span>
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
                          Detected Threat Markers
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
                        Incident Breakdown
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                        {result.explanation}
                      </p>
                    </div>

                    {/* Recommended Action */}
                    <div className={`p-4 border rounded-2xl space-y-2.5 ${config.bg}`}>
                      <div className={`text-[10px] font-mono font-bold uppercase tracking-widest ${config.accentText} flex items-center gap-1.5`}>
                        <Shield className="w-3.5 h-3.5" />
                        Step-by-Step Response Strategy
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                        {result.recommended_action}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 justify-end pt-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleCopyAction(JSON.stringify(result, null, 2))}
                        className="px-3 py-1.5 mt-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition flex items-center gap-1.5 font-bold cursor-pointer text-[10px] h-fit self-end sm:self-auto flex-shrink-0 font-mono uppercase tracking-wider"
                      >
                        {copied ? (
                          <>
                            <ClipboardCheck className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                            Copied Safe Steps
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Response Plan
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
