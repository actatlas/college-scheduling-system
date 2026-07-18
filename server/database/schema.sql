-- College Scheduling System DB schema for srcb_scheduler
-- Applies to the existing configured database.

-- USERS (for login)
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  student_id VARCHAR(30) NOT NULL,
  program_code VARCHAR(30) DEFAULT NULL,
  section_id BIGINT UNSIGNED DEFAULT NULL,
  year_level VARCHAR(20) DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_user (user_id),
  UNIQUE KEY uq_students_student_id (student_id),
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_students_program FOREIGN KEY (program_code) REFERENCES courses(code) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_students_section FOREIGN KEY (section_id) REFERENCES sections(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- FACULTY
CREATE TABLE IF NOT EXISTS faculty (
  id VARCHAR(30) NOT NULL,
  name VARCHAR(160) NOT NULL,
  department VARCHAR(120) NOT NULL,
  email VARCHAR(190) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  status VARCHAR(50) NOT NULL,
  availability VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- SUBJECTS
-- instructor is represented by faculty id for strict FK. We'll also return instructor name.
CREATE TABLE IF NOT EXISTS subjects (
  code VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL,
  units INT NOT NULL,
  lecture_hours INT NOT NULL DEFAULT 0,
  lab_hours INT NOT NULL DEFAULT 0,
  semester VARCHAR(50) NOT NULL,
  department VARCHAR(120) NOT NULL,
  instructor_id VARCHAR(30) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code),
  KEY idx_subjects_instructor (instructor_id),
  CONSTRAINT fk_subjects_instructor
    FOREIGN KEY (instructor_id) REFERENCES faculty (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- COURSES (programs like BSCS)
CREATE TABLE IF NOT EXISTS courses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(220) NOT NULL,
  year_duration VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_courses_code (code)
) ENGINE=InnoDB;

-- DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  focus VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_departments_name (name)
) ENGINE=InnoDB;

-- PASSWORD RESET TOKENS
CREATE TABLE IF NOT EXISTS reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(128) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reset_token (token),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- SECTIONS (section records)
CREATE TABLE IF NOT EXISTS sections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_code VARCHAR(30) NOT NULL,
  year_level VARCHAR(80) NOT NULL,
  section_label VARCHAR(10) NOT NULL,
  adviser_id VARCHAR(30) DEFAULT NULL,
  students INT NOT NULL DEFAULT 0,
  semester VARCHAR(50) NOT NULL,
  school_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sections_course (course_code),
  CONSTRAINT fk_sections_course
    FOREIGN KEY (course_code) REFERENCES courses (code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_sections_adviser
    FOREIGN KEY (adviser_id) REFERENCES faculty (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ROOMS
CREATE TABLE IF NOT EXISTS rooms (
  number VARCHAR(30) NOT NULL,
  capacity INT NOT NULL,
  building VARCHAR(120) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (number)
) ENGINE=InnoDB;

-- SCHEDULES
-- Represents a weekly schedule block.
CREATE TABLE IF NOT EXISTS schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  day VARCHAR(20) NOT NULL,
  start_time VARCHAR(10) NOT NULL, -- store as HH:MM
  end_time VARCHAR(10) DEFAULT NULL,
  subject_code VARCHAR(30) NOT NULL,
  section_id BIGINT UNSIGNED DEFAULT NULL,
  faculty_id VARCHAR(30) DEFAULT NULL,
  room_number VARCHAR(30) DEFAULT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#2563eb',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_schedules_day_time (day, start_time),
  CONSTRAINT fk_schedules_subject
    FOREIGN KEY (subject_code) REFERENCES subjects (code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_schedules_section
    FOREIGN KEY (section_id) REFERENCES sections (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_schedules_faculty
    FOREIGN KEY (faculty_id) REFERENCES faculty (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_schedules_room
    FOREIGN KEY (room_number) REFERENCES rooms (number)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_faculty_department ON faculty(department);

