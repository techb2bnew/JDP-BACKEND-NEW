import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { RolePermission } from '../models/RolePermission.js';

export class RolePermissionService {
  static async createRoleWithPermissionsAndProducts(roleData, permissions, products) {
    try {
      const role = await Role.create(roleData);
      
      let createdPermissions = [];
      if (permissions && permissions.length > 0) {
        createdPermissions = await this.setRolePermissions(role.id, permissions);
      }
      
      const result = {
        role: {
          ...role,
          role_permissions: createdPermissions && createdPermissions.length > 0 
            ? createdPermissions.map(cp => ({
                id: cp.id,
                allowed: cp.allowed,
                permissions: {
                  id: cp.permission_id,
                  module: cp.module,
                  action: cp.action
                }
              }))
            : []
        },
        message: `Role created successfully with ${createdPermissions ? createdPermissions.length : 0} permissions`
      };
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getRoleWithPermissions(roleId) {
    try {
      const role = await Role.getRoleWithPermissions(roleId);
      return role;
    } catch (error) {
      throw error;
    }
  }

  static async updateRolePermissionsById(roleId, permissions ,roleName) {
    try {
      // Filter and prepare module-action pairs efficiently
      const moduleActionPairs = [];
      const seenPairs = new Set();
      
      for (const perm of permissions) {
        if (perm.module && perm.action) {
          const pairKey = `${perm.module}:${perm.action}`;
          if (!seenPairs.has(pairKey)) {
            moduleActionPairs.push({ module: perm.module, action: perm.action });
            seenPairs.add(pairKey);
          }
        }
      }
      
      // Optimize: Single query to get existing permissions
      const existingPermissions = await Permission.findByModuleActionPairs(moduleActionPairs);
      
      // Use Map for O(1) lookups instead of find()
      const existingPermissionsMap = new Map();
      existingPermissions.forEach(perm => {
        existingPermissionsMap.set(`${perm.module}:${perm.action}`, perm);
      });
      
      // Find missing permissions efficiently
      const missingPermissions = [];
      for (const pair of moduleActionPairs) {
        const pairKey = `${pair.module}:${pair.action}`;
        if (!existingPermissionsMap.has(pairKey)) {
          missingPermissions.push(pair);
        }
      }
      
      let allPermissions = existingPermissions;
      
      // Only create missing permissions if needed
      if (missingPermissions.length > 0) {
        await Permission.batchCreate(missingPermissions);
        // Get all permissions in one query after creation
        allPermissions = await Permission.findByModuleActionPairs(moduleActionPairs);
      }
      
      // Create permission mapping for faster lookup (rebuild map with all permissions)
      const permissionMap = new Map();
      allPermissions.forEach(perm => {
        permissionMap.set(`${perm.module}:${perm.action}`, perm);
      });
      
      // Build permissions with IDs efficiently
      const permissionsWithIds = [];
      for (const perm of permissions) {
        if (perm.module && perm.action) {
          const permissionData = permissionMap.get(`${perm.module}:${perm.action}`);
          
          if (!permissionData) {
            throw new Error(`Failed to find/create permission: ${perm.module}:${perm.action}`);
          }
          
          permissionsWithIds.push({
            permission_id: permissionData.id,
            allowed: perm.allowed,
            module: perm.module,
            action: perm.action
          });
        }
      }
      
      const result = await RolePermission.bulkUpdateRolePermissions(roleId, permissionsWithIds, roleName);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async setRolePermissions(roleId, permissions) {
    try {
      const moduleActionPairs = permissions
        .filter(perm => perm.module && perm.action)
        .map(perm => ({ module: perm.module, action: perm.action }));
      
      const existingPermissions = await Permission.findByModuleActionPairs(moduleActionPairs);
      
      const missingPermissions = moduleActionPairs.filter(pair => 
        !existingPermissions.find(ep => ep.module === pair.module && ep.action === pair.action)
      );
      
      if (missingPermissions.length > 0) {
        await Permission.batchCreate(missingPermissions);
        
        const allPermissions = await Permission.findByModuleActionPairs(moduleActionPairs);
        
        const permissionsToInsert = permissions
          .filter(perm => perm.module && perm.action)
          .map(perm => {
            const permissionData = allPermissions.find(ep => 
              ep.module === perm.module && ep.action === perm.action
            );
            
            if (!permissionData) {
              throw new Error(`Failed to find/create permission: ${perm.module}:${perm.action}`);
            }
            
            return {
              role_id: roleId,
              permission_id: permissionData.id,
              allowed: perm.allowed,
              module: perm.module,
              action: perm.action
            };
          });
        
        
        if (permissionsToInsert.length > 0) {
          const result = await RolePermission.bulkUpdateRolePermissions(roleId, permissionsToInsert);
          return result;
        } else {
          return [];
        }
      } else {
        const permissionsToInsert = permissions
          .filter(perm => perm.module && perm.action)
          .map(perm => {
            const permissionData = existingPermissions.find(ep => 
              ep.module === perm.module && ep.action === perm.action
            );
            
            return {
              role_id: roleId,
              permission_id: permissionData.id,
              allowed: perm.allowed,
              module: perm.module,
              action: perm.action
            };
          });
        
        
        if (permissionsToInsert.length > 0) {
          const result = await RolePermission.bulkUpdateRolePermissions(roleId, permissionsToInsert);
          return result;
        } else {
          return [];
        }
      }
    } catch (error) {
      throw error;
    }
  }

  static validatePermissionData(permissions) {
    if (!Array.isArray(permissions)) {
      throw new Error('Permissions must be an array');
    }

    for (const perm of permissions) {
      if (!perm.module || !perm.action) {
        throw new Error('Each permission must have module and action');
      }
      if (typeof perm.allowed !== 'boolean') {
        throw new Error('Each permission must have allowed as boolean');
      }
    }
  }

  static async getRolePermissionsById(roleId) {
    try {
      const result = await Role.getRolePermissionsById(roleId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async deleteRole(roleId) {
    try {
      // Check if role has relationships with other tables
      const relationshipCheck = await Role.checkRoleRelationships(roleId);

      if (!relationshipCheck.canDelete) {
        const relationshipMessages = relationshipCheck.relationships.map(rel => rel.message).join(', ');
        throw new Error(`Cannot delete this role because it has related data: ${relationshipMessages}. Please remove all related data first.`);
      }

      const result = await Role.deleteRole(roleId);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
