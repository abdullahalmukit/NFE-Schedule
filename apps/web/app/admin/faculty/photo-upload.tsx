"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar, cx } from "@nfe/ui/web";
import { createClient } from "@/lib/supabase/client";
import { setFacultyPhoto } from "./actions";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface PhotoUploadProps {
  facultyId: string;
  initial: string;
  photoUrl: string | null;
  labels: {
    upload: string;
    remove: string;
    help: string;
    tooBig: string;
    type: string;
    failed: string;
  };
}

/**
 * Teacher photo (ADM-MD-5): the browser uploads straight to the public
 * faculty-photos bucket (storage policy: faculty area), then the server stores the path.
 */
export function PhotoUpload(p: PhotoUploadProps) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();

  function upload(file: File | undefined) {
    if (!file) return;
    const ext = TYPES[file.type];
    if (!ext) return setMessage({ ok: false, text: p.labels.type });
    if (file.size > MAX_BYTES) return setMessage({ ok: false, text: p.labels.tooBig });
    start(async () => {
      const path = `${p.facultyId}.${ext}`;
      const { error } = await createClient()
        .storage.from("faculty-photos")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (error) return setMessage({ ok: false, text: p.labels.failed });
      const result = await setFacultyPhoto(p.facultyId, path);
      setMessage({ ok: result.ok, text: result.message || p.labels.failed });
      router.refresh();
    });
  }

  function remove() {
    start(async () => {
      const result = await setFacultyPhoto(p.facultyId, null);
      setMessage({ ok: result.ok, text: result.message || p.labels.failed });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar initial={p.initial} imageUrl={p.photoUrl ?? undefined} size={64} />
      <div className="flex flex-col gap-2">
        <label
          className={cx(
            "inline-flex h-10 cursor-pointer items-center rounded-button border border-border px-4 font-body text-small font-semibold text-text hover:bg-surface-raised",
            busy && "pointer-events-none opacity-50",
          )}
        >
          {p.labels.upload}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
        <span className="font-body text-caption text-text-faint">{p.labels.help}</span>
        {p.photoUrl ? (
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="self-start font-body text-small font-semibold text-danger hover:underline disabled:opacity-50"
          >
            {p.labels.remove}
          </button>
        ) : null}
        {message ? (
          <span
            role="status"
            className={cx(
              "font-body text-small font-semibold",
              message.ok ? "text-accent" : "text-danger",
            )}
          >
            {message.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
