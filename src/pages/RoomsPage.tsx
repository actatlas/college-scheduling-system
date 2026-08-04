import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";

type RoomRow = {
  number: string;
  capacity: number;
  building: string;
  type: string;
  status: string;
};

export function RoomsPage() {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingNumber, setDeletingNumber] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const isAdmin = role === "admin";

  const [isOpen, setIsOpen] = useState(false);

  const [editingRoom, setEditingRoom] = useState<RoomRow | null>(null);
  const [form, setForm] = useState({
    number: "",

    capacity: "40",
    building: "",
    type: "Lecture",
    status: "Available",
  });
  const toast = useToast();

  const handleEdit = (room: RoomRow) => {
    if (!isAdmin) return;
    setEditingRoom(room);
    setForm({
      number: room.number,
      capacity: String(room.capacity),
      building: room.building,
      type: room.type,
      status: room.status,
    });
    setIsOpen(true);
  };

  const handleDelete = async (number: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Remove this room from the facilities list?")) return;

    setDeletingNumber(number);
    try {
      await api.delete(`/rooms/${encodeURIComponent(number)}`);
      toast.push("Room deleted successfully", "success");
      fetchRooms();
    } catch (err: any) {
      toast.push(
        err?.response?.data?.error || "Failed to delete room",
        "error",
      );
    } finally {
      setDeletingNumber(null);
    }
  };

  const fetchRooms = () => {
    api
      .get("/rooms")
      .then((res: any) => setRooms(res.data?.data || []))
      .catch(() => setRooms([]));
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredRooms = rooms.filter((room) =>
    [room.number, room.building, room.type, room.status]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Rooms"
        description="Keep classrooms and laboratories aligned with your scheduling rules."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Rooms</strong>
          </>
        }
        helpText="Review room capacity and availability before locking a timetable slot."
        actions={
          isAdmin ? (
            <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingRoom(null);
                setForm({
                  number: "",
                  capacity: "40",
                  building: "",
                  type: "Lecture",
                  status: "Available",
                });
                setIsOpen(true);
              }}
            >
              <Plus size={16} />
              Add Room
            </button>
          ) : undefined
        }
      />

      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">Facility inventory</p>
            <h3>Classroom registry</h3>
          </div>
          <label className="topbar__search" aria-label="Search rooms">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search room"
            />
          </label>
        </div>
        <div className="grid-3">
          {filteredRooms.length === 0 ? (
            <div className="empty-state">No rooms matched your search.</div>
          ) : (
            filteredRooms.map((room) => (
              <article
                className="card"
                key={room.number}
                style={{ position: "relative" }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    display: "flex",
                    gap: 4,
                  }}
                >
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        title="Edit Room"
                        onClick={() => handleEdit(room)}
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
                        title="Delete Room"
                        onClick={() => handleDelete(room.number)}
                        disabled={deletingNumber === room.number}
                        style={{
                          background: "none",
                          border: "none",
                          cursor:
                            deletingNumber === room.number ? "wait" : "pointer",
                          color: "#dc2626",
                          opacity: deletingNumber === room.number ? 0.7 : 1,
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
                <p className="eyebrow">{room.building}</p>
                <h3>{room.number}</h3>
                <p className="muted">
                  {room.type} • Capacity {room.capacity}
                </p>
                <p className="pill">{room.status}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <Modal
        isOpen={isOpen && isAdmin}
        onClose={() => {
          setIsOpen(false);
          setEditingRoom(null);
        }}
        title={editingRoom ? "Edit room" : "Create room"}
        description={
          editingRoom
            ? "Update registration details for this room."
            : "Register a room or laboratory for timetable planning."
        }
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="roomNumber">Room Number</label>
            <input
              id="roomNumber"
              value={form.number}
              disabled={!!editingRoom}
              onChange={(event) =>
                setForm({ ...form, number: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="roomCapacity">Capacity</label>
            <input
              id="roomCapacity"
              type="number"
              value={form.capacity}
              onChange={(event) =>
                setForm({ ...form, capacity: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="roomBuilding">Building</label>
            <input
              id="roomBuilding"
              value={form.building}
              onChange={(event) =>
                setForm({ ...form, building: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="roomType">Type</label>
            <select
              id="roomType"
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value })
              }
            >
              <option value="Lecture">Lecture Room</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Computer Laboratory">Computer Laboratory</option>
              <option value="AVR">AVR</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="roomStatus">Status</label>
            <select
              id="roomStatus"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        </div>
        <div className="table-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setIsOpen(false);
              setEditingRoom(null);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-button"
            disabled={loading}
            onClick={async () => {
              if (!form.number) {
                toast.push("Room number is required", "error");
                return;
              }
              setLoading(true);
              try {
                const payload = {
                  ...form,
                  capacity: Number(form.capacity),
                };
                if (editingRoom) {
                  await api.put(
                    `/rooms/${encodeURIComponent(editingRoom.number)}`,
                    payload,
                  );
                  toast.push("Room updated", "success");
                } else {
                  await api.post("/rooms", payload);
                  toast.push("Room created", "success");
                }
                fetchRooms();
                setIsOpen(false);
                setEditingRoom(null);
                setForm({
                  number: "",
                  capacity: "40",
                  building: "",
                  type: "Lecture",
                  status: "Available",
                });
              } catch (err: any) {
                toast.push(
                  err?.response?.data?.error || "Failed to save room",
                  "error",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Saving…" : "Save Room"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
