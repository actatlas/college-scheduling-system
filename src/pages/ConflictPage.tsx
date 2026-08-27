import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/apiClient";
import { CheckCircle2, RefreshCw, AlertTriangle, Target } from "lucide-react";
import { CardGridSkeleton } from "../components/common/Skeleton";
import { Tooltip } from "../components/common/Tooltip";

type ConflictRow = {
  id?: string;
  title: string;
  severity: "High" | "Medium" | "Low";
  detail: string;
  suggestion: string;
};

export function ConflictPage() {
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const fetchConflictData = async () => {
    setIsFetching(true);
    try {
      const res = await api.get("/conflicts").catch(() => ({ data: { data: [] } }));
      setConflicts(res.data?.data || []);
    } catch {
      setConflicts([]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchConflictData();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Conflict Detection & Diagnostics"
        description="Inspect flagged institutional scheduling conflicts, room double-bookings, instructor availability overlaps, and capacity constraints for manual timetable management."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Conflicts</strong>
          </>
        }
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Tooltip content="Refresh Diagnostics">
              <button
                className="secondary-button"
                type="button"
                aria-label="Refresh Conflict Diagnostics"
                onClick={() => fetchConflictData()}
              >
                <RefreshCw size={16} /> Refresh Diagnostics
              </button>
            </Tooltip>
          </div>
        }
      />

      <section className="card">
        <div className="card__header" style={{ marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={18} color="var(--srcb-navy)" />
              <p className="eyebrow" style={{ margin: 0 }}>Timetable Validation</p>
            </div>
            <h3 style={{ margin: "4px 0 0" }}>Active Timetable Constraint Conflicts ({conflicts.length})</h3>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.84rem" }}>
              Conflicts are caught and blocked in real-time by the backend MySQL scheduling engine to assist manual scheduling.
            </p>
          </div>
        </div>

        <div className="grid-3">
          {isFetching ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <CardGridSkeleton count={3} />
            </div>
          ) : conflicts.length === 0 ? (
            <article className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "36px 20px" }}>
              <div style={{ display: "grid", placeItems: "center", marginBottom: 10 }}>
                <CheckCircle2 size={40} color="#10b981" />
              </div>
              <h3 style={{ color: "var(--srcb-text)", margin: 0 }}>0 Conflicts Detected</h3>
              <p className="muted" style={{ maxWidth: 520, margin: "8px auto 0", fontSize: "0.88rem" }}>
                All room assignments, instructor time slots, and section cohorts are completely conflict-free.
              </p>
            </article>
          ) : (
            conflicts.map((conflict, idx) => (
              <article
                className="card"
                key={conflict.id || idx}
                style={{
                  borderLeft: `4px solid ${
                    conflict.severity === "High"
                      ? "#ef4444"
                      : conflict.severity === "Medium"
                      ? "#f59e0b"
                      : "var(--srcb-navy)"
                  }`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <p className="eyebrow" style={{ margin: 0, color: conflict.severity === "High" ? "#f87171" : "inherit" }}>
                    {conflict.severity} Priority
                  </p>
                  <span
                    className={`pill ${
                      conflict.severity === "High"
                        ? "pill--danger"
                        : conflict.severity === "Medium"
                        ? "pill--warning"
                        : "pill--slate"
                    }`}
                    style={{ fontSize: "0.72rem" }}
                  >
                    {conflict.severity}
                  </span>
                </div>
                <h3 style={{ fontSize: "0.98rem", color: "var(--srcb-text)" }}>{conflict.title}</h3>
                <p className="muted" style={{ fontSize: "0.82rem", marginTop: 4 }}>
                  {conflict.detail}
                </p>
                <div style={{ marginTop: 10 }}>
                  <span className="pill" style={{ fontSize: "0.76rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Target size={13} style={{ flexShrink: 0 }} /> {conflict.suggestion}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </motion.div>
  );
}
