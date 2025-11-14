// controllers/society/societyController.js
const pool = require("../../database/db.js");

// ✅ Get all membership requests for a specific society
const getSocietyMembershipRequests = async (req, res) => {
  try {
    const { society_id } = req.body;

    console.log(`📥 Fetching all membership requests for society_id: ${society_id}`);

    if (!society_id) {
      return res.status(400).json({
        success: false,
        message: "Society ID is required."
      });
    }

    const [resultSets] = await pool.query("CALL GetAllMembershipRequestsBySociety(?)", [society_id]);
    const requests = resultSets[0];

    console.log(`✅ Found ${requests.length} membership requests for society_id: ${society_id}`);

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("❌ Error fetching membership requests:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching membership requests",
      error: error.message,
    });
  }
};



// controllers/societyController.js


const getSocietyDataByUser = async (req, res) => {
  const userId = req.body.user_id;

  try {
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "user_id is required"
      });
    }

    console.log(`📥 Fetching society data for user_id: ${userId}`);

    // Get society data with status information
    const [societyRows] = await pool.execute(`
      SELECT s.*, ss.status_name, ss.description as status_description,
             st.firstName, st.lastName, st.email, st.rollNo
      FROM societies s 
      LEFT JOIN society_statuses ss ON s.status_id = ss.status_id 
      LEFT JOIN students st ON s.user_id = st.id
      WHERE s.user_id = ?
    `, [userId]);

    if (societyRows.length === 0) {
      return res.status(404).json({
        success: true,
        society: [],
        achievements: [],
        events: []
      });
    }

    const society = societyRows[0];

    // Get the society_id
    const societyId = society.society_id;

    // Get achievements for this society
    const [achievementRows] = await pool.execute(
      'SELECT * FROM achievements WHERE society_id = ?',
      [societyId]
    );

    // Get events for this society
    const [eventRows] = await pool.execute(
      'SELECT * FROM events WHERE society_id = ? ORDER BY event_date ASC',
      [societyId]
    );

    // Format the society data
    const formattedSociety = {
      society_id: society.society_id,
      name: society.name,
      description: society.description,
      category: society.category,
      location: society.location,
      advisor: society.advisor,
      purpose: society.purpose,
      society_logo: society.society_logo || society.logo_path,
      cover_photo: society.cover_photo || society.cover_image_path,
      status_id: society.status_id,
      status_name: society.status_name,
      status_description: society.status_description,
      note: society.note || null,
      created_at: society.created_at ? new Date(society.created_at).toISOString().split('T')[0] : null,
      updated_at: society.updated_at ? new Date(society.updated_at).toISOString().split('T')[0] : null,
      student_info: {
        firstName: society.firstName,
        lastName: society.lastName,
        email: society.email,
        rollNo: society.rollNo
      }
    };

    res.status(200).json({
      success: true,
      society: [formattedSociety],
      achievements: achievementRows,
      events: eventRows,
    });
  } catch (error) {
    console.error("Error fetching society data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching society data",
      error: error.message,
    });
  }
};


// controllers/membershipController.js

const approveMembershipRequest = async (req, res) => {
  const { request_id } = req.body;

  try {
    // Call the stored procedure
    await pool.query(`CALL ApproveMembershipRequest(?)`, [request_id]);

    res.status(200).json({
      success: true,
      message: "Membership request approved successfully.",
    });
  } catch (error) {
    console.error("Error approving membership:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve membership request.",
      error: error.message,
    });
  }
};



const RejectMembershipRequest = async (req, res) => {
    const { request_id } = req.body;
  
    try {
      // Call the stored procedure
      await pool.query(`CALL RejectMembershipRequest(?)`, [request_id]);
  
      res.status(200).json({
        success: true,
        message: "Membership request approved successfully.",
      });
    } catch (error) {
      console.error("Error approving membership:", error);
      res.status(500).json({
        success: false,
        message: "Failed to approve membership request.",
        error: error.message,
      });
    }
  };




