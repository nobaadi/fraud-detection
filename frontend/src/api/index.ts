import axios from 'axios';
import type {
  Transaction,
  OverviewStats,
  FraudScore,
  UploadResponse,
  TrendData,
  NetworkGraph,
  ActivitySummary,
  ModelMetrics,
} from '../types';

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const apiBaseUrl = rawApiBaseUrl ? rawApiBaseUrl.replace(/\/+$/, '') : '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
});

export const transactionsApi = {
  upload: async (file: File): Promise<UploadResponse> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<UploadResponse>('/transactions/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getOverview: async (): Promise<OverviewStats> => {
    const { data } = await api.get<OverviewStats>('/transactions/overview');
    return data;
  },

  getAlerts: async (minRisk = 'Medium', limit = 100, offset = 0): Promise<Transaction[]> => {
    const { data } = await api.get<Transaction[]>('/transactions/alerts', {
      params: { min_risk: minRisk, limit, offset },
    });
    return data;
  },

  getTransaction: async (id: string): Promise<Transaction> => {
    const { data } = await api.get<Transaction>(`/transactions/${id}`);
    return data;
  },

  getUserHistory: async (id: string): Promise<Transaction[]> => {
    const { data } = await api.get<Transaction[]>(`/transactions/${id}/user-history`);
    return data;
  },

  getMerchantHistory: async (id: string): Promise<Transaction[]> => {
    const { data } = await api.get<Transaction[]>(`/transactions/${id}/merchant-history`);
    return data;
  },

  getTrends: async (): Promise<TrendData> => {
    const { data } = await api.get<TrendData>('/transactions/analytics/trends');
    return data;
  },

  getNetwork: async (minRisk = 'Medium'): Promise<NetworkGraph> => {
    const { data } = await api.get<NetworkGraph>('/transactions/analytics/network', {
      params: { min_risk: minRisk },
    });
    return data;
  },

  scoreTransactions: async (ids?: string[]): Promise<FraudScore[]> => {
    const { data } = await api.post<FraudScore[]>('/transactions/score', ids || []);
    return data;
  },

  getActivity: async (): Promise<ActivitySummary> => {
    const { data } = await api.get<ActivitySummary>('/transactions/activity/summary');
    return data;
  },

  reviewTransaction: async (id: string, status: string): Promise<Transaction> => {
    const { data } = await api.post<Transaction>(`/transactions/${id}/review`, { status });
    return data;
  },

  getModelMetrics: async (): Promise<ModelMetrics> => {
    const { data } = await api.get<ModelMetrics>('/transactions/metrics');
    return data;
  },
};

export default api;
