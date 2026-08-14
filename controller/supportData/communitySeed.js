/**
 * Bundled fallback content for the community endpoints.
 * Used when the Supabase tables are missing/empty so the frontend never
 * sees a blank state.
 */

const NOW = Date.now();
const minutesAgo = (m) => new Date(NOW - m * 60_000).toISOString();
const hoursAgo = (h) => new Date(NOW - h * 3_600_000).toISOString();
const daysAgo = (d) => new Date(NOW - d * 86_400_000).toISOString();

const POSTS = [
  {
    id: 'seed-1',
    user_id: 1001,
    user_name: 'Jamie Chen',
    user_avatar_url: null,
    content:
      "Just tried the new air-fried tofu recipe from the app — crispy outside, custardy inside. 10/10. Anyone else trying out the recommendation engine for high-protein dinners?",
    image_url: null,
    like_count: 24,
    comment_count: 3,
    created_at: hoursAgo(2),
  },
  {
    id: 'seed-2',
    user_id: 1002,
    user_name: 'Priya Raman',
    user_avatar_url: null,
    content:
      'Hit my weekly water intake target every day this week thanks to the reminder bot 💧. Tiny win but I\'ll take it.',
    image_url: null,
    like_count: 41,
    comment_count: 2,
    created_at: hoursAgo(8),
  },
  {
    id: 'seed-3',
    user_id: 1003,
    user_name: 'Marcus Williams',
    user_avatar_url: null,
    content:
      'Meal planner generated my whole week in under a minute. Saved me at least an hour on Sunday prep. Pro tip: lock your favourites first then regenerate the rest.',
    image_url: null,
    like_count: 67,
    comment_count: 5,
    created_at: daysAgo(1),
  },
  {
    id: 'seed-4',
    user_id: 1004,
    user_name: 'Sofia Alvarez',
    user_avatar_url: null,
    content:
      'Question for the community — anyone using the barcode scanner for kids\' snacks? Curious how accurate it is for store-brand items.',
    image_url: null,
    like_count: 12,
    comment_count: 8,
    created_at: daysAgo(2),
  },
  {
    id: 'seed-5',
    user_id: 1005,
    user_name: 'Devon Park',
    user_avatar_url: null,
    content:
      'BMI calculator gave me a number, the article it linked to gave me context. Appreciate the app not just dumping a metric on you.',
    image_url: null,
    like_count: 33,
    comment_count: 1,
    created_at: daysAgo(3),
  },
];

const COMMENTS = {
  'seed-1': [
    {
      id: 'seed-c-1',
      post_id: 'seed-1',
      user_id: 1010,
      user_name: 'Aiko Tanaka',
      content: 'Adding this to my list for tonight. Did you marinate it first?',
      created_at: hoursAgo(1),
    },
    {
      id: 'seed-c-2',
      post_id: 'seed-1',
      user_id: 1011,
      user_name: 'Liam OConnor',
      content: 'Cornstarch coating is the move 👌',
      created_at: minutesAgo(45),
    },
    {
      id: 'seed-c-3',
      post_id: 'seed-1',
      user_id: 1012,
      user_name: 'Nour Haddad',
      content: 'Anyone tried it with tempeh instead?',
      created_at: minutesAgo(20),
    },
  ],
  'seed-2': [
    {
      id: 'seed-c-4',
      post_id: 'seed-2',
      user_id: 1013,
      user_name: 'Rohan Kapoor',
      content: 'Same! The hourly nudge made the difference.',
      created_at: hoursAgo(6),
    },
    {
      id: 'seed-c-5',
      post_id: 'seed-2',
      user_id: 1014,
      user_name: 'Maya Brooks',
      content: 'Way to go!',
      created_at: hoursAgo(7),
    },
  ],
  'seed-3': [
    {
      id: 'seed-c-6',
      post_id: 'seed-3',
      user_id: 1015,
      user_name: 'Jung-min Lee',
      content: "I've been doing the same — locking the salmon bowl every week 😄",
      created_at: hoursAgo(20),
    },
  ],
};

