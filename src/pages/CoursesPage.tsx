import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import {
  BookOpen,
  CalendarDays,
  DoorOpen,
  Plus,
  Search,
  Trash2,
  Edit2,
} from "lucide-react";
import ConfirmModal from "../components/common/ConfirmModal";
import { useProgramContext, type ProgramKey } from "../contexts/ProgramContext";

export function CoursesPage() {
  const [subjects, setSubjects] = useState<Array<any>>([]);
  const [rooms, setRooms] = useState<Array<any>>([]);
  const [schedules, setSchedules] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const anyLoading =
    loadingInitial || loadingSubjects || loadingRooms || loadingSchedules;
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", year: "" });
  const [addModalType, setAddModalType] = useState<
    null | "subject" | "room" | "schedule"
  >(null);
  const [subjectForm, setSubjectForm] = useState({
    code: "",
    name: "",
    instructor: "",
  });
  const [roomForm, setRoomForm] = useState({
    name: "",
    building: "",
    capacity: "",
  });
  const [scheduleForm, setScheduleForm] = useState({
    day: "",
    time: "",
    subject: "",
    room: "",
  });
  const toast = useToast();
  const {
    selectedProgramKey,
    setSelectedProgramKey,
    selectedProgram,
    programOptions,
  } = useProgramContext();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState<string | undefined>(
    undefined,
  );
  const [confirmAction, setConfirmAction] = useState<null | (() => void)>(null);

  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<number | null>(null);

  const [subjectEdits, setSubjectEdits] = useState<Record<string, any>>({});
  const [roomEdits, setRoomEdits] = useState<Record<string, any>>({});
  const [scheduleEdits, setScheduleEdits] = useState<Record<string, any>>({});

  useEffect(() => {
    setLoadingInitial(true);
    Promise.all([
      api.get("/subjects"),
      api.get("/rooms"),
      api.get("/schedules"),
    ])
      .then(([subRes, roomRes, schedRes]: any[]) => {
        setSubjects(subRes.data?.data || []);
        setRooms(roomRes.data?.data || []);
        setSchedules(schedRes.data?.data || []);
      })
      .catch(() => {
        setSubjects([]);
        setRooms([]);
        setSchedules([]);
      })
      .finally(() => setLoadingInitial(false));
  }, []);

  // course list is not shown in the redesigned workspace; keep `courses` state for API sync

  const visibleSubjects = useMemo(() => {
    const source = subjects.length > 0 ? subjects : [];

    if (!selectedProgramKey || selectedProgram.shortLabel === "N/A") {
      return source;
    }

    return source.filter((subject) => {
      const haystack = [
        subject.code,
        subject.name,
        subject.department,
        subject.program,
        subject.instructor,
      ]
        .join(" ")
        .toLowerCase();
      return (
        haystack.includes(selectedProgramKey.toLowerCase()) ||
        haystack.includes(selectedProgram.shortLabel.toLowerCase())
      );
    });
  }, [
    selectedProgramKey,
    selectedProgram.shortLabel,
    selectedProgram,
    subjects,
  ]);

  const visibleRooms = useMemo(() => {
    const source = rooms.length > 0 ? rooms : [];

    if (!selectedProgramKey || selectedProgram.shortLabel === "N/A") {
      return source;
    }

    return source.filter((room) => {
      const haystack = [
        room.number,
        room.name,
        room.building,
        room.type,
        room.program,
      ]
        .join(" ")
        .toLowerCase();
      return (
        haystack.includes(selectedProgramKey.toLowerCase()) ||
        haystack.includes(selectedProgram.shortLabel.toLowerCase())
      );
    });
  }, [selectedProgramKey, selectedProgram.shortLabel, rooms, selectedProgram]);

  const visibleSchedules = useMemo(() => {
    const source = schedules.length > 0 ? schedules : [];

    if (!selectedProgramKey || selectedProgram.shortLabel === "N/A") {
      return source;
    }

    return source.filter((schedule) => {
      const haystack = [
        schedule.subject,
        schedule.day,
        schedule.time,
        schedule.room,
        schedule.program,
      ]
        .join(" ")
        .toLowerCase();
      return (
        haystack.includes(selectedProgramKey.toLowerCase()) ||
        haystack.includes(selectedProgram.shortLabel.toLowerCase())
      );
    });
  }, [selectedProgramKey, selectedProgram.shortLabel, schedules]);

  const handleAddSubject = async () => {
    if (!subjectForm.code || !subjectForm.name) {
      toast.push("Subject code and name are required", "error");
      return;
    }
    setLoadingSubjects(true);
    try {
      const payload = {
        code: subjectForm.code,
        name: subjectForm.name,
        units: 0,
        lectureHours: 0,
        labHours: 0,
        semester: "",
        department: selectedProgramKey,
        instructorId: null,
      };
      const res = await api.post("/subjects", payload);
      const created = res.data?.data;
      setSubjects((s) => [
        ...s,
        { code: created.code, name: created.name, instructor: "" },
      ]);
      toast.push("Subject added", "success");
      setAddModalType(null);
      setSubjectForm({ code: "", name: "", instructor: "" });
    } catch (err: any) {
      toast.push(
        err?.response?.data?.error || "Failed to add subject",
        "error",
      );
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleRemoveSubject = async (code: string) => {
    setConfirmTitle("Remove subject");
    setConfirmMessage(`Remove subject ${code}?`);
    const deleted = subjects.find((s) => s.code === code);
    setConfirmAction(() => async () => {
      setLoadingSubjects(true);
      try {
        await api.delete(`/subjects/${encodeURIComponent(code)}`);
        setSubjects((s) => s.filter((it) => it.code !== code));
        toast.push("Subject removed", "success", "Undo", async () => {
          try {
            if (!deleted) return;
            await api.post("/subjects", {
              code: deleted.code,
              name: deleted.name,
              department: selectedProgramKey,
            });
            setSubjects((s) => [...s, deleted]);
            toast.push("Undo successful", "success");
          } catch (e) {
            toast.push("Undo failed", "error");
          }
        });
      } catch (err: any) {
        toast.push(
          err?.response?.data?.error || "Failed to remove subject",
          "error",
        );
      } finally {
        setLoadingSubjects(false);
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };

  const handleAddRoom = async () => {
    if (!roomForm.name) {
      toast.push("Room name is required", "error");
      return;
    }
    setLoadingRooms(true);
    try {
      const payload = {
        number: roomForm.name,
        capacity: Number(roomForm.capacity) || 0,
        building: roomForm.building || "",
        type: "",
        status: "active",
      };
      const res = await api.post("/rooms", payload);
      const created = res.data?.data;
      setRooms((r) => [
        ...r,
        {
          name: created.number,
          building: created.building,
          capacity: created.capacity,
        },
      ]);
      toast.push("Room added", "success");
      setAddModalType(null);
      setRoomForm({ name: "", building: "", capacity: "" });
    } catch (err: any) {
      toast.push(err?.response?.data?.error || "Failed to add room", "error");
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleRemoveRoom = async (name: string) => {
    setConfirmTitle("Remove room");
    setConfirmMessage(`Remove room ${name}?`);
    const deleted = rooms.find((r) => r.name === name);
    setConfirmAction(() => async () => {
      setLoadingRooms(true);
      try {
        await api.delete(`/rooms/${encodeURIComponent(name)}`);
        setRooms((r) => r.filter((it) => it.name !== name));
        toast.push("Room removed", "success", "Undo", async () => {
          try {
            if (!deleted) return;
            await api.post("/rooms", {
              number: deleted.name,
              building: deleted.building,
              capacity: deleted.capacity,
            });
            setRooms((r) => [...r, deleted]);
            toast.push("Undo successful", "success");
          } catch (e) {
            toast.push("Undo failed", "error");
          }
        });
      } catch (err: any) {
        toast.push(
          err?.response?.data?.error || "Failed to remove room",
          "error",
        );
      } finally {
        setLoadingRooms(false);
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };

  const handleAddSchedule = async () => {
    if (!scheduleForm.day || !scheduleForm.time || !scheduleForm.subject) {
      toast.push("Day, time and subject are required", "error");
      return;
    }
    setLoadingSchedules(true);
    try {
      const payload = {
        day: scheduleForm.day,
        start_time: scheduleForm.time,
        end_time: null,
        subject_code: scheduleForm.subject,
        room_number: scheduleForm.room || null,
      };
      const res = await api.post("/schedules", payload);
      const created = res.data?.data;
      setSchedules((s) => [
        ...s,
        {
          id: created.id,
          day: created.day,
          time: created.time,
          subject: created.subject,
          room: created.room,
          color: created.color,
        },
      ]);
      toast.push("Schedule added", "success");
      setAddModalType(null);
      setScheduleForm({ day: "", time: "", subject: "", room: "" });
    } catch (err: any) {
      toast.push(
        err?.response?.data?.error || "Failed to add schedule",
        "error",
      );
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleRemoveSchedule = async (key: any) => {
    setConfirmTitle("Remove schedule");
    setConfirmMessage("Remove this schedule?");
    const deleted = key;
    setConfirmAction(() => async () => {
      setLoadingSchedules(true);
      try {
        if (key.id) {
          await api.delete(`/schedules/${encodeURIComponent(key.id)}`);
        }
        setSchedules((s) =>
          s.filter(
            (it) =>
              !(
                it.day === key.day &&
                it.time === key.time &&
                it.room === key.room
              ),
          ),
        );
        toast.push("Schedule removed", "success", "Undo", async () => {
          try {
            if (!deleted) return;
            await api.post("/schedules", {
              day: deleted.day,
              start_time: deleted.time,
              subject_code: deleted.subject,
              room_number: deleted.room,
            });
            setSchedules((s) => [...s, deleted]);
            toast.push("Undo successful", "success");
          } catch (e) {
            toast.push("Undo failed", "error");
          }
        });
      } catch (err: any) {
        toast.push(
          err?.response?.data?.error || "Failed to remove schedule",
          "error",
        );
      } finally {
        setLoadingSchedules(false);
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };

  // inline update handlers
  const handleEditSubject = (code: string) => {
    setEditingSubject(code);
    const item = subjects.find((s) => s.code === code) || {};
    setSubjectEdits((e) => ({
      ...e,
      [code]: { name: item.name || "", instructor: item.instructor || "" },
    }));
  };

  const handleSaveSubject = async (code: string) => {
    const edits = subjectEdits[code];
    if (!edits) return setEditingSubject(null);
    setLoadingSubjects(true);
    try {
      await api.put(`/subjects/${encodeURIComponent(code)}`, {
        name: edits.name,
        instructorId: null,
        department: selectedProgramKey,
      });
      setSubjects((s) =>
        s.map((it) =>
          it.code === code
            ? { ...it, name: edits.name, instructor: edits.instructor }
            : it,
        ),
      );
      toast.push("Subject updated", "success");
    } catch (err: any) {
      toast.push(
        err?.response?.data?.error || "Failed to update subject",
        "error",
      );
    } finally {
      setLoadingSubjects(false);
      setEditingSubject(null);
    }
  };

  const handleEditRoom = (name: string) => {
    setEditingRoom(name);
    const item = rooms.find((r) => r.name === name) || {};
    setRoomEdits((e) => ({
      ...e,
      [name]: { building: item.building || "", capacity: item.capacity || 0 },
    }));
  };

  const handleSaveRoom = async (name: string) => {
    const edits = roomEdits[name];
    if (!edits) return setEditingRoom(null);
    setLoadingRooms(true);
    try {
      await api.put(`/rooms/${encodeURIComponent(name)}`, {
        building: edits.building,
        capacity: Number(edits.capacity) || 0,
        type: "",
        status: "active",
      });
      setRooms((r) =>
        r.map((it) =>
          it.name === name
            ? { ...it, building: edits.building, capacity: edits.capacity }
            : it,
        ),
      );
      toast.push("Room updated", "success");
    } catch (err: any) {
      toast.push(
        err?.response?.data?.error || "Failed to update room",
        "error",
      );
    } finally {
      setLoadingRooms(false);
      setEditingRoom(null);
    }
  };

  const handleEditSchedule = (id: number) => {
    setEditingSchedule(id);
    const item = schedules.find((s) => s.id === id) || {};
    setScheduleEdits((e) => ({
      ...e,
      [id]: {
        day: item.day || "",
        time: item.time || "",
        subject: item.subject || "",
        room: item.room || "",
      },
    }));
  };

  const handleSaveSchedule = async (id: number) => {
    const edits = scheduleEdits[id];
    if (!edits) return setEditingSchedule(null);
    setLoadingSchedules(true);
    try {
      await api.put(`/schedules/${encodeURIComponent(id)}`, {
        day: edits.day,
        start_time: edits.time,
        end_time: null,
        subject_code: edits.subject,
        room_number: edits.room,
      });
      setSchedules((s) =>
        s.map((it) =>
          it.id === id
            ? {
                ...it,
                day: edits.day,
                time: edits.time,
                subject: edits.subject,
                room: edits.room,
              }
            : it,
        ),
      );
      toast.push("Schedule updated", "success");
    } catch (err: any) {
      toast.push(
        err?.response?.data?.error || "Failed to update schedule",
        "error",
      );
    } finally {
      setLoadingSchedules(false);
      setEditingSchedule(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Programs / Courses"
        description="Choose a program or course to view its subjects, rooms, and schedules."
        actions={
          <button
            className="action-button"
            type="button"
            disabled={anyLoading}
            onClick={() => setIsOpen(true)}
          >
            <Plus size={16} />
            Add Course
          </button>
        }
      />

      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">Academic workspace</p>
            <h3>Select a course</h3>
          </div>
          <label className="topbar__search" aria-label="Search courses">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search course"
            />
          </label>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="courseSelect">Choose course</label>
            <select
              id="courseSelect"
              value={selectedProgramKey}
              onChange={(event) =>
                setSelectedProgramKey(event.target.value as ProgramKey)
              }
            >
              {programOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="courseFocus">Course focus</label>
            <input id="courseFocus" value={selectedProgram.label} readOnly />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">Course workspace</p>
            <h3>{selectedProgram.label}</h3>
            <p className="muted">
              Manage subjects, rooms and schedules for the selected program.
            </p>
          </div>
        </div>

        <div className="grid-3">
          <article className="card">
            <div className="card__header">
              <div>
                <p className="eyebrow">Subjects</p>
                <h3>Course subjects</h3>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="icon-button"
                  title="Add subject"
                  disabled={loadingSubjects || loadingInitial}
                  onClick={() => setAddModalType("subject")}
                >
                  <Plus size={16} />
                </button>
                <BookOpen size={18} />
              </div>
            </div>
            <div className="schedule-list">
              {visibleSubjects.length === 0 ? (
                <div className="empty-state">
                  No subjects available for this program yet.
                </div>
              ) : (
                visibleSubjects.map((subject) => (
                  <div className="schedule-item" key={subject.code}>
                    <div>
                      {editingSubject === subject.code ? (
                        <>
                          <input
                            value={subjectEdits[subject.code]?.name || ""}
                            onChange={(e) =>
                              setSubjectEdits((p) => ({
                                ...p,
                                [subject.code]: {
                                  ...(p[subject.code] || {}),
                                  name: e.target.value,
                                },
                              }))
                            }
                          />
                          <input
                            value={subjectEdits[subject.code]?.instructor || ""}
                            onChange={(e) =>
                              setSubjectEdits((p) => ({
                                ...p,
                                [subject.code]: {
                                  ...(p[subject.code] || {}),
                                  instructor: e.target.value,
                                },
                              }))
                            }
                          />
                        </>
                      ) : (
                        <>
                          <p className="schedule-item__title">{subject.name}</p>
                          <p className="schedule-item__meta">
                            {subject.code} • {subject.instructor}
                          </p>
                        </>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <span className="pill">{subject.code}</span>
                      {editingSubject === subject.code ? (
                        <>
                          <button
                            className="secondary-button"
                            disabled={loadingSubjects || loadingInitial}
                            onClick={() => setEditingSubject(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className="action-button"
                            disabled={loadingSubjects || loadingInitial}
                            onClick={() => handleSaveSubject(subject.code)}
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="icon-button"
                            disabled={loadingSubjects || loadingInitial}
                            onClick={() => handleEditSubject(subject.code)}
                            aria-label="Edit subject"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="icon-button"
                            disabled={loadingSubjects || loadingInitial}
                            onClick={() => handleRemoveSubject(subject.code)}
                            aria-label="Remove subject"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="card">
            <div className="card__header">
              <div>
                <p className="eyebrow">Rooms</p>
                <h3>Assigned rooms</h3>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="icon-button"
                  title="Add room"
                  disabled={loadingRooms || loadingInitial}
                  onClick={() => setAddModalType("room")}
                >
                  <Plus size={16} />
                </button>
                <DoorOpen size={18} />
              </div>
            </div>
            <div className="schedule-list">
              {visibleRooms.length === 0 ? (
                <div className="empty-state">
                  No rooms linked to this program yet.
                </div>
              ) : (
                visibleRooms.map((room) => (
                  <div className="schedule-item" key={room.name}>
                    <div>
                      {editingRoom === room.name ? (
                        <>
                          <input
                            value={roomEdits[room.name]?.building || ""}
                            onChange={(e) =>
                              setRoomEdits((p) => ({
                                ...p,
                                [room.name]: {
                                  ...(p[room.name] || {}),
                                  building: e.target.value,
                                },
                              }))
                            }
                          />
                          <input
                            value={roomEdits[room.name]?.capacity || ""}
                            onChange={(e) =>
                              setRoomEdits((p) => ({
                                ...p,
                                [room.name]: {
                                  ...(p[room.name] || {}),
                                  capacity: e.target.value,
                                },
                              }))
                            }
                          />
                        </>
                      ) : (
                        <>
                          <p className="schedule-item__title">{room.name}</p>
                          <p className="schedule-item__meta">
                            {room.building} • Capacity {room.capacity}
                          </p>
                        </>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <span className="pill">{room.capacity}</span>
                      {editingRoom === room.name ? (
                        <>
                          <button
                            className="secondary-button"
                            disabled={loadingRooms || loadingInitial}
                            onClick={() => setEditingRoom(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className="action-button"
                            disabled={loadingRooms || loadingInitial}
                            onClick={() => handleSaveRoom(room.name)}
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="icon-button"
                            disabled={loadingRooms || loadingInitial}
                            onClick={() => handleEditRoom(room.name)}
                            aria-label="Edit room"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="icon-button"
                            disabled={loadingRooms || loadingInitial}
                            onClick={() => handleRemoveRoom(room.name)}
                            aria-label="Remove room"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="card">
            <div className="card__header">
              <div>
                <p className="eyebrow">Schedules</p>
                <h3>Course timetable</h3>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="icon-button"
                  title="Add schedule"
                  onClick={() => setAddModalType("schedule")}
                  disabled={loadingSchedules || loadingInitial}
                >
                  <Plus size={16} />
                </button>
                <CalendarDays size={18} />
              </div>
            </div>
            <div className="schedule-list">
              {visibleSchedules.length === 0 ? (
                <div className="empty-state">
                  No schedules available for this program yet.
                </div>
              ) : (
                visibleSchedules.map((schedule) => (
                  <div
                    className="schedule-item"
                    key={
                      schedule.id ||
                      `${schedule.day}-${schedule.time}-${schedule.room}`
                    }
                  >
                    <div>
                      {editingSchedule === schedule.id ? (
                        <>
                          <input
                            value={scheduleEdits[schedule.id]?.day || ""}
                            onChange={(e) =>
                              setScheduleEdits((p) => ({
                                ...p,
                                [schedule.id]: {
                                  ...(p[schedule.id] || {}),
                                  day: e.target.value,
                                },
                              }))
                            }
                          />
                          <input
                            value={scheduleEdits[schedule.id]?.time || ""}
                            onChange={(e) =>
                              setScheduleEdits((p) => ({
                                ...p,
                                [schedule.id]: {
                                  ...(p[schedule.id] || {}),
                                  time: e.target.value,
                                },
                              }))
                            }
                          />
                          <input
                            value={scheduleEdits[schedule.id]?.subject || ""}
                            onChange={(e) =>
                              setScheduleEdits((p) => ({
                                ...p,
                                [schedule.id]: {
                                  ...(p[schedule.id] || {}),
                                  subject: e.target.value,
                                },
                              }))
                            }
                          />
                        </>
                      ) : (
                        <>
                          <p className="schedule-item__title">
                            {schedule.subject}
                          </p>
                          <p className="schedule-item__meta">
                            {schedule.day} • {schedule.time} • {schedule.room}
                          </p>
                        </>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <span className="pill">{schedule.room}</span>
                      {editingSchedule === schedule.id ? (
                        <>
                          <button
                            className="secondary-button"
                            onClick={() => setEditingSchedule(null)}
                            disabled={loadingSchedules || loadingInitial}
                          >
                            Cancel
                          </button>
                          <button
                            className="action-button"
                            onClick={() => handleSaveSchedule(schedule.id)}
                            disabled={loadingSchedules || loadingInitial}
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="icon-button"
                            onClick={() => handleEditSchedule(schedule.id)}
                            disabled={loadingSchedules || loadingInitial}
                            aria-label="Edit schedule"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="icon-button"
                            onClick={() => handleRemoveSchedule(schedule)}
                            disabled={loadingSchedules || loadingInitial}
                            aria-label="Remove schedule"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>

      <ConfirmModal
        isOpen={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={() => {
          if (confirmAction) confirmAction();
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <Modal
        isOpen={addModalType !== null}
        title={
          addModalType === "subject"
            ? "Add Subject"
            : addModalType === "room"
              ? "Add Room"
              : addModalType === "schedule"
                ? "Add Schedule"
                : ""
        }
        description={
          addModalType === "subject"
            ? "Register a new subject for the selected program."
            : addModalType === "room"
              ? "Assign a room to this program."
              : addModalType === "schedule"
                ? "Create a schedule entry for this program."
                : ""
        }
        onClose={() => setAddModalType(null)}
      >
        {addModalType === "subject" && (
          <div className="form-grid">
            <div className="field-group">
              <label>Subject Code</label>
              <input
                value={subjectForm.code}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, code: e.target.value })
                }
              />
            </div>
            <div className="field-group">
              <label>Subject Name</label>
              <input
                value={subjectForm.name}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, name: e.target.value })
                }
              />
            </div>
            <div className="field-group" style={{ gridColumn: "1 / -1" }}>
              <label>Instructor</label>
              <input
                value={subjectForm.instructor}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, instructor: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {addModalType === "room" && (
          <div className="form-grid">
            <div className="field-group">
              <label>Room Name / Number</label>
              <input
                value={roomForm.name}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, name: e.target.value })
                }
              />
            </div>
            <div className="field-group">
              <label>Building</label>
              <input
                value={roomForm.building}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, building: e.target.value })
                }
              />
            </div>
            <div className="field-group">
              <label>Capacity</label>
              <input
                value={roomForm.capacity}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, capacity: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {addModalType === "schedule" && (
          <div className="form-grid">
            <div className="field-group">
              <label>Day</label>
              <input
                value={scheduleForm.day}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, day: e.target.value })
                }
              />
            </div>
            <div className="field-group">
              <label>Time</label>
              <input
                value={scheduleForm.time}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, time: e.target.value })
                }
              />
            </div>
            <div className="field-group">
              <label>Subject</label>
              <input
                value={scheduleForm.subject}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, subject: e.target.value })
                }
              />
            </div>
            <div className="field-group">
              <label>Room</label>
              <input
                value={scheduleForm.room}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, room: e.target.value })
                }
              />
            </div>
          </div>
        )}

        <div className="table-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setAddModalType(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-button"
            onClick={() => {
              if (addModalType === "subject") return handleAddSubject();
              if (addModalType === "room") return handleAddRoom();
              if (addModalType === "schedule") return handleAddSchedule();
            }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : null}
            Save
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isOpen}
        title="Create course"
        description="Register a new course in the curriculum catalog."
        onClose={() => setIsOpen(false)}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="courseCode">Course Code</label>
            <input
              id="courseCode"
              value={form.code}
              onChange={(event) =>
                setForm({ ...form, code: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="courseName">Course Name</label>
            <input
              id="courseName"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="courseYears">Duration / Years</label>
            <input
              id="courseYears"
              value={form.year}
              onChange={(event) =>
                setForm({ ...form, year: event.target.value })
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
              if (!form.code || !form.name) {
                toast.push("Course code and name are required", "error");
                return;
              }
              setLoading(true);
              try {
                await api.post("/courses", form);
                toast.push("Course created", "success");
                setIsOpen(false);
                setForm({ code: "", name: "", year: "" });
              } catch (err: any) {
                toast.push(
                  err?.response?.data?.error || "Failed to create course",
                  "error",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Saving…" : "Save Course"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
