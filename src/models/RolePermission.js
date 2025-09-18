import { supabase } from '../config/database.js';

const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; 

export class RolePermission {
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

      if (roleName) {
        const { error: roleUpdateError } = await supabase
          .from('roles')
          .update({ role_name: roleName })
          .eq('id', roleId);

        if (roleUpdateError) {
          throw new Error(`Database error: ${roleUpdateError.message}`);
        }

      }


      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      if (deleteError) {
        throw new Error(`Database error: ${deleteError.message}`);
      }


      if (permissions.length > 0) {
        const permissionsToInsert = [];

        for (const perm of permissions) {

          const permissionId = perm.permission_id || perm.id;

          if (permissionId) {
            permissionsToInsert.push({
              role_id: roleId,
              permission_id: permissionId,
              allowed: perm.allowed
            });
          }
        }


        if (permissionsToInsert.length > 0) {
          const { data, error: insertError } = await supabase
            .from('role_permissions')
            .insert(permissionsToInsert)
            .select();

          if (insertError) {
            throw new Error(`Database error: ${insertError.message}`);
          }


          const permissionIds = data.map(rp => rp.permission_id);
          const { data: allPermissions, error: allPermError } = await supabase
            .from('permissions')
            .select('id, module, action, display_name, description')
            .in('id', permissionIds);

          const permissionsWithDetails = data.map(rp => {
            const permData = allPermissions?.find(p => p.id === rp.permission_id);
            if (permData) {
              return {
                ...rp,
                module: permData.module,
                action: permData.action,
                display_name: permData.display_name,
                description: permData.description
              };
            }
            return rp;
          });

          this.clearRolePermissionCache(roleId);
          
          return permissionsWithDetails;
        }
      }

      return [];
    } catch (error) {
      throw error;
    }
  }

  static clearRolePermissionCache(roleId) {
    permissionCache.clear();
  }

  static async getAllRolesWithAllPermissions() {
    try {
     
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('id', { ascending: false });

      if (rolesError) {
        throw new Error(`Database error: ${rolesError.message}`);
      }

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
        `);

      if (allRpError) {
        throw new Error(`Database error: ${allRpError.message}`);
      }

      const permissionsByRole = {};
      allRolePermissions?.forEach(rp => {
        if (!permissionsByRole[rp.role_id]) {
          permissionsByRole[rp.role_id] = [];
        }
        if (rp.permissions) {
          permissionsByRole[rp.role_id].push({
            ...rp.permissions,
            allowed: rp.allowed
          });
        }
      });

      const rolesWithPermissions = roles.map(role => {
        const permissions = permissionsByRole[role.id] || [];
        return {
          ...role,
          permissions: permissions,
          totalPermissions: permissions.length,
          allowedPermissions: permissions.filter(p => p.allowed).length,
          deniedPermissions: permissions.filter(p => !p.allowed).length
        };
      });

      return rolesWithPermissions;
    } catch (error) {
      throw error;
    }
  }
}