const LEADERBOARD = {
  weekly: [
    { rank: 1, user_id: 1003, user_name: 'Marcus Williams', user_avatar_url: null, points: 420 },
    { rank: 2, user_id: 1002, user_name: 'Priya Raman', user_avatar_url: null, points: 385 },
    { rank: 3, user_id: 1001, user_name: 'Jamie Chen', user_avatar_url: null, points: 340 },
    { rank: 4, user_id: 1015, user_name: 'Jung-min Lee', user_avatar_url: null, points: 310 },
    { rank: 5, user_id: 1010, user_name: 'Aiko Tanaka', user_avatar_url: null, points: 285 },
    { rank: 6, user_id: 1004, user_name: 'Sofia Alvarez', user_avatar_url: null, points: 260 },
    { rank: 7, user_id: 1013, user_name: 'Rohan Kapoor', user_avatar_url: null, points: 240 },
    { rank: 8, user_id: 1005, user_name: 'Devon Park', user_avatar_url: null, points: 220 },
    { rank: 9, user_id: 1014, user_name: 'Maya Brooks', user_avatar_url: null, points: 195 },
    { rank: 10, user_id: 1011, user_name: 'Liam OConnor', user_avatar_url: null, points: 180 },
  ],
  monthly: [
    { rank: 1, user_id: 1003, user_name: 'Marcus Williams', user_avatar_url: null, points: 1820 },
    { rank: 2, user_id: 1001, user_name: 'Jamie Chen', user_avatar_url: null, points: 1640 },
    { rank: 3, user_id: 1002, user_name: 'Priya Raman', user_avatar_url: null, points: 1495 },
    { rank: 4, user_id: 1015, user_name: 'Jung-min Lee', user_avatar_url: null, points: 1310 },
    { rank: 5, user_id: 1004, user_name: 'Sofia Alvarez', user_avatar_url: null, points: 1180 },
    { rank: 6, user_id: 1013, user_name: 'Rohan Kapoor', user_avatar_url: null, points: 1050 },
    { rank: 7, user_id: 1010, user_name: 'Aiko Tanaka', user_avatar_url: null, points: 985 },
    { rank: 8, user_id: 1005, user_name: 'Devon Park', user_avatar_url: null, points: 920 },
    { rank: 9, user_id: 1014, user_name: 'Maya Brooks', user_avatar_url: null, points: 875 },
    { rank: 10, user_id: 1011, user_name: 'Liam OConnor', user_avatar_url: null, points: 800 },
  ],
  all_time: [
    { rank: 1, user_id: 1003, user_name: 'Marcus Williams', user_avatar_url: null, points: 12450 },
    { rank: 2, user_id: 1001, user_name: 'Jamie Chen', user_avatar_url: null, points: 11200 },
    { rank: 3, user_id: 1002, user_name: 'Priya Raman', user_avatar_url: null, points: 9870 },
    { rank: 4, user_id: 1004, user_name: 'Sofia Alvarez', user_avatar_url: null, points: 8650 },
    { rank: 5, user_id: 1015, user_name: 'Jung-min Lee', user_avatar_url: null, points: 7990 },
    { rank: 6, user_id: 1010, user_name: 'Aiko Tanaka', user_avatar_url: null, points: 7340 },
    { rank: 7, user_id: 1013, user_name: 'Rohan Kapoor', user_avatar_url: null, points: 6810 },
    { rank: 8, user_id: 1005, user_name: 'Devon Park', user_avatar_url: null, points: 6420 },
    { rank: 9, user_id: 1011, user_name: 'Liam OConnor', user_avatar_url: null, points: 5980 },
    { rank: 10, user_id: 1014, user_name: 'Maya Brooks', user_avatar_url: null, points: 5450 },
  ],
};

module.exports = {
  POSTS,
  COMMENTS,
  LEADERBOARD,
};
