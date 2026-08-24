import { PrismaClient } from '@prisma/client';
import { signToken } from '../src/lib/jwt';

const prisma = new PrismaClient();

async function runTest() {
  console.log('Starting Concurrency Test...');

  // 1. Get a test user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No users in DB. Run seed first.');
    process.exit(1);
  }
  const token = signToken({ userId: user.id, role: user.role });

  // 2. Get an available seat
  const seat = await prisma.showSeat.findFirst({
    where: { status: 'AVAILABLE' }
  });
  if (!seat) {
    console.error('No available seats found.');
    process.exit(1);
  }

  console.log(`Targeting ShowSeat ${seat.id} for Show ${seat.showId}`);

  // 3. Fire 50 concurrent hold requests
  const url = `http://localhost:4000/api/shows/${seat.showId}/holds`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  const body = JSON.stringify({ seatIds: [seat.seatId] });

  const promises = [];
  for (let i = 0; i < 50; i++) {
    promises.push(fetch(url, { method: 'POST', headers, body }));
  }

  const responses = await Promise.all(promises);
  
  let successCount = 0;
  let conflictCount = 0;
  let otherCount = 0;

  for (const res of responses) {
    if (res.status === 201) successCount++;
    else if (res.status === 409) conflictCount++;
    else otherCount++;
  }

  console.log(`\nTest Results:`);
  console.log(`Total Requests: 50`);
  console.log(`Success (201): ${successCount}`);
  console.log(`Conflict (409): ${conflictCount}`);
  console.log(`Other: ${otherCount}`);

  if (successCount === 1 && conflictCount === 49) {
    console.log('\n✅ PASSED: Concurrency control works perfectly!');
  } else {
    console.log('\n❌ FAILED: Concurrency control failed.');
  }

  process.exit(0);
}

runTest();
