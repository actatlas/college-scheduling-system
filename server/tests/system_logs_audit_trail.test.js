import { describe, it, expect, beforeEach } from "vitest";
const {
  ensureSystemLogsTable,
  logAction,
  listSystemLogs,
  getFilterOptions,
  getSystemLogById,
} = require("../services/systemLogs.service");
const {
  listLogs,
  getFilters,
  getLogDetails,
} = require("../controllers/systemLogs.controller");

describe("ICT Super Admin System Logs (Audit Trail)", () => {
  beforeEach(async () => {
    await ensureSystemLogsTable();
  });

  it("1. logAction records an audit log entry with full details", async () => {
    const entry = await logAction({
      user: { id: 1, name: "ICT Super Administrator", email: "superadmin@srcb.edu.ph", role: "super_admin" },
      module: "User Management",
      action: "Created User Account",
      description: "Created a new Program Head account for the IT Program.",
      targetId: "101",
      targetType: "User",
      status: "Success",
      ipAddress: "192.168.1.50",
      details: { role: "program_head", program: "ITP", name: "Dr. Turing" },
    });

    expect(entry).toBeTruthy();
    expect(entry.module).toBe("User Management");
    expect(entry.action).toBe("Created User Account");
    expect(entry.status).toBe("Success");
    expect(entry.targetId).toBe("101");
    expect(entry.ipAddress).toBe("192.168.1.50");
  });

  it("2. logAction automatically redacts sensitive data (passwords, tokens)", async () => {
    const entry = await logAction({
      user: { id: 1, name: "ICT Super Admin", email: "superadmin@srcb.edu.ph", role: "super_admin" },
      module: "Authentication",
      action: "Password Reset",
      description: "User reset their password.",
      status: "Success",
      details: {
        email: "user@srcb.edu.ph",
        password: "SecretPassword123!",
        token: "abcdef1234567890",
        nested: { password_hash: "$2b$10$xyz" },
      },
    });

    expect(entry).toBeTruthy();
    expect(entry.details.password).toBe("[REDACTED]");
    expect(entry.details.token).toBe("[REDACTED]");
    expect(entry.details.nested.password_hash).toBe("[REDACTED]");
    expect(entry.details.email).toBe("user@srcb.edu.ph");
  });

  it("3. Controller blocks non-Super Admin roles (Admin, Program Head, Teacher) with 403 Forbidden", async () => {
    const rolesToTest = [
      { role: "admin", name: "Dean / Admin" },
      { role: "program_head", name: "Program Head" },
      { role: "teacher", name: "Teacher" },
    ];

    for (const u of rolesToTest) {
      let statusResult = null;
      let jsonResult = null;

      const req = {
        user: { id: 2, role: u.role, name: u.name },
        query: {},
      };
      const res = {
        status: (code) => {
          statusResult = code;
          return {
            json: (data) => {
              jsonResult = data;
            },
          };
        },
      };

      await listLogs(req, res, () => {});

      expect(statusResult).toBe(403);
      expect(jsonResult.code).toBe("UNAUTHORIZED_ROLE");
      expect(jsonResult.error).toContain("Forbidden");
    }
  });

  it("4. Controller permits Super Admin role (200 OK)", async () => {
    let statusResult = 200;
    let jsonResult = null;

    const req = {
      user: { id: 1, role: "super_admin", name: "ICT Super Administrator" },
      query: { page: 1, limit: 10 },
    };
    const res = {
      status: (code) => {
        statusResult = code;
        return {
          json: (data) => {
            jsonResult = data;
          },
        };
      },
      json: (data) => {
        jsonResult = data;
      },
    };

    await listLogs(req, res, () => {});

    expect(statusResult).toBe(200);
    expect(jsonResult).toHaveProperty("data");
    expect(jsonResult).toHaveProperty("pagination");
  });

  it("5. Filter options endpoint returns available modules, actions, and roles", async () => {
    let statusResult = 200;
    let jsonResult = null;

    const req = {
      user: { id: 1, role: "super_admin" },
    };
    const res = {
      json: (data) => {
        jsonResult = data;
      },
    };

    await getFilters(req, res, () => {});

    expect(jsonResult).toHaveProperty("data");
    expect(Array.isArray(jsonResult.data.modules)).toBe(true);
    expect(Array.isArray(jsonResult.data.roles)).toBe(true);
  });

  it("6. System Logs search and filter by Module, Status, and Role", async () => {
    await logAction({
      user: { id: 1, name: "ICT Super Admin", role: "super_admin" },
      module: "Exam Scheduling",
      action: "Created Exam Schedule",
      description: "Created Final exam schedule for IT101 in Room 301.",
      status: "Success",
    });

    await logAction({
      user: { id: 99, name: "Hacker Attempt", role: "unauthenticated" },
      module: "Authentication",
      action: "Failed Login Attempt",
      description: "Failed login attempt with bad credentials.",
      status: "Failed",
    });

    const examLogs = await listSystemLogs({ module: "Exam Scheduling" });
    expect(examLogs.data.some((l) => l.module === "Exam Scheduling")).toBe(true);

    const failedLogs = await listSystemLogs({ status: "Failed" });
    expect(failedLogs.data.some((l) => l.status === "Failed")).toBe(true);

    const searchResults = await listSystemLogs({ search: "IT101" });
    expect(searchResults.data.some((l) => l.description.includes("IT101"))).toBe(true);
  });
});
