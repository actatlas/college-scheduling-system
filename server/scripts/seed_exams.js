const db = require('../utils/db');

async function seedExams() {
  console.log('Seeding examination schedules...');
  try {
    // Check existing exams
    const existing = await db.query('SELECT COUNT(*) AS cnt FROM exam_schedules');
    if (existing[0]?.cnt > 0) {
      await db.query('DELETE FROM exam_schedules');
    }

    const sampleExams = [
      // 1. GE 1 (UNDERSTANDING THE SELF) - Midterm Shared Examination (Multiple Program Assignments)
      {
        term: 'Midterm',
        exam_date: '2026-10-15',
        start_time: '08:00:00',
        end_time: '10:00:00',
        subject_code: 'GE 1',
        section_names: JSON.stringify(['BSIT 2-A']),
        room_number: 'LAB-02',
        building: 'Science Block',
        proctor_id: 'T001',
        proctor_name: 'Maria Santos',
        program_code: 'ITP',
        color: '#0284c7',
      },
      {
        term: 'Midterm',
        exam_date: '2026-10-15',
        start_time: '08:00:00',
        end_time: '10:00:00',
        subject_code: 'GE 1',
        section_names: JSON.stringify(['BSCrim 1-A']),
        room_number: 'R-101',
        building: 'Main Building',
        proctor_id: 'FAC-003',
        proctor_name: 'Marco Sabuero',
        program_code: 'CJEP',
        color: '#0284c7',
      },
      {
        term: 'Midterm',
        exam_date: '2026-10-15',
        start_time: '08:00:00',
        end_time: '10:00:00',
        subject_code: 'GE 1',
        section_names: JSON.stringify(['BSBA 1-A']),
        room_number: 'R-202',
        building: 'Annex',
        proctor_id: 'T353225',
        proctor_name: 'Jovann Achas',
        program_code: 'BAP',
        color: '#0284c7',
      },
      {
        term: 'Midterm',
        exam_date: '2026-10-15',
        start_time: '08:00:00',
        end_time: '10:00:00',
        subject_code: 'GE 1',
        section_names: JSON.stringify(['BSCS 1-A']),
        room_number: 'R-103',
        building: 'College Building',
        proctor_id: 'T552772',
        proctor_name: 'Randrei Llacuna',
        program_code: 'ITP',
        color: '#0284c7',
      },

      // 2. CS101 (Intro to Programming) - Midterm
      {
        term: 'Midterm',
        exam_date: '2026-10-15',
        start_time: '10:30:00',
        end_time: '12:30:00',
        subject_code: 'CS101',
        section_names: JSON.stringify(['BSCS 1-A']),
        room_number: 'LAB-02',
        building: 'Science Block',
        proctor_id: 'T001',
        proctor_name: 'Maria Santos',
        program_code: 'ITP',
        color: '#2563eb',
      },

      // 3. IT 102 (Data Structures and Algorithms) - Midterm
      {
        term: 'Midterm',
        exam_date: '2026-10-15',
        start_time: '13:00:00',
        end_time: '15:00:00',
        subject_code: 'IT 102',
        section_names: JSON.stringify(['BSIT 2-A']),
        room_number: 'LAB-02',
        building: 'Science Block',
        proctor_id: 'T552772',
        proctor_name: 'Randrei Llacuna',
        program_code: 'ITP',
        color: '#2563eb',
      },

      // 4. CRIM 101 (Introduction to Criminology) - Midterm
      {
        term: 'Midterm',
        exam_date: '2026-10-16',
        start_time: '08:00:00',
        end_time: '10:00:00',
        subject_code: 'CRIM 101',
        section_names: JSON.stringify(['BSCrim 1-A']),
        room_number: 'R-101',
        building: 'Main Building',
        proctor_id: 'FAC-003',
        proctor_name: 'Marco Sabuero',
        program_code: 'CJEP',
        color: '#dc2626',
      },

      // 5. BA 101 (Principles of Management) - Midterm
      {
        term: 'Midterm',
        exam_date: '2026-10-16',
        start_time: '10:30:00',
        end_time: '12:30:00',
        subject_code: 'BA 101',
        section_names: JSON.stringify(['BSBA 1-A']),
        room_number: 'R-202',
        building: 'Annex',
        proctor_id: 'T353225',
        proctor_name: 'Jovann Achas',
        program_code: 'BAP',
        color: '#d97706',
      },

      // 6. HM 101 (Introduction to Hospitality Industry) - Midterm
      {
        term: 'Midterm',
        exam_date: '2026-10-16',
        start_time: '13:00:00',
        end_time: '15:00:00',
        subject_code: 'HM 101',
        section_names: JSON.stringify(['BSBA 1-A']),
        room_number: 'R-103',
        building: 'College Building',
        proctor_id: 'T001',
        proctor_name: 'Maria Santos',
        program_code: 'HMP',
        color: '#059669',
      },

      // 7. Prelim Exams
      {
        term: 'Prelim',
        exam_date: '2026-09-20',
        start_time: '08:00:00',
        end_time: '10:00:00',
        subject_code: 'GE 1',
        section_names: JSON.stringify(['BSIT 2-A']),
        room_number: 'LAB-02',
        building: 'Science Block',
        proctor_id: 'T001',
        proctor_name: 'Maria Santos',
        program_code: 'ITP',
        color: '#0284c7',
      },
      {
        term: 'Prelim',
        exam_date: '2026-09-20',
        start_time: '10:30:00',
        end_time: '12:30:00',
        subject_code: 'CS101',
        section_names: JSON.stringify(['BSCS 1-A']),
        room_number: 'LAB-02',
        building: 'Science Block',
        proctor_id: 'T552772',
        proctor_name: 'Randrei Llacuna',
        program_code: 'ITP',
        color: '#2563eb',
      },
    ];

    for (const ex of sampleExams) {
      await db.query(
        `INSERT INTO exam_schedules (term, exam_date, start_time, end_time, subject_code, section_names, room_number, building, proctor_id, proctor_name, program_code, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ex.term,
          ex.exam_date,
          ex.start_time,
          ex.end_time,
          ex.subject_code,
          ex.section_names,
          ex.room_number,
          ex.building,
          ex.proctor_id,
          ex.proctor_name,
          ex.program_code,
          ex.color,
        ]
      );
    }

    console.log(`Successfully seeded ${sampleExams.length} sample examination schedules.`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding exam schedules:', err);
    process.exit(1);
  }
}

seedExams();
