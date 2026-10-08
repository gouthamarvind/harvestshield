export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-2 h-3 w-32" />
      <Skeleton className="mb-8 h-8 w-96 max-w-full" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="panel h-[118px] p-5"><Skeleton className="mb-4 h-3 w-20" /><Skeleton className="h-8 w-24" /></div>)}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="panel h-[340px] p-5 xl:col-span-2"><Skeleton className="mb-6 h-3 w-40" /><Skeleton className="h-[250px] w-full" /></div>
        <div className="panel h-[340px] p-5"><Skeleton className="mb-6 h-3 w-32" />{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="mb-3 h-12 w-full" />)}</div>
      </div>
    </div>
  );
}
