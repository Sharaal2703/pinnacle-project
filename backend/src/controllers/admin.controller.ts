import { Request, Response, NextFunction } from 'express';
import { QuestionService } from '../services/question.service';
import { ConfigService } from '../services/config.service';
import { TeacherAccountService } from '../services/teacher-account.service';

export class AdminController {
  static async listTeachers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json(await TeacherAccountService.listTeachers());
    } catch (err) {
      next(err);
    }
  }

  static async createTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(201).json(await TeacherAccountService.createTeacherAccount(req.body));
    } catch (err) {
      next(err);
    }
  }

  static async listQuestions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const questions = await QuestionService.listQuestions();
      res.status(200).json(questions);
    } catch (err) {
      next(err);
    }
  }

  static async createQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const question = await QuestionService.createQuestion(req.body);
      res.status(201).json(question);
    } catch (err) {
      next(err);
    }
  }

  static async updateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const question = await QuestionService.updateQuestion(req.params.question_id, req.body);
      res.status(200).json(question);
    } catch (err) {
      next(err);
    }
  }

  static async reviewQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const question = await QuestionService.recordReview(req.params.question_id, req.body);
      res.status(200).json(question);
    } catch (err) {
      next(err);
    }
  }

  static async activateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const question = await QuestionService.activateQuestion(req.params.question_id);
      res.status(200).json(question);
    } catch (err) {
      next(err);
    }
  }

  static async deactivateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await QuestionService.deactivateQuestion(req.params.question_id);
      res.status(200).json({ message: 'Question deactivated successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async getConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cfg = await ConfigService.getActiveConfig();
      res.status(200).json({
        id: cfg.id,
        version: cfg.version,
        total_limit_seconds: cfg.totalLimitSec,
        self_report_limit_seconds: cfg.selfReportLimitSec,
        scenario_limit_seconds: cfg.scenarioLimitSec,
        grace_period_seconds: cfg.gracePeriodSec,
        min_answered_count: cfg.minAnsweredCount,
        default_question_weight: Number(cfg.defaultQuestionWeight),
        scoring_formula_version: cfg.scoringFormulaVersion,
        is_active: cfg.isActive,
        created_at: cfg.createdAt.toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const b = req.body;
      const cfg = await ConfigService.updateConfig(b.version, {
        totalLimitSec: b.total_limit_seconds,
        selfReportLimitSec: b.self_report_limit_seconds,
        scenarioLimitSec: b.scenario_limit_seconds,
        gracePeriodSec: b.grace_period_seconds,
        minAnsweredCount: b.min_answered_count,
        defaultQuestionWeight: b.default_question_weight,
        scoringFormulaVersion: b.scoring_formula_version
      });

      res.status(200).json({
        id: cfg.id,
        version: cfg.version,
        total_limit_seconds: cfg.totalLimitSec,
        self_report_limit_seconds: cfg.selfReportLimitSec,
        scenario_limit_seconds: cfg.scenarioLimitSec,
        grace_period_seconds: cfg.gracePeriodSec,
        min_answered_count: cfg.minAnsweredCount,
        default_question_weight: Number(cfg.defaultQuestionWeight),
        scoring_formula_version: cfg.scoringFormulaVersion,
        is_active: cfg.isActive,
        created_at: cfg.createdAt.toISOString()
      });
    } catch (err) {
      next(err);
    }
  }
}
