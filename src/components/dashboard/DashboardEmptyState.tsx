import type { ReactNode } from 'react';

type DashboardEmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
};

export function DashboardEmptyState({ title, description, icon }: DashboardEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-8 text-center text-muted-foreground">
      {icon ? <div className="mb-3 flex justify-center text-muted-foreground/70">{icon}</div> : null}
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground/80">{description}</div>
    </div>
  );
}


