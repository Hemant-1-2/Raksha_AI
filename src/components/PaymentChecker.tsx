import React, { useState, useRef } from "react";
import { QrCode, Upload, AlertTriangle, ShieldCheck, HelpCircle, Loader2, Image as ImageIcon, CheckCircle, AlertOctagon, ArrowRight, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ResultShareButton from "./ResultShareButton";
import { resizeImage } from "../utils/imageCompressor";

interface PaymentResult {
  verdict: "This will SEND money from your account" | "This will RECEIVE money into your account" | "Unable to determine — proceed with caution";
  riskScore: number;
  amount: string;
  upiId: string;
  payeeName: string;
  explanation: string;
  scamFlagged: boolean;
  scamExplanation: string;
}

export default function PaymentChecker() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  const presets = [
    {
      name: "₹2,500 'Cashback Scan' (Scam Pattern)",
      description: "A QR code template sent on WhatsApp stating 'Scan and enter UPI PIN to claim ₹2,500 Gov Refund'.",
      imageBytes: tinyPng,
      mime: "image/png",
      promptHint: "This is an image of a UPI QR code overlayed with fraud text: 'Govt Cashback Scheme - Scan to claim ₹2,500. Enter UPI PIN to confirm credit.' Payee UPI ID: cashbackclaim@okaxis. Payee Name: PM-CASHBACK-REFUND-PORTAL."
    },
    {
      name: "Standard Merchant QR Code (Send Money)",
      description: "A standard static QR code at a grocery store counter labeled 'Pay via GPay / PhonePe'.",
      imageBytes: tinyPng,
      mime: "image/png",
      promptHint: "This is a clean, standard merchant static payment QR code at a cashier counter. Labeled 'Dilli Grocery Mart'. Amount: Not visible. Payee UPI ID: dilli.groceries@oksbi. No scam indicators or cashback text."
    },
    {
      name: "My Static UPI ID Profile (Receive Money)",
      description: "A user's own static profile QR screen showing their own UPI ID to receive money from others.",
      imageBytes: tinyPng,
      mime: "image/png",
      promptHint: "This is a screenshot of the user's personal banking app profile page displaying their own receive QR code. Labeled 'My QR Code'. Payee Name: Rajesh Kumar. Payee UPI ID: rajesh.k99@okhdfcbank. This is used when others scan it to pay this user."
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
    setImage(`data:${preset.mime};base64,${preset.imageBytes}`);
    setMimeType(preset.mime);
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
      const response = await fetch("/api/check-payment-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBytes: bytes,
          mimeType: mime,
          customPrompt: customPromptText
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "The server failed to analyze the payment request.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze payment screenshot. Make sure your Gemini API Key is configured.");
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

  const getVerdictTheme = (verdict: string, riskScore: number) => {
    if (riskScore >= 70) {
      return {
        bg: "bg-red-50 border-red-200 text-red-900",
        badge: "bg-red-600 text-white border-red-700",
        icon: AlertOctagon,
        iconColor: "text-red-600",
        barColor: "bg-red-600"
      };
    } else if (riskScore >= 26) {
      return {
        bg: "bg-amber-50 border-amber-200 text-amber-900",
        badge: "bg-amber-500 text-slate-950 border-amber-600 font-semibold",
        icon: HelpCircle,
        iconColor: "text-amber-600",
        barColor: "bg-amber-500"
      };
    } else {
      return {
        bg: "bg-green-50 border-green-200 text-green-900",
        badge: "bg-green-600 text-white border-green-700",
        icon: CheckCircle,
        iconColor: "text-green-600",
        barColor: "bg-green-600"
      };
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Permanent High-Visibility Explainer Banner */}
      <div className="p-4 bg-rose-950/80 border-l-4 border-rose-500 border border-rose-900/60 rounded-2xl flex items-center gap-4 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
        <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
          <AlertOctagon className="w-5 h-5 text-rose-400 animate-pulse" />
        </div>
        <div className="space-y-0.5">
          <div className="text-xs font-mono font-bold text-rose-300 tracking-widest uppercase">
            Critical Safety Directive
          </div>
          <p className="text-xs sm:text-sm text-slate-200 font-bold leading-relaxed">
            Scanning a QR code can send money — it never receives money.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Upload Panel & Preset Simulator */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-wider text-white flex items-center gap-2">
              <QrCode className="w-6 h-6 text-cyan-400" />
              PAYMENT REQUEST & QR DISCOVERY MATRIX
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Unsure if a suspect WhatsApp QR code or transaction handle will credit your wallet or trigger massive unauthorized outbound debit? Upload a screenshot. Gemini will map its exact security intent.
            </p>
          </div>

          {/* Preset Buttons for Simulation */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
              Load Payment Threat Profile Simulator
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
                  <div className="text-[9px] text-cyan-400 font-mono font-bold mt-2 uppercase tracking-widest flex items-center gap-1">
                    Analyze Preset <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Image Drag & Drop Upload Block */}
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
                <div className="text-sm font-bold text-slate-200">Upload QR or Payment Screenshot</div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Drag and drop a PNG, JPG, or JPEG file here, or click to browse files. Ensure the UPI parameters are legible.
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
                  alt="Payment screenshot to check"
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={resetState}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-[#070914]/85 backdrop-blur-md text-white rounded-lg text-[10px] font-bold border border-slate-800 hover:bg-slate-900 transition cursor-pointer font-mono uppercase tracking-wider"
                >
                  Change Image
                </button>
              </div>

              {!result && !loading && (
                <button
                  type="button"
                  onClick={handleFormSubmit}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.25)]"
                >
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  Analyze Payment Verification
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Security Analysis Result Panel */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
            Payment Diagnostic Report
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
                  <div className="text-sm font-bold text-white uppercase tracking-wider font-mono">Reading Image Assets</div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Gemini is extracting text blocks, parsing QR payloads, identifying VPA routes, and evaluating cashback decoy headers...
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
                    <div className="font-bold text-white uppercase tracking-wider font-mono text-xs font-black">Scan Process Stopped</div>
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
                  <ImageIcon className="w-5 h-5 text-slate-500" />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">
                  No Image Loaded
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Upload a payment screenshot or trigger a preset simulation card on the left to see dynamic visual risk assessments.
                </p>
              </motion.div>
            )}

            {result && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {(() => {
                  const theme = getVerdictTheme(result.verdict, result.riskScore);
                  const VerdictIcon = theme.icon;
                  return (
                    <div className="cyber-card border border-slate-800/80 rounded-3xl p-6 space-y-6 shadow-xl">
                      {/* Verdict Header block */}
                      <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-800/60">
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                            Flow Direction
                          </div>
                          <div className={`text-base font-black flex items-center gap-1.5 uppercase ${result.riskScore >= 70 ? 'text-rose-400' : result.riskScore >= 26 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            <VerdictIcon className={`w-5 h-5 ${theme.iconColor}`} />
                            {result.verdict}
                          </div>
                        </div>

                        <div className={`px-3 py-1 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-center flex flex-col justify-center items-center`}>
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-500">Risk Index</span>
                          <span className={`text-sm font-black leading-none mt-1 ${result.riskScore >= 70 ? 'text-rose-400' : result.riskScore >= 26 ? 'text-amber-400' : 'text-emerald-400'}`}>{result.riskScore}%</span>
                        </div>
                      </div>

                      {/* Bar Level Indicator */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                          <span>Inbound (Credit)</span>
                          <span>Outbound (Debit)</span>
                        </div>
                        <div className="w-full h-3 bg-slate-950/60 rounded-full overflow-hidden border border-slate-800 p-[2px]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${theme.barColor}`}
                            style={{ width: `${result.riskScore}%` }}
                          />
                        </div>
                      </div>

                      {/* Extracted Details Metadata */}
                      <div className="bg-[#090b16]/80 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                          Extracted Transaction Details
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                          <div>
                            <span className="text-slate-500 block font-bold font-mono text-[9px] uppercase tracking-wider">Payee / Merchant</span>
                            <span className="font-bold text-slate-200 truncate block mt-0.5">{result.payeeName}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block font-bold font-mono text-[9px] uppercase tracking-wider">Transfer Amount</span>
                            <span className="font-bold text-cyan-400 truncate block text-sm mt-0.5">{result.amount}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-500 block font-bold font-mono text-[9px] uppercase tracking-wider">Payee UPI ID (VPA)</span>
                            <span className="font-mono font-semibold text-slate-300 break-all bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg block mt-1">{result.upiId}</span>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Assessment Block */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                          Diagnostic Explanation
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                          {result.explanation}
                        </p>
                      </div>

                      {/* Scam Pattern Alert Panel */}
                      {result.scamFlagged && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl space-y-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest">
                            <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
                            Scam Signature Flagged
                          </div>
                          <p className="text-xs text-rose-200 leading-relaxed font-sans">
                            {result.scamExplanation}
                          </p>
                        </div>
                      )}

                      {/* Share Results Button */}
                      <div className="pt-2 border-t border-slate-800/60">
                        <ResultShareButton
                          type="payment"
                          result={{
                            verdict: result.verdict,
                            riskScore: result.riskScore,
                            explanation: `${result.explanation}${result.scamFlagged ? "\n\nScam Signature Alert:\n" + result.scamExplanation : ""}`,
                            flags: result.scamFlagged ? ["Scam Signature Flagged"] : []
                          }}
                        />
                      </div>

                      {/* Warning Disclaimer sign */}
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1.5 font-mono text-[10px] leading-relaxed text-slate-400">
                        <div className="text-rose-400 font-bold uppercase tracking-widest text-[9px]">
                          🛡️ Cyber Safety Precaution
                        </div>
                        <div>• Never enter your UPI PIN on a screen reached by scanning.</div>
                        <div>• A PIN is strictly used to pay or debits. Receiving money is automatic.</div>
                        <div>• Confirm the recipient name matches their actual registration profile.</div>
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
