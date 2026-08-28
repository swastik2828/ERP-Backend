import app from './app';
import { env } from './config/env';
import prisma from './database/prisma';
import { AssignmentJobs } from './modules/homework/jobs/assignment.jobs';
import { NoticeJobs } from './modules/notices/jobs/notice.jobs';
import { NotificationJobs } from './modules/notifications/jobs/notification.jobs';

// const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Attempt to connect to the database before starting the server
    await prisma.$connect();
    console.log('✅ Successfully connected to the PostgreSQL Database');

    AssignmentJobs.initJobs();
    NoticeJobs.initJobs();
    NotificationJobs.initJobs();
    console.log('✅ Background jobs initialized.');

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });

    // Graceful Shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      NotificationJobs.stopJobs();
      server.close(async () => {
        console.log('HTTP server closed.');
        await prisma.$disconnect();
        console.log('Database connection closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start the server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();