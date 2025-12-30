'use client';

import { Suspense } from 'react';
import PricingContent from './PricingContent';

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 pt-32 pb-12 px-4 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}
