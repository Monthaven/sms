"use client";

/**
 * PROPRIETARY — Always Improving LLC
 * Template Selector Component - Quick template selection for SMS
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  ChevronDown, 
  Search, 
  Star, 
  Clock,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";

interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  category: string | null;
  isShared: boolean;
  usageCount: number;
  userId: string;
  user?: { name: string };
}

interface TemplateSelectorProps {
  onSelect: (template: SmsTemplate) => void;
  onCreateNew?: () => void;
  className?: string;
}

export function TemplateSelector({ 
  onSelect, 
  onCreateNew,
  className,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [grouped, setGrouped] = useState<Record<string, SmsTemplate[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTemplates(data.templates);
      setGrouped(data.grouped);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(template: SmsTemplate) {
    // Increment usage count
    await fetch(`/api/templates/${template.id}`, { method: "PATCH" });
    onSelect(template);
    setOpen(false);
    setSearch("");
  }

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Object.keys(grouped);

  // Sort by usage (most used first)
  const sortedTemplates = [...filteredTemplates].sort(
    (a, b) => b.usageCount - a.usageCount
  );

  // Get top 3 most used
  const frequentTemplates = templates
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 3);

  if (loading) {
    return (
      <div className={cn("animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded-lg", className)} />
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 
                   hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <span>Templates</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 max-h-96 overflow-hidden 
                        bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 
                        rounded-lg shadow-xl z-50">
          {/* Search */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 
                           rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
          </div>

          {/* Quick Access - Frequent */}
          {!search && frequentTemplates.length > 0 && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Clock className="w-3 h-3" />
                <span>Frequently Used</span>
              </div>
              <div className="space-y-1">
                {frequentTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 
                               dark:hover:bg-gray-800 rounded transition-colors truncate"
                  >
                    <Star className="inline w-3 h-3 mr-1 text-yellow-500" />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Tabs */}
          {categories.length > 1 && (
            <div className="flex gap-1 p-2 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-2 py-1 text-xs rounded-full whitespace-nowrap transition-colors",
                  !selectedCategory 
                    ? "bg-indigo-500 text-white" 
                    : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-2 py-1 text-xs rounded-full whitespace-nowrap transition-colors",
                    selectedCategory === cat 
                      ? "bg-indigo-500 text-white" 
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Template List */}
          <div className="max-h-60 overflow-y-auto">
            {sortedTemplates.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No templates found
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sortedTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 
                               rounded-lg transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{template.name}</span>
                      {template.isShared && (
                        <span className="text-xs text-gray-400">Shared</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {template.content}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create New */}
          {onCreateNew && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  onCreateNew();
                  setOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 
                           text-sm text-indigo-600 dark:text-indigo-400 
                           hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Create New Template
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Template Editor Modal
 */
interface TemplateEditorProps {
  template?: SmsTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: SmsTemplate) => void;
}

export function TemplateEditor({ 
  template, 
  isOpen, 
  onClose, 
  onSave,
}: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || "");
  const [content, setContent] = useState(template?.content || "");
  const [category, setCategory] = useState(template?.category || "");
  const [isShared, setIsShared] = useState(template?.isShared || false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setContent(template.content);
      setCategory(template.category || "");
      setIsShared(template.isShared);
    } else {
      setName("");
      setContent("");
      setCategory("");
      setIsShared(false);
    }
  }, [template, isOpen]);

  async function handleSave() {
    if (!name.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const endpoint = template ? `/api/templates/${template.id}` : "/api/templates";
      const method = template ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content, category: category || null, isShared }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();
      onSave(data.template);
      onClose();
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">
            {template ? "Edit Template" : "New Template"}
          </h2>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Initial Outreach"
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700
                         focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Hi {{firstName}}, this is..."
              rows={4}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use {"{{firstName}}"}, {"{{propertyAddress}}"} for merge fields
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Follow-up"
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700
                         focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Share with team</span>
          </label>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 
                       dark:hover:bg-gray-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !content.trim()}
            className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg 
                       hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
