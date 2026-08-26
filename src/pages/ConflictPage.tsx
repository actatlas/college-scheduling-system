import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { api } from "../data/apiClient";
import { Sparkles, CheckCircle2, RefreshCw } from "lucide-react";
import { buildAiRecommendations } from "../utils/scheduling";
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
  const [scheduleItems, setScheduleItems] = useState<Array<any>>([]);
  const [isFetching, setIsFetching] = useState(true);

  const fetchConflictData = async () => {
    setIsFetching(true);
    try {
      const [confRes, schedRes] = await Promise.all([
        api.get("/conflicts").catch(() => ({ data: { data: [] } })),
        api.get("/schedules").catch(() => ({ data: { data: [] } })),
      ]);
      setConflicts(confRes.data?.data || []);
      setScheduleItems(schedRes.data?.data || []);
    } catch {
      setConflicts([]);
      setScheduleItems([]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchConflictData();
  }, []);

  const aiRecommendations = useMemo(
    () => buildAiRecommendations(scheduleItems),
    [scheduleItems],
  );

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
        <div className="card__header">
          <div>
            <p className="eyebrow">Smart Optimization Assistant</p>
            <h3>Schedule Health & Suggestions</h3>
            <p className="muted">
              Practical optimization suggestions to balance room utilization, faculty loads, and student section cohorts.
            </p>
          </div>
          <span className="pill pill--royal">
            <Sparkles size={14} /> AI Diagnostics
          </span>
        </div>
        <div className="grid-2">
          {aiRecommendations.length === 0 ? (
            <div className="empty-state">
              ✓ All weekly schedules conform to institutional constraints. No optimization warnings detected.
            </div>
          ) : (
            aiRecommendations.map((recommendation) => (
              <article className="card" key={recommendation.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <p className="eyebrow" style={{ margin: 0 }}>
                    {recommendation.severity} Priority
                  </p>
                  <span
                    className={`pill ${
                      recommendation.severity === "High"
                        ? "pill--danger"
                        : recommendation.severity === "Medium"
                        ? "pill--online"
                        : "pill--navy"
                    }`}
                    style={{ fontSize: "0.72rem" }}
                  >
                    {recommendation.severity}
                  </span>
                </div>
                <h3 style={{ fontSize: "1rem" }}>{recommendation.title}</h3>
                <p className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
                  {recommendation.detail}
                </p>
                <div style={{ marginTop: 10 }}>
                  <span className="pill pill--f2f" style={{ fontSize: "0.78rem" }}>
                    💡 {recommendation.suggestion}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <div className="card__header" style={{ marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Active Constraint Conflicts ({conflicts.length})</h3>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.84rem" }}>
              Conflicts are caught and blocked in real-time by the backend MySQL scheduling engine.
            </p>
          </div>
        </div>

        <div className="grid-3">
          {isFetching ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <CardGridSkeleton count={3} />
            </div>
          ) : conflicts.length === 0 ? (
            <article className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "32px 20px" }}>
              <div style={{ display: "grid", placeItems: "center", marginBottom: 10 }}>
                <CheckCircle2 size={36} color="#10b981" />
              </div>
              <h3 style={{ color: "var(--srcb-text)", margin: 0 }}>0 Conflicts Detected</h3>
              <p className="muted" style={{ maxWidth: 500, margin: "8px auto 0", fontSize: "0.88rem" }}>
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
                      : "#38bdf8"
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
                        ? "pill--online"
                        : "pill--navy"
                    }`}
                    style={{ fontSize: "0.72rem" }}
                  >
                    {conflict.severity}
                  </span>
                </div>
                <h3 style={{ fontSize: "0.98rem" }}>{conflict.title}</h3>
                <p className="muted" style={{ fontSize: "0.82rem", marginTop: 4 }}>
                  {conflict.detail}
                </p>
                <div style={{ marginTop: 10 }}>
                  <span className="pill" style={{ fontSize: "0.76rem" }}>
                    🎯 {conflict.suggestion}
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
