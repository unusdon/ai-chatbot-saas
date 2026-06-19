import Link from 'next/link';

import { SignupForm } from './signup-form';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign up — start free',
  description:
    'Create your AI Chatbot SaaS account. Free plan: 3 chatbots, 25 documents, 200 messages/month. No credit card required.',
  alternates: { canonical: '/signup' },
  openGraph: {
    title: 'Sign up for AI Chatbot SaaS',
    description: 'Start free. Train your first chatbot in under 10 minutes.',
    type: 'website',
  },
};

export default function SignupPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Free to start. No credit card. Upgrade when you outgrow the caps.
        </p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
      <p className="text-balance text-center text-xs text-muted-foreground">
        By creating an account you agree to be a delightful person to your end-users. That&apos;s it.
      </p>
    </div>
  );
}
