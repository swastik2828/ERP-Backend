import request from 'supertest';
import express from 'express';
import academicRoutes from '../routes/academic.routes';
import prisma from '../../../database/prisma';

// 1. Setup minimal Express app for testing
const app = express();
app.use(express.json());

// 2. Mock Middlewares to bypass actual JWT auth during route testing
jest.mock('../../../middlewares/auth.middleware', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-admin-id', schoolId: 'test-school-id', role: 'SCHOOL_ADMIN' };
    next();
  }
}));

jest.mock('../../../middlewares/role.middleware', () => ({
  requireExactRole: () => (_req: any, _res: any, next: any) => next()
}));

jest.mock('../../../middlewares/tenant.middleware', () => ({
  requireTenantIsolation: (_req: any, _res: any, next: any) => next()
}));

// Apply the routes
app.use('/api/v1/academics', academicRoutes);

app.use((err: any, _req: any, res: any, _next: any) => {
  if (err.statusCode >= 500) {
    console.error(err);
  }

  res.status(err.statusCode || 500).json({
    message: err.message,
  });
});

// 3. Mock the Prisma DB completely
jest.mock('../../../database/prisma', () => ({
  academicSession: { findFirst: jest.fn() },
  class: { 
    findFirst: jest.fn(), 
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn()
  },
  section: {
    findFirst: jest.fn(),
    create: jest.fn()
  }
}));

describe('Academic Integration Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/academics/classes', () => {
    it('should return 201 on valid class creation', async () => {
      const payload = {
        academicSessionId: 'b75fba18-8f81-4357-961d-84e0c406de81', // Must be valid UUID for Zod
        name: 'Class 10',
        code: 'C10',
        displayOrder: 10
      };

      (prisma.academicSession.findFirst as jest.Mock).mockResolvedValue({ id: payload.academicSessionId });
      (prisma.class.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.class.create as jest.Mock).mockResolvedValue({ id: 'new-class-id', ...payload });

      const res = await request(app)
        .post('/api/v1/academics/classes')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id', 'new-class-id');
    });

    it('should return 400 (Validation Error) if required fields are missing', async () => {
      const payload = {
        name: 'Class 10' // Missing code, displayOrder, and academicSessionId
      };

      const res = await request(app)
        .post('/api/v1/academics/classes')
        .send(payload);

      expect(res.status).toBe(400); // Caught by Zod validator middleware
    });
  });

  describe('GET /api/v1/academics/classes', () => {
    it('should return 200 and paginated list of classes', async () => {
      const mockClasses = [
        { id: '1', name: 'Class 1', code: 'C1', _count: { sections: 0 } },
        { id: '2', name: 'Class 2', code: 'C2', _count: { sections: 0 } }
      ];

      // Update these mocks to match what ClassRepository.findMany actually returns
      (prisma.class.findMany as jest.Mock).mockResolvedValue(mockClasses);
      (prisma.class.count as jest.Mock).mockResolvedValue(2);

      const res = await request(app).get('/api/v1/academics/classes?page=1&limit=10');
      console.log(res.status);
    console.log(res.body);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });
  });

  describe('POST /api/v1/academics/sections', () => {
    it('should return 201 on valid section creation', async () => {
      const payload = {
        classId: 'b75fba18-8f81-4357-961d-84e0c406de81', 
        name: 'A',
        capacity: 45
      };

      (prisma.class.findFirst as jest.Mock).mockResolvedValue({ id: payload.classId, schoolId: 'test-school-id' });
      (prisma.section.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.section.create as jest.Mock).mockResolvedValue({ id: 'new-section-id', ...payload });

      const res = await request(app)
        .post('/api/v1/academics/sections')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('A');
    });
  });
});