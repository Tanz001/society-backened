-- Verify Roles Table Setup
-- Run this to check if roles are properly set up

USE society;

-- Check roles table structure
DESCRIBE roles;

-- Check if all roles exist
SELECT * FROM roles ORDER BY role_id;

-- Expected output:
-- role_id | role_name        | display_name      | description
-- 1       | student          | Student           | Regular student member
-- 2       | advisor          | Advisor           | Faculty advisor for a society
-- 3       | board_secretary  | Board Secretary   | First level of society approval
-- 4       | board_president  | Board President   | Second level of society approval
-- 5       | registrar        | Registrar         | Final review by registrar
-- 6       | vc               | Vice Chancellor   | Top level approval
-- 7       | admin            | Administrator     | System administrator

-- Check students table has role_id column
DESCRIBE students;

-- Check if any students have invalid role_id
SELECT s.id, s.email, s.role_id, r.role_name 
FROM students s 
LEFT JOIN roles r ON s.role_id = r.role_id 
WHERE r.role_id IS NULL;

-- If the above query returns any rows, those students have invalid role_id values

-- Check default role_id for new students
SELECT COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'society' 
  AND TABLE_NAME = 'students' 
  AND COLUMN_NAME = 'role_id';

-- Should return: 1


