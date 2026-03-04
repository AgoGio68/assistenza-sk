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
    createdBy?: string;      // uid del creatore
    creatorName?: string;    // nome del creatore (per denormalizzazione/cache)
    assignedTo?: string | null; // uid del collega che l'ha preso in carico
    assigneeName?: string | null; // nome del collega (per denormalizzazione/cache)
    closedBy?: string | null;
    closedAt?: number | null;
    notes?: string;
    photoUrls?: string[];
    durationHours?: number;
    durationMinutes?: number;
}

export interface Company {
    id?: string;
    name: string;
    contactName: string;
    phone: string;
    lastUsedAt?: number;
}

export interface Installation {
    orderNumber: string;
    client: string;
    machine: string;
    modelSK: string;
    serialSK: string;
    deliveryDate: string;
    installationSite: string;
    installDate: string;
    comments: string;
    // v1.9.2 Dynamic Fields (Stored in Firestore)
    isInvoiced?: boolean;
    isDeleted?: boolean;
    toTest?: boolean; // Yellow state: "da collaudare"
    tested?: boolean; // Green state: "collaudata"
    scheduledTime?: string; // HH:mm
    scheduledDate?: string; // Overrides delivery
    applications?: { name: string; checked: boolean }[];
    localOverrides?: Partial<Installation>;
}
