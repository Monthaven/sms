import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Proxied by Next.js
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchLeads = async (status?: string) => {
  const { data } = await api.get('/leads', { params: { status } });
  return data;
};

export const loginUser = async (email: string) => {
  // For V1, we just check if the user exists. 
  // In production, add password/OTP.
  const { data } = await api.post('/auth/login', { email });
  return data;
};

export default api;
