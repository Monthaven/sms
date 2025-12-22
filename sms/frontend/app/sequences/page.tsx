/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

'use client';

import { useEffect, useState } from "react";

type SequenceSummary = {
  id: string;
  name: string;
  status: string | null;
  stepsCount: number;
  totalContacts: number;
  messagesSent: number;
};

type SettingsMap = {
  SEND_HOUR_UTC?: string;
  MAX_MESSAGES_PER_RUN?: string;
  DELAY_BETWEEN_SENDS_MS?: string;
  AGENT_NAME?: string;
};

export default function SequencesDashboard() {
  const [sequences, setSequences] = useState<SequenceSummary[]>([]);
  const [settings, setSettings] = useState<SettingsMap>({});
  const [newSequenceName, setNewSequenceName] = useState("");

  useEffect(() => {
    fetch("/api/sequences")
      .then((r) => r.json())
      .then(setSequences);
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  const createSequence = async () => {
    if (!newSequenceName.trim()) return;
    const res = await fetch("/api/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSequenceName }),
    });
    const seq = await res.json();
    setSequences([...sequences, seq]);
    setNewSequenceName("");
  };

  const updateSetting = async (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  };

  const sendHourLocal = (() => {
    const utc = Number(settings.SEND_HOUR_UTC ?? "14");
    const est = (utc - 5 + 24) % 24;
    return est;
  })();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">📱 SMS Sequences</h1>

      <div className="bg-gray-100 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">⚙️ Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Send Hour (Eastern)</label>
            <select
              value={sendHourLocal}
              onChange={(e) => {
                const est = parseInt(e.target.value, 10);
                const utc = (est + 5) % 24;
                updateSetting("SEND_HOUR_UTC", String(utc));
              }}
              className="mt-1 block w-full rounded border p-2"
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? "12am" : i < 12 ? `${i}am` : i === 12 ? "12pm" : `${i - 12}pm`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Max Messages Per Run</label>
            <input
              type="number"
              value={settings.MAX_MESSAGES_PER_RUN ?? ""}
              onChange={(e) => updateSetting("MAX_MESSAGES_PER_RUN", e.target.value)}
              className="mt-1 block w-full rounded border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Delay Between Sends (ms)</label>
            <input
              type="number"
              value={settings.DELAY_BETWEEN_SENDS_MS ?? ""}
              onChange={(e) => updateSetting("DELAY_BETWEEN_SENDS_MS", e.target.value)}
              className="mt-1 block w-full rounded border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Agent Name</label>
            <input
              type="text"
              value={settings.AGENT_NAME ?? ""}
              onChange={(e) => updateSetting("AGENT_NAME", e.target.value)}
              className="mt-1 block w-full rounded border p-2"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <input
          type="text"
          placeholder="New sequence name..."
          value={newSequenceName}
          onChange={(e) => setNewSequenceName(e.target.value)}
          className="flex-1 rounded border p-3"
        />
        <button onClick={createSequence} className="bg-blue-600 text-white px-6 py-3 rounded font-semibold">
          + Create Sequence
        </button>
      </div>

      <div className="space-y-4">
        {sequences.map((seq) => (
          <a
            key={seq.id}
            href={`/sequences/${seq.id}`}
            className="block bg-white border rounded-lg p-6 hover:shadow-lg transition"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">{seq.name}</h3>
                <p className="text-gray-500">
                  {seq.status || "draft"} • {seq.totalContacts ?? 0} contacts • {seq.stepsCount} steps
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{seq.messagesSent ?? 0}</div>
                <div className="text-sm text-gray-500">sent</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
