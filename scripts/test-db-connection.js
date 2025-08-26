// scripts/test-db-connection.js
// Simple test to verify database connection and table structure

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    // Test basic connection
    console.log('📡 Testing basic connection...');
    const { data: testData, error: testError } = await supabase
      .from('podcast_sessions')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection failed:', testError);
      return;
    }
    
    console.log('✅ Database connection successful!\n');
    
    // Check if table exists and get its structure
    console.log('📋 Checking podcast_sessions table structure...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'podcast_sessions' });
    
    if (columnsError) {
      // Fallback: try direct query
      console.log('⚠️  RPC failed, trying direct query...');
      const { data: directColumns, error: directError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'podcast_sessions')
        .order('ordinal_position');
      
      if (directError) {
        console.error('❌ Failed to get table structure:', directError);
        return;
      }
      
      console.log('📊 Table columns:');
      directColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
      // Check for missing required columns
      const requiredColumns = ['description', 'youtube_broadcast_id', 'youtube_stream_id', 'rtmp_url', 'stream_key', 'youtube_watch_url'];
      const existingColumns = directColumns.map(col => col.column_name);
      
      console.log('\n🔍 Missing columns:');
      requiredColumns.forEach(col => {
        if (!existingColumns.includes(col)) {
          console.log(`  ❌ ${col} - MISSING`);
        } else {
          console.log(`  ✅ ${col}`);
        }
      });
      
    } else {
      console.log('📊 Table columns:', columns);
    }
    
    // Try to insert a test record
    console.log('\n🧪 Testing insert operation...');
    const testRecord = {
      title: 'Test Session',
      description: 'Test description',
      user_id: 'test_user_123',
      username: 'testuser',
      is_live: false,
      status: 'draft'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('podcast_sessions')
      .insert([testRecord])
      .select();
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
      
      // Check if it's a column issue
      if (insertError.code === 'PGRST204') {
        console.log('\n💡 This looks like a missing column issue.');
        console.log('🔧 Run the migration script in your Supabase SQL editor.');
      }
    } else {
      console.log('✅ Insert test successful!');
      console.log('📝 Test record created:', insertData[0]);
      
      // Clean up test record
      const { error: deleteError } = await supabase
        .from('podcast_sessions')
        .delete()
        .eq('id', insertData[0].id);
      
      if (deleteError) {
        console.log('⚠️  Could not clean up test record:', deleteError);
      } else {
        console.log('🧹 Test record cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConnection();
