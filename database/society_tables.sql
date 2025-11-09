-- MySQL Tables for Society System
-- This script creates all necessary tables for the society system
-- Run this SQL script in your MySQL database to create all tables

-- Create societies table (updated to match your registerSociety procedure)
CREATE TABLE IF NOT EXISTS societies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    description TEXT NOT NULL,
    category ENUM('academic', 'arts', 'sports', 'cultural', 'professional', 'social-impact') NOT NULL,
    location VARCHAR(255) NOT NULL,
    advisor VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    society_logo VARCHAR(255) DEFAULT NULL,
    cover_photo VARCHAR(255) DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Add foreign key constraint if you have a users/students table
    -- FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE,
    
    -- Add indexes for better performance
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    UNIQUE KEY unique_society_name (name)
);

-- Create achievements table (for storing individual achievements)
CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    achievement TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
    INDEX idx_society_id (society_id)
);

-- Create events table (for storing individual events)
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
    INDEX idx_society_id (society_id),
    INDEX idx_event_date (event_date)
);

-- Create students table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    RollNO VARCHAR(50) UNIQUE NOT NULL,
    university VARCHAR(150),
    major VARCHAR(100),
    degree VARCHAR(50),
    semester VARCHAR(10),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_rollno (RollNO)
);

