import { supabase } from '../config/database.js';

const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; 


const rolesWithPermissionsCache = new Map();
const ROLES_CACHE_TTL = 2 * 60 * 1000; 

export class RolePermission {
  
  static get permissionCache() {
    return permissionCache;
  }
  
  static get CACHE_TTL() {
    return CACHE_TTL;
  }
  static async getPermissionsByRoleName(roleName) {
    try {
      const cacheKey = `permissions_${roleName}`;
      const cached = permissionCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
      }

      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', roleName)
        .single();

      if (roleError || !role) {
        throw new Error(`Role "${roleName}" not found`);
      }

      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          id,
          allowed,
          permissions (
            id,
            module,
            action,
            display_name,
            description
          )
        `)
        .eq('role_id', role.id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const permissions = data
        .filter(rp => rp.allowed === true && rp.permissions)
        .map(rp => ({
          ...rp.permissions,
          allowed: rp.allowed
        }));

      permissionCache.set(cacheKey, {
        data: permissions,
        timestamp: Date.now()
      });

      return permissions;
    } catch (error) {
      throw error;
    }
  }

  static async bulkUpdateRolePermissions(roleId, permissions, roleName) {
    try {
    
      const permissionsToInsert = [];
      const permissionIdsSet = new Set();

      for (const perm of permissions) {
        const permissionId = perm.permission_id || perm.id;
        if (permissionId) {
          permissionsToInsert.push({
            role_id: roleId,
            permission_id: permissionId,
            allowed: perm.allowed
          });
          permissionIdsSet.add(permissionId);
        }
      }

     
      const operations = [];
      
      if (roleName) {
        operations.push(
          supabase
            .from('roles')
            .update({ role_name: roleName })
            .eq('id', roleId)
        );
      }

      operations.push(
        supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId)
      );

    
      const results = await Promise.all(operations);
      
   
      for (const result of results) {
        if (result.error) {
          throw new Error(`Database error: ${result.error.message}`);
        }
      }

      
      if (permissionsToInsert.length === 0) {
        this.clearRolePermissionCache(roleId);
        return [];
      }

    
      const { data: insertedData, error: insertError } = await supabase
        .from('role_permissions')
        .insert(permissionsToInsert)
        .select();

      if (insertError) {
        throw new Error(`Database error: ${insertError.message}`);
      }

      
      const permissionIds = Array.from(permissionIdsSet);
      const [permissionsResult] = await Promise.all([
        supabase
          .from('permissions')
          .select('id, module, action, display_name, description')
          .in('id', permissionIds),
       
        Promise.resolve().then(() => this.clearRolePermissionCache(roleId))
      ]);

      if (permissionsResult.error) {
        throw new Error(`Database error: ${permissionsResult.error.message}`);
      }

      const allPermissions = permissionsResult.data || [];

      
      const permissionMap = new Map();
      allPermissions.forEach(perm => {
        permissionMap.set(perm.id, perm);
      });

   
      const permissionsWithDetails = new Array(insertedData.length);
      for (let i = 0; i < insertedData.length; i++) {
        const rp = insertedData[i];
        const permData = permissionMap.get(rp.permission_id);
        
        if (permData) {
          permissionsWithDetails[i] = {
            ...rp,
            module: permData.module,
            action: permData.action,
            display_name: permData.display_name,
            description: permData.description
          };
        } else {
          permissionsWithDetails[i] = rp;
        }
      }

      return permissionsWithDetails;
    } catch (error) {
      throw error;
    }
  }

  static clearRolePermissionCache(roleId) {

    permissionCache.clear();
    rolesWithPermissionsCache.clear(); 
    
    if (roleId) {
      const roleCacheKey = `role_permissions_${roleId}`;
      permissionCache.delete(roleCacheKey);
    }
  }

  static async getAllRolesWithAllPermissions(page = 1, limit = 50) {
    try {

      const cacheKey = `roles_permissions_${page}_${limit}`;
      const cached = rolesWithPermissionsCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < ROLES_CACHE_TTL) {
        return cached.data;
      }

      const offset = (page - 1) * limit;


      const { data: roles, error: rolesError, count } = await supabase
        .from('roles')
        .select('*', { count: 'exact' })
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1);

      if (rolesError) {
        throw new Error(`Database error: ${rolesError.message}`);
      }

      if (!roles || roles.length === 0) {
        return [];
      }

  
      const roleIds = roles.map(r => r.id);

  
      const { data: allRolePermissions, error: allRpError } = await supabase
        .from('role_permissions')
        .select(`
          id,
          role_id,
          allowed,
          permissions (
            id,
            module,
            action,
            display_name,
            description
          )
        `)
        .in('role_id', roleIds);

      if (allRpError) {
        throw new Error(`Database error: ${allRpError.message}`);
      }

      
      const permissionsByRole = new Map();
      roles.forEach(role => {
        permissionsByRole.set(role.id, []);
      });

      
      if (allRolePermissions && allRolePermissions.length > 0) {
        for (const rp of allRolePermissions) {
          if (rp.permissions && rp.role_id) {
            const rolePermissions = permissionsByRole.get(rp.role_id);
            if (rolePermissions) {
              rolePermissions.push({
                ...rp.permissions,
                allowed: rp.allowed
              });
            }
          }
        }
      }

      
      const rolesWithPermissions = new Array(roles.length);
      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const permissions = permissionsByRole.get(role.id) || [];
        
        
        let allowedCount = 0;
        let deniedCount = 0;
        for (let j = 0; j < permissions.length; j++) {
          if (permissions[j].allowed) {
            allowedCount++;
          } else {
            deniedCount++;
          }
        }
        
        rolesWithPermissions[i] = {
          ...role,
          permissions: permissions,
          totalPermissions: permissions.length,
          allowedPermissions: allowedCount,
          deniedPermissions: deniedCount
        };
      }

      rolesWithPermissionsCache.set(cacheKey, {
        data: rolesWithPermissions,
        timestamp: Date.now()
      });

      return rolesWithPermissions;
    } catch (error) {
      throw error;
    }
  }

  static clearRolesWithPermissionsCache() {
    rolesWithPermissionsCache.clear();
  }
}
