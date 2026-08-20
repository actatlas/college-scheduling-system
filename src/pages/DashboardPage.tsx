import {
  CalendarClock,
  Users,
  BookOpen,
  DoorOpen,
  CalendarRange,
  RefreshCcw,
  BadgeCheck,
  CheckSquare,
  Square,
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { StatCard } from "../components/common/StatCard";
import { api } from "../data/apiClient";
import { storage } from "../data/storage";
import { useEffect, useState } from "react";
import { useToast } from "../components/common/Toast";
import { useNavigate } from "react-router-dom";
import { useProgramContext } from "../contexts/ProgramContext";
import type { UserRole, ClassScheduleItem } from "../types";

const AVAILABILITY_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const AVAILABILITY_SLOTS = [
  "08:00-09:00",
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "01:00-02:00",
  "02:00-03:00",
  "03:00-04:00",
  "04:00-05:00",
];

export function DashboardPage() {
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { selectedProgram } = useProgramContext();

  const role = (
    window.localStorage.getItem("userRole") || "admin"
  ).toLowerCase() as UserRole;
  const userName = window.localStorage.getItem("userName") || "User";

  const [teacherStatus, setTeacherStatus] = useState<string>("Full-Time");
  const [schedules, setSchedules] = useState<ClassScheduleItem[]>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string[]>>({});

  const [metrics, setMetrics] = useState({
    faculty: "0",
    subjects: "0",
    sections: "0",
    rooms: "0",
    schedules: "0",
    conflicts: "0",
    users: "0",
    exams: "0",
  });

  const loadDashboardData = () => {
    const facs = storage.getFaculty();
    const subs = storage.getSubjects();
    const rms = storage.getRooms();
    const secs = storage.getSections();
    const scheds = storage.getClassSchedules();
    const confs = storage.getConflicts();
    const usrs = storage.getUsers();
    const exms = storage.getExamSchedules();

    setMetrics({
      faculty: String(facs.length),
      subjects: String(subs.length),
      sections: String(secs.length),
      rooms: String(rms.length),
      schedules: String(scheds.length),
      conflicts: String(confs.length),
      users: String(usrs.length),
      exams: String(exms.length),
    });

    if (role === "teacher") {
      const teacherId = window.localStorage.getItem("teacherId");
      const currentTeacher = facs.find(
        (f) => String(f.id) === String(teacherId) || f.name.toLowerCase().includes(userName.toLowerCase())
      );
      if (currentTeacher) {
        setTeacherStatus(currentTeacher.status || "Full-Time");
        setAvailabilityMessage(currentTeacher.availability || "");
      }
      const myScheds = scheds.filter(
        (s) => (teacherId && s.facultyId === teacherId) || s.faculty.toLowerCase().includes(userName.toLowerCase())
      );
      setSchedules(myScheds);
    } else if (role === "program_head") {
      const progScheds = scheds.filter(
        (s) => !s.program || s.program === selectedProgram.key || s.program === selectedProgram.shortLabel
      );
      setSchedules(progScheds.slice(0, 6));
    } else {
      setSchedules(scheds.slice(0, 6));
    }
  };

  useEffect(() => {
    loadDashboardData();
    const handleUpdate = () => loadDashboardData();
    window.addEventListener("scheduling_storage_update", handleUpdate);
    return () => window.removeEventListener("scheduling_storage_update", handleUpdate);
  }, [role, selectedProgram.key, userName]);

  // Parse availability message into slot map
  useEffect(() => {
    if (!availabilityMessage) return;
    const parsed = availabilityMessage
      .split("|")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [day, ...slots] = entry.split(":");
        return {
          day: day.trim(),
          slots: slots
            .join(":")
            .split(",")
            .map((slot) => slot.trim())
            .filter(Boolean),
        };
      });
    const slotsMap: Record<string, string[]> = {};
    for (const entry of parsed) {
      slotsMap[entry.day] = entry.slots;
    }
    setSelectedSlots(slotsMap);
  }, [availabilityMessage]);

  const handleCheckboxChange = (day: string, slot: string, checked: boolean) => {
    if (role === "teacher" && teacherStatus === "Full-Time") return; // Full-time follows standard hours

    setSelectedSlots((prev) => {
      const daySlots = prev[day] || [];
      const nextSlots = checked
        ? [...daySlots, slot]
        : daySlots.filter((s) => s !== slot);
      return {
        ...prev,
        [day]: nextSlots,
      };
    });
  };

  const handleSaveAvailability = async () => {
    if (role === "teacher" && teacherStatus === "Full-Time") return;

    setIsSavingAvailability(true);
    const nextValue = Object.entries(selectedSlots)
      .filter(([_, slots]) => slots.length > 0)
      .map(([day, slots]) => `${day}: ${slots.join(", ")}`)
      .join(" | ");

    const teacherId = window.localStorage.getItem("teacherId");
    if (teacherId) {
      try {
        await api.put(`/faculty/${encodeURIComponent(teacherId)}`, {
          availability: nextValue || "Monday: 08:00-12:00",
        });
        setAvailabilityMessage(nextValue);
        toast.push("Part-time availability saved successfully", "success");
      } catch (error: any) {
        toast.push(error?.response?.data?.error || "Failed to update availability", "error");
      }
    } else {
      window.localStorage.setItem("teacherAvailability", nextValue);
      setAvailabilityMessage(nextValue);
      toast.push("Availability updated locally", "success");
    }
    setIsSavingAvailability(false);
  };

  const isChecked = (day: string, slot: string) => {
    if (
      role === "teacher" &&
      teacherStatus === "Full-Time" &&
      !availabilityMessage
    ) {
      return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(day);
    }
    return (selectedSlots[day] || []).includes(slot);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* -------------------- SUPER ADMIN (ICT OFFICE) VIEW -------------------- */}
      {role === "super_admin" && (
        <>
          <PageHeader
            title="ICT Office Administration Console"
            description="St. Rita's College of Balingasag · User Account Management & Access Governance."
          />

          <section className="hero-card">
            <div className="hero-card__grid">
              <div>
                <p className="eyebrow">ICT Management Console</p>
                <h2>User Account Management Hub</h2>
                <p className="muted" style={{ marginTop: 8 }}>
                  Create, update, delete, and maintain user accounts for the institutional scheduling platform.
                </p>
                <div className="hero-actions" style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="action-button action-button--royal"
                    onClick={() => navigate("/users")}
                  >
                    <Users size={16} /> Manage User Accounts
                  </button>
                </div>
              </div>
              <ul className="hero-status-list">
                <li>
                  <span>Registered Users</span>
                  <strong>{metrics.users} Accounts</strong>
                </li>
                <li>
                  <span>Account Operations</span>
                  <strong>Create · Update · Delete</strong>
                </li>
                <li>
                  <span>Role Types</span>
                  <strong>Super Admin, Admin, Head, Teacher</strong>
                </li>
                <li>
                  <span>Access Governance</span>
                  <strong>Role-Based Permissions</strong>
                </li>
              </ul>
            </div>
          </section>

          <section className="stats-grid">
            <StatCard
              label="User Accounts"
              value={metrics.users}
              detail="Super Admins, Admins, Heads, Teachers"
              icon="👥"
              tone="royal"
              onClick={() => navigate("/users")}
            />
          </section>
        </>
      )}

      {/* -------------------- ADMIN VIEW -------------------- */}
      {role === "admin" && (
        <>
          <PageHeader
            title="College Registrar Scheduling Dashboard"
            description="Institutional academic planning for St. Rita's College of Balingasag."
          />

          <section className="hero-card">
            <div className="hero-card__grid">
              <div>
                <p className="eyebrow">Welcome College Administrator</p>
                <h2>Coordinate the academic calendar and campus resources with confidence.</h2>
                <div className="hero-actions" style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="action-button action-button--royal"
                    onClick={() => navigate("/schedules")}
                  >
                    <Plus size={16} /> Schedule Class
                  </button>
                  <button
                    type="button"
                    className="action-button action-button--navy"
                    onClick={() => navigate("/exams")}
                  >
                    <CalendarClock size={16} /> Schedule Exam
                  </button>
                  <button
                    type="button"
                    className="action-button action-button--gold"
                    onClick={() => navigate("/faculty")}
                  >
                    <Users size={16} /> Faculty Load
                  </button>
                  <button
                    type="button"
                    className="action-button action-button--slate"
                    onClick={() => navigate("/rooms")}
                  >
                    <DoorOpen size={16} /> Rooms & Facilities
                  </button>
                </div>
                <div style={{ marginTop: 20 }}>
                  <p className="eyebrow" style={{ fontSize: "0.7rem", color: "#64748b" }}>Admin Capabilities</p>
                  <ul style={{ paddingLeft: 20, fontSize: "0.85rem", color: "#475569", lineHeight: "1.6" }}>
                    <li>Manage programs, courses, and subjects.</li>
                    <li>Manage faculty information.</li>
                    <li>Manage buildings and rooms.</li>
                    <li>Manage faculty availability.</li>
                    <li>View part-time faculty availability when creating schedules.</li>
                    <li>Create and manage class schedules manually.</li>
                    <li>Create and manage examination schedules manually.</li>
                    <li>View and update scheduling information.</li>
                  </ul>
                </div>
              </div>
              <ul className="hero-status-list">
                <li>
                  <span>Current Semester</span>
                  <strong>1st Semester</strong>
                </li>
                <li>
                  <span>School Year</span>
                  <strong>2026-2027</strong>
                </li>
                <li>
                  <span>Active Modalities</span>
                  <strong>F2F & Online</strong>
                </li>
                <li>
                  <span>Buildings</span>
                  <strong>College, SHS, JHS</strong>
                </li>
              </ul>
            </div>
          </section>

          <section className="stats-grid">
            <StatCard
              label="Total Faculty"
              value={metrics.faculty}
              detail="Full-Time & Part-Time roster"
              icon="👩‍🏫"
              tone="royal"
              onClick={() => navigate("/faculty")}
            />
            <StatCard
              label="Total Subjects"
              value={metrics.subjects}
              detail="Major & Gen Ed courses"
              icon="📘"
              tone="gold"
              onClick={() => navigate("/subjects")}
            />
            <StatCard
              label="Total Sections"
              value={metrics.sections}
              detail="Active student cohorts"
              icon="🏫"
              tone="navy"
              onClick={() => navigate("/sections")}
            />
            <StatCard
              label="Campus Rooms"
              value={metrics.rooms}
              detail="Across 3 campus buildings"
              icon="🪑"
              tone="slate"
              onClick={() => navigate("/rooms")}
            />
            <StatCard
              label="Class Schedules"
              value={metrics.schedules}
              detail="Active class timetable slots"
              icon="🗓️"
              tone="emerald"
              onClick={() => navigate("/schedules")}
            />
            <StatCard
              label="Schedule Conflicts"
              value={metrics.conflicts}
              detail={metrics.conflicts === "0" ? "No collisions detected" : "Review collisions"}
              icon="⚠️"
              tone="amber"
              onClick={() => navigate("/conflicts")}
            />
          </section>
        </>
      )}

      {/* -------------------- PROGRAM HEAD VIEW -------------------- */}
      {role === "program_head" && (
        <>
          <PageHeader
            title={`${selectedProgram.label} · Program Head Portal`}
            description={`Manage major subjects, sections, faculty availability, and schedules for ${selectedProgram.label}.`}
          />

          <section className="hero-card">
            <div className="hero-card__grid">
              <div>
                <p className="eyebrow">Academic Leadership</p>
                <h2>Welcome, {userName}. Coordinate {selectedProgram.shortLabel} Curriculum.</h2>
                <p className="muted" style={{ marginTop: 8 }}>
                  Schedule major subjects, monitor room and faculty allocations across College, SHS, and JHS facilities, and preview synchronized examination dates.
                </p>
                <div className="hero-actions" style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="action-button action-button--royal"
                    onClick={() => navigate("/schedules")}
                  >
                    <Plus size={16} /> Schedule Major Subject
                  </button>
                  <button
                    type="button"
                    className="action-button action-button--navy"
                    onClick={() => navigate("/subjects")}
                  >
                    <BookOpen size={16} /> Program Subjects
                  </button>
                  <button
                    type="button"
                    className="action-button action-button--slate"
                    onClick={() => navigate("/faculty")}
                  >
                    <Users size={16} /> Program Faculty Availability
                  </button>
                </div>
                <div style={{ marginTop: 20 }}>
                  <p className="eyebrow" style={{ fontSize: "0.7rem", color: "#64748b" }}>Program Head Capabilities</p>
                  <ul style={{ paddingLeft: 20, fontSize: "0.85rem", color: "#475569", lineHeight: "1.6" }}>
                    <li>View and manage scheduling information for their assigned program.</li>
                    <li>Schedule major subjects for their assigned program.</li>
                    <li>View faculty availability within their program.</li>
                    <li>View assigned subjects and class schedules.</li>
                    <li>Monitor room and faculty assignments.</li>
                    <li>View manually created class and examination schedules.</li>
                  </ul>
                </div>
              </div>
              <ul className="hero-status-list">
                <li>
                  <span>Assigned Program</span>
                  <strong>{selectedProgram.shortLabel}</strong>
                </li>
                <li>
                  <span>Program Major Subjects</span>
                  <strong>{storage.getSubjects().filter((s) => s.program === selectedProgram.key && s.isMajor).length} Subjects</strong>
                </li>
                <li>
                  <span>Role Scope</span>
                  <strong>Major Subjects & Faculty</strong>
                </li>
              </ul>
            </div>
          </section>

          <section className="stats-grid">
            <StatCard
              label="Program Faculty"
              value={String(storage.getFaculty().filter((f) => !f.programs || f.programs.includes(selectedProgram.key)).length)}
              detail={`Instructors teaching in ${selectedProgram.shortLabel}`}
              icon="👩‍🏫"
              tone="royal"
              onClick={() => navigate("/faculty")}
            />
            <StatCard
              label="Major Subjects"
              value={String(storage.getSubjects().filter((s) => s.program === selectedProgram.key && s.isMajor).length)}
              detail="Curriculum major courses"
              icon="📘"
              tone="gold"
              onClick={() => navigate("/subjects")}
            />
            <StatCard
              label="Active Schedules"
              value={String(schedules.length)}
              detail="Program class blocks"
              icon="🗓️"
              tone="emerald"
              onClick={() => navigate("/schedules")}
            />
          </section>
        </>
      )}

      {/* -------------------- TEACHER VIEW -------------------- */}
      {role === "teacher" && (
        <>
          <PageHeader
            title="Teacher Portal & Schedule Overview"
            description="Manage your availability preferences, review assigned subjects, rooms, and weekly classes."
          />

          <section className="hero-card">
            <div>
              <p className="eyebrow">Faculty Workspace</p>
              <h2>Welcome, {userName}!</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Review your assigned face-to-face and online class timetable, verify campus venues, and update your teaching availability preferences below.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <span className={`pill ${teacherStatus === "Full-Time" ? "pill--royal" : "pill--navy"}`}>
                  Faculty Status: <strong>{teacherStatus}</strong>
                </span>
                <span className="pill pill--slate">
                  Assigned Classes: <strong>{schedules.length} Sessions</strong>
                </span>
              </div>
            </div>
          </section>

          {/* Interactive Part-Time Availability Grid */}
          <section className="grid-2">
            <article className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="card__header">
                <div>
                  <p className="eyebrow">Teaching Availability</p>
                  <h3>
                    {teacherStatus === "Full-Time"
                      ? "Standard Working Hours (Full-Time)"
                      : "Part-Time Teaching Days & Timeslots"}
                  </h3>
                  <p className="muted">
                    {teacherStatus === "Full-Time"
                      ? "Full-time faculty follow standard Mon-Fri 08:00 - 17:00 teaching schedules unless adjusted by the Registrar."
                      : "Part-Time teachers can select their available days and timeslots below and save preferences for schedule planning."}
                  </p>
                </div>
                <CalendarClock size={20} color="#0d5499" />
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="table-wrap">
                  <table className="data-table" style={{ textAlign: "center" }}>
                    <thead>
                      <tr>
                        <th>Time Slot</th>
                        {AVAILABILITY_DAYS.map((d) => (
                          <th key={d}>{d.slice(0, 3)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {AVAILABILITY_SLOTS.map((slot) => (
                        <tr key={slot}>
                          <td style={{ fontWeight: 600, fontSize: "0.85rem" }}>{slot}</td>
                          {AVAILABILITY_DAYS.map((day) => {
                            const checked = isChecked(day, slot);
                            const disabled = teacherStatus === "Full-Time";
                            return (
                              <td key={`${day}-${slot}`}>
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => handleCheckboxChange(day, slot, !checked)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: disabled ? "default" : "pointer",
                                    color: checked ? "#0284c7" : "#cbd5e1",
                                    padding: 4,
                                  }}
                                >
                                  {checked ? <CheckSquare size={20} /> : <Square size={20} />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {teacherStatus !== "Full-Time" && (
                  <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="action-button action-button--emerald"
                      disabled={isSavingAvailability}
                      onClick={handleSaveAvailability}
                    >
                      <BadgeCheck size={16} />
                      {isSavingAvailability ? "Saving…" : "Save My Teaching Availability"}
                    </button>
                  </div>
                )}
              </div>
            </article>
          </section>
        </>
      )}

      {/* -------------------- SHARED TIMETABLE PREVIEW (ALL ROLES EXCEPT SUPER ADMIN) -------------------- */}
      {role !== "super_admin" && (
      <section className="grid-2" style={{ marginTop: 24 }}>
        <article className="card">
          <div className="card__header">
            <div>
              <p className="eyebrow">Class Timetable</p>
              <h3>
                {role === "teacher" ? "My Assigned Classes" : "Active Class Sessions"}
              </h3>
            </div>
            <CalendarRange size={18} />
          </div>
          <div className="schedule-list">
            {schedules.length === 0 ? (
              <div className="empty-state">No scheduled classes found.</div>
            ) : (
              schedules.slice(0, 6).map((slot) => (
                <div className="schedule-item" key={slot.id}>
                  <div
                    className="schedule-item__dot"
                    style={{ backgroundColor: slot.color || "#0284c7" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p className="schedule-item__title">{slot.subject}</p>
                      <span
                        className={`pill ${slot.modality === "Online" ? "pill--emerald" : "pill--navy"}`}
                        style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                      >
                        {slot.modality}
                      </span>
                    </div>
                    <p className="schedule-item__meta">
                      {slot.day} • {slot.time} • <strong>{slot.room}</strong> ({slot.building})
                    </p>
                    {slot.modality === "Online" && slot.onlineLink && (
                      <a
                        href={slot.onlineLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "0.75rem", color: "#059669", textDecoration: "underline" }}
                      >
                        Join Virtual Meeting
                      </a>
                    )}
                  </div>
                  <span className="pill">{slot.section}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card">
          <div className="card__header">
            <div>
              <p className="eyebrow">Institution Status</p>
              <h3>Campus & Academic Summary</h3>
            </div>
            <RefreshCcw size={18} />
          </div>
          <div className="schedule-list">
            {[
              {
                label: "Campus Buildings",
                value: "College · SHS · JHS",
                detail: "Multi-building room allocation enabled",
              },
              {
                label: "Teaching Modalities",
                value: "Face-to-Face & Online",
                detail: "Hybrid classroom & virtual link support",
              },
              {
                label: "Examination Scheduling",
                value: "Synchronized",
                detail: "Subject-aligned cohort exam blocks",
              },
              {
                label: "Part-Time Availability",
                value: "Enforced",
                detail: "Real-time clash and preference validation",
              },
            ].map((item) => (
              <div className="schedule-item" key={item.label}>
                <div>
                  <p className="schedule-item__title">{item.label}</p>
                  <p className="schedule-item__meta">{item.detail}</p>
                </div>
                <span className="pill">{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
      )}
    </motion.div>
  );
}
