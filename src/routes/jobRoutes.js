import { JobController } from '../controllers/jobController.js';
import { 
  createJobSchema, 
  updateJobSchema, 
  getJobsSchema, 
  getJobByIdSchema, 
  deleteJobSchema 
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

  // Mobile App Work Data Routes
  fastify.post('/updateWorkData/:id', {
    handler: JobController.updateWorkData
  });

  fastify.get('/getWorkActivityHistory/:id', {
    handler: JobController.getWorkActivityHistory
  });
}
