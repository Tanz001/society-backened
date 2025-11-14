-- Verify Status Names in Database
-- Run this to check if status names are correct

USE society;

-- Check all status names
SELECT status_id, status_name, description 
FROM society_statuses 
ORDER BY status_id;

-- Expected output:
-- status_id | status_name                      | description
-- 1         | Pending                          | Awaiting initial review
-- 2         | Approved by Board Secretary      | Approved by the Board Secretary (first stage of society approval)
-- 3         | Rejected by Board Secretary      | Rejected by the Board Secretary (first stage of society approval)
-- 4         | Approved by Board President      | Approved by the Board President (second stage of society approval)
-- 5         | Rejected by Board President      | Rejected by the Board President (second stage of society approval)
-- 6         | Approved by Registrar            | Registrar has approved the society
-- 7         | Rejected by Registrar            | Registrar has rejected the society
-- 8         | Approved by VC                   | Vice Chancellor has approved the society
-- 9         | Rejected by VC                   | Vice Chancellor has rejected the society
-- 10        | Active                           | Approved from all admins (society officially active)
-- 11        | Complete                         | Society/event marked as completed after all processes and reports

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

