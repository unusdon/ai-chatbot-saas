import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { SignupForm } from './signup-form';

export const metadata = {
  title: 'Sign up',
  description: 'Create your AI Chatbot SaaS account.',
};

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Start building your first chatbot in minutes.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
