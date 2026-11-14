

CREATE DATABASE IF NOT EXISTS hackhub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE hackhub;

-- Drop in reverse dependency order so the script can be re-run
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
  is_approved   TINYINT(1) NOT NULL DEFAULT 1,  -- organisers can be set to 0 until admin approves
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

-- 4. team_members (also stores QR check-in status)
CREATE TABLE team_members (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  team_id        INT NOT NULL,
  user_id        INT NOT NULL,
  hackathon_id   INT NOT NULL,   -- denormalised so one user can join only one team per hackathon
  checkin_code   VARCHAR(40) NOT NULL UNIQUE,
  checked_in     TINYINT(1) NOT NULL DEFAULT 0,
  checked_in_at  DATETIME NULL,
  joined_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tm_team FOREIGN KEY (team_id)      REFERENCES teams(id)      ON DELETE CASCADE,
  CONSTRAINT fk_tm_user FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_tm_hack FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_per_hack (user_id, hackathon_id)
) ENGINE=InnoDB;

-- 5. submissions (one per team)
CREATE TABLE submissions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  team_id       INT NOT NULL UNIQUE,
  hackathon_id  INT NOT NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT NULL,
  github_url    VARCHAR(255) NULL,
  demo_url      VARCHAR(255) NULL,
  file_path     VARCHAR(255) NULL,   -- multer upload (ZIP / PDF / image)
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

-- 7. criteria (judging rubric with weights, per hackathon)
CREATE TABLE criteria (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  hackathon_id  INT NOT NULL,
  name          VARCHAR(100) NOT NULL,       -- e.g. Innovation, Technical, Presentation
  weight        DECIMAL(5,2) NOT NULL,       -- percentage; weights per hackathon should total 100
  max_score     INT NOT NULL DEFAULT 10,
  CONSTRAINT fk_crit_hack FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE CASCADE,
  CONSTRAINT chk_crit_weight CHECK (weight > 0 AND weight <= 100),
  UNIQUE KEY uq_crit_name (hackathon_id, name)
) ENGINE=InnoDB;

-- 8. scores (one row per judge, per submission, per criterion)
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

-- 10. notifications (in-app bell)
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
  action      VARCHAR(100) NOT NULL,     -- e.g. 'LOGIN', 'DELETE_USER', 'PUBLISH_RESULTS'
  details     VARCHAR(255) NULL,
  ip_address  VARCHAR(45) NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- =====================================================
-- Sample queries (for the report and testing)
-- =====================================================

-- Leaderboard: weighted total per team for one hackathon (JOINs + aggregates)
-- SELECT t.name AS team, s.title,
--        ROUND(SUM((sc.score / c.max_score) * c.weight) / COUNT(DISTINCT sc.judge_id), 2) AS total
-- FROM submissions s
-- JOIN teams t    ON t.id = s.team_id
-- JOIN scores sc  ON sc.submission_id = s.id
-- JOIN criteria c ON c.id = sc.criterion_id
-- WHERE s.hackathon_id = ?
-- GROUP BY s.id, t.name, s.title
-- ORDER BY total DESC;

-- Admin dashboard counts
-- SELECT (SELECT COUNT(*) FROM users)       AS users,
--        (SELECT COUNT(*) FROM hackathons)  AS hackathons,
--        (SELECT COUNT(*) FROM teams)       AS teams,
--        (SELECT COUNT(*) FROM submissions) AS submissions;

-- Create the first admin: register normally through the API, then run:
-- UPDATE users SET role = 'admin' WHERE email = 'your@email.com';