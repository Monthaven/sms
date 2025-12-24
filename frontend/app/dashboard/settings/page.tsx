/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import {
  Settings,
  User,
  Bell,
  Moon,
  Sun,
  Volume2,
  Phone,
  Clock,
  Save,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

type UserSettings = {
  name: string;
  email: string;
  phone: string;
  notifications: {
    newLeads: boolean;
    callbacks: boolean;
    hotLeads: boolean;
    sound: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  preferences: {
    darkMode: boolean;
    autoDialNext: boolean;
    maskPhoneNumbers: boolean;
  };
};

export default function SettingsPage() {
  const { success, error } = useToast();
  const [settings, setSettings] = useState<UserSettings>({
    name: "",
    email: "",
    phone: "",
    notifications: {
      newLeads: true,
      callbacks: true,
      hotLeads: true,
      sound: true,
    },
    quietHours: {
      enabled: false,
      start: "21:00",
      end: "08:00",
    },
    preferences: {
      darkMode: true,
      autoDialNext: false,
      maskPhoneNumbers: true,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error("Failed to fetch settings");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save");
      success("Settings saved", "Your preferences have been updated");
    } catch (err) {
      error("Failed to save", "Please try again");
    } finally {
      setIsSaving(false);
    }
  };

  const updateNotification = (key: keyof typeof settings.notifications, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  };

  const updateQuietHours = (key: keyof typeof settings.quietHours, value: boolean | string) => {
    setSettings((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, [key]: value },
    }));
  };

  const updatePreferences = (key: keyof typeof settings.preferences, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, [key]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw size={32} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Settings className="text-blue-400" />
              Settings
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage your account preferences
            </p>
          </div>
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className={clsx(
              "flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
              "bg-blue-500 text-white hover:bg-blue-400",
              isSaving && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Profile Section */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <User size={20} className="text-slate-400" />
          Profile
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Email
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="your@email.com"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Phone Number (for callbacks)
            </label>
            <input
              type="tel"
              value={settings.phone}
              onChange={(e) => setSettings((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bell size={20} className="text-slate-400" />
          Notifications
        </h2>
        <div className="space-y-4">
          <ToggleOption
            label="New Lead Alerts"
            description="Get notified when new leads are assigned to you"
            checked={settings.notifications.newLeads}
            onChange={(v) => updateNotification("newLeads", v)}
          />
          <ToggleOption
            label="Callback Reminders"
            description="Receive reminders for scheduled callbacks"
            checked={settings.notifications.callbacks}
            onChange={(v) => updateNotification("callbacks", v)}
          />
          <ToggleOption
            label="Hot Lead Alerts"
            description="Immediate notification when a hot lead comes in"
            checked={settings.notifications.hotLeads}
            onChange={(v) => updateNotification("hotLeads", v)}
          />
          <ToggleOption
            label="Sound Notifications"
            description="Play sound for notifications"
            checked={settings.notifications.sound}
            onChange={(v) => updateNotification("sound", v)}
            icon={<Volume2 size={16} />}
          />
        </div>
      </div>

      {/* Quiet Hours Section */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock size={20} className="text-slate-400" />
          Quiet Hours
        </h2>
        <div className="space-y-4">
          <ToggleOption
            label="Enable Quiet Hours"
            description="Pause notifications during specified hours"
            checked={settings.quietHours.enabled}
            onChange={(v) => updateQuietHours("enabled", v)}
          />
          {settings.quietHours.enabled && (
            <div className="flex items-center gap-4 pl-4 border-l-2 border-slate-700 ml-2">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Start</label>
                <input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => updateQuietHours("start", e.target.value)}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  title="Quiet hours start time"
                  aria-label="Quiet hours start time"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">End</label>
                <input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) => updateQuietHours("end", e.target.value)}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  title="Quiet hours end time"
                  aria-label="Quiet hours end time"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preferences Section */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Phone size={20} className="text-slate-400" />
          Caller Preferences
        </h2>
        <div className="space-y-4">
          <ToggleOption
            label="Auto-Dial Next Lead"
            description="Automatically dial next lead after disposition"
            checked={settings.preferences.autoDialNext}
            onChange={(v) => updatePreferences("autoDialNext", v)}
          />
          <ToggleOption
            label="Mask Phone Numbers"
            description="Hide full phone numbers until lead is claimed"
            checked={settings.preferences.maskPhoneNumbers}
            onChange={(v) => updatePreferences("maskPhoneNumbers", v)}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleOption({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
      <div className="flex items-center gap-3">
        {icon && <span className="text-slate-500">{icon}</span>}
        <div>
          <p className="text-white font-medium">{label}</p>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative w-12 h-6 rounded-full transition-colors duration-200",
          checked ? "bg-blue-500" : "bg-slate-700"
        )}
        title={`Toggle ${label}`}
        aria-label={`${label}: ${checked ? 'on' : 'off'}`}
        role="switch"
        aria-checked={checked}
      >
        <div
          className={clsx(
            "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200",
            checked ? "translate-x-7" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}
