/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TicketPurchase {
  id: number;
  name: string;
  phone: string;
  email: string;
  state: string;
  packageName: string;
  ticketCount: number;
  amount: number;
  screenshotPath: string;
  status: 'pending' | 'verified' | 'rejected';
  ticketNumber: string; // filled by admin comma-separated
  winningPrize: string; // filled by admin e.g. "Pending" / "1st Prize - Rs 25 Lakhs" / "None"
  createdAt: string;
}

export interface AdminSettings {
  upiId: string;
  qrCodeImage: string; // Can be base64 string or file path
  adminPasscode: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface TestimonialItem {
  id: number;
  name: string;
  location: string;
  text: string;
  prizeWon: string;
  rating: number;
  avatarUrl: string;
}

export interface BlogPost {
  id: number;
  title: string;
  summary: string;
  content: string;
  image: string;
  date: string;
}

export interface LotteryPackage {
  id: string;
  name: string;
  price: number;
  ticketCount: number;
  bonus: string;
  description: string;
  color: string;
}
