import request from 'supertest';
import app from '../../../app'; 
import { prisma } from '../../../database/prisma';
import { generateAccessToken } from '../../../utils/jwt.util'; 
import { RelationshipType, StudentStatus, Role } from '@prisma/client';

jest.setTimeout(30000);

describe('Integration Test: Full Admission Flow', () => {
  let authToken: string;
  let parentId: string;
  let studentId: string;
  
  // Valid UUIDs required by PostgreSQL
  const schoolId = '11111111-1111-1111-1111-111111111111'; 
  const classId = '22222222-2222-2222-2222-222222222222';   
  const nextClassId = '44444444-4444-4444-4444-444444444444';
  const sessionId = '33333333-3333-3333-3333-333333333333'; 
  const parentUserId = '55555555-5555-5555-5555-555555555555';
  const adminUserId = '66666666-6666-6666-6666-666666666666'; // Using a valid UUID for the admin

  beforeAll(async () => {
    // Generate mock token using the valid admin UUID
    authToken = generateAccessToken({ 
      sub: adminUserId, 
      schoolId, 
      role: Role.SCHOOL_ADMIN, 
      email: 'admin@school.com' 
    });

    // Seed the Admin User to satisfy any foreign key constraints in Audit Logs
    await prisma.user.upsert({
      where: { id: adminUserId },
      update: {},
      create: { 
        id: adminUserId, 
        email: 'admin@school.com', 
        passwordHash: 'hash', 
        fullName: 'Admin User',
        role: Role.SCHOOL_ADMIN 
      }
    });

    // Seed the database with mandatory relational entities
    await prisma.school.upsert({
      where: { id: schoolId },
      update: {},
      create: { id: schoolId, name: 'Integration Test School', code: 'IT-01' }
    });

    await prisma.user.upsert({
      where: { id: parentUserId },
      update: {},
      create: { id: parentUserId, email: 'parent@test.com', passwordHash: 'hash', fullName: 'Robert Smith' }
    });

    await prisma.academicSession.upsert({
      where: { id: sessionId },
      update: {},
      create: { id: sessionId, schoolId, name: '2025-2026', startDate: new Date(), endDate: new Date() }
    });

    await prisma.class.upsert({
      where: { id: classId },
      update: {},
      create: { id: classId, schoolId, academicSessionId: sessionId, name: 'Grade 10', code: 'G10', displayOrder: 1 }
    });

    await prisma.class.upsert({
      where: { id: nextClassId },
      update: {},
      create: { id: nextClassId, schoolId, academicSessionId: sessionId, name: 'Grade 11', code: 'G11', displayOrder: 2 }
    });
  });

  afterAll(async () => {
    // Clean up test database in correct foreign-key order
    await prisma.parentStudent.deleteMany({ where: { parent: { schoolId } } });
    await prisma.academicHistory.deleteMany({ where: { student: { schoolId } } });
    await prisma.student.deleteMany({ where: { schoolId } });
    await prisma.parent.deleteMany({ where: { schoolId } });
    await prisma.user.delete({ where: { id: adminUserId } }); // Clean up the seeded admin user
    await prisma.$disconnect();
  });

  it('Step 1: Create Parent', async () => {
    const res = await request(app)
      .post('/api/v1/parents')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: parentUserId,
        firstName: 'Robert',
        lastName: 'Smith',
        mobile: '555-0100',
        occupation: 'Engineer'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    parentId = res.body.data.id;
  });

  it('Step 2: Create Student (Admission)', async () => {
    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        classId,
        academicSessionId: sessionId,
        admissionNumber: `ADM-${Date.now()}`, 
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '2010-05-15',
        gender: 'FEMALE',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe(StudentStatus.ACTIVE);
    studentId = res.body.data.id;
  });

  it('Step 3: Link Parent to Student', async () => {
    const res = await request(app)
      .post(`/api/v1/parents/${parentId}/link-student`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        studentId,
        relationshipType: RelationshipType.FATHER,
        isPrimaryGuardian: true,
        isEmergencyContact: true
      });

    expect(res.status).toBe(200);
  });

  it('Step 4: Promote Student', async () => {
    const res = await request(app)
      .post(`/api/v1/students/${studentId}/promote`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        newClassId: nextClassId,
        academicSessionId: sessionId,
        reason: 'Passed 10th Grade'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.classId).toBe(nextClassId);
  });

  it('Step 5: Graduate Student', async () => {
    const res = await request(app)
      .post(`/api/v1/students/${studentId}/graduate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ finalSessionId: sessionId });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(StudentStatus.GRADUATED);
  });
});