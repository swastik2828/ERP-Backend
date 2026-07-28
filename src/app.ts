import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/routes/auth.routes';
import userRoutes from './modules/users/routes/users.routes'; 
import teacherRoutes from './modules/teachers/routes/teachers.routes';
import studentRoutes from './modules/students/routes/students.routes';
import academicRoutes from './modules/academics/routes/academic.routes';
import parentRoutes from './modules/parents/routes/parents.routes';
import attendanceRoutes from './modules/attendance/routes/attendance.routes';
import examRoutes from './modules/examinations/routes/exam.routes';
import timetableRoutes from './modules/timetable/routes/timetable.routes';
import feeRoutes from './modules/fees/routes/fee.routes';
import homeworkRoutes from './modules/homework/routes/assignment.routes';
import noticeRoutes from './modules/notices/routes/notices.routes';


import { globalErrorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';

const app: Application = express();

// Global Security & Utility Middlewares
app.use(helmet()); // Sets secure HTTP headers
app.use(cors()); // Enables Cross-Origin Resource Sharing
app.use(express.json()); // Parses incoming JSON payloads
app.use(express.urlencoded({ extended: true }));


// API Routes
app.get("/", (_req, res) => { // <-- ADDED UNDERSCORE TO _req
  res.status(200).json({
    success: true,
    message: "School ERP Backend Running"
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/academics', academicRoutes);
app.use('/api/v1/parents', parentRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/examinations', examRoutes);
app.use('/api/v1/timetable', timetableRoutes);
app.use('/api/v1/fees', feeRoutes);
app.use('/api/v1/homework', homeworkRoutes);
app.use('/api/v1/notices', noticeRoutes);

// Catch-all route for 404s
app.use(notFoundHandler);

// Global Error Handler (Must be the last middleware)
app.use(globalErrorHandler);

export default app;