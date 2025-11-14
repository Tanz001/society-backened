-- Complete Database Setup for Society Management System
-- Run this script to set up the entire database structure

CREATE DATABASE IF NOT EXISTS society;
USE society;

-- ============================================
-- ROLES TABLE (Must be created before students)
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    description TEXT
);

-- ============================================
-- STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(20),
  RollNO VARCHAR(50),
  university VARCHAR(150),
  major VARCHAR(100),
  degree VARCHAR(50),
  semester VARCHAR(10),
  password VARCHAR(255),
  society_owner BOOLEAN DEFAULT FALSE,
  admin BOOLEAN DEFAULT 0,
  role_id INT DEFAULT 1,   -- 1 = student (default)
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- Insert roles
INSERT INTO roles (role_id, role_name, display_name, description) VALUES
(1, 'student', 'Student', 'Regular student member'),
(2, 'advisor', 'Advisor', 'Faculty advisor for a society'),
(3, 'board_secretary', 'Board Secretary', 'First level of society approval'),
(4, 'board_president', 'Board President', 'Second level of society approval'),
(5, 'registrar', 'Registrar', 'Final review by registrar'),
(6, 'vc', 'Vice Chancellor', 'Top level approval'),
(7, 'admin', 'Administrator', 'System administrator')
ON DUPLICATE KEY UPDATE 
    role_name = VALUES(role_name),
    display_name = VALUES(display_name),
    description = VALUES(description);

-- ============================================
-- SOCIETY STATUSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS society_statuses (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL
);

-- Insert statuses (truncate first to avoid duplicates)
TRUNCATE TABLE society_statuses;

INSERT INTO society_statuses (status_id, status_name, description) VALUES
(1, 'Pending', 'Awaiting initial review'),
(2, 'Approved by Board Secretary', 'Approved by the Board Secretary (first stage of society approval)'),
(3, 'Rejected by Board Secretary', 'Rejected by the Board Secretary (first stage of society approval)'),
(4, 'Approved by Board President', 'Approved by the Board President (second stage of society approval)'),
(5, 'Rejected by Board President', 'Rejected by the Board President (second stage of society approval)'),
(6, 'Approved by Registrar', 'Registrar has approved the society'),
(7, 'Rejected by Registrar', 'Registrar has rejected the society'),
(8, 'Approved by VC', 'Vice Chancellor has approved the society'),
(9, 'Rejected by VC', 'Vice Chancellor has rejected the society'),
(10, 'Active', 'Approved from all admins (society officially active)'),
(11, 'Complete', 'Society/event marked as completed after all processes and reports')
ON DUPLICATE KEY UPDATE status_name = VALUES(status_name), description = VALUES(description);

-- ============================================
-- SOCIETIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS societies (
    society_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('academic', 'arts', 'sports', 'cultural', 'professional', 'social-impact') NOT NULL,
    location VARCHAR(255) NOT NULL,
    advisor VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    society_logo VARCHAR(255),
    cover_photo VARCHAR(255),
    status_id INT DEFAULT 1,
    note VARCHAR(1000) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_society_status FOREIGN KEY (status_id) REFERENCES society_statuses(status_id),
    CONSTRAINT fk_society_user FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ============================================
-- SOCIETY STATUS HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS society_status_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    status_id INT NOT NULL,
    changed_by INT NOT NULL,
    remarks TEXT DEFAULT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(society_id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES society_statuses(status_id),
    FOREIGN KEY (changed_by) REFERENCES students(id)
);

-- ============================================
-- ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
    achievement_id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    achievement TEXT NOT NULL,
    FOREIGN KEY (society_id) REFERENCES societies(society_id) ON DELETE CASCADE
);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    req_id INT DEFAULT NULL,
    society_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME DEFAULT NULL,
    venue VARCHAR(255) DEFAULT NULL,
    status_id INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(society_id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES society_statuses(status_id)
);

-- ============================================
-- EVENT REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_req (
    req_id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    submitted_by INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    venue VARCHAR(255) NOT NULL,
    note TEXT DEFAULT NULL,
    status_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(society_id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES society_statuses(status_id)
);

-- ============================================
-- EVENT REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    event_req_id INT NOT NULL,
    uploaded_by INT NOT NULL,
    report_title VARCHAR(255) NOT NULL,
    report_description TEXT,
    report_file VARCHAR(255) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_req_id) REFERENCES event_req(req_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_event_req_id (event_req_id),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_submitted_at (submitted_at)
);

