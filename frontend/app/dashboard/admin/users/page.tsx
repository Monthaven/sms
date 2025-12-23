/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Shield,
  Mail,
  Phone,
  MoreVertical,
  Check,
  X,
  Edit2,
  Trash2,
} from "lucide-react";
import { GlassTable } from "@/components/ui/GlassTable";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  sections: string[];
  twilioNumber: string | null;
  contractSignedAt: string | null;
  createdAt: string;
  _count?: { assignedLeads: number };
};

const ROLES = ["ADMIN", "MANAGER", "AGENT", "CALLER", "INVESTOR"];
const SECTIONS = ["sms", "crm", "deals", "admin"];

async function fetchUsers(): Promise<User[]> {
  const res = await fetch("/api/admin/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

async function createUser(data: { email: string; name: string; role: string; sections: string[] }) {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Failed to create user");
  }
  return res.json();
}

async function updateUser(id: string, data: Partial<User>) {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
}

async function deleteUser(id: string) {
  const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete user");
  return res.json();
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers });

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", name: "", role: "AGENT", sections: ["sms"] });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowModal(false);
      setForm({ email: "", name: "", role: "AGENT", sections: ["sms"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      name: user.name ?? "",
      role: user.role,
      sections: user.sections ?? ["sms"],
    });
    setShowModal(true);
  };

  const roleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "MANAGER":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "CALLER":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "INVESTOR":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">User Management</h2>
          <p className="text-slate-400 text-sm">
            Manage team members, roles, and access permissions.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setForm({ email: "", name: "", role: "AGENT", sections: ["sms"] });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all"
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, color: "blue" },
          { label: "Admins", value: users.filter((u) => u.role === "ADMIN").length, color: "purple" },
          { label: "Callers", value: users.filter((u) => u.role === "CALLER").length, color: "emerald" },
          { label: "Active Today", value: Math.floor(users.length * 0.7), color: "amber" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-panel rounded-xl p-4 border border-slate-700/50"
          >
            <div className="text-xs text-slate-400 uppercase tracking-wider">{stat.label}</div>
            <div className={`text-2xl font-bold mt-1 text-${stat.color}-400`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-2xl border border-slate-700/50 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading users...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-900/50">
                <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  User
                </th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Role
                </th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Sections
                </th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Leads
                </th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Contract
                </th>
                <th className="text-right p-4 text-xs uppercase tracking-wider text-slate-400 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                        {(user.name ?? user.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white">{user.name ?? "Unnamed"}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${roleColor(user.role)}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1 flex-wrap">
                      {(user.sections ?? []).map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 text-xs"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-slate-300">{user._count?.assignedLeads ?? 0}</td>
                  <td className="p-4">
                    {user.contractSignedAt ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs">
                        <Check size={14} /> Signed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 text-xs">
                        <X size={14} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Edit user"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete user ${user.email}?`)) {
                            deleteMutation.mutate(user.id);
                          }
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl p-6 w-full max-w-md border border-slate-600/50 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingUser ? "Edit User" : "Add New User"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="user@example.com"
                  required
                  disabled={!!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-600/50 text-white focus:outline-none focus:border-blue-500"
                  title="Select user role"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Sections</label>
                <div className="flex flex-wrap gap-2">
                  {SECTIONS.map((s) => (
                    <label
                      key={s}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                        form.sections.includes(s)
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700/50 text-slate-400 hover:bg-slate-600/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.sections.includes(s)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, sections: [...form.sections, s] });
                          } else {
                            setForm({ ...form, sections: form.sections.filter((x) => x !== s) });
                          }
                        }}
                        className="sr-only"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {editingUser ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
