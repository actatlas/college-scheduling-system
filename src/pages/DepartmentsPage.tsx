import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";

import { useEffect, useState } from "react";
import { api } from "../data/mockApi";

type DepartmentRow = { name: string; faculty: number; focus: string };

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);

  useEffect(() => {
    api
      .get("/departments")
      .then((res: any) => setDepartments(res.data?.data || []))
      .catch(() => setDepartments([]));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Departments"
        description="Support modular academic units for future expansion across the school."
        actions={
          <button
            className="action-button"
            type="button"
            onClick={async () => {
              const name = window.prompt("Department name")?.trim();
              if (!name) return;
              const focus = window.prompt("Focus (optional)")?.trim() || "";
              try {
                await api.post("/departments", { name, focus });
                const res: any = await api.get("/departments");
                setDepartments(res.data?.data || []);
                // eslint-disable-next-line no-alert
                alert("Department added");
              } catch (err) {
                // eslint-disable-next-line no-console
                console.error(err);
                // eslint-disable-next-line no-alert
                alert("Failed to add department");
              }
            }}
          >
            Add Department
          </button>
        }
      />

      <section className="grid-3">
        {departments.map((department) => (
          <article className="card" key={department.name}>
            <p className="eyebrow">Academic unit</p>
            <h3>{department.name}</h3>
            <p className="muted">{department.focus}</p>
            <p className="stat-card__value">{department.faculty} faculty</p>
          </article>
        ))}
      </section>
    </motion.div>
  );
}
