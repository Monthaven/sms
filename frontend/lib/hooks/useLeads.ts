import { useState, useEffect } from "react";

// Mock data to prevent crashes while backend connects
const MOCK_LEADS = [
  {
    id: "1",
    contact: { firstName: "Alice", lastName: "Smith" },
    status: "RESP_HOT",
    updatedAt: new Date().toISOString(),
    property: { addressLine1: "123 Main St" }
  },
  {
    id: "2",
    contact: { firstName: "Bob", lastName: "Jones" },
    status: "RESP_WARM",
    updatedAt: new Date().toISOString(),
    property: { addressLine1: "456 Oak Ave" }
  }
];

export function useLeads(filters?: { statuses: string[] }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate network delay
    const timer = setTimeout(() => {
      setLeads(MOCK_LEADS); // Set to [] to see Empty State
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return { leads, isLoading };
}