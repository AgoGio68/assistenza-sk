import { Ticket, UserProfile } from '../types';

/**
 * Returns the display name of the ticket creator.
 * Prioritizes denormalized creatorName, then searches in users list.
 */
export const getCreatorName = (ticket: Ticket, users: UserProfile[]): string => {
    if (ticket.creatorName) return ticket.creatorName;
    if (!ticket.createdBy) return 'Utente';
    const user = users.find(u => u.uid === ticket.createdBy);
    return user?.displayName || user?.email || 'Utente';
};

/**
 * Returns the display name of the ticket assignee.
 * Prioritizes denormalized assigneeName, then searches in users list.
 */
export const getAssigneeName = (ticket: Ticket, users: UserProfile[]): string => {
    if (ticket.assigneeName) return ticket.assigneeName;
    if (!ticket.assignedTo) return 'Non assegnato';
    const user = users.find(u => u.uid === ticket.assignedTo);
    return user?.displayName || user?.email || 'Collega';
};

/**
 * Returns the display name of the user who closed the ticket.
 */
export const getClosedByName = (ticket: Ticket, users: UserProfile[]): string => {
    if (!ticket.closedBy) return 'N/A';
    const user = users.find(u => u.uid === ticket.closedBy);
    return user?.displayName || user?.email || 'Collega';
};
