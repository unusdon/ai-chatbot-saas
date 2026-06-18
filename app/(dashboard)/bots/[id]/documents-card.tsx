import type { Document } from '@/db/schema';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { DocumentList } from './document-list';
import { UrlIngestForm } from './url-ingest-form';
import { PdfUploadForm } from './pdf-upload-form';

export function DocumentsCard({ botId, documents }: { botId: string; documents: Document[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sources</CardTitle>
        <CardDescription>
          Upload PDFs and add URLs the bot can answer questions from. New sources are queued for
          ingestion (chunking + embedding ships in M2C).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <PdfUploadForm botId={botId} />
          <UrlIngestForm botId={botId} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Sources ({documents.length})</h3>
          <DocumentList documents={documents} />
        </div>
      </CardContent>
    </Card>
  );
}
