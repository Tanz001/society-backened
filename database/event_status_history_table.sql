-- Event Request Status History Table
-- This table tracks all status changes for event requests
-- Structure matches society_status_history table pattern

CREATE TABLE IF NOT EXISTS event_status_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    event_req_id INT NOT NULL,
    status_id INT NOT NULL,
    changed_by INT NOT NULL,  -- refers to student/admin user who made the change
    remarks TEXT DEFAULT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_req_id) REFERENCES event_req(req_id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES society_statuses(status_id),
    FOREIGN KEY (changed_by) REFERENCES students(id),
    INDEX idx_event_req_id (event_req_id),
    INDEX idx_changed_at (changed_at)
);

-- Note: This table structure matches society_status_history pattern:
-- - history_id (PK, auto_increment)
-- - event_req_id (FK to event_req) - equivalent to society_id in society_status_history
-- - status_id (FK to society_statuses)
-- - changed_by (FK to students)
-- - remarks (TEXT, nullable)
-- - changed_at (TIMESTAMP, default CURRENT_TIMESTAMP)

