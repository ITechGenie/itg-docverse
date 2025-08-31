export interface Challenge {
  id: number;
  title: string;
  description: string;
  tag: string;
  timeLimit?: string;
  isActive?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  participants?: number;
  reward?: string;
}

export const challengesData: Challenge[] = [

  {
    id: 16,
    title: "Real-time Features",
    description: "Implement real-time features with WebSockets",
    tag: "#websockets",
    timeLimit: "12 days",
    isActive: true,
    difficulty: "hard",
    participants: 11,
    reward: "90 points",
  },
  {
    id: 19,
    title: "Code Review Master",
    description: "Conduct thorough code reviews and provide constructive feedback",
    tag: "#code-review",
    timeLimit: "5 days",
    isActive: true,
    difficulty: "easy",
    participants: 29,
    reward: "30 points",
  },
  {

    id: 1,
    title: "Bug Hunting Challenge",
    description: "Find and fix critical bugs in the codebase",
    tag: "#debugging",
    timeLimit: "7 days",
    isActive: true,
    difficulty: "medium",
    participants: 24,
    reward: "50 points",
  },
  {
    id: 4,
    title: "React Performance Optimization",
    description: "Optimize React components for better performance",
    tag: "#react",
    timeLimit: "10 days",
    isActive: true,
    difficulty: "hard",
    participants: 18,
    reward: "75 points",
  },
  {
    id: 5,
    title: "Database Design Challenge",
    description: "Design an efficient database schema for a social platform",
    tag: "#database",
    timeLimit: "12 days",
    isActive: true,
    difficulty: "medium",
    participants: 31,
    reward: "60 points",
  },
  {
    id: 6,
    title: "CSS Grid Layout Master",
    description: "Create responsive layouts using CSS Grid",
    tag: "#css",
    timeLimit: "5 days",
    isActive: true,
    difficulty: "easy",
    participants: 45,
    reward: "30 points",
  },
  {
    id: 7,
    title: "TypeScript Type Safety",
    description: "Implement strict TypeScript types for a complex application",
    tag: "#typescript",
    timeLimit: "8 days",
    isActive: true,
    difficulty: "medium",
    participants: 22,
    reward: "55 points",
  },
  {
    id: 8,
    title: "Microservices Architecture",
    description: "Design and implement a microservices architecture",
    tag: "#architecture",
    timeLimit: "21 days",
    isActive: true,
    difficulty: "hard",
    participants: 9,
    reward: "150 points",
  },
  {
    id: 10,
    title: "Security Audit Challenge",
    description: "Identify and fix security vulnerabilities in web applications",
    tag: "#security",
    timeLimit: "15 days",
    isActive: true,
    difficulty: "hard",
    participants: 15,
    reward: "120 points",
  },
  {
    id: 13,
    title: "GraphQL Implementation",
    description: "Build a GraphQL API with Apollo Server",
    tag: "#graphql",
    timeLimit: "11 days",
    isActive: true,
    difficulty: "hard",
    participants: 13,
    reward: "85 points",
  },

  {
    id: 17,
    title: "Mobile-First Design",
    description: "Create responsive designs optimized for mobile devices",
    tag: "#responsive",
    timeLimit: "6 days",
    isActive: true,
    difficulty: "easy",
    participants: 42,
    reward: "40 points",
  },
  {
    id: 18,
    title: "Performance Monitoring",
    description: "Implement application performance monitoring",
    tag: "#monitoring",
    timeLimit: "9 days",
    isActive: true,
    difficulty: "medium",
    participants: 14,
    reward: "55 points",
  },

  {
    id: 20,
    title: "Serverless Architecture",
    description: "Build applications using serverless functions",
    tag: "#serverless",
    timeLimit: "14 days",
    isActive: true,
    difficulty: "hard",
    participants: 8,
    reward: "110 points",
  },
];

// Helper functions
export const getActiveChallenges = () =>
  challengesData.filter(challenge => challenge.isActive);

export const getChallengesByDifficulty = (difficulty: Challenge['difficulty']) =>
  challengesData.filter(challenge => challenge.difficulty === difficulty);

export const getChallengeById = (id: number) =>
  challengesData.find(challenge => challenge.id === id); 