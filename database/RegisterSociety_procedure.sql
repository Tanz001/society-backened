-- MySQL Stored Procedure: RegisterSociety
-- This procedure registers a new society
-- Run this SQL script in your MySQL database to create the stored procedure

DELIMITER //

DROP PROCEDURE IF EXISTS RegisterSociety//

CREATE PROCEDURE RegisterSociety(
    IN p_name              VARCHAR(255),
    IN p_description       TEXT,
    IN p_category          VARCHAR(50),
    IN p_location          VARCHAR(255),
    IN p_advisor           VARCHAR(255),
    IN p_purpose           TEXT,
    IN p_user_id           INT,
    IN p_terms             BOOLEAN,
    IN p_achievements      JSON,
    IN p_events            JSON,
    IN p_logo_path         VARCHAR(500),
    IN p_cover_image_path  VARCHAR(500)
)
BEGIN
    DECLARE student_exists INT DEFAULT 0;
    DECLARE society_exists INT DEFAULT 0;
    DECLARE society_id INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    -- Start transaction for consistency
    START TRANSACTION;
    
    -- Check if student exists
    SELECT COUNT(*) INTO student_exists 
    FROM students 
    WHERE id = p_user_id;
    
    IF student_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found';
    END IF;
    
    -- Check if student already owns a society
    SELECT COUNT(*) INTO society_exists 
    FROM societies 
    WHERE user_id = p_user_id;
    
    IF society_exists > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student already owns a society';
    END IF;
    
    -- Insert the new society
    INSERT INTO societies (
        name,
        description,
        category,
        location,
        advisor,
        purpose,
        user_id,
        terms,
        achievements,
        events,
        logo_path,
        cover_image_path,
        status
    ) VALUES (
        p_name,
        p_description,
        p_category,
        p_location,
        p_advisor,
        p_purpose,
        p_user_id,
        p_terms,
        p_achievements,
        p_events,
        p_logo_path,
        p_cover_image_path,
        'pending'
    );
    
    -- Get the inserted society ID
    SET society_id = LAST_INSERT_ID();
    
    COMMIT;
    
    -- Return success
    SELECT 'Society registered successfully' as message, society_id;
END//

DELIMITER ;

-- Example usage:
-- CALL RegisterSociety(
--     'Computer Science Society',
--     'A society for computer science students to collaborate and learn together',
--     'academic',
--     'Engineering Building',
--     'Dr. Jane Smith',
--     'To promote computer science education and provide networking opportunities',
--     1,
--     TRUE,
--     '["Won coding competition", "Organized tech meetup"]',
--     '[{"title": "Tech Talk", "description": "Monthly tech discussions", "date": "2024-03-15"}]',
--     '/uploads/logo.jpg',
--     '/uploads/cover.jpg'
-- );
