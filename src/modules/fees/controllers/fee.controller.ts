import { Request, Response, NextFunction } from 'express';
import { feeService } from '../services/fee.service';
import { feeRepository } from '../repositories/fee.repository';

export class FeeController {
  
  // ==========================================
  // FEE CATEGORY & STRUCTURE
  // ==========================================

  public createFeeCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schoolId = req.user!.schoolId!;
      const category = await feeService.createFeeCategory(schoolId, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Fee category created successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  };

  public getFeeCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schoolId = req.user!.schoolId!;
      const categories = await feeRepository.getFeeCategories(schoolId);
      
      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  };

  public createFeeStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schoolId = req.user!.schoolId!;
      const userId = req.user!.id;
      
      const structure = await feeService.createFeeStructure(schoolId, userId, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Fee structure created successfully',
        data: structure
      });
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // STUDENT FEES & LEDGER
  // ==========================================

  public assignFee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.studentId as string;;
      const { feeStructureId } = req.body;
      const userId = req.user!.id;

      const assignment = await feeService.assignFeeToStudent(studentId, feeStructureId, userId);
      
      res.status(201).json({
        success: true,
        message: 'Fee assigned successfully',
        data: assignment
      });
    } catch (error) {
      next(error);
    }
  };

  public getStudentLedger = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.studentId as string;
      const ledger = await feeRepository.getStudentLedger(studentId);
      const currentBalance = await feeService.getCurrentBalance(studentId);
      
      res.status(200).json({
        success: true,
        data: {
          currentBalance,
          transactions: ledger
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // PAYMENTS & RECEIPTS
  // ==========================================

  public collectPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schoolId = req.user!.schoolId!;
      const userId = req.user!.id;

      const { payment, receipt } = await feeService.collectPayment(schoolId, userId, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Payment collected and receipt generated successfully',
        data: {
          payment,
          receipt
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

export const feeController = new FeeController();