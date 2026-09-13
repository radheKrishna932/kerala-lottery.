/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FAQItem, TestimonialItem, BlogPost, LotteryPackage } from "./types";

export const LOTTERY_PACKAGES: LotteryPackage[] = [
  {
    id: "pkg-1",
    name: "1 TICKET SPECIAL",
    price: 149,
    ticketCount: 1,
    bonus: "Regular Chance Entry",
    description: "Get a single premium paper-printed lottery ticket matching the upcoming mega draw.",
    color: "from-emerald-850 to-emerald-950"
  },
  {
    id: "pkg-2",
    name: "3 TICKETS COMBO",
    price: 298,
    ticketCount: 3,
    bonus: "BEST VALUE - Save money!",
    description: "Get pool of three randomly selected distinct series tickets. Consistently high winning statistics!",
    color: "from-emerald-700 to-emerald-900"
  },
  {
    id: "pkg-3",
    name: "5 TICKETS VALUE PACK",
    price: 500,
    ticketCount: 5,
    bonus: "MOST POPULAR - Increase Win Chance by 75%!",
    description: "Our highly recommended value bundle! Includes five separate series tickets for a highly boosted chance.",
    color: "from-yellow-650 to-amber-700"
  },
  {
    id: "pkg-4",
    name: "10 TICKETS JUMBO PACK",
    price: 1000,
    ticketCount: 10,
    bonus: "JUMBO COMBO - Maximum Chance!",
    description: "The ultimate package to maximize sweepstakes victory. Contains ten independent code tickets.",
    color: "from-amber-600 to-rose-750"
  }
];

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 1,
    name: "Vinu Gopalan",
    location: "Kochi, Kerala",
    text: "I was skeptical about booking Kerala lotteries online, but this portal changed my mind. I booked a 5-ticket pack, uploaded my UPI payment screenshot, and received my physical ticket photos in an hour. Last week, I won a 3rd prize of Rs 50,050 and the prize money was transferred to my GPay promptly! Highly trusted.",
    prizeWon: "Won Rs 50,050 (Summer Bumper)",
    rating: 5,
    avatarUrl: "https://picsum.photos/seed/vinu/200/200"
  },
  {
    id: 2,
    name: "Sujatha Pillai",
    location: "Trivandrum, Kerala",
    text: "Very professional and streamlined service. The admin portal updates my lucky numbers immediately. Checking results with my phone number is exceptionally convenient, especially during Pooja Bumper drawings. Recommended to all lottery lovers!",
    prizeWon: "Won Rs 10,000 (Win-Win W-690)",
    rating: 5,
    avatarUrl: "https://picsum.photos/seed/sujatha/200/200"
  },
  {
    id: 3,
    name: "Mohammed Rafi",
    location: "Kozhikode, Kerala",
    text: "Excellent support and crystal-clear ticket delivery. The UPI QR code payment process is highly interactive and secure. When I selected Pay, it routed me straight to my PhonePe app with pre-filled amount details. Awesome experience!",
    prizeWon: "Won Rs 5,000 (Akshaya Draw)",
    rating: 5,
    avatarUrl: "https://picsum.photos/seed/rafi/200/200"
  }
];

