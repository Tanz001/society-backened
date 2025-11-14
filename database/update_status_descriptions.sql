-- Update Status Descriptions
-- Run this script to update all status descriptions to match the latest requirements

USE society;

-- Update all status descriptions
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

-- Verify updates
SELECT status_id, status_name, description 
FROM society_statuses 
ORDER BY status_id;

SELECT 'Status descriptions updated successfully!' AS status;


