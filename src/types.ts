export type UserRole = 'user' | 'admin' | 'superadmin';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    role: UserRole;
    status: UserStatus;
    createdAt: number;
    canCreateTickets?: boolean;
    fcmToken?: string;
}

export type UrgencyLevel = 'urgente' | 'non_urgente';
export type TicketStatus = 'aperto' | 'preso_in_carico' | 'chiuso';

export interface Ticket {
    id?: string;
    urgency: UrgencyLevel;
    companyName: string;
    contactName: string;
    phone: string;
    description: string;
    status: TicketStatus;
    createdAt: number;
    updatedAt?: number;
    assignedTo?: string | null; // uid del collega che l'ha preso in carico
    closedBy?: string | null;
    closedAt?: number | null;
    notes?: string;
    photoUrls?: string[];
}

export interface Company {
    id?: string;
    name: string;
    contactName: string;
    phone: string;
    lastUsedAt?: number;
}
