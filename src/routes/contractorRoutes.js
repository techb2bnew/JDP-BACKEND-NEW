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
  // Apply authentication middleware to all contractor routes
  fastify.addHook('preHandler', authenticateToken);

  // Create a new contractor
  fastify.post('/createContractor', {
    schema: createContractorSchema,
    handler: ContractorController.createContractor
  });

  // Get all contractors with pagination and filters
  fastify.get('/getContractors', {
    schema: getContractorsSchema,
    handler: ContractorController.getContractors
  });

  // Get contractor statistics
  fastify.get('/contractors/stats', {
    handler: ContractorController.getContractorStats
  });

  // Get contractors by job ID
  fastify.get('/contractors/job/:jobId', {
    schema: getContractorsByJobIdSchema,
    handler: ContractorController.getContractorsByJobId
  });

  // Get a specific contractor by ID
  fastify.get('/getContractorById/:id', {
    schema: getContractorByIdSchema,
    handler: ContractorController.getContractorById
  });

  // Update a contractor
  fastify.post('/updateContractor/:id', {
    schema: updateContractorSchema,
    handler: ContractorController.updateContractor
  });

  // Delete a contractor
  fastify.delete('/deleteContractor/:id', {
    schema: deleteContractorSchema,
    handler: ContractorController.deleteContractor
  });
}
