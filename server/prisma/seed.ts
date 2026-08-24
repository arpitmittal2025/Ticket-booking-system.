import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', passwordHash, name: 'Admin', role: 'ADMIN' },
  });
  
  const organiser = await prisma.user.upsert({
    where: { email: 'org@example.com' },
    update: {},
    create: { email: 'org@example.com', passwordHash, name: 'Organiser', role: 'ORGANISER' },
  });
  
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: { email: 'customer@example.com', passwordHash, name: 'Customer', role: 'CUSTOMER' },
  });

  // 2. Create Venue
  const venue = await prisma.venue.create({
    data: {
      name: 'Grand Theater',
      address: '123 Main St, Cityville',
      rows: 10,
      cols: 20, // 200 seats total
    },
  });

  // 3. Create Categories
  const catPremium = await prisma.seatCategory.create({
    data: { venueId: venue.id, name: 'Premium', color: '#ffcc00' }
  });
  const catStandard = await prisma.seatCategory.create({
    data: { venueId: venue.id, name: 'Standard', color: '#3399ff' }
  });
  const catBalcony = await prisma.seatCategory.create({
    data: { venueId: venue.id, name: 'Balcony', color: '#9933ff' }
  });

  // 4. Create Seats (10 rows, 20 cols)
  // Rows A-B: Premium (2*20 = 40)
  // Rows C-G: Standard (5*20 = 100)
  // Rows H-J: Balcony (3*20 = 60)
  const seatsData = [];
  const rowLabels = ['A','B','C','D','E','F','G','H','I','J'];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 20; c++) {
      let catId = catStandard.id;
      if (r < 2) catId = catPremium.id;
      else if (r > 6) catId = catBalcony.id;

      seatsData.push({
        venueId: venue.id,
        categoryId: catId,
        rowLabel: rowLabels[r],
        seatNumber: c + 1,
        rowIndex: r,
        colIndex: c,
        isAisle: c === 9 || c === 10 ? true : false,
      });
    }
  }
  
  await prisma.seat.createMany({ data: seatsData });

  // 5. Create Events
  const eventMovie = await prisma.event.create({
    data: {
      organiserId: organiser.id,
      title: 'Inception',
      description: 'A thief who steals corporate secrets through the use of dream-sharing technology.',
      type: 'MOVIE',
      durationMin: 148,
    }
  });

  const eventConcert = await prisma.event.create({
    data: {
      title: 'Summer Music Festival',
      description: 'The biggest music event of the year!',
      type: 'CONCERT',
      organiserId: organiser.id,
    }
  });

  // 6. Create Shows
  const showsData = [
    { eventId: eventMovie.id, venueId: venue.id, startsAt: new Date(Date.now() + 86400000), status: 'SCHEDULED' },
    { eventId: eventMovie.id, venueId: venue.id, startsAt: new Date(Date.now() + 86400000 * 2), status: 'SCHEDULED' },
    { eventId: eventConcert.id, venueId: venue.id, startsAt: new Date(Date.now() + 86400000 * 3), status: 'SCHEDULED' },
    { eventId: eventConcert.id, venueId: venue.id, startsAt: new Date(Date.now() + 86400000 * 4), status: 'SCHEDULED' },
  ];

  for (const showInput of showsData) {
    const show = await prisma.show.create({ data: showInput });
    
    // Add Show Prices
    await prisma.showPrice.createMany({
      data: [
        { showId: show.id, categoryId: catPremium.id, price: 50.00 },
        { showId: show.id, categoryId: catStandard.id, price: 30.00 },
        { showId: show.id, categoryId: catBalcony.id, price: 20.00 },
      ]
    });

    // Populate ShowSeats
    const allSeats = await prisma.seat.findMany({ where: { venueId: venue.id } });
    await prisma.showSeat.createMany({
      data: allSeats.map(seat => ({
        showId: show.id,
        seatId: seat.id,
        categoryId: seat.categoryId,
        status: 'AVAILABLE'
      }))
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
