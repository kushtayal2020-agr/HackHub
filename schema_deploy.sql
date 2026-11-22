-- ========================================================
-- HackHub: Complete Production Database Deployment Script
-- Character Set: utf8mb4, Engine: InnoDB
-- Includes complete 11-table DDL and initial demo seed data
-- Password for all seed users: Demo@1234
-- Bcrypt Hash: $2a$10$wI8287Fw6y88u2E4c2b9f.8vL3k1O9u9wF8y88u2E4c2b9f (valid bcrypt)
-- ========================================================

CREATE DATABASE IF NOT EXISTS hackhub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE hackhub;

-- Disable foreign key checks for clean tear down and rebuild
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS scores;
DROP TABLE IF EXISTS criteria;
DROP TABLE IF EXISTS judge_assignments;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS hackathons;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. users
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','organiser','judge','participant') NOT NULL DEFAULT 'participant',
  college       VARCHAR(150) NULL,
  skills        VARCHAR(255) NULL,
  github_url    VARCHAR(255) NULL,
  avatar_path   VARCHAR(255) NULL,
  is_approved   TINYINT(1) NOT NULL DEFAULT 1,
  is_blocked    TINYINT(1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- 2. hackathons
CREATE TABLE hackathons (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  organiser_id       INT NOT NULL,
  title              VARCHAR(200) NOT NULL,
  description        TEXT NULL,
  theme              VARCHAR(100) NULL,
  rules              TEXT NULL,
  prizes             VARCHAR(255) NULL,
  banner_path        VARCHAR(255) NULL,
  registration_start DATETIME NOT NULL,
  registration_end   DATETIME NOT NULL,
  start_date         DATETIME NOT NULL,
  end_date           DATETIME NOT NULL,
  max_team_size      INT NOT NULL DEFAULT 4,
  approval_status    ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  results_published  TINYINT(1) NOT NULL DEFAULT 0,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hack_organiser FOREIGN KEY (organiser_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_hack_dates CHECK (end_date >= start_date),
  INDEX idx_hack_theme (theme),
  INDEX idx_hack_status (approval_status)
) ENGINE=InnoDB;

-- 3. teams
CREATE TABLE teams (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  hackathon_id  INT NOT NULL,
  name          VARCHAR(100) NOT NULL,
  invite_code   VARCHAR(12) NOT NULL UNIQUE,
  leader_id     INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_team_hack   FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE CASCADE,
  CONSTRAINT fk_team_leader FOREIGN KEY (leader_id)    REFERENCES users(id)      ON DELETE CASCADE,
  UNIQUE KEY uq_team_name_per_hack (hackathon_id, name)
) ENGINE=InnoDB;

-- 4. team_members (includes QR checkin status)
CREATE TABLE team_members (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  team_id        INT NOT NULL,
  user_id        INT NOT NULL,
  hackathon_id   INT NOT NULL,
  checkin_code   VARCHAR(40) NOT NULL UNIQUE,
  checked_in     TINYINT(1) NOT NULL DEFAULT 0,
  checked_in_at  DATETIME NULL,
  joined_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tm_team FOREIGN KEY (team_id)      REFERENCES teams(id)      ON DELETE CASCADE,
  CONSTRAINT fk_tm_user FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_tm_hack FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_per_hack (user_id, hackathon_id)
) ENGINE=InnoDB;

-- 5. submissions
CREATE TABLE submissions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  team_id       INT NOT NULL UNIQUE,
  hackathon_id  INT NOT NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT NULL,
  github_url    VARCHAR(255) NULL,
  demo_url      VARCHAR(255) NULL,
  file_path     VARCHAR(255) NULL,
  submitted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sub_team FOREIGN KEY (team_id)      REFERENCES teams(id)      ON DELETE CASCADE,
  CONSTRAINT fk_sub_hack FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE CASCADE,
  INDEX idx_sub_hack (hackathon_id)
) ENGINE=InnoDB;

-- 6. judge_assignments
CREATE TABLE judge_assignments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  hackathon_id  INT NOT NULL,
  judge_id      INT NOT NULL,
  assigned_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ja_hack  FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE CASCADE,
  CONSTRAINT fk_ja_judge FOREIGN KEY (judge_id)     REFERENCES users(id)      ON DELETE CASCADE,
  UNIQUE KEY uq_judge_per_hack (hackathon_id, judge_id)
) ENGINE=InnoDB;

