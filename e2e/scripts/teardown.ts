/**
 * Global teardown: cleans up test data created by seed.ts.
 * Runs once after all tests via playwright.config.ts globalTeardown.
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API = process.env.API_URL || 'http://localhost:8000';

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  if (!res.ok) return '';
  const data = await res.json();
  return data.access_token;
}

async function deleteSessionsByTitle(token: string, prefix: string) {
  const res = await fetch(`${API}/sessions/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const sessions = await res.json();
  const toDelete = sessions.filter((s: { title: string }) => s.title.startsWith(prefix));
  if (toDelete.length === 0) return;

  const ids = toDelete.map((s: { id: number }) => s.id);
  const delRes = await fetch(`${API}/sessions/bulk-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ids,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  if (delRes.ok) {
    console.log(`  🗑  Deleted ${ids.length} E2E sessions`);
  }
}

async function deleteMemberByEmail(token: string, email: string) {
  // Find by listing
  const res = await fetch(`${API}/members/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const members = await res.json();
  const member = members.find((m: { email: string }) => m.email === email);
  if (!member) return;

  const delRes = await fetch(`${API}/members/${member.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (delRes.ok) {
    console.log(`  🗑  Deleted member ${email}`);
  }
}

export default async function globalTeardown() {
  console.log('\n🧹 E2E Teardown — cleaning up test data...\n');

  const token = await getAdminToken();
  if (!token) {
    console.log('  ⚠️  Could not log in — skipping teardown');
    return;
  }

  // Clean up sessions
  await deleteSessionsByTitle(token, 'E2E ');

  // Clean up test members (not the admin — keep for future runs)
  const testEmails = [
    'e2e-member@test.com',
    'e2e-alice@test.com',
    'e2e-bob@test.com',
    'e2e-charlie@test.com',
  ];
  for (const email of testEmails) {
    await deleteMemberByEmail(token, email);
  }

  console.log('\n🧹 E2E Teardown — complete!\n');
}
