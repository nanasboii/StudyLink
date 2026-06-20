-- migrate-redeem-effects.sql
-- Run against your existing database if already initialized:
--   psql $DATABASE_URL -f migrate-redeem-effects.sql

-- 1. Add spotlight_until (null = not spotlighted)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS spotlight_until TIMESTAMP;

-- 2. Add has_exclusive_badge flag
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS has_exclusive_badge BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. (Optional) Add priority_booking_until if PRIORITY_BOOKING effect is desired
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS priority_booking_until TIMESTAMP;

-- 4. Update STUDY_KIT description → fully online / digital
UPDATE point_rewards
SET description = 'Unlock an exclusive digital study kit — curated study templates, note-taking packs, and a StudyLink digital sticker collection, delivered to your email.'
WHERE code = 'STUDY_KIT';

-- 5. Update ACADEMIC_CERT description → personal project (remove faculty reference)
UPDATE point_rewards
SET description = 'Receive an official StudyLink Academic Merit Certificate recognizing your outstanding contributions and peer-support activity on the platform.'
WHERE code = 'ACADEMIC_CERT';