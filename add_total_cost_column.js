// Script to manually add total_cost column to labor and products tables
import { supabase } from './src/config/database.js';

async function addTotalCostColumn() {
  try {
    console.log('Adding total_cost column to labor table...');
    
    // Add total_cost column to labor table
    const { error: laborError } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE labor ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2) DEFAULT 0;'
    });

    if (laborError) {
      console.error('Error adding total_cost to labor:', laborError);
      // Try alternative approach
      console.log('Trying alternative approach...');
      const { error: altError } = await supabase
        .from('labor')
        .select('total_cost')
        .limit(1);
      
      if (altError && altError.message.includes('column "total_cost" does not exist')) {
        console.log('❌ total_cost column does not exist in labor table');
        console.log('Please run this SQL manually:');
        console.log('ALTER TABLE labor ADD COLUMN total_cost NUMERIC(10,2) DEFAULT 0;');
      }
    } else {
      console.log('✅ Added total_cost column to labor table');
    }

    console.log('Adding total_cost column to products table...');
    
    // Add total_cost column to products table
    const { error: productsError } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2) DEFAULT 0;'
    });

    if (productsError) {
      console.error('Error adding total_cost to products:', productsError);
      // Try alternative approach
      const { error: altError } = await supabase
        .from('products')
        .select('total_cost')
        .limit(1);
      
      if (altError && altError.message.includes('column "total_cost" does not exist')) {
        console.log('❌ total_cost column does not exist in products table');
        console.log('Please run this SQL manually:');
        console.log('ALTER TABLE products ADD COLUMN total_cost NUMERIC(10,2) DEFAULT 0;');
      }
    } else {
      console.log('✅ Added total_cost column to products table');
    }

  } catch (error) {
    console.error('Script failed:', error);
    console.log('\n📝 Manual SQL Commands to run:');
    console.log('ALTER TABLE labor ADD COLUMN total_cost NUMERIC(10,2) DEFAULT 0;');
    console.log('ALTER TABLE products ADD COLUMN total_cost NUMERIC(10,2) DEFAULT 0;');
  }
}

addTotalCostColumn();
