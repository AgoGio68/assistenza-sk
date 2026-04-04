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
    phone?: string;
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
    installationsSheetName?: string; // v3.3.0: Nome tab foglio (default: "ORDINI")
    section2InstallationsSheetName?: string; // v3.3.0: Nome tab foglio S2 (default: "ORDINI")
    serialPrefix?: string;
    installationModules?: string[];

    // WhatsApp Settings
    whatsappEnabled?: boolean; // v3.3.1: master flag — default false (richiede approvazione)
    waNotifyNewImport?: boolean;
    waNotifyCalendar?: boolean;

    // Magazzino (v3.5.0)
    inventoryEmail?: string;

    // Collaudo Checklist (v3.4.0)
    collaudoChecklists?: {
        rp: string[];
        sp: string[];
        c1?: { title: string; items: string[] };
        c2?: { title: string; items: string[] };
        c3?: { title: string; items: string[] };
        c4?: { title: string; items: string[] };
    };

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

    // v3.9.1: Customizable Navigation Colors
    navIconColors?: {
        dashboard?: string;
        calendar?: string;
        tickets?: string;
        installations?: string;
        profile?: string;
        create?: string;
        admin?: string;
        rapportini?: string;
        logout?: string;
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
    createdBy?: string; // uid del creatore
    creatorName?: string; // nome del creatore (per denormalizzazione/cache)
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
    _firestoreId?: string; // ID stabile calcolato al merge, usato per save/delete
}

// v3.4.0: Collaudo Checklist
export type ChecklistKey = 'rp' | 'sp' | 'c1' | 'c2' | 'c3' | 'c4';
export type MachineType = 'rp' | 'sp' | 'generic';

export interface CollaudoReport {
    id?: string;
    installationId: string; // _firestoreId dell'installazione
    machineName: string;
    machineType: MachineType;
    clientName: string;
    checklist: string[]; // snapshot delle voci al momento del collaudo
    completedItems: string[]; // voci spuntate
    completedAt: number | null; // timestamp
    technicianId: string;
    technicianName: string;
    createdAt: number;
    updatedAt: number;
}

// v3.6.0: Corrupted Emoji Fix (UTF-8)
export interface InventoryItem {
    id?: string;
    code: string; // Codice articolo (es. MOT-01)
    name: string; // Nome articolo
    unit?: string; // Unità di misura (es. pz, mt)
    stock: number; // Giacenza attuale
    minThreshold: number; // Soglia minima per alert
    cost?: number; // Costo acquisto (optional)
    price?: number; // Prezzo vendita (optional)
    category?: string; // Categoria (Meccanica, Elettronica, ecc)
    lastUpdated?: number;
    sortOrder?: number; // v3.7.0: Ordinamento per drag and drop
}

export interface InventoryMovement {
    id?: string;
    itemId: string; // ID dell'articolo
    itemName: string; // Nome articolo (denormalizzato per facilità lettura log)
    type: 'in' | 'out'; // Carico (IN) o Scarico (OUT)
    quantity: number; // Quantità movimentata
    timestamp: number;
    userId: string; // Chi ha fatto il movimento
    userName: string;
    referenceId?: string; // ID del Ticket o dell'Installazione associata
    referenceType?: 'ticket' | 'installation';
    notes?: string;
}

export type ActivityActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'LOGIN' | 'ASSIGN' | 'REJECT' | 'APPROVE';
export type ActivityResourceType = 'TICKET' | 'INSTALLATION' | 'USER' | 'COMPANY' | 'SETTINGS' | 'INVENTORY_ITEM' | 'SYSTEM';

export interface ActivityLog {
    id?: string;
    timestamp: number;
    userId: string;
    userEmail: string;
    userName: string;
    userRole: string;
    action: ActivityActionType;
    resourceType: ActivityResourceType;
    resourceId?: string;
    details: string;
    metadata?: any;
}

