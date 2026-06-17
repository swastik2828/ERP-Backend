import request from 'supertest';
import express from 'express';
import { Role, SubjectType, SubjectCategory, SubjectStatus } from '@prisma/client';

// Mock the middlewares BEFORE importing routes
jest.mock('../../../middlewares/auth.middleware', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    // Simulate an authenticated SUPER_ADMIN user
    req.user = { id: 'admin-123', schoolId: 'school-123', role: Role.SUPER_ADMIN };
    next();
  }
}));

jest.mock('../../../middlewares/role.middleware', () => ({
  requireExactRole: () => (_req: any, _res: any, next: any) => next()
}));

// Mock the Service layer to isolate route & controller logic
jest.mock('../services/subject.service');
import { SubjectService } from '../services/subject.service';

import subjectRoutes from '../routes/subject.routes';
// import { validateRequest } from '../../../middlewares/validation.middleware'; // Assuming you use this
// import { AppError } from '../../../errors/AppError'; // For simulated errors

// Setup a test Express app
const app = express();
app.use(express.json());

// If your validateRequest middleware throws errors, ensure a basic error handler is attached
app.use('/api/subjects', subjectRoutes);
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 400).json({ success: false, message: err.message });
});

describe('Subject Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/subjects', () => {
    it('should return 400 if validation fails (e.g., missing required code)', async () => {
      const invalidPayload = {
        name: 'Mathematics',
        // 'code' is intentionally missing
        subjectType: SubjectType.CORE,
        category: SubjectCategory.ACADEMIC,
        displayOrder: 1,
      };

      const res = await request(app)
        .post('/api/subjects')
        .send(invalidPayload);

      // Zod validation middleware should intercept this before it reaches the controller
      expect(res.status).toBe(400); 
      expect(SubjectService.createSubject).not.toHaveBeenCalled();
    });

    it('should return 201 and create the subject for a valid payload', async () => {
      const validPayload = {
        name: 'Mathematics',
        code: 'MATH101',
        subjectType: SubjectType.CORE,
        category: SubjectCategory.ACADEMIC,
        displayOrder: 1,
      };

      const mockResponse = { id: 'sub-123', schoolId: 'school-123', ...validPayload };
      (SubjectService.createSubject as jest.Mock).mockResolvedValue(mockResponse);

      const res = await request(app)
        .post('/api/subjects')
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('sub-123');
      expect(SubjectService.createSubject).toHaveBeenCalledWith(
        'school-123', // From mocked req.user
        'admin-123',  // From mocked req.user
        validPayload
      );
    });
  });

  describe('GET /api/subjects', () => {
    it('should return 200 and a list of subjects', async () => {
      const mockList = {
        data: [{ id: 'sub-123', name: 'Math' }],
        total: 1,
      };
      
      (SubjectService.listSubjects as jest.Mock).mockResolvedValue(mockList);

      const res = await request(app).get('/api/subjects?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('PATCH /api/subjects/:id/status', () => {
    it('should return 200 when deactivating a subject', async () => {
      // Replaced 'sub-123' with a valid UUID to pass the Zod validation middleware
      const subjectId = '550e8400-e29b-41d4-a716-446655440000'; 
      
      (SubjectService.deactivateSubject as jest.Mock).mockResolvedValue({
        id: subjectId,
        status: SubjectStatus.INACTIVE
      });

      const res = await request(app)
        .patch(`/api/subjects/${subjectId}/status`)
        .send({ status: SubjectStatus.INACTIVE });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(SubjectStatus.INACTIVE);
      expect(SubjectService.deactivateSubject).toHaveBeenCalledWith('school-123', 'admin-123', subjectId);
    });
  });
});