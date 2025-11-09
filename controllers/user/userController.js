// controllers/user/userController.js
const pool = require("../../database/db.js");

// Get all societies using stored procedure
const getAllSocieties = async (req, res) => {
  try {
    // Call the stored procedure
    const [rows] = await pool.execute('CALL getAllSocieties()');
    
    // The stored procedure returns the result in the first element of rows array
    const societies = rows[0];
    
    if (!societies || societies.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No societies found"
      });
    }

    // Format dates and ensure purpose field is displayed
    const formattedSocieties = societies.map(society => ({
      ...society,
      // Format dates to show only date part (YYYY-MM-DD)
      created_at: society.created_at ? new Date(society.created_at).toISOString().split('T')[0] : null,
      updated_at: society.updated_at ? new Date(society.updated_at).toISOString().split('T')[0] : null,
      // Ensure purpose field is properly displayed
      purpose: society.purpose || society.description || '',
      // Parse JSON fields if they exist
      achievements: society.achievements ? 
        (typeof society.achievements === 'string' ? JSON.parse(society.achievements) : society.achievements) : [],
      events: society.events ? 
        (typeof society.events === 'string' ? JSON.parse(society.events) : society.events) : []
    }));

    res.status(200).json({
      success: true,
      message: "Societies retrieved successfully",
      data: formattedSocieties,
      count: formattedSocieties.length
    });

  } catch (error) {
    console.error("Error fetching societies:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching societies",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};





const GetActiveSocieties = async (req, res) => {
  console.log("Student requesting all societies");

  try {
    const [rows] = await pool.query("CALL GetActiveSocieties()");
    const societiesData = rows[0];

    const societies = societiesData.map(soc => ({
      ...soc,
      // Format dates to show only date part (YYYY-MM-DD)
      created_at: soc.created_at ? new Date(soc.created_at).toISOString().split('T')[0] : null,
      updated_at: soc.updated_at ? new Date(soc.updated_at).toISOString().split('T')[0] : null,
      // Ensure purpose field is properly displayed
      purpose: soc.purpose || soc.description || '',
      achievements: (() => {
        try {
          return soc.achievements && typeof soc.achievements === "string"
            ? JSON.parse(soc.achievements)
            : soc.achievements || [];
        } catch (e) {
          console.error("Error parsing achievements:", soc.achievements);
          return [];
        }
      })(),
      events: (() => {
        try {
          return soc.events && typeof soc.events === "string"
            ? JSON.parse(soc.events)
            : soc.events || [];
        } catch (e) {
          console.error("Error parsing events:", soc.events);
          return [];
        }
      })()
    }));

    return res.json({
      success: true,
      societies
    });

  } catch (error) {
    console.error("Error fetching societies for students:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching societies"
    });
  }
};

