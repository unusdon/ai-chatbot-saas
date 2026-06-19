'use client';

import { CheckCircle2, FileType2, Loader2, Upload, X, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ALL_FILE_ACCEPT, FILE_KINDS, detectFileKind } from '@/lib/server/source-types';

type Job = {
  id: string;
  file: File;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
};

const MAX_PARALLEL = 3;

export function FileDropzone({ botId }: { botId: string }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const accepted: Job[] = [];
      const rejected: string[] = [];
      for (const f of Array.from(incoming)) {
        const kind = detectFileKind(f.name);
        if (!kind) {
          rejected.push(`${f.name} (unsupported type)`);
          continue;
        }
        if (f.size > FILE_KINDS[kind].maxBytes) {
          rejected.push(`${f.name} (over ${(FILE_KINDS[kind].maxBytes / (1024 * 1024)).toFixed(0)} MB)`);
          continue;
        }
        accepted.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: f,
          progress: 0,
          status: 'queued',
        });
      }
      if (rejected.length > 0) toast.error(`Skipped: ${rejected.join(', ')}`);
      if (accepted.length > 0) {
        setJobs((prev) => [...prev, ...accepted]);
        void runQueue([...jobs, ...accepted]);
      }
    },
    [jobs],
  );

  async function runQueue(allJobs: Job[]) {
    const queued = allJobs.filter((j) => j.status === 'queued');
    if (queued.length === 0) return;
    const inFlight = allJobs.filter((j) => j.status === 'uploading').length;
    const slots = Math.max(0, MAX_PARALLEL - inFlight);
    const toStart = queued.slice(0, slots);
    await Promise.all(toStart.map((j) => upload(j)));
    router.refresh();
  }

  function upload(job: Job): Promise<void> {
    return new Promise((resolve) => {
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'uploading' } : j)));
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/bots/${botId}/documents`);
      xhr.upload.addEventListener('progress', (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, progress: pct } : j)));
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'done', progress: 100 } : j)));
        } else {
          let message = `HTTP ${xhr.status}`;
          try {
            message = JSON.parse(xhr.responseText).error ?? message;
          } catch {
            /* ignore */
          }
          setJobs((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, status: 'error', error: message } : j)),
          );
        }
        resolve();
      });
      xhr.addEventListener('error', () => {
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: 'error', error: 'Network error' } : j)),
        );
        resolve();
      });
      const fd = new FormData();
      fd.set('file', job.file);
      xhr.send(fd);
    });
  }

  function clearDone() {
    setJobs((prev) => prev.filter((j) => j.status !== 'done'));
  }

  return (
    <div className="space-y-4">
      <label
        htmlFor="file-drop-input"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-surface-2 p-10 text-center transition-colors ${
          dragging ? 'border-brand bg-brand/5' : 'hover:border-foreground/30'
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-soft">
          <Upload className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <p className="text-base font-semibold">
            Drop files here, or <span className="text-brand">browse</span>
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, DOCX, XLSX, Markdown, TXT, JSON · up to {FILE_KINDS.pdf.maxBytes / (1024 * 1024)} MB each ·
            multiple files OK
          </p>
        </div>
        <input
          ref={inputRef}
          id="file-drop-input"
          type="file"
          accept={ALL_FILE_ACCEPT}
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
      </label>

      {jobs.length > 0 ? (
        <div className="space-y-2 rounded-lg border bg-card p-3 shadow-soft">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-semibold">Uploads</h3>
            <Button type="button" variant="ghost" size="sm" onClick={clearDone}>
              Clear completed
            </Button>
          </div>
          <ul className="space-y-2">
            {jobs.map((j) => (
              <JobRow key={j.id} job={j} onRemove={() => setJobs((p) => p.filter((x) => x.id !== j.id))} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function JobRow({ job, onRemove }: { job: Job; onRemove: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-md border bg-surface-2 px-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground">
        <FileType2 className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{job.file.name}</p>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatBytes(job.file.size)}
          </span>
        </div>
        {job.status === 'uploading' ? <Progress value={job.progress} className="h-1" /> : null}
        {job.status === 'error' ? (
          <p className="truncate text-xs text-destructive">{job.error}</p>
        ) : null}
        {job.status === 'done' ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Uploaded — queued for ingestion</p>
        ) : null}
      </div>
      <StatusIcon status={job.status} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Remove"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

function StatusIcon({ status }: { status: Job['status'] }) {
  switch (status) {
    case 'queued':
      return <span className="text-xs text-muted-foreground">Queued</span>;
    case 'uploading':
      return <Loader2 className="h-4 w-4 animate-spin text-brand" />;
    case 'done':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive" />;
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
