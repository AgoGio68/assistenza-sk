import React, { useState, useEffect, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Truck,
    CheckCircle2,
    CalendarDays,
    CalendarRange,
    Ticket as TicketIcon,
    X,
    Clock,
    MapPin,
    Info,
    User,
    MessageSquare,
    Save,
} from 'lucide-react';
import { collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { Ticket, Installation } from '../types';
import { parseSheetDate, formatToISODate } from '../utils/dateUtils';
import { syncInstallationDate } from '../utils/sheetSyncUtils';

import { CollaudoChecklistModal } from '../components/CollaudoChecklistModal';
import { CalendarInsertModal } from '../components/CalendarInsertModal';
import { CalendarManualEvent } from '../types';

type ViewType = 'month' | 'week';

interface CalendarEvent {
    id: string;
    title: string;
    subtitle: string;
    date: Date;
    type: 'ticket' | 'installation' | 'collaudo';
    status: string;
    details: string;
    color: string;
    originalData: any;
    sheetId?: 'ordini' | 'ordini_s2';
}

export const CalendarPage: React.FC = () => {
    const navigate = useNavigate();
    const [view, setView] = useState<ViewType>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filters, setFilters] = useState({
        tickets: true,
        installations: true,
        collaudi: true,
    });

    const [allEvents, setAllEvents] = useState<{ 
        tickets: CalendarEvent[]; 
        manual: CalendarEvent[];
        overrides: Record<string, Partial<Installation>>;
        sheetMetadata: Record<string, any>;
    }>({
        tickets: [],
        manual: [],
        overrides: {},
        sheetMetadata: {},
    });

    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [collaudoModal, setCollaudoModal] = useState<CalendarEvent | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [editDate, setEditDate] = useState('');

    const [showInsertModal, setShowInsertModal] = useState(false);
    const [insertModalData, setInsertModalData] = useState({ date: '', time: '09:00' });
    const [manualEventToEdit, setManualEventToEdit] = useState<CalendarManualEvent | null>(null);

    // Fetch data from Firestore (Tickets, Spreadsheet, Overrides)
    useEffect(() => {
        const unsubscribeList: (() => void)[] = [];

        // 1. Fetch Tickets
        const qTickets = query(collection(db, 'tickets'));
        const unsubTickets = onSnapshot(qTickets, (snapshot) => {
            const ticketEvents: CalendarEvent[] = snapshot.docs
                .map((doc) => {
                    const data = doc.data() as Ticket;
                    const dateStr = data.scheduledDate || data.testDate;
                    if (!dateStr) return null;

                    const parsedDate = parseSheetDate(dateStr, doc.id);
                    if (!parsedDate) return null;

                    return {
                        id: doc.id,
                        title: data.companyName,
                        subtitle: data.description?.substring(0, 40) || '',
                        date: parsedDate,
                        type: data.isCollaudo ? 'collaudo' : 'ticket',
                        status: data.status,
                        details: data.contactName,
                        color: data.isCollaudo ? '#a855f7' : '#6366f1',
                        originalData: data,
                    } as CalendarEvent;
                })
                .filter((e) => e !== null) as CalendarEvent[];

            setAllEvents((prev) => ({ ...prev, tickets: ticketEvents }));
        });
        unsubscribeList.push(unsubTickets);

        // 2. Fetch Overrides (installation_data)
        const unsubOverrides = onSnapshot(collection(db, 'installation_data'), (snap) => {
            const dataMap: Record<string, Partial<Installation>> = {};
            snap.forEach((d) => {
                dataMap[d.id] = d.data() as Partial<Installation>;
            });
            setAllEvents(prev => ({ ...prev, overrides: dataMap }));
        });
        unsubscribeList.push(unsubOverrides);

        // 3. Fetch Metadata from Spreadsheets (metadata only, no dates)
        const fetchSheetMetadata = (sheetId: 'ordini' | 'ordini_s2') => {
            return onSnapshot(collection(db, sheetId), (snapshot) => {
                const metadataMap: Record<string, any> = {};
                snapshot.forEach(doc => {
                    const data = doc.data();
                    metadataMap[doc.id] = {
                        client: (data['B'] || '').trim(),
                        machine: (data['C'] || '').trim(),
                        location: (data['D'] || '').trim(),
                        order: data['A'],
                        section: sheetId === 'ordini_s2' ? 's2' : 'sk',
                        sheetId: sheetId
                    };
                });
                setAllEvents(prev => ({ 
                    ...prev, 
                    sheetMetadata: { ...prev.sheetMetadata, ...metadataMap } 
                }));
            });
        };

        unsubscribeList.push(fetchSheetMetadata('ordini'));
        unsubscribeList.push(fetchSheetMetadata('ordini_s2'));

        // 4. Fetch Manual Events
        const unsubManual = onSnapshot(collection(db, 'eventi_calendario'), (snapshot) => {
            const manualEvents: CalendarEvent[] = snapshot.docs.map(doc => {
                const data = doc.data() as CalendarManualEvent;
                // VALIDAZIONE: Se mancano campi vitali, non renderizzare (evita Ghost Events)
                if (!data.cliente || !data.dataInizio) return null;

                return {
                    id: doc.id,
                    title: data.cliente,
                    subtitle: data.tipo,
                    date: new Date(data.dataInizio),
                    type: (data.tipo === 'Installazione' || data.tipo === 'Riparazione' || data.tipo === 'Sopralluogo') ? 'installation' : 'collaudo',
                    status: 'manual',
                    details: data.note || 'Inserimento manuale',
                    color: data.colore,
                    originalData: { ...data, _firestoreId: doc.id }
                } as CalendarEvent;
            }).filter(e => e !== null) as CalendarEvent[];
            setAllEvents(prev => ({ ...prev, manual: manualEvents }));
        });
        unsubscribeList.push(unsubManual);

        return () => unsubscribeList.forEach((u) => u());
    }, []);

    const mergedEvents = useMemo(() => {
        const generatedEvents: CalendarEvent[] = [];

        // 1. GENERATE EVENTS FROM installation_data (The ONLY authority for dates)
        Object.entries(allEvents.overrides).forEach(([id, override]) => {
            const metadata = allEvents.sheetMetadata[id];
            
            // Client Name Strategy: override > sheet > fallback
            const clientName = override.client || metadata?.client || "";
            if (!clientName) return;

            // Machine & Info Strategy
            const machineName = override.machine || metadata?.machine || 'Macchina';
            const location = override.installationSite || metadata?.location || "";

            // A. Installation Event
            if (override.scheduledDate) {
                const iDate = parseSheetDate(override.scheduledDate, id);
                if (iDate) {
                    generatedEvents.push({
                        id: `${id}-inst`,
                        title: clientName,
                        subtitle: machineName,
                        date: iDate,
                        type: 'installation',
                        status: override.tested ? 'completed' : 'pending',
                        details: location,
                        color: override.tested ? '#22c55e' : '#3b82f6',
                        originalData: { ...metadata, ...override, stableId: id },
                        sheetId: metadata?.sheetId
                    } as CalendarEvent);
                }
            }

            // B. Collaudo Event
            if (override.testDate) {
                const tDate = parseSheetDate(override.testDate, id);
                if (tDate) {
                    generatedEvents.push({
                        id: `${id}-collaudo`,
                        title: `[COLLAUDO] ${clientName}`,
                        subtitle: `${machineName} ${override.modelSK ? '- ' + override.modelSK : ''}`,
                        date: tDate,
                        type: 'collaudo',
                        status: override.tested ? 'completed' : 'pending',
                        details: `Luogo: ${location} | Note: ${override.comments || 'Nessuna'}`,
                        color: override.tested ? '#10b981' : '#facc15', // GREEN if tested, YELLOW if scheduled
                        originalData: { ...metadata, ...override, isCollaudo: true, stableId: id },
                        sheetId: metadata?.sheetId
                    } as CalendarEvent);
                }
            }
        });

        const finalEvents = [...allEvents.tickets, ...generatedEvents, ...allEvents.manual];
        
        return finalEvents.filter((e) => {
            // VALIDAZIONE RIGOROSA: Titolo e Data sono obbligatori
            if (!e.title || !e.date || isNaN(e.date.getTime())) return false;

            // Nasconde installazioni senza data valida (nuovo Date(0))
            if (e.type === 'installation' && e.date.getTime() === 0) return false;
            
            if (e.type === 'ticket' && !filters.tickets) return false;
            if (e.type === 'installation' && !filters.installations) return false;
            if (e.type === 'collaudo' && !filters.collaudi) return false;
            return true;
        });
    }, [allEvents, filters]);

    const handleSaveDate = async () => {
        if (!selectedEvent || !editDate) return;
        setIsSaving(true);
        try {
            await syncInstallationDate(selectedEvent.id, editDate, selectedEvent.sheetId || 'ordini');
            setSelectedEvent(null);
            alert('Data aggiornata con successo su calendario e spreadsheet!');
        } catch (e: any) {
            console.error('Save date error:', e);
            alert('Errore durante il salvataggio della data.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleForceDeleteManual = async () => {
        if (!selectedEvent || selectedEvent.status !== 'manual') return;
        if (!window.confirm('Sei sicuro di voler eliminare DEFINITIVAMENTE questo evento manuale?')) return;
        
        setIsSaving(true);
        try {
            const docId = selectedEvent.originalData?._firestoreId || selectedEvent.id;
            await deleteDoc(doc(db, 'eventi_calendario', docId));
            setSelectedEvent(null);
            alert('Evento eliminato con successo.');
        } catch (e: any) {
            console.error('Force delete error:', e);
            alert('Errore durante l\'eliminazione dell\'evento.');
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (selectedEvent && selectedEvent.type === 'installation') {
            setEditDate(formatToISODate(selectedEvent.date));
        }
    }, [selectedEvent]);

    const filteredEvents = mergedEvents;

    // Calendar logic helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), currentMonth: false });
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), currentMonth: true });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ date: new Date(year, month + 1, i), currentMonth: false });
        }
        return days;
    };

    const monthDays = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') newDate.setMonth(currentDate.getMonth() - 1);
        else newDate.setMonth(currentDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const formatMonth = (date: Date) => {
        return date.toLocaleString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase();
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const getEventsForDay = (date: Date) => {
        return filteredEvents
            .filter((e) => {
                return (
                    e.date.getDate() === date.getDate() &&
                    e.date.getMonth() === date.getMonth() &&
                    e.date.getFullYear() === date.getFullYear()
                );
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    return (
        <div className="calendar-container">
            <div className="calendar-toolbar glass-panel">
                <div className="toolbar-left">
                    <button className="btn-icon" onClick={() => navigateMonth('prev')}>
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="current-month-label">{formatMonth(currentDate)}</h2>
                    <button className="btn-icon" onClick={() => navigateMonth('next')}>
                        <ChevronRight size={20} />
                    </button>
                    <button className="btn-today" onClick={() => setCurrentDate(new Date())}>
                        Oggi
                    </button>
                </div>

                <div className="toolbar-center">
                    <div className="view-toggle">
                        <button
                            className={`toggle-btn ${view === 'month' ? 'active' : ''}`}
                            onClick={() => setView('month')}
                        >
                            <CalendarDays size={16} /> Mese
                        </button>
                        <button
                            className={`toggle-btn ${view === 'week' ? 'active' : ''}`}
                            onClick={() => setView('week')}
                        >
                            <CalendarRange size={16} /> Settimana
                        </button>
                    </div>
                </div>

                <div className="toolbar-right">
                    <div className="filters-group">
                        <label className={`filter-chip ${filters.tickets ? 'active' : ''} ticket`}>
                            <input
                                type="checkbox"
                                checked={filters.tickets}
                                onChange={() => setFilters((f) => ({ ...f, tickets: !f.tickets }))}
                            />
                            <TicketIcon size={14} /> Ticket
                        </label>
                        <label className={`filter-chip ${filters.installations ? 'active' : ''} inst`}>
                            <input
                                type="checkbox"
                                checked={filters.installations}
                                onChange={() => setFilters((f) => ({ ...f, installations: !f.installations }))}
                            />
                            <Truck size={14} /> Installazioni
                        </label>
                        <label className={`filter-chip ${filters.collaudi ? 'active' : ''} collaudo`}>
                            <input
                                type="checkbox"
                                checked={filters.collaudi}
                                onChange={() => setFilters((f) => ({ ...f, collaudi: !f.collaudi }))}
                            />
                            <CheckCircle2 size={14} /> Collaudi
                        </label>
                    </div>
                </div>
            </div>

            <div className={`calendar-grid-wrapper ${view}`}>
                {view === 'month' ? (
                    <div className="month-grid">
                        {['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'].map((d) => (
                            <div key={d} className="weekday-header">
                                {d}
                            </div>
                        ))}
                        {monthDays.map((day, idx) => {
                            const dayEvents = getEventsForDay(day.date);
                            return (
                                <div
                                    key={idx}
                                    className={`calendar-day ${!day.currentMonth ? 'other-month' : ''} ${isToday(day.date) ? 'today' : ''}`}
                                    onClick={() => {
                                        if (day.currentMonth) {
                                            setInsertModalData({ 
                                                date: day.date.toISOString().split('T')[0], 
                                                time: '09:00' 
                                            });
                                            setShowInsertModal(true);
                                        }
                                    }}
                                >
                                    <div className="day-number">{day.date.getDate()}</div>
                                    <div className="day-events">
                                        {dayEvents.slice(0, 5).map((event) => (
                                            <div
                                                key={event.id}
                                                className={`event-pill ${event.type}`}
                                                style={{
                                                    backgroundColor: event.color + '44',
                                                    borderLeftColor: event.color,
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation(); 
                                                    if (event.type === 'collaudo' && event.status !== 'manual') {
                                                        setCollaudoModal(event);
                                                    } else if (event.status === 'manual') {
                                                        setManualEventToEdit(event.originalData);
                                                        setShowInsertModal(true);
                                                    } else {
                                                        setSelectedEvent(event);
                                                    }
                                                }}
                                            >
                                                <span className="event-time" style={{ color: event.color }}>
                                                    {event.date.toLocaleTimeString('it-IT', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                                <span className="event-title">{event.title}</span>
                                            </div>
                                        ))}
                                        {dayEvents.length > 5 && (
                                            <div className="more-events">+{dayEvents.length - 5} altri...</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="week-view-container glass-panel">
                        <div className="week-header">
                            <div className="time-col-header"></div>
                            {['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'].map((d, i) => {
                                const day = new Date(currentDate);
                                const currentDay = day.getDay() === 0 ? 6 : day.getDay() - 1;
                                day.setDate(day.getDate() - currentDay + i);
                                return (
                                    <div key={d} className={`week-day-header ${isToday(day) ? 'today' : ''}`}>
                                        <div className="day-name">{d}</div>
                                        <div className="day-num">{day.getDate()}</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="week-body" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                            <div className="time-column">
                                {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => (
                                    <div key={h} className="time-slot">
                                        {h}:00
                                    </div>
                                ))}
                            </div>
                            <div className="week-grid-days">
                                {Array.from({ length: 7 }).map((_, i) => {
                                    const day = new Date(currentDate);
                                    const currentDay = day.getDay() === 0 ? 6 : day.getDay() - 1;
                                    day.setDate(day.getDate() - currentDay + i);
                                    const dayEvents = getEventsForDay(day);
                                    return (
                                        <div 
                                            key={i} 
                                            className={`week-day-col ${isToday(day) ? 'today' : ''}`}
                                            onClick={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const y = e.clientY - rect.top;
                                                const hour = Math.floor(y / 60) + 8;
                                                const time = `${hour.toString().padStart(2, '0')}:00`;
                                                setInsertModalData({ 
                                                    date: day.toISOString().split('T')[0], 
                                                    time: time 
                                                });
                                                setShowInsertModal(true);
                                            }}
                                        >
                                            {dayEvents.map((event) => {
                                                const hour = event.date.getHours();
                                                const minutes = event.date.getMinutes();
                                                if (hour < 8 || hour > 20) return null;
                                                const top = (hour - 8) * 60 + minutes;
                                                return (
                                                    <div
                                                        key={event.id}
                                                        className={`week-event-card ${event.type}`}
                                                        style={{ top: `${top}px`, backgroundColor: event.color + 'dd' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation(); 
                                                            if (event.type === 'collaudo' && event.status !== 'manual') {
                                                                setCollaudoModal(event);
                                                            } else if (event.status === 'manual') {
                                                                setManualEventToEdit(event.originalData);
                                                                setShowInsertModal(true);
                                                            } else {
                                                                setSelectedEvent(event);
                                                            }
                                                        }}
                                                    >
                                                        <div className="event-time-sm">
                                                            {event.date.toLocaleTimeString('it-IT', {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </div>
                                                        <div className="event-title-sm">{event.title}</div>
                                                        <div
                                                            className="event-subtitle-sm"
                                                            style={{ fontSize: '0.6rem', opacity: 0.8 }}
                                                        >
                                                            {event.subtitle}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {Array.from({ length: 13 }).map((_, h) => (
                                                <div key={h} className="hour-guide-line"></div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Collaudo Checklist Modal */}
            {collaudoModal && (
                <CollaudoChecklistModal
                    installationId={collaudoModal.originalData?._firestoreId || collaudoModal.id}
                    machineName={collaudoModal.originalData?.machine || collaudoModal.subtitle || ''}
                    clientName={collaudoModal.title}
                    scheduledDate={collaudoModal.date.toISOString()}
                    onClose={() => setCollaudoModal(null)}
                />
            )}

            {/* Manual Insert Modal */}
            {showInsertModal && (
                <CalendarInsertModal
                    initialDate={insertModalData.date}
                    initialTime={insertModalData.time}
                    existingEvent={manualEventToEdit || undefined}
                    onClose={() => {
                        setShowInsertModal(false);
                        setManualEventToEdit(null);
                    }}
                />
            )}

            {/* Event Detail Modal (non-collaudo) */}
            {selectedEvent && (
                <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
                    <div className="event-modal glass-panel anim-fade-in" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedEvent(null)}>
                            <X size={20} />
                        </button>

                        <div className="modal-header">
                            <div
                                className={`modal-badge ${selectedEvent.type}`}
                                style={{ backgroundColor: selectedEvent.color }}
                            >
                                {selectedEvent.type === 'ticket' ? (
                                    <TicketIcon size={14} />
                                ) : (selectedEvent.type === 'installation' || selectedEvent.subtitle === 'Riparazione' || selectedEvent.subtitle === 'Sopralluogo') ? (
                                    <Truck size={14} />
                                ) : (
                                    <CheckCircle2 size={14} />
                                )}
                                {selectedEvent.status === 'manual' ? selectedEvent.subtitle.toUpperCase() : selectedEvent.type.toUpperCase()}
                            </div>
                            <h2 className="modal-title">{selectedEvent.title}</h2>
                            <p className="modal-subtitle">{selectedEvent.subtitle}</p>
                        </div>

                        <div className="modal-body">
                            <div className="detail-row">
                                <Clock size={16} className="detail-icon" />
                                <div>
                                    <div className="detail-label">Data e Ora</div>
                                    <div className="detail-value">
                                        {selectedEvent.type === 'installation' && selectedEvent.status !== 'manual' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                <input 
                                                    type="date"
                                                    value={editDate}
                                                    onChange={(e) => setEditDate(e.target.value)}
                                                    className="form-control"
                                                    style={{ 
                                                        background: 'rgba(255,255,255,0.05)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        color: 'white',
                                                        padding: '0.5rem',
                                                        borderRadius: '8px',
                                                        fontSize: '1rem'
                                                    }}
                                                />
                                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                                    La modifica aggiornerà automaticamente lo spreadsheet e il database.
                                                </span>
                                            </div>
                                        ) : (
                                            <>
                                                {selectedEvent.date.toLocaleDateString('it-IT', {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'long',
                                                })}
                                                {' alle '}
                                                {selectedEvent.date.toLocaleTimeString('it-IT', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="detail-row">
                                <MapPin size={16} className="detail-icon" />
                                <div>
                                    <div className="detail-label">Luogo / Dettagli</div>
                                    <div className="detail-value">
                                        {selectedEvent.details || 'Nessun dettaglio specificato'}
                                    </div>
                                </div>
                            </div>

                            {selectedEvent.originalData?.serviceNotes && (
                                <div className="detail-row">
                                    <MessageSquare size={16} className="detail-icon" />
                                    <div>
                                        <div className="detail-label">Note Servizio</div>
                                        <div className="detail-value">{selectedEvent.originalData.serviceNotes}</div>
                                    </div>
                                </div>
                            )}

                            {selectedEvent.originalData?.contactName && (
                                <div className="detail-row">
                                    <User size={16} className="detail-icon" />
                                    <div>
                                        <div className="detail-label">Contatto</div>
                                        <div className="detail-value">
                                            {selectedEvent.originalData.contactName}{' '}
                                            {selectedEvent.originalData.contactPhone
                                                ? `- ${selectedEvent.originalData.contactPhone}`
                                                : ''}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setSelectedEvent(null)} disabled={isSaving}>
                                Chiudi
                            </button>
                            
                            {selectedEvent.type === 'installation' && selectedEvent.status !== 'manual' && (
                                <button 
                                    className="btn-primary" 
                                    onClick={handleSaveDate}
                                    disabled={isSaving || !editDate}
                                    style={{ backgroundColor: 'var(--accent-teal, #14b8a6)' }}
                                >
                                    {isSaving ? <Clock className="spin" size={16} /> : <Save size={16} />}
                                    Salva Data
                                </button>
                            )}

                            {selectedEvent.status === 'manual' && (
                                <button 
                                    className="btn-secondary" 
                                    onClick={handleForceDeleteManual}
                                    disabled={isSaving}
                                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                >
                                    {isSaving ? <Clock className="spin" size={16} /> : <X size={16} />}
                                    Elimina Evento
                                </button>
                            )}

                             <button
                                className="btn-primary"
                                disabled={isSaving}
                                onClick={() => {
                                    if (selectedEvent.status === 'manual') {
                                        setSelectedEvent(null);
                                        return;
                                    }
                                    if (selectedEvent.type === 'installation' || selectedEvent.type === 'collaudo') {
                                        const cleanId = selectedEvent.id.replace('-inst', '').replace('-coll', '');
                                        navigate(`/installations?id=${cleanId}`);
                                    } else {
                                        navigate(`/tickets`); // fallback per ticket
                                    }
                                }}
                            >
                                {selectedEvent.status === 'manual' ? 'Ok, Chiudi' : <><Info size={16} /> Vedi Scheda</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .calendar-container { display: flex; flex-direction: column; gap: 1rem; height: calc(100vh - 120px); min-height: 600px; position: relative; }
                .calendar-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem; flex-wrap: wrap; gap: 1rem; border-color: rgba(255,255,255,0.15); }
                .toolbar-left, .toolbar-center, .toolbar-right { display: flex; align-items: center; gap: 0.75rem; }
                .current-month-label { font-size: 1.1rem; font-weight: 800; min-width: 180px; text-align: center; letter-spacing: 0.5px; color: #fff; text-shadow: 0 0 10px rgba(99,102,241,0.3); }
                .btn-icon { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .btn-icon:hover { background: rgba(255,255,255,0.2); border-color: var(--primary-color); transform: scale(1.05); }
                .btn-today { background: var(--primary-color); color: white; border: none; padding: 0.45rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 15px rgba(99,102,241,0.2); }
                .btn-today:hover { opacity: 0.9; box-shadow: var(--glow-indigo); }
                .view-toggle { display: flex; background: rgba(255,255,255,0.08); padding: 0.25rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); }
                .toggle-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 1rem; border-radius: 10px; border: none; background: transparent; color: rgba(255,255,255,0.6); font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
                .toggle-btn.active { background: rgba(255,255,255,0.2); color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                .filters-group { display: flex; gap: 0.5rem; }
                .filter-chip { display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); transition: all 0.2s; }
                .filter-chip input { display: none; }
                .filter-chip.active.ticket { background: rgba(99, 102, 241, 0.25); border-color: #6366f1; color: #fff; box-shadow: 0 0 10px rgba(99,102,241,0.2); }
                .filter-chip.active.inst { background: rgba(20, 184, 166, 0.25); border-color: #14b8a6; color: #fff; box-shadow: 0 0 10px rgba(20,184,166,0.2); }
                .filter-chip.active.collaudo { background: rgba(168, 85, 247, 0.25); border-color: #a855f7; color: #fff; box-shadow: 0 0 10px rgba(168,85,247,0.2); }
                
                .calendar-grid-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
                .month-grid { display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: 1fr; gap: 1px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; height: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
                .weekday-header { background: rgba(255, 255, 255, 0.05); padding: 0.75rem; text-align: center; font-size: 0.7rem; font-weight: 800; color: rgba(255,255,255,0.6); letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.1); }
                
                .calendar-day { background: rgba(255, 255, 255, 0.04); padding: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem; position: relative; min-height: 80px; transition: all 0.2s; overflow: hidden; }
                .calendar-day:hover { background: rgba(255, 255, 255, 0.08); z-index: 2; transform: scale(1.02); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                .calendar-day.other-month { opacity: 0.15; background: rgba(0, 0, 0, 0.3); }
                .calendar-day.today { background: rgba(255, 255, 255, 0.08); }
                .calendar-day.today .day-number { background: #6366f1; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; box-shadow: 0 0 15px rgba(99,102,241,0.5); border: 2px solid rgba(255,255,255,0.3); }
                
                .day-number { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.8); margin-bottom: 0.25rem; }
                .day-events { display: flex; flex-direction: column; gap: 3px; }
                
                .event-pill { font-size: 0.65rem; padding: 3px 8px; border-radius: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.1); border-left: 3px solid transparent; color: #fff; font-weight: 500; cursor: pointer; }
                .event-time { font-weight: 800; font-size: 0.6rem; }
                .more-events { font-size: 0.6rem; color: rgba(255,255,255,0.4); padding-left: 0.5rem; font-style: italic; margin-top: 2px; }
                
                .week-view-container { display: flex; flex-direction: column; height: 100%; background: rgba(255, 255, 255, 0.04); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
                .week-header { display: grid; grid-template-columns: 60px repeat(7, 1fr); border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); }
                .week-day-header { padding: 0.75rem; text-align: center; border-left: 1px solid rgba(255,255,255,0.05); }
                .week-day-header.today { color: #6366f1; background: rgba(99,102,241,0.05); }
                .day-name { font-size: 0.7rem; font-weight: 800; color: rgba(255,255,255,0.5); }
                .day-num { font-size: 1.3rem; font-weight: 800; }
                
                .week-body { display: grid; grid-template-columns: 60px repeat(7, 1fr); position: relative; flex: 1; }
                .time-column { display: flex; flex-direction: column; background: rgba(0,0,0,0.2); }
                .time-slot { height: 60px; display: flex; justify-content: center; align-items: flex-start; font-size: 0.7rem; color: rgba(255,255,255,0.4); padding-top: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-weight: 600; }
                
                .week-grid-days { display: contents; }
                .week-day-col { position: relative; height: 780px; border-left: 1px solid rgba(255,255,255,0.05); }
                .week-day-col.today { background: rgba(99, 102, 241, 0.03); }
                .hour-guide-line { height: 60px; border-bottom: 1px solid rgba(255,255,255,0.03); }
                
                .week-event-card { position: absolute; left: 4px; right: 4px; padding: 6px 10px; border-radius: 8px; font-size: 0.75rem; z-index: 5; box-shadow: 0 8px 16px rgba(0,0,0,0.4); border-left: 4px solid rgba(255,255,255,0.3); transition: all 0.2s; cursor: pointer; overflow: hidden; color: #fff; }
                .week-event-card:hover { transform: translateY(-2px) scale(1.02); z-index: 10; box-shadow: 0 12px 24px rgba(0,0,0,0.5); }
                
                .event-time-sm { font-weight: 800; font-size: 0.65rem; margin-bottom: 2px; }
                .event-title-sm { font-weight: 700; line-height: 1.1; margin-bottom: 1px; }
                
                /* Modal Styles */
                .event-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1rem; }
                .event-modal { width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; background: rgba(30, 41, 59, 0.95); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); padding: 2rem; position: relative; }
                .modal-close { position: absolute; top: 1.25rem; right: 1.25rem; background: rgba(255,255,255,0.05); border: none; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .modal-close:hover { background: rgba(255,255,255,0.1); transform: rotate(90deg); }
                
                .modal-header { margin-bottom: 1.5rem; }
                .modal-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.75rem; border-radius: 30px; font-size: 0.7rem; font-weight: 800; color: white; margin-bottom: 1rem; }
                .modal-title { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.25rem; color: #fff; }
                .modal-subtitle { color: rgba(255,255,255,0.6); font-size: 1rem; }
                
                .modal-body { display: flex; flex-direction: column; gap: 1.25rem; margin-bottom: 2rem; }
                .detail-row { display: flex; gap: 1rem; align-items: flex-start; }
                .detail-icon { color: var(--primary-color); margin-top: 0.25rem; flex-shrink: 0; }
                .detail-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); font-weight: 600; text-transform: uppercase; }
                .detail-value { font-size: 1rem; color: #fff; font-weight: 500; }
                
                .modal-footer { display: flex; gap: 1rem; justify-content: flex-end; border-top: 1px solid rgba(255,255,255,0.1); pt-1.5rem; padding-top: 1.5rem; }
                .btn-secondary { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 0.6rem 1.2rem; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
                .btn-secondary:hover { background: rgba(255,255,255,0.1); }
                .btn-primary { background: var(--primary-color); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; font-weight: 600; }
                .btn-primary:hover { opacity: 0.9; box-shadow: var(--glow-indigo); }
                
                .anim-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }

                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                @media (max-width: 768px) {
                    .calendar-toolbar { flex-direction: column; align-items: stretch; }
                    .toolbar-center { order: 3; justify-content: center; }
                    .toolbar-right { order: 2; justify-content: center; }
                    .current-month-label { min-width: auto; }
                    .weekday-header { font-size: 0.6rem; padding: 0.4rem; }
                    .event-pill .event-time { display: none; }
                }
            `}</style>
        </div>
    );
};