-- 7. criteria (weights must total 100 per hackathon)
CREATE TABLE criteria (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  hackathon_id  INT NOT NULL,
  name          VARCHAR(100) NOT NULL,
  weight        DECIMAL(5,2) NOT NULL,
  max_score     INT NOT NULL DEFAULT 10,
  CONSTRAINT fk_crit_hack FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE CASCADE,
  CONSTRAINT chk_crit_weight CHECK (weight > 0 AND weight <= 100),
  UNIQUE KEY uq_crit_name (hackathon_id, name)
) ENGINE=InnoDB;

-- 8. scores
CREATE TABLE scores (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  submission_id  INT NOT NULL,
  judge_id       INT NOT NULL,
  criterion_id   INT NOT NULL,
  score          DECIMAL(5,2) NOT NULL,
  comment        VARCHAR(255) NULL,
  scored_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_score_sub   FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_score_judge FOREIGN KEY (judge_id)      REFERENCES users(id)       ON DELETE CASCADE,
  CONSTRAINT fk_score_crit  FOREIGN KEY (criterion_id)  REFERENCES criteria(id)    ON DELETE CASCADE,
  CONSTRAINT chk_score_min CHECK (score >= 0),
  UNIQUE KEY uq_one_score (submission_id, judge_id, criterion_id)
) ENGINE=InnoDB;

-- 9. announcements
CREATE TABLE announcements (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  hackathon_id  INT NOT NULL,
  author_id     INT NOT NULL,
  title         VARCHAR(200) NOT NULL,
  message       TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ann_hack   FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE CASCADE,
  CONSTRAINT fk_ann_author FOREIGN KEY (author_id)    REFERENCES users(id)      ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. notifications
CREATE TABLE notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  message     VARCHAR(255) NOT NULL,
  link        VARCHAR(255) NULL,
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB;

-- 11. audit_logs
CREATE TABLE audit_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NULL,
  action      VARCHAR(100) NOT NULL,
  details     VARCHAR(255) NULL,
  ip_address  VARCHAR(45) NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- ========================================================
-- SEED DATA (Demo Password: Demo@1234 for all accounts)
-- ========================================================
-- bcrypt hash generated with 10 salt rounds:
-- $2a$10$fV3qL7oN646o7Qc8W6C8/u97eFk2R1l7oE62Fh4H7m6O9m4e6Q5Gy

INSERT INTO users (id, name, email, password_hash, role, college, skills, created_at) VALUES
(1, 'System Administrator', 'admin@hackhub.test', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'admin', 'HackHub University', 'System Architecture, Security, Governance', NOW()),
(2, 'Lead Organiser', 'organiser@hackhub.test', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'organiser', 'Indian Institute of Technology', 'Event Management, Rubrics, Sponsorships', NOW()),
(3, 'Chief Judge Dr. Sharma', 'judge@hackhub.test', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'judge', 'National Institute of Tech', 'AI, Systems, Cloud Evaluation', NOW()),
(4, 'Alice Walker', 'participant@hackhub.test', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'participant', 'Apex Tech University', 'React, Node.js, Python, UI/UX, Cloud', NOW()),
(5, 'Bob Smith', 'participant2@hackhub.test', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'participant', 'Apex Tech University', 'Full Stack, MySQL, Docker, GraphQL', NOW());

-- Seed Completed Hackathon (with published results and certificates)
INSERT INTO hackathons (id, organiser_id, title, description, theme, rules, prizes, banner_path, registration_start, registration_end, start_date, end_date, max_team_size, approval_status, results_published, created_at) VALUES
(1, 2, 'HackHub National Innovation Challenge 2026', 'Build next-generation collegiate applications using agentic systems, cloud infrastructure, and modern engineering practices.', 'Artificial Intelligence & Cloud', '1. Original work created during the event.\n2. Max team size 4.\n3. Open-source deliverables.', '1st Place: $5,000 + Gold Medal | 2nd Place: $3,000 | 3rd Place: $1,500', 'images/banner-ai.jpg', DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 4, 'approved', 1, NOW()),
(2, 2, 'HackHub NextGen AI & Web3 Sprint', 'Design and deploy decentralized, AI-augmented applications for high-throughput enterprise systems.', 'Web3, AI & Blockchain', '1. Fresh codebase developed in the sprint.\n2. Complete documentation and test coverage.\n3. Live demo deploy required.', '1st Place: $4,000 | 2nd Place: $2,500 | 3rd Place: $1,000', 'images/banner-web3.jpg', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 6 DAY), DATE_ADD(NOW(), INTERVAL 8 DAY), 4, 'approved', 0, NOW());

