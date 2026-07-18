import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { UserPlus } from "lucide-react";

export function UserManagementPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="User Management"
        description="Oversee administrator access and institution-wide roles for the scheduling platform."
        actions={
          <button className="action-button" type="button">
            <UserPlus size={16} />
            Invite User
          </button>
        }
      />

      <section className="card">
        <p className="eyebrow">Access control</p>
        <h3>Secure administration roles</h3>
        <p className="muted">
          Prepare the system for future expansion with role-based permissions
          and audit-ready workflows.
        </p>
      </section>
    </motion.div>
  );
}