export const FAQS: FAQItem[] = [
  {
    question: "How does the online Kerala Lottery purchase work?",
    answer: "You select your desired ticket package on our platform, provide your primary details (Name, Whatsapp Phone, Email, State), and proceed to Checkout. Make payment using our secure UPI ID or QR code, upload the payment transaction screenshot proof, and submit. Our support team verifies the transaction, secures physical paper tickets from authorized government vendors in Kerala, uploads your ticket serial numbers, and links them directly to your phone number for results lookup."
  },
  {
    question: "Are these tickets official Kerala state government lottery tickets?",
    answer: "Yes! All tickets booked through us are official physical paper tickets issued and regulated by the Kerala State Lotteries Department under the Government of Kerala. We do not run custom lottery systems; we act as your authorized purchasing partner in Kerala, ensuring valid transactions and safe ticket custody."
  },
  {
    question: "How do I check my draw results and claim winnings?",
    answer: "Simply navigate to our 'Check Result' section on the website, enter your WhatsApp phone number used during billing, and tap 'Search'. All active and past ticket series assigned to you, along with drawing statuses and winning prizes, will be securely displayed. For large prize tiers, we assist you in submitting physical tickets directly to the Directorate of Kerala State Lotteries for national claims."
  },
  {
    question: "Is it legal to buy Kerala Lotteries online?",
    answer: "The government of Kerala issues physical lotteries which are legal for citizens to purchase. Our service provides proxy online bookings and storage convenience for out-of-state tourists, NRK (Non-Resident Keralites), and local patrons who prefer safe digital records of their physical paper sweepstakes without fear of losing physical coupons."
  },
  {
    question: "How are small and big prize amounts distributed?",
    answer: "Prizes below Rs 1,00,000 are settled instantly by our portal directly to your preferred payment handle (UPI/GPay/PhonePe). Winnings above Rs 1,00,000 require statutory validation where we physically dispatch your winning ticket via registered post, allowing you to submit claims directly to State Banks or District Offices in Kerala as mandated by law."
  }
];

export const BLOGS: BlogPost[] = [
  {
    id: 1,
    title: "Understanding Kerala Lottery Code Sheets and Prize Allocation Charts",
    summary: "A rookie's comprehensive guide to understanding series tags (such as W, SS, FF) and navigating Kerala state prize charts easily.",
    content: "The Kerala State Lotteries Department issues daily lottery schemes characterized by serial prefixes like WIN-WIN (W), Akshaya (AK), Sthree-Sakthi (SS), Fifty-Fifty (FF), and Karunya Plus (KN). Each lottery ticket printed carries a specific alphabet header representing drawing series. Learning how code letters correspond to draw dates, bumper seasons, and consolation brackets increases your safety when verifying results. It is also fascinating to know that Kerala was the first state in India to establish a lottery department in 1967, pioneered by Finance Minister P.K. Kunju, to prevent illegal gambling while contributing heavily to societal welfare funds.",
    image: "https://picsum.photos/seed/kera-blog-1/600/400",
    date: "May 10, 2026"
  },
  {
    id: 2,
    title: "The Social Welfare Side of Kerala State Lotteries: The Karunya Program",
    summary: "How every ticket you buy helps fund life-saving open heart surgeries, oncology care, and dialysis for low-income citizens.",
    content: "Unlike standard private betting applications, the Kerala state lotteries are legal because they operate on a social welfare framework. A tremendous amount of revenue collected from Bumper and Daily drawings is funneled directly into the State Health Department's 'Karunya Benevolent Fund'. This charitable fund provides massive financial assistance to poor patients suffering from critical illnesses, including cancer, advanced cardiovascular blockages, kidney terminal failures, and respiratory disorders. By participating in these games, you are directly aiding public healthcare initiatives.",
    image: "https://picsum.photos/seed/kera-blog-2/600/400",
    date: "April 24, 2026"
  },
  {
    id: 3,
    title: "Top 5 Tips for Safeguarding Your Physical Lottery Draw Claims",
    summary: "Safety rules on writing your details on the back page of physical tickets, avoiding fraudulent telephone calls, and tracking validation codes.",
    content: "Winning the lottery is life-changing, but claiming the prize requires strict procedural hygiene. Firstly, always write your name, signature, and phone number in blue ink on the backside of your physical paper ticket immediately upon receipt. Secondly, never sharing full serial photos on public forums as validation codes can be copied. Thirdly, monitor the official gazette released daily at 3:00 PM on official channels or query our streamlined search widget to confirm verified match databases. Always keep your digital billing receipts safely registered.",
    image: "https://picsum.photos/seed/kera-blog-3/600/400",
    date: "March 15, 2026"
  }
];

export const INDIAN_STATES = [
  "Kerala",
  "Tamil Nadu",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
  "Maharashtra",
  "Delhi",
  "West Bengal",
  "Gujarat",
  "Uttar Pradesh",
  "Madhya Pradesh",
  "Rajasthan",
  "Punjab",
  "Haryana",
  "Goa",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Himachal Pradesh",
  "Jharkhand",
  "Odisha",
  "Uttarakhand",
  "Other State / Union Territory"
];