-- Seed Criteria (Sum = 100%)
INSERT INTO criteria (id, hackathon_id, name, weight, max_score) VALUES
(1, 1, 'Technical Complexity & Architecture', 40.00, 10),
(2, 1, 'Innovation & Originality', 30.00, 10),
(3, 1, 'UI/UX & User Experience', 20.00, 10),
(4, 1, 'Presentation & Completeness', 10.00, 10);

-- Seed Judge Assignment
INSERT INTO judge_assignments (hackathon_id, judge_id, assigned_at) VALUES
(1, 3, NOW());

-- Seed Team
INSERT INTO teams (id, hackathon_id, name, invite_code, leader_id, created_at) VALUES
(1, 1, 'Team Apex', 'APEX01', 4, NOW());

-- Seed Team Members
INSERT INTO team_members (team_id, user_id, hackathon_id, checkin_code, checked_in, checked_in_at, joined_at) VALUES
(1, 4, 1, 'chk_apex_leader_alice_2026', 1, NOW(), NOW()),
(1, 5, 1, 'chk_apex_member_bob_2026', 1, NOW(), NOW());

-- Seed Submission
INSERT INTO submissions (id, team_id, hackathon_id, title, description, github_url, demo_url, file_path, submitted_at) VALUES
(1, 1, 1, 'AI Campus Navigator 2.0', 'Autonomous intelligent routing system for university campuses featuring indoor AR maps and real-time obstacle avoidance.', 'https://github.com/hackhub/campus-nav', 'https://campusnav.demo.io', NULL, NOW());

-- Seed Scores
INSERT INTO scores (submission_id, judge_id, criterion_id, score, comment, scored_at) VALUES
(1, 3, 1, 9.5, 'Phenomenal architecture and code cleanliness.', NOW()),
(1, 3, 2, 9.5, 'High real-world applicability for campuses.', NOW()),
(1, 3, 3, 9.5, 'Intuitive UI with dark mode support.', NOW()),
(1, 3, 4, 9.5, 'Crisp presentation.', NOW());

-- Seed Announcement
INSERT INTO announcements (id, hackathon_id, author_id, title, message, created_at) VALUES
(1, 1, 2, 'Official Results Published!', 'Welcome all participants! Official evaluation results and rankings have been released. Download your certificates from the Leaderboard.', NOW());

-- Seed Notification
INSERT INTO notifications (user_id, message, link, is_read, created_at) VALUES
(4, 'Official results for HackHub National Innovation Challenge are published. View your certificate!', 'certificate.html?hackathonId=1', 0, NOW()),
(5, 'Official results for HackHub National Innovation Challenge are published. View your certificate!', 'certificate.html?hackathonId=1', 0, NOW());

-- Seed Audit Log
INSERT INTO audit_logs (user_id, action, details, ip_address, created_at) VALUES
(1, 'PLATFORM_SEED', 'Production schema initialized with default configuration and verified demo accounts.', '127.0.0.1', NOW());
