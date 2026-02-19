// create-admin.js
require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdmin() {
  const password = 'Admin@123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const { data, error } = await supabase
    .from('admin_users')
    .insert([{
      email: 'admin@plateeform.com',
      password_hash: hashedPassword,
      full_name: 'Super Admin',
      role: 'super_admin',
      is_active: true
    }])
    .select();
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Admin created successfully!');
    console.log('Email: admin@platform.com');
    console.log('Password: Admin@123');
  }
}

createAdmin();