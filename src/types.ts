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
    sections?: ('sk' | 's2')[];
}

export type UrgencyLevel = 'urgente' | 'non_urgente';
export type TicketStatus = 'aperto' | 'preso_in_carico' | 'chiuso';

export interface GlobalSettings {
    settingsSheetUrl: string;
    appName?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    visibilityMode?: 'all' | 'assigned_only';
    layoutMode?: 'default' | 'compact';
    installationsLayoutMode?: 'default' | 'list' | 'list-2col' | 'grid-compact';
    applyCompactToAll?: boolean;
    telegramToken?: string;
    enablePhotos?: boolean;
    photoInstructions?: string;
    telegramChatIds?: string[]; // Assuming TelegramChatId is a string
    
    // Feature C: Second Section Settings
    section2Enabled?: boolean;
    section2Name?: string;
    section2Color?: string;
    section2SheetUrl?: string;

    // Feature C Addon: Section 2 Installations
    section2InstallationsEnabled?: boolean;
    section2InstallationsSheetUrl?: string;

    // Permissions
    allowUserTicketCreation?: boolean;
    adminCanAssignAtCreation?: boolean;
    userCanAssignAtCreation?: boolean;
    adminCanCloseOthers?: boolean;
    userCanCloseOwnTickets?: boolean;
    adminCanReassignOthers?: boolean;
    enableInstallations?: boolean;
    insertInstallationsAtTop?: boolean;
    installationsSheetUrl?: string;
    serialPrefix?: string;
    installationModules?: string[];

    // New: Granular Field Configuration for Installations
    section2InstallationsFields?: {
        showModelSK?: boolean;
        showSerialSK?: boolean;
        showOrderNumber?: boolean;
        showOrderDfv?: boolean;
        showPlanning?: boolean;
        showModules?: boolean;
        showExtractedNotes?: boolean;
        showTechnicalNotes?: boolean;
    };
}

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
    testDate?: string;
    notes?: string;
    photoUrls?: string[];
    durationHours?: number;
    durationMinutes?: number;
    highlighted?: boolean;
    isCollaudo?: boolean;
    scheduledDate?: string; // ISO string o YYYY-MM-DDTHH:mm
    section?: 'sk' | 's2'; // Which section this ticket belongs to
}

export interface Company {
    id?: string;
    name: string;
    contactName: string;
    phone: string;
    lastUsedAt?: number;
}

export interface Installation {
    rowId: string; // Unique row identifier from sheet or index
    orderNumber: string;
    client: string;
    machine: string;
    modelSK: string;
    serialSK: string;
    deliveryDate: string;
    installationSite: string;
    installDate: string;
    comments: string;
    extractedNotes?: string; // Nuova colonna dello script Google Apps per voci con Cod.
    // v1.9.2 Dynamic Fields (Stored in Firestore)
    isInvoiced?: boolean;
    isDeleted?: boolean;
    toTest?: boolean; // Yellow state: "da collaudare"
    tested?: boolean; // Green state: "collaudata"
    scheduledTime?: string; // HH:mm
    scheduledDate?: string; // Overrides delivery
    section?: 'sk' | 's2';
    isManual?: boolean;
    createdAt?: number;
    applications?: { name: string; checked: boolean; qty?: string }[];
    selectedFeatures?: string[];
    localOverrides?: Partial<Installation>;
    orderDfv?: string; // N. ordine DFV personalizzato
    originalRowIndex?: string; // Indice riga per aggiornamento Sheets
    testDate?: string; // Data di collaudo specifica
    _firestoreId?: string;    // ID stabile calcolato al merge, usato per save/delete
}
