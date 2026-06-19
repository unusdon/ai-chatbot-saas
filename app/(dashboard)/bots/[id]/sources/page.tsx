import { ArrowLeft, FileText, FileType2, Globe, ListTree, MessagesSquare, Sigma, Upload } from 'lucide-react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getBotForUser } from '@/lib/server/bots';
import { listDocumentsForBot } from '@/lib/server/documents';
import { requireAuth } from '@/lib/server/require-auth';

import { JsonSourceForm } from './forms/json-source-form';
import { QaPairForm } from './forms/qa-pair-form';
import { SitemapImportForm } from './forms/sitemap-import-form';
import { TextSourceForm } from './forms/text-source-form';
import { UrlSourceForm } from './forms/url-source-form';
import { FileDropzone } from './file-dropzone';
import { SourcesManager } from './sources-manager';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  return { title: bot ? `Sources · ${bot.name}` : 'Sources' };
}

export default async function SourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const bot = await getBotForUser(user.id, id);
  if (!bot) notFound();

  const documents = await listDocumentsForBot(user.id, bot.id);

  const counts = {
    files: documents.filter((d) => ['pdf', 'docx', 'xlsx', 'markdown'].includes(d.source)).length,
    urls: documents.filter((d) => d.source === 'url').length,
    text: documents.filter((d) => d.source === 'text' || d.source === 'markdown').length,
    json: documents.filter((d) => d.source === 'json').length,
    qa: documents.filter((d) => d.source === 'qa').length,
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href={`/bots/${bot.id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to {bot.name}
          </Link>
        </Button>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Training sources</h1>
          <p className="text-sm text-muted-foreground">
            Add knowledge — files, URLs, text, structured data, or Q&amp;A pairs. Everything is
            chunked, embedded, and searchable.
          </p>
        </div>
      </div>

      <Tabs defaultValue="add" className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="add" className="px-4 py-1.5 text-sm">
            <Upload className="h-3.5 w-3.5" /> Add
          </TabsTrigger>
          <TabsTrigger value="manage" className="px-4 py-1.5 text-sm">
            <Sigma className="h-3.5 w-3.5" /> Manage <span className="ml-1 text-muted-foreground">({documents.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="space-y-6">
          <Tabs defaultValue="files" className="space-y-6">
            <TabsList className="flex h-9 w-full flex-wrap justify-start sm:w-auto">
              <SourceTabTrigger value="files" icon={<FileType2 />} label="Files" count={counts.files} />
              <SourceTabTrigger value="urls" icon={<Globe />} label="URLs" count={counts.urls} />
              <SourceTabTrigger value="text" icon={<FileText />} label="Text" count={counts.text} />
              <SourceTabTrigger value="json" icon={<ListTree />} label="JSON" count={counts.json} />
              <SourceTabTrigger value="qa" icon={<MessagesSquare />} label="Q&A" count={counts.qa} />
            </TabsList>

            <TabsContent value="files">
              <FileDropzone botId={bot.id} />
            </TabsContent>
            <TabsContent value="urls" className="space-y-6">
              <UrlSourceForm botId={bot.id} />
              <SitemapImportForm botId={bot.id} />
            </TabsContent>
            <TabsContent value="text">
              <TextSourceForm botId={bot.id} />
            </TabsContent>
            <TabsContent value="json">
              <JsonSourceForm botId={bot.id} />
            </TabsContent>
            <TabsContent value="qa">
              <QaPairForm botId={bot.id} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="manage">
          <SourcesManager botId={bot.id} documents={documents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SourceTabTrigger({
  value,
  icon,
  label,
  count,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <TabsTrigger value={value} className="px-3 text-xs">
      <span className="flex h-3.5 w-3.5 items-center justify-center">{icon}</span> {label}
      {count > 0 ? (
        <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{count}</span>
      ) : null}
    </TabsTrigger>
  );
}
