/**
 * Global setup: seeds the backend with test users and data.
 * Runs once before all tests via playwright.config.ts globalSetup.
 *
 * Requires the backend API to be running at API_URL.
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API = process.env.API_URL || 'http://localhost:8000';

interface SeedUser {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
  permissions?: string[];
  roles?: string[];
  is_active?: boolean;
}

/** Log in as admin and return the Bearer token */
async function getAdminToken(): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  if (!res.ok) {
    throw new Error(`Admin login failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

/** Create a member via the API (idempotent — skips if email exists) */
async function createMember(token: string, user: SeedUser): Promise<void> {
  const res = await fetch(`${API}/members/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(user),
  });
  if (res.status === 400) {
    const detail = await res.json();
    if (detail?.detail?.includes('already registered')) {
      console.log(`  ⏭  ${user.email} already exists — skipping`);
      return;
    }
  }
  if (!res.ok) {
    throw new Error(`Failed to create ${user.email} (${res.status}): ${await res.text()}`);
  }
  console.log(`  ✅ Created ${user.email}`);
}

/** Create a session via the API */
async function createSession(token: string, session: Record<string, unknown>): Promise<number> {
  const res = await fetch(`${API}/sessions/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(session),
  });
  if (!res.ok) {
    console.warn(`  ⚠️  Session create failed (${res.status}): ${await res.text()}`);
    return -1;
  }
  const data = await res.json();
  console.log(`  ✅ Created session "${session.title}" (id: ${data.id})`);
  return data.id;
}

export default async function globalSetup() {
  console.log('\n🌱 E2E Seed — setting up test data...\n');

  // ── Step 1: Try to log in with seeded admin first ──
  // If the admin already exists from a previous run, reuse it.
  let token: string;
  try {
    token = await getAdminToken();
    console.log('  ✅ Admin already exists — reusing token');
  } catch (err) {
    // Admin doesn't exist yet — seed will be skipped.
    // Tests that don't require seed data (login, forgot-password, QR) can still run.
    console.warn(
      '  ⚠️  Could not log in as e2e-admin. Skipping seed.\n' +
      '     To enable full seeding, create the admin user in the database.\n' +
      `     Error: ${err instanceof Error ? err.message : err}\n`
    );
    return; // graceful exit — don't fail the suite
  }

  // ── Step 2: Seed test members ──
  const testMembers: SeedUser[] = [
    {
      first_name: 'E2E',
      last_name: 'Member',
      email: process.env.MEMBER_EMAIL || 'e2e-member@test.com',
      phone_number: '+19990000001',
      password: process.env.MEMBER_PASSWORD || 'E2eMemberPass!2026',
      permissions: ['member'],
    },
    {
      first_name: 'Alice',
      last_name: 'Anderson',
      email: 'e2e-alice@test.com',
      phone_number: '+19990000002',
      password: 'TestPass123!',
      permissions: ['member'],
    },
    {
      first_name: 'Bob',
      last_name: 'Baker',
      email: 'e2e-bob@test.com',
      phone_number: '+19990000003',
      password: 'TestPass123!',
      permissions: ['member'],
    },
    {
      first_name: 'Charlie',
      last_name: 'Clark',
      email: 'e2e-charlie@test.com',
      phone_number: '+19990000004',
      password: 'TestPass123!',
      permissions: ['member'],
      is_active: false, // inactive member for testing filters
    },
  ];

  for (const member of testMembers) {
    await createMember(token, member);
  }

  // ── Step 3: Seed test sessions ──
  const now = new Date();
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7));
  nextSunday.setHours(10, 0, 0, 0);

  const nextWednesday = new Date(now);
  nextWednesday.setDate(now.getDate() + ((3 - now.getDay() + 7) % 7 || 7));
  nextWednesday.setHours(19, 0, 0, 0);

  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - (now.getDay() || 7));
  lastSunday.setHours(10, 0, 0, 0);

  const testSessions = [
    {
      title: 'E2E Sunday Service',
      type: 'program',
      status: 'scheduled',
      start_time: nextSunday.toISOString(),
      end_time: new Date(nextSunday.getTime() + 2 * 3600000).toISOString(),
    },
    {
      title: 'E2E Wednesday Rehearsal',
      type: 'rehearsal',
      status: 'scheduled',
      start_time: nextWednesday.toISOString(),
      end_time: new Date(nextWednesday.getTime() + 2 * 3600000).toISOString(),
    },
    {
      title: 'E2E Past Service',
      type: 'program',
      status: 'concluded',
      start_time: lastSunday.toISOString(),
      end_time: new Date(lastSunday.getTime() + 2 * 3600000).toISOString(),
    },
  ];

  for (const session of testSessions) {
    await createSession(token, session);
  }

  console.log('\n🌱 E2E Seed — complete!\n');
}
