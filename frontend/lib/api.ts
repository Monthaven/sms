import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Proxied by Next.js
  headers: {
    'Content-Type': 'application/json',
  },
});
export interface Lead {
  id: string;
  status: string;
  contact: {
    firstName: string | null;
    lastName: string | null;
    phoneE164: string;
  };
  property: {
    addressLine1: string;
    city: string;
    state: string;
  } | null;
  updatedAt: string;
}

export const fetchLeads = async (status?: string) => {
  const params = status ? { status } : {};
  const { data } = await api.get<Lead[]>('/leads', { params });
  return data;
};

export const loginUser = async (email: string) => {
  const { data } = await api.post('/auth/login', { email });
  return data;
};

export default api;
