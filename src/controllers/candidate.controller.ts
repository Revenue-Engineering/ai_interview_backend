import { Request, Response } from 'express';
import { CandidateService } from '../services/candidate.service';
import logger from '../utils/logger';
import { serializeForJSON, serializeEntityResponse, serializeEntitiesResponse } from '../utils/serializer';

export class CandidateController {
  constructor(private candidateService: CandidateService) { }

  // Get candidate's applications
  async getMyApplications(req: Request, res: Response): Promise<void> {
    try {
      const candidateId = (req as any).user.userId;
      console.log('candidateId', candidateId);
      const { status, jobId } = req.query;

      const filters: any = {};
      if (status) filters.status = status as string;
      if (jobId) filters.jobId = parseInt(jobId as string);

      const applications = await this.candidateService.getCandidateApplications(candidateId, filters);

      res.status(200).json({
        success: true,
        data: serializeEntitiesResponse(applications),
        count: applications.length,
      });
    } catch (error: any) {
      logger.error('Error in getMyApplications controller:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch applications',
      });
    }
  }

  // Get specific application with job and organization details
  async getMyApplicationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const candidateId = (req as any).user.userId;

      const application = await this.candidateService.getApplicationById(
        parseInt(id),
        parseInt(candidateId)
      );

      res.status(200).json({
        success: true,
        data: serializeEntityResponse(application),
      });
    } catch (error: any) {
      logger.error('Error in getMyApplicationById controller:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Application not found',
      });
    }
  }

  // Get candidate's interviews
  async getMyInterviews(req: Request, res: Response): Promise<void> {
    try {
      const candidateId = (req as any).user.userId;
      const { status, mode, applicationId } = req.query;

      const filters: any = {};
      if (status) filters.status = status as string;
      if (mode) filters.mode = mode as string;
      if (applicationId) filters.applicationId = parseInt(applicationId as string);

      const interviews = await this.candidateService.getCandidateInterviews(candidateId, filters);

      res.status(200).json({
        success: true,
        data: serializeEntitiesResponse(interviews),
        count: interviews.length,
      });
    } catch (error: any) {
      logger.error('Error in getMyInterviews controller:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch interviews',
      });
    }
  }

  // Get specific interview details
  async getMyInterviewById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const candidateId = (req as any).user.userId;

      const interview = await this.candidateService.getInterviewById(
        parseInt(id),
        parseInt(candidateId)
      );

      res.status(200).json({
        success: true,
        data: serializeEntityResponse(interview),
      });
    } catch (error: any) {
      logger.error('Error in getMyInterviewById controller:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Interview not found',
      });
    }
  }

  // Get candidate profile
  async getMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const candidateId = (req as any).user.userId;

      const profile = await this.candidateService.getCandidateProfile(candidateId);

      res.status(200).json({
        success: true,
        data: serializeEntityResponse(profile),
      });
    } catch (error: any) {
      logger.error('Error in getMyProfile controller:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Profile not found',
      });
    }
  }

  // Update candidate profile
  async updateMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const candidateId = (req as any).user.userId;
      const updateData = req.body;

      const updatedProfile = await this.candidateService.updateCandidateProfile(
        parseInt(candidateId),
        updateData
      );

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: serializeEntityResponse(updatedProfile),
      });
    } catch (error: any) {
      logger.error('Error in updateMyProfile controller:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update profile',
      });
    }
  }

  // Get application statistics
  async getMyApplicationStats(req: Request, res: Response): Promise<void> {
    try {
      const candidateId = (req as any).user.userId;

      const stats = await this.candidateService.getApplicationStats(parseInt(candidateId));

      res.status(200).json({
        success: true,
        data: serializeForJSON(stats),
      });
    } catch (error: any) {
      logger.error('Error in getMyApplicationStats controller:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch application statistics',
      });
    }
  }

  // Get job details
  async getJobDetails(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      const jobDetails = await this.candidateService.getJobDetails(parseInt(jobId || '0'));

      res.status(200).json({
        success: true,
        data: serializeEntityResponse(jobDetails),
      });
    } catch (error: any) {
      logger.error('Error in getJobDetails controller:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Job not found',
      });
    }
  }

  // Get organization details
  async getOrganizationDetails(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      const organizationDetails = await this.candidateService.getOrganizationDetails(
        parseInt(organizationId || '0')
      );

      res.status(200).json({
        success: true,
        data: serializeEntityResponse(organizationDetails),
      });
    } catch (error: any) {
      logger.error('Error in getOrganizationDetails controller:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Organization not found',
      });
    }
  }


} 