const upsertMembershipSettings = async (req, res) => {
    try {
      const { society_id, membership_fee, account_number, account_title } = req.body;
      const user_id = req.user?.id; // from auth middleware (token)
  
      if (!society_id || !membership_fee || !account_number || !account_title) {
        return res.status(400).json({ message: "All fields are required." });
      }
  
      console.log(`🔁 Upserting membership settings for society_id: ${society_id}`);
  
      const [result] = await pool.query(
        "CALL UpsertMembershipSettings(?, ?, ?, ?, ?)",
        [society_id, user_id, membership_fee, account_number, account_title]
      );
  
      res.status(200).json({
        message: "Membership settings saved successfully!",
        result,
      });
    } catch (error) {
      console.error("❌ Error saving membership settings:", error);
      res.status(500).json({ message: "Error saving membership settings", error: error.message });
    }
  };



 

// Controller: Get Membership Settings (Account + Fee Details)
const getMembershipSettingsBySociety = async (req, res) => {
  try {
    const { society_id } = req.body;

    if (!society_id) {
      return res.status(400).json({ message: "society_id is required" });
    }

    console.log(`📥 Fetching membership settings for society_id: ${society_id}`);

    const [rows] = await pool.query("CALL GetMembershipSettingsBySociety(?)", [society_id]);

    // MySQL procedures return nested arrays, so handle it:
    const result = rows[0];

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "No membership settings found for this society" });
    }

    res.status(200).json({
      message: "Membership settings fetched successfully",
      data: result[0],
      success:true
    });
  } catch (error) {
    console.error("❌ Error fetching membership settings:", error);
    res.status(500).json({ message: "Error fetching membership settings", error: error.message });
  }
};

