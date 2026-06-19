import { NextResponse } from 'next/server';

import { getConversationDetail } from '@/lib/server/conversations';
import { requireAuth } from '@/lib/server/require-auth';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  const user = await requireAuth();
  const { cid } = await params;
  const detail = await getConversationDetail(user.id, cid);
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const payload = {
    conversation: {
      id: detail.conversation.id,
      botId: detail.conversation.botId,
      endUserId: detail.conversation.endUserId,
      ipAddress: detail.conversation.ipAddress,
      userAgent: detail.conversation.userAgent,
      referrer: detail.conversation.referrer,
      flag: detail.conversation.flag,
      isArchived: detail.conversation.isArchived,
      createdAt: detail.conversation.createdAt,
      lastMessageAt: detail.conversation.lastMessageAt,
    },
    messages: detail.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      citations: m.citations,
      latencyMs: m.latencyMs,
      promptTokens: m.promptTokens,
      completionTokens: m.completionTokens,
      createdAt: m.createdAt,
    })),
    exportedAt: new Date().toISOString(),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="conversation-${cid.slice(0, 8)}.json"`,
    },
  });
}
