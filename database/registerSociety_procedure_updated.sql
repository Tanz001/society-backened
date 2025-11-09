-- MySQL Stored Procedure: registerSociety (Updated Version)
-- This procedure registers a new society and inserts achievements and events into separate tables
-- Run this SQL script in your MySQL database to create the updated stored procedure

DELIMITER //

DROP PROCEDURE IF EXISTS registerSociety//

CREATE PROCEDURE registerSociety(
    IN p_name VARCHAR(255),
    IN p_user_id INT,
    IN p_description TEXT,
    IN p_category ENUM('academic', 'arts', 'sports', 'cultural', 'professional', 'social-impact'),
    IN p_location VARCHAR(255),
    IN p_advisor VARCHAR(255),
    IN p_purpose TEXT,
    IN p_society_logo VARCHAR(255),
    IN p_cover_photo VARCHAR(255),
    IN p_achievements JSON,
    IN p_events JSON
)
BEGIN
    DECLARE v_society_id INT;
    DECLARE i INT DEFAULT 0;
    DECLARE j INT DEFAULT 0;
    DECLARE achievement_text TEXT;
    DECLARE event_title VARCHAR(255);
    DECLARE event_desc TEXT;
    DECLARE event_date DATE;
    DECLARE arr_length INT;
    DECLARE evt_length INT;
    DECLARE student_exists INT DEFAULT 0;
    DECLARE society_exists INT DEFAULT 0;

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

    -- Insert main society record
    INSERT INTO societies (
        name, user_id, description, category, location, advisor, purpose, society_logo, cover_photo, status
    ) VALUES (
        p_name, p_user_id, p_description, p_category, p_location, p_advisor, p_purpose, p_society_logo, p_cover_photo, 'pending'
    );

    SET v_society_id = LAST_INSERT_ID();

    -- Insert Achievements (loop through JSON array)
    IF p_achievements IS NOT NULL AND JSON_LENGTH(p_achievements) > 0 THEN
        SET arr_length = JSON_LENGTH(p_achievements);
        WHILE i < arr_length DO
            SET achievement_text = JSON_UNQUOTE(JSON_EXTRACT(p_achievements, CONCAT('$[', i, ']')));
            IF achievement_text IS NOT NULL AND achievement_text != '' THEN
                INSERT INTO achievements (society_id, achievement)
                VALUES (v_society_id, achievement_text);
            END IF;
            SET i = i + 1;
        END WHILE;
    END IF;

    -- Insert Events (loop through JSON array of objects)
    IF p_events IS NOT NULL AND JSON_LENGTH(p_events) > 0 THEN
        SET evt_length = JSON_LENGTH(p_events);
        WHILE j < evt_length DO
            SET event_title = JSON_UNQUOTE(JSON_EXTRACT(p_events, CONCAT('$[', j, '].title')));
            SET event_desc = JSON_UNQUOTE(JSON_EXTRACT(p_events, CONCAT('$[', j, '].description')));
            SET event_date = JSON_UNQUOTE(JSON_EXTRACT(p_events, CONCAT('$[', j, '].date')));
            
            IF event_title IS NOT NULL AND event_title != '' AND 
               event_desc IS NOT NULL AND event_desc != '' AND 
               event_date IS NOT NULL AND event_date != '' THEN
                INSERT INTO events (society_id, title, description, event_date)
                VALUES (v_society_id, event_title, event_desc, event_date);
            END IF;
            SET j = j + 1;
        END WHILE;
    END IF;
    
    COMMIT;
    
    -- Return success message
    SELECT 'Society registered successfully' as message, v_society_id as society_id;
END//

DELIMITER ;

-- Example usage:
-- CALL registerSociety(
--     'Computer Science Society',
--     1,
--     'A society for computer science students to collaborate and learn together',
--     'academic',
--     'Engineering Building',
--     'Dr. Jane Smith',
--     'To promote computer science education and provide networking opportunities',
--     '/uploads/society_logo.jpg',
--     '/uploads/cover_photo.jpg',
--     '["Won coding competition", "Organized tech meetup"]',
--     '[{"title": "Tech Talk", "description": "Monthly tech discussions", "date": "2024-03-15"}]'
-- );

