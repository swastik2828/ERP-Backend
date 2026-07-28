import { Router } from 'express';
import multer from 'multer';
import { NoticeController } from '../controllers/notices.controller';
import { AttachmentController } from '../controllers/attachment.controller';
import { AnalyticsController } from '../controllers/analytics.controller';
import { CategoryController } from '../controllers/category.controller';
import { CommentController } from '../controllers/comment.controller';

import { NoticeService } from '../services/notice.service';
import { FeedService } from '../services/feed.service';
import { InteractionService } from '../services/interaction.service';
import { AttachmentService } from '../services/attachment.service';
import { AnalyticsService } from '../services/analytics.service';
import { CategoryService } from '../services/category.service';
import { CommentService } from '../services/comment.service';

import { NoticeRepository } from '../repositories/notices.repositories';
import { NoticeAuditRepository } from '../repositories/notice-audit.repository';

import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/rbac.middleware';
import { validateRequest } from '../../../middlewares/validation.middleware';
import { CreateNoticeSchema, AcknowledgeNoticeSchema, CreateCategorySchema } from '../dtos/notices.dto';

const router = Router();

// Configure multer to store files in memory so the service can hash the buffer
const upload = multer({ storage: multer.memoryStorage() });

// Repositories
const auditRepo = new NoticeAuditRepository();
const noticeRepo = new NoticeRepository();

// Services
const noticeService = new NoticeService(noticeRepo, auditRepo);
const feedService = new FeedService();
const interactionService = new InteractionService(auditRepo);
const attachmentService = new AttachmentService();
const analyticsService = new AnalyticsService();
const categoryService = new CategoryService();
const commentService = new CommentService(auditRepo);

// Controllers
const noticeController = new NoticeController(noticeService, feedService, interactionService);
const attachmentController = new AttachmentController(attachmentService);
const analyticsController = new AnalyticsController(analyticsService);
const categoryController = new CategoryController(categoryService);
const commentController = new CommentController(commentService);

// Apply strict authentication to all routes
router.use(requireAuth);

// ==========================================
// FEED & USER INTERACTIONS
// ==========================================
router.get('/feed', noticeController.getFeed);
router.post('/:id/read', noticeController.markRead);
router.post('/:id/acknowledge', validateRequest(AcknowledgeNoticeSchema), noticeController.acknowledge);

// ==========================================
// CATEGORIES (Admin)
// ==========================================
router.post('/categories', requireRole(['SCHOOL_ADMIN', 'SUPER_ADMIN']), validateRequest(CreateCategorySchema), categoryController.create);
router.get('/categories', categoryController.list);

// ==========================================
// ADMIN ANALYTICS
// ==========================================
router.get('/dashboard', requireRole(['SCHOOL_ADMIN', 'SUPER_ADMIN']), analyticsController.getDashboardStats);
router.get('/:id/read-receipts', requireRole(['SCHOOL_ADMIN', 'SUPER_ADMIN']), analyticsController.getNoticeReadReceipts);
router.get('/:id/acknowledgments', requireRole(['SCHOOL_ADMIN', 'SUPER_ADMIN']), analyticsController.getNoticeAcknowledgments);

// ==========================================
// ATTACHMENTS
// ==========================================
router.post('/:id/attachments', requireRole(['ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN', 'TEACHER']), upload.single('file'), attachmentController.upload);
router.delete('/:id/attachments/:attachmentId', requireRole(['ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN', 'TEACHER']), attachmentController.delete);

// ==========================================
// COMMENTS
// ==========================================
router.post('/:id/comments', commentController.add);
router.delete('/:id/comments/:commentId', commentController.delete);

// ==========================================
// CORE NOTICE CRUD & LIFECYCLE
// ==========================================
router.post('/', requireRole(['ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN', 'TEACHER']), validateRequest(CreateNoticeSchema), noticeController.createNotice);
router.get('/:id', noticeController.getNoticeById);
router.patch('/:id', requireRole(['ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN', 'TEACHER']), noticeController.updateNotice);
router.delete('/:id', requireRole(['ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN', 'TEACHER']), noticeController.deleteNotice);

router.post('/:id/publish', requireRole(['ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN', 'TEACHER']), noticeController.publishNotice);
router.post('/:id/archive', requireRole(['ADMIN', 'SCHOOL_ADMIN', 'DATA_ENTRY_ADMIN', 'TEACHER']), noticeController.archiveNotice);
router.post('/:id/pin', requireRole(['SCHOOL_ADMIN', 'SUPER_ADMIN']), noticeController.pinNotice);
router.post('/:id/unpin', requireRole(['SCHOOL_ADMIN', 'SUPER_ADMIN']), noticeController.unpinNotice);

export default router;