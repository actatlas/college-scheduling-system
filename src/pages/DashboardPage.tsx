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

export function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { selectedProgram } = useProgramContext();
  const role = (
    window.localStorage.getItem("userRole") || "admin"
  ).toLowerCase() as UserRole;
  const userName =
    window.localStorage.getItem("userName") ||
    (role === "teacher"
      ? "Ms. Santos"
      : role === "student"
        ? "Student"
        : "Admin");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [availabilityForm, setAvailabilityForm] = useState({
    day: "Monday",
    slot: "08:00-09:00",
  });
  const [availabilityMessage, setAvailabilityMessage] = useState(
    "No availability submitted yet.",
  );
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

  useEffect(() => {
    const savedAvailability = window.localStorage.getItem(
      "teacherAvailability",
    );
    if (savedAvailability) {
      setAvailabilityMessage(savedAvailability);
    }
  }, []);

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

      const availability = parseTeacherAvailability(
        window.localStorage.getItem("teacherAvailability"),
      );
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
      const availability = parseTeacherAvailability(
        window.localStorage.getItem("teacherAvailability"),
      );
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

  const quickActions =
    role === "admin"
      ? [
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
        ]
      : [
          {
            label: role === "teacher" ? "View Availability" : "View Schedule",
            icon: Sparkles,
            onClick: () => {
              if (role === "admin") {
                setShowScheduleModal(true);
              } else {
                loadDashboardData();
              }
            },
            tone: "royal",
          },
          {
            label: role === "teacher" ? "My Schedule" : "My Subjects",
            icon: role === "teacher" ? CalendarRange : BookOpen,
            onClick: () =>
              navigate(role === "teacher" ? "/schedules" : "/subjects"),
            tone: "navy",
          },
        ];

  const todayClasses = schedules.slice(0, 4);
  const workloadSummary = [
    { label: "Faculty Load", value: "84%", detail: "Balanced this week" },
    { label: "Rooms in Use", value: "12/16", detail: "Active classrooms" },
    { label: "Pending Changes", value: "3", detail: "Awaiting review" },
  ];

  const handleAvailabilitySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextValue = `${availabilityForm.day}: ${availabilityForm.slot}`;
    if (role === "teacher") {
      const teacherId = window.localStorage.getItem("teacherId");
      if (teacherId) {
        try {
          await api.put(`/faculty/${encodeURIComponent(teacherId)}`, {
            availability: nextValue,
          });
          setAvailabilityMessage(nextValue);
          toast.push("Availability updated", "success");
          return;
        } catch (error: any) {
          toast.push(
            error?.response?.data?.error || "Failed to update availability",
            "error",
          );
          return;
        }
      }
    }

    window.localStorage.setItem("teacherAvailability", nextValue);
    setAvailabilityMessage(nextValue);
    toast.push("Availability updated", "success");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="College Scheduling System"
        description="Registrar overview for St. Rita's College of Balingasag."
        actions={
          <button
            className="action-button"
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                if (role === "admin") {
                  await api.post("/schedules/generate");
                  await loadDashboardData();
                  toast.push("Schedule generated", "success");
                } else {
                  await loadDashboardData();
                  toast.push("Schedule refreshed", "success");
                }
              } catch (err) {
                // eslint-disable-next-line no-console
                console.error(err);
                toast.push(
                  role === "admin"
                    ? "Failed to generate schedule"
                    : "Failed to refresh schedule",
                  "error",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading
              ? role === "admin"
                ? "Generating…"
                : "Refreshing…"
              : role === "admin"
                ? "Generate Schedule"
                : "Refresh Schedule"}
          </button>
        }
      />

      <section className="hero-card">
        <div className="hero-card__grid">
          <div>
            <p className="eyebrow">
              Welcome{" "}
              {role === "teacher"
                ? "Teacher"
                : role === "student"
                  ? "Student"
                  : "Administrator"}
            </p>
            <h2>
              {role === "teacher"
                ? `Welcome, ${userName}. Manage your teaching plan with clarity.`
                : role === "student"
                  ? `Welcome, ${userName}. Your schedule is ready to view.`
                  : "Coordinate the academic calendar with confidence."}
            </h2>
            <p
              className="pill"
              style={{ marginTop: 10, display: "inline-flex" }}
            >
              Active program: {selectedProgram.label}
            </p>
            <p className="muted">
              {role === "teacher"
                ? "Review your assigned classes, update availability when needed, and stay aligned with your weekly timetable."
                : role === "student"
                  ? "Access your personalized class schedule and stay informed about your program and section timetable."
                  : "Monitor faculty workload, room availability, section assignments, and live timetable changes from a polished registrar dashboard."}
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
            tone={
              metric.tone as
                | "royal"
                | "gold"
                | "navy"
                | "slate"
                | "emerald"
                | "amber"
            }
            onClick={() => {
              if (metric.label.includes("Faculty")) navigate("/faculty");
              if (metric.label.includes("Subjects")) navigate("/subjects");
              if (metric.label.includes("Sections")) navigate("/sections");
              if (metric.label.includes("Rooms")) navigate("/rooms");
              if (metric.label.includes("Schedules")) navigate("/schedules");
              if (metric.label.includes("Conflicts")) navigate("/conflicts");
            }}
          />
        ))}
      </section>

      {role !== "student" ? (
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
      ) : null}

      {role === "teacher" ? (
        <section className="grid-2">
          <article className="card">
            <div className="card__header">
              <div>
                <p className="eyebrow">Availability</p>
                <h3>Submit your preferred slots</h3>
              </div>
              <Sparkles size={18} />
            </div>
            <form
              className="availability-form"
              onSubmit={handleAvailabilitySubmit}
            >
              <div className="field-group">
                <label htmlFor="availabilityDay">Day</label>
                <select
                  id="availabilityDay"
                  value={availabilityForm.day}
                  onChange={(event) =>
                    setAvailabilityForm({
                      ...availabilityForm,
                      day: event.target.value,
                    })
                  }
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="availabilitySlot">Time slot</label>
                <select
                  id="availabilitySlot"
                  value={availabilityForm.slot}
                  onChange={(event) =>
                    setAvailabilityForm({
                      ...availabilityForm,
                      slot: event.target.value,
                    })
                  }
                >
                  <option value="08:00-09:00">08:00-09:00</option>
                  <option value="09:00-10:00">09:00-10:00</option>
                  <option value="10:00-11:00">10:00-11:00</option>
                  <option value="11:00-12:00">11:00-12:00</option>
                  <option value="01:00-02:00">01:00-02:00</option>
                  <option value="02:00-03:00">02:00-03:00</option>
                </select>
              </div>
              <button type="submit" className="action-button">
                Save availability
              </button>
            </form>
            <p className="muted" style={{ marginTop: 12 }}>
              {availabilityMessage}
            </p>
          </article>

          <article className="card">
            <div className="card__header">
              <div>
                <p className="eyebrow">Teacher notes</p>
                <h3>How the generator uses this</h3>
              </div>
              <BadgeCheck size={18} />
            </div>
            <div className="schedule-list">
              <div className="schedule-item">
                <div>
                  <p className="schedule-item__title">Conflict-free planning</p>
                  <p className="schedule-item__meta">
                    Your preferred slots guide room and section placement.
                  </p>
                </div>
                <span className="pill">Auto</span>
              </div>
              <div className="schedule-item">
                <div>
                  <p className="schedule-item__title">Fast updates</p>
                  <p className="schedule-item__meta">
                    Adjust availability anytime to improve schedule quality.
                  </p>
                </div>
                <span className="pill">Live</span>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      <section className="grid-2">
        <article className="card">
          <div className="card__header">
            <div>
              <p className="eyebrow">
                {role === "teacher"
                  ? "Your timetable"
                  : role === "student"
                    ? "Your classes"
                    : "Today’s classes"}
              </p>
              <h3>
                {role === "teacher"
                  ? "Teaching plan"
                  : role === "student"
                    ? "Personal schedule"
                    : "Live timetable preview"}
              </h3>
            </div>
            <CalendarRange size={18} />
          </div>
          <div className="schedule-list">
            {todayClasses.length === 0 ? (
              <div className="empty-state">
                No classes have been generated yet.
              </div>
            ) : (
              todayClasses.map((slot) => (
                <div
                  className="schedule-item"
                  key={`${slot.day}-${slot.time}-${slot.subject}`}
                >
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
              <p className="eyebrow">
                {role === "teacher"
                  ? "Availability"
                  : role === "student"
                    ? "Program focus"
                    : "Registrar summary"}
              </p>
              <h3>
                {role === "teacher"
                  ? "Availability notes"
                  : role === "student"
                    ? "Section overview"
                    : "Operational highlights"}
              </h3>
            </div>
            <RefreshCcw size={18} />
          </div>
          <div className="schedule-list">
            {(role === "teacher"
              ? [
                  {
                    label: "Preferred slots",
                    value: "Mon/Wed/Fri",
                    detail: "Update availability for better scheduling",
                  },
                  {
                    label: "Assigned section",
                    value: "ITP-A",
                    detail: "Matches your teaching load",
                  },
                  {
                    label: "Part-time status",
                    value: "Required",
                    detail:
                      "Submit availability to improve conflict-free placement",
                  },
                ]
              : role === "student"
                ? [
                    {
                      label: "Program",
                      value: selectedProgram.shortLabel,
                      detail: "Your assigned program",
                    },
                    {
                      label: "Section",
                      value: "A",
                      detail: "Based on your class section",
                    },
                    {
                      label: "Schedule mode",
                      value: "Live",
                      detail: "Updated as new blocks are finalized",
                    },
                  ]
                : workloadSummary
            ).map((item) => (
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
            onClick={async () => {
              setShowScheduleModal(false);
              setLoading(true);
              try {
                await api.post("/schedules/generate");
                await loadDashboardData();
                toast.push("Schedule generation workflow prepared", "success");
              } catch (err) {
                toast.push("Unable to prepare schedule at the moment", "error");
              } finally {
                setLoading(false);
              }
            }}
          >
            <BadgeCheck size={16} />
            Prepare Schedule
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
