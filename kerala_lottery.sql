-- SQL Database Migration Script for Kerala State Mega Jackpot Portal
-- Database: u194092554_koll
-- Generated for MySQL/MariaDB

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Table structure for table `settings`
--

CREATE TABLE IF NOT EXISTS `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key_name` varchar(50) NOT NULL,
  `key_value` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_name` (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `settings` (Initial Configuration Setup)
--

INSERT INTO `settings` (`key_name`, `key_value`) VALUES
('upi_id', 'keralalotteries@ybl'),
('qr_code_image', ''),
('admin_passcode', 'admin123')
ON DUPLICATE KEY UPDATE `key_value` = VALUES(`key_value`);

--
-- Table structure for table `tickets`
--

CREATE TABLE IF NOT EXISTS `tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `state` varchar(100) NOT NULL,
  `package_name` varchar(150) NOT NULL,
  `ticket_count` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `screenshot_path` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `ticket_number` varchar(255) DEFAULT '',
  `winning_prize` varchar(255) DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

COMMIT;
