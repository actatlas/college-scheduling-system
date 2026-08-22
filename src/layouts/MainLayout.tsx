import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { ToastProvider } from "../components/common/Toast";
import { motion } from "framer-motion";
import { useEffect } from "react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/faculty": "Faculty Management",
  "/departments": "Programs",
  "/programs": "Programs",
  "/courses": "Courses",
  "/subjects": "Subjects",
  "/sections": "Sections",
  "/rooms": "Campus Rooms & Facilities",
  "/schedules": "Class Schedules",
  "/exams": "Examination Schedules",
  "/conflicts": "Conflict Detection",
  "/reports": "Reports & Exports",
  "/users": "User Management (ICT)",
  "/settings": "Settings",
};

export function MainLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "Scheduling System";
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <ToastProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="main-panel">
          <Topbar title={title} />
          <motion.main
            className="page-content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.main>
        </div>
      </div>
    </ToastProvider>
  );
}

