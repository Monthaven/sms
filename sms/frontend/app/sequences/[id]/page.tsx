'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Sequence = any;
type Contact = any;

export default function SequenceDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tier, setTier] = useState("HIGH");

  const fetchSequence = async () => {
    if (!id) return;
    const seq = await fetch(`/api/sequences/${id}`).then((r) => r.json());
    setSequence(seq);
  };

  const fetchContacts = async () => {
    const list = await fetch(`/api/contacts?tier=${tier}`).then((r) => r.json());
    setContacts(list);
  };

  useEffect(() => {
    fetchSequence();
  }, [id]);

  useEffect(() => {
    fetchContacts();
  }, [tier]);

  const updateSequence = async (updates: any) => {
    if (!id) return;
    const res = await fetch(`/api/sequences/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setSequence(await res.json());
  };

  const addStep = async () => {
    if (!id || !sequence) return;
    await fetch(`/api/sequences/${id}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepNumber: (sequence.SequenceStep?.length || 0) + 1,
        name: `Step ${(sequence.SequenceStep?.length || 0) + 1}`,
        template: "Hey {{firstName}}, this is {{agentName}}...",
        delayDays: 0,
      }),
    });
    fetchSequence();
  };

  const updateStep = async (stepId: string, updates: any) => {
    if (!id) return;
    await fetch(`/api/sequences/${id}/steps/${stepId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    fetchSequence();
  };

  const enroll = async () => {
    if (!id) return;
    await fetch(`/api/sequences/${id}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    alert("Enrollment triggered");
    fetchSequence();
  };

  if (!sequence) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <input
          type="text"
          value={sequence.name}
          onChange={(e) => updateSequence({ name: e.target.value })}
          className="text-3xl font-bold border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 outline-none"
        />
        <select
          value={sequence.status || "draft"}
          onChange={(e) => updateSequence({ status: e.target.value })}
          className="px-4 py-2 rounded font-semibold bg-gray-100"
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-3xl font-bold">{sequence.totalContacts ?? 0}</div>
          <div className="text-sm text-gray-600">Enrolled</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-3xl font-bold">{sequence.messagesSent ?? 0}</div>
          <div className="text-sm text-gray-600">Sent</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-3xl font-bold">{sequence.responses ?? 0}</div>
          <div className="text-sm text-gray-600">Responses</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <div className="text-3xl font-bold">{sequence.optOuts ?? 0}</div>
          <div className="text-sm text-gray-600">Opt-outs</div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">📝 Steps</h2>
      <div className="space-y-4 mb-8">
        {(sequence.SequenceStep || []).map((step: any) => (
          <div key={step.id} className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <input
                type="text"
                value={step.name}
                onChange={(e) => updateStep(step.id, { name: e.target.value })}
                className="font-semibold text-lg border-b border-transparent hover:border-gray-300"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Wait</span>
                <input
                  type="number"
                  value={step.delayDays ?? 0}
                  onChange={(e) => updateStep(step.id, { delayDays: parseInt(e.target.value, 10) || 0 })}
                  className="w-16 border rounded p-1 text-center"
                />
                <span className="text-sm text-gray-500">days</span>
              </div>
            </div>
            <textarea
              value={step.template}
              onChange={(e) => updateStep(step.id, { template: e.target.value })}
              rows={3}
              className="w-full border rounded p-3 font-mono text-sm"
              placeholder="Hey {{firstName}}, this is {{agentName}}..."
            />
            <p className="text-xs text-gray-400 mt-1">Variables: {'firstName'}, {'lastName'}, {'propertyAddress'}, {'propertyName'}, {'agentName'}</p>
          </div>
        ))}
        <button onClick={addStep} className="w-full border-2 border-dashed rounded-lg p-4 text-gray-500 hover:bg-gray-50">
          + Add Step
        </button>
      </div>

      <h2 className="text-xl font-semibold mb-4">👥 Enroll Contacts</h2>
      <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4">
        <select value={tier} onChange={(e) => setTier(e.target.value)} className="border rounded p-2">
          <option value="HIGH">HIGH tier</option>
          <option value="MEDIUM">HIGH + MEDIUM</option>
          <option value="ALL">All tiers</option>
        </select>
        <span className="text-gray-600">{contacts.length} contacts match</span>
        <button onClick={enroll} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold ml-auto">
          Enroll
        </button>
      </div>
    </div>
  );
}
