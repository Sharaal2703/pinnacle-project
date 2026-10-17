import '../src/config/env';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/utils/prisma';

async function main(): Promise<void> {
  const name = process.env.ADMIN_NAME?.trim();
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !username || !password) {
    throw new Error('Set ADMIN_NAME, ADMIN_USERNAME, and ADMIN_PASSWORD for this one-time command.');
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new Error(`Username '${username}' already exists; no account was changed.`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      name,
      username,
      passwordHash,
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log(`Admin account '${username}' provisioned.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Admin provisioning failed.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
