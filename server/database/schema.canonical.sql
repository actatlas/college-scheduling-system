CREATE DATABASE IF NOT EXISTS srcb_scheduler;
USE srcb_scheduler;

-- Canonical schema aligned to the implementation.

CREATE TABLE IF NOT EXISTS academic_years (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_academic_years_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS semesters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_semesters_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin', 'teacher', 'program_head') NOT NULL DEFAULT 'admin',
  status ENUM('Active', 'Suspended') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS programs (
  code VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL,
  focus VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS program_majors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL,
  program_code VARCHAR(30) NOT NULL,
  program_head_id BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_program_majors_code (code),
  KEY idx_program_majors_program (program_code),
  KEY idx_program_majors_program_head (program_head_id),
  CONSTRAINT fk_program_majors_program FOREIGN KEY (program_code) REFERENCES programs(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_program_majors_program_head FOREIGN KEY (program_head_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS year_levels (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  program_major_id BIGINT UNSIGNED NOT NULL,
  year_level ENUM('1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_year_levels_program_major_year (program_major_id, year_level),
  KEY idx_year_levels_program_major (program_major_id),
  CONSTRAINT fk_year_levels_program_major FOREIGN KEY (program_major_id) REFERENCES program_majors(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teachers (
  id VARCHAR(30) NOT NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  status ENUM('Full-Time', 'Part-Time') NOT NULL DEFAULT 'Full-Time',
  program_major_id BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_teachers_program_major (program_major_id),
  CONSTRAINT fk_teachers_program_major FOREIGN KEY (program_major_id) REFERENCES program_majors(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_availability (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id VARCHAR(30) NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_teacher_availability_teacher (teacher_id),
  CONSTRAINT fk_teacher_availability_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courses (
  code VARCHAR(30) NOT NULL,
  name VARCHAR(220) NOT NULL,
  program_code VARCHAR(30) NOT NULL,
  year_duration INT UNSIGNED DEFAULT 4,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code),
  KEY idx_courses_program (program_code),
  CONSTRAINT fk_courses_program FOREIGN KEY (program_code) REFERENCES programs(code) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_code VARCHAR(30) NOT NULL,
  year_level INT UNSIGNED NOT NULL,
  section_label VARCHAR(10) NOT NULL,
  adviser_id VARCHAR(30) DEFAULT NULL,
  students INT UNSIGNED NOT NULL DEFAULT 0,
  semester_id BIGINT UNSIGNED DEFAULT NULL,
  academic_year_id BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_section_label (course_code, year_level, section_label, semester_id, academic_year_id),
  KEY idx_sections_course (course_code),
  KEY idx_sections_adviser (adviser_id),
  CONSTRAINT fk_sections_course FOREIGN KEY (course_code) REFERENCES courses(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sections_adviser FOREIGN KEY (adviser_id) REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_sections_semester FOREIGN KEY (semester_id) REFERENCES semesters(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sections_ay FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subjects (
  code VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL,
  units INT NOT NULL,
  lecture_hours INT NOT NULL DEFAULT 0,
  lab_hours INT NOT NULL DEFAULT 0,
  semester_id BIGINT UNSIGNED DEFAULT NULL,
  program_code VARCHAR(30) NOT NULL,
  instructor_id VARCHAR(30) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code),
  KEY idx_subjects_instructor (instructor_id),
  KEY idx_subjects_program (program_code),
  CONSTRAINT fk_subjects_instructor FOREIGN KEY (instructor_id) REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_subjects_program FOREIGN KEY (program_code) REFERENCES programs(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_subjects_semester FOREIGN KEY (semester_id) REFERENCES semesters(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rooms (
  number VARCHAR(30) NOT NULL,
  capacity INT NOT NULL,
  building VARCHAR(120) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(128) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reset_token (token),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  day VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject_code VARCHAR(30) NOT NULL,
  section_id BIGINT UNSIGNED DEFAULT NULL,
  faculty_id VARCHAR(30) DEFAULT NULL,
  room_number VARCHAR(30) DEFAULT NULL,
  semester_id BIGINT UNSIGNED DEFAULT NULL,
  academic_year_id BIGINT UNSIGNED DEFAULT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#2563eb',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_schedules_day_time (day, start_time),
  KEY idx_schedules_faculty (faculty_id),
  KEY idx_schedules_room (room_number),
  KEY idx_schedules_section (section_id),
  CONSTRAINT fk_schedules_subject FOREIGN KEY (subject_code) REFERENCES subjects(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_schedules_section FOREIGN KEY (section_id) REFERENCES sections(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_schedules_faculty FOREIGN KEY (faculty_id) REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_schedules_room FOREIGN KEY (room_number) REFERENCES rooms(number) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_schedules_semester FOREIGN KEY (semester_id) REFERENCES semesters(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_schedules_ay FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  term VARCHAR(50) NOT NULL DEFAULT 'Midterm',
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject_code VARCHAR(30) NOT NULL,
  section_names TEXT DEFAULT NULL,
  room_number VARCHAR(30) DEFAULT NULL,
  building VARCHAR(120) DEFAULT 'College Building',
  proctor_id VARCHAR(30) DEFAULT NULL,
  proctor_name VARCHAR(160) DEFAULT NULL,
  program_code VARCHAR(30) NOT NULL DEFAULT 'BSIT',
  color VARCHAR(20) NOT NULL DEFAULT '#2563eb',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_exam_schedules_subject (subject_code),
  KEY idx_exam_schedules_proctor (proctor_id),
  KEY idx_exam_schedules_room (room_number),
  CONSTRAINT fk_exam_schedules_subject FOREIGN KEY (subject_code) REFERENCES subjects(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_exam_schedules_proctor FOREIGN KEY (proctor_id) REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_exam_schedules_room FOREIGN KEY (room_number) REFERENCES rooms(number) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

