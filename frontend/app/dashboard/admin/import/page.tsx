/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import clsx from "clsx";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  Download,
  Table,
  ArrowRight,
} from "lucide-react";

type ImportStatus = "idle" | "uploading" | "processing" | "complete" | "error";

type ImportResult = {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
};

type ColumnMapping = {
  csvColumn: string;
  field: string;
};

const targetFields = [
  { value: "name", label: "Contact Name" },
  { value: "phone", label: "Phone Number" },
  { value: "email", label: "Email" },
  { value: "address", label: "Property Address" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "zip", label: "ZIP Code" },
  { value: "units", label: "Units" },
  { value: "value", label: "Property Value" },
  { value: "source", label: "Lead Source" },
  { value: "notes", label: "Notes" },
  { value: "skip", label: "— Skip Column —" },
];

export default function ImportPage() {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [step, setStep] = useState<"upload" | "map" | "confirm" | "result">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Parse CSV preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      const rows = lines.slice(0, 6).map((line) => {
        // Simple CSV parsing (handles basic cases)
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });

      if (rows.length > 0) {
        setHeaders(rows[0]);
        setPreview(rows.slice(1));
        // Auto-map columns based on header names
        const autoMappings = rows[0].map((header) => {
          const h = header.toLowerCase();
          let field = "skip";
          if (h.includes("name") || h.includes("contact")) field = "name";
          else if (h.includes("phone") || h.includes("mobile")) field = "phone";
          else if (h.includes("email")) field = "email";
          else if (h.includes("address") || h.includes("street")) field = "address";
          else if (h.includes("city")) field = "city";
          else if (h.includes("state")) field = "state";
          else if (h.includes("zip") || h.includes("postal")) field = "zip";
          else if (h.includes("unit")) field = "units";
          else if (h.includes("value") || h.includes("price")) field = "value";
          else if (h.includes("source")) field = "source";
          else if (h.includes("note")) field = "notes";
          return { csvColumn: header, field };
        });
        setMappings(autoMappings);
        setStep("map");
      }
    };
    reader.readAsText(selectedFile);
  }, []);

  const handleMappingChange = (index: number, field: string) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, field } : m))
    );
  };

  const handleImport = async () => {
    if (!file) return;

    setStatus("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mappings", JSON.stringify(mappings));

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });

      setStatus("processing");

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Import failed");
      }

      const data = await res.json();
      setResult(data);
      setStatus("complete");
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setResult(null);
    setError(null);
    setFile(null);
    setPreview([]);
    setHeaders([]);
    setMappings([]);
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Upload className="text-blue-400" />
              Import Leads
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Upload a CSV file to bulk import leads and contacts
            </p>
          </div>
          {step !== "upload" && (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            >
              <RefreshCw size={14} />
              Start Over
            </button>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mt-6">
          {[
            { key: "upload", label: "Upload File" },
            { key: "map", label: "Map Columns" },
            { key: "confirm", label: "Confirm" },
            { key: "result", label: "Complete" },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step === s.key
                    ? "bg-blue-500 text-white"
                    : ["upload", "map", "confirm", "result"].indexOf(step) > i
                    ? "bg-green-500 text-white"
                    : "bg-slate-800 text-slate-500"
                )}
              >
                {["upload", "map", "confirm", "result"].indexOf(step) > i ? (
                  <CheckCircle size={16} />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={clsx(
                  "ml-2 text-sm",
                  step === s.key ? "text-white" : "text-slate-500"
                )}
              >
                {s.label}
              </span>
              {i < 3 && <ArrowRight size={14} className="mx-4 text-slate-700" />}
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-panel rounded-xl p-4 border-red-500/30 bg-red-500/10">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </p>
        </div>
      )}

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="glass-panel rounded-xl p-8">
          <div
            className={clsx(
              "border-2 border-dashed rounded-xl p-12 text-center transition-colors",
              "border-slate-700 hover:border-blue-500/50 cursor-pointer"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              title="Select CSV file"
              aria-label="Select CSV file to upload"
            />
            <Upload size={48} className="mx-auto text-slate-500 mb-4" />
            <p className="text-lg text-white mb-2">
              Drop your CSV file here or click to browse
            </p>
            <p className="text-sm text-slate-400">
              Supports standard CSV format with headers
            </p>
          </div>

          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
            <h3 className="text-sm font-medium text-white mb-2">Required Columns</h3>
            <p className="text-sm text-slate-400">
              Your CSV should include at minimum: <span className="text-blue-400">Phone Number</span>
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Recommended: Name, Address, City, State, ZIP, Property Value
            </p>
          </div>
        </div>
      )}

      {/* Step: Map Columns */}
      {step === "map" && (
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Table size={20} />
            Map CSV Columns
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Match your CSV columns to the corresponding lead fields
          </p>

          <div className="space-y-3 mb-6">
            {mappings.map((mapping, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg"
              >
                <div className="flex-1">
                  <span className="text-sm text-slate-300">{mapping.csvColumn}</span>
                  {preview[0] && preview[0][index] && (
                    <span className="ml-2 text-xs text-slate-500">
                      e.g., &ldquo;{preview[0][index].slice(0, 30)}&rdquo;
                    </span>
                  )}
                </div>
                <ArrowRight size={14} className="text-slate-600" />
                <select
                  value={mapping.field}
                  onChange={(e) => handleMappingChange(index, e.target.value)}
                  className="w-48 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  title={`Map ${mapping.csvColumn} to field`}
                  aria-label={`Map ${mapping.csvColumn} to database field`}
                >
                  {targetFields.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep("upload")}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep("confirm")}
              disabled={!mappings.some((m) => m.field === "phone")}
              className={clsx(
                "px-6 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-400 transition-colors",
                !mappings.some((m) => m.field === "phone") && "opacity-50 cursor-not-allowed"
              )}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && file && (
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Confirm Import</h2>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg">
              <FileText size={24} className="text-blue-400" />
              <div>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-sm text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB • {preview.length} preview rows
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg">
              <h3 className="text-sm font-medium text-white mb-2">Column Mappings</h3>
              <div className="flex flex-wrap gap-2">
                {mappings
                  .filter((m) => m.field !== "skip")
                  .map((m) => (
                    <span
                      key={m.csvColumn}
                      className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded"
                    >
                      {m.csvColumn} → {targetFields.find((f) => f.value === m.field)?.label}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep("map")}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={status === "uploading" || status === "processing"}
              className={clsx(
                "flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-400 transition-colors",
                (status === "uploading" || status === "processing") && "opacity-50 cursor-not-allowed"
              )}
            >
              {status === "uploading" || status === "processing" ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  {status === "uploading" ? "Uploading..." : "Processing..."}
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Start Import
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === "result" && result && (
        <div className="glass-panel rounded-xl p-6">
          <div className="text-center mb-6">
            <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
            <h2 className="text-xl font-semibold text-white">Import Complete</h2>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-slate-800/50 rounded-lg text-center">
              <div className="text-2xl font-bold text-white">{result.total}</div>
              <div className="text-sm text-slate-400">Total Rows</div>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg text-center border border-green-500/20">
              <div className="text-2xl font-bold text-green-400">{result.imported}</div>
              <div className="text-sm text-slate-400">Imported</div>
            </div>
            <div className="p-4 bg-amber-500/10 rounded-lg text-center border border-amber-500/20">
              <div className="text-2xl font-bold text-amber-400">{result.skipped}</div>
              <div className="text-sm text-slate-400">Skipped</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <h3 className="text-sm font-medium text-red-400 mb-2">Errors</h3>
              <ul className="text-sm text-slate-400 space-y-1">
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
                {result.errors.length > 5 && (
                  <li className="text-slate-500">
                    ... and {result.errors.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-400 transition-colors"
            >
              <Upload size={14} />
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
