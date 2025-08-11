import { PrismaClient, Application, User, JobPost, Organization, Interview } from '@prisma/client';
import logger from '../utils/logger';

export interface ApplicationWithDetails extends Application {
  job: JobPost & {
    organization: Organization;
  };
  organization: Organization;
  recruiter: User;
  interviews: Interview[];
}

export interface ApplicationList extends Application {
  job: JobPost & {
    organization: Organization;
  };
}

export interface InterviewWithDetails extends Interview {
  application: Application & {
    job: JobPost & {
      organization: Organization;
    };
    candidate: User;
    recruiter: User;
  };
  creator: User;
}

export class CandidateService {
  constructor(private prisma: PrismaClient) { }

  async getCandidateApplications(candidateId: number, filters?: {
    status?: string;
    jobId?: number;
  }): Promise<ApplicationList[]> {
    try {
      const where: any = {
        candidateId,
        deletedAt: null,
      };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.jobId) {
        where.jobId = filters.jobId;
      }

      const applications = await this.prisma.application.findMany({
        where,
        include: {
          job: {
            include: {
              organization: true,
            },
          },
          // Simplified list view - only include job and organization details
        },
        orderBy: {
          applicationDate: 'desc',
        },
      });

      return applications;
    } catch (error) {
      logger.error('Error fetching candidate applications:', error);
      throw error;
    }
  }

  async getApplicationById(applicationId: number, candidateId: number): Promise<ApplicationWithDetails> {
    try {
      const application = await this.prisma.application.findFirst({
        where: {
          id: applicationId,
          candidateId,
          deletedAt: null,
        },
        include: {
          job: {
            include: {
              organization: true,
            },
          },
          organization: true,
          recruiter: true,
          interviews: {
            include: {
              creator: true,
            },
            orderBy: {
              scheduledAt: 'desc',
            },
          },
        },
      });

      if (!application) {
        throw new Error('Application not found or access denied');
      }

      return application;
    } catch (error) {
      logger.error('Error fetching application by ID:', error);
      throw error;
    }
  }

  async getCandidateInterviews(candidateId: number, filters?: {
    status?: string;
    mode?: string;
    applicationId?: number;
  }): Promise<InterviewWithDetails[]> {
    try {
      const where: any = {
        application: {
          candidateId: BigInt(candidateId),
          deletedAt: null,
        },
      };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.mode) {
        where.mode = filters.mode;
      }

      if (filters?.applicationId) {
        where.applicationId = filters.applicationId;
      }

      const interviews = await this.prisma.interview.findMany({
        where,
        include: {
          application: {
            include: {
              job: {
                include: {
                  organization: true,
                },
              },
              candidate: true,
              recruiter: true,
            },
          },
          creator: true,
        },
        orderBy: {
          scheduledAt: 'desc',
        },
      });

      return interviews;
    } catch (error) {
      logger.error('Error fetching candidate interviews:', error);
      throw error;
    }
  }

  async getInterviewById(interviewId: number, candidateId: number): Promise<InterviewWithDetails> {
    try {
      const interview = await this.prisma.interview.findFirst({
        where: {
          id: BigInt(interviewId),
          application: {
            candidateId: BigInt(candidateId),
            deletedAt: null,
          },
        },
        include: {
          application: {
            include: {
              job: {
                include: {
                  organization: true,
                },
              },
              candidate: true,
              recruiter: true,
            },
          },
          creator: true,
        },
      });

      if (!interview) {
        throw new Error('Interview not found or access denied');
      }

      return interview;
    } catch (error) {
      logger.error('Error fetching interview by ID:', error);
      throw error;
    }
  }

  async getCandidateProfile(candidateId: number): Promise<User & { candidateDetails: any }> {
    try {
      const candidate = await this.prisma.user.findFirst({
        where: {
          id: candidateId,
          userType: 'CANDIDATE',
          deletedAt: null,
        },
        include: {
          candidateDetails: true,
        },
      });

      if (!candidate) {
        throw new Error('Candidate profile not found');
      }

      return candidate;
    } catch (error) {
      logger.error('Error fetching candidate profile:', error);
      throw error;
    }
  }

  async updateCandidateProfile(candidateId: number, updateData: {
    firstName?: string;
    lastName?: string;
    candidateDetails?: any;
  }): Promise<User & { candidateDetails: any }> {
    try {
      const { candidateDetails, ...userData } = updateData;

      const updatePromises: Promise<any>[] = [];

      // Update user data
      if (Object.keys(userData).length > 0) {
        updatePromises.push(
          this.prisma.user.update({
            where: { id: candidateId },
            data: userData,
          })
        );
      }

      // Update candidate details
      if (candidateDetails) {
        updatePromises.push(
          this.prisma.candidateDetails.upsert({
            where: { userId: candidateId },
            update: candidateDetails,
            create: {
              userId: candidateId,
              ...candidateDetails,
            },
          })
        );
      }

      await Promise.all(updatePromises);

      const updatedCandidate = await this.prisma.user.findFirst({
        where: { id: candidateId },
        include: {
          candidateDetails: true,
        },
      });

      if (!updatedCandidate) {
        throw new Error('Failed to update candidate profile');
      }

      logger.info(`Candidate profile updated: ${candidateId}`);
      return updatedCandidate;
    } catch (error) {
      logger.error('Error updating candidate profile:', error);
      throw error;
    }
  }

  async getApplicationStats(candidateId: number): Promise<{
    total: number;
    pending: number;
    reviewing: number;
    shortlisted: number;
    rejected: number;
    hired: number;
    withdrawn: number;
  }> {
    try {
      const stats = await this.prisma.application.groupBy({
        by: ['status'],
        where: {
          candidateId,
          deletedAt: null,
        },
        _count: {
          status: true,
        },
      });

      const result = {
        total: 0,
        pending: 0,
        reviewing: 0,
        shortlisted: 0,
        rejected: 0,
        hired: 0,
        withdrawn: 0,
      };

      stats.forEach((stat) => {
        const count = stat._count.status;
        result.total += count;
        result[stat.status.toLowerCase() as keyof typeof result] = count;
      });

      return result;
    } catch (error) {
      logger.error('Error fetching application stats:', error);
      throw error;
    }
  }

  async getJobDetails(jobId: number): Promise<JobPost & { organization: Organization }> {
    try {
      const job = await this.prisma.jobPost.findFirst({
        where: {
          id: jobId,
        },
        include: {
          organization: true,
        },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      return job;
    } catch (error) {
      logger.error('Error fetching job details:', error);
      throw error;
    }
  }

  async getOrganizationDetails(organizationId: number): Promise<Organization> {
    try {
      const organization = await this.prisma.organization.findFirst({
        where: {
          id: organizationId,
        },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      return organization;
    } catch (error) {
      logger.error('Error fetching organization details:', error);
      throw error;
    }
  }



} 