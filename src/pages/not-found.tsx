import { Link } from 'wouter';
import { AlertCircle, Home } from 'lucide-react';
import { btn } from '@/components/kit';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center py-12">
      <div className="glass mx-4 w-full max-w-md rounded-3xl p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#fff0f2] text-bad">
          <AlertCircle className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="font-display text-2xl font-extrabold text-ink">404 Page Not Found</h1>
        <p className="mt-2 text-sm text-dim">
          That lunar coordinate does not exist. Head back to Mission Home to launch your Moon Base.
        </p>
        <Link href="/" className={`${btn.primary} mt-5`} data-testid="link-not-found-home">
          <Home className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    </div>
  );
}

