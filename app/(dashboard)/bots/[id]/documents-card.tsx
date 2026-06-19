import type { Document } from '@/db/schema';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { DocumentList } from './document-list';
import { PdfUploadForm } from './pdf-upload-form';
import { UrlIngestForm } from './url-ingest-form';

export function DocumentsCard({ botId, documents }: { botId: string; documents: Document[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sources</CardTitle>
        <CardDescription>
          Upload PDFs or paste URLs. The worker chunks + embeds them in the background. Status flips
          to <span className="font-mono text-xs">Ready</span> when it&apos;s indexable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <PdfUploadForm botId={botId} />
          <UrlIngestForm botId={botId} />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Sources</h3>
            <span className="rounded-full border bg-card px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
              {documents.length}
            </span>
          </div>
          <DocumentList documents={documents} />
        </div>
      </CardContent>
    </Card>
  );
}
