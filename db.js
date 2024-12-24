require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Import CORS

const app = express();
const prisma = new PrismaClient();

// Enable CORS for all origins (you can customize this if needed)
app.use(cors()); // Use CORS middleware

app.use(express.json());

// Utility function to generate JWT
const generateToken = (teacher) => {
  return jwt.sign({ email: teacher.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Sign-up route to create a new teacher
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingTeacher = await prisma.teacher.findUnique({
      where: { email },
    });

    if (existingTeacher) {
      return res.status(400).json({ message: 'Teacher already exists with this email' });
    }

    const newTeacher = await prisma.teacher.create({
      data: {
        name,
        email,
        password,
      },
    });

    res.status(201).json({ message: "You are successfully authenticated" });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route for teachers
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { email },
    });

    if (!teacher) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (teacher.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(teacher);

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Endpoint to create a new student
app.post('/students', async (req, res) => {
  const { name, cohort, courses, lastLogin, status } = req.body;

  try {
    const student = await prisma.student.create({
      data: {
        name,
        cohort,
        courses,
        lastLogin,
        status,
      },
    });
    res.status(201).json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Endpoint to get all students
app.get('/students', async (req, res) => {
  try {
    const students = await prisma.student.findMany();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to update a student's last login or status
app.put('/students/:id', async (req, res) => {
  const { id } = req.params;
  const { lastLogin, status } = req.body;
  try {
    const updatedStudent = await prisma.student.update({
      where: { id: parseInt(id) },
      data: {
        lastLogin: new Date(lastLogin),
        status,
      },
    });
    res.json(updatedStudent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout Route
app.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Protect route example (middleware to verify JWT)
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.teacher = decoded; // Attach decoded token data to the request object
    next();
  });
};

// Example of a protected route using the JWT verification middleware
app.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Protected route accessed', teacher: req.teacher });
});

// Set the server to listen on the specified port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
