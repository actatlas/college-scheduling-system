import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { ToastProvider } from "../components/common/Toast";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { api } from "../data/apiClient";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/faculty": "Faculty Management",
  "/departments": "Programs",
  "/programs": "Academic Programs",
  "/courses": "Courses",
  "/subjects": "Subjects Catalog",
  "/sections": "Class Sections",
  "/rooms": "Campus Rooms & Facilities",
  "/schedules": "Class Schedules & Timetable",
  "/exams": "Examination Schedules",
  "/conflicts": "Conflict Diagnostics",
  "/reports": "Reports & Analytics",
  "/users": "User Management (ICT)",
  "/settings": "System Settings",
};

export function MainLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "Scheduling System";
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Verify account status in backend
    api
      .get("/auth/me")
      .then((res: any) => {
        const user = res.data?.user || res.data?.data || res.data;
        if (user?.status && String(user.status).toLowerCase() === "suspended") {
          localStorage.removeItem("token");
          localStorage.removeItem("userRole");
          localStorage.removeItem("userName");
          localStorage.removeItem("teacherId");
          localStorage.removeItem("teacherStatus");
          localStorage.removeItem("selectedProgram");
          sessionStorage.setItem(
            "suspensionNotice",
            "Your account has been suspended. Please contact the ICT Office or system administrator."
          );
          window.location.href = "/login?suspended=1";
        }
      })
      .catch(() => {
        // apiClient handleResponse handles 401 & 403 ACCOUNT_SUSPENDED redirect
      });
  }, [location.pathname, navigate]);

  // Close mobile sidebar on route transition
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <ToastProvider>
      <div className="app-shell">
        <Sidebar
          isMobileOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
        />
        {isMobileOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        <div className="main-panel">
          <Topbar
            title={title}
            onToggleMobileSidebar={() => setIsMobileOpen((prev) => !prev)}
          />
          <motion.main
            className="page-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <Outlet />
          </motion.main>
        </div>
      </div>
    </ToastProvider>
  );
}


