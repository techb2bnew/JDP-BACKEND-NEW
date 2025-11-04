import { ConfigurationController } from '../controllers/configurationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export async function configurationRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateToken);


  fastify.get('/getFullConfiguration', {
    handler: ConfigurationController.getFullConfiguration
  });

  fastify.post('/createOrUpdateConfiguration', {
    handler: ConfigurationController.createOrUpdateConfiguration
  });

  fastify.put('/createOrUpdateConfiguration', {
    handler: ConfigurationController.createOrUpdateConfiguration
  });

  fastify.delete('/removeHourlyRates', {
    handler: ConfigurationController.removeHourlyRates
  });
}
