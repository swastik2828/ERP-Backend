import request from 'supertest';
import express from 'express';
import { LeaveStatus, LeaveType } from '@prisma/client';

jest.mock('../../../middlewares/auth.middleware', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-123', schoolId: 'school-123', role: 'STUDENT' };
    next();
  }
}));

jest.mock('../../../middlewares/role.middleware', () => ({
  requireExactRole: () => (_req: any, _res: any, next: any) => next()
}));

jest.mock('../services/leave.service');
jest.mock('../repositories/leave.repository');
jest.mock('../services/leave-report.service');

import { LeaveService } from '../services/leave.service';
import { LeaveRepository } from '../repositories/leave.repository';
import { LeaveReportService } from '../services/leave-report.service';
import leaveRoutes from '../routes/leave.routes';

const app = express();
app.use(express.json());
app.use('/api/leaves', leaveRoutes);
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.statusCode || 400).json({ success: false, message: err.message, errors: err.errors });
});

describe('Leave Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/leaves/student/leaves', () => {
    it('should return 400 validation error if payload is invalid (missing leaveType & short reason)', async () => {
      const invalidPayload = {
        reason: 'Bad',
        startDate: '2026-09-10T00:00:00Z',
        endDate: '2026-09-12T00:00:00Z'
      };

      const res = await request(app).post('/api/leaves/student/leaves').send(invalidPayload);

      expect(res.status).toBe(400);
      expect(LeaveService.prototype.submitLeave).not.toHaveBeenCalled();
    });

    it('should return 201 and created leave for valid payload', async () => {
      const validPayload = {
        leaveType: LeaveType.CASUAL_LEAVE,
        reason: 'Family trip to hills',
        startDate: '2026-09-10T00:00:00Z',
        endDate: '2026-09-12T00:00:00Z'
      };

      const mockLeave = { id: 'leave-100', status: LeaveStatus.PENDING };
      (LeaveService.prototype.submitLeave as jest.Mock).mockResolvedValue(mockLeave);

      const res = await request(app).post('/api/leaves/student/leaves').send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('leave-100');
    });
  });

  describe('GET /api/leaves/student/leaves', () => {
    it('should return 200 and list of student leaves', async () => {
      const mockResult = { data: [{ id: 'leave-100' }], total: 1 };
      (LeaveService.prototype.getMyLeaves as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app).get('/api/leaves/student/leaves?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toHaveLength(1);
    });
  });

  describe('PATCH /api/leaves/student/leaves/:id/cancel', () => {
    it('should return 200 when cancelling leave with valid UUID', async () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000';
      const mockCancelled = { id: validId, status: LeaveStatus.CANCELLED };
      (LeaveService.prototype.cancelLeave as jest.Mock).mockResolvedValue(mockCancelled);

      const res = await request(app).patch(`/api/leaves/student/leaves/${validId}/cancel`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(LeaveStatus.CANCELLED);
    });

    it('should return 400 validation error if id is not a valid UUID', async () => {
      const res = await request(app).patch('/api/leaves/student/leaves/invalid-id/cancel');

      expect(res.status).toBe(400);
      expect(LeaveService.prototype.cancelLeave).not.toHaveBeenCalled();
    });
  });

  describe('Teacher Approvals & Staff Routes', () => {
    it('GET /api/leaves/teacher/student-leaves should return reviewable leaves', async () => {
      const mockLeaves = { data: [{ id: 'leave-200' }], total: 1 };
      (LeaveRepository.prototype.findAll as jest.Mock).mockResolvedValue(mockLeaves);

      const res = await request(app).get('/api/leaves/teacher/student-leaves');

      expect(res.status).toBe(200);
      expect(res.body.data.data[0].id).toBe('leave-200');
    });

    it('PATCH /api/leaves/teacher/student-leaves/:id/approve should approve leave', async () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000';
      (LeaveService.prototype.reviewLeave as jest.Mock).mockResolvedValue({ id: validId, status: LeaveStatus.APPROVED });

      const res = await request(app)
        .patch(`/api/leaves/teacher/student-leaves/${validId}/approve`)
        .send({ status: LeaveStatus.APPROVED });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/leaves/teacher/student-leaves/:id/reject should fail if adminRemarks is missing', async () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000';

      const res = await request(app)
        .patch(`/api/leaves/teacher/student-leaves/${validId}/reject`)
        .send({ status: LeaveStatus.REJECTED });

      expect(res.status).toBe(400);
      expect(LeaveService.prototype.reviewLeave).not.toHaveBeenCalled();
    });
  });

  describe('Admin Reports & Statistics', () => {
    it('GET /api/leaves/admin/leaves/statistics should return statistics', async () => {
      const mockStats = { studentLeaves: { pending: 1 }, teacherLeaves: { pending: 2 } };
      (LeaveReportService.prototype.getStatistics as jest.Mock).mockResolvedValue(mockStats);

      const res = await request(app).get('/api/leaves/admin/leaves/statistics');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockStats);
    });

    it('GET /api/leaves/admin/leaves/report should return report array', async () => {
      const mockReport = [{ id: 'leave-300' }];
      (LeaveReportService.prototype.getReport as jest.Mock).mockResolvedValue(mockReport);

      const res = await request(app).get('/api/leaves/admin/leaves/report?status=APPROVED');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockReport);
    });
  });
});
