import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { Save } from "lucide-react";

export function SettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Settings"
        description="Adjust institutional preferences and scheduling defaults for the college department."
        actions={
          <button className="action-button" type="button">
            <Save size={16} />
            Save Changes
          </button>
        }
      />

      <section className="grid-2">
        <article className="card">
          <p className="eyebrow">School information</p>
          <h3>Institution profile</h3>
          <p className="muted">
            College department details, academic year, and semester preferences.
          </p>
        </article>
        <article className="card">
          <p className="eyebrow">Scheduling preferences</p>
          <h3>Automation rules</h3>
          <p className="muted">
            Configure preferred room blocks, teacher load limits, and conflict
            tolerances.
          </p>
        </article>
      </section>
    </motion.div>
  );
}
