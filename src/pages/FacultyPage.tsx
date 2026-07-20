import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/mockApi";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";

const getRole = () =>
  (localStorage.getItem("userRole") || "admin").toLowerCase();

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyRow | null>(null);
  const [form, setForm] = useState({
    id: "",
    name: "",
    department: "",
    status: "Full-Time",
    availability: "",
  });
  const toast = useToast();

  const role = getRole();
  const isAdmin = role === "admin";

  const handleEdit = (f: FacultyRow) => {
    setEditingFaculty(f);
    setForm({
      id: f.id,
      name: f.name,
      department: f.department,
      status: f.status,
      availability: f.availability || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Delete this faculty record? This action cannot be undone.",
      )
    )
      return;
    setDeletingId(id);
    try {
      await api.delete(`/faculty/${encodeURIComponent(id)}`);
      toast.push("Faculty member deleted successfully", "success");
      fetchFaculty();
    } catch (err: any) {
      toast.push(
        err?.response?.data?.error || "Failed to delete faculty member",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  };
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
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Faculty</strong>
          </>
        }
        helpText="Use the search bar to find instructors quickly and review availability before assigning classes."
        actions={
          isAdmin ? (
            <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingFaculty(null);
                setForm({
                  id: "",
                  name: "",
                  department: "",
                  status: "Full-Time",
                  availability: "",
                });
                setIsOpen(true);
              }}
            >
              <Plus size={16} />
              Add Faculty
            </button>
          ) : undefined
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
                <th style={{ textAlign: "right" }}>
                  {isAdmin ? "Actions" : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFaculty.length === 0 ? (
                <tr>
                  <td colSpan={6}>
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
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          className="icon-button"
                          title="Edit Faculty"
                          onClick={() => handleEdit(f)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#4b5563",
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Delete Faculty"
                          onClick={() => handleDelete(f.id)}
                          disabled={deletingId === f.id}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: deletingId === f.id ? "wait" : "pointer",
                            color: "#dc2626",
                            opacity: deletingId === f.id ? 0.7 : 1,
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={isOpen}
        title={editingFaculty ? "Edit faculty" : "Add faculty"}
        description={
          editingFaculty
            ? "Update faculty profile details."
            : "Create a faculty profile for the registrar roster."
        }
        onClose={() => {
          setIsOpen(false);
          setEditingFaculty(null);
        }}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="facultyId">Employee ID</label>
            <input
              id="facultyId"
              value={form.id}
              disabled={!!editingFaculty}
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
            onClick={() => {
              setIsOpen(false);
              setEditingFaculty(null);
            }}
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
                if (editingFaculty) {
                  await api.put(
                    `/faculty/${encodeURIComponent(editingFaculty.id)}`,
                    form,
                  );
                  toast.push("Faculty updated", "success");
                } else {
                  await api.post("/faculty", form);
                  toast.push("Faculty added", "success");
                }
                fetchFaculty();
                setIsOpen(false);
                setEditingFaculty(null);
                setForm({
                  id: "",
                  name: "",
                  department: "",
                  status: "Full-Time",
                  availability: "",
                });
              } catch (err: any) {
                toast.push(
                  err?.response?.data?.error || "Failed to save faculty",
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
