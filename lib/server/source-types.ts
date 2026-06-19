/**
 * Source-type catalog — keeps file extension / MIME / display-name / icon-name
 * tables in one place so the upload route, UI tabs, and admin pages stay in
 * sync.
 */
export type SourceKind = 'pdf' | 'url' | 'text' | 'markdown' | 'docx' | 'xlsx' | 'json' | 'qa';

export type FileSourceKind = 'pdf' | 'markdown' | 'docx' | 'xlsx' | 'json';

export const FILE_KINDS: Record<
  FileSourceKind,
  { exts: string[]; mimes: string[]; maxBytes: number; label: string }
> = {
  pdf: {
    exts: ['.pdf'],
    mimes: ['application/pdf'],
    maxBytes: 20 * 1024 * 1024,
    label: 'PDF',
  },
  markdown: {
    exts: ['.md', '.markdown', '.txt'],
    mimes: ['text/markdown', 'text/plain'],
    maxBytes: 5 * 1024 * 1024,
    label: 'Markdown / Text',
  },
  docx: {
    exts: ['.docx'],
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxBytes: 20 * 1024 * 1024,
    label: 'Word (DOCX)',
  },
  xlsx: {
    exts: ['.xlsx', '.xls'],
    mimes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    maxBytes: 20 * 1024 * 1024,
    label: 'Excel',
  },
  json: {
    exts: ['.json'],
    mimes: ['application/json', 'text/json'],
    maxBytes: 10 * 1024 * 1024,
    label: 'JSON',
  },
};

/** Sum of all accepted extensions — used as the file picker's accept attr. */
export const ALL_FILE_ACCEPT = Object.values(FILE_KINDS)
  .flatMap((k) => [...k.exts, ...k.mimes])
  .join(',');

/**
 * Match a filename to a FileSourceKind. Returns null if no kind accepts the
 * extension.
 */
export function detectFileKind(name: string): FileSourceKind | null {
  const lower = name.toLowerCase();
  for (const [kind, def] of Object.entries(FILE_KINDS)) {
    if (def.exts.some((e) => lower.endsWith(e))) {
      return kind as FileSourceKind;
    }
  }
  return null;
}

export function storageExtFor(kind: SourceKind): string {
  switch (kind) {
    case 'pdf':
      return '.pdf';
    case 'docx':
      return '.docx';
    case 'xlsx':
      return '.xlsx';
    case 'markdown':
      return '.md';
    case 'json':
      return '.json';
    case 'text':
      return '.txt';
    case 'qa':
      return '.qa.txt';
    case 'url':
      return '';
  }
}
