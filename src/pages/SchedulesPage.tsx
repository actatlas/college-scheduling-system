import { motion } from "framer-motion";
import { PageHeader } from "../components/common/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { api } from "../data/apiClient";
import { useToast } from "../components/common/Toast";
import { Plus } from "lucide-react";
import { useProgramContext } from "../contexts/ProgramContext";
import { type UserRole } from "../utils/scheduling";

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
        setScheduleItems(res.data?.data || []);
      })
      .catch(() => {
        setScheduleItems([]);
      });
  }, [role, selectedProgram.key, userName]);

  const aiRecommendations = useMemo(() => [], [scheduleItems]);

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
            : "Preview a weekly timetable with room and faculty assignments."
        }
        actions={
          role === "admin" ? (
            <button
              className="action-button"
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await api.post("/schedules/generate");
                  const res: any = await api.get("/schedules");
                  setScheduleItems(res.data?.data || []);
                  toast.push("Timetable generated", "success");
                } catch (err) {
                  toast.push("Failed to generate timetable", "error");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Plus size={16} />
              {loading ? "Generating…" : "Generate Timetable"}
            </button>
          ) : (
            <button
              className="action-button"
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const res: any = await api.get("/schedules");
                  setScheduleItems(res.data?.data || []);
                  toast.push("Schedule refreshed", "success");
                } catch (err) {
                  toast.push("Failed to refresh schedule", "error");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Refresh Schedule
            </button>
          )
        }
      />

      <section className="card">
        <div className="card__header">
          <div>
            <p className="eyebrow">Scheduling status</p>
            <h3>Timetable overview</h3>
            <p className="muted">
              Review the current schedule data from the backend. If no entries
              are available yet, the timetable will stay empty until a program
              head creates the first schedule block.
            </p>
          </div>
        </div>
        <div className="empty-state">
          {aiRecommendations.length === 0
            ? "No planning issues detected. The schedule is currently balanced."
            : "Schedule review data is available."}
        </div>
      </section>

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
                    <td style={{ fontWeight: 500 }}>{row.time}</td>
                    <td>
                      {row.Monday ? (
                        <div className="timetable-block">{row.Monday}</div>
                      ) : (
                        <span className="empty-slot">-</span>
                      )}
                    </td>
                    <td>
                      {row.Tuesday ? (
                        <div className="timetable-block">{row.Tuesday}</div>
                      ) : (
                        <span className="empty-slot">-</span>
                      )}
                    </td>
                    <td>
                      {row.Wednesday ? (
                        <div className="timetable-block">{row.Wednesday}</div>
                      ) : (
                        <span className="empty-slot">-</span>
                      )}
                    </td>
                    <td>
                      {row.Thursday ? (
                        <div className="timetable-block">{row.Thursday}</div>
                      ) : (
                        <span className="empty-slot">-</span>
                      )}
                    </td>
                    <td>
                      {row.Friday ? (
                        <div className="timetable-block">{row.Friday}</div>
                      ) : (
                        <span className="empty-slot">-</span>
                      )}
                    </td>
                    <td>
                      {row.Saturday ? (
                        <div className="timetable-block">{row.Saturday}</div>
                      ) : (
                        <span className="empty-slot">-</span>
                      )}
                    </td>
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
