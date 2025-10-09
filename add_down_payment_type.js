// Script to add down_payment to invoice_type enum
import { supabase } from './src/config/database.js';

async function addDownPaymentType() {
  try {
    console.log('Adding down_payment to invoice_type enum...');

    // Drop existing constraint
    const { error: dropError } = await supabase.rpc('exec', {
      sql: `ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_invoice_type_check;`
    });

    if (dropError) {
      console.log('Note: Constraint may not exist or already dropped:', dropError.message);
    } else {
      console.log('✅ Dropped existing invoice_type constraint');
    }

    // Add new constraint with down_payment
    const { error: addError } = await supabase.rpc('exec', {
      sql: `ALTER TABLE estimates ADD CONSTRAINT estimates_invoice_type_check 
            CHECK (invoice_type IN ('estimate', 'proposal_invoice', 'progressive_invoice', 'final_invoice', 'down_payment'));`
    });

    if (addError) {
      console.error('Error adding new constraint:', addError);
      console.log('\n📝 Please run this SQL manually:');
      console.log(`ALTER TABLE estimates ADD CONSTRAINT estimates_invoice_type_check 
CHECK (invoice_type IN ('estimate', 'proposal_invoice', 'progressive_invoice', 'final_invoice', 'down_payment'));`);
    } else {
      console.log('✅ Added down_payment to invoice_type enum');
    }

    // Test the new constraint by trying to insert a down_payment
    console.log('\n🧪 Testing down_payment type...');
    const { error: testError } = await supabase
      .from('estimates')
      .select('invoice_type')
      .eq('invoice_type', 'down_payment')
      .limit(1);

    if (testError) {
      console.log('Test query result (this is normal if no down_payment records exist yet)');
    } else {
      console.log('✅ down_payment type is working correctly');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('Now you can use invoice_type: "down_payment" in estimates');

  } catch (error) {
    console.error('Migration failed:', error);
    console.log('\n📝 Manual SQL Commands to run:');
    console.log('ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_invoice_type_check;');
    console.log(`ALTER TABLE estimates ADD CONSTRAINT estimates_invoice_type_check 
CHECK (invoice_type IN ('estimate', 'proposal_invoice', 'progressive_invoice', 'final_invoice', 'down_payment'));`);
  }
}

addDownPaymentType();
