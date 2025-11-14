-- Setup Event Status History and Verify Status Names
-- Run this script to ensure everything is set up correctly

USE society;

-- ============================================
-- CREATE EVENT STATUS HISTORY TABLE
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
-- VERIFY AND FIX STATUS NAMES
-- ============================================
-- Check current status names
SELECT status_id, status_name, description 
FROM society_statuses 
WHERE status_id IN (2, 3);

-- Update all status descriptions to match the latest requirements
UPDATE society_statuses 
SET status_name = 'Approved by Board Secretary',
    description = 'Approved by the Board Secretary (first stage of society approval)'
WHERE status_id = 2;

UPDATE society_statuses 
SET status_name = 'Rejected by Board Secretary',
    description = 'Rejected by the Board Secretary (first stage of society approval)'
WHERE status_id = 3;

UPDATE society_statuses 
SET status_name = 'Approved by Board President',
    description = 'Approved by the Board President (second stage of society approval)'
WHERE status_id = 4;

UPDATE society_statuses 
SET status_name = 'Rejected by Board President',
    description = 'Rejected by the Board President (second stage of society approval)'
WHERE status_id = 5;

UPDATE society_statuses 
SET description = 'Approved from all admins (society officially active)'
WHERE status_id = 10;

-- Verify all status names are correct
SELECT status_id, status_name, description 
FROM society_statuses 
ORDER BY status_id;

-- ============================================
-- VERIFY TABLES EXIST
-- ============================================
SELECT 'society_status_history' AS table_name, COUNT(*) AS record_count 
FROM society_status_history
UNION ALL
SELECT 'event_status_history' AS table_name, COUNT(*) AS record_count 
FROM event_status_history;

-- ============================================
-- VERIFY FOREIGN KEYS
-- ============================================
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'society'
  AND TABLE_NAME IN ('society_status_history', 'event_status_history')
  AND REFERENCED_TABLE_NAME IS NOT NULL;

SELECT 'Setup and verification completed!' AS status;

