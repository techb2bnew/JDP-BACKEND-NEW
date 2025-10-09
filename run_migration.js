// Script to run the total_cost migration
import { supabase } from './src/config/database.js';

async function runMigration() {
  try {
    console.log('Starting migration: Add total_cost fields...');

    // Add total_cost field to labor table
    console.log('Adding total_cost field to labor table...');
    const { error: laborError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE labor ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2) DEFAULT 0;`
    });

    if (laborError) {
      console.error('Error adding total_cost to labor:', laborError);
    } else {
      console.log('✅ Added total_cost field to labor table');
    }

    // Add total_cost field to products table
    console.log('Adding total_cost field to products table...');
    const { error: productsError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2) DEFAULT 0;`
    });

    if (productsError) {
      console.error('Error adding total_cost to products:', productsError);
    } else {
      console.log('✅ Added total_cost field to products table');
    }

    // Update existing labor records with calculated total_cost
    console.log('Updating existing labor records...');
    const { error: updateLaborError } = await supabase.rpc('exec_sql', {
      sql: `UPDATE labor SET total_cost = COALESCE(hours_worked * hourly_rate, 0) WHERE total_cost = 0;`
    });

    if (updateLaborError) {
      console.error('Error updating labor total_cost:', updateLaborError);
    } else {
      console.log('✅ Updated existing labor records');
    }

    // Update existing products records with calculated total_cost
    console.log('Updating existing products records...');
    const { error: updateProductsError } = await supabase.rpc('exec_sql', {
      sql: `UPDATE products SET total_cost = COALESCE(jdp_price, supplier_cost_price, 0) WHERE total_cost = 0;`
    });

    if (updateProductsError) {
      console.error('Error updating products total_cost:', updateProductsError);
    } else {
      console.log('✅ Updated existing products records');
    }

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
