import { RolePermissionService } from '../services/rolePermissionService.js';
import { RolePermission } from '../models/RolePermission.js';
import { successResponse, errorResponse, validationErrorResponse } from '../helpers/responseHelper.js';

export class RolePermissionController {
  
  static async createRoleWithPermissions(req, reply) {
    try {
      const { roleName, roleType, description, permissions } = req.body;

      if (!roleName || !roleType) {
        return reply.status(400).send(validationErrorResponse(['Role name and role type are required']));
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
        role_type: roleType,
        description: description || null
      };

      const result = await RolePermissionService.createRoleWithPermissionsAndProducts(roleData, permissions);
      
      return reply.status(201).send(successResponse(result, 'Role created successfully with permissions', 201));
    } catch (error) {
      return reply.status(500).send(errorResponse('Failed to create role with permissions and products', 500));
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
      return reply.status(500).send(errorResponse('Failed to update role permissions', 500));
    }
  }

  static async getAllRolesWithAllPermissions(req, reply) {
    try {
      const roles = await RolePermission.getAllRolesWithAllPermissions();
      
      return reply.status(200).send(successResponse(roles, 'All roles with permissions retrieved successfully'));
    } catch (error) {
      return reply.status(500).send(errorResponse('Failed to retrieve roles with permissions', 500));
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
      return reply.status(500).send(errorResponse('Failed to retrieve role permissions', 500));
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
      return reply.status(500).send(errorResponse('Failed to delete role', 500));
    }
  }
}
