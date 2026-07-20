require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const email = process.env.ADMIN_EMAIL || 'admin@ims.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const fullName = process.env.ADMIN_FULL_NAME || 'System Administrator';

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: fullName, role: 'admin' },
    email_confirm: true
  });

  if (error) {
    if (error.message.includes('already')) {
      console.log(`Admin user "${email}" already exists.`);
    } else {
      throw new Error(error.message);
    }
  } else {
    console.log(`Admin user created: ${email} (ID: ${data.user.id})`);
  }
}

main().catch(async (err) => {
  console.error(err.message);
  process.exit(1);
});
