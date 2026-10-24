import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';

export const API_URL = 'http://192.168.31.46:4000';
const TOKEN_KEY = 'miniledger_token';

export type Loan = {
  id: string; friendName: string; amount: number; dueDate: string;
  repaidAt: string | null; createdAt: string; direction: 'lent' | 'borrowed';
  receiptPath: string | null; receiptAssetId: string | null; receiptGalleryUri: string | null;
};
export type Summary = {
  totalLent: number; totalRepaid: number; totalBorrowed: number; totalPaid: number;
  toCollect: number; toRepay: number; overdueAmount: number; overdueToRepay: number;
};
export type NewLoan = {
  friendName: string; amount: number; dueDate: string; direction: 'lent' | 'borrowed';
  receipt?: { uri: string; name: string; type: string; assetId: string; galleryUri: string };
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await expoFetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Something went wrong');
    return body as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error(`The API did not respond. Check that the backend is running at ${API_URL}.`);
    if (error instanceof TypeError) throw new Error(`Cannot reach the API at ${API_URL}. Check that the backend is running and your phone is on the same Wi-Fi.`);
    throw error;
  } finally { clearTimeout(timeout); }
}

export const api = {
  requestOtp: (phone: string) => request<{ message: string; expiresInMinutes: number }>('/api/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyOtp: async (phone: string, otp: string) => {
    const result = await request<{ token: string }>('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) });
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
  },
  getLoans: async () => (await request<{ loans: Loan[] }>('/api/loans')).loans,
  getSummary: async () => (await request<{ summary: Summary }>('/api/loans/summary')).summary,
  addLoan: async (input: NewLoan) => {
    const body = new FormData();
    body.append('friendName', input.friendName);
    body.append('amount', String(input.amount));
    body.append('dueDate', input.dueDate);
    body.append('direction', input.direction);
    if (input.receipt) {
      body.append('receiptAssetId', input.receipt.assetId);
      body.append('receiptGalleryUri', input.receipt.galleryUri);
      const file = new File(input.receipt.uri);
      if (!file.exists) throw new Error('The selected receipt photo can no longer be read. Choose it again.');
      if (file.size > 3 * 1024 * 1024) throw new Error('Receipt photo must be 3 MB or smaller. Choose a smaller image.');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP receipt photo.');
      body.append('receipt', file, input.receipt.name);
    }
    return (await request<{ loan: Loan }>('/api/loans', { method: 'POST', body })).loan;
  },
  markRepaid: async (id: string) => (await request<{ loan: Loan }>(`/api/loans/${id}/repaid`, { method: 'PATCH' })).loan,
  deleteLoan: async (id: string) => request<{ success: boolean }>(`/api/loans/${id}`, { method: 'DELETE' }),
  logout: () => AsyncStorage.removeItem(TOKEN_KEY),
  hasToken: async () => Boolean(await AsyncStorage.getItem(TOKEN_KEY))
};

export const receiptUrl = (path: string) => `${API_URL}${path}`;
