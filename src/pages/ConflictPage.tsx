import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { api } from "../data/apiClient";
import { ShieldAlert, Sparkles } from "lucide-react";
import { buildAiRecommendations } from "../utils/scheduling";

type ConflictRow = {
  title: string;
  severity: "High" | "Medium" | "Low";
  detail: string;
  suggestion: string;
};

export function ConflictPage() {
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [scheduleItems, setScheduleItems] = useState<Array<any>>([]);

  useEffect(() => {
    api
      .get("/schedules/conflicts")
      .then((res: any) => setConflicts(res.data?.data || []))
      .catch(() => setConflicts([]));

    api
      .get("/schedules")
      .then((res: any) => setScheduleItems(res.data?.data || []))
      .catch(() => setScheduleItems([]));
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
        title="Conflict Detection"
        description="Review flagged schedule conflicts and recommended resolution paths."
        actions={
          <button className="action-button" type="button">
            <ShieldAlert size={16} />
            Resolve All
          </button>
        }
      />

      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">AI assistant</p>
            <h3>Suggested improvements</h3>
            <p className="muted">
              The assistant recommends practical changes that keep class
              planning efficient and fair.
            </p>
          </div>
          <span className="pill">
            <Sparkles size={14} /> Smart planning
          </span>
        </div>
        <div className="grid-2">
          {aiRecommendations.length === 0 ? (
            <div className="empty-state">
              No planning issues detected right now.
            </div>
          ) : (
            aiRecommendations.map((recommendation) => (
              <article className="card" key={recommendation.id}>
                <p className="eyebrow">{recommendation.severity} priority</p>
                <h3>{recommendation.title}</h3>
                <p className="muted">{recommendation.detail}</p>
                <p className="pill">{recommendation.suggestion}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="grid-3">
        {conflicts.length === 0 ? (
          <article className="card">
            <p className="eyebrow">Clear</p>
            <h3>No Conflicts Detected</h3>
            <p className="muted">
              All weekly schedules are aligned with your scheduling constraints.
            </p>
          </article>
        ) : (
          conflicts.map((conflict) => (
            <article className="card" key={conflict.title}>
              <p className="eyebrow">{conflict.severity} priority</p>
              <h3>{conflict.title}</h3>
              <p className="muted">{conflict.detail}</p>
              <p className="pill">{conflict.suggestion}</p>
            </article>
          ))
        )}
      </section>
    </motion.div>
  );
}
