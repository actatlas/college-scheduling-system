import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { CardGridSkeleton } from "../components/common/Skeleton";
import { Plus, Search, Edit2, Trash2, Building, AlertTriangle, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { RoomItem, BuildingType } from "../types";

export function RoomsPage() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [roomToDelete, setRoomToDelete] = useState<RoomItem | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || searchParams.get("search") || "");

  useEffect(() => {
    const q = searchParams.get("q") || searchParams.get("search") || "";
    setQuery(q);
  }, [searchParams]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val.trim()) {
        next.set("q", val);
      } else {
        next.delete("q");
        next.delete("search");
      }
      return next;
    }, { replace: true });
  };
  const [buildingFilter, setBuildingFilter] = useState<string>("All");

  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const canEdit = role === "super_admin" || role === "admin";

  const [isOpen, setIsOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [form, setForm] = useState({
    number: "",
    capacity: "45",
    building: "College Building" as BuildingType,
    type: "Lecture",
    status: "Available" as "Available" | "Reserved" | "Maintenance",
  });
  const toast = useToast();

  const handleEdit = (room: RoomItem) => {
    if (!canEdit) return;
    setEditingRoom(room);
    setForm({
      number: room.number,
      capacity: String(room.capacity),
      building: room.building as BuildingType,
      type: room.type,
      status: room.status,
    });
    setIsOpen(true);
  };

  const executeDelete = async () => {
    if (!canEdit || !roomToDelete) return;
    setLoading(true);
    try {
      await api.delete(`/rooms/${encodeURIComponent(roomToDelete.number)}`);
      toast.push("Room deleted successfully", "success");
      fetchRooms();
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to delete room", "error");
    } finally {
      setLoading(false);
      setRoomToDelete(null);
    }
  };

  const fetchRooms = () => {
    setFetching(true);
    api
      .get("/rooms")
      .then((res: any) => setRooms(res.data?.data || []))
      .catch(() => setRooms([]))
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = [room.number, room.building, room.type, room.status]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());

    const matchesBuilding =
      buildingFilter === "All" ||
      room.building.toLowerCase().includes(buildingFilter.toLowerCase());

    return matchesSearch && matchesBuilding;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Campus Rooms & Facilities"
        description="Oversee classrooms, laboratories, and lecture halls across College, Senior High School (SHS), and Junior High School (JHS) buildings."
        breadcrumbs={
          <>
            <span>Home</span> <span>/</span> <strong>Rooms</strong>
          </>
        }
        helpText="Rooms across all 3 campus buildings can be allocated for regular classes and synchronized examination blocks."
        actions={
          canEdit ? (
            <button
              className="action-button"
              type="button"
              onClick={() => {
                setEditingRoom(null);
                setForm({
                  number: "",
                  capacity: "45",
                  building: "College Building",
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
        <div className="card__header" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="eyebrow">Facility Inventory</p>
            <h3>Campus Classrooms & Laboratories ({filteredRooms.length})</h3>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
              Building:
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}
              >
                <option value="All">All Buildings</option>
                <option value="College">College Building</option>
                <option value="SHS">SHS Building</option>
                <option value="JHS">JHS Building</option>
              </select>
            </label>

            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <label className="topbar__search" aria-label="Search rooms" style={{ margin: 0, paddingRight: query ? 32 : 12 }}>
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  placeholder="Search room name, type, building..."
                />
              </label>
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    background: "none",
                    border: "none",
                    color: "var(--srcb-text-muted, #94a3b8)",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {fetching ? (
          <CardGridSkeleton count={6} />
        ) : (
          <div className="grid-3" style={{ marginTop: 12 }}>
            {filteredRooms.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: "1 / -1", padding: "36px 16px", textAlign: "center" }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>No rooms found matching your search or building filter.</p>
                <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--srcb-text-muted)" }}>
                  Try adjusting your search query or selecting "All Campus Buildings".
                </p>
                {(query || buildingFilter !== "All") && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      handleQueryChange("");
                      setBuildingFilter("All");
                    }}
                    style={{ marginTop: 12, fontSize: "0.8rem" }}
                  >
                    Clear Search & Filters
                  </button>
                )}
              </div>
            ) : (
              filteredRooms.map((room) => (
                <article
                  className="card"
                  key={room.number}
                  style={{
                    position: "relative",
                    borderLeft: `4px solid ${
                      room.building.includes("College")
                        ? "#0284c7"
                        : room.building.includes("SHS")
                          ? "#8b5cf6"
                          : "#10b981"
                    }`,
                  }}
                >
                  {canEdit && (
                    <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="icon-button"
                        title="Edit Room"
                        aria-label={`Edit room ${room.number}`}
                        onClick={() => handleEdit(room)}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-button--danger"
                        title="Delete Room"
                        aria-label={`Delete room ${room.number}`}
                        onClick={() => setRoomToDelete(room)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Building size={16} color="#0d5499" />
                    <p className="eyebrow" style={{ margin: 0 }}>{room.building}</p>
                  </div>

                  <h3 style={{ marginTop: 8 }}>{room.number}</h3>
                  <p className="muted" style={{ marginTop: 4 }}>
                    {room.type} • Capacity: <strong>{room.capacity} students</strong>
                  </p>

                  <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                    <span
                      className={`pill ${
                        room.status === "Available"
                          ? "pill--success"
                          : room.status === "Reserved"
                            ? "pill--amber"
                            : "pill--danger"
                      }`}
                    >
                      {room.status}
                    </span>
                    <span className="pill pill--slate">{room.type}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </section>

      {/* Add / Edit Room Modal */}
      <Modal
        isOpen={isOpen && canEdit}
        onClose={() => {
          setIsOpen(false);
          setEditingRoom(null);
        }}
        title={editingRoom ? "Edit Classroom / Facility" : "Register New Room"}
        description="Allocate rooms across College, SHS, and JHS buildings with capacity limits."
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="roomNumber">
              Room Code / Number <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              id="roomNumber"
              value={form.number}
              disabled={!!editingRoom}
              onChange={(event) => setForm({ ...form, number: event.target.value })}
              placeholder="e.g. COL-101, COMLAB-1, SHS-102"
              required
              aria-required="true"
            />
          </div>

          <div className="field-group">
            <label htmlFor="roomBuilding">Campus Building</label>
            <select
              id="roomBuilding"
              value={form.building}
              onChange={(event) => setForm({ ...form, building: event.target.value as BuildingType })}
            >
              <option value="College Building">College Building</option>
              <option value="SHS Building">Senior High School (SHS) Building</option>
              <option value="JHS Building">Junior High School (JHS) Building</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="roomCapacity">Student Capacity</label>
            <input
              id="roomCapacity"
              type="number"
              value={form.capacity}
              onChange={(event) => setForm({ ...form, capacity: event.target.value })}
            />
          </div>

          <div className="field-group">
            <label htmlFor="roomType">Room Type / Facility</label>
            <select
              id="roomType"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              <option value="Lecture">Lecture Room</option>
              <option value="Computer Laboratory">Computer Laboratory</option>
              <option value="Science Laboratory">Science Laboratory</option>
              <option value="AVR">Audio-Visual Room (AVR)</option>
              <option value="Auditorium">Auditorium</option>
            </select>
          </div>

          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="roomStatus">Operational Status</label>
            <select
              id="roomStatus"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as any })}
            >
              <option value="Available">Available for Scheduling</option>
              <option value="Reserved">Reserved / Restricted</option>
              <option value="Maintenance">Under Maintenance</option>
            </select>
          </div>
        </div>

        <div className="table-actions" style={{ marginTop: 20 }}>
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
                  await api.put(`/rooms/${encodeURIComponent(editingRoom.number)}`, payload);
                  toast.push("Room updated successfully", "success");
                } else {
                  await api.post("/rooms", payload);
                  toast.push("Room created successfully", "success");
                }
                fetchRooms();
                setIsOpen(false);
                setEditingRoom(null);
              } catch (err: any) {
                toast.push(err?.response?.data?.error || "Failed to save room", "error");
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Saving…" : "Save Room"}
          </button>
        </div>
      </Modal>

      {/* Delete Room Confirmation Modal (Heuristic 3 & 5) */}
      <ConfirmModal
        isOpen={Boolean(roomToDelete)}
        title="Remove Campus Facility"
        variant="danger"
        confirmLabel="Delete Room"
        loading={loading}
        onCancel={() => setRoomToDelete(null)}
        onConfirm={executeDelete}
        message={
          <span>
            Are you sure you want to remove room <strong>{roomToDelete?.number}</strong> ({roomToDelete?.building}) from active campus inventory?
            <br />
            <br />
            <span style={{ fontSize: "0.82rem", color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} /> Ensure no classes or examination schedules are actively occupying this venue.
            </span>
          </span>
        }
      />
    </motion.div>
  );
}
