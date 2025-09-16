import { supabase } from '../config/database.js';

export class Permission {
  static async findByModuleAndAction(module, action) {
    try {
      
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('module', module)
        .eq('action', action)
        .single();


      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async createIfNotExists(module, action) {
    try {
      
      let { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('*')
        .eq('module_name', module)
        .single();

      if (moduleError || !moduleData) {
        const { data: newModule, error: createModuleError } = await supabase
          .from('modules')
          .insert({
            module_name: module,
            display_name: module.charAt(0).toUpperCase() + module.slice(1),
            description: `${module} module`
          })
          .select()
          .single();

        if (createModuleError) {
          throw new Error(`Failed to create module: ${module}`);
        }
        moduleData = newModule;
      }

      const { data: permission, error: permError } = await supabase
        .from('permissions')
        .insert({
          module: module,
          action: action,
          display_name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.charAt(0).toUpperCase() + module.slice(1)}`,
          description: `Can ${action} ${module}`
        })
        .select()
        .single();

      if (permError) {
        throw new Error(`Failed to create permission: ${module}:${action}`);
      }

      return permission;
    } catch (error) {
      throw error;
    }
  }

  static async listAllPermissions() {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module', { ascending: true })
        .order('action', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }


      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByModuleActionPairs(pairs) {
    try {
      if (pairs.length === 0) return [];
      
      const uniquePairs = [];
      const seenPairs = new Set();
      
      for (const pair of pairs) {
        const pairKey = `${pair.module}:${pair.action}`;
        if (!seenPairs.has(pairKey)) {
          uniquePairs.push(pair);
          seenPairs.add(pairKey);
        }
      }
      
      const queryPromises = uniquePairs.map(async (pair) => {
        try {
          const { data, error } = await supabase
            .from('permissions')
            .select('*')
            .eq('module', pair.module)
            .eq('action', pair.action);

          if (error) {
            return null;
          }

          return data || [];
        } catch (err) {
          return null;
        }
      });
      
      const allResults = await Promise.all(queryPromises);
      
      const results = allResults
        .filter(result => result !== null)
        .flat();

      return results;
    } catch (error) {
      throw error;
    }
  }

  static async batchCreate(permissions) {
    try {
      if (permissions.length === 0) return [];
      
      const modules = [...new Set(permissions.map(p => p.module))];
      const existingModules = await this.getExistingModules(modules);
      const missingModules = modules.filter(m => !existingModules.includes(m));
      
      if (missingModules.length > 0) {
        await this.batchCreateModules(missingModules);
      }
      
      const { data, error } = await supabase
        .from('permissions')
        .insert(permissions)
        .select('*');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async getExistingModules(modules) {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('module_name')
        .in('module_name', modules);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data.map(m => m.module_name);
    } catch (error) {
      throw error;
    }
  }

  static async batchCreateModules(modules) {
    try {
      const moduleData = modules.map(module => ({
        module_name: module,
        description: `${module} module`,
        is_active: true
      }));

      const { data, error } = await supabase
        .from('modules')
        .insert(moduleData)
        .select('*');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }
}
