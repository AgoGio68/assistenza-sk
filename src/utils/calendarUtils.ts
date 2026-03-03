export interface CalendarEvent {
    summary: string;
    description: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
}

/**
 * Crea un evento nel Google Calendar dell'utente.
 * @param token Access Token OAuth2 di Google
 * @param event Oggetto evento conforme alla Google Calendar API
 * @param calendarId ID del calendario (default 'primary')
 */
export const createGoogleCalendarEvent = async (
    token: string,
    event: CalendarEvent,
    calendarId: string = 'primary'
) => {
    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('Google Calendar API Error:', error);
            throw new Error(error.error?.message || 'Errore durante la creazione dell\'evento');
        }

        return await response.json();
    } catch (error) {
        console.error('Network or API error:', error);
        throw error;
    }
};

/**
 * Formatta un ticket in un evento di calendario.
 * @param companyName Nome azienda
 * @param description Descrizione ticket
 * @param scheduledDate Data e ora dell'intervento (Date object)
 * @param ticketUrl URL opzionale al ticket nel sistema
 */
export const formatTicketToEvent = (
    companyName: string,
    description: string,
    scheduledDate: Date,
    ticketUrl?: string
): CalendarEvent => {
    // Di default creiamo un evento di 1 ora
    const endDate = new Date(scheduledDate.getTime() + 60 * 60 * 1000);

    return {
        summary: `Intervento: ${companyName}`,
        description: `${description}${ticketUrl ? `\n\nLink Assistenza: ${ticketUrl}` : ''}\n\nCreato automaticamente da Assistenza SK`,
        start: {
            dateTime: scheduledDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
            dateTime: endDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
    };
};
