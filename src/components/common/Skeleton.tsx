import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 6,
  className = "",
  style = {},
}: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="table-skeleton-wrap" aria-busy="true" aria-label="Loading data table...">
      <div className="table-skeleton-header">
        {Array.from({ length: columns }).map((_, idx) => (
          <Skeleton
            key={`th-${idx}`}
            height={18}
            width={`${Math.floor(60 + ((idx * 27) % 35))}%`}
          />
        ))}
      </div>
      <div className="table-skeleton-body">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={`tr-${rowIdx}`} className="table-skeleton-row">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div key={`td-${rowIdx}-${colIdx}`} className="table-skeleton-cell">
                <Skeleton
                  height={16}
                  width={`${Math.floor(50 + (((rowIdx + colIdx) * 19) % 45))}%`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface CardGridSkeletonProps {
  count?: number;
  columns?: number;
}

export function CardGridSkeleton({ count = 6 }: CardGridSkeletonProps) {
  return (
    <div className="grid-3" aria-busy="true" aria-label="Loading cards...">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`card-skel-${idx}`}
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 18,
            minHeight: 160,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Skeleton width="40%" height={14} />
            <Skeleton width={60} height={20} borderRadius={12} />
          </div>
          <Skeleton width="75%" height={22} borderRadius={4} />
          <Skeleton width="90%" height={14} />
          <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 8 }}>
            <Skeleton width={70} height={22} borderRadius={10} />
            <Skeleton width={80} height={22} borderRadius={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface StatCardSkeletonProps {
  count?: number;
}

export function StatCardSkeleton({ count = 4 }: StatCardSkeletonProps) {
  return (
    <div className="stats-grid" aria-busy="true" aria-label="Loading metrics...">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`stat-skel-${idx}`}
          className="stat-card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: 18,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Skeleton width="50%" height={14} />
            <Skeleton width={32} height={32} borderRadius={8} />
          </div>
          <Skeleton width="45%" height={32} borderRadius={6} />
          <Skeleton width="80%" height={12} />
        </div>
      ))}
    </div>
  );
}

export function TimetableSkeleton() {
  return (
    <div className="timetable-skeleton-wrap" aria-busy="true" aria-label="Loading schedule matrix...">
      <div className="timetable-skeleton-header">
        <Skeleton width={80} height={20} />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={`day-${i}`} width={90} height={20} />
        ))}
      </div>
      <div className="timetable-skeleton-grid">
        {Array.from({ length: 6 }).map((_, rowIdx) => (
          <div key={`timerow-${rowIdx}`} className="timetable-skeleton-row">
            <div className="timetable-skeleton-time">
              <Skeleton width={70} height={14} />
            </div>
            {Array.from({ length: 6 }).map((_, colIdx) => (
              <div key={`cell-${rowIdx}-${colIdx}`} className="timetable-skeleton-cell">
                {((rowIdx + colIdx) % 2 === 0) && (
                  <div className="timetable-skeleton-block">
                    <Skeleton width="80%" height={14} />
                    <Skeleton width="60%" height={12} />
                    <Skeleton width="40%" height={10} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
