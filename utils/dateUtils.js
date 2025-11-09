// utils/dateUtils.js
// Utility functions for date formatting

/**
 * Format a date to show only the date part (YYYY-MM-DD)
 * @param {Date|string} date - The date to format
 * @returns {string|null} - Formatted date string or null if invalid
 */
const formatDateOnly = (date) => {
  if (!date) return null;
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;
    
    return dateObj.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  } catch (error) {
    console.error('Error formatting date:', error);
    return null;
  }
};

/**
 * Format a date to show only the date part (YYYY-MM-DD) with fallback
 * @param {Date|string} date - The date to format
 * @param {string} fallback - Fallback value if date is invalid
 * @returns {string} - Formatted date string or fallback
 */
const formatDateOnlyWithFallback = (date, fallback = '') => {
  const formatted = formatDateOnly(date);
  return formatted || fallback;
};

/**
 * Format a datetime to show date and time (YYYY-MM-DD HH:MM:SS)
 * @param {Date|string} date - The date to format
 * @returns {string|null} - Formatted datetime string or null if invalid
 */
const formatDateTime = (date) => {
  if (!date) return null;
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;
    
    return dateObj.toISOString().replace('T', ' ').substring(0, 19); // Returns YYYY-MM-DD HH:MM:SS
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return null;
  }
};

/**
 * Format a date for display (e.g., "Oct 4, 2025")
 * @param {Date|string} date - The date to format
 * @returns {string|null} - Formatted date string or null if invalid
 */
const formatDateForDisplay = (date) => {
  if (!date) return null;
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date for display:', error);
    return null;
  }
};

module.exports = {
  formatDateOnly,
  formatDateOnlyWithFallback,
  formatDateTime,
  formatDateForDisplay
};

