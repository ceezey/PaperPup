
export type Category = 'General' | 'Mathematics' | 'Science' | 'History' | 'Literature' | 'Coding' | 'Art' | 'Other';

export interface User {
  id: string;
  name: string;
  email: string;
  major: string;
  password?: string;
  avatar?: string;
}

export interface Comment {
  id: string;
  resourceId: string;
  userId: string;
  userName: string;
  text: string;
  date: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  category: Category;
  category_id: number;
  dateAdded: string;
  authorId: string;
  authorName: string;
  course_code?: string;
  isPublic: boolean;
  upvotes: string[]; // User IDs who upvoted
}

export type View = 'Dashboard' | 'MyResources' | 'Library' | 'Profile' | 'ContributorProfile';
