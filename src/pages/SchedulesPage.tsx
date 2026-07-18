import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { api } from "../data/mockApi";
import { useToast } from "../components/common/Toast";
import { Plus } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import {
  generateScheduleSeed,
  parseTeacherAvailability,
  type UserRole,
} from "../utils/scheduling";

export function SchedulesPage() {
  const [scheduleItems, setScheduleItems] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { selectedProgram, matchesProgram } = useProgramContext();
  const role = (
    window.localStorage.getItem("userRole") || "admin"
  ).toLowerCase() as UserRole;
  const userName = window.localStorage.getItem("userName") || "Admin";

  useEffect(() => {
    api
      .get("/schedules")
      .then((res: any) => {
        const data = res.data?.data || [];
        setScheduleItems(
          data.length > 0
            ? data
            : generateScheduleSeed({
                role,
                programKey: selectedProgram.key,
                teacherName: userName,
                section: "A",
                availability: parseTeacherAvailability(
                  window.localStorage.getItem("teacherAvailability"),
                ),
              }),
        );
      })
      .catch(() =>
        setScheduleItems(
          generateScheduleSeed({
            role,
            programKey: selectedProgram.key,
            teacherName: userName,
            section: "A",
            availability: parseTeacherAvailability(
              window.localStorage.getItem("teacherAvailability"),
            ),
          }),
        ),
      );
  }, [role, selectedProgram.key, userName]);

  const timetable = useMemo(() => {
    // UI expects a table with time rows and day columns.
    const byTime = new Map<string, any>();
    for (const item of scheduleItems.filter((entry) =>
      matchesProgram(entry.program || selectedProgram.shortLabel),
    )) {
      const time = item.time;
      if (!byTime.has(time)) {
        byTime.set(time, {
          time,
          Monday: "",
          Tuesday: "",
          Wednesday: "",
          Thursday: "",
          Friday: "",
          Saturday: "",
        });
      }
      const row = byTime.get(time);
      const dayKey = String(item.day || "").trim();
      const map: Record<string, keyof typeof row> = {
        Monday: "Monday",
        Tuesday: "Tuesday",
        Wednesday: "Wednesday",
        Thursday: "Thursday",
        Friday: "Friday",
        Saturday: "Saturday",
      };
      const col = map[dayKey];
      if (col) row[col] = item.subject;
    }
    return Array.from(byTime.values()).sort((a: any, b: any) =>
      String(a.time).localeCompare(String(b.time)),
    );
  }, [scheduleItems]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title="Schedules"
        description={
          role === "teacher"
            ? "View your assigned classes and confirm your availability-driven timetable."
            : role === "student"
              ? "See your personalized weekly class schedule based on your section."
              : "Preview a weekly timetable with room and faculty assignments."
        }
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
                }
                const res: any = await api.get("/schedules");
                setScheduleItems(res.data?.data || []);
                toast.push(
                  role === "admin"
                    ? "Timetable generated"
                    : "Schedule refreshed",
                  "success",
                );
              } catch (err) {
                toast.push(
                  role === "admin"
                    ? "Failed to generate timetable"
                    : "Failed to refresh schedule",
                  "error",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            <Plus size={16} />
            {loading
              ? role === "admin"
                ? "Generating…"
                : "Refreshing…"
              : role === "admin"
                ? "Generate Timetable"
                : role === "teacher"
                  ? "Refresh Schedule"
                  : "Refresh View"}
          </button>
        }
      />

      <section className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Mon</th>
                <th>Tue</th>
                <th>Wed</th>
                <th>Thu</th>
                <th>Fri</th>
                <th>Sat</th>
              </tr>
            </thead>
            <tbody>
              {timetable.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      No schedule blocks are available yet.
                    </div>
                  </td>
                </tr>
              ) : (
                timetable.map((row) => (
                  <tr key={row.time}>
                    <td>{row.time}</td>
                    <td>{row.Monday}</td>
                    <td>{row.Tuesday}</td>
                    <td>{row.Wednesday}</td>
                    <td>{row.Thursday}</td>
                    <td>{row.Friday}</td>
                    <td>{row.Saturday}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
}
