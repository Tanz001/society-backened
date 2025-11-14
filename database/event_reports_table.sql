-- MySQL Table: event_reports
-- This table stores event reports submitted by society owners
-- Run this SQL script in your MySQL database to create the event_reports table

CREATE TABLE IF NOT EXISTS event_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    event_req_id INT NOT NULL,              -- Link to event_req table
    uploaded_by INT NOT NULL,               -- Society Owner (student.id)
    report_title VARCHAR(255) NOT NULL,     -- Title of the report
    report_description TEXT,                -- Summary or remarks
    report_file VARCHAR(255) NOT NULL,      -- File path or URL to uploaded report (e.g. /uploads/reports/report123.pdf)
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (event_req_id) REFERENCES event_req(req_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES students(id) ON DELETE CASCADE,
    
    INDEX idx_event_req_id (event_req_id),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_submitted_at (submitted_at)
);

-- Add status 11 for Complete
INSERT INTO society_statuses (status_id, status_name, description)
VALUES (11, 'Complete', 'Society/event marked as completed after all processes and reports')
ON DUPLICATE KEY UPDATE status_name = 'Complete', description = 'Society/event marked as completed after all processes and reports';

