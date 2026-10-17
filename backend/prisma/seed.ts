import '../src/config/env';
import { SeedService } from '../src/services/seed.service';
import { prisma } from '../src/utils/prisma';

async function main() {
  await SeedService.seedAll();
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
