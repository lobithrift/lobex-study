import React from 'react';
import { DocumentSummarizer } from '@/components/summarizer/DocumentSummarizer';

export default function SummarizerPage() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Material & Note Summarizer</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Upload PDF documents or paste lecture notes to extract core definitions, executive summaries, and high-yield exam takeaways.
        </p>
      </div>
      <DocumentSummarizer />
    </div>
  );
}
