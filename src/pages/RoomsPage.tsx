import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/mockApi";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { Plus, Search } from "lucide-react";

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
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    number: "",
    capacity: "40",
    building: "",
    type: "Lecture",
    status: "Available",
  });
  const toast = useToast();

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
        actions={
          <button
            className="action-button"
            type="button"
            onClick={() => setIsOpen(true)}
          >
            <Plus size={16} />
            Add Room
          </button>
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
              <article className="card" key={room.number}>
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
        isOpen={isOpen}
        title="Create room"
        description="Register a room or laboratory for timetable planning."
        onClose={() => setIsOpen(false)}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="roomNumber">Room Number</label>
            <input
              id="roomNumber"
              value={form.number}
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
            onClick={() => setIsOpen(false)}
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
                await api.post("/rooms", {
                  ...form,
                  capacity: Number(form.capacity),
                });
                fetchRooms();
                toast.push("Room created", "success");
                setIsOpen(false);
                setForm({
                  number: "",
                  capacity: "40",
                  building: "",
                  type: "Lecture",
                  status: "Available",
                });
              } catch (err: any) {
                toast.push(
                  err?.response?.data?.error || "Failed to create room",
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
