import { supabase } from "../config/database.js";

export class User {

  static async create(userData) {
    try {
      const { data, error } = await supabase
        .from("users")
        .insert([userData])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }


  static async findByEmail(email, includeRelated = true) {
    try {
      // First get user
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (userError && userError.code !== "PGRST116") {
        throw new Error(`Database error: ${userError.message}`);
      }

      if (!user) {
        return null; 
      }

    
      if (!includeRelated) {
        return user;
      }

   
      const [staffResult, laborResult, leadLaborResult] = await Promise.all([
        supabase
          .from("staff")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("labor")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("lead_labor")
          .select("*")
          .eq("user_id", user.id)
      ]);

      return {
        ...user,
        staff: staffResult.data || [],
        labor: laborResult.data || [],
        leadLabor: leadLaborResult.data || [],
      };
    } catch (error) {
      throw error;
    }
  }



  static async findById(userId) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {

        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async update(userId, updateData) {
    try {
      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}
