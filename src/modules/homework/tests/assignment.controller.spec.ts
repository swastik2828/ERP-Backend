import { Request, Response } from 'express';
import { AssignmentController } from '../controllers/assignment.controller';
import { AssignmentService } from '../services/assignment.service';

jest.mock('../services/assignment.service');

describe('AssignmentController', () => {
  let controller: AssignmentController;
  let mockService: jest.Mocked<AssignmentService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockService = new AssignmentService(null as any) as jest.Mocked<AssignmentService>;
    controller = new AssignmentController(mockService);
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('createAssignment', () => {
    it('should successfully pass validated data to the service and return 201', async () => {
      mockReq = {
        user: { id: 'teacher-123', schoolId: 'school-456', role: 'TEACHER' } as any,
        body: {
          title: 'Valid Title',
          description: 'Valid Description with enough characters',
          academicSessionId: '768378d3-7d8b-4a5f-9e79-51a8f335b2e3',
          classId: '768378d3-7d8b-4a5f-9e79-51a8f335b2e3',
          sectionId: '768378d3-7d8b-4a5f-9e79-51a8f335b2e3',
          subjectId: '768378d3-7d8b-4a5f-9e79-51a8f335b2e3',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        },
      };

      mockService.createAssignment.mockResolvedValue({ id: 'new-assignment-id' } as any);

      await controller.createAssignment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.createAssignment).toHaveBeenCalledWith(
        'school-456',
        'teacher-123',
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should throw an error if the user context or schoolId is missing', async () => {
      mockReq = {
        user: { id: 'teacher-123' } as any, // Missing schoolId
        body: {},
      };

      await controller.createAssignment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockService.createAssignment).not.toHaveBeenCalled();
    });
  });
});