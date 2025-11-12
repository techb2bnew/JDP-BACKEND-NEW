import { JobController } from '../controllers/jobController.js';
import { 
  createJobSchema, 
  updateJobSchema, 
  getJobsSchema, 
  getJobByIdSchema, 
  deleteJobSchema,
  updateWorkDataSchema
} from '../validations/jobValidation.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export async function jobRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateToken);

  fastify.post('/createJob', {
    schema: createJobSchema,
    handler: JobController.createJob
  });

  fastify.get('/getJobs', {
    schema: getJobsSchema,
    handler: JobController.getJobs
  });

  fastify.get('/searchJobs', {
    handler: JobController.searchJobs
  });

  fastify.get('/getJobTypes', {
    handler: JobController.getJobTypes
  });

  fastify.get('/searchMyJobs', {
    handler: JobController.searchMyJobs
  });

  fastify.get('/searchTimesheets', {
    handler: JobController.searchTimesheets
  });

  fastify.get('/getJobStats/stats', {
    handler: JobController.getJobStats
  });


  fastify.get('/getJobById/:id', {
    schema: getJobByIdSchema,
    handler: JobController.getJobById
  });

  fastify.post('/updateJob/:id', {
    schema: updateJobSchema,
    handler: JobController.updateJob
  });

  fastify.post('/jobCompleted/:id', {
    handler: JobController.completeJob
  });

  fastify.delete('/deleteJob/:id', {
    schema: deleteJobSchema,
    handler: JobController.deleteJob
  });

  fastify.get('/getJobsByCustomer/:customerId', {
    handler: JobController.getJobsByCustomer
  });

  fastify.get('/getJobsByContractor/:contractorId', {
    handler: JobController.getJobsByContractor
  });

  fastify.get('/getJobBluesheets/:jobId', {
    handler: JobController.getJobBluesheets
  });

  fastify.get('/getJobActivity/:jobId', {
    handler: JobController.getJobActivity
  });

  fastify.get('/getJobDashboardDetails/:id', {
    schema: getJobByIdSchema,
    handler: JobController.getJobDashboardDetails
  });

  fastify.get('/getJobsByLabor', {
    preHandler: [fastify.authenticateToken],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          laborId: {
            type: 'string',
            pattern: '^[0-9]+$',
            description: 'Labor ID to filter jobs'
          },
          page: {
            type: 'string',
            pattern: '^[0-9]+$',
            description: 'Page number for pagination'
          },
          limit: {
            type: 'string',
            pattern: '^[0-9]+$',
            description: 'Number of items per page'
          }
        },
        required: ['laborId'],
        additionalProperties: false
      }
    },
    handler: JobController.getJobsByLabor
  });

  fastify.get('/getJobsByLeadLabor', {
    preHandler: [fastify.authenticateToken],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          leadLaborId: {
            type: 'string',
            pattern: '^[0-9]+$',
            description: 'Lead Labor ID to filter jobs'
          },
          page: {
            type: 'string',
            pattern: '^[0-9]+$',
            description: 'Page number for pagination'
          },
          limit: {
            type: 'string',
            pattern: '^[0-9]+$',
            description: 'Number of items per page'
          }
        },
        required: ['leadLaborId'],
        additionalProperties: false
      }
    },
    handler: JobController.getJobsByLeadLabor
  });

  fastify.get('/getTodayJobsByLeadLabor', {
    preHandler: [fastify.authenticateToken],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          leadLaborId: {
            type: 'string',
            pattern: '^[0-9]+$',
            description: 'Lead Labor ID to filter today\'s jobs'
          },
          page: {
            type: 'string',
            pattern: '^[0-9]+$',
            description: 'Page number for pagination'
          },
          limit: {
            type: 'string',
            pattern: '^[0-9]+$',
            description: 'Number of items per page'
          }
        },
        required: ['leadLaborId'],
        additionalProperties: false
      }
    },
    handler: JobController.getTodayJobsByLeadLabor
  });

  fastify.post('/updateWorkData/:id', {
    schema: updateWorkDataSchema,
    handler: JobController.updateWorkData
  });

  fastify.get('/getWorkActivityHistory/:id', {
    handler: JobController.getWorkActivityHistory
  });

  fastify.get('/getProjectSummary/:id', {
    handler: JobController.getProjectSummary
  });

  fastify.get('/getJobDashboard/:id', {
    handler: JobController.getJobDashboard
  });

  fastify.get('/getTimesheetSummary/:id', {
    handler: JobController.getTimesheetSummary
  });

  fastify.get('/getWeeklyTimesheetSummary/:id', {
    handler: JobController.getWeeklyTimesheetSummary
  });

  fastify.get('/getAllJobsWeeklyTimesheetSummary', {
    handler: JobController.getAllJobsWeeklyTimesheetSummary
  });

  fastify.post('/approveTimesheet', {
    handler: JobController.approveTimesheet
  });

  fastify.post('/approveWeekTimesheet', {
    handler: JobController.approveWeekTimesheet
  });

  
  fastify.get('/getTimesheetDashboardStats', {
    preHandler: [authenticateToken],
    handler: JobController.getTimesheetDashboardStats
  });
}
