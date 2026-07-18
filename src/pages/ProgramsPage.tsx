import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/mockApi";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus } from "lucide-react";

type ProgramRow = { id?: number; name: string; focus: string };

const defaultPrograms = [
  {
    name: "Bachelor of Science in Information Technology",
    focus: "Information Technology Program - ITP",
  },
  {
    name: "Bachelor of Science in Business Administration",
    focus: "Business Administration Program - BSA",
  },
  {
    name: "Bachelor of Science in Criminology",
    focus: "Criminal Justice Education Program - CJEP",
  },
  {
    name: "Bachelor of Science in Hospitality Management",
    focus: "Hospitality Management Program - HMP",
  },
  { name: "Teacher Education Program", focus: "TEP" },
];

export function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", focus: "" });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchPrograms = () => {
    api
      .get("/programs")
      .then((res: any) => setPrograms(res.data?.data || []))
      .catch(() => setPrograms([]));
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const visiblePrograms = programs.length > 0 ? programs : defaultPrograms;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Programs"
        description="Official college programs offered by St. Rita's College of Balingasag."
        actions={
          <button
            className="action-button"
            type="button"
            onClick={() => setIsOpen(true)}
          >
            <Plus size={16} />
            Add Program
          </button>
        }
      />

      <section className="grid-3">
        {visiblePrograms.length === 0 ? (
          <div className="empty-state">No programs have been recorded yet.</div>
        ) : (
          visiblePrograms.map((program) => (
            <article className="card" key={program.name}>
              <p className="eyebrow">Academic program</p>
              <h3>{program.name}</h3>
              <p className="muted">{program.focus}</p>
              <p className="pill">Official college offering</p>
            </article>
          ))
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">Curriculum offerings</p>
            <h3>College programs catalog</h3>
          </div>
        </div>
        <div className="grid-3">
          {defaultPrograms.map((item) => (
            <article className="card" key={item.name}>
              <p className="eyebrow">Registry entry</p>
              <h3>{item.name}</h3>
              <p className="muted">{item.focus}</p>
            </article>
          ))}
        </div>
      </section>

      <Modal
        isOpen={isOpen}
        title="Add program"
        description="Introduce a new academic program for the registrar catalog."
        onClose={() => setIsOpen(false)}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="programName">Program Name</label>
            <input
              id="programName"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="programFocus">Program Code / Focus</label>
            <input
              id="programFocus"
              value={form.focus}
              onChange={(event) =>
                setForm({ ...form, focus: event.target.value })
              }
            />
          </div>
        </div>
        <div className="table-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-button"
            disabled={loading}
            onClick={async () => {
              if (!form.name) {
                toast.push("Program name is required", "error");
                return;
              }
              setLoading(true);
              try {
                await api.post("/programs", form);
                fetchPrograms();
                toast.push("Program saved", "success");
                setIsOpen(false);
                setForm({ name: "", focus: "" });
              } catch (err: any) {
                toast.push(
                  err?.response?.data?.error || "Failed to save program",
                  "error",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Saving…" : "Save Program"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
