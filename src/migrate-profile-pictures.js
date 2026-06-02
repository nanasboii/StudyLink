const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const getPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'studylink',
    password: process.env.DB_PASSWORD || 'studylink',
    database: process.env.DB_NAME || 'studylink',
    ssl: String(process.env.DB_SSL || '').toLowerCase() === 'true'
      ? {
          rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true'
        }
      : undefined
  };
};

async function migrateProfilePictures() {
  const pool = new Pool(getPoolConfig());

  try {
    console.log('📸 Starting profile picture migration to database...\n');

    const uploadBaseDir = path.join(__dirname, 'uploads');
    const profilePictureDir = path.join(uploadBaseDir, 'profile-pictures');

    if (!fs.existsSync(profilePictureDir)) {
      console.log('ℹ️  No profile pictures directory found. Nothing to migrate.');
      return;
    }

    const files = fs.readdirSync(profilePictureDir);
    if (files.length === 0) {
      console.log('ℹ️  No profile pictures found. Nothing to migrate.');
      return;
    }

    console.log(`Found ${files.length} profile picture(s) to migrate.\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const filename of files) {
      const match = filename.match(/^profile-(\d+)-/);
      if (!match || !match[1]) {
        console.log(`⚠️  Skipping ${filename}: invalid filename format`);
        skipCount++;
        continue;
      }

      const userId = parseInt(match[1], 10);
      const filePath = path.join(profilePictureDir, filename);

      try {
        // Read file from disk
        const fileBuffer = fs.readFileSync(filePath);
        
        // Determine MIME type from extension
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        const mimeType = mimeTypes[ext] || 'image/jpeg';

        // Check if user exists
        const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
          console.log(`⚠️  Skipping ${filename}: user ${userId} not found`);
          skipCount++;
          continue;
        }

        // Check if user already has a profile picture in database
        const pictureCheck = await pool.query(
          'SELECT profile_picture FROM users WHERE id = $1 AND profile_picture IS NOT NULL',
          [userId]
        );

        if (pictureCheck.rows.length > 0) {
          console.log(`⚠️  Skipping ${filename}: user ${userId} already has a profile picture in database`);
          skipCount++;
          continue;
        }

        // Upload to database
        await pool.query(
          'UPDATE users SET profile_picture = $1, profile_picture_mime_type = $2 WHERE id = $3',
          [fileBuffer, mimeType, userId]
        );

        console.log(`✅ Migrated ${filename} for user ${userId} (${(fileBuffer.length / 1024).toFixed(1)}KB)`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error migrating ${filename}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n🎉 Migration complete:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateProfilePictures();
