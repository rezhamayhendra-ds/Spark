export type UserRole = 'Internal Customer' | 'External Customer' | 'Admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  department?: string;
  division?: string;
  birthDate?: string;
  nik?: string;
  waNumber?: string;
  isProfileComplete?: boolean;
  fcmTokens?: string[];
  lastViewedUsersAt?: any;
  lastViewedRequestsAt?: any;
  status?: 'online' | 'offline';
  lastActive?: any;
}

export type RequestStatus = 'Submitted' | 'Review' | 'Solution Proposed' | 'Approved' | 'Rejected' | 'Postponed' | 'In Progress' | 'UAT' | 'Completed';
export type RequestPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Activity {
  id: string;
  title: string;
  timeline: string;
  estimatedDate?: string;
  totalDays?: number;
  actualDate?: string;
  completionStatus?: 'On Time' | 'Delay';
  output: string;
  progress: number;
  evidence?: string;
  remark?: string;
  status: 'Pending' | 'In Progress' | 'Done';
}

export interface Request {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;
  priority?: RequestPriority;
  status: RequestStatus;
  createdAt: any;
  updatedAt?: any;
  attachmentUrl?: string;
  userName?: string;
  department?: string;
  nik?: string;
  waNumber?: string;
  division?: string;
  problemStatement?: string;
  expectedOutcome?: string;
  businessImpact?: string;
  urgency?: string;
  picId?: string;
  picName?: string;
  reviewRemark?: string;
  activities?: Activity[];
  uatStatus?: 'Accepted' | 'Rejected';
  uatRemark?: string;
  brdGeneratedAt?: any;
  bastGeneratedAt?: any;
}

export interface Solution {
  id: string;
  requestId: string;
  adminId: string;
  proposal: string;
  createdAt: any;
}

export interface Feedback {
  id: string;
  requestId: string;
  rating: number;
  comment?: string;
  createdAt: any;
}
