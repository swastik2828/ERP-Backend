import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/routes/auth.routes';
import { globalErrorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';

const app: Application = express();

// Global Security & Utility Middlewares
app.use(helmet()); // Sets secure HTTP headers
app.use(cors()); // Enables Cross-Origin Resource Sharing
app.use(express.json()); // Parses incoming JSON payloads
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "School ERP Backend Running"
  });
});
// API Routes
app.use('/api/v1/auth', authRoutes);

// Catch-all route for 404s
app.use(notFoundHandler);

// Global Error Handler (Must be the last middleware)
app.use(globalErrorHandler);


export default app;