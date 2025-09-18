import { JobTimeLogController } from '../controllers/jobTimeLogController.js';
import {
  createJobTimeLogSchema,
  updateJobTimeLogSchema,
  jobTimeLogQuerySchema
} from '../validations/jobTimeLogValidation.js';

export default async function jobTimeLogRoutes(fastify, options) {
  fastify.post('/createTimeLog', {
    preHandler: [fastify.authenticateToken],
    schema: {
      body: createJobTimeLogSchema
    }
  }, JobTimeLogController.createTimeLog);

  fastify.get('/getTimeLogs', {
    preHandler: [fastify.authenticateToken],
    schema: {
      querystring: jobTimeLogQuerySchema
    }
  }, JobTimeLogController.getTimeLogs);

  fastify.get('/getTimeLogById/:id', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['id']
      }
    }
  }, JobTimeLogController.getTimeLogById);

  fastify.post('/updateTimeLog/:id', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['id']
      },
      body: updateJobTimeLogSchema
    }
  }, JobTimeLogController.updateTimeLog);

  fastify.delete('/deleteTimeLog/:id', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['id']
      }
    }
  }, JobTimeLogController.deleteTimeLog);

  fastify.get('/getTimeLogsByJob/:jobId', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['jobId']
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', pattern: '^[0-9]+$' },
          limit: { type: 'string', pattern: '^[0-9]+$' }
        },
        additionalProperties: false
      }
    }
  }, JobTimeLogController.getTimeLogsByJob);

  fastify.get('/getTimeLogsByLabor/:laborId', {
    preHandler: [fastify.authenticateToken],
    schema: {
      params: {
        type: 'object',
        properties: {
          laborId: { type: 'string', pattern: '^[0-9]+$' }
        },
        required: ['laborId']
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', pattern: '^[0-9]+$' },
          limit: { type: 'string', pattern: '^[0-9]+$' }
        },
        additionalProperties: false
      }
    }
  }, JobTimeLogController.getTimeLogsByLabor);

  fastify.get('/getTimeLogStats', {
    preHandler: [fastify.authenticateToken]
  }, JobTimeLogController.getTimeLogStats);
}
