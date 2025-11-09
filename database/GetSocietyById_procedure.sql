-- MySQL Stored Procedure: GetSocietyById
-- This procedure retrieves a society by its ID
-- Run this SQL script in your MySQL database to create the stored procedure

DELIMITER //

DROP PROCEDURE IF EXISTS GetSocietyById//

CREATE PROCEDURE GetSocietyById(
    IN p_society_id INT
)
BEGIN
    DECLARE society_exists INT DEFAULT 0;
    
    -- Check if society exists
    SELECT COUNT(*) INTO society_exists 
    FROM societies 
    WHERE id = p_society_id;
    
    IF society_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Society not found';
    END IF;
    
    -- Return the society details
    SELECT 
        id,
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
        status,
        created_at,
        updated_at
    FROM societies 
    WHERE id = p_society_id;
    
END//

DELIMITER ;

-- Example usage:
-- CALL GetSocietyById(1);

