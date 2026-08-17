-- phpMyAdmin SQL Dump
-- version 5.0.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Aug 12, 2026 at 04:56 PM
-- Server version: 10.4.14-MariaDB
-- PHP Version: 7.4.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fillop`
--

-- --------------------------------------------------------

--
-- Table structure for table `devices`
--

CREATE TABLE `devices` (
  `id` int(11) NOT NULL,
  `passcode_id` int(11) NOT NULL,
  `device_uuid` varchar(100) NOT NULL,
  `hardware_hash` varchar(255) NOT NULL,
  `activated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `devices`
--

INSERT INTO `devices` (`id`, `passcode_id`, `device_uuid`, `hardware_hash`, `activated_at`) VALUES
(1, 1, '7b4ea85c-0ece-4589-81b8-90a5d11b7dbf', 'f2a146433ac547ed5238c213792574fc27b356a1a3cc1445eafa576dfd18c752', '2026-08-12 14:34:33');

-- --------------------------------------------------------

--
-- Table structure for table `organizations`
--

CREATE TABLE `organizations` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `type` varchar(50) DEFAULT 'school',
  `contact_person` varchar(100) DEFAULT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `pricing_settings`
--

CREATE TABLE IF NOT EXISTS `pricing_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(50) NOT NULL UNIQUE,
  `setting_value` decimal(10,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `pricing_settings` (`setting_key`, `setting_value`, `description`) VALUES
('single_passcode_price_6m', 1400.00, 'Single passcode price for 6 months subscription'),
('small_bulk_price_6m', 1100.00, 'Unit passcode price for small bulk purchases (2-9 passcodes) for 6 months'),
('large_bulk_price_6m', 1000.00, 'Unit passcode price for large bulk purchases (10+ passcodes) for 6 months')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

--
-- Dumping data for table `organizations`
--

INSERT INTO `organizations` (`id`, `name`, `type`, `contact_email`, `contact_phone`, `created_at`) VALUES
(1, 'FILLOP TECH', 'school', 'support@filloptech.com', '08115501712', '2026-08-12 14:32:53');

-- --------------------------------------------------------

--
-- Table structure for table `passcodes`
--

CREATE TABLE `passcodes` (
  `id` int(11) NOT NULL,
  `passcode` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `organization_id` int(11) DEFAULT NULL,
  `exam_category` varchar(50) DEFAULT 'ALL',
  `allowed_subjects` text DEFAULT NULL,
  `max_devices` int(11) DEFAULT 1,
  `activated_devices` int(11) DEFAULT 0,
  `status` varchar(20) DEFAULT 'active',
  `duration_days` int(11) DEFAULT 180,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `passcodes`
--

INSERT INTO `passcodes` (`id`, `passcode`, `email`, `organization_id`, `max_devices`, `activated_devices`, `status`, `duration_days`, `created_at`, `expires_at`) VALUES
(1, '1234', 'testuser@gmail.com', 1, 1, 1, 'active', 180, '2026-08-12 14:34:18', '2027-02-08 14:34:33');

-- --------------------------------------------------------

-- --------------------------------------------------------

--
-- Table structure for table `passcode_upgrades`
--

CREATE TABLE IF NOT EXISTS `passcode_upgrades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `passcode_id` int(11) NOT NULL,
  `passcode` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `old_categories` varchar(255) DEFAULT NULL,
  `new_categories` varchar(255) DEFAULT NULL,
  `old_subjects` text DEFAULT NULL,
  `new_subjects` text DEFAULT NULL,
  `added_categories` varchar(255) DEFAULT NULL,
  `added_subjects` text DEFAULT NULL,
  `amount_paid` decimal(10,2) DEFAULT 0.00,
  `payment_reference` varchar(100) DEFAULT NULL,
  `payment_status` varchar(50) DEFAULT 'free',
  `status` varchar(50) DEFAULT 'completed',
  `admin_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `passcode_id` (`passcode_id`),
  KEY `passcode` (`passcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `promo_codes`
--

CREATE TABLE `promo_codes` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `discount_type` varchar(20) NOT NULL,
  `discount_value` decimal(10,2) DEFAULT NULL,
  `max_uses` int(11) DEFAULT 100,
  `uses_count` int(11) DEFAULT 0,
  `expires_at` timestamp NULL DEFAULT NULL,
  `active` tinyint(4) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `questions`
--

