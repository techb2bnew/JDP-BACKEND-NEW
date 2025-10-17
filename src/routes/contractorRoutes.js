import { ContractorController } from '../controllers/contractorController.js';
import { 
  createContractorSchema, 
  updateContractorSchema, 
  getContractorsSchema, 
  getContractorByIdSchema, 
  getContractorsByJobIdSchema,
  deleteContractorSchema 
} from '../validations/contractorValidation.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export async function contractorRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateToken);

  fastify.post('/createContractor', {
    schema: createContractorSchema,
    handler: ContractorController.createContractor
  });

  fastify.get('/getContractors', {
    schema: getContractorsSchema,
    handler: ContractorController.getContractors
  });

  fastify.get('/contractors/stats', {
    handler: ContractorController.getContractorStats
  });

  fastify.get('/contractors/job/:jobId', {
    schema: getContractorsByJobIdSchema,
    handler: ContractorController.getContractorsByJobId
  });

  fastify.get('/getContractorById/:id', {
    schema: getContractorByIdSchema,
    handler: ContractorController.getContractorById
  });

  fastify.post('/updateContractor/:id', {
    schema: updateContractorSchema,
    handler: ContractorController.updateContractor
  });

  fastify.delete('/deleteContractor/:id', {
    schema: deleteContractorSchema,
    handler: ContractorController.deleteContractor
  });


  fastify.get('/jobs/:jobId/details', {
    handler: ContractorController.getJobDetails
  });

}
