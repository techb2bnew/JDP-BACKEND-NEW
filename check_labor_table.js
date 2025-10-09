// Script to check labor table structure and add total_cost column
import { supabase } from './src/config/database.js';

async function checkLaborTable() {
  try {
    console.log('Checking labor table structure...');

    // First, try to select total_cost to see if column exists
    const { data, error } = await supabase
      .from('labor')
      .select('total_cost')
      .limit(1);

    if (error) {
      console.log('❌ total_cost column does not exist in labor table');
      console.log('Error:', error.message);
      
      console.log('\n📝 Please run this SQL command manually:');
      console.log('ALTER TABLE labor ADD COLUMN total_cost NUMERIC(10,2) DEFAULT 0;');
      
      // Try to get table structure
      const { data: columns, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'labor')
        .order('ordinal_position');

      if (!columnError && columns) {
        console.log('\n📋 Current labor table columns:');
        columns.forEach(col => {
          console.log(`- ${col.column_name}: ${col.data_type}`);
        });
      }
    } else {
      console.log('✅ total_cost column exists in labor table');
      console.log('Sample data:', data);
    }

    // Test inserting with total_cost
    console.log('\n🧪 Testing labor creation...');
    const testData = {
      user_id: 1,
      labor_code: 'TEST-' + Date.now(),
      dob: '1990-01-01',
      address: 'Test Address',
      date_of_joining: '2024-01-01',
      hourly_rate: 29.00,
      hours_worked: 145,
      total_cost: 4205.00, // 145 * 29
      is_custom: true
    };

    console.log('Test data:', testData);

  } catch (error) {
    console.error('Script failed:', error);
  }
}

checkLaborTable();
