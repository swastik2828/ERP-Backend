import cron from 'node-cron';
import { AssignmentJobs } from '../jobs/assignment.jobs';
// import prisma from '../../../database/prisma';
// import { AssignmentStatus } from '@prisma/client';

jest.mock('node-cron');
jest.mock('../../../database/prisma', () => ({
  assignment: {
    updateMany: jest.fn(),
    findMany: jest.fn(),
  },
}));

describe('AssignmentJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register the cron jobs correctly', () => {
    AssignmentJobs.initJobs();
    // Expect cron.schedule to be called twice (auto-publish and auto-close)
    expect(cron.schedule).toHaveBeenCalledTimes(2);
    expect(cron.schedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
    expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
  });

  // Note: To thoroughly test the internal logic of the cron callbacks, 
  // you would typically extract the callback functions into public/static methods
  // or test them via an integration testing approach.
});