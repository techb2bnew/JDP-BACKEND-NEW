// Test script to check total_cost field in database
import { supabase } from './src/config/database.js';

async function testTotalCost() {
  try {
    console.log('Testing total_cost field...');

    // Check if total_cost column exists in labor table
    const { data: laborColumns, error: laborError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'labor')
      .eq('column_name', 'total_cost');

    if (laborError) {
      console.error('Error checking labor columns:', laborError);
    } else {
      console.log('Labor total_cost column exists:', laborColumns.length > 0);
    }

    // Check if total_cost column exists in products table
    const { data: productColumns, error: productError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'products')
      .eq('column_name', 'total_cost');

    if (productError) {
      console.error('Error checking products columns:', productError);
    } else {
      console.log('Products total_cost column exists:', productColumns.length > 0);
    }

    // Test creating a labor with total_cost
    const testLaborData = {
      user_id: 1, // Replace with valid user_id
      labor_code: 'TEST-001',
      dob: '1990-01-01',
      address: 'Test Address',
      date_of_joining: '2024-01-01',
      hourly_rate: 25.00,
      hours_worked: 8.00,
      total_cost: 200.00, // Explicit total_cost
      is_custom: true
    };

    console.log('Test labor data:', testLaborData);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTotalCost();
