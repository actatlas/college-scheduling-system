require('dotenv').config();
const { pool } = require('../database/pool');

async function seedFinalLoading() {
  const conn = await pool.getConnection();
  try {
    console.log('--- Seeding SRCB Official Final Loading Schedules ---');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Ensure Academic Year & Semester
    await conn.query(`
      INSERT INTO academic_years (id, name, is_active)
      VALUES (1, '2026-2027', TRUE)
      ON DUPLICATE KEY UPDATE is_active = TRUE
    `);
    await conn.query(`
      INSERT INTO semesters (id, name, is_active)
      VALUES (1, '1st Semester', TRUE), (2, '2nd Semester', FALSE)
      ON DUPLICATE KEY UPDATE is_active = VALUES(is_active)
    `);

    // 2. Programs
    const programs = [
      ['CJEP', 'Criminal Justice Education Program', 'Criminology & Law Enforcement'],
      ['TEP', 'Teacher Education Program', 'Secondary & Elementary Education'],
      ['ITP', 'Information Technology Program', 'Computing & IT'],
      ['HMP', 'Hospitality Management Program', 'Hotel, Restaurant & Tourism'],
      ['BAP', 'Business Administration Program', 'Business Management & Marketing'],
      ['ALL', 'General Education Department', 'Institutional Core Curriculum']
    ];
    for (const [code, name, focus] of programs) {
      await conn.query(`
        INSERT INTO programs (code, name, focus)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), focus = VALUES(focus)
      `, [code, name, focus]);
    }

    // 3. Program Majors
    const majors = [
      ['BSCRIM', 'Bachelor of Science in Criminology', 'CJEP'],
      ['BSED', 'Bachelor of Secondary Education', 'TEP'],
      ['BEED', 'Bachelor of Elementary Education', 'TEP'],
      ['BSIT', 'Bachelor of Science in Information Technology', 'ITP'],
      ['BSHM', 'Bachelor of Science in Hospitality Management', 'HMP'],
      ['BSBA', 'Bachelor of Science in Business Administration', 'BAP']
    ];
    for (const [code, name, pCode] of majors) {
      await conn.query(`
        INSERT INTO program_majors (code, name, program_code)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), program_code = VALUES(program_code)
      `, [code, name, pCode]);
    }

    // 4. Courses
    const courses = [
      ['BSCRIM', 'Bachelor of Science in Criminology', 'CJEP', 4],
      ['BSED', 'Bachelor of Secondary Education', 'TEP', 4],
      ['BEED', 'Bachelor of Elementary Education', 'TEP', 4],
      ['BSIT', 'Bachelor of Science in Information Technology', 'ITP', 4],
      ['BSHM', 'Bachelor of Science in Hospitality Management', 'HMP', 4],
      ['BSBA', 'Bachelor of Science in Business Administration', 'BAP', 4]
    ];
    for (const [code, name, pCode, dur] of courses) {
      await conn.query(`
        INSERT INTO courses (code, name, program_code, year_duration)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), program_code = VALUES(program_code)
      `, [code, name, pCode, dur]);
    }

    // 5. Teachers from Final Loading Document
    const facultyList = [
      ['T-ABEJ-G', 'ABEJARON, Godilla K.', 'Full-Time', 'TEP'],
      ['T-ABEJ-R', 'ABEJARON, Rene K.', 'Full-Time', 'TEP'],
      ['T-BACO', 'BACOMO, Paul Francis', 'Full-Time', 'ALL'],
      ['T-CAGA', 'CAGAS, Rina Lorraine D.', 'Full-Time', 'TEP'],
      ['T-LACA', 'LACAY, Maricor', 'Full-Time', 'TEP'],
      ['T-LLOR', 'LLOREN, Baltazar', 'Full-Time', 'ALL'],
      ['T-LUMA', 'LUMACAD, Gernel', 'Full-Time', 'ALL'],
      ['T-OCLA', 'OCLARIT, Manuel', 'Full-Time', 'ALL'],
      ['T-SALV', 'SALVAÑA, Jestoni E.', 'Full-Time', 'TEP'],
      ['T-DAGA', 'DAGALA, Jocoh', 'Full-Time', 'CJEP'],
      ['T-SILV', 'SILVA, Eugene D.', 'Full-Time', 'HMP'],
      ['T-VALM', 'VALMORIA, Dominic A.', 'Full-Time', 'HMP'],
      ['T-LABO', 'LABOR, Frau Anjenet G.', 'Part-Time', 'HMP'],
      ['T-ACOB', 'ACOBO, Aliyah', 'Part-Time', 'TEP'],
      ['T-AWIT', 'AWITIN, Marilou', 'Part-Time', 'BAP'],
      ['T-CALO', 'CALOTES, Francis', 'Part-Time', 'TEP'],
      ['T-DAGU', 'DAGUIMOL, Mark Don V.', 'Part-Time', 'ITP'],
      ['T-DAPA', 'DAPAT, Henebe', 'Part-Time', 'TEP'],
      ['T-GODI', 'GODINEZ, Charles Darwin O.', 'Full-Time', 'TEP'],
      ['T-MAGA', 'MAGALLON, Daniel A.', 'Part-Time', 'TEP'],
      ['T-NAEL', 'NAELGA, Ronald', 'Part-Time', 'TEP'],
      ['T-LONO', 'LONOY, Ryan', 'Part-Time', 'TEP'],
      ['T-SANT', 'SANTUA, Ly', 'Part-Time', 'ALL'],
      ['T-SOBR', 'SOBRADO, Nino', 'Part-Time', 'HMP'],
      ['T-JO', 'JO, Loraine', 'Part-Time', 'TEP'],
      ['T-RANO', 'RANOCO, Ian', 'Part-Time', 'ALL'],
      ['T-MARC', 'MARCELINO, P.', 'Full-Time', 'CJEP']
    ];

    for (const [id, name, status, pCode] of facultyList) {
      await conn.query(`
        INSERT INTO teachers (id, name, status)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status)
      `, [id, name, status]);
    }

    // 6. Rooms from Final Loading Document
    const roomsList = [
      ['101', 45, 'Main Building', 'Lecture', 'active'],
      ['301', 45, 'Main Building', 'Lecture', 'active'],
      ['302', 45, 'Main Building', 'Lecture', 'active'],
      ['303', 45, 'Main Building', 'Lecture', 'active'],
      ['401', 45, 'Main Building', 'Lecture', 'active'],
      ['402', 45, 'Main Building', 'Lecture', 'active'],
      ['403', 45, 'Main Building', 'Lecture', 'active'],
      ['Crim Lab', 40, 'CJEP Wing', 'Laboratory', 'active'],
      ['HM LAB', 35, 'Hospitality Wing', 'Laboratory', 'active'],
      ['SCI LAB', 35, 'Science Block', 'Laboratory', 'active'],
      ['Gen. Ed. Lab', 40, 'IT Building', 'Laboratory', 'active'],
      ['AVR', 60, 'Main Building', 'Audio-Visual', 'active'],
      ['SHS', 45, 'SHS Building', 'Lecture', 'active'],
      ['SHS 302', 45, 'SHS Building', 'Lecture', 'active'],
      ['SHS 402', 45, 'SHS Building', 'Lecture', 'active'],
      ['SHS 404', 45, 'SHS Building', 'Lecture', 'active'],
      ['SHS 408', 45, 'SHS Building', 'Lecture', 'active'],
      ['SRCB Ground', 100, 'Campus Grounds', 'Athletic', 'active'],
      ['GYM', 100, 'Gymnasium', 'Athletic', 'active'],
      ['Outer Ground', 100, 'Tactical Grounds', 'Athletic', 'active'],
      ['TBA', 50, 'Main Building', 'Lecture', 'active'],
      ['Online', 100, 'Virtual Campus', 'Online', 'active']
    ];

    for (const [number, cap, bld, type, st] of roomsList) {
      await conn.query(`
        INSERT INTO rooms (number, capacity, building, type, status)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE capacity = VALUES(capacity), building = VALUES(building), type = VALUES(type), status = VALUES(status)
      `, [number, cap, bld, type, st]);
    }

    // 7. Sections
    const sectionRows = [
      // CJEP
      ['BSCRIM', 1, '1-A', 'T-DAGA', 35],
      ['BSCRIM', 2, '2-A', 'T-MARC', 35],
      ['BSCRIM', 3, '3-A', 'T-MARC', 30],
      ['BSCRIM', 4, '4-A', 'T-DAGA', 28],
      // TEP
      ['BSED', 1, '1-A', 'T-SALV', 32],
      ['BSED', 2, '2-A', 'T-SALV', 30],
      ['BSED', 3, '3-A', 'T-CAGA', 28],
      ['BSED', 4, '4-A', 'T-CAGA', 25],
      // IT
      ['BSIT', 1, '1-A', 'T-DAGU', 30],
      ['BSIT', 2, '2-A', 'T-DAGU', 25],
      ['BSIT', 3, '3-A', 'T-DAGU', 20],
      // HM
      ['BSHM', 1, '1-A', 'T-SILV', 28],
      ['BSHM', 2, '2-A', 'T-VALM', 25],
      ['BSHM', 3, '3-A', 'T-SILV', 22],
      ['BSHM', 4, '4-A', 'T-VALM', 20],
      // BA
      ['BSBA', 1, '1-A', 'T-AWIT', 35],
      ['BSBA', 1, '1-B', 'T-AWIT', 32],
      ['BSBA', 2, '2-A', 'T-AWIT', 30],
      ['BSBA', 2, '2-B', 'T-AWIT', 28],
      ['BSBA', 4, '4-A', 'T-LUMA', 25]
    ];

    const sectionMap = {};
    for (const [course, yl, label, adv, students] of sectionRows) {
      await conn.query(`
        INSERT INTO sections (course_code, year_level, section_label, adviser_id, students, semester_id, academic_year_id)
        VALUES (?, ?, ?, ?, ?, 1, 1)
        ON DUPLICATE KEY UPDATE adviser_id = VALUES(adviser_id), students = VALUES(students)
      `, [course, yl, label, adv, students]);

      const [res] = await conn.query(`
        SELECT id FROM sections
        WHERE course_code = ? AND year_level = ? AND section_label = ? AND semester_id = 1 AND academic_year_id = 1
        LIMIT 1
      `, [course, yl, label]);
      if (res && res[0]) {
        sectionMap[`${course}-${yl}-${label}`] = res[0].id;
      }
    }

    // 8. Subjects from Document
    const subjectsData = [
      // CJEP Subjects
      ['GE 2', 'Readings in Philippine History', 3, 3, 0, 'ALL', 'T-LACA'],
      ['CRIM 1', 'Introduction to Criminology', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['GE 4', 'Mathematics in the Modern World', 3, 3, 0, 'ALL', 'T-OCLA'],
      ['RS 1', 'Essentials of Catholic Faith and Life', 3, 3, 0, 'ALL', 'T-LLOR'],
      ['GE 1', 'Understanding the Self', 3, 3, 0, 'ALL', 'T-SANT'],
      ['AS 1', 'Arnis and Disarming Techniques', 3, 2, 1, 'CJEP', 'T-MARC'],
      ['CLJ 1', 'Introduction to Philippine Criminal Justice System', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['RS 2', 'Religions, Religious Experience, and Spirituality', 3, 3, 0, 'ALL', 'T-BACO'],
      ['LEA 1', 'Law Enforcement Organization and Administration', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['Forensic 1', 'Forensic Photography', 4, 3, 1, 'CJEP', 'T-MARC'],
      ['CD 1', 'Fundamentals of Criminal Investigation', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['CA 1', 'Institutional Corrections', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['NS 1', 'General Chemistry (Organic / Forensic)', 3, 2, 1, 'CJEP', 'T-ABEJ-R'],
      ['AS 3', 'First Aid and Water Safety', 3, 1, 2, 'CJEP', 'T-MARC'],
      ['Forensic 4', 'Questioned Documents Examination', 4, 3, 1, 'CJEP', 'T-MARC'],
      ['LEA 4', 'Police Intelligence and Secret Service', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['CDI 14', 'Specialized Crime Investigation with Legal Medicine', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['CLJ 3', 'Criminal Law (Book 1)', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['CRIM 5', 'Human Rights Education', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['CRIM 4', 'Professional Conduct and Ethical Standards', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['CDI 5', 'Technical English 1 (Investigative Report Writing)', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['AS 5', 'Marksmanship and Combat Shooting', 3, 1, 2, 'CJEP', 'T-MARC'],
      ['CRIM 8', 'Criminological Research 2 (Thesis)', 3, 3, 0, 'CJEP', 'T-DAGA'],
      ['Forensic 6', 'Polygraphy (Lie Detection)', 3, 2, 1, 'CJEP', 'T-MARC'],
      ['CDI 9', 'Cybercrime and Environmental Laws and Protection', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['CDI 8', 'Fire Technology and Arson Investigation', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['CLJ 6', 'Criminal Procedure and Court Testimony', 3, 3, 0, 'CJEP', 'T-MARC'],
      ['PIC', 'Philippine Indigenous Communities', 3, 3, 0, 'CJEP', 'T-DAPA'],
      ['CJE-E1', 'Criminology Professional Practicum (Mock Board)', 3, 0, 3, 'CJEP', 'T-MARC'],

      // TEP Subjects
      ['Fil 109', 'Paghahanda at Ebalwasyon ng Kagamitang Panturo', 3, 3, 0, 'TEP', 'T-ABEJ-G'],
      ['Fil 108', 'Mga Natatanging Diskurso sa Wika at Panitikan', 3, 3, 0, 'TEP', 'T-ABEJ-G'],
      ['ELT 3', 'Language Learning Materials Development', 3, 3, 0, 'TEP', 'T-ABEJ-G'],
      ['Educ 1', 'The Teaching Profession', 3, 3, 0, 'TEP', 'T-ABEJ-G'],
      ['Educ 3', 'Facilitating Learner-Centered Teaching', 3, 3, 0, 'TEP', 'T-ABEJ-G'],
      ['EDUC 2', 'The Child and Adolescent Learners', 3, 3, 0, 'TEP', 'T-ACOB'],
      ['S101', 'Earth Science', 3, 3, 0, 'TEP', 'T-ABEJ-R'],
      ['C101', 'Inorganic Chemistry', 5, 3, 2, 'TEP', 'T-ABEJ-R'],
      ['S105', 'The Teaching of Science', 3, 3, 0, 'TEP', 'T-ABEJ-R'],
      ['S104', 'Meteorology', 3, 3, 0, 'TEP', 'T-ABEJ-R'],
      ['B102', 'Microbiology and Parasitology', 4, 3, 1, 'TEP', 'T-ABEJ-R'],
      ['C107', 'Biochemistry', 3, 3, 0, 'TEP', 'T-ABEJ-R'],
      ['ELEC 1', 'Malikhaing Pagsulat / Creative Writing', 3, 3, 0, 'TEP', 'T-LACA'],
      ['Educ 6', 'Building and Enhancing New Literacies', 3, 3, 0, 'TEP', 'T-LACA'],
      ['Fil 110', 'Pagtuturo at Pagtataya ng Makrong Kasanayan', 3, 3, 0, 'TEP', 'T-LACA'],
      ['EDUC 5', 'The Teacher and the School Curriculum', 3, 3, 0, 'TEP', 'T-SALV'],
      ['EDUC 7', 'Foundation of Special and Inclusive Education', 3, 3, 0, 'TEP', 'T-SALV'],
      ['ELT 1', 'Principles and Theories of Language Acquisition', 3, 3, 0, 'TEP', 'T-SALV'],
      ['EDUC 4', 'Technology for Teaching and Learning 1', 3, 3, 0, 'TEP', 'T-SALV'],
      ['EDUC 9', 'The Teacher and the Community', 3, 3, 0, 'TEP', 'T-SALV'],
      ['ELT 5', 'Teaching and Assessment of Grammar', 3, 3, 0, 'TEP', 'T-SALV'],
      ['EDUC 8', 'Assessment in Learning 1', 3, 3, 0, 'TEP', 'T-GODI'],
      ['Educ 11', 'Field Study 1 (Observations of Teaching)', 3, 1, 2, 'TEP', 'T-CAGA'],
      ['Educ 12', 'Field Study 2 (Participation and Teaching Assist)', 3, 1, 2, 'TEP', 'T-CAGA'],
      ['M102', 'Trigonometry', 3, 3, 0, 'TEP', 'T-LUMA'],
      ['M103', 'Plane and Solid Geometry', 3, 3, 0, 'TEP', 'T-LUMA'],
      ['M104', 'Logic and Set Theory', 3, 3, 0, 'TEP', 'T-LUMA'],
      ['M112', 'Calculus 2', 3, 3, 0, 'TEP', 'T-DAGU'],
      ['M113', 'Advanced Statistics', 3, 3, 0, 'TEP', 'T-LUMA'],
      ['M114', 'Problem Solving, Investigation and Modeling', 3, 3, 0, 'TEP', 'T-LUMA'],
      ['C108', 'Modern Physics', 3, 3, 0, 'TEP', 'T-LUMA'],
      ['B103', 'Anatomy and Physiology', 3, 2, 1, 'TEP', 'T-MAGA'],
      ['PathFit 1', 'Movement Competency Training (MCT)', 2, 2, 0, 'TEP', 'T-NAEL'],
      ['PathFit 3', 'Dancing / Fitness Dance', 2, 2, 0, 'TEP', 'T-NAEL'],
      ['LING 1', 'Introduction to Linguistics', 3, 3, 0, 'TEP', 'T-ACOB'],
      ['LING 3', 'Structure of English', 3, 3, 0, 'TEP', 'T-ACOB'],
      ['ELT 6', 'Speech and Stage Arts', 3, 2, 1, 'TEP', 'T-ACOB'],
      ['ELT 7', 'Technical Writing', 3, 3, 0, 'TEP', 'T-CALO'],
      ['LIT 105', 'Sanaysay at Talumpati', 3, 3, 0, 'TEP', 'T-LONO'],
      ['FIL 103', 'Ugnayan ng Wika, Kultura at Lipunan', 3, 3, 0, 'TEP', 'T-LONO'],
      ['FIL 104', 'Ang Filipino sa Kurikulum ng Batayang Edukasyon', 3, 3, 0, 'TEP', 'T-DAPA'],
      ['FL', 'Foreign Language 1', 3, 3, 0, 'TEP', 'T-AWIT'],
      ['GE 3', 'The Contemporary World', 3, 3, 0, 'ALL', 'T-RANO'],

      // IT Subjects
      ['GE 9', "Rizal's Life, Works, and Writing", 3, 3, 0, 'ALL', 'T-ABEJ-G'],
      ['ITP 301', 'Quantitative Methods in IT', 3, 2, 1, 'ITP', 'T-DAGU'],
      ['Peace Ed', 'Peace Education and Conflict Resolution', 3, 3, 0, 'ITP', 'T-LACA'],
      ['PE 1', 'Physical Fitness and Wellness', 2, 2, 0, 'ALL', 'T-SOBR'],

      // HM Subjects
      ['THC 1', 'Risk Management Applied to Safety & Sanitation', 3, 3, 0, 'HMP', 'T-SILV'],
      ['BME 1', 'Operations Management in Tourism and Hospitality', 3, 3, 0, 'HMP', 'T-VALM'],
      ['HPC 3', 'Fundamentals in Lodging Operations', 3, 2, 1, 'HMP', 'T-SILV'],
      ['HPC 2', 'Fundamentals in Food Service Operations', 6, 2, 4, 'HMP', 'T-VALM'],
      ['HPE 1', 'Culinary Fundamentals', 5, 2, 3, 'HMP', 'T-SILV'],
      ['THC 3', 'Micro Perspective of Tourism and Hospitality', 3, 3, 0, 'HMP', 'T-VALM'],
      ['THC 4', 'Philippine Tourism, Geography and Culture', 3, 3, 0, 'HMP', 'T-SILV'],
      ['RS 2A', 'Religions and Spirituality (Hospitality)', 3, 3, 0, 'ALL', 'T-BACO'],
      ['HPC 6A', 'Research in Hospitality', 3, 3, 0, 'HMP', 'T-LUMA'],
      ['GE 8', 'Ethics', 3, 3, 0, 'ALL', 'T-LLOR'],
      ['THC 5', 'Tourism and Hospitality Marketing', 3, 3, 0, 'HMP', 'T-VALM'],
      ['THC 7', 'Quality Service Management in Hospitality', 3, 3, 0, 'HMP', 'T-VALM'],
      ['THC 6', 'Professional Development and Applied Ethics', 3, 3, 0, 'HMP', 'T-SILV'],
      ['HPC 5', 'Supply Chain Management in Hospitality', 3, 3, 0, 'HMP', 'T-VALM'],
      ['PE 3', 'Swimming and Aquatics', 2, 1, 1, 'HMP', 'T-SOBR'],
      ['HPE 5', 'Catering Management with Menu Design', 6, 2, 4, 'HMP', 'T-SILV'],
      ['BME 3', 'Strategic Management in Tourism and Hospitality', 3, 3, 0, 'HMP', 'T-VALM'],
      ['THC 10', 'Entrepreneurship in Tourism and Hospitality', 3, 3, 0, 'HMP', 'T-VALM'],
      ['HPC 10', 'Foreign Language 2 (German)', 3, 3, 0, 'HMP', 'T-LABO'],

      // BA Subjects
      ['GEEL 14', 'Gender and Society', 3, 3, 0, 'ALL', 'T-ABEJ-G'],
      ['RS 2B', 'Religions and Spirituality (Business)', 3, 3, 0, 'ALL', 'T-BACO'],
      ['BACC 7', 'Business Research / Thesis', 3, 3, 0, 'BAP', 'T-LUMA'],
      ['GE 7', 'Science, Technology and Society', 3, 3, 0, 'ALL', 'T-DAGA']
    ];

    for (const [code, name, units, lec, lab, prog, inst] of subjectsData) {
      await conn.query(`
        INSERT INTO subjects (code, name, units, lecture_hours, lab_hours, semester_id, program_code, instructor_id)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), units = VALUES(units), program_code = VALUES(program_code), instructor_id = VALUES(instructor_id)
      `, [code, name, units, lec, lab, prog, inst]);
    }

    // 9. Clear old placeholder schedules
    await conn.query('DELETE FROM schedules WHERE semester_id = 1 AND academic_year_id = 1');

    // 10. Insert Class Schedules from Final Loading Document
    const schedulesList = [
      // ==========================================
      // CJEP 1ST YEAR (Page 18)
      // ==========================================
      ['Monday', '07:30:00', '09:00:00', 'GE 2', sectionMap['BSCRIM-1-1-A'], 'T-LACA', '303', '#172554'],
      ['Thursday', '07:30:00', '09:00:00', 'GE 2', sectionMap['BSCRIM-1-1-A'], 'T-LACA', '303', '#172554'],
      ['Monday', '09:00:00', '10:30:00', 'CRIM 1', sectionMap['BSCRIM-1-1-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Thursday', '09:00:00', '10:30:00', 'CRIM 1', sectionMap['BSCRIM-1-1-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Monday', '10:30:00', '12:00:00', 'GE 4', sectionMap['BSCRIM-1-1-A'], 'T-OCLA', '401', '#172554'],
      ['Thursday', '10:30:00', '12:00:00', 'GE 4', sectionMap['BSCRIM-1-1-A'], 'T-OCLA', '401', '#172554'],
      ['Monday', '14:30:00', '16:00:00', 'RS 1', sectionMap['BSCRIM-1-1-A'], 'T-LLOR', '302', '#172554'],
      ['Thursday', '14:30:00', '16:00:00', 'RS 1', sectionMap['BSCRIM-1-1-A'], 'T-LLOR', '302', '#172554'],
      ['Wednesday', '17:30:00', '20:00:00', 'GE 1', sectionMap['BSCRIM-1-1-A'], 'T-SANT', '302', '#172554'],
      ['Saturday', '07:00:00', '10:00:00', 'AS 1', sectionMap['BSCRIM-1-1-A'], 'T-MARC', 'Outer Ground', '#172554'],

      // ==========================================
      // CJEP 2ND YEAR (Page 19)
      // ==========================================
      ['Monday', '07:30:00', '09:00:00', 'CLJ 1', sectionMap['BSCRIM-2-2-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Thursday', '07:30:00', '09:00:00', 'CLJ 1', sectionMap['BSCRIM-2-2-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Monday', '09:00:00', '10:30:00', 'RS 2', sectionMap['BSCRIM-2-2-A'], 'T-BACO', '402', '#172554'],
      ['Thursday', '09:00:00', '10:30:00', 'RS 2', sectionMap['BSCRIM-2-2-A'], 'T-BACO', '402', '#172554'],
      ['Monday', '10:30:00', '12:00:00', 'LEA 1', sectionMap['BSCRIM-2-2-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Thursday', '10:30:00', '12:00:00', 'LEA 1', sectionMap['BSCRIM-2-2-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Monday', '13:00:00', '14:30:00', 'Forensic 1', sectionMap['BSCRIM-2-2-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Thursday', '13:00:00', '14:30:00', 'Forensic 1', sectionMap['BSCRIM-2-2-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Monday', '14:30:00', '16:00:00', 'CD 1', sectionMap['BSCRIM-2-2-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Thursday', '14:30:00', '16:00:00', 'CD 1', sectionMap['BSCRIM-2-2-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Monday', '16:00:00', '17:30:00', 'CA 1', sectionMap['BSCRIM-2-2-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Thursday', '16:00:00', '17:30:00', 'CA 1', sectionMap['BSCRIM-2-2-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Wednesday', '16:00:00', '19:00:00', 'NS 1', sectionMap['BSCRIM-2-2-A'], 'T-ABEJ-R', '303', '#172554'],
      ['Saturday', '07:00:00', '10:00:00', 'AS 3', sectionMap['BSCRIM-2-2-A'], 'T-MARC', 'Outer Ground', '#172554'],

      // ==========================================
      // CJEP 3RD YEAR (Page 20)
      // ==========================================
      ['Monday', '07:30:00', '09:00:00', 'Forensic 4', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Thursday', '07:30:00', '09:00:00', 'Forensic 4', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Monday', '09:00:00', '10:30:00', 'LEA 4', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Thursday', '09:00:00', '10:30:00', 'LEA 4', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Monday', '10:30:00', '12:00:00', 'CDI 14', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Thursday', '10:30:00', '12:00:00', 'CDI 14', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Monday', '13:00:00', '14:30:00', 'CRIM 5', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Thursday', '13:00:00', '14:30:00', 'CRIM 5', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Monday', '14:30:00', '16:00:00', 'CRIM 4', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Thursday', '14:30:00', '16:00:00', 'CRIM 4', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Monday', '16:00:00', '17:30:00', 'CDI 5', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Thursday', '16:00:00', '17:30:00', 'CDI 5', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Wednesday', '13:00:00', '16:00:00', 'CLJ 3', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Saturday', '07:00:00', '10:00:00', 'AS 5', sectionMap['BSCRIM-3-3-A'], 'T-MARC', 'Outer Ground', '#172554'],

      // ==========================================
      // CJEP 4TH YEAR (Page 21)
      // ==========================================
      ['Monday', '07:30:00', '09:00:00', 'CRIM 8', sectionMap['BSCRIM-4-4-A'], 'T-DAGA', '403', '#172554'],
      ['Thursday', '07:30:00', '09:00:00', 'CRIM 8', sectionMap['BSCRIM-4-4-A'], 'T-DAGA', '403', '#172554'],
      ['Monday', '09:00:00', '10:30:00', 'Forensic 6', sectionMap['BSCRIM-4-4-A'], 'T-MARC', '403', '#172554'],
      ['Thursday', '09:00:00', '10:30:00', 'Forensic 6', sectionMap['BSCRIM-4-4-A'], 'T-MARC', '403', '#172554'],
      ['Monday', '10:30:00', '12:00:00', 'CDI 9', sectionMap['BSCRIM-4-4-A'], 'T-MARC', '403', '#172554'],
      ['Thursday', '10:30:00', '12:00:00', 'CDI 9', sectionMap['BSCRIM-4-4-A'], 'T-MARC', '403', '#172554'],
      ['Monday', '14:30:00', '16:00:00', 'CDI 8', sectionMap['BSCRIM-4-4-A'], 'T-MARC', '303', '#172554'],
      ['Thursday', '14:30:00', '16:00:00', 'CDI 8', sectionMap['BSCRIM-4-4-A'], 'T-MARC', '303', '#172554'],
      ['Wednesday', '16:00:00', '19:00:00', 'CLJ 6', sectionMap['BSCRIM-4-4-A'], 'T-MARC', 'Crim Lab', '#172554'],
      ['Wednesday', '17:00:00', '20:00:00', 'PIC', sectionMap['BSCRIM-4-4-A'], 'T-DAPA', '303', '#172554'],
      ['Saturday', '07:00:00', '10:00:00', 'CJE-E1', sectionMap['BSCRIM-4-4-A'], 'T-MARC', 'Crim Lab', '#172554'],

      // ==========================================
      // TEP (Teacher Education Program)
      // ==========================================
      ['Monday', '07:30:00', '09:00:00', 'Fil 109', sectionMap['BSED-2-2-A'], 'T-ABEJ-G', '303', '#2563eb'],
      ['Thursday', '07:30:00', '09:00:00', 'Fil 109', sectionMap['BSED-2-2-A'], 'T-ABEJ-G', '303', '#2563eb'],
      ['Monday', '09:00:00', '10:30:00', 'Fil 108', sectionMap['BSED-3-3-A'], 'T-ABEJ-G', '101', '#2563eb'],
      ['Thursday', '09:00:00', '10:30:00', 'Fil 108', sectionMap['BSED-3-3-A'], 'T-ABEJ-G', '101', '#2563eb'],
      ['Monday', '13:00:00', '14:30:00', 'ELT 3', sectionMap['BSED-3-3-A'], 'T-ABEJ-G', '301', '#2563eb'],
      ['Thursday', '13:00:00', '14:30:00', 'ELT 3', sectionMap['BSED-3-3-A'], 'T-ABEJ-G', '301', '#2563eb'],
      ['Monday', '14:30:00', '16:00:00', 'Educ 1', sectionMap['BSED-2-2-A'], 'T-ABEJ-G', '301', '#2563eb'],
      ['Thursday', '14:30:00', '16:00:00', 'Educ 1', sectionMap['BSED-2-2-A'], 'T-ABEJ-G', '301', '#2563eb'],
      ['Monday', '16:00:00', '17:30:00', 'Educ 3', sectionMap['BSED-2-2-A'], 'T-ABEJ-G', '301', '#2563eb'],
      ['Thursday', '16:00:00', '17:30:00', 'Educ 3', sectionMap['BSED-2-2-A'], 'T-ABEJ-G', '301', '#2563eb'],
      ['Tuesday', '07:30:00', '09:00:00', 'S101', sectionMap['BSED-1-1-A'], 'T-ABEJ-R', 'SCI LAB', '#2563eb'],
      ['Friday', '07:30:00', '09:00:00', 'S101', sectionMap['BSED-1-1-A'], 'T-ABEJ-R', 'SCI LAB', '#2563eb'],
      ['Tuesday', '10:30:00', '12:00:00', 'C101', sectionMap['BSED-2-2-A'], 'T-ABEJ-R', 'SCI LAB', '#2563eb'],
      ['Friday', '10:30:00', '12:00:00', 'C101', sectionMap['BSED-2-2-A'], 'T-ABEJ-R', 'SCI LAB', '#2563eb'],
      ['Tuesday', '14:30:00', '16:00:00', 'S105', sectionMap['BSED-3-3-A'], 'T-ABEJ-R', 'SCI LAB', '#2563eb'],
      ['Friday', '14:30:00', '16:00:00', 'S105', sectionMap['BSED-3-3-A'], 'T-ABEJ-R', 'SCI LAB', '#2563eb'],
      ['Monday', '09:00:00', '10:30:00', 'ELEC 1', sectionMap['BSED-1-1-A'], 'T-LACA', '303', '#2563eb'],
      ['Thursday', '09:00:00', '10:30:00', 'ELEC 1', sectionMap['BSED-1-1-A'], 'T-LACA', '303', '#2563eb'],
      ['Wednesday', '17:00:00', '20:00:00', 'Educ 6', sectionMap['BSED-3-3-A'], 'T-LACA', '301', '#2563eb'],
      ['Tuesday', '07:30:00', '09:00:00', 'ELT 1', sectionMap['BSED-2-2-A'], 'T-SALV', '303', '#2563eb'],
      ['Friday', '07:30:00', '09:00:00', 'ELT 1', sectionMap['BSED-2-2-A'], 'T-SALV', '303', '#2563eb'],
      ['Monday', '09:00:00', '10:30:00', 'EDUC 5', sectionMap['BSED-2-2-A'], 'T-SALV', '302', '#2563eb'],
      ['Thursday', '09:00:00', '10:30:00', 'EDUC 5', sectionMap['BSED-2-2-A'], 'T-SALV', '302', '#2563eb'],
      ['Tuesday', '13:00:00', '14:30:00', 'EDUC 8', sectionMap['BSED-3-3-A'], 'T-GODI', 'AVR', '#2563eb'],
      ['Friday', '13:00:00', '14:30:00', 'EDUC 8', sectionMap['BSED-3-3-A'], 'T-GODI', 'AVR', '#2563eb'],
      ['Saturday', '08:00:00', '11:00:00', 'Educ 11', sectionMap['BSED-4-4-A'], 'T-CAGA', 'SHS', '#2563eb'],
      ['Saturday', '11:00:00', '12:00:00', 'Educ 12', sectionMap['BSED-4-4-A'], 'T-CAGA', 'SHS', '#2563eb'],
      ['Saturday', '09:00:00', '12:00:00', 'PathFit 1', sectionMap['BSED-1-1-A'], 'T-NAEL', 'SRCB Ground', '#2563eb'],

      // ==========================================
      // ITP (Information Technology Program)
      // ==========================================
      ['Tuesday', '07:30:00', '09:00:00', 'GE 9', sectionMap['BSIT-2-2-A'], 'T-ABEJ-G', '402', '#800000'],
      ['Friday', '07:30:00', '09:00:00', 'GE 9', sectionMap['BSIT-2-2-A'], 'T-ABEJ-G', '402', '#800000'],
      ['Monday', '07:30:00', '09:00:00', 'GE 1', sectionMap['BSIT-1-1-A'], 'T-SANT', '302', '#800000'],
      ['Thursday', '07:30:00', '09:00:00', 'GE 1', sectionMap['BSIT-1-1-A'], 'T-SANT', '302', '#800000'],
      ['Wednesday', '17:00:00', '20:00:00', 'ITP 301', sectionMap['BSIT-3-3-A'], 'T-DAGU', 'Gen. Ed. Lab', '#800000'],
      ['Saturday', '08:00:00', '10:00:00', 'PE 1', sectionMap['BSIT-1-1-A'], 'T-SOBR', 'GYM', '#800000'],
      ['Saturday', '13:00:00', '15:00:00', 'PathFit 3', sectionMap['BSIT-2-2-A'], 'T-NAEL', 'SRCB Ground', '#800000'],

      // ==========================================
      // HMP (Hospitality Management Program)
      // ==========================================
      ['Tuesday', '09:00:00', '10:30:00', 'THC 1', sectionMap['BSHM-1-1-A'], 'T-SILV', 'HM LAB', '#15803d'],
      ['Friday', '09:00:00', '10:30:00', 'THC 1', sectionMap['BSHM-1-1-A'], 'T-SILV', 'HM LAB', '#15803d'],
      ['Monday', '07:30:00', '09:00:00', 'BME 1', sectionMap['BSHM-1-1-A'], 'T-VALM', '101', '#15803d'],
      ['Thursday', '07:30:00', '09:00:00', 'BME 1', sectionMap['BSHM-1-1-A'], 'T-VALM', '101', '#15803d'],
      ['Monday', '10:30:00', '12:00:00', 'HPC 3', sectionMap['BSHM-2-2-A'], 'T-SILV', '101', '#15803d'],
      ['Thursday', '10:30:00', '12:00:00', 'HPC 3', sectionMap['BSHM-2-2-A'], 'T-SILV', '101', '#15803d'],
      ['Tuesday', '14:30:00', '16:00:00', 'THC 3', sectionMap['BSHM-2-2-A'], 'T-VALM', '101', '#15803d'],
      ['Friday', '14:30:00', '16:00:00', 'THC 3', sectionMap['BSHM-2-2-A'], 'T-VALM', '101', '#15803d'],
      ['Monday', '14:30:00', '16:00:00', 'THC 5', sectionMap['BSHM-3-3-A'], 'T-VALM', 'HM LAB', '#15803d'],
      ['Thursday', '14:30:00', '16:00:00', 'THC 5', sectionMap['BSHM-3-3-A'], 'T-VALM', 'HM LAB', '#15803d'],
      ['Tuesday', '09:00:00', '10:30:00', 'BME 3', sectionMap['BSHM-4-4-A'], 'T-VALM', '403', '#15803d'],
      ['Friday', '09:00:00', '10:30:00', 'BME 3', sectionMap['BSHM-4-4-A'], 'T-VALM', '403', '#15803d'],
      ['Friday', '17:00:00', '20:00:00', 'HPC 10', sectionMap['BSHM-4-4-A'], 'T-LABO', 'Online', '#15803d'],

      // ==========================================
      // BAP (Business Administration Program)
      // ==========================================
      ['Tuesday', '10:30:00', '12:00:00', 'GE 9', sectionMap['BSBA-2-2-A'], 'T-ABEJ-G', '301', '#d97706'],
      ['Friday', '10:30:00', '12:00:00', 'GE 9', sectionMap['BSBA-2-2-A'], 'T-ABEJ-G', '301', '#d97706'],
      ['Tuesday', '14:30:00', '16:00:00', 'GEEL 14', sectionMap['BSBA-4-4-A'], 'T-ABEJ-G', '403', '#d97706'],
      ['Friday', '14:30:00', '16:00:00', 'GEEL 14', sectionMap['BSBA-4-4-A'], 'T-ABEJ-G', '403', '#d97706'],
      ['Monday', '09:00:00', '10:30:00', 'RS 2', sectionMap['BSBA-2-2-A'], 'T-BACO', '402', '#d97706'],
      ['Thursday', '09:00:00', '10:30:00', 'RS 2', sectionMap['BSBA-2-2-A'], 'T-BACO', '402', '#d97706'],
      ['Monday', '14:30:00', '16:00:00', 'GE 2', sectionMap['BSBA-1-1-A'], 'T-LACA', '301', '#d97706'],
      ['Thursday', '14:30:00', '16:00:00', 'GE 2', sectionMap['BSBA-1-1-A'], 'T-LACA', '301', '#d97706'],
      ['Saturday', '14:00:00', '17:00:00', 'BACC 7', sectionMap['BSBA-4-4-A'], 'T-LUMA', '302', '#d97706']
    ];

    let inserted = 0;
    for (const [day, st, et, subCode, secId, facId, room, color] of schedulesList) {
      if (!secId) continue;
      await conn.query(`
        INSERT INTO schedules (day, start_time, end_time, subject_code, section_id, faculty_id, room_number, semester_id, academic_year_id, color)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
      `, [day, st, et, subCode, secId, facId, room, color]);
      inserted++;
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log(`Successfully seeded ${inserted} official institutional schedules from Final Loading Document.pdf!`);
  } catch (err) {
    console.error('Failed to seed final loading schedules:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seedFinalLoading();
