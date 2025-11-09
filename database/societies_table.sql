-- MySQL Table: societies
-- This table stores society registration information
-- Run this SQL script in your MySQL database to create the societies table

CREATE TABLE IF NOT EXISTS societies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('academic', 'arts', 'sports', 'cultural', 'professional', 'social-impact') NOT NULL,
    location VARCHAR(255) NOT NULL,
    advisor VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    user_id INT NOT NULL,
    terms BOOLEAN DEFAULT FALSE,
    achievements JSON DEFAULT NULL,
    events JSON DEFAULT NULL,
    logo_path VARCHAR(500) DEFAULT NULL,
    cover_image_path VARCHAR(500) DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Add foreign key constraint if you have a users table
    -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Add indexes for better performance
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Example data structure for achievements JSON field:
-- ["Won first place in coding competition", "Organized successful tech conference"]

-- Example data structure for events JSON field:
-- [
--   {
--     "title": "Annual Tech Meetup",
--     "description": "A gathering of tech enthusiasts",
--     "date": "2024-03-15"
--   },
--   {
--     "title": "Hackathon 2024",
--     "description": "24-hour coding competition",
--     "date": "2024-04-20"
--   }
-- ]

