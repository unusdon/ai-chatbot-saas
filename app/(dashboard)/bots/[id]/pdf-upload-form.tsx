'use client';

import { Loader2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MAX_MB = 20;

export function PdfUploadForm({ botId }: { botId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error('Choose a PDF file first');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File exceeds ${MAX_MB} MB limit`);
      return;
    }
    setPending(true);
    const fd = new FormData();
    fd.set('file', file);
    try {
      const res = await fetch(`/api/bots/${botId}/documents`, { method: 'POST', body: fd });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? `Upload failed (HTTP ${res.status})`);
        return;
      }
      toast.success('Uploaded — queued for ingestion');
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-lg border bg-surface-2 p-4"
    >
      <div className="flex items-center justify-between">
        <Label htmlFor="pdf-upload" className="text-sm font-semibold">
          Upload PDF
        </Label>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          ≤ {MAX_MB} MB
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Text + image PDFs supported.</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Input
          ref={fileRef}
          id="pdf-upload"
          type="file"
          accept="application/pdf,.pdf"
          required
          className="cursor-pointer file:cursor-pointer"
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {pending ? 'Uploading' : 'Upload'}
        </Button>
      </div>
    </form>
  );
}