-- ============================================
-- MEMBERSHIP REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS membership_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    society_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    university VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    membership_fee DECIMAL(10,2) NOT NULL,
    payment_receipt VARCHAR(255) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (society_id) REFERENCES societies(society_id) ON DELETE CASCADE
);

-- ============================================
-- MEMBERSHIP FORM TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS membership_form (
    form_id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    user_id INT NOT NULL,
    membership_fee DECIMAL(10,2) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_title VARCHAR(150) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(society_id),
    FOREIGN KEY (user_id) REFERENCES students(id)
);

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
    post_id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    post_type ENUM('text', 'photo', 'video', 'poll', 'document') NOT NULL,
    media_url TEXT DEFAULT NULL,
    tags JSON DEFAULT NULL,
    allow_comments BOOLEAN DEFAULT TRUE,
    send_notifications BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_post_society FOREIGN KEY (society_id) REFERENCES societies(society_id) ON DELETE CASCADE,
    CONSTRAINT fk_post_user FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ============================================
-- POLLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS polls (
    poll_id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    question VARCHAR(255) NOT NULL,
    allow_multiple BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_poll_post FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE
);

-- ============================================
-- POLL OPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS poll_options (
    option_id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    option_text VARCHAR(255) NOT NULL,
    vote_count INT DEFAULT 0,
    CONSTRAINT fk_poll_option_poll FOREIGN KEY (poll_id) REFERENCES polls(poll_id) ON DELETE CASCADE
);

-- ============================================
-- POLL VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS poll_votes (
    vote_id INT AUTO_INCREMENT PRIMARY KEY,
    option_id INT NOT NULL,
    user_id INT NOT NULL,
    voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vote_option FOREIGN KEY (option_id) REFERENCES poll_options(option_id) ON DELETE CASCADE,
    CONSTRAINT fk_vote_user FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote (user_id, option_id)
);

-- ============================================
-- MEDIA FILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS media_files (
    media_id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    file_url TEXT NOT NULL,
    file_type ENUM('image', 'video', 'document') NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_media_post FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE
);

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_post FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ============================================
-- LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
    like_id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_like_post FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    CONSTRAINT fk_like_user FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_like (post_id, user_id)
);

-- ============================================
-- EVENT STATUS HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_status_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    event_req_id INT NOT NULL,
    status_id INT NOT NULL,
    changed_by INT NOT NULL,
    remarks TEXT DEFAULT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_req_id) REFERENCES event_req(req_id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES society_statuses(status_id),
    FOREIGN KEY (changed_by) REFERENCES students(id),
    INDEX idx_event_req_id (event_req_id),
    INDEX idx_changed_at (changed_at)
);

-- ============================================
-- VERIFY SETUP
-- ============================================
SELECT 'Database setup completed successfully!' AS status;
SELECT COUNT(*) AS role_count FROM roles;
SELECT COUNT(*) AS status_count FROM society_statuses;

-- Verify status names and descriptions are correct
SELECT status_id, status_name, description FROM society_statuses ORDER BY status_id;
-- Expected:
-- 1: 'Pending' - 'Awaiting initial review'
-- 2: 'Approved by Board Secretary' - 'Approved by the Board Secretary (first stage of society approval)'
-- 3: 'Rejected by Board Secretary' - 'Rejected by the Board Secretary (first stage of society approval)'
-- 4: 'Approved by Board President' - 'Approved by the Board President (second stage of society approval)'
-- 5: 'Rejected by Board President' - 'Rejected by the Board President (second stage of society approval)'
-- 6: 'Approved by Registrar' - 'Registrar has approved the society'
-- 7: 'Rejected by Registrar' - 'Registrar has rejected the society'
-- 8: 'Approved by VC' - 'Vice Chancellor has approved the society'
-- 9: 'Rejected by VC' - 'Vice Chancellor has rejected the society'
-- 10: 'Active' - 'Approved from all admins (society officially active)'
-- 11: 'Complete' - 'Society/event marked as completed after all processes and reports'