const createPost = async (req, res) => {
  try {
    console.log("📥 CREATE POST - Controller started");
    console.log("Request body:", req.body);
    console.log("Uploaded files:", req.files?.length || 0);

    const {
      society_id,
      user_id,
      title,
      content,
      post_type,
      tags,
      allow_comments = "true",
      send_notifications = "true",
      is_featured = "false",
      allow_multiple,
      is_anonymous,
      poll_options,
    } = req.body;

    // ✅ Validation
    if (!society_id || !user_id || !title || !post_type) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (society_id, user_id, title, post_type)",
      });
    }

    // 📂 Process uploaded files
    const uploadedFiles = req.files?.map((f) => f.path.replace(/\\/g, "/")) || [];

    // 🏷️ Parse optional JSON fields
    const tagsJSON =
      tags && typeof tags !== "string" ? JSON.stringify(tags) : tags || null;

    const pollOptionsJSON =
      poll_options && typeof poll_options !== "string"
        ? JSON.stringify(poll_options)
        : poll_options || null;

    // ⚙️ Convert boolean-like fields
    const allowComments = allow_comments === "false" ? 0 : 1;
    const sendNotifications = send_notifications === "false" ? 0 : 1;
    const isFeatured = is_featured === "true" ? 1 : 0;
    const allowMultiple = allow_multiple === "true" ? 1 : 0;
    const isAnonymous = is_anonymous === "true" ? 1 : 0;

    // ✅ Procedure + parameters
    const query = `CALL CreatePost(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      society_id,
      user_id,
      title,
      content || null,
      post_type,
      uploadedFiles.length ? JSON.stringify(uploadedFiles) : null,
      tagsJSON,
      allowComments,
      sendNotifications,
      isFeatured,
      content || null, // poll_question
      allowMultiple,
      isAnonymous,
      pollOptionsJSON,
    ];

    console.log("🔄 Executing database query...");

    // ✅ Promise-based query
    const [resultSets] = await pool.query(query, values);

    console.log("✅ Post created successfully in database!");
    console.log("Database result:", resultSets);

    // ✅ Return first result set
    return res.status(200).json({
      success: true,
      message: "Post created successfully",
      data: resultSets?.[0] || {},
    });
  } catch (error) {
    console.error("❌ Server Error in createPost:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating post",
      error: error.message,
    });
  }
};

// ✅ Get all posts for a specific society
const getSocietyPosts = async (req, res) => {
  try {
    const { society_id, user_id } = req.body;

    console.log(`📥 Fetching all posts for society_id: ${society_id}, user_id: ${user_id}`);

    if (!society_id) {
      return res.status(400).json({
        success: false,
        message: "Society ID is required."
      });
    }

    // Call the GetSocietyPosts stored procedure with both parameters
    const [resultSets] = await pool.query("CALL GetSocietyPosts(?, ?)", [society_id, user_id]);
    const posts = resultSets[0];

    console.log(`✅ Found ${posts.length} posts for society_id: ${society_id}`);

    // Process posts to parse JSON fields and format data
    const processedPosts = posts.map(post => {
      // Parse JSON fields if they exist
      let tags = null;
      let mediaFiles = null;
      let pollData = null;
      let comments = null;

      try {
        if (post.tags) {
          tags = typeof post.tags === 'string' 
            ? JSON.parse(post.tags) 
            : post.tags;
        }
      } catch (e) {
        console.warn('Failed to parse tags JSON:', e);
      }

      try {
        if (post.media_files) {
          mediaFiles = typeof post.media_files === 'string' 
            ? JSON.parse(post.media_files) 
            : post.media_files;
        }
      } catch (e) {
        console.warn('Failed to parse media_files JSON:', e);
      }

      try {
        if (post.poll_data) {
          pollData = typeof post.poll_data === 'string' 
            ? JSON.parse(post.poll_data) 
            : post.poll_data;
        }
      } catch (e) {
        console.warn('Failed to parse poll_data JSON:', e);
      }

      try {
        if (post.comments) {
          comments = typeof post.comments === 'string' 
            ? JSON.parse(post.comments) 
            : post.comments;
        }
      } catch (e) {
        console.warn('Failed to parse comments JSON:', e);
      }

      return {
        post_id: post.post_id,
        society_id: post.society_id,
        user_id: post.user_id,
        author_name: post.author_name,
        title: post.title,
        content: post.content,
        post_type: post.post_type,
        media_url: post.media_url,
        tags: tags,
        allow_comments: Boolean(post.allow_comments),
        send_notifications: Boolean(post.send_notifications),
        is_featured: Boolean(post.is_featured),
        created_at: post.created_at,
        updated_at: post.updated_at,
        like_count: post.like_count,
        comment_count: post.comment_count,
        is_liked_by_user: Boolean(post.is_liked_by_user),
        media_files: mediaFiles,
        poll_data: pollData,
        comments: comments
      };
    });

    return res.status(200).json({
      success: true,
      count: processedPosts.length,
      data: processedPosts,
    });
  } catch (error) {
    console.error("❌ Error fetching society posts:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching society posts",
      error: error.message,
    });
  }
};



// Get all events for a society (from both events and event_req tables)
const getSocietyEvents = async (req, res) => {
  try {
    const { society_id } = req.body;

    if (!society_id) {
      return res.status(400).json({
        success: false,
        message: "Society ID is required"
      });
    }

    console.log(`📥 Fetching events for society_id: ${society_id}`);

    // Get events from events table
    const [eventsRows] = await pool.execute(
      `SELECT 
        event_id as id,
        society_id,
        title,
        description,
        event_date,
        NULL as event_time,
        NULL as venue,
        10 as status_id,
        'Active' as status_name,
        'approved' as status,
        'events' as source_table,
        NULL as created_at
      FROM events 
      WHERE society_id = ?
      ORDER BY event_date ASC`,
      [society_id]
    );

    // Get events from event_req table where status_id >= 10 (Active or Complete)
    const [eventReqRows] = await pool.execute(
      `SELECT 
        er.req_id as id,
        er.society_id,
        er.title,
        er.description,
        er.event_date,
        er.event_time,
        er.venue,
        er.status_id,
        ss.status_name,
        'approved' as status,
        'event_req' as source_table,
        er.created_at
      FROM event_req er
      LEFT JOIN society_statuses ss ON er.status_id = ss.status_id
      WHERE er.society_id = ? AND er.status_id >= 10
      ORDER BY er.event_date ASC`,
      [society_id]
    );

    // Combine both results
    const allEvents = [...eventsRows, ...eventReqRows].sort((a, b) => {
      const dateA = new Date(a.event_date);
      const dateB = new Date(b.event_date);
      return dateA.getTime() - dateB.getTime();
    });

    console.log(`✅ Found ${allEvents.length} events for society_id: ${society_id}`);

    return res.status(200).json({
      success: true,
      message: "Events retrieved successfully",
      events: allEvents,
      count: allEvents.length
    });
  } catch (error) {
    console.error("❌ Error fetching society events:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching society events",
      error: error.message
    });
  }
};

module.exports = { getSocietyMembershipRequests,
  getSocietyDataByUser,
  approveMembershipRequest ,
  upsertMembershipSettings,
  RejectMembershipRequest,
  getMembershipSettingsBySociety,
  createPost,
  getSocietyPosts,
  getSocietyEvents};
