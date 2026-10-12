CREATE DATABASE IF NOT EXISTS srcb_scheduler;
USE srcb_scheduler;

-- ============================================================================
-- FINAL 11-ENTITY CONCEPTUAL DATA MODEL (CDM) SCHEMA
-- St. Rita's College of Balingasag - Scheduling System (SCSMS)
-- ============================================================================
-- 1.  PROGRAM               (programs)
-- 2.  MAJOR                 (program_majors)
-- 3.  SUBJECT               (subjects)
-- 4.  SECTION/GROUP         (sections)
-- 5.  FACULTY               (teachers)
-- 6.  USER                  (users)
-- 7.  DAY                   (days)
-- 8.  SEMESTER/TERM         (semesters)
-- 9.  ROOM                  (rooms - direct facility identity, no building entity)
-- 10. SCHEDULE              (schedules)
-- 11. EXAMINATION SCHEDULE  (exam_schedules)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7. DAY Entity
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS days (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_days_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. SEMESTER/TERM Entity
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS semesters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  school_year VARCHAR(50) NOT NULL DEFAULT '2026-2027',
  term VARCHAR(50) NOT NULL,
  name VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_semesters_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academic_years (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_academic_years_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 1. PROGRAM Entity
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programs (
  code VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  focus VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. MAJOR Entity
-- ----------------------------------------------------------------------------
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
  CONSTRAINT fk_program_majors_program FOREIGN KEY (program_code) REFERENCES programs(code) ON UPDATE CASCADE ON DELETE RESTRICT
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

-- ----------------------------------------------------------------------------
-- 5. FACULTY Entity
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers (
  id VARCHAR(30) NOT NULL,
  employee_number VARCHAR(50) DEFAULT NULL,
  first_name VARCHAR(100) DEFAULT NULL,
  last_name VARCHAR(100) DEFAULT NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  position VARCHAR(100) DEFAULT 'Faculty Instructor',
  faculty_type ENUM('Full-Time', 'Part-Time') NOT NULL DEFAULT 'Full-Time',
  status ENUM('Full-Time', 'Part-Time') NOT NULL DEFAULT 'Full-Time',
  program_major_id BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_teachers_program_major (program_major_id),
  CONSTRAINT fk_teachers_program_major FOREIGN KEY (program_major_id) REFERENCES program_majors(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. USER Entity (Not every faculty member requires a user account)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  faculty_id VARCHAR(30) DEFAULT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin', 'teacher', 'program_head') NOT NULL DEFAULT 'admin',
  status ENUM('Active', 'Suspended') NOT NULL DEFAULT 'Active',
  program VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_faculty (faculty_id),
  CONSTRAINT fk_users_faculty FOREIGN KEY (faculty_id) REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. SECTION/GROUP Entity
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  program_code VARCHAR(30) NOT NULL DEFAULT 'TEP',
  major_id BIGINT UNSIGNED DEFAULT NULL,
  course_code VARCHAR(30) DEFAULT NULL,
  section_name VARCHAR(100) DEFAULT NULL,
  year_level INT UNSIGNED NOT NULL,
  section_label VARCHAR(10) NOT NULL,
  adviser_id VARCHAR(30) DEFAULT NULL,
  students INT UNSIGNED NOT NULL DEFAULT 0,
  semester_id BIGINT UNSIGNED DEFAULT NULL,
  academic_year_id BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sections_program (program_code),
  KEY idx_sections_major (major_id),
  KEY idx_sections_adviser (adviser_id),
  CONSTRAINT fk_sections_program FOREIGN KEY (program_code) REFERENCES programs(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sections_major FOREIGN KEY (major_id) REFERENCES program_majors(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_sections_adviser FOREIGN KEY (adviser_id) REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_sections_semester FOREIGN KEY (semester_id) REFERENCES semesters(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sections_ay FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. SUBJECT Entity
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
  code VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL,
  subject_title VARCHAR(200) DEFAULT NULL,
  units INT NOT NULL,
  lecture_hours INT NOT NULL DEFAULT 0,
  lab_hours INT NOT NULL DEFAULT 0,
  subject_type VARCHAR(50) DEFAULT 'Minor',
  semester_id BIGINT UNSIGNED DEFAULT NULL,
  program_code VARCHAR(30) NOT NULL,
  major_id BIGINT UNSIGNED DEFAULT NULL,
  instructor_id VARCHAR(30) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code),
  KEY idx_subjects_instructor (instructor_id),
  KEY idx_subjects_program (program_code),
  KEY idx_subjects_major (major_id),
  CONSTRAINT fk_subjects_instructor FOREIGN KEY (instructor_id) REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_subjects_program FOREIGN KEY (program_code) REFERENCES programs(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_subjects_major FOREIGN KEY (major_id) REFERENCES program_majors(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_subjects_semester FOREIGN KEY (semester_id) REFERENCES semesters(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. ROOM Entity (Direct Facility Identity - e.g. 301-COLLEGE, LAB-02-SCIENCE)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
  number VARCHAR(30) NOT NULL,
  room_name VARCHAR(150) DEFAULT NULL,
  capacity INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. SCHEDULE Entity
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  day VARCHAR(20) NOT NULL,
  day_id INT UNSIGNED DEFAULT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject_code VARCHAR(30) NOT NULL,
  section_id BIGINT UNSIGNED DEFAULT NULL,
  faculty_id VARCHAR(30) DEFAULT NULL,
  room_number VARCHAR(30) DEFAULT NULL,
  semester_id BIGINT UNSIGNED DEFAULT NULL,
  academic_year_id BIGINT UNSIGNED DEFAULT NULL,
  class_mode VARCHAR(50) DEFAULT 'Face-to-Face',
  status ENUM('DRAFT', 'FINALIZED', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_schedules_day_time (day, start_time),
  KEY idx_schedules_day_id (day_id),
  KEY idx_schedules_faculty (faculty_id),
  KEY idx_schedules_room (room_number),
  KEY idx_schedules_section (section_id),
  KEY idx_schedules_status (status),
  CONSTRAINT fk_schedules_subject FOREIGN KEY (subject_code) REFERENCES subjects(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_schedules_section FOREIGN KEY (section_id) REFERENCES sections(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_schedules_faculty FOREIGN KEY (faculty_id) REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_schedules_room FOREIGN KEY (room_number) REFERENCES rooms(number) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_schedules_day FOREIGN KEY (day_id) REFERENCES days(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_schedules_semester FOREIGN KEY (semester_id) REFERENCES semesters(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_schedules_ay FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. EXAMINATION SCHEDULE Entity
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  term VARCHAR(50) NOT NULL DEFAULT 'Midterm',
  exam_period VARCHAR(50) DEFAULT 'Midterm',
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject_code VARCHAR(30) NOT NULL,
  section_names TEXT DEFAULT NULL,
  room_number VARCHAR(30) DEFAULT NULL,
  proctor_id VARCHAR(30) DEFAULT NULL,
  proctor_name VARCHAR(160) DEFAULT NULL,
  program_code VARCHAR(30) NOT NULL DEFAULT 'TEP',
  class_mode VARCHAR(50) DEFAULT 'Face-to-Face',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_exam_schedules_date_time (exam_date, start_time),
  KEY idx_exam_schedules_proctor (proctor_id),
  KEY idx_exam_schedules_room (room_number),
  KEY idx_exam_schedules_subject (subject_code),
  CONSTRAINT fk_exam_schedules_subject FOREIGN KEY (subject_code) REFERENCES subjects(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_exam_schedules_proctor FOREIGN KEY (proctor_id) REFERENCES teachers(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_exam_schedules_room FOREIGN KEY (room_number) REFERENCES rooms(number) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Auxiliary Operational & Security Tables
-- ----------------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS schedule_adjustment_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  schedule_id BIGINT UNSIGNED NOT NULL,
  requested_by_user_id BIGINT UNSIGNED NOT NULL,
  requester_name VARCHAR(160) NOT NULL,
  requester_program VARCHAR(50) NOT NULL,
  subject_code VARCHAR(30) NOT NULL,
  subject_name VARCHAR(200) NOT NULL,
  section_name VARCHAR(100) DEFAULT NULL,
  faculty_name VARCHAR(160) DEFAULT NULL,
  room_number VARCHAR(30) DEFAULT NULL,
  current_day VARCHAR(20) NOT NULL,
  current_start_time TIME NOT NULL,
  current_end_time TIME NOT NULL,
  suggested_day VARCHAR(20) DEFAULT NULL,
  suggested_start_time TIME DEFAULT NULL,
  suggested_end_time TIME DEFAULT NULL,
  suggested_room VARCHAR(30) DEFAULT NULL,
  reason TEXT NOT NULL,
  status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  admin_response TEXT DEFAULT NULL,
  reviewed_by_user_id BIGINT UNSIGNED DEFAULT NULL,
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_adj_req_schedule (schedule_id),
  KEY idx_adj_req_status (status),
  KEY idx_adj_req_user (requested_by_user_id),
  KEY idx_adj_req_program (requester_program),
  CONSTRAINT fk_adj_req_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_adj_req_user FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  user_name VARCHAR(160) DEFAULT NULL,
  user_email VARCHAR(190) DEFAULT NULL,
  role VARCHAR(50) NOT NULL,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  target_id VARCHAR(100) DEFAULT NULL,
  target_type VARCHAR(100) DEFAULT NULL,
  status ENUM('Success', 'Failed') NOT NULL DEFAULT 'Success',
  ip_address VARCHAR(45) DEFAULT NULL,
  details JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_syslogs_user (user_id),
  KEY idx_syslogs_role (role),
  KEY idx_syslogs_module (module),
  KEY idx_syslogs_action (action),
  KEY idx_syslogs_status (status),
  KEY idx_syslogs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delegations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  program_code VARCHAR(30) NOT NULL,
  program_head_id BIGINT UNSIGNED NOT NULL,
  program_head_name VARCHAR(160) NOT NULL,
  program_head_email VARCHAR(190) NOT NULL,
  exam_scheduling_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  delegated_by_admin_id BIGINT UNSIGNED DEFAULT NULL,
  delegated_by_admin_name VARCHAR(160) DEFAULT NULL,
  delegated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_delegations_program (program_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  recipient_email VARCHAR(190) DEFAULT NULL,
  recipient_name VARCHAR(160) DEFAULT NULL,
  role VARCHAR(50) DEFAULT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  meta JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user (user_id),
  KEY idx_notifications_email (recipient_email),
  KEY idx_notifications_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
