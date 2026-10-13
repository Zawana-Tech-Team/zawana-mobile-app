/** The canonical application user returned by the existing ZAWANA API. */
export type UserRole =
  | "member"
  | "coach"
  | "admin"
  | "gym_fo"
  | "clinic_fo"
  | "badminton_fo"
  | "store_fo"
  | "cafe_fo"
  | "doctor"
  | "owner";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  membership: string | null;
  avatar: string | null;
};

export type AuthSession = {
  user: AppUser;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  sessionExpiresAt: string;
  security: { mfaEnrolled: boolean; mfaRequired: boolean };
};

export type ProfileInput = { name: string; phone: string };
export type ProfileUpdate = { name?: string; phone?: string | null };
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "PENDING_COACH_CONFIRMATION"
  | "AWAITING_PAYMENT"
  | "COACH_DECLINED"
  | "EXPIRED";

export type DashboardCourt = {
  id: string;
  name: string;
  type: string;
  surface: string;
  price: number;
  status: "available" | "maintenance" | "inactive";
  features: JsonValue;
  createdAt: string;
};

export type DashboardCoach = {
  id: string;
  name: string;
  specialty: string;
  department: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
  color: string;
  imageUrl: string | null;
  userId: string | null;
};

export type DashboardBooking = {
  id: string;
  code: string;
  userId: string;
  kind: "court" | "class" | "pt" | "recovery" | "private_course";
  title: string;
  date: string;
  time: string;
  location: string;
  status: BookingStatus;
  price: number;
  courtId: string | null;
  court: DashboardCourt | null;
  coachId: string | null;
  coach: DashboardCoach | null;
  meta: string | null;
  paymentStatus: "pending" | "paid" | "refunded";
  reservationExpiresAt: string | null;
  coachAcceptedAt: string | null;
  paymentExpiresAt: string | null;
  createdAt: string;
};

export type DashboardPackage = {
  id: string;
  title: string;
  price: number;
  sessions: number;
  validity: number;
  description: string;
  status: string;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    active: boolean;
    createdBy: string | null;
    createdAt: string;
  } | null;
  availableDays: JsonValue;
  availableFrom: string | null;
  availableUntil: string | null;
  scheduleNotes: string | null;
  courtRules: string | null;
  imageUrl: string | null;
};

export type DashboardNotification = {
  id: string;
  userId: string | null;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  audience: string | null;
  type: string | null;
  icon: string | null;
  imageUrl: string | null;
  actionLabel: string | null;
  entityType: string | null;
  entityId: string | null;
  activeInInbox: boolean;
  createdAt: string;
};

/** Enrollment/check-in rows are returned directly by the existing raw SQL queries. */
export type DashboardEnrollment = {
  id: string;
  studentId: string;
  userId: string | null;
  studentName: string;
  phone: string;
  packageId: string;
  packageName: string;
  sessionsTotal: number;
  sessionsRemaining: number;
  startDate: string;
  expiryDate: string;
  status: string;
  renewalCount: number;
  lastCheckIn: string | null;
  purchaseId: string | null;
  createdAt: string;
};

export type DashboardCheckIn = {
  id: string;
  enrollmentId: string;
  date: string;
  time: string;
  sessionsUsed: number;
  staffId: string | null;
  note: string | null;
  createdAt: string;
};

export type DashboardPurchase = {
  id: string;
  code: string;
  userId: string;
  packageId: string;
  packageName: string;
  price: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
};

/** GET /api/member/dashboard, as implemented in zawana-web-app/backend/src/server.ts. */
export type MemberDashboard = {
  bookings: DashboardBooking[];
  recentBookings: DashboardBooking[];
  todayBookings: DashboardBooking[];
  todayBookingCount: number;
  upcomingBookings: DashboardBooking[];
  upcomingBookingCount: number;
  packages: DashboardPackage[];
  notifications: DashboardNotification[];
  enrollment: DashboardEnrollment | null;
  enrollmentHistory: DashboardEnrollment[];
  checkIns: DashboardCheckIn[];
  purchases: DashboardPurchase[];
};

export type Onboarding = {
  status: "onboarding";
  registrationToken: string;
  next: string;
  profile: { name: string; email: string; phone: string };
};
export type PhoneProofChallenge = {
  challengeToken: string;
  expiresAt: string;
  next: string;
  phone: string;
};
export type LoginResult = AuthSession | Onboarding;
