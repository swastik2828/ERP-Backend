import request from 'supertest';
import app from '../../../app';
import prisma from '../../../database/prisma';
import { sign } from 'jsonwebtoken';

describe('Homework Module (e2e)', () => {
  let authToken: string;
  const testSchoolId = '11111111-1111-1111-1111-111111111111';
  const testTeacherId = '22222222-2222-2222-2222-222222222222';

  beforeAll(async () => {
    // Generate a valid mock JWT token for testing
    authToken = sign(
      { id: testTeacherId, schoolId: testSchoolId, role: 'TEACHER' },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  afterAll(async () => {
    // Clean up database after tests
    await prisma.assignment.deleteMany({ where: { schoolId: testSchoolId } });
    await prisma.$disconnect();
  });

  describe('/api/v1/homework (POST)', () => {
    it('should create a new assignment successfully', async () => {
      const response = await request(app)
        .post('/api/v1/homework')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'E2E Test Assignment',
          description: 'This is an end-to-end test.',
          academicSessionId: '33333333-3333-3333-3333-333333333333',
          classId: '44444444-4444-4444-4444-444444444444',
          sectionId: '55555555-5555-5555-5555-555555555555',
          subjectId: '66666666-6666-6666-6666-666666666666',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('E2E Test Assignment');
      expect(response.body.data.status).toBe('DRAFT');
    });

    it('should reject requests with missing authorization', async () => {
      const response = await request(app)
        .post('/api/v1/homework')
        .send({}); // No Auth header, no body

      expect(response.status).toBe(401);
    });
  });
});