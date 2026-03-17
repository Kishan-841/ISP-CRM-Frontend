'use client';

export function PageHeader({ title, description, children }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-7 w-1.5 bg-orange-500 rounded-full" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        </div>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-[18px]">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}
