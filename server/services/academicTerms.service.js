const { query } = require('../utils/db');

async function ensureSettingsTables() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) {
    // ignore if table exists or mock
  }
}

async function listAcademicYears() {
  const rows = await query('SELECT id, name, is_active FROM academic_years ORDER BY id DESC');
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    isActive: Boolean(r.is_active),
  }));
}

async function createAcademicYear({ name, isActive = false }) {
  if (!name) {
    const err = new Error('Academic year name is required (e.g. 2026-2027)');
    err.statusCode = 400;
    throw err;
  }

  if (isActive) {
    await query('UPDATE academic_years SET is_active = FALSE');
  }

  const [res] = await query(
    'INSERT INTO academic_years (name, is_active) VALUES (?, ?)',
    [String(name).trim(), Boolean(isActive)]
  );
  const insertId = res?.insertId || res?.[0]?.insertId;
  return { id: Number(insertId), name: String(name).trim(), isActive: Boolean(isActive) };
}

async function setActiveAcademicYear(id) {
  await query('UPDATE academic_years SET is_active = FALSE');
  await query('UPDATE academic_years SET is_active = TRUE WHERE id = ?', [id]);
  return listAcademicYears();
}

async function listSemesters() {
  const rows = await query('SELECT id, name, is_active FROM semesters ORDER BY id ASC');
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    isActive: Boolean(r.is_active),
  }));
}

async function createSemester({ name, isActive = false }) {
  if (!name) {
    const err = new Error('Semester name is required (e.g. 1st Semester)');
    err.statusCode = 400;
    throw err;
  }

  if (isActive) {
    await query('UPDATE semesters SET is_active = FALSE');
  }

  const [res] = await query(
    'INSERT INTO semesters (name, is_active) VALUES (?, ?)',
    [String(name).trim(), Boolean(isActive)]
  );
  const insertId = res?.insertId || res?.[0]?.insertId;
  return { id: Number(insertId), name: String(name).trim(), isActive: Boolean(isActive) };
}

async function setActiveSemester(id) {
  await query('UPDATE semesters SET is_active = FALSE');
  await query('UPDATE semesters SET is_active = TRUE WHERE id = ?', [id]);
  return listSemesters();
}

async function getActiveTerm() {
  const [activeYear] = await query('SELECT id, name FROM academic_years WHERE is_active = TRUE LIMIT 1');
  const [activeSem] = await query('SELECT id, name FROM semesters WHERE is_active = TRUE LIMIT 1');

  return {
    academicYear: activeYear ? { id: Number(activeYear.id), name: activeYear.name } : null,
    semester: activeSem ? { id: Number(activeSem.id), name: activeSem.name } : null,
  };
}

const DEFAULT_SETTINGS = {
  institutionName: "St. Rita's College of Balingasag",
  institutionCode: "SRCB",
  academicYear: "2026-2027",
  semester: "1st Semester",
  standardClassDuration: "90",
  defaultModality: "Face-to-Face",
  allowSaturdayClasses: true,
  enforceAvailabilityStrict: true,
  maxFullTimeLoadHours: 24,
  maxPartTimeLoadHours: 12,
};

async function getSystemSettings() {
  await ensureSettingsTables();
  let rows = [];
  try {
    rows = await query('SELECT setting_key, setting_value FROM system_settings');
  } catch (e) {
    rows = [];
  }

  const settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    try {
      settings[r.setting_key] = JSON.parse(r.setting_value);
    } catch {
      settings[r.setting_key] = r.setting_value;
    }
  }

  // Synchronize with active terms from DB if available
  const active = await getActiveTerm();
  if (active.academicYear) settings.academicYear = active.academicYear.name;
  if (active.semester) settings.semester = active.semester.name;

  return settings;
}

async function updateSystemSettings(newSettings = {}) {
  await ensureSettingsTables();
  for (const [k, v] of Object.entries(newSettings)) {
    const val = typeof v === 'object' || typeof v === 'boolean' || typeof v === 'number' ? JSON.stringify(v) : String(v);
    await query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [k, val, val]
    );
  }

  // If academicYear was changed, check if it matches an existing academic_year and activate it
  if (newSettings.academicYear) {
    const [ay] = await query('SELECT id FROM academic_years WHERE name = ? LIMIT 1', [newSettings.academicYear]);
    if (ay) {
      await setActiveAcademicYear(ay.id);
    } else {
      await createAcademicYear({ name: newSettings.academicYear, isActive: true });
    }
  }

  // If semester was changed, check if it matches an existing semester and activate it
  if (newSettings.semester) {
    const [sem] = await query('SELECT id FROM semesters WHERE name = ? LIMIT 1', [newSettings.semester]);
    if (sem) {
      await setActiveSemester(sem.id);
    } else {
      await createSemester({ name: newSettings.semester, isActive: true });
    }
  }

  return getSystemSettings();
}

module.exports = {
  academicTermsService: {
    listAcademicYears,
    createAcademicYear,
    setActiveAcademicYear,
    listSemesters,
    createSemester,
    setActiveSemester,
    getActiveTerm,
    getSystemSettings,
    updateSystemSettings,
  },
};
