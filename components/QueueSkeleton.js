'use client';

export function StatsGridSkeleton({ columns = 4 }) {
  const colsClass =
    columns <= 4
      ? `grid-cols-2 sm:grid-cols-${columns}`
      : `grid-cols-2 sm:grid-cols-4 lg:grid-cols-${columns}`;

  return (
    <div className={`grid ${colsClass} gap-4`}>
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-3 bg-muted-foreground/20 rounded w-20 mb-2" />
          <div className="h-7 bg-muted-foreground/20 rounded w-12" />
        </div>
      ))}
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }) {
  return (
    <div className="px-4 py-3.5 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-6">
        {Array.from({ length: columns }).map((_, j) => (
          <div
            key={j}
            className="h-4 bg-muted-foreground/10 rounded animate-pulse"
            style={{ width: `${60 + (j * 17) % 60}px` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted px-4 py-3">
        <div className="flex items-center gap-6">
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className="h-3 bg-muted-foreground/20 rounded animate-pulse"
              style={{ width: `${50 + (i * 23) % 50}px` }}
            />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  );
}

export function StatsCardsSkeleton({ count = 3 }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${count} gap-3 sm:gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 border rounded-lg p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <div className="h-5 w-5" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-muted-foreground/20 rounded w-24" />
              <div className="h-7 bg-muted-foreground/20 rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function QueuePageSkeleton({ statsColumns = 4, tableColumns = 5, tableRows = 5 }) {
  return (
    <div className="space-y-4">
      <StatsGridSkeleton columns={statsColumns} />
      <TableSkeleton rows={tableRows} columns={tableColumns} />
    </div>
  );
}

export function BillingPageSkeleton() {
  return (
    <div className="space-y-6">
      <StatsCardsSkeleton count={3} />
      <div className="flex items-center gap-2 pb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted-foreground/10 rounded animate-pulse" style={{ width: `${70 + i * 15}px` }} />
        ))}
      </div>
      <TableSkeleton rows={8} columns={6} />
    </div>
  );
}
