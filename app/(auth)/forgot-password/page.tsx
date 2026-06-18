import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Forgot password',
  description: 'Recover access to your AI Chatbot SaaS account.',
};

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Password reset is shipping in Milestone 2 (email + magic links). For now, email{' '}
          <a href="mailto:support@cyberunite.com" className="underline-offset-4 hover:underline">
            support@cyberunite.com
          </a>{' '}
          and we&apos;ll help you regain access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href="/login"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          ← Back to log in
        </Link>
      </CardContent>
    </Card>
  );
}
