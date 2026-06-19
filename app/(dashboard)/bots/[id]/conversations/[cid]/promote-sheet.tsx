'use client';

import { BookOpenCheck, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

import { promoteMessageAction } from '../actions';

export function PromoteSheet({
  open,
  onClose,
  botId,
  conversationId,
  assistantMessageId,
  defaultQuestion,
  defaultAnswer,
}: {
  open: boolean;
  onClose: () => void;
  botId: string;
  conversationId: string;
  assistantMessageId: string;
  defaultQuestion: string;
  defaultAnswer: string;
}) {
  const [question, setQuestion] = useState(defaultQuestion);
  const [answer, setAnswer] = useState(defaultAnswer);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setQuestion(defaultQuestion);
      setAnswer(defaultAnswer);
    }
  }, [open, defaultQuestion, defaultAnswer]);

  function submit() {
    startTransition(async () => {
      const result = await promoteMessageAction({
        botId,
        conversationId,
        assistantMessageId,
        question,
        answer,
      });
      if (result.ok) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-2xl">
        <div className="flex h-full flex-col">
          <div className="border-b p-6">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Promote to training
            </SheetTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Turn this Q&amp;A into a permanent training pair. The question gets embedded so similar
              user queries match it; the answer becomes the chunk content the bot serves back.
              Editable — clean up the wording before saving.
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div className="space-y-1.5">
              <Label htmlFor="promote-question">Question (what user queries should match)</Label>
              <Input
                id="promote-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={500}
                placeholder="How do I cancel my subscription?"
              />
              <p className="text-xs text-muted-foreground">
                Tip: write the question the way a typical customer would phrase it.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="promote-answer">Canonical answer (returned verbatim to users)</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {answer.length.toLocaleString()} chars
                </span>
              </div>
              <Textarea
                id="promote-answer"
                rows={12}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                maxLength={8000}
                className="font-mono text-xs leading-relaxed"
              />
            </div>
            <div className="rounded-md border border-brand/20 bg-brand/5 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">What happens next?</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>A new Q&amp;A source is created in this bot.</li>
                <li>The worker embeds the question.</li>
                <li>From the next chat onward, similar user queries retrieve this answer.</li>
                <li>You can later edit or delete it from the Sources page.</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t p-6">
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpenCheck className="h-4 w-4" />}
              {pending ? 'Saving…' : 'Save as training'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
