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


module.exports = {
  getAllSocieties,
  GetActiveSocieties,
  getSocietyById,
  submitMembership,
  getUserMembershipRequests,
  updateUserProfile,
  toggleLike,
  addComment
};

