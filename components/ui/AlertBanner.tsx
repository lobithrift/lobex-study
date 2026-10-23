import React from 'react';
import { AlertCircle, Info, BookOpen, CheckCircle2 } from 'lucide-react';

interface AlertBannerProps {
  type?: 'info' | 'warning' | 'ai' | 'success';
  title?: string;
  message: string;
  className?: string;
}

export function AlertBanner({ type = 'info', title, message, className = '' }: AlertBannerProps) {
  const getStyles = () => {
    switch (type) {
      case 'ai':
        return {
          bg: 'bg-slate-50 border-slate-200 text-slate-800',
          icon: <BookOpen className="w-4 h-4 text-slate-700 flex-shrink-0" />,
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-900',
          icon: <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />,
        };
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />,
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50/70 border-blue-200 text-blue-900',
          icon: <Info className="w-4 h-4 text-blue-700 flex-shrink-0" />,
        };
    }
  };

  const { bg, icon } = getStyles();

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${bg} ${className}`}
    >
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        {title && <p className="font-bold text-base mb-0.5">{title}</p>}
        <p className="leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
