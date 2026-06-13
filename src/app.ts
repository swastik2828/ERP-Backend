import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/routes/auth.routes';
import userRoutes from './modules/users/routes/users.routes'; // <-- ADDED IMPORT
import { globalErrorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';
import studentRoutes from './modules/students/routes/students.routes';

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

// Catch-all route for 404s
app.use(notFoundHandler);

// Global Error Handler (Must be the last middleware)
app.use(globalErrorHandler);

export default app;