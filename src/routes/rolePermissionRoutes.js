import { RolePermissionController } from '../controllers/rolePermissionController.js';
import { authenticateToken, requireSuperAdmin, requireAdminOrSuperAdmin } from '../middleware/authMiddleware.js';

export default async function rolePermissionRoutes(fastify, options) {
  fastify.addHook('preHandler', authenticateToken);

  fastify.post('/roles', {
    preHandler: authenticateToken
  }, RolePermissionController.createRoleWithPermissions);

  fastify.post('/roles/update-permissions', {
    preHandler: authenticateToken,
  }, RolePermissionController.updateRolePermissionsById);

  fastify.get('/roles-with-permissions', {
    preHandler: authenticateToken
  }, RolePermissionController.getAllRolesWithAllPermissions);

  fastify.get('/roles/:roleId', {
    preHandler: authenticateToken,
    schema: {
      params: {
        type: 'object',
        required: ['roleId'],
        properties: {
          roleId: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, RolePermissionController.getRolePermissionsById);

  fastify.delete('/roles/:roleId', {
    preHandler: authenticateToken,
    schema: {
      params: {
        type: 'object',
        required: ['roleId'],
        properties: {
          roleId: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, RolePermissionController.deleteRole);
  
}
