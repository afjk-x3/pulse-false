const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('Seeding database...');
  
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) {
    console.error('Error fetching users:', usersErr.message);
    return;
  }

  const userIds = {};

  for (const u of usersData.users) {
    userIds[u.user_metadata.full_name] = u.id;
    console.log(`Found user ${u.user_metadata.full_name} with ID ${u.id}`);

    // Insert into user_profiles
    const { error: profileErr } = await supabase.from('user_profiles').upsert({
      id: u.id,
      email: u.email,
      full_name: u.user_metadata.full_name,
      role: u.user_metadata.role,
      status: 'active'
    });

    if (profileErr) {
      console.error('Error creating profile:', profileErr.message);
    } else {
      console.log('Created/updated profile for:', u.user_metadata.full_name);
    }
  }

  if (userIds['Jordan Manager']) {
    const meetingData = {
      organizer_id: userIds['Jordan Manager'],
      title: 'Q3 Roadmap Planning',
      start_time: '2026-08-10T10:00:00Z',
      end_time: '2026-08-10T11:00:00Z',
      attendees: [userIds['Sam Employee'], userIds['Alex Rivera']],
      is_compliant: true
    };

    const { error: mtgErr } = await supabase.from('scheduled_meetings').insert(meetingData);
    if (mtgErr) {
      console.error('Error creating meeting:', mtgErr.message);
    } else {
      console.log('Created test meeting: Q3 Roadmap Planning');
    }
  }

  console.log('Done!');
}

seed();