// Get society details by ID using stored procedure
const getSocietyById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid society ID provided"
      });
    }

    // Call the stored procedure
    const [rows] = await pool.execute('CALL GetSocietyById(?)', [id]);
    
    // The stored procedure returns the result in the first element of rows array
    const societies = rows[0];
    
    if (!societies || societies.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Society not found"
      });
    }

    const society = societies[0];

    // Format the society data
    const formattedSociety = {
      ...society,
      // Format dates to show only date part (YYYY-MM-DD)
      created_at: society.created_at ? new Date(society.created_at).toISOString().split('T')[0] : null,
      updated_at: society.updated_at ? new Date(society.updated_at).toISOString().split('T')[0] : null,
      // Ensure purpose field is properly displayed
      purpose: society.purpose || society.description || '',
      // Parse JSON fields if they exist
      achievements: (() => {
        try {
          return society.achievements && typeof society.achievements === "string"
            ? JSON.parse(society.achievements)
            : society.achievements || [];
        } catch (e) {
          console.error("Error parsing achievements:", society.achievements);
          return [];
        }
      })(),
      events: (() => {
        try {
          return society.events && typeof society.events === "string"
            ? JSON.parse(society.events)
            : society.events || [];
        } catch (e) {
          console.error("Error parsing events:", society.events);
          return [];
        }
      })()
    };

    res.status(200).json({
      success: true,
      message: "Society details retrieved successfully",
      data: formattedSociety
    });

  } catch (error) {
    console.error("Error fetching society by ID:", error);
    
    // Handle specific SQL errors from stored procedure
    if (error.code === '45000') {
      return res.status(404).json({
        success: false,
        message: "Society not found"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching society details",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};





const submitMembership = async (req, res) => {
  try {
    console.log("📝 Membership submission started");
    console.log("Request body:", req.body);
    console.log("Uploaded file:", req.file);

    const {
      user_id,
      society_id,
      full_name,
      email,
      phone,
      university,
      department,
      semester,
      membership_fee,
      rollno,
    } = req.body;

    // ✅ Validate required fields
    if (
      !user_id ||
      !society_id ||
      !full_name ||
      !email ||
      !phone ||
      !university ||
      !department ||
      !semester ||
      !membership_fee ||
      !rollno
    ) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
      });
    }

    if (!req.file) {
      console.log("❌ Payment receipt file is missing");
      return res.status(400).json({ 
        success: false,
        message: "Payment receipt file is required" 
      });
    }

    // ✅ Store file path relative to /assets/payments
    const payment_receipt = `/assets/payments/${req.file.filename}`;

    // ✅ Call MySQL Stored Procedure using Promise-based syntax
    const sql = `CALL SubmitMembershipRequest(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      user_id,
      society_id,
      full_name,
      email,
      phone,
      university,
      department,
      semester,
      membership_fee,
      payment_receipt,
    ];

    console.log("🔄 Calling stored procedure...");
    
    // Use promise-based execute (await instead of callback)
    const [result] = await pool.execute(sql, values);
    
    console.log("✅ Database response:", result);
    
    const data = result[0][0]; // result from SELECT inside procedure

    console.log("✅ Membership submitted successfully:", data);

    return res.status(201).json({
      success: true,
      message: data.message || "Membership request submitted successfully",
      request_id: data.request_id,
      file: payment_receipt,
    });

  } catch (error) {
    console.error("❌ Submit Membership Error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal Server Error",
      error: error.message 
    });
  }
};



const getUserMembershipRequests = async (req, res) => {
  try {
    console.log("📥 Fetching membership requests for user...");
    const user_id = req.body.user_id // support both URL or query param

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const sql = `CALL GetUserMembershipRequests(?)`;
    const [result] = await pool.execute(sql, [user_id]);

    const data = result[0]; // MySQL returns nested arrays for stored procedures

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No membership requests found for this user",
        requests: [],
      });
    }

    console.log(`✅ Found ${data.length} membership requests for user_id: ${user_id}`);

    return res.status(200).json({
      success: true,
      message: "Membership requests fetched successfully",
      total_requests: data.length,
      requests: data,
    });
  } catch (error) {
    console.error("❌ Error fetching user membership requests:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



const  updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from authMiddleware
    const {
      firstName,
      lastName,
      email,
      phone,
      university,
      major,
      semester
    } = req.body;

    // Validate basic fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and email are required"
      });
    }

    const [resultSets] = await pool.query(
      "CALL UpdateUserProfile(?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userId,
        firstName,
        lastName,
        email,
        phone || null,
        university || null,
        major || null,
        semester || null
      ]
    );

    const updatedUser = resultSets[0]?.[0];
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found after update"
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message
    });
  }
};

 
// ❤️ Toggle Like
 const toggleLike = async (req, res) => {
  try {
    const { post_id } = req.body;
    const user_id = req.user.id; // assuming you have JWT middleware

    if (!post_id) {
      return res.status(400).json({ success: false, message: "Post ID required" });
    }

    const [rows] = await pool.query("CALL ToggleLike(?, ?)", [post_id, user_id]);
    const result = rows[0][0];

    res.json({
      success: true,
      message: "Like status updated",
      like_count: result.like_count,
      is_liked_by_user: result.is_liked_by_user === 1
    });
  } catch (error) {
    console.error("Error in toggleLike:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// 💬 Add Comment
const addComment = async (req, res) => {
  try {
    const { post_id, comment_text } = req.body;
    const user_id = req.user.id;

    if (!post_id || !comment_text?.trim()) {
      return res.status(400).json({ success: false, message: "Post ID and comment text required" });
    }

    const [rows] = await pool.query("CALL AddComment(?, ?, ?)", [
      post_id,
      user_id,
      comment_text.trim()
    ]);

    const data = rows[0][0];

    res.json({
      success: true,
      message: "Comment added successfully",
      comment_count: data.comment_count,
      new_comment: {
        id: data.comment_id,
        text: data.comment_text,
        author: data.commenter_name,
        created_at: data.created_at
      }
    });
  } catch (error) {
    console.error("Error in addComment:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


// Get student's joined societies (approved memberships)
const getJoinedSocieties = async (req, res) => {
  try {
    const user_id = req.user.id; // from authMiddleware

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    console.log(`📥 Fetching joined societies for user_id: ${user_id}`);

    // Query to get approved membership requests with society details
    // Try to use stored procedure first, fallback to direct query
    let rows = [];
    try {
      // Try using stored procedure if it exists
      const [result] = await pool.execute(
        `CALL GetUserMembershipRequests(?)`,
        [user_id]
      );
      const allRequests = result[0] || [];
      // Filter only approved ones
      rows = allRequests.filter(req => req.status === 'approved');
    } catch (procError) {
      console.log("Stored procedure not available, using direct query");
      // Fallback to direct query
      const sql = `
        SELECT 
          mr.request_id,
          mr.society_id,
          mr.status,
          mr.submitted_at,
          mr.processed_at,
          s.name as society_name,
          s.description,
          s.category,
          s.society_logo,
          s.cover_photo,
          s.location
        FROM membership_requests mr
        INNER JOIN societies s ON mr.society_id = s.id
        WHERE mr.user_id = ? AND mr.status = 'approved'
        ORDER BY mr.processed_at DESC
      `;
      [rows] = await pool.execute(sql, [user_id]);
    }

    console.log(`✅ Found ${rows.length} joined societies for user_id: ${user_id}`);

    return res.status(200).json({
      success: true,
      message: "Joined societies fetched successfully",
      societies: rows,
      count: rows.length
    });
  } catch (error) {
    console.error("❌ Error fetching joined societies:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Get student dashboard stats
const getStudentStats = async (req, res) => {
  try {
    const user_id = req.user.id; // from authMiddleware

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    console.log(`📥 Fetching stats for user_id: ${user_id}`);

    // Get joined societies count
    const [joinedCountRows] = await pool.execute(
      `SELECT COUNT(*) as count FROM membership_requests WHERE user_id = ? AND status = 'approved'`,
      [user_id]
    );
    const joinedSocietiesCount = joinedCountRows[0]?.count || 0;

    // Get upcoming events count (events from societies the user is a member of)
    const [eventsRows] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM events e
       INNER JOIN membership_requests mr ON e.society_id = mr.society_id
       WHERE mr.user_id = ? AND mr.status = 'approved' 
       AND e.event_date >= CURDATE()
       ORDER BY e.event_date ASC`,
      [user_id]
    );
    const upcomingEventsCount = eventsRows[0]?.count || 0;

    // Get posts count from societies the user is a member of (last 7 days)
    const [postsRows] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM posts p
       INNER JOIN membership_requests mr ON p.society_id = mr.society_id
       WHERE mr.user_id = ? AND mr.status = 'approved' 
       AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [user_id]
    );
    const postsThisWeek = postsRows[0]?.count || 0;

    // Get total available societies count
    const [totalSocietiesRows] = await pool.execute(
      `SELECT COUNT(*) as count FROM societies WHERE status_id = 6 OR status = 'approved'`
    );
    const totalSocieties = totalSocietiesRows[0]?.count || 0;

    console.log(`✅ Stats fetched: ${joinedSocietiesCount} joined, ${upcomingEventsCount} events, ${postsThisWeek} posts`);

    return res.status(200).json({
      success: true,
      message: "Stats fetched successfully",
      stats: {
        joinedSocieties: joinedSocietiesCount,
        upcomingEvents: upcomingEventsCount,
        postsThisWeek: postsThisWeek,
        totalSocieties: totalSocieties
      }
    });
  } catch (error) {
    console.error("❌ Error fetching student stats:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Vote on a poll option
const voteOnPoll = async (req, res) => {
  try {
    const user_id = req.user.id; // from authMiddleware
    const { option_id, poll_id } = req.body;

    if (!option_id || !poll_id) {
      return res.status(400).json({
        success: false,
        message: "option_id and poll_id are required"
      });
    }

    console.log(`📥 User ${user_id} voting on option ${option_id} in poll ${poll_id}`);

    // Check if user has already voted on this poll
    const [existingVote] = await pool.execute(
      `SELECT v.vote_id, v.option_id, po.poll_id 
       FROM poll_votes v
       INNER JOIN poll_options po ON v.option_id = po.option_id
       WHERE v.user_id = ? AND po.poll_id = ?`,
      [user_id, poll_id]
    );

    // Get poll details to check if multiple votes are allowed
    const [pollRows] = await pool.execute(
      `SELECT allow_multiple FROM polls WHERE poll_id = ?`,
      [poll_id]
    );

    if (pollRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Poll not found"
      });
    }

    const allowMultiple = pollRows[0].allow_multiple === 1;

    // Check if user already voted for this specific option
    const existingVoteForOption = existingVote.find(v => v.option_id === option_id);

    if (existingVoteForOption) {
      // User already voted for this option - remove the vote (toggle off)
      await pool.execute(
        `DELETE FROM poll_votes WHERE vote_id = ?`,
        [existingVoteForOption.vote_id]
      );
      
      // Decrement vote count
      await pool.execute(
        `UPDATE poll_options SET vote_count = vote_count - 1 WHERE option_id = ?`,
        [option_id]
      );

      return res.json({
        success: true,
        message: "Vote removed",
        action: "removed"
      });
    }

    // If multiple votes not allowed and user already voted for a different option
    if (!allowMultiple && existingVote.length > 0) {
      // Remove the old vote
      await pool.execute(
        `DELETE FROM poll_votes WHERE vote_id = ?`,
        [existingVote[0].vote_id]
      );

      // Decrement old vote count
      await pool.execute(
        `UPDATE poll_options SET vote_count = vote_count - 1 WHERE option_id = ?`,
        [existingVote[0].option_id]
      );
    }

    // Add new vote
    await pool.execute(
      `INSERT INTO poll_votes (option_id, user_id, voted_at) VALUES (?, ?, NOW())`,
      [option_id, user_id]
    );

    // Increment vote count
    await pool.execute(
      `UPDATE poll_options SET vote_count = vote_count + 1 WHERE option_id = ?`,
      [option_id]
    );

    console.log(`✅ Vote recorded for option ${option_id}`);

    return res.json({
      success: true,
      message: "Vote recorded successfully",
      action: "added"
    });
  } catch (error) {
    console.error("❌ Error voting on poll:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Get poll details with vote counts and user's vote status
const getPollDetails = async (req, res) => {
  try {
    const user_id = req.user.id; // from authMiddleware
    const { poll_id } = req.params;

    if (!poll_id) {
      return res.status(400).json({
        success: false,
        message: "poll_id is required"
      });
    }

    console.log(`📥 Fetching poll details for poll_id: ${poll_id}, user_id: ${user_id}`);

    // Get poll details
    const [pollRows] = await pool.execute(
      `SELECT poll_id, post_id, question, allow_multiple, is_anonymous, created_at 
       FROM polls WHERE poll_id = ?`,
      [poll_id]
    );

    if (pollRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Poll not found"
      });
    }

    const poll = pollRows[0];

    // Get poll options with vote counts
    const [optionRows] = await pool.execute(
      `SELECT option_id, option_text, vote_count 
       FROM poll_options 
       WHERE poll_id = ? 
       ORDER BY option_id ASC`,
      [poll_id]
    );

    // Get user's votes for this poll
    const [userVotes] = await pool.execute(
      `SELECT v.option_id 
       FROM poll_votes v
       INNER JOIN poll_options po ON v.option_id = po.option_id
       WHERE v.user_id = ? AND po.poll_id = ?`,
      [user_id, poll_id]
    );

    const userVotedOptionIds = userVotes.map(v => v.option_id);

    return res.json({
      success: true,
      poll: {
        ...poll,
        options: optionRows.map(option => ({
          ...option,
          user_voted: userVotedOptionIds.includes(option.option_id)
        })),
        user_voted_options: userVotedOptionIds,
        total_votes: optionRows.reduce((sum, opt) => sum + opt.vote_count, 0)
      }
    });
  } catch (error) {
    console.error("❌ Error fetching poll details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

module.exports = {
  getAllSocieties,
  GetActiveSocieties,
  getSocietyById,
  submitMembership,
  getUserMembershipRequests,
  updateUserProfile,
  toggleLike,
  addComment,
  getJoinedSocieties,
  getStudentStats,
  voteOnPoll,
  getPollDetails
};

