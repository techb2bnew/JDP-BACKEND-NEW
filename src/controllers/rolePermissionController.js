import { RolePermissionService } from '../services/rolePermissionService.js';
import { RolePermission } from '../models/RolePermission.js';
import { successResponse, errorResponse, validationErrorResponse } from '../helpers/responseHelper.js';

export class RolePermissionController {
  
    static async createRoleWithPermissions(req, reply) {
    try {
      const { roleName, roleType, description, permissions } = req.body;        

      if (!roleName) {
        return reply.status(400).send(validationErrorResponse(['Role name is required']));                                                       
      }

      if (permissions) {
        try {
          RolePermissionService.validatePermissionData(permissions);
        } catch (validationError) {
          return reply.status(400).send(validationErrorResponse([validationError.message]));                                                                    
        }
      }

      const roleData = {
        role_name: roleName,
        role_type: roleType || '',
        description: description || null
      };

      const result = await RolePermissionService.createRoleWithPermissionsAndProducts(roleData, permissions);
      
      return reply.status(201).send(successResponse(result, 'Role created successfully with permissions', 201));
    } catch (error) {

      return reply.status(500).send(errorResponse(`Failed to create role with permissions and products: ${error.message}`, 500));
    }
  }

  static async updateRolePermissionsById(req, reply) {
    try {
      const { roleId, permissions ,roleName } = req.body;

      if (!roleId) {
        return reply.status(400).send(validationErrorResponse(['Role ID is required']));
      }

      if (!permissions) {
        return reply.status(400).send(validationErrorResponse(['Permissions are required']));
      }

      const roleIdNum = parseInt(roleId);
      if (isNaN(roleIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Role ID must be a valid number']));
      }

      try {
        RolePermissionService.validatePermissionData(permissions);
      } catch (validationError) {
        return reply.status(400).send(validationErrorResponse([validationError.message]));
      }

      const result = await RolePermissionService.updateRolePermissionsById(roleIdNum, permissions ,roleName);
      
      return reply.status(200).send(successResponse(result, 'Role permissions updated successfully'));
    } catch (error) {

      return reply.status(500).send(errorResponse(`Failed to update role permissions: ${error.message}`, 500));
    }
  }

  static async getAllRolesWithAllPermissions(req, reply) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;

      if (page < 1) {
        return reply.status(400).send(errorResponse('Page must be greater than 0', 400));
      }
      if (limit < 1 || limit > 100) {
        return reply.status(400).send(errorResponse('Limit must be between 1 and 100', 400));
      }

      const result = await RolePermission.getAllRolesWithAllPermissions(page, limit);
      
      return reply.status(200).send(successResponse(result, 'All roles with permissions retrieved successfully'));
    } catch (error) {
      return reply.status(500).send(errorResponse(`Failed to retrieve roles with permissions: ${error.message}`, 500));
    }
  }

  static async getRolePermissionsById(req, reply) {
    try {
      const { roleId } = req.params;

      if (!roleId) {
        return reply.status(400).send(validationErrorResponse(['Role ID is required']));
      }

      const roleIdNum = parseInt(roleId);
      if (isNaN(roleIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Role ID must be a valid number']));
      }

      const result = await RolePermissionService.getRolePermissionsById(roleIdNum);
      
      return reply.status(200).send(successResponse(result, 'Role permissions retrieved successfully'));
    } catch (error) {
      
      
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Role not found', 404));
      }
      return reply.status(500).send(errorResponse(`Failed to retrieve role permissions: ${error.message}`, 500));
    }
  }

  static async deleteRole(req, reply) {
    try {
  
      
      const { roleId } = req.params;

      if (!roleId) {
        return reply.status(400).send(validationErrorResponse(['Role ID is required']));
      }

      const roleIdNum = parseInt(roleId);
      if (isNaN(roleIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Role ID must be a valid number']));
      }

      const result = await RolePermissionService.deleteRole(roleIdNum);
      
      return reply.status(200).send(successResponse(result, 'Role deleted successfully'));
    } catch (error) {
      
      
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Role not found', 404));
      }
      return reply.status(500).send(errorResponse(`${error.message}`, 500));
    }
  }
}
