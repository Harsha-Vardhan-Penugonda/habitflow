// @vitest-environment node
/**
 * Runs supabase/schema.sql against a real (in-process) PostgreSQL database
 * using PGlite, then checks that Row Level Security keeps users' data apart.
 *
 * Supabase provides the `auth` schema, `auth.uid()` and the `anon` /
 * `authenticated` roles. We create minimal stand-ins for those here so the
 * schema can be tested without a Supabase project or Docker.
 */
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const schemaSql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')

const ALICE = '11111111-1111-4111-8111-111111111111'
const BOB = '22222222-2222-4222-8222-222222222222'

let db: PGlite

/** Run `fn` as a logged-in Supabase user (or as a logged-out visitor). */
async function as<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
  if (userId) {
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId])
    await db.exec('set role authenticated')
  } else {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
    await db.exec('set role anon')
  }
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
  }
}

async function createHabit(userId: string, name: string): Promise<string> {
  return as(userId, async () => {
    const res = await db.query<{ id: string }>(
      `insert into public.habits (name) values ($1) returning id`,
      [name],
    )
    return res.rows[0].id
  })
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (
      id uuid primary key,
      raw_user_meta_data jsonb not null default '{}'
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema public to anon, authenticated;
  `)
  await db.exec(schemaSql)
  await db.query(
    `insert into auth.users (id, raw_user_meta_data) values ($1, $2), ($3, '{}')`,
    [ALICE, JSON.stringify({ display_name: '  Alice  ' }), BOB],
  )
})

afterAll(async () => {
  await db.close()
})

describe('schema.sql', () => {
  it('can be run more than once', async () => {
    await expect(db.exec(schemaSql)).resolves.toBeDefined()
  })

  it('creates a profile automatically for each new user', async () => {
    const res = await db.query<{ id: string; display_name: string | null }>(
      'select id, display_name from public.profiles order by id',
    )
    expect(res.rows).toEqual([
      { id: ALICE, display_name: 'Alice' },
      { id: BOB, display_name: null },
    ])
  })

  it('only lets users see their own profile', async () => {
    const rows = await as(BOB, async () => (await db.query('select id from public.profiles')).rows)
    expect(rows).toEqual([{ id: BOB }])
  })
})

describe('habits RLS', () => {
  it('sets user_id automatically and hides habits from other users', async () => {
    const id = await createHabit(ALICE, 'Read')
    const aliceRows = await as(ALICE, async () =>
      (await db.query<{ id: string; user_id: string }>('select id, user_id from public.habits')).rows,
    )
    expect(aliceRows).toContainEqual({ id, user_id: ALICE })

    const bobRows = await as(BOB, async () =>
      (await db.query('select id from public.habits where id = $1', [id])).rows,
    )
    expect(bobRows).toHaveLength(0)
  })

  it('rejects creating a habit on behalf of another user', async () => {
    await expect(
      as(BOB, () => db.query('insert into public.habits (name, user_id) values ($1, $2)', ['x', ALICE])),
    ).rejects.toThrow(/row-level security/)
  })

  it('does not let users update or delete other users’ habits', async () => {
    const id = await createHabit(ALICE, 'Meditate')
    const updated = await as(BOB, () =>
      db.query(`update public.habits set name = 'hacked' where id = $1`, [id]),
    )
    const deleted = await as(BOB, () => db.query('delete from public.habits where id = $1', [id]))
    expect(updated.affectedRows).toBe(0)
    expect(deleted.affectedRows).toBe(0)

    const res = await db.query<{ name: string }>('select name from public.habits where id = $1', [id])
    expect(res.rows[0].name).toBe('Meditate')
  })

  it('does not let users hand their habit over to someone else', async () => {
    const id = await createHabit(BOB, 'Run')
    await expect(
      as(BOB, () => db.query('update public.habits set user_id = $1 where id = $2', [ALICE, id])),
    ).rejects.toThrow(/row-level security/)
  })

  it('validates habit fields', async () => {
    await expect(createHabit(ALICE, '   ')).rejects.toThrow(/check constraint/)
    await expect(createHabit(ALICE, 'x'.repeat(61))).rejects.toThrow(/check constraint/)
    await expect(
      as(ALICE, () => db.query(`insert into public.habits (name, category) values ('a', 'nope')`)),
    ).rejects.toThrow(/check constraint/)
  })

  it('denies logged-out visitors entirely', async () => {
    await expect(as(null, () => db.query('select * from public.habits'))).rejects.toThrow(
      /permission denied/,
    )
  })
})

describe('habit_completions RLS', () => {
  it('lets a user complete and un-complete their own habit', async () => {
    const id = await createHabit(ALICE, 'Water')
    await as(ALICE, () =>
      db.query(`insert into public.habit_completions (habit_id, completed_on) values ($1, current_date)`, [id]),
    )
    const deleted = await as(ALICE, () =>
      db.query('delete from public.habit_completions where habit_id = $1', [id]),
    )
    expect(deleted.affectedRows).toBe(1)
  })

  it('prevents duplicate completions for the same habit and date', async () => {
    const id = await createHabit(ALICE, 'Stretch')
    const insert = () =>
      as(ALICE, () =>
        db.query(`insert into public.habit_completions (habit_id, completed_on) values ($1, current_date)`, [id]),
      )
    await insert()
    await expect(insert()).rejects.toThrow(/habit_completions_one_per_day/)
  })

  it('rejects completions for another user’s habit, however the request is crafted', async () => {
    const aliceHabit = await createHabit(ALICE, 'Journal')

    // Bob claims the completion as his own → the habit is not his.
    await expect(
      as(BOB, () =>
        db.query(`insert into public.habit_completions (habit_id, completed_on) values ($1, current_date)`, [aliceHabit]),
      ),
    ).rejects.toThrow()

    // Bob claims the completion is Alice's → he is not Alice.
    await expect(
      as(BOB, () =>
        db.query(
          `insert into public.habit_completions (habit_id, user_id, completed_on) values ($1, $2, current_date)`,
          [aliceHabit, ALICE],
        ),
      ),
    ).rejects.toThrow(/row-level security/)
  })

  it('enforces matching owners even for privileged inserts (composite foreign key)', async () => {
    const aliceHabit = await createHabit(ALICE, 'Floss')
    await expect(
      db.query(
        `insert into public.habit_completions (habit_id, user_id, completed_on) values ($1, $2, current_date)`,
        [aliceHabit, BOB],
      ),
    ).rejects.toThrow(/habit_completions_habit_owner_fkey/)
  })

  it('hides other users’ completions and blocks deleting them', async () => {
    const id = await createHabit(ALICE, 'Walk')
    await as(ALICE, () =>
      db.query(`insert into public.habit_completions (habit_id, completed_on) values ($1, current_date)`, [id]),
    )
    const seen = await as(BOB, async () =>
      (await db.query('select * from public.habit_completions where habit_id = $1', [id])).rows,
    )
    const deleted = await as(BOB, () =>
      db.query('delete from public.habit_completions where habit_id = $1', [id]),
    )
    expect(seen).toHaveLength(0)
    expect(deleted.affectedRows).toBe(0)
  })

  it('rejects completions dated in the future', async () => {
    const id = await createHabit(ALICE, 'Sleep early')
    await expect(
      as(ALICE, () =>
        db.query(`insert into public.habit_completions (habit_id, completed_on) values ($1, current_date + 7)`, [id]),
      ),
    ).rejects.toThrow(/row-level security/)
  })

  it('does not allow editing completions (undo = delete)', async () => {
    const id = await createHabit(ALICE, 'Cook')
    await as(ALICE, () =>
      db.query(`insert into public.habit_completions (habit_id, completed_on) values ($1, current_date)`, [id]),
    )
    await expect(
      as(ALICE, () =>
        db.query(`update public.habit_completions set completed_on = current_date - 1 where habit_id = $1`, [id]),
      ),
    ).rejects.toThrow(/permission denied/)
  })

  it('removes completions when their habit is deleted', async () => {
    const id = await createHabit(ALICE, 'Practice guitar')
    await as(ALICE, async () => {
      await db.query(`insert into public.habit_completions (habit_id, completed_on) values ($1, current_date)`, [id])
      await db.query('delete from public.habits where id = $1', [id])
    })
    const res = await db.query('select * from public.habit_completions where habit_id = $1', [id])
    expect(res.rows).toHaveLength(0)
  })
})
