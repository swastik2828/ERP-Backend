import request from 'supertest';
import app from '../../../app'; // Ensure this points to your main express app
import { teacherService } from '../services/teacher.service';
import { Role } from '@prisma/client';
import prisma from '../../../database/prisma';

// Mock Auth Middleware to bypass real JWT checks during route testing
jest.mock('../../../middlewares/auth.middleware', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin-123', schoolId: 'school-123', role: Role.SCHOOL_ADMIN };
    next();
  }
}));

// Mock the service so we don't hit the DB
jest.mock('../services/teacher.service');

describe('Teacher Integration Routes', () => {
  
  // Clean up database connections to prevent Open Handle warnings
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/teachers', () => {
    it('should return 400 validation error if required fields are missing', async () => {
      const invalidPayload = {
        firstName: 'Rahul'
        // Missing lastName, email, phone, employeeId, etc.
      };

      const response = await request(app)
        .post('/api/v1/teachers')
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      
      // Match your app's actual error response structure
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 201 if payload is valid', async () => {
      const validPayload = {
        firstName: 'Rahul',
        lastName: 'Sharma',
        gender: 'MALE',
        email: 'rahul@school.com',
        phone: '9876543210',
        employeeId: 'TCH-2026-001',
        employmentType: 'FULL_TIME'
      };

      // Mock the service response
      (teacherService.createTeacher as jest.Mock).mockResolvedValue({
        teacher: { id: 'teacher-123' },
        tempPassword: 'randompassword123'
      });

      const response = await request(app)
        .post('/api/v1/teachers')
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tempPassword).toBeDefined();
    });
  });
});