"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importObjectPath, MAX_IMPORT_BYTES } from "@nfe/core";
import { cx } from "@nfe/ui/web";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "../../_components/fields";
import { postJson } from "./post";

export interface UploadFormProps {
  semesters: { id: string; name: string }[];
  defaultSemester: string;
  labels: {
    semester: string;
    label: string;
    labelHelp: string;
    file: string;
    read: string;
    reading: string;
    docx: string;
    tooBig: string;
    upload: string;
    generic: string;
  };
}

/** ADM-RT-1 step 1: semester, version label and the .docx; the browser uploads, the server reads. */
export function UploadForm({ semesters, defaultSemester, labels: l }: UploadFormProps) {
  const router = useRouter();
  const [semester, setSemester] = useState(defaultSemester);
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  function submit() {
    setError("");
    if (!file || !file.name.toLowerCase().endsWith(".docx")) return setError(l.docx);
    if (file.size > MAX_IMPORT_BYTES) return setError(l.tooBig);
    start(async () => {
      try {
        const runId = crypto.randomUUID();
        const { error: uploadError } = await createClient()
          .storage.from("imports")
          .upload(importObjectPath(runId, file.name), file);
        if (uploadError) throw new Error(l.upload);
        await postJson("/api/admin/import/routine/parse", {
          runId,
          fileName: file.name,
          semesterId: semester,
          label,
        });
        router.push(`/admin/routine/import?run=${runId}`);
      } catch (e) {
        setError((e as Error).message || l.generic);
      }
    });
  }

  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-body text-caption font-semibold text-text-muted">{l.semester}</span>
          <select
            className={inputClass}
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-caption font-semibold text-text-muted">{l.label}</span>
          <input
            className={inputClass}
            value={label}
            required
            maxLength={20}
            placeholder="5"
            onChange={(e) => setLabel(e.target.value)}
          />
          <span className="font-body text-caption text-text-faint">{l.labelHelp}</span>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-body text-caption font-semibold text-text-muted">{l.file}</span>
        <input
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="font-body text-small text-text"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !file || !label.trim()}
          className={cx(
            "h-10 rounded-button bg-accent px-4 font-body text-small font-semibold text-on-accent hover:opacity-90 disabled:opacity-50",
          )}
        >
          {busy ? l.reading : l.read}
        </button>
        {error ? (
          <span role="status" className="font-body text-small font-semibold text-danger">
            {error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
