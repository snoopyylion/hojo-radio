// scripts/check-db-schema.js
// Run this to check your current database schema

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...\n');
    
    // Check podcast_sessions table structure
    console.log('📋 podcast_sessions table:');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'podcast_sessions')
      .order('ordinal_position');
    
    if (columnsError) {
      console.error('❌ Error fetching columns:', columnsError);
      return;
    }
    
    if (!columns || columns.length === 0) {
      console.log('❌ Table podcast_sessions does not exist!');
      return;
    }
    
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${col.column_default ? `default: ${col.column_default}` : ''}`);
    });
    
    // Check if required columns exist
    const requiredColumns = [
      'id', 'title', 'description', 'user_id', 'username', 'is_live', 
      'start_time', 'end_time', 'duration', 'listeners', 'likes', 
      'status', 'youtube_broadcast_id', 'youtube_stream_id', 'rtmp_url', 
      'stream_key', 'youtube_watch_url', 'created_at', 'updated_at'
    ];
    
    console.log('\n🔍 Checking required columns:');
    const existingColumns = columns.map(col => col.column_name);
    
    requiredColumns.forEach(col => {
      if (existingColumns.includes(col)) {
        console.log(`  ✅ ${col}`);
      } else {
        console.log(`  ❌ ${col} - MISSING`);
      }
    });
    
    // Check sample data
    console.log('\n📊 Sample data check:');
    const { data: sampleData, error: sampleError } = await supabase
      .from('podcast_sessions')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('❌ Error fetching sample data:', sampleError);
    } else if (sampleData && sampleData.length > 0) {
      console.log('✅ Table has data, sample row:');
      console.log(JSON.stringify(sampleData[0], null, 2));
    } else {
      console.log('ℹ️  Table exists but has no data');
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkSchema();
