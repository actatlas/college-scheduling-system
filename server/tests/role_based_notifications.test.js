import { describe, it, expect, beforeEach } from "vitest";
const { notificationsService } = require("../services/notifications.service");

describe("Role-Based Notification System", () => {
  beforeEach(async () => {
    await notificationsService.ensureNotificationsTable();
  });

  it("1. Super Admin strictly receives super_admin and global notifications, not teacher or program-specific alerts", async () => {
    const superAdminUser = {
      id: 1,
      sub: 1,
      role: "super_admin",
      name: "ICT Super Administrator",
      email: "superadmin@srcb.edu.ph",
    };

    const notifs = await notificationsService.listNotifications({ user: superAdminUser });
    expect(notifs.length).toBeGreaterThan(0);

    for (const n of notifs) {
      const targetRoles = String(n.targetRole || "all").toLowerCase().split(",");
      const isAllowed = targetRoles.includes("super_admin") || targetRoles.includes("all");
      expect(isAllowed).toBe(true);
    }
  });

  it("2. Dean of Student Affairs (Admin) does not receive Super Admin only governance alerts", async () => {
    const adminUser = {
      id: 2,
      sub: 2,
      role: "admin",
      name: "System Administrator",
      email: "admin@srcb.edu.ph",
    };

    const notifs = await notificationsService.listNotifications({ user: adminUser });
    expect(notifs.length).toBeGreaterThan(0);

    for (const n of notifs) {
      const targetRoles = String(n.targetRole || "all").toLowerCase().split(",");
      // Must not be strictly super_admin
      if (targetRoles.includes("super_admin") && !targetRoles.includes("admin") && !targetRoles.includes("all")) {
        throw new Error(`Admin received Super Admin exclusive notification: ${n.title}`);
      }
    }
  });

  it("3. Program Head receives program-scoped notifications and personal instructor notifications", async () => {
    const programHeadUser = {
      id: 3,
      sub: 3,
      role: "program_head",
      name: "Dr. Reyes",
      email: "programhead@srcb.edu.ph",
      program: "BSIT",
      programCode: "ITP",
      teacherId: "FAC-003",
    };

    const notifs = await notificationsService.listNotifications({ user: programHeadUser });
    expect(notifs.length).toBeGreaterThan(0);

    for (const n of notifs) {
      const targetRoles = String(n.targetRole || "all").toLowerCase().split(",");
      expect(targetRoles.includes("super_admin")).toBe(false);

      if (n.targetProgram && n.targetProgram !== "ALL") {
        expect(["ITP", "BSIT"]).toContain(n.targetProgram.toUpperCase());
      }
    }
  });

  it("4. Teacher receives only teacher-specific and personal notifications", async () => {
    const teacherUser = {
      id: 4,
      sub: 4,
      role: "teacher",
      name: "Maria Santos",
      email: "teacher@srcb.edu.ph",
      teacherId: "T001",
    };

    const notifs = await notificationsService.listNotifications({ user: teacherUser });
    expect(notifs.length).toBeGreaterThan(0);

    for (const n of notifs) {
      const targetRoles = String(n.targetRole || "all").toLowerCase().split(",");
      expect(targetRoles.includes("super_admin")).toBe(false);
      expect(targetRoles.includes("admin")).toBe(false);
      expect(targetRoles.includes("program_head")).toBe(false);
    }
  });

  it("5. Custom targeted notification reaches only target teacher ID", async () => {
    const customNotif = await notificationsService.createNotification({
      title: "Classroom Room Swap Approved",
      message: "Your request to swap to LAB-402 on Wednesday was approved.",
      type: "success",
      link: "/dashboard",
      targetRole: "teacher",
      targetTeacherId: "T001",
    });

    // Request from matching teacher
    const matchingTeacher = {
      id: 4,
      sub: 4,
      role: "teacher",
      name: "Maria Santos",
      teacherId: "T001",
    };
    const matchingList = await notificationsService.listNotifications({ user: matchingTeacher });
    const foundInMatching = matchingList.some((n) => n.id === customNotif.id);
    expect(foundInMatching).toBe(true);

    // Request from different teacher
    const otherTeacher = {
      id: 5,
      sub: 5,
      role: "teacher",
      name: "Marco Sabuero",
      teacherId: "FAC-003",
    };
    const otherList = await notificationsService.listNotifications({ user: otherTeacher });
    const foundInOther = otherList.some((n) => n.id === customNotif.id);
    expect(foundInOther).toBe(false);
  });
});
