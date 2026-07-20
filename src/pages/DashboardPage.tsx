import {
  BarChart3,
  CalendarClock,
  Sparkles,
  Users,
  BookOpen,
  DoorOpen,
  CalendarRange,
  ClipboardList,
  RefreshCcw,
  BadgeCheck,
  CheckSquare,
  Square,
  Bookmark,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { StatCard } from "../components/common/StatCard";
import { api } from "../data/mockApi";
import { useEffect, useState } from "react";
import { useToast } from "../components/common/Toast";
import { Modal } from "../components/common/Modal";
import { useNavigate } from "react-router-dom";
import { useProgramContext } from "../contexts/ProgramContext";
import {
  generateScheduleSeed,
  parseTeacherAvailability,
  type UserRole,
} from "../utils/scheduling";

const workloadData = [
  { name: "Mon", load: 72 },
  { name: "Tue", load: 68 },
  { name: "Wed", load: 84 },
  { name: "Thu", load: 75 },
  { name: "Fri", load: 79 },
  { name: "Sat", load: 54 },
];

const roomData = [
  { name: "R-101", usage: 82 },
  { name: "LAB-02", usage: 74 },
  { name: "SCI-05", usage: 61 },
  { name: "R-202", usage: 90 },
];

const fallbackMetrics = [
  {
    label: "Total Faculty",
    value: "18",
    detail: "Sample registrar data",
    icon: "👩‍🏫",
    tone: "royal",
  },
  {
    label: "Total Subjects",
    value: "24",
    detail: "Sample registrar data",
    icon: "📘",
    tone: "gold",
  },
  {
    label: "Total Sections",
    value: "12",
    detail: "Sample registrar data",
    icon: "🏫",
    tone: "navy",
  },
  {
    label: "Total Rooms",
    value: "16",
    detail: "Sample registrar data",
    icon: "🪑",
    tone: "slate",
  },
  {
    label: "Total Schedules",
    value: "36",
    detail: "Sample registrar data",
    icon: "🗓️",
    tone: "emerald",
  },
  {
    label: "Schedule Conflicts",
    value: "2",
    detail: "Sample registrar data",
    icon: "⚠️",
    tone: "amber",
  },
];

const AVAILABILITY_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { selectedProgram } = useProgramContext();
  const role = (
    window.localStorage.getItem("userRole") || "admin"
  ).toLowerCase() as UserRole;

  const userName = window.localStorage.getItem("userName") || "User";
  const [teacherStatus, setTeacherStatus] = useState<string>("Full-Time");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string[]>>(
    {},
  );

  // Student Program / Section info
  const studentProgram =
    window.localStorage.getItem("studentProgram") || "BSCS";
  const studentYear =
    window.localStorage.getItem("studentYear") || "First Year";
  const studentSection = window.localStorage.getItem("studentSection") || "A";

  const [form, setForm] = useState({
    academicYear: "2026-2027",
    semester: "1st Semester",
    program: "ITP",
    yearLevel: "1",
    section: "A",
    options: "Balanced room allocation",
  });

  const [metrics, setMetrics] = useState([
    {
      label: "Total Faculty",
      value: "0",
      detail: "From database",
      icon: "👩‍🏫",
      tone: "royal",
    },
    {
      label: "Total Subjects",
      value: "0",
      detail: "From database",
      icon: "📘",
      tone: "gold",
    },
    {
      label: "Total Sections",
      value: "0",
      detail: "From database",
      icon: "🏫",
      tone: "navy",
    },
    {
      label: "Total Rooms",
      value: "0",
      detail: "From database",
      icon: "🪑",
      tone: "slate",
    },
    {
      label: "Total Schedules",
      value: "0",
      detail: "From database",
      icon: "🗓️",
      tone: "emerald",
    },
    {
      label: "Schedule Conflicts",
      value: "0",
      detail: "From database",
      icon: "⚠️",
      tone: "amber",
    },
  ]);

  const loadDashboardData = async () => {
    try {
      const [facRes, subRes, roomRes, secRes, schedRes, confRes] =
        await Promise.all([
          api.get("/faculty"),
          api.get("/subjects"),
          api.get("/rooms"),
          api.get("/sections"),
          api.get("/schedules"),
          api.get("/schedules/conflicts"),
        ]);

      const facs = facRes.data?.data || [];
      const subs = subRes.data?.data || [];
      const rms = roomRes.data?.data || [];
      const secs = secRes.data?.data || [];
      const scheds = schedRes.data?.data || [];
      const confs = confRes.data?.data || [];

      setMetrics([
        {
          label: "Total Faculty",
          value: String(facs.length),
          detail: "From database",
          icon: "👩‍🏫",
          tone: "royal",
        },
        {
          label: "Total Subjects",
          value: String(subs.length),
          detail: "From database",
          icon: "📘",
          tone: "gold",
        },
        {
          label: "Total Sections",
          value: String(secs.length),
          detail: "From database",
          icon: "🏫",
          tone: "navy",
        },
        {
          label: "Total Rooms",
          value: String(rms.length),
          detail: "From database",
          icon: "🪑",
          tone: "slate",
        },
        {
          label: "Total Schedules",
          value: String(scheds.length),
          detail: "From database",
          icon: "🗓️",
          tone: "emerald",
        },
        {
          label: "Schedule Conflicts",
          value: String(confs.length),
          detail: "From database",
          icon: "⚠️",
          tone: "amber",
        },
      ]);

      // Handle teacher info load
      if (role === "teacher") {
        const teacherId = window.localStorage.getItem("teacherId");
        const currentTeacher = facs.find(
          (f: any) => String(f.id) === String(teacherId),
        );
        if (currentTeacher) {
          setTeacherStatus(currentTeacher.status || "Full-Time");
          setAvailabilityMessage(currentTeacher.availability || "");
        }
      }

      const rawAvail =
        role === "teacher"
          ? facs.find(
              (f: any) =>
                String(f.id) ===
                String(window.localStorage.getItem("teacherId")),
            )?.availability || ""
          : window.localStorage.getItem("teacherAvailability");
      const availability = parseTeacherAvailability(rawAvail);

      const fallback = generateScheduleSeed({
        role,
        programKey: selectedProgram.key,
        teacherName: userName,
        section: "A",
        availability,
      });
      setSchedules(
        scheds.length > 0 ? scheds.slice(0, 6) : fallback.slice(0, 4),
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setMetrics(fallbackMetrics);
      const rawAvail = window.localStorage.getItem("teacherAvailability");
      const availability = parseTeacherAvailability(rawAvail);
      setSchedules(
        generateScheduleSeed({
          role,
          programKey: selectedProgram.key,
          teacherName: userName,
          section: "A",
          availability,
        }),
      );
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [role, selectedProgram.key, userName]);

  // Sync checkboxes with availabilityMessage
  useEffect(() => {
    const parsed = parseTeacherAvailability(availabilityMessage);
    const slotsMap: Record<string, string[]> = {};
    for (const entry of parsed) {
      slotsMap[entry.day] = entry.slots;
    }
    setSelectedSlots(slotsMap);
  }, [availabilityMessage]);

  const handleCheckboxChange = (
    day: string,
    slot: string,
    checked: boolean,
  ) => {
    if (role === "teacher" && teacherStatus === "Full-Time") return; // Read-only

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
          availability: nextValue,
        });
        setAvailabilityMessage(nextValue);
        toast.push("Availability updated successfully", "success");
      } catch (error: any) {
        toast.push(
          error?.response?.data?.error || "Failed to update availability",
          "error",
        );
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
      // Default working hours Mon-Fri 08:00 - 17:00
      return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(
        day,
      );
    }
    return (selectedSlots[day] || []).includes(slot);
  };

  const quickActions = [
    {
      label: "Generate Schedule",
      icon: Sparkles,
      onClick: () => setShowScheduleModal(true),
      tone: "royal",
    },
    {
      label: "Add Faculty",
      icon: Users,
      onClick: () => navigate("/faculty"),
      tone: "gold",
    },
    {
      label: "Add Subject",
      icon: BookOpen,
      onClick: () => navigate("/subjects"),
      tone: "navy",
    },
    {
      label: "Add Room",
      icon: DoorOpen,
      onClick: () => navigate("/rooms"),
      tone: "slate",
    },
    {
      label: "Add Section",
      icon: ClipboardList,
      onClick: () => navigate("/sections"),
      tone: "emerald",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* -------------------- ADMIN VIEW -------------------- */}
      {role === "admin" && (
        <>
          <PageHeader
            title="College Scheduling System"
            description="Registrar overview for St. Rita's College of Balingasag."
            actions={
              <button
                className="action-button"
                type="button"
                disabled={isGenerating}
                onClick={async () => {
                  setIsGenerating(true);
                  try {
                    await api.post("/schedules/generate");
                    await loadDashboardData();
                    toast.push("Schedule generated successfully", "success");
                  } catch (err) {
                    toast.push("Failed to generate schedule", "error");
                  } finally {
                    setIsGenerating(false);
                  }
                }}
              >
                {isGenerating ? (
                  <span className="spinner" />
                ) : (
                  <Sparkles size={16} />
                )}
                {isGenerating ? "Generating schedule…" : "Generate Schedule"}
              </button>
            }
          />

          <section className="hero-card">
            <div className="hero-card__grid">
              <div>
                <p className="eyebrow">Welcome Administrator</p>
                <h2>Coordinate the academic calendar with confidence.</h2>
                <p
                  className="pill"
                  style={{ marginTop: 10, display: "inline-flex" }}
                >
                  Active program: {selectedProgram.label}
                </p>
                <div className="page-help" style={{ marginTop: 12 }}>
                  <div className="page-help__content">
                    <span className="status-badge">Live</span>
                    <span>
                      Use the dashboard to review totals, spot conflicts, and
                      prepare new schedules quickly.
                    </span>
                  </div>
                </div>
                <p className="muted">
                  Monitor faculty workload, room availability, section
                  assignments, and live timetable changes from a polished
                  registrar dashboard.
                </p>
                <div className="hero-actions" style={{ marginTop: 14 }}>
                  {quickActions.map(({ label, icon: Icon, onClick, tone }) => (
                    <button
                      key={label}
                      type="button"
                      className={`action-button action-button--${tone}`}
                      onClick={onClick}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
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
                  <span>Today</span>
                  <strong>{new Date().toLocaleDateString()}</strong>
                </li>
                <li>
                  <span>Status</span>
                  <strong>Live</strong>
                </li>
              </ul>
            </div>
          </section>

          <section className="stats-grid">
            {metrics.map((metric) => (
              <StatCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                detail={metric.detail}
                icon={metric.icon}
                tone={metric.tone as any}
                onClick={() => {
                  if (metric.label.includes("Faculty")) navigate("/faculty");
                  if (metric.label.includes("Subjects")) navigate("/subjects");
                  if (metric.label.includes("Sections")) navigate("/sections");
                  if (metric.label.includes("Rooms")) navigate("/rooms");
                  if (metric.label.includes("Schedules"))
                    navigate("/schedules");
                  if (metric.label.includes("Conflicts"))
                    navigate("/conflicts");
                }}
              />
            ))}
          </section>

          <section className="grid-2">
            <article className="card">
              <div className="card__header">
                <div>
                  <p className="eyebrow">Faculty workload</p>
                  <h3>Weekly teaching load</h3>
                </div>
                <BarChart3 size={18} />
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={workloadData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="load"
                      stroke="#2563eb"
                      fill="#dbeafe"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="card">
              <div className="card__header">
                <div>
                  <p className="eyebrow">Room utilization</p>
                  <h3>Capacity usage</h3>
                </div>
                <CalendarClock size={18} />
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={roomData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="usage" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="grid-2">
            <article className="card">
              <div className="card__header">
                <div>
                  <p className="eyebrow">Live timetable preview</p>
                  <h3>Today's Classes</h3>
                </div>
                <CalendarRange size={18} />
              </div>
              <div className="schedule-list">
                {schedules.length === 0 ? (
                  <div className="empty-state">
                    No classes have been generated yet.
                  </div>
                ) : (
                  schedules.map((slot) => (
                    <div className="schedule-item" key={slot.id}>
                      <div
                        className="schedule-item__dot"
                        style={{ backgroundColor: slot.color }}
                      />
                      <div>
                        <p className="schedule-item__title">{slot.subject}</p>
                        <p className="schedule-item__meta">
                          {slot.day} • {slot.time} • {slot.room}
                        </p>
                      </div>
                      <span className="pill">{slot.faculty}</span>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="card">
              <div className="card__header">
                <div>
                  <p className="eyebrow">Registrar summary</p>
                  <h3>Operational highlights</h3>
                </div>
                <RefreshCcw size={18} />
              </div>
              <div className="schedule-list">
                {[
                  {
                    label: "Faculty Load",
                    value: "84%",
                    detail: "Balanced this week",
                  },
                  {
                    label: "Rooms in Use",
                    value: "12/16",
                    detail: "Active classrooms",
                  },
                  {
                    label: "Pending Changes",
                    value: "3",
                    detail: "Awaiting review",
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
        </>
      )}

      {/* -------------------- TEACHER VIEW -------------------- */}
      {role === "teacher" && (
        <>
          <PageHeader
            title="Teacher Portal"
            description="Manage and review your teaching preferences and assigned classes."
            actions={
              <button
                className="action-button"
                type="button"
                onClick={loadDashboardData}
              >
                Refresh Schedule
              </button>
            }
          />

          <section className="hero-card">
            <div>
              <p className="eyebrow">Welcome Teacher</p>
              <h2>
                Welcome back, {userName}. Manage your teaching plan with
                clarity.
              </h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Review your assigned classes, update availability when needed,
                and stay aligned with your weekly timetable.
              </p>
              <p
                className="pill"
                style={{ marginTop: 10, display: "inline-flex" }}
              >
                Status: {teacherStatus}
              </p>
            </div>
          </section>

          <section className="grid-2">
            <article className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="card__header">
                <div>
                  <p className="eyebrow">Availability Planner</p>
                  <h3>
                    {teacherStatus === "Full-Time"
                      ? "Default Working Hours (Read-Only)"
                      : "Select Preferred Working Hours"}
                  </h3>
                  <p className="muted">
                    {teacherStatus === "Full-Time"
                      ? "Full-time teachers follow Mon-Fri 08:00 - 17:00 working hours, unless overridden by the Admin."
                      : "Check the day and time slots when you are available to teach."}
                  </p>
                </div>
                <CalendarClock size={18} />
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
                          <td style={{ fontWeight: 500 }}>{slot}</td>
                          {AVAILABILITY_DAYS.map((day) => {
                            const checked = isChecked(day, slot);
                            const disabled = teacherStatus === "Full-Time";
                            return (
                              <td key={`${day}-${slot}`}>
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() =>
                                    handleCheckboxChange(day, slot, !checked)
                                  }
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: disabled ? "default" : "pointer",
                                    color: checked ? "#0d5499" : "#9ca3af",
                                    padding: 4,
                                  }}
                                >
                                  {checked ? (
                                    <CheckSquare size={20} />
                                  ) : (
                                    <Square size={20} />
                                  )}
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
                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      className="action-button--success"
                      disabled={isSavingAvailability}
                      onClick={handleSaveAvailability}
                    >
                      {isSavingAvailability ? (
                        <span className="spinner" />
                      ) : (
                        <BadgeCheck size={16} />
                      )}
                      {isSavingAvailability ? "Saving…" : "Save Availability"}
                    </button>
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="grid-2">
            <article className="card">
              <div className="card__header">
                <div>
                  <p className="eyebrow">Timetable</p>
                  <h3>Your Assigned Classes</h3>
                </div>
                <CalendarRange size={18} />
              </div>
              <div className="schedule-list">
                {schedules.length === 0 ? (
                  <div className="empty-state">
                    No classes assigned to you for today.
                  </div>
                ) : (
                  schedules.map((slot) => (
                    <div className="schedule-item" key={slot.id}>
                      <div
                        className="schedule-item__dot"
                        style={{ backgroundColor: slot.color }}
                      />
                      <div>
                        <p className="schedule-item__title">{slot.subject}</p>
                        <p className="schedule-item__meta">
                          {slot.day} • {slot.time} • {slot.room}
                        </p>
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
                  <p className="eyebrow">Workload Summary</p>
                  <h3>Teaching Metrics</h3>
                </div>
                <RefreshCcw size={18} />
              </div>
              <div className="schedule-list">
                {[
                  {
                    label: "Assigned Subjects",
                    value: String(schedules.length),
                    detail: "Active curriculum blocks",
                  },
                  {
                    label: "Weekly Hours",
                    value: `${schedules.length * 3} Hours`,
                    detail: "Based on 3 units per subject",
                  },
                  {
                    label: "Department Focus",
                    value: "Information Technology",
                    detail: "Primary assignment unit",
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
        </>
      )}

      {/* -------------------- STUDENT VIEW -------------------- */}
      {role === "student" && (
        <>
          <PageHeader
            title="Student Portal"
            description="View your active courses, class schedule, and section announcements."
            actions={
              <button
                className="action-button"
                type="button"
                onClick={loadDashboardData}
              >
                Refresh View
              </button>
            }
          />

          <section className="hero-card">
            <div>
              <p className="eyebrow">Welcome Student</p>
              <h2>Welcome back, {userName}. Your schedule is ready to view.</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Access your personalized class schedule and stay informed about
                your program and section timetable.
              </p>
            </div>
          </section>

          <section className="grid-2">
            <article className="card">
              <div className="card__header">
                <div>
                  <p className="eyebrow">Weekly classes</p>
                  <h3>Personal Schedule</h3>
                </div>
                <CalendarRange size={18} />
              </div>
              <div className="schedule-list">
                {schedules.length === 0 ? (
                  <div className="empty-state">
                    No schedule blocks generated for your section.
                  </div>
                ) : (
                  schedules.map((slot) => (
                    <div className="schedule-item" key={slot.id}>
                      <div
                        className="schedule-item__dot"
                        style={{ backgroundColor: slot.color }}
                      />
                      <div>
                        <p className="schedule-item__title">{slot.subject}</p>
                        <p className="schedule-item__meta">
                          {slot.day} • {slot.time} • {slot.room}
                        </p>
                      </div>
                      <span className="pill">{slot.faculty}</span>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="card">
              <div className="card__header">
                <div>
                  <p className="eyebrow">Academic Status</p>
                  <h3>Section Overview</h3>
                </div>
                <Bookmark size={18} />
              </div>
              <div className="schedule-list">
                {[
                  {
                    label: "Assigned Program",
                    value: studentProgram,
                    detail: "Your major curriculum",
                  },
                  {
                    label: "Year Level",
                    value: studentYear,
                    detail: "Current academic progression",
                  },
                  {
                    label: "Active Section",
                    value: studentSection || "Not Assigned",
                    detail: "Assigned section cohort",
                  },
                  {
                    label: "Total Weekly Classes",
                    value: String(schedules.length),
                    detail: "Active scheduled blocks",
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
        </>
      )}

      {/* -------------------- SCHEDULE MODAL (ADMIN ONLY) -------------------- */}
      <Modal
        isOpen={showScheduleModal}
        title="Generate schedule"
        description="Prepare a new timetable block for the registrar office."
        onClose={() => setShowScheduleModal(false)}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="academicYear">Academic Year</label>
            <input
              id="academicYear"
              value={form.academicYear}
              onChange={(event) =>
                setForm({ ...form, academicYear: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="semester">Semester</label>
            <input
              id="semester"
              value={form.semester}
              onChange={(event) =>
                setForm({ ...form, semester: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="program">Program</label>
            <select
              id="program"
              value={form.program}
              onChange={(event) =>
                setForm({ ...form, program: event.target.value })
              }
            >
              <option value="ITP">ITP</option>
              <option value="BSA">BSA</option>
              <option value="CJEP">CJEP</option>
              <option value="HMP">HMP</option>
              <option value="TEP">TEP</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="yearLevel">Year Level</label>
            <input
              id="yearLevel"
              value={form.yearLevel}
              onChange={(event) =>
                setForm({ ...form, yearLevel: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="section">Section</label>
            <input
              id="section"
              value={form.section}
              onChange={(event) =>
                setForm({ ...form, section: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <label htmlFor="options">Scheduling Options</label>
            <select
              id="options"
              value={form.options}
              onChange={(event) =>
                setForm({ ...form, options: event.target.value })
              }
            >
              <option value="Balanced room allocation">
                Balanced room allocation
              </option>
              <option value="Faculty-first scheduling">
                Faculty-first scheduling
              </option>
              <option value="Room-first scheduling">
                Room-first scheduling
              </option>
            </select>
          </div>
        </div>
        <div className="table-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowScheduleModal(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-button"
            disabled={isGenerating}
            onClick={async () => {
              setShowScheduleModal(false);
              setIsGenerating(true);
              try {
                await api.post("/schedules/generate");
                await loadDashboardData();
                toast.push("Schedule generated successfully", "success");
              } catch (err) {
                toast.push("Unable to generate schedule", "error");
              } finally {
                setIsGenerating(false);
              }
            }}
          >
            {isGenerating ? (
              <span className="spinner" />
            ) : (
              <BadgeCheck size={16} />
            )}
            {isGenerating ? "Preparing schedule…" : "Prepare Schedule"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