CREATE TABLE `questions` (
  `id` int(11) NOT NULL,
  `exam_type` varchar(10) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `topic_id` int(11) NOT NULL,
  `difficulty` varchar(10) DEFAULT 'medium',
  `question_text` text NOT NULL,
  `option_a` text NOT NULL,
  `option_b` text NOT NULL,
  `option_c` text NOT NULL,
  `option_d` text NOT NULL,
  `correct_answer` char(1) NOT NULL,
  `topic_explanation` text DEFAULT NULL,
  `correct_explanation` text DEFAULT NULL,
  `wrong_explanations` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `questions`
--

INSERT INTO `questions` (`id`, `exam_type`, `subject_id`, `year`, `topic_id`, `difficulty`, `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_answer`, `topic_explanation`, `correct_explanation`, `wrong_explanations`, `created_at`) VALUES
(1, 'JAMB', 1, 2021, 1, 'easy', 'Solve for x: 2x + 5 = 15', '5', '10', '15', '20', 'A', 'Linear equations', 'x = (15-5)/2 = 5', 'Other choices are incorrect.', '2026-08-12 13:56:03'),
(2, 'JAMB', 1, 2021, 1, 'medium', 'Find the roots of x^2 - 5x + 6 = 0', 'x=2,3', 'x=1,5', 'x=0,6', 'x=-2,-3', 'A', 'Quadratic equations', '(x-2)(x-3)=0 => x=2,3', 'Other roots do not satisfy.', '2026-08-12 13:56:03'),
(3, 'JAMB', 1, 2021, 2, 'easy', 'What is the sum of angles in a triangle?', '90', '180', '270', '360', 'B', 'Triangle properties', 'Triangle sum theorem.', 'Other sums are wrong.', '2026-08-12 13:56:03'),
(4, 'JAMB', 1, 2022, 1, 'easy', 'If log10(x) = 3, what is x?', '10', '100', '1000', '10000', 'C', 'Logarithms', '10^3 = 1000', 'Other powers are wrong.', '2026-08-12 13:56:03'),
(5, 'JAMB', 1, 2022, 2, 'medium', 'Calculate the area of a circle with radius 7 (pi = 22/7)', '154', '44', '49', '308', 'A', 'Circle measurement', 'Area = pi * r^2 = 22/7 * 49 = 154', 'Others are arithmetic errors.', '2026-08-12 13:56:03'),
(6, 'JAMB', 1, 2022, 1, 'hard', 'Evaluate 5P3 (Permutations)', '60', '15', '120', '20', 'A', 'Permutations', '5P3 = 5*4*3 = 60', 'Other counts are incorrect.', '2026-08-12 13:56:03'),
(7, 'JAMB', 1, 2023, 2, 'easy', 'Find the hypotenuse of a right triangle with sides 3 and 4', '5', '6', '7', '8', 'A', 'Pythagoras theorem', '3^2 + 4^2 = 25 => sqrt(25) = 5', 'Pythagorean triple.', '2026-08-12 13:56:03'),
(8, 'JAMB', 1, 2023, 1, 'medium', 'Solve for y: 3y - 7 = 8', '5', '3', '15', '8', 'A', 'Linear equations', '3y = 15 => y = 5', 'Other selections are wrong.', '2026-08-12 13:56:03'),
(9, 'JAMB', 1, 2023, 2, 'hard', 'Find the interior angle of a regular hexagon', '120', '108', '90', '135', 'A', 'Polygons', 'Formula: (n-2)*180/n => (4)*180/6 = 120', 'Standard geometry.', '2026-08-12 13:56:03'),
(10, 'JAMB', 1, 2023, 1, 'easy', 'What is 25% of 200?', '50', '25', '100', '150', 'A', 'Percentages', '0.25 * 200 = 50', 'Other values are incorrect.', '2026-08-12 13:56:03'),
(11, 'JAMB', 2, 2021, 3, 'easy', 'According to the passage, the author believes education is ___', 'Essential', 'Useless', 'Optional', 'Expensive', 'A', 'Comprehension passage', 'Direct citation from first paragraph.', 'Other choices conflict with passage.', '2026-08-12 13:56:03'),
(12, 'JAMB', 2, 2021, 4, 'easy', 'Synonym of \"Benevolent\" is:', 'Kind', 'Cruel', 'Selfish', 'Noisy', 'A', 'Vocabulary synonyms', 'Benevolent means well-meaning and kindly.', 'Other terms are opposites.', '2026-08-12 13:56:03'),
(13, 'JAMB', 2, 2021, 3, 'medium', 'The word \"ubiquitous\" as used in paragraph 3 means ___', 'Present everywhere', 'Rare', 'Expensive', 'Dangerous', 'A', 'Comprehension vocabulary', 'Context clues point to widespread presence.', 'Other synonyms are inaccurate.', '2026-08-12 13:56:03'),
(14, 'JAMB', 2, 2022, 4, 'easy', 'Synonym of \"Acquiesce\" is:', 'Agree', 'Refuse', 'Debate', 'Run', 'A', 'Synonyms', 'Acquiesce means to accept something reluctantly but without protest.', 'Refuse is the antonym.', '2026-08-12 13:56:03'),
(15, 'JAMB', 2, 2022, 3, 'easy', 'Choose the correct spelling:', 'Embarrass', 'Embaras', 'Embarass', 'Emberass', 'A', 'Spelling checks', 'Embarrass contains double r and double s.', 'Others are spelling errors.', '2026-08-12 13:56:03'),
(16, 'JAMB', 2, 2022, 4, 'medium', 'Synonym of \"Ephemeral\" is:', 'Short-lived', 'Eternal', 'Heavy', 'Transparent', 'A', 'Synonyms', 'Ephemeral means lasting for a very short time.', 'Eternal is the opposite.', '2026-08-12 13:56:03'),
(17, 'JAMB', 2, 2023, 3, 'medium', 'Complete the sentence: If I ___ you, I would study harder.', 'were', 'was', 'am', 'be', 'A', 'Grammar conditionals', 'Subjunctive mood uses \"were\" for hypothetical.', 'Others are grammatically incorrect.', '2026-08-12 13:56:03'),
(18, 'JAMB', 2, 2023, 4, 'easy', 'Synonym of \"Candid\" is:', 'Honest', 'Deceitful', 'Sweet', 'Vague', 'A', 'Synonyms', 'Candid means truthful and straightforward.', 'Deceitful is the opposite.', '2026-08-12 13:56:03'),
(19, 'JAMB', 2, 2023, 3, 'easy', 'Choose the antonym of \"Zenith\"', 'Nadir', 'Apex', 'Peak', 'Summit', 'A', 'Antonyms', 'Zenith is the highest point, Nadir is the lowest point.', 'Apex/Peak/Summit are synonyms.', '2026-08-12 13:56:03'),
(20, 'JAMB', 2, 2023, 4, 'medium', 'Synonym of \"Pragmatic\" is:', 'Practical', 'Idealistic', 'Erratic', 'Academic', 'A', 'Synonyms', 'Pragmatic means dealing with things sensibly and realistically.', 'Idealistic is an antonym.', '2026-08-12 13:56:03'),
(21, 'JAMB', 3, 2021, 5, 'easy', 'What is the SI unit of electric current?', 'Ampere', 'Volt', 'Ohm', 'Watt', 'A', 'Electric current', 'Ampere is standard unit.', 'Others are for voltage/resistance.', '2026-08-12 13:56:03'),
(22, 'JAMB', 3, 2021, 5, 'medium', 'Calculate work done when a force of 10N moves a block 5m in force direction.', '50 J', '15 J', '2 J', '100 J', 'A', 'Work and energy', 'Work = Force * Distance = 10 * 5 = 50 Joules', 'Others are math errors.', '2026-08-12 13:56:03'),
(23, 'JAMB', 3, 2021, 5, 'easy', 'The speed of light in vacuum is approximately ___', '3 x 10^8 m/s', '3 x 10^6 m/s', '1.5 x 10^8 m/s', '3 x 10^10 m/s', 'A', 'Electromagnetic wave', 'Universal physical constant.', 'Others are off by powers.', '2026-08-12 13:56:03'),
(24, 'JAMB', 3, 2022, 5, 'easy', 'Which of the following is a vector quantity?', 'Force', 'Mass', 'Temperature', 'Time', 'A', 'Vectors and Scalars', 'Force has both magnitude and direction.', 'Mass, temperature, and time are scalars.', '2026-08-12 13:56:03'),
(25, 'JAMB', 3, 2022, 5, 'medium', 'What is the frequency of a wave with speed 300 m/s and wavelength 6 m?', '50 Hz', '1800 Hz', '0.02 Hz', '306 Hz', 'A', 'Wave physics', 'Frequency = Speed / Wavelength = 300 / 6 = 50 Hz', 'Other selections are incorrect.', '2026-08-12 13:56:03'),
(26, 'JAMB', 3, 2022, 5, 'hard', 'A body falls freely from rest. Calculate distance fallen in 3 seconds (g = 10 m/s^2)', '45 m', '30 m', '90 m', '15 m', 'A', 'Equations of motion', 'd = 0.5 * g * t^2 = 0.5 * 10 * 9 = 45m', 'Others are arithmetic mistakes.', '2026-08-12 13:56:03'),
(27, 'JAMB', 3, 2023, 5, 'easy', 'State Hooke\'s law relationship', 'Force is proportional to extension', 'Force is proportional to velocity', 'Energy is conserved', 'Pressure is constant', 'A', 'Elasticity', 'Hookes law: F = ke', 'Other options describe other laws.', '2026-08-12 13:56:03'),
(28, 'JAMB', 3, 2023, 5, 'medium', 'Calculate resistance if voltage is 12V and current is 3A', '4 Ohms', '36 Ohms', '15 Ohms', '9 Ohms', 'A', 'Ohms law', 'R = V/I = 12/3 = 4 Ohms', 'Arithmetic verification.', '2026-08-12 13:56:03'),
(29, 'JAMB', 3, 2023, 5, 'hard', 'What is the escape velocity of a projectile from Earth surface?', '11.2 km/s', '11.2 m/s', '9.8 km/s', '42.1 km/s', 'A', 'Gravitational fields', 'Standard physical value for earth.', 'Other units or figures are incorrect.', '2026-08-12 13:56:03'),
(30, 'JAMB', 3, 2023, 5, 'easy', 'Which instrument is used to measure temperature?', 'Thermometer', 'Barometer', 'Anemometer', 'Hygrometer', 'A', 'Heat and temperature', 'Thermometers measure heat degrees.', 'Barometers measure pressure.', '2026-08-12 13:56:03');

-- --------------------------------------------------------

--
-- Table structure for table `results`
--

CREATE TABLE `results` (
  `id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `exam_type` varchar(10) NOT NULL,
  `score` int(11) NOT NULL,
  `total_questions` int(11) NOT NULL,
  `percentage` double NOT NULL,
  `details` text DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `exam_type` varchar(10) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `name`, `exam_type`, `created_at`) VALUES
(1, 'Mathematics', 'JAMB', '2026-08-12 13:55:14'),
(2, 'English', 'JAMB', '2026-08-12 13:55:14'),
(3, 'Physics', 'JAMB', '2026-08-12 13:55:14');

-- --------------------------------------------------------

--
-- Table structure for table `topics`
--

CREATE TABLE `topics` (
  `id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `topics`
--

INSERT INTO `topics` (`id`, `subject_id`, `name`, `created_at`) VALUES
(1, 1, 'Algebra', '2026-08-12 13:55:44'),
(2, 1, 'Geometry', '2026-08-12 13:55:44'),
(3, 2, 'Comprehension', '2026-08-12 13:55:44'),
(4, 2, 'Synonyms', '2026-08-12 13:55:44'),
(5, 3, 'Mechanics', '2026-08-12 13:55:44');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `school` varchar(150) DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `phone`, `state`, `school`, `created_at`) VALUES
(1, 'Michael Nwankwo', 'testuser@example.com', '08115501712', 'Rivers State', 'Bright Stars', '2026-08-12 14:07:11');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `devices`
--
ALTER TABLE `devices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `passcode_id` (`passcode_id`,`device_uuid`);

--
-- Indexes for table `organizations`
--
ALTER TABLE `organizations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `passcodes`
--
ALTER TABLE `passcodes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `passcode` (`passcode`),
  ADD KEY `organization_id` (`organization_id`);

--
-- Indexes for table `promo_codes`
--
ALTER TABLE `promo_codes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `questions`
--
ALTER TABLE `questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subject_id` (`subject_id`),
  ADD KEY `topic_id` (`topic_id`),
  ADD KEY `idx_questions_filter` (`exam_type`,`subject_id`,`year`),
  ADD KEY `idx_questions_topic` (`exam_type`,`subject_id`,`topic_id`);

--
-- Indexes for table `results`
--
ALTER TABLE `results`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `topics`
--
ALTER TABLE `topics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subject_id` (`subject_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `devices`
--
ALTER TABLE `devices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `organizations`
--
ALTER TABLE `organizations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `passcodes`
--
ALTER TABLE `passcodes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `promo_codes`
--
ALTER TABLE `promo_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `questions`
--
ALTER TABLE `questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `results`
--
ALTER TABLE `results`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `devices`
--
ALTER TABLE `devices`
  ADD CONSTRAINT `devices_ibfk_1` FOREIGN KEY (`passcode_id`) REFERENCES `passcodes` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `passcodes`
--
ALTER TABLE `passcodes`
  ADD CONSTRAINT `passcodes_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `questions`
--
ALTER TABLE `questions`
  ADD CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `questions_ibfk_2` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `topics`
--
ALTER TABLE `topics`
  ADD CONSTRAINT `topics_ibfk_1` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
