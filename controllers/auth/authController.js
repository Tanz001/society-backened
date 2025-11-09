// controllers/auth/authController.js
const pool = require("../../database/db.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // for password comparison

const registerStudent = async (req, res) => {
    try {
      const { 
        firstName, 
        lastName, 
        email, 
        phone, 
        rollNo, 
        university, 
        major, 
        degree, 
        semester, 
        password 
      } = req.body;
      
      console.log("Student registration attempt:", { firstName, lastName, email, rollNo, university });
      
      // ✅ Basic validation
      if (!firstName || !lastName || !email || !phone || !rollNo || 
          !university || !major || !degree || !semester || !password) {
        return res.status(400).json({
          success: false,
          message: "All fields are required"
        });
      }
  
      // ✅ Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format"
        });
      }
  
      // ✅ Password length validation
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long"
        });
      }
  
      // ✅ Hash password before storing
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
  
      // ✅ Call stored procedure (save hashed password)
      await pool.execute('CALL RegisterStudent(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        firstName,
        lastName,
        email,
        phone,
        rollNo,
        university,
        major,
        degree,
        semester,
        hashedPassword
      ]);
  
      console.log("Student registered successfully:", { firstName, lastName, email, rollNo });
  
      res.status(201).json({
        success: true,
        message: "Student registered successfully",
        data: { 
          firstName, 
          lastName, 
          email, 
          rollNo, 
          university, 
          major,
          phone,
          degree,
          semester,
          role
        }
      });
  
    } catch (error) {
      console.error("Error registering student:", error);
      
      // ✅ Handle duplicate email or rollNo
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: "Email or Roll Number already exists"
        });
      }
  
      if (error.code === 'ER_BAD_NULL_ERROR') {
        return res.status(400).json({
          success: false,
          message: "Some required fields are missing or invalid"
        });
      }
  
      if (error.code === 'ER_DATA_TOO_LONG') {
        return res.status(400).json({
          success: false,
          message: "Some fields exceed the maximum allowed length"
        });
      }
  
      res.status(500).json({
        success: false,
        message: "Internal server error while registering student",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
  
  const loginStudent = async (req, res) => {
    try {
      console.log("starting.........................")
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }
  
      // ✅ Call stored procedure
      const [results] = await pool.execute("SELECT * FROM students WHERE email = ?", [email]);
      const student = results[0];
  
      if (!student) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }
  
      console.log("Student data fetched from DB:", student);
  
      // ✅ Compare password
      const isMatch = await bcrypt.compare(password, student.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }
  
      // ✅ Generate JWT
      const JWT_SECRET = process.env.JWT_SECRET || "yourSuperSecretKey";
      const token = jwt.sign(
        { id: student.id, email: student.email },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );
  
      // ✅ Normalize RollNO field (to avoid case mismatch)
      const rollNumber =
        student.RollNO ||
        student.rollno ||
        student.RollNo ||
        student.roll_no ||
        null;

        console.log("Roll number:", rollNumber);
  
      // ✅ Final Response
      res.status(200).json({
        success: true,
        message: "Student logged in successfully",
        token,
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          university: student.university,
          major: student.major,
          degree: student.degree,
          semester: student.semester,
          phone: student.phone,
          admin: student.admin,
          society_owner: student.society_owner,
          RollNO: rollNumber, // ✅ Roll number will now always appear here
          role:student.role
        },
      });
    } catch (error) {
      console.error("Error logging in student:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while logging in student",
      });
    }
  };
  
  
  
  const registerSociety = async (req, res) => {
    try {
      const {
        name,
        description,
        category,
        location,
        advisor,
        purpose,
        achievements,
        events
      } = req.body;
  
      // ✅ Ensure userId comes from JWT (authMiddleware sets req.user)
      const userId = req.user?.id; 
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: user not found in token"
        });
      }
  
      // ✅ File paths from multer (if files were uploaded)
      const logoPath = req.files?.societyLogo?.[0]?.path || null;
      const coverPath = req.files?.coverPhoto?.[0]?.path || null;
      console.log("RegisterSociety params:", {
        name,
        userId,
        description,
        category,
        location,
        advisor,
        purpose,
        logoPath,
        coverPath,
        achievements,
        events
      });
  
      // ✅ Call stored procedure with correct param order
      await pool.query(
        `CALL registerSociety(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          userId,         // 👈 goes 2nd
          description,
          category,
          location,
          advisor,
          purpose,
          logoPath,
          coverPath,
          achievements,   // must be valid JSON string
          events          // must be valid JSON string
        ]
      );
  
      res.status(201).json({
        success: true,
        message: "Society registered successfully"
      });
  
    } catch (error) {
      console.error("Society registration error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while registering society",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  };
  

module.exports = {
  registerStudent,
  loginStudent,
  registerSociety
};
