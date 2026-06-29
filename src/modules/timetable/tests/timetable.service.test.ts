import { TimetableService } from '../services/timetable.service';
import { TimetableRepository } from '../repositories/timetable.repository';
import { TimetableConflictRepository } from '../repositories/timetable-conflict.repository';
import { AppError } from '../../../errors/AppError';
import { DayOfWeek } from '@prisma/client';

// Mock dependencies
jest.mock('../repositories/timetable.repository');
jest.mock('../repositories/timetable-conflict.repository');

describe('TimetableService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('publishTimetable', () => {
    it('should successfully publish a DRAFT timetable', async () => {
      const mockTimetable = { id: 'tt-1', status: 'DRAFT' };
      (TimetableRepository.findById as jest.Mock).mockResolvedValue(mockTimetable);
      (TimetableRepository.publish as jest.Mock).mockResolvedValue({ ...mockTimetable, status: 'PUBLISHED' });

      const result = await TimetableService.publishTimetable('tt-1', 'user-1');

      expect(TimetableRepository.publish).toHaveBeenCalledWith('tt-1', 'user-1');
      expect(result.status).toBe('PUBLISHED');
    });

    it('should throw AppError if timetable is already PUBLISHED', async () => {
      const mockTimetable = { id: 'tt-1', status: 'PUBLISHED' };
      (TimetableRepository.findById as jest.Mock).mockResolvedValue(mockTimetable);

      await expect(TimetableService.publishTimetable('tt-1', 'user-1')).rejects.toThrow(AppError);
      await expect(TimetableService.publishTimetable('tt-1', 'user-1')).rejects.toThrow('Timetable is already published');
    });
  });

  describe('addSlot (Conflict Engine)', () => {
    const validSlotData = {
      timetableId: 'tt-1',
      dayOfWeek: DayOfWeek.MONDAY,
      periodId: 'period-1',
      teacherId: 'teacher-1',
      classroomId: 'room-1'
    };

    it('should add slot when no conflicts exist', async () => {
      (TimetableRepository.findById as jest.Mock).mockResolvedValue({ id: 'tt-1', status: 'DRAFT' });
      (TimetableConflictRepository.checkDuplicateSlot as jest.Mock).mockResolvedValue(null);
      (TimetableConflictRepository.checkTeacherConflict as jest.Mock).mockResolvedValue(null);
      (TimetableConflictRepository.checkClassroomConflict as jest.Mock).mockResolvedValue(null);
      (TimetableRepository.createSlot as jest.Mock).mockResolvedValue(validSlotData);

      const result = await TimetableService.addSlot(validSlotData);

      expect(TimetableRepository.createSlot).toHaveBeenCalledWith(validSlotData);
      expect(result).toEqual(validSlotData);
    });

    it('should throw AppError on duplicate slot conflict', async () => {
      (TimetableRepository.findById as jest.Mock).mockResolvedValue({ id: 'tt-1', status: 'DRAFT' });
      // Simulate finding an existing slot for this time in this timetable
      (TimetableConflictRepository.checkDuplicateSlot as jest.Mock).mockResolvedValue({ id: 'existing-slot' });

      await expect(TimetableService.addSlot(validSlotData)).rejects.toThrow(AppError);
      await expect(TimetableService.addSlot(validSlotData)).rejects.toThrow(/A slot already exists for/);
    });

    it('should throw AppError on teacher conflict across different classes', async () => {
      (TimetableRepository.findById as jest.Mock).mockResolvedValue({ id: 'tt-1', status: 'DRAFT' });
      (TimetableConflictRepository.checkDuplicateSlot as jest.Mock).mockResolvedValue(null);
      
      // Simulate teacher already teaching another class
      (TimetableConflictRepository.checkTeacherConflict as jest.Mock).mockResolvedValue({
        timetable: { class: { name: 'Class 10' }, section: { name: 'A' } }
      });

      await expect(TimetableService.addSlot(validSlotData)).rejects.toThrow(AppError);
      await expect(TimetableService.addSlot(validSlotData)).rejects.toThrow(/Teacher conflict: Already assigned to Class 10/);
    });
  });
});