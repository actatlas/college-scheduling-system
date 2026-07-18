import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/mockApi";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";

type FacultyRow = {
  id: string;
  name: string;
  department: string;
  status: string;
  availability: string;
};

export function FacultyPage() {
  const [faculty, setFaculty] = useState<FacultyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    department: "",
    status: "Full-Time",
    availability: "",
  });
  const toast = useToast();
  const { selectedProgram, matchesProgram } = useProgramContext();

  const fetchFaculty = () => {
    api
      .get("/faculty")
      .then((res: any) => setFaculty(res.data?.data || []))
      .catch(() => setFaculty([]));
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const filteredFaculty = faculty.filter((entry) => {
    const matchesQuery = [
      entry.name,
      entry.department,
      entry.status,
      entry.availability,
      entry.id,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
    return (
      matchesQuery &&
      matchesProgram((entry as any).programs || selectedProgram.shortLabel)
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Faculty Management"
        description="Maintain faculty records, availability, and instruction load."
        actions={
          <button
            className="action-button"
            type="button"
            onClick={() => setIsOpen(true)}
          >
            <Plus size={16} />
            Add Faculty
          </button>
        }
      />

      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">Faculty roster</p>
            <h3>College instructors</h3>
          </div>
          <label className="topbar__search" aria-label="Search faculty">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search faculty"
            />
          </label>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Status</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              {filteredFaculty.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      No faculty records matched your search.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFaculty.map((f) => (
                  <tr key={f.id}>
                    <td>{f.id}</td>
                    <td>{f.name}</td>
                    <td>{f.department}</td>
                    <td>
                      <span className="pill">{f.status}</span>
                    </td>
                    <td>{f.availability}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={isOpen}
        title="Add faculty"
        description="Create a faculty profile for the registrar roster."
        onClose={() => setIsOpen(false)}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="facultyId">Employee ID</label>
            <input
              id="facultyId"
              value={form.id}
              onChange={(event) => setForm({ ...form, id: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="facultyName">Full Name</label>
            <input
              id="facultyName"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="facultyDept">Program / Department</label>
            <input
              id="facultyDept"
              value={form.department}
              onChange={(event) =>
                setForm({ ...form, department: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="facultyStatus">Faculty Status</label>
            <select
              id="facultyStatus"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
            </select>
          </div>
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="facultyAvailability">Availability</label>
            <textarea
              id="facultyAvailability"
              rows={3}
              value={form.availability}
              onChange={(event) =>
                setForm({ ...form, availability: event.target.value })
              }
              placeholder="e.g. Monday-Friday 08:00-17:00"
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
              if (!form.id || !form.name) {
                toast.push("Complete the required fields", "error");
                return;
              }
              setLoading(true);
              try {
                await api.post("/faculty", form);
                fetchFaculty();
                toast.push("Faculty added", "success");
                setIsOpen(false);
                setForm({
                  id: "",
                  name: "",
                  department: "",
                  status: "Full-Time",
                  availability: "",
                });
              } catch (err: any) {
                toast.push(
                  err?.response?.data?.error || "Failed to add faculty",
                  "error",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Saving…" : "Save Faculty"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
