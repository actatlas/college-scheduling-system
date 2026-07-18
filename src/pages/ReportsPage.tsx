import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { FileDown } from "lucide-react";

export function ReportsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Reports"
        description="Export academic planning insights for faculty, rooms, and schedules."
        actions={
          <button className="action-button" type="button">
            <FileDown size={16} />
            Export PDF
          </button>
        }
      />

      <section className="grid-3">
        <article className="card">
          <p className="eyebrow">Faculty load</p>
          <h3>Teaching distribution</h3>
          <p className="muted">
            Balanced workload across full-time and part-time instructors.
          </p>
        </article>
        <article className="card">
          <p className="eyebrow">Room utilization</p>
          <h3>Capacity charts</h3>
          <p className="muted">
            Track occupancy, maintenance windows, and usage trends.
          </p>
        </article>
        <article className="card">
          <p className="eyebrow">Printable timetable</p>
          <h3>Ready for printouts</h3>
          <p className="muted">
            Generate semester timetables for departments and class advisers.
          </p>
        </article>
      </section>
    </motion.div>
  );
}
