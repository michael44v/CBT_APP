<?php
// Fillop CBT Guru - Database Connection and Fallback Engine
// Primary: mysqli (MySQL), Fallback: SQLite3 (for local sandboxed testing)

class HybridDatabase {
  private $dbType; // 'MYSQL' or 'SQLITE'
  private $conn;
  public $error = null;
  public $errno = 0;
  public $insert_id = 0;

  public function __construct() {
    $host = 'localhost';
    $user = 'root';
    $pass = '';
    $dbname = 'fillop_cbt';

    // Attempt to connect via mysqli
    mysqli_report(MYSQLI_REPORT_OFF);
    try {
      $mysql_conn = @new mysqli($host, $user, $pass, $dbname);
      if ($mysql_conn && !$mysql_conn->connect_error) {
        $this->dbType = 'MYSQL';
        $this->conn = $mysql_conn;
        return;
      }
    } catch (Exception $e) {
      // Failed, fallback to SQLite
    }

    // Fallback to SQLite3
    $this->dbType = 'SQLITE';
    $sqlitePath = dirname(__FILE__) . '/fillop_server.db';
    $isNew = !file_exists($sqlitePath);

    $this->conn = new SQLite3($sqlitePath);
    $this->conn->enableExceptions(true);

    if ($isNew) {
      $this->initializeSQLiteSchema();
    }
  }

