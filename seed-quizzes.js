const { Pool } = require('pg');
require('dotenv').config();

const getPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
  }
  return {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'studylink'
  };
};

const pool = new Pool(getPoolConfig());

const seedQuizzes = async () => {
  try {
    console.log('🌱 Seeding sample quizzes...');

    // Get an admin or tutor user
    const userRes = await pool.query(
      "SELECT id FROM users WHERE role IN ('admin', 'tutor') LIMIT 1"
    );

    if (!userRes.rows.length) {
      console.error('❌ No admin or tutor found. Create a user first.');
      process.exit(1);
    }

    const creatorId = userRes.rows[0].id;

    // Insert sample quizzes
    const quizzes = [
      {
        title: 'Biology 101: Cell Structure',
        description: 'Test your knowledge on cell components and functions.',
        course_code: 'BIO101',
        cover_color: '#FF6B6B',
        time_limit_seconds: 600,
        is_published: true,
        creator_id: creatorId
      },
      {
        title: 'Physics: Thermodynamics Basics',
        description: 'Fundamentals of heat, temperature, and energy.',
        course_code: 'PHYS201',
        cover_color: '#4ECDC4',
        time_limit_seconds: 900,
        is_published: true,
        creator_id: creatorId
      },
      {
        title: 'Chemistry: Periodic Table Mastery',
        description: 'Elements, atomic numbers, and chemical properties.',
        course_code: 'CHEM101',
        cover_color: '#FFE66D',
        time_limit_seconds: 480,
        is_published: true,
        creator_id: creatorId
      },
      {
        title: 'Mathematics: Calculus 1',
        description: 'Derivatives, integrals, and limits.',
        course_code: 'MATH301',
        cover_color: '#95E1D3',
        time_limit_seconds: 1200,
        is_published: true,
        creator_id: creatorId
      }
    ];

    for (const quiz of quizzes) {
      const quizRes = await pool.query(
        `INSERT INTO quizzes (title, description, course_code, cover_color, time_limit_seconds, is_published, creator_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [quiz.title, quiz.description, quiz.course_code, quiz.cover_color, quiz.time_limit_seconds, quiz.is_published, quiz.creator_id]
      );

      const quizId = quizRes.rows[0].id;
      console.log(`✅ Created quiz: ${quiz.title}`);

      // Add sample questions for each quiz
      const questions = [
        {
          question_text: 'What is the basic unit of life?',
          quiz_id: quizId,
          answers: [
            { answer_text: 'Cell', is_correct: true },
            { answer_text: 'Atom', is_correct: false },
            { answer_text: 'Molecule', is_correct: false },
            { answer_text: 'Organ', is_correct: false }
          ]
        },
        {
          question_text: 'Which organelle is responsible for energy production?',
          quiz_id: quizId,
          answers: [
            { answer_text: 'Nucleus', is_correct: false },
            { answer_text: 'Mitochondria', is_correct: true },
            { answer_text: 'Ribosome', is_correct: false },
            { answer_text: 'Golgi apparatus', is_correct: false }
          ]
        },
        {
          question_text: 'Prokaryotic cells do not have a nucleus. (True/False)',
          quiz_id: quizId,
          answers: [
            { answer_text: 'True', is_correct: true },
            { answer_text: 'False', is_correct: false }
          ]
        }
      ];

      for (const q of questions) {
        const questionRes = await pool.query(
          `INSERT INTO quiz_questions (quiz_id, question_text)
           VALUES ($1, $2)
           RETURNING id`,
          [q.quiz_id, q.question_text]
        );

        const questionId = questionRes.rows[0].id;

        // Insert answers
        for (const answer of q.answers) {
          await pool.query(
            `INSERT INTO quiz_answers (question_id, answer_text, is_correct)
             VALUES ($1, $2, $3)`,
            [questionId, answer.answer_text, answer.is_correct]
          );
        }
      }
    }

    console.log('✨ Quiz seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding quizzes:', error);
    process.exit(1);
  }
};

seedQuizzes();
