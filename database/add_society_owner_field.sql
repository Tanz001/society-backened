-- Add society_owner field to students table
-- This script adds a society_owner boolean field to track if a student owns a society

ALTER TABLE students 
ADD COLUMN society_owner BOOLEAN DEFAULT FALSE;

-- Add index for better performance when querying by society_owner status
CREATE INDEX idx_society_owner ON students(society_owner);

-- Example usage after running this script:
-- UPDATE students SET society_owner = 1 WHERE id = ?;

