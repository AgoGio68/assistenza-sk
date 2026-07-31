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
import { collection, query, onSnapshot, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { Ticket, Installation } from '../types';
import { parseSheetDate, formatToISODate } from '../utils/dateUtils';
import { syncInstallationDate } from '../utils/sheetSyncUtils';

import { CollaudoChecklistModal } from '../components/CollaudoChecklistModal';

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
        installations: CalendarEvent[];
        overrides: Record<string, Partial<Installation>>;
    }>({
        tickets: [],
        installations: [],
        overrides: {},
    });

    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [collaudoModal, setCollaudoModal] = useState<CalendarEvent | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [editDate, setEditDate] = useState('');

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

                    return {
                        id: doc.id,
                        title: data.companyName,
                        subtitle: data.description?.substring(0, 40) || '',
                        date: new Date(dateStr),
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

        // 3. Fetch Spreadsheets (ordini & ordini_s2)
        const fetchSheet = (sheetId: 'ordini' | 'ordini_s2') => {
            const sheetRef = doc(db, 'fogli_condivisi', sheetId);
            return onSnapshot(sheetRef, (snap) => {
                if (!snap.exists()) return;
                const cellMap = snap.data().data || {};
                
                // Helper per convertire mappa celle → array righe (identico a useInstallations)
                const letterCol = (s: string) => {
                    let i = 0;
                    for (let k = 0; k < s.length; k++) i = i * 26 + (s.charCodeAt(k) - 64);
                    return i - 1;
                };
                const parseName = (n: string) => {
                    const m = n.match(/^([A-Z]+)(\d+)$/);
                    return m ? [letterCol(m[1]), parseInt(m[2]) - 1] : [-1, -1];
                };

                let maxRow = 0;
                for (const key of Object.keys(cellMap)) {
                    const [, r] = parseName(key);
                    if (r > maxRow) maxRow = r;
                }
                const rows: string[][] = Array.from({ length: maxRow + 1 }, () => Array(26).fill(''));
                for (const [key, val] of Object.entries(cellMap)) {
                    const [c, r] = parseName(key);
                    if (r >= 0 && r < rows.length && c >= 0 && c < 26) rows[r][c] = (val as string) ?? '';
                }

                // Mappiamo le righe saltando l'header (riga 0)
                const instEvents: CalendarEvent[] = rows.slice(1).map((parts) => {
                    const stableId = (parts[25] || '').trim();
                    const client = (parts[1] || '').trim();
                    if (!client || !stableId) return null;

                    // Data Cons (Col E / 4) e Data Inst (Col H / 7)
                    const dConsRaw = parts[4] || '';
                    const dInstRaw = parts[7] || '';

                    const dCons = parseSheetDate(dConsRaw);
                    const dInst = parseSheetDate(dInstRaw);

                    // Priorità data: Data Inst > Data Cons
                    const eventDate = dInst || dCons;
                    if (!eventDate) return null;

                    return {
                        id: stableId,
                        title: client,
                        subtitle: (parts[2] || '').trim(), // Macchina
                        date: eventDate,
                        type: 'installation',
                        status: 'pending',
                        details: (parts[3] || '').trim(), // Luogo
                        color: '#14b8a6',
                        originalData: { 
                            stableId, 
                            order: parts[0],
                            machine: parts[2],
                            section: sheetId === 'ordini_s2' ? 's2' : 'sk'
                        },
                        sheetId: sheetId
                    } as CalendarEvent;
                }).filter(e => e !== null) as CalendarEvent[];

                setAllEvents(prev => {
                    // Uniamo gli eventi dei due fogli in modo unico per stableId
                    // Filtra via quelli dello stesso sheet per rimpiazzarli
                    const filtered = prev.installations.filter(e => e.sheetId !== sheetId);
                    return { ...prev, installations: [...filtered, ...instEvents] };
                });
            });
        };

        unsubscribeList.push(fetchSheet('ordini'));
        unsubscribeList.push(fetchSheet('ordini_s2'));

        return () => unsubscribeList.forEach((u) => u());
    }, []);

    const mergedEvents = useMemo(() => {
        // Applichiamo gli override di installation_data agli eventi installations
        const processedInst = allEvents.installations.map(e => {
            const override = allEvents.overrides[e.id];
            if (override && override.scheduledDate) {
                const newDate = new Date(override.scheduledDate);
                if (!isNaN(newDate.getTime())) {
                    return { ...e, date: newDate };
                }
            }
            return e;
        });

        // 2. Generiamo eventi di collaudo separati dalle installazioni che hanno testDate
        const collaudoEvents: CalendarEvent[] = [];
        Object.entries(allEvents.overrides).forEach(([id, override]) => {
            if (override.toTest && override.testDate) {
                const tDate = new Date(override.testDate);
                if (!isNaN(tDate.getTime())) {
                    const inst = allEvents.installations.find(i => i.id === id);
                    if (inst) {
                        collaudoEvents.push({
                            id: `${id}-collaudo`,
                            title: `Collaudo: ${inst.title}`,
                            subtitle: inst.subtitle,
                            date: tDate,
                            type: 'collaudo',
                            status: 'pending',
                            details: inst.details,
                            color: '#a855f7', // Purple
                            originalData: { ...inst.originalData, isCollaudo: true },
                            sheetId: inst.sheetId
                        } as CalendarEvent);
                    }
                }
            }
        });

        const combined = [...allEvents.tickets, ...processedInst, ...collaudoEvents];
        return combined.filter((e) => {
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
                                                onClick={() => {
                                                    if (event.type === 'collaudo') {
                                                        setCollaudoModal(event);
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
                                        <div key={i} className={`week-day-col ${isToday(day) ? 'today' : ''}`}>
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
                                                        onClick={() => {
                                                            if (event.type === 'collaudo') {
                                                                setCollaudoModal(event);
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
                                ) : selectedEvent.type === 'installation' ? (
                                    <Truck size={14} />
                                ) : (
                                    <CheckCircle2 size={14} />
                                )}
                                {selectedEvent.type.toUpperCase()}
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
                                        {selectedEvent.type === 'installation' ? (
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
                            
                            {selectedEvent.type === 'installation' && (
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

                            <button
                                className="btn-primary"
                                disabled={isSaving}
                                onClick={() => {
                                    if (selectedEvent.type === 'installation' || selectedEvent.type === 'collaudo') {
                                        const cleanId = selectedEvent.id.replace('-inst', '').replace('-coll', '');
                                        navigate(`/installations?id=${cleanId}`);
                                    } else {
                                        navigate(`/tickets`); // fallback per ticket
                                    }
                                }}
                            >
                                <Info size={16} /> Vedi Scheda
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
