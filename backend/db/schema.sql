-- Fillop CBT Guru - MySQL Schema (Cloud Backend)

CREATE TABLE IF NOT EXISTS organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(50) DEFAULT 'school', -- 'school' | 'agent' | 'other'
  contact_email VARCHAR(100),
  contact_phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(50),
  state VARCHAR(50),
  school VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS passcodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  passcode VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL,
  organization_id INT NULL,
  max_devices INT DEFAULT 1,
  activated_devices INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'suspended' | 'expired'
  duration_days INT DEFAULT 180,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL, -- set at first activation or upon generation
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  passcode_id INT NOT NULL,
  device_uuid VARCHAR(100) NOT NULL,
  hardware_hash VARCHAR(255) NOT NULL,
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (passcode_id) REFERENCES passcodes(id) ON DELETE CASCADE,
  UNIQUE(passcode_id, device_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subjects (
  id INT PRIMARY KEY, -- Explicit ID to match SQLite/MySQL sync
  name VARCHAR(100) NOT NULL,
  exam_type VARCHAR(10) NOT NULL, -- 'JAMB' | 'WAEC' | 'NECO'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS topics (
  id INT PRIMARY KEY, -- Explicit ID to match SQLite/MySQL sync
  subject_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_type VARCHAR(10) NOT NULL, -- 'JAMB' | 'WAEC' | 'NECO'
  subject_id INT NOT NULL,
  year INT NOT NULL,
  topic_id INT NOT NULL,
  difficulty VARCHAR(10) DEFAULT 'medium', -- 'easy' | 'medium' | 'hard'
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL, -- 'A' | 'B' | 'C' | 'D'
  topic_explanation TEXT,
  correct_explanation TEXT,
  wrong_explanations TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexing drives the mock exams and practice performance queries
CREATE INDEX idx_questions_filter ON questions (exam_type, subject_id, year);
CREATE INDEX idx_questions_topic ON questions (exam_type, subject_id, topic_id);

CREATE TABLE IF NOT EXISTS results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  exam_type VARCHAR(10) NOT NULL,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  percentage REAL NOT NULL,
  details TEXT, -- JSON breakdown per subject and performance
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promo_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL, -- 'percentage' | 'fixed' | 'free'
  discount_value DECIMAL(10, 2) NULL, -- value based on type
  max_uses INT DEFAULT 100,
  uses_count INT DEFAULT 0,
  expires_at TIMESTAMP NULL,
  active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
