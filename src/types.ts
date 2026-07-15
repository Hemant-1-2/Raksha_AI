export type ScreenType = 'home' | 'scam-checker' | 'currency-checker' | 'payment-checker' | 'investment-checker' | 'threat-support' | 'fraud-graph' | 'resources' | 'officer-dashboard' | 'officer-login' | 'citizen-dashboard';

export interface SafetyCheckRecord {
  id: string;
  type: 'scam' | 'currency' | 'payment' | 'investment';
  inputSummary: string;
  verdict: string;
  riskScore: number;
  timestamp: string;
}

export interface ScamResult {
  risk_score: number;
  verdict: 'Likely Safe' | 'Suspicious' | 'Likely Scam';
  flags: string[];
  explanation: string;
  recommended_action: string;
}

export interface CurrencyResult {
  verdict: 'Likely Genuine' | 'Suspicious' | 'Counterfeit' | 'Unrecognized Note';
  confidence: number;
  explanation: string;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: 'bank_account' | 'phone' | 'device' | 'ip';
  status: 'safe' | 'suspicious' | 'mule_account';
  riskScore: number;
  // Specific Metadata fields
  bankName?: string;
  location?: string;
  lastAmount?: string;
  operator?: string;
  os?: string;
  ipAddress?: string;
  isp?: string;
  description: string;
  x?: number; // Visual coordinates
  y?: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  type: string;
  value?: string;
}
