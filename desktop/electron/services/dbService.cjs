const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

/**
 * Initializes the local SQLite database, creating tables and indices
 * and seeding sample subjects, topics, and questions if the database is empty.
 * @param {string} dbPath The absolute path to the sqlite file.
 */
function initDatabase(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath, { verbose: console.log });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables in order
  db.exec(`
    CREATE TABLE IF NOT EXISTS activation (
      email TEXT NOT NULL,
      passcode TEXT NOT NULL PRIMARY KEY,
      activated_at TEXT NOT NULL,
      expiry_date TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      exam_type TEXT NOT NULL, -- 'JAMB' | 'WAEC' | 'NECO'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY,
      subject_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_type TEXT NOT NULL, -- 'JAMB' | 'WAEC' | 'NECO'
      subject_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      topic_id INTEGER NOT NULL,
      difficulty TEXT DEFAULT 'medium', -- 'easy' | 'medium' | 'hard'
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_answer TEXT NOT NULL, -- 'A' | 'B' | 'C' | 'D'
      topic_explanation TEXT,
      correct_explanation TEXT,
      wrong_explanations TEXT,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_type TEXT NOT NULL,
      user_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      percentage REAL NOT NULL,
      details TEXT, -- JSON breakdown per subject and answers
      submitted_at TEXT NOT NULL, -- ISO timestamp
      synced INTEGER DEFAULT 0 -- 0 for not synced, 1 for synced
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL, -- 'PULL_QUESTIONS', 'PUSH_RESULTS', 'NETWORK_STATUS'
      status TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'PENDING'
      message TEXT,
      timestamp TEXT NOT NULL
    );
  `);

  // Create high-performance indices for mock and practice filtering
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_questions_filter ON questions (exam_type, subject_id, year);
    CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions (exam_type, subject_id, topic_id);
  `);

  console.log('[SQLite] Local database tables and indices verified.');

  seedDatabaseIfEmpty();
}

/**
 * Seeding helper to pre-fill SQLite with rich test data matching PRD rules:
 * - 10 questions per subject, spread across 3 different years (2021, 2022, 2023)
 */
function seedDatabaseIfEmpty() {
  const subjectCount = db.prepare('SELECT COUNT(*) as count FROM subjects').get();
  if (subjectCount.count === 0) {
    console.log('[SQLite] Seeding initial subjects, topics, and questions...');

    // Seed Subjects
    const insertSubject = db.prepare(`
      INSERT INTO subjects (id, name, exam_type)
      VALUES (?, ?, ?)
    `);

    // JAMB subjects
    insertSubject.run(1, 'Mathematics', 'JAMB');
    insertSubject.run(2, 'English', 'JAMB');
    insertSubject.run(3, 'Physics', 'JAMB');

    // Seed Topics
    const insertTopic = db.prepare(`
      INSERT INTO topics (id, subject_id, name)
      VALUES (?, ?, ?)
    `);
    insertTopic.run(1, 1, 'Algebra');
    insertTopic.run(2, 1, 'Geometry');
    insertTopic.run(3, 2, 'Comprehension');
    insertTopic.run(4, 2, 'Synonyms');
    insertTopic.run(5, 3, 'Mechanics');

    // Seed Questions (10 questions per subject, across 2021, 2022, 2023)
    const questionsToSeed = [
      // Mathematics (Subject 1)
      { id: 1, exam_type: 'JAMB', subject_id: 1, year: 2021, topic_id: 1, difficulty: 'easy', question_text: 'Solve for x: 2x + 5 = 15', option_a: '5', option_b: '10', option_c: '15', option_d: '20', correct_answer: 'A', topic_explanation: 'Linear equations', correct_explanation: 'x = (15-5)/2 = 5', wrong_explanations: 'Other choices are incorrect.' },
      { id: 2, exam_type: 'JAMB', subject_id: 1, year: 2021, topic_id: 1, difficulty: 'medium', question_text: 'Find the roots of x^2 - 5x + 6 = 0', option_a: 'x=2,3', option_b: 'x=1,5', option_c: 'x=0,6', option_d: 'x=-2,-3', correct_answer: 'A', topic_explanation: 'Quadratic equations', correct_explanation: '(x-2)(x-3)=0 => x=2,3', wrong_explanations: 'Other roots do not satisfy.' },
      { id: 3, exam_type: 'JAMB', subject_id: 1, year: 2021, topic_id: 2, difficulty: 'easy', question_text: 'What is the sum of angles in a triangle?', option_a: '90', option_b: '180', option_c: '270', option_d: '360', correct_answer: 'B', topic_explanation: 'Triangle properties', correct_explanation: 'Triangle sum theorem.', wrong_explanations: 'Other sums are wrong.' },
      { id: 4, exam_type: 'JAMB', subject_id: 1, year: 2022, topic_id: 1, difficulty: 'easy', question_text: 'If log10(x) = 3, what is x?', option_a: '10', option_b: '100', option_c: '1000', option_d: '10000', correct_answer: 'C', topic_explanation: 'Logarithms', correct_explanation: '10^3 = 1000', wrong_explanations: 'Other powers are wrong.' },
      { id: 5, exam_type: 'JAMB', subject_id: 1, year: 2022, topic_id: 2, difficulty: 'medium', question_text: 'Calculate the area of a circle with radius 7 (pi = 22/7)', option_a: '154', option_b: '44', option_c: '49', option_d: '308', correct_answer: 'A', topic_explanation: 'Circle measurement', correct_explanation: 'Area = pi * r^2 = 22/7 * 49 = 154', wrong_explanations: 'Others are arithmetic errors.' },
      { id: 6, exam_type: 'JAMB', subject_id: 1, year: 2022, topic_id: 1, difficulty: 'hard', question_text: 'Evaluate 5P3 (Permutations)', option_a: '60', option_b: '15', option_c: '120', option_d: '20', correct_answer: 'A', topic_explanation: 'Permutations', correct_explanation: '5P3 = 5*4*3 = 60', wrong_explanations: 'Other counts are incorrect.' },
      { id: 7, exam_type: 'JAMB', subject_id: 1, year: 2023, topic_id: 2, difficulty: 'easy', question_text: 'Find the hypotenuse of a right triangle with sides 3 and 4', option_a: '5', option_b: '6', option_c: '7', option_d: '8', correct_answer: 'A', topic_explanation: 'Pythagoras theorem', correct_explanation: '3^2 + 4^2 = 25 => sqrt(25) = 5', wrong_explanations: 'Pythagorean triple.' },
      { id: 8, exam_type: 'JAMB', subject_id: 1, year: 2023, topic_id: 1, difficulty: 'medium', question_text: 'Solve for y: 3y - 7 = 8', option_a: '5', option_b: '3', option_c: '15', option_d: '8', correct_answer: 'A', topic_explanation: 'Linear equations', correct_explanation: '3y = 15 => y = 5', wrong_explanations: 'Other selections are wrong.' },
      { id: 9, exam_type: 'JAMB', subject_id: 1, year: 2023, topic_id: 2, difficulty: 'hard', question_text: 'Find the interior angle of a regular hexagon', option_a: '120', option_b: '108', option_c: '90', option_d: '135', correct_answer: 'A', topic_explanation: 'Polygons', correct_explanation: 'Formula: (n-2)*180/n => (4)*180/6 = 120', wrong_explanations: 'Standard geometry.' },
      { id: 10, exam_type: 'JAMB', subject_id: 1, year: 2023, topic_id: 1, difficulty: 'easy', question_text: 'What is 25% of 200?', option_a: '50', option_b: '25', option_c: '100', option_d: '150', correct_answer: 'A', topic_explanation: 'Percentages', correct_explanation: '0.25 * 200 = 50', wrong_explanations: 'Other values are incorrect.' },

      // English (Subject 2)
      { id: 11, exam_type: 'JAMB', subject_id: 2, year: 2021, topic_id: 3, difficulty: 'easy', question_text: 'According to the passage, the author believes education is ___', option_a: 'Essential', option_b: 'Useless', option_c: 'Optional', option_d: 'Expensive', correct_answer: 'A', topic_explanation: 'Comprehension passage', correct_explanation: 'Direct citation from first paragraph.', wrong_explanations: 'Other choices conflict with passage.' },
      { id: 12, exam_type: 'JAMB', subject_id: 2, year: 2021, topic_id: 4, difficulty: 'easy', question_text: 'Synonym of "Benevolent" is:', option_a: 'Kind', option_b: 'Cruel', option_c: 'Selfish', option_d: 'Noisy', correct_answer: 'A', topic_explanation: 'Vocabulary synonyms', correct_explanation: 'Benevolent means well-meaning and kindly.', wrong_explanations: 'Other terms are opposites.' },
      { id: 13, exam_type: 'JAMB', subject_id: 2, year: 2021, topic_id: 3, difficulty: 'medium', question_text: 'The word "ubiquitous" as used in paragraph 3 means ___', option_a: 'Present everywhere', option_b: 'Rare', option_c: 'Expensive', option_d: 'Dangerous', correct_answer: 'A', topic_explanation: 'Comprehension vocabulary', correct_explanation: 'Context clues point to widespread presence.', wrong_explanations: 'Other synonyms are inaccurate.' },
      { id: 14, exam_type: 'JAMB', subject_id: 2, year: 2022, topic_id: 4, difficulty: 'easy', question_text: 'Synonym of "Acquiesce" is:', option_a: 'Agree', option_b: 'Refuse', option_c: 'Debate', option_d: 'Run', correct_answer: 'A', topic_explanation: 'Synonyms', correct_explanation: 'Acquiesce means to accept something reluctantly but without protest.', wrong_explanations: 'Refuse is the antonym.' },
      { id: 15, exam_type: 'JAMB', subject_id: 2, year: 2022, topic_id: 3, difficulty: 'easy', question_text: 'Choose the correct spelling:', option_a: 'Embarrass', option_b: 'Embaras', option_c: 'Embarass', option_d: 'Emberass', correct_answer: 'A', topic_explanation: 'Spelling checks', correct_explanation: 'Embarrass contains double r and double s.', wrong_explanations: 'Others are spelling errors.' },
      { id: 16, exam_type: 'JAMB', subject_id: 2, year: 2022, topic_id: 4, difficulty: 'medium', question_text: 'Synonym of "Ephemeral" is:', option_a: 'Short-lived', option_b: 'Eternal', option_c: 'Heavy', option_d: 'Transparent', correct_answer: 'A', topic_explanation: 'Synonyms', correct_explanation: 'Ephemeral means lasting for a very short time.', wrong_explanations: 'Eternal is the opposite.' },
      { id: 17, exam_type: 'JAMB', subject_id: 2, year: 2023, topic_id: 3, difficulty: 'medium', question_text: 'Complete the sentence: If I ___ you, I would study harder.', option_a: 'were', option_b: 'was', option_c: 'am', option_d: 'be', correct_answer: 'A', topic_explanation: 'Grammar conditionals', correct_explanation: 'Subjunctive mood uses "were" for hypothetical.', wrong_explanations: 'Others are grammatically incorrect.' },
      { id: 18, exam_type: 'JAMB', subject_id: 2, year: 2023, topic_id: 4, difficulty: 'easy', question_text: 'Synonym of "Candid" is:', option_a: 'Honest', option_b: 'Deceitful', option_c: 'Sweet', option_d: 'Vague', correct_answer: 'A', topic_explanation: 'Synonyms', correct_explanation: 'Candid means truthful and straightforward.', wrong_explanations: 'Deceitful is the opposite.' },
      { id: 19, exam_type: 'JAMB', subject_id: 2, year: 2023, topic_id: 3, difficulty: 'easy', question_text: 'Choose the antonym of "Zenith"', option_a: 'Nadir', option_b: 'Apex', option_c: 'Peak', option_d: 'Summit', correct_answer: 'A', topic_explanation: 'Antonyms', correct_explanation: 'Zenith is the highest point, Nadir is the lowest point.', wrong_explanations: 'Apex/Peak/Summit are synonyms.' },
      { id: 20, exam_type: 'JAMB', subject_id: 2, year: 2023, topic_id: 4, difficulty: 'medium', question_text: 'Synonym of "Pragmatic" is:', option_a: 'Practical', option_b: 'Idealistic', option_c: 'Erratic', option_d: 'Academic', correct_answer: 'A', topic_explanation: 'Synonyms', correct_explanation: 'Pragmatic means dealing with things sensibly and realistically.', wrong_explanations: 'Idealistic is an antonym.' },

      // Physics (Subject 3)
      { id: 21, exam_type: 'JAMB', subject_id: 3, year: 2021, topic_id: 5, difficulty: 'easy', question_text: 'What is the SI unit of electric current?', option_a: 'Ampere', option_b: 'Volt', option_c: 'Ohm', option_d: 'Watt', correct_answer: 'A', topic_explanation: 'Electric current', correct_explanation: 'Ampere is standard unit.', wrong_explanations: 'Others are for voltage/resistance.' },
      { id: 22, exam_type: 'JAMB', subject_id: 3, year: 2021, topic_id: 5, difficulty: 'medium', question_text: 'Calculate work done when a force of 10N moves a block 5m in force direction.', option_a: '50 J', option_b: '15 J', option_c: '2 J', option_d: '100 J', correct_answer: 'A', topic_explanation: 'Work and energy', correct_explanation: 'Work = Force * Distance = 10 * 5 = 50 Joules', wrong_explanations: 'Others are math errors.' },
      { id: 23, exam_type: 'JAMB', subject_id: 3, year: 2021, topic_id: 5, difficulty: 'easy', question_text: 'The speed of light in vacuum is approximately ___', option_a: '3 x 10^8 m/s', option_b: '3 x 10^6 m/s', option_c: '1.5 x 10^8 m/s', option_d: '3 x 10^10 m/s', correct_answer: 'A', topic_explanation: 'Electromagnetic wave', correct_explanation: 'Universal physical constant.', wrong_explanations: 'Others are off by powers.' },
      { id: 24, exam_type: 'JAMB', subject_id: 3, year: 2022, topic_id: 5, difficulty: 'easy', question_text: 'Which of the following is a vector quantity?', option_a: 'Force', option_b: 'Mass', option_c: 'Temperature', option_d: 'Time', correct_answer: 'A', topic_explanation: 'Vectors and Scalars', correct_explanation: 'Force has both magnitude and direction.', wrong_explanations: 'Mass, temperature, and time are scalars.' },
      { id: 25, exam_type: 'JAMB', subject_id: 3, year: 2022, topic_id: 5, difficulty: 'medium', question_text: 'What is the frequency of a wave with speed 300 m/s and wavelength 6 m?', option_a: '50 Hz', option_b: '1800 Hz', option_c: '0.02 Hz', option_d: '306 Hz', correct_answer: 'A', topic_explanation: 'Wave physics', correct_explanation: 'Frequency = Speed / Wavelength = 300 / 6 = 50 Hz', wrong_explanations: 'Other selections are incorrect.' },
      { id: 26, exam_type: 'JAMB', subject_id: 3, year: 2022, topic_id: 5, difficulty: 'hard', question_text: 'A body falls freely from rest. Calculate distance fallen in 3 seconds (g = 10 m/s^2)', option_a: '45 m', option_b: '30 m', option_c: '90 m', option_d: '15 m', correct_answer: 'A', topic_explanation: 'Equations of motion', correct_explanation: 'd = 0.5 * g * t^2 = 0.5 * 10 * 9 = 45m', wrong_explanations: 'Others are arithmetic mistakes.' },
      { id: 27, exam_type: 'JAMB', subject_id: 3, year: 2023, topic_id: 5, difficulty: 'easy', question_text: "State Hooke's law relationship", option_a: 'Force is proportional to extension', option_b: 'Force is proportional to velocity', option_c: 'Energy is conserved', option_d: 'Pressure is constant', correct_answer: 'A', topic_explanation: 'Elasticity', correct_explanation: "Hooke's law: F = ke", wrong_explanations: 'Other options describe other laws.' },
      { id: 28, exam_type: 'JAMB', subject_id: 3, year: 2023, topic_id: 5, difficulty: 'medium', question_text: 'Calculate resistance if voltage is 12V and current is 3A', option_a: '4 Ohms', option_b: '36 Ohms', option_c: '15 Ohms', option_d: '9 Ohms', correct_answer: 'A', topic_explanation: "Ohm's law", correct_explanation: 'R = V/I = 12/3 = 4 Ohms', wrong_explanations: 'Arithmetic verification.' },
      { id: 29, exam_type: 'JAMB', subject_id: 3, year: 2023, topic_id: 5, difficulty: 'hard', question_text: 'What is the escape velocity of a projectile from Earth surface?', option_a: '11.2 km/s', option_b: '11.2 m/s', option_c: '9.8 km/s', option_d: '42.1 km/s', correct_answer: 'A', topic_explanation: 'Gravitational fields', correct_explanation: 'Standard physical value for earth.', wrong_explanations: 'Other units or figures are incorrect.' },
      { id: 30, exam_type: 'JAMB', subject_id: 3, year: 2023, topic_id: 5, difficulty: 'easy', question_text: 'Which instrument is used to measure temperature?', option_a: 'Thermometer', option_b: 'Barometer', option_c: 'Anemometer', option_d: 'Hygrometer', correct_answer: 'A', topic_explanation: 'Heat and temperature', correct_explanation: 'Thermometers measure heat degrees.', wrong_explanations: 'Barometers measure pressure.' }
    ];

    const insertQuestion = db.prepare(`
      INSERT INTO questions (
        id, exam_type, subject_id, year, topic_id, difficulty,
        question_text, option_a, option_b, option_c, option_d, correct_answer,
        topic_explanation, correct_explanation, wrong_explanations
      ) VALUES (
        @id, @exam_type, @subject_id, @year, @topic_id, @difficulty,
        @question_text, @option_a, @option_b, @option_c, @option_d, @correct_answer,
        @topic_explanation, @correct_explanation, @wrong_explanations
      )
    `);

    db.transaction(() => {
      for (const q of questionsToSeed) {
        insertQuestion.run(q);
      }
    })();
    console.log('[SQLite] Local database successfully seeded with subjects, topics, and questions.');
  }
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('[SQLite] Local database connection closed.');
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database is not initialized. Please call initDatabase first.');
  }
  return db;
}

module.exports = {
  initDatabase,
  getDb,
  closeDatabase
};
