'use client';

import { Loader2, MessagesSquare, Save } from 'lucide-react';
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { createQaPairAction, type DocumentActionState } from '../../documents/actions';

const INITIAL: DocumentActionState = { status: 'idle' };

export function QaPairForm({ botId }: { botId: string }) {
  const [state, formAction] = useActionState(createQaPairAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'ok') {
      toast.success(state.message);
      formRef.current?.reset();
    }
    if (state.status === 'error' && !state.field) toast.error(state.message);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessagesSquare className="h-4 w-4" /> Q&amp;A pair
        </CardTitle>
        <CardDescription>
          The question is what we embed (so user queries match it). The answer is what gets fed to
          the LLM. Useful for greetings, support scripts, brand voice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="botId" value={botId} />
          <div className="space-y-1.5">
            <Label htmlFor="qa-question">Question</Label>
            <Input
              id="qa-question"
              name="question"
              placeholder="How do I cancel my subscription?"
              required
              maxLength={500}
              aria-invalid={state.status === 'error' && state.field === 'question'}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-answer">Answer</Label>
            <Textarea
              id="qa-answer"
              name="answer"
              rows={6}
              required
              maxLength={8000}
              placeholder="Open Settings → Billing → Cancel subscription. Effective at end of period."
              aria-invalid={state.status === 'error' && state.field === 'answer'}
            />
            <p className="text-xs text-muted-foreground">
              Tip: write the answer in your bot&apos;s voice. It will be returned verbatim to the user.
            </p>
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {pending ? 'Saving…' : 'Save Q&A pair'}
    </Button>
  );
}
