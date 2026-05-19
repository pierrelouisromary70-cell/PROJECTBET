import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATALOG } from "../src/lib/shop-catalog";
import { vdotFromPerf } from "../src/lib/vdot";
import { generateReferralCode } from "../src/lib/referral";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding catalog…");
  for (const item of CATALOG) {
    const data = {
      category: item.category,
      brand: item.brand,
      model: item.model,
      tier: item.tier,
      priceTokens: item.priceTokens,
      imageEmoji: item.imageEmoji,
      description: item.description,
      availableUntil: item.availableUntil ? new Date(item.availableUntil) : null,
    };
    await prisma.shopItem.upsert({
      where: { id: item.id },
      update: data,
      create: { id: item.id, ...data },
    });
  }

  console.log("Seeding démo users…");
  const demoUsers = [
    { email: "alex@demo.run", name: "Alex (35:00 / 10k)", pwd: "demo1234", dist: 10000, time: 35 * 60, gender: "M", year: 1992 },
    { email: "marie@demo.run", name: "Marie (45:00 / 10k)", pwd: "demo1234", dist: 10000, time: 45 * 60, gender: "F", year: 1990 },
    { email: "leo@demo.run", name: "Leo (1:25 semi)", pwd: "demo1234", dist: 21097, time: 85 * 60, gender: "M", year: 1988 },
    { email: "sara@demo.run", name: "Sara (19:30 / 5k)", pwd: "demo1234", dist: 5000, time: 19 * 60 + 30, gender: "F", year: 1995 },
  ];

  for (const u of demoUsers) {
    const hash = await bcrypt.hash(u.pwd, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        displayName: u.name,
        passwordHash: hash,
        tokens: 500,
        trustScore: 70,
        referralCode: generateReferralCode(),
      },
    });

    const vdot = vdotFromPerf(u.dist, u.time);
    await prisma.runnerProfile.upsert({
      where: { userId: user.id },
      update: { vdot },
      create: {
        userId: user.id,
        gender: u.gender,
        birthYear: u.year,
        vdot,
      },
    });

    await prisma.personalRecord.create({
      data: {
        userId: user.id,
        distanceM: u.dist,
        timeSec: u.time,
        raceDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        source: "OFFICIAL",
        evidenceUrl: "https://example.com/race-result",
        status: "VERIFIED",
        verifiedAt: new Date(),
      },
    });
  }

  console.log("Seeding démo race…");
  const alex = await prisma.user.findUnique({ where: { email: "alex@demo.run" } });
  const marie = await prisma.user.findUnique({ where: { email: "marie@demo.run" } });
  if (alex && marie) {
    const race = await prisma.race.create({
      data: {
        name: "10 km de Vincennes (démo)",
        distanceM: 10000,
        scheduledAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        location: "Bois de Vincennes",
        creatorId: alex.id,
        entries: {
          create: [
            { runnerId: alex.id },
            { runnerId: marie.id },
          ],
        },
      },
    });
    console.log("  race:", race.id);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