  private function initializeSQLiteSchema() {
    $this->conn->exec("
      CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'school',
        contact_email TEXT,
        contact_phone TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        state TEXT,
        school TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS passcodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        passcode TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        organization_id INTEGER NULL,
        max_devices INTEGER DEFAULT 1,
        activated_devices INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        duration_days INTEGER DEFAULT 180,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NULL,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        passcode_id INTEGER NOT NULL,
        device_uuid TEXT NOT NULL,
        hardware_hash TEXT NOT NULL,
        activated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (passcode_id) REFERENCES passcodes(id) ON DELETE CASCADE,
        UNIQUE(passcode_id, device_uuid)
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        exam_type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY,
        subject_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_type TEXT NOT NULL,
        subject_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        topic_id INTEGER NOT NULL,
        difficulty TEXT DEFAULT 'medium',
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        topic_explanation TEXT,
        correct_explanation TEXT,
        wrong_explanations TEXT,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        exam_type TEXT NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage REAL NOT NULL,
        details TEXT,
        submitted_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS promo_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        discount_type TEXT NOT NULL,
        discount_value REAL NULL,
        max_uses INTEGER DEFAULT 100,
        uses_count INTEGER DEFAULT 0,
        expires_at TEXT NULL,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    ");

    // Seed subjects, topics, and initial questions in server database for test convenience
    $this->seedInitialData();
  }

  private function seedInitialData() {
    // Seed Subjects
    $this->conn->exec("INSERT OR IGNORE INTO subjects (id, name, exam_type) VALUES (1, 'Mathematics', 'JAMB')");
    $this->conn->exec("INSERT OR IGNORE INTO subjects (id, name, exam_type) VALUES (2, 'English', 'JAMB')");
    $this->conn->exec("INSERT OR IGNORE INTO subjects (id, name, exam_type) VALUES (3, 'Physics', 'JAMB')");

    // Seed Topics
    $this->conn->exec("INSERT OR IGNORE INTO topics (id, subject_id, name) VALUES (1, 1, 'Algebra')");
    $this->conn->exec("INSERT OR IGNORE INTO topics (id, subject_id, name) VALUES (2, 1, 'Geometry')");
    $this->conn->exec("INSERT OR IGNORE INTO topics (id, subject_id, name) VALUES (3, 2, 'Comprehension')");
    $this->conn->exec("INSERT OR IGNORE INTO topics (id, subject_id, name) VALUES (4, 2, 'Synonyms')");
    $this->conn->exec("INSERT OR IGNORE INTO topics (id, subject_id, name) VALUES (5, 3, 'Mechanics')");

    // Seed Questions (10 questions per subject spread across at least 3 years: 2021, 2022, 2023)
    $questions = [
      // Mathematics (Subject 1)
      [1, 'JAMB', 1, 2021, 1, 'easy', 'Solve for x: 2x + 5 = 15', '5', '10', '15', '20', 'A', 'Linear equations', 'x = (15-5)/2 = 5', 'Other choices are incorrect.'],
      [2, 'JAMB', 1, 2021, 1, 'medium', 'Find the roots of x^2 - 5x + 6 = 0', 'x=2,3', 'x=1,5', 'x=0,6', 'x=-2,-3', 'A', 'Quadratic equations', '(x-2)(x-3)=0 => x=2,3', 'Other roots do not satisfy.'],
      [3, 'JAMB', 1, 2021, 2, 'easy', 'What is the sum of angles in a triangle?', '90', '180', '270', '360', 'B', 'Triangle properties', 'Triangle sum theorem.', 'Other sums are wrong.'],
      [4, 'JAMB', 1, 2022, 1, 'easy', 'If log10(x) = 3, what is x?', '10', '100', '1000', '10000', 'C', 'Logarithms', '10^3 = 1000', 'Other powers are wrong.'],
      [5, 'JAMB', 1, 2022, 2, 'medium', 'Calculate the area of a circle with radius 7 (pi = 22/7)', '154', '44', '49', '308', 'A', 'Circle measurement', 'Area = pi * r^2 = 22/7 * 49 = 154', 'Others are arithmetic errors.'],
      [6, 'JAMB', 1, 2022, 1, 'hard', 'Evaluate 5P3 (Permutations)', '60', '15', '120', '20', 'A', 'Permutations', '5P3 = 5*4*3 = 60', 'Other counts are incorrect.'],
      [7, 'JAMB', 1, 2023, 2, 'easy', 'Find the hypotenuse of a right triangle with sides 3 and 4', '5', '6', '7', '8', 'A', 'Pythagoras theorem', '3^2 + 4^2 = 25 => sqrt(25) = 5', 'Pythagorean triple.'],
      [8, 'JAMB', 1, 2023, 1, 'medium', 'Solve for y: 3y - 7 = 8', '5', '3', '15', '8', 'A', 'Linear equations', '3y = 15 => y = 5', 'Other selections are wrong.'],
      [9, 'JAMB', 1, 2023, 2, 'hard', 'Find the interior angle of a regular hexagon', '120', '108', '90', '135', 'A', 'Polygons', 'Formula: (n-2)*180/n => (4)*180/6 = 120', 'Standard geometry.'],
      [10, 'JAMB', 1, 2023, 1, 'easy', 'What is 25% of 200?', '50', '25', '100', '150', 'A', 'Percentages', '0.25 * 200 = 50', 'Other values are incorrect.'],

      // English (Subject 2)
      [11, 'JAMB', 2, 2021, 3, 'easy', 'According to the passage, the author believes education is ___', 'Essential', 'Useless', 'Optional', 'Expensive', 'A', 'Comprehension passage', 'Direct citation from first paragraph.', 'Other choices conflict with passage.'],
      [12, 'JAMB', 2, 2021, 4, 'easy', 'Synonym of \"Benevolent\" is:', 'Kind', 'Cruel', 'Selfish', 'Noisy', 'A', 'Vocabulary synonyms', 'Benevolent means well-meaning and kindly.', 'Other terms are opposites.'],
      [13, 'JAMB', 2, 2021, 3, 'medium', 'The word \"ubiquitous\" as used in paragraph 3 means ___', 'Present everywhere', 'Rare', 'Expensive', 'Dangerous', 'A', 'Comprehension vocabulary', 'Context clues point to widespread presence.', 'Other synonyms are inaccurate.'],
      [14, 'JAMB', 2, 2022, 4, 'easy', 'Synonym of \"Acquiesce\" is:', 'Agree', 'Refuse', 'Debate', 'Run', 'A', 'Synonyms', 'Acquiesce means to accept something reluctantly but without protest.', 'Refuse is the antonym.'],
      [15, 'JAMB', 2, 2022, 3, 'easy', 'Choose the correct spelling:', 'Embarrass', 'Embaras', 'Embarass', 'Emberass', 'A', 'Spelling checks', 'Embarrass contains double r and double s.', 'Others are spelling errors.'],
      [16, 'JAMB', 2, 2022, 4, 'medium', 'Synonym of \"Ephemeral\" is:', 'Short-lived', 'Eternal', 'Heavy', 'Transparent', 'A', 'Synonyms', 'Ephemeral means lasting for a very short time.', 'Eternal is the opposite.'],
      [17, 'JAMB', 2, 2023, 3, 'medium', 'Complete the sentence: If I ___ you, I would study harder.', 'were', 'was', 'am', 'be', 'A', 'Grammar conditionals', 'Subjunctive mood uses \"were\" for hypothetical.', 'Others are grammatically incorrect.'],
      [18, 'JAMB', 2, 2023, 4, 'easy', 'Synonym of \"Candid\" is:', 'Honest', 'Deceitful', 'Sweet', 'Vague', 'A', 'Synonyms', 'Candid means truthful and straightforward.', 'Deceitful is the opposite.'],
      [19, 'JAMB', 2, 2023, 3, 'easy', 'Choose the antonym of \"Zenith\"', 'Nadir', 'Apex', 'Peak', 'Summit', 'A', 'Antonyms', 'Zenith is the highest point, Nadir is the lowest point.', 'Apex/Peak/Summit are synonyms.'],
      [20, 'JAMB', 2, 2023, 4, 'medium', 'Synonym of \"Pragmatic\" is:', 'Practical', 'Idealistic', 'Erratic', 'Academic', 'A', 'Synonyms', 'Pragmatic means dealing with things sensibly and realistically.', 'Idealistic is an antonym.'],

      // Physics (Subject 3)
      [21, 'JAMB', 3, 2021, 5, 'easy', 'What is the SI unit of electric current?', 'Ampere', 'Volt', 'Ohm', 'Watt', 'A', 'Electric current', 'Ampere is standard unit.', 'Others are for voltage/resistance.'],
      [22, 'JAMB', 3, 2021, 5, 'medium', 'Calculate work done when a force of 10N moves a block 5m in force direction.', '50 J', '15 J', '2 J', '100 J', 'A', 'Work and energy', 'Work = Force * Distance = 10 * 5 = 50 Joules', 'Others are math errors.'],
      [23, 'JAMB', 3, 2021, 5, 'easy', 'The speed of light in vacuum is approximately ___', '3 x 10^8 m/s', '3 x 10^6 m/s', '1.5 x 10^8 m/s', '3 x 10^10 m/s', 'A', 'Electromagnetic wave', 'Universal physical constant.', 'Others are off by powers.'],
      [24, 'JAMB', 3, 2022, 5, 'easy', 'Which of the following is a vector quantity?', 'Force', 'Mass', 'Temperature', 'Time', 'A', 'Vectors and Scalars', 'Force has both magnitude and direction.', 'Mass, temperature, and time are scalars.'],
      [25, 'JAMB', 3, 2022, 5, 'medium', 'What is the frequency of a wave with speed 300 m/s and wavelength 6 m?', '50 Hz', '1800 Hz', '0.02 Hz', '306 Hz', 'A', 'Wave physics', 'Frequency = Speed / Wavelength = 300 / 6 = 50 Hz', 'Other selections are incorrect.'],
      [26, 'JAMB', 3, 2022, 5, 'hard', 'A body falls freely from rest. Calculate distance fallen in 3 seconds (g = 10 m/s^2)', '45 m', '30 m', '90 m', '15 m', 'A', 'Equations of motion', 'd = 0.5 * g * t^2 = 0.5 * 10 * 9 = 45m', 'Others are arithmetic mistakes.'],
      [27, 'JAMB', 3, 2023, 5, 'easy', 'State Hooke\'s law relationship', 'Force is proportional to extension', 'Force is proportional to velocity', 'Energy is conserved', 'Pressure is constant', 'A', 'Elasticity', 'Hookes law: F = ke', 'Other options describe other laws.'],
      [28, 'JAMB', 3, 2023, 5, 'medium', 'Calculate resistance if voltage is 12V and current is 3A', '4 Ohms', '36 Ohms', '15 Ohms', '9 Ohms', 'A', 'Ohms law', 'R = V/I = 12/3 = 4 Ohms', 'Arithmetic verification.'],
      [29, 'JAMB', 3, 2023, 5, 'hard', 'What is the escape velocity of a projectile from Earth surface?', '11.2 km/s', '11.2 m/s', '9.8 km/s', '42.1 km/s', 'A', 'Gravitational fields', 'Standard physical value for earth.', 'Other units or figures are incorrect.'],
      [30, 'JAMB', 3, 2023, 5, 'easy', 'Which instrument is used to measure temperature?', 'Thermometer', 'Barometer', 'Anemometer', 'Hygrometer', 'A', 'Heat and temperature', 'Thermometers measure heat degrees.', 'Barometers measure pressure.']
    ];

    foreach ($questions as $q) {
      $stmt = $this->conn->prepare("
        INSERT OR IGNORE INTO questions (
          id, exam_type, subject_id, year, topic_id, difficulty,
          question_text, option_a, option_b, option_c, option_d, correct_answer,
          topic_explanation, correct_explanation, wrong_explanations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ");
      $stmt->bindValue(1, $q[0], SQLITE3_INTEGER);
      $stmt->bindValue(2, $q[1], SQLITE3_TEXT);
      $stmt->bindValue(3, $q[2], SQLITE3_INTEGER);
      $stmt->bindValue(4, $q[3], SQLITE3_INTEGER);
      $stmt->bindValue(5, $q[4], SQLITE3_INTEGER);
      $stmt->bindValue(6, $q[5], SQLITE3_TEXT);
      $stmt->bindValue(7, $q[6], SQLITE3_TEXT);
      $stmt->bindValue(8, $q[7], SQLITE3_TEXT);
      $stmt->bindValue(9, $q[8], SQLITE3_TEXT);
      $stmt->bindValue(10, $q[9], SQLITE3_TEXT);
      $stmt->bindValue(11, $q[10], SQLITE3_TEXT);
      $stmt->bindValue(12, $q[11], SQLITE3_TEXT);
      $stmt->bindValue(13, $q[12], SQLITE3_TEXT);
      $stmt->bindValue(14, $q[13], SQLITE3_TEXT);
      $stmt->bindValue(15, $q[14], SQLITE3_TEXT);
      $stmt->execute();
    }
  }

  public function getDbType() {
    return $this->dbType;
  }

  // Abstracted direct query execution
  public function query($sql) {
    if ($this->dbType === 'MYSQL') {
      $res = $this->conn->query($sql);
      if ($this->conn->error) {
        $this->error = $this->conn->error;
        $this->errno = $this->conn->errno;
      }
      $this->insert_id = $this->conn->insert_id;
      return $res ? new HybridResult($res, 'MYSQL') : false;
    } else {
      try {
        $res = $this->conn->query($sql);
        $this->insert_id = $this->conn->lastInsertRowID();
        return $res ? new HybridResult($res, 'SQLITE') : false;
      } catch (Exception $e) {
        $this->error = $e->getMessage();
        $this->errno = $e->getCode();
        return false;
      }
    }
  }

  // Abstracted prepare statement
  public function prepare($sql) {
    // Translate some standard MySQL queries to SQLite syntax automatically if in SQLite mode
    if ($this->dbType === 'SQLITE') {
      $sql = str_ireplace('INT AUTO_INCREMENT', 'INTEGER PRIMARY KEY AUTOINCREMENT', $sql);
      $sql = str_ireplace('AUTO_INCREMENT', '', $sql); // SQLite uses autoincrement keywords differently
    }

    if ($this->dbType === 'MYSQL') {
      $stmt = $this->conn->prepare($sql);
      if (!$stmt) {
        $this->error = $this->conn->error;
        $this->errno = $this->conn->errno;
        return false;
      }
      return new HybridStatement($stmt, 'MYSQL', $this);
    } else {
      try {
        // SQLite prepares queries with :param or ?
        // Ensure positional parameters work seamlessly
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
          return false;
        }
        return new HybridStatement($stmt, 'SQLITE', $this);
      } catch (Exception $e) {
        $this->error = $e->getMessage();
        $this->errno = $e->getCode();
        return false;
      }
    }
  }

  public function escape($str) {
    if ($this->dbType === 'MYSQL') {
      return $this->conn->real_escape_string($str);
    } else {
      return SQLite3::escapeString($str);
    }
  }

  public function close() {
    $this->conn->close();
  }
}

class HybridResult {
  private $res;
  private $dbType;
  public $num_rows = 0;

  public function __construct($res, $dbType) {
    $this->res = $res;
    $this->dbType = $dbType;

    if ($dbType === 'MYSQL') {
      $this->num_rows = $res->num_rows;
    } else {
      // In SQLite3, raw query returns a result object, but we need to count row loops or check if empty
      // We will count them as we fetch, or estimate
      $this->num_rows = 1; // placeholder, or count on fetch
    }
  }

  public function fetch_assoc() {
    if ($this->dbType === 'MYSQL') {
      return $this->res->fetch_assoc();
    } else {
      return $this->res->fetchArray(SQLITE3_ASSOC);
    }
  }

  public function fetch_all($mode = MYSQLI_ASSOC) {
    if ($this->dbType === 'MYSQL') {
      return $this->res->fetch_all($mode);
    } else {
      $rows = [];
      while ($row = $this->res->fetchArray(SQLITE3_ASSOC)) {
        $rows[] = $row;
      }
      return $rows;
    }
  }
}

class HybridStatement {
  private $stmt;
  private $dbType;
  private $parent;

  public function __construct($stmt, $dbType, $parent) {
    $this->stmt = $stmt;
    $this->dbType = $dbType;
    $this->parent = $parent;
  }

  public function bind_param($types, &...$vars) {
    if ($this->dbType === 'MYSQL') {
      return $this->stmt->bind_param($types, ...$vars);
    } else {
      // SQLite position parameters start at 1
      for ($i = 0; $i < count($vars); $i++) {
        $type = SQLITE3_TEXT;
        if (isset($types[$i])) {
          if ($types[$i] === 'i') $type = SQLITE3_INTEGER;
          if ($types[$i] === 'd') $type = SQLITE3_FLOAT;
        }
        $this->stmt->bindValue($i + 1, $vars[$i], $type);
      }
      return true;
    }
  }

  public function execute() {
    if ($this->dbType === 'MYSQL') {
      $res = $this->stmt->execute();
      if ($this->stmt->error) {
        $this->parent->error = $this->stmt->error;
        $this->parent->errno = $this->stmt->errno;
      }
      $this->parent->insert_id = $this->stmt->insert_id;
      return $res;
    } else {
      try {
        $res = $this->stmt->execute();
        // For writes, update insert_id
        // SQLite: lastInsertRowID() must be grabbed on the connection
        return $res ? true : false;
      } catch (Exception $e) {
        $this->parent->error = $e->getMessage();
        $this->parent->errno = $e->getCode();
        return false;
      }
    }
  }

  public function get_result() {
    if ($this->dbType === 'MYSQL') {
      return new HybridResult($this->stmt->get_result(), 'MYSQL');
    } else {
      // In SQLite, executing a statement returns the result stream itself
      $sqliteResult = $this->stmt->execute();
      return new HybridResult($sqliteResult, 'SQLITE');
    }
  }

  public function close() {
    if ($this->dbType === 'MYSQL') {
      $this->stmt->close();
    } else {
      $this->stmt->close();
    }
  }
}

function getDbConnection() {
  global $db;
  if (!isset($db)) {
    $db = new HybridDatabase();
  }
  return $db;
}
