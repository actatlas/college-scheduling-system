"use client";

import { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  CalendarDays,
  CalendarCheck,
  Users,
  Settings,
  LogOut,
  DoorOpen,
  GraduationCap,
  AlertTriangle,
  FileBarChart,
  UserCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import LogoImg from "@/assets/images/Logo.png";

export function SchedulingSidebarDemo() {
  const [open, setOpen] = useState(false);

  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Class Schedules",
      href: "/schedules",
      icon: <CalendarDays className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Exam Schedules",
      href: "/exams",
      icon: <CalendarCheck className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Academic Programs",
      href: "/programs",
      icon: <Building2 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Courses",
      href: "/courses",
      icon: <GraduationCap className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Subjects Catalog",
      href: "/subjects",
      icon: <BookOpen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Class Sections",
      href: "/sections",
      icon: <GraduationCap className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Rooms & Facilities",
      href: "/rooms",
      icon: <DoorOpen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Faculty Directory",
      href: "/faculty",
      icon: <Users className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Conflict Diagnostics",
      href: "/conflicts",
      icon: <AlertTriangle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Reports & Analytics",
      href: "/reports",
      icon: <FileBarChart className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "System Settings",
      href: "/settings",
      icon: <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
  ];

  return (
    <div
      className={cn(
        "rounded-md flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 max-w-7xl mx-auto border border-neutral-200 dark:border-neutral-700 overflow-hidden",
        "h-[75vh]"
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-6">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? (
              <div className="flex items-center gap-2 py-1">
                <img src={LogoImg} alt="SRCB" className="h-7 w-7 object-contain" />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col"
                >
                  <span className="font-bold text-sm text-neutral-800 dark:text-white leading-tight" style={{ color: "#0f172a" }}>SRCB</span>
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 leading-tight" style={{ color: "#64748b" }}>Scheduling System</span>
                </motion.div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-1">
                <img src={LogoImg} alt="SRCB" className="h-7 w-7 object-contain" />
              </div>
            )}

            <div className="mt-6 flex flex-col gap-1">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2 flex flex-col gap-1">
            <SidebarLink
              link={{
                label: "Administrator",
                href: "/profile",
                icon: <UserCircle className="h-5 w-5 text-neutral-700 dark:text-neutral-200" />,
              }}
            />
            <SidebarLink
              link={{
                label: "Logout",
                href: "/login",
                icon: <LogOut className="h-5 w-5 text-red-500" />,
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex flex-1 p-6 flex-col gap-4 overflow-y-auto bg-white dark:bg-neutral-900">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
              Scheduling System Preview with Motion Sidebar
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Hover over the sidebar on the left to expand from 60px to 300px, or toggle it pinned below.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition cursor-pointer"
            style={{ backgroundColor: "#2563eb", color: "#ffffff", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }}
          >
            {open ? "Collapse Sidebar (60px)" : "Pin Expand Sidebar (300px)"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300" style={{ color: "#475569" }}>Active Schedules</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1" style={{ color: "#0f172a" }}>128</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300" style={{ color: "#475569" }}>Classrooms</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1" style={{ color: "#0f172a" }}>42</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300" style={{ color: "#475569" }}>Active Faculty</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1" style={{ color: "#0f172a" }}>86</p>
          </div>
        </div>
      </div>
    </div>
  );
}
