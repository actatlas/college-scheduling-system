const { pool } = require('../database/pool');

async function clearAcademicData() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting academic data purge...');
    await connection.beginTransaction();

    // Disable foreign key checks for clean cascading purge
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    const tablesToClear = [
      'schedules',
      'exam_schedules',
      'teacher_availability',
      'notifications',
      'sections',
      'subjects',
      'teachers',
      'rooms'
    ];

    for (const table of tablesToClear) {
      const [res] = await connection.query(`DELETE FROM ${table}`);
      console.log(`Cleared table ${table} (${res.affectedRows || 0} rows deleted)`);
      // Reset auto increment where applicable
      try {
        await connection.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      } catch {
        // Some tables might have non-numeric PK or fail silently
      }
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.commit();

    console.log('Academic data successfully cleared!');

    // Report remaining counts
    console.log('\n--- VERIFYING REMAINING DATA ---');
    const allTables = [
      'users',
      'programs',
      'courses',
      'schedules',
      'exam_schedules',
      'teacher_availability',
      'sections',
      'subjects',
      'teachers',
      'rooms',
      'notifications'
    ];

    for (const t of allTables) {
      const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${t}`);
      console.log(`${t.padEnd(25)}: ${rows[0].count} rows`);
    }

  } catch (error) {
    await connection.rollback();
    console.error('Error clearing academic data:', error);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

clearAcademicData();
