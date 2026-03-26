const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@company.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('✅ Seed complete');
  console.log(`   Admin user: ${admin.email} / password: admin123`);
  console.log('   Change the password after first login!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
