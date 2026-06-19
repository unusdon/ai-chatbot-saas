import Link from 'next/link';

import { SignupForm } from './signup-form';

export const metadata = {
  title: 'Sign up',
  description: 'Create your AI Chatbot SaaS account.',
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
