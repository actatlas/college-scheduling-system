import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/mockApi";
import { ShieldAlert } from "lucide-react";

type ConflictRow = {
  title: string;
  severity: "High" | "Medium" | "Low";
  detail: string;
  suggestion: string;
};

export function ConflictPage() {
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);

  useEffect(() => {
    api
      .get("/schedules/conflicts")
      .then((res: any) => setConflicts(res.data?.data || []))
      .catch(() => setConflicts([]));
  }, []);

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
