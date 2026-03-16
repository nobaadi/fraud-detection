export interface Transaction {
  id: number;
  transaction_id: string;
  user_id: string;
  timestamp: string;
  amount: number;
  merchant: string;
  merchant_category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  device_type: string;
  amount_deviation?: number;
  location_deviation?: number;
  transaction_velocity?: number;
  merchant_novelty?: boolean;
  device_novelty?: boolean;
  fraud_probability?: number;
  risk_level?: 'Low' | 'Medium' | 'High';
  risk_factors?: string;
  review_status?: string | null;
  created_at: string;
}

export interface OverviewStats {
  total_transactions: number;
  fraud_alerts_today: number;
  average_fraud_score: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
}

export interface FraudScore {
  transaction_id: string;
  fraud_probability: number;
  risk_level: 'Low' | 'Medium' | 'High';
  risk_factors: string[];
}

export interface UploadResponse {
  records_ingested: number;
  processing_status: string;
}

export interface TrendData {
  daily_alerts: { date: string; count: number }[];
  probability_distribution: { range: string; count: number }[];
  top_merchants: { merchant: string; fraud_count: number }[];
  risk_by_location: { location: string; avg_risk: number; transaction_count: number }[];
}

export interface NetworkNode {
  id: string;
  label: string;
  type: 'user' | 'merchant';
  risk_level?: string;
  transaction_count: number;
  transaction_id?: string;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  transaction_count: number;
}

export interface NetworkGraph {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface ActivitySummary {
  high_risk_count: number;
  latest_transaction_id: string | null;
  latest_merchant: string | null;
  latest_amount: number | null;
  latest_probability: number | null;
}
