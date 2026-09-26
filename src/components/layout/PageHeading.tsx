import type { ReactNode } from 'react';

interface PageHeadingProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeading({ eyebrow, title, description, actions }: PageHeadingProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <div className="text-xs sm:text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </div>
  );
}
