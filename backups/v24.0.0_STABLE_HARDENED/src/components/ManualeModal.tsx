import React from 'react';
import { X, BookOpen, List, CalendarDays, Shield, MapPin, Ticket, AlertTriangle, ChevronRight } from 'lucide-react';

interface ManualeModalProps {
    onClose: () => void;
}

const S = {
    overlay: {
        position: 'fixed' as const,
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1rem',
    },
    panel: {
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        overflowY: 'auto' as const,
        background: 'linear-gradient(160deg, #0a0f1e 0%, #0f172a 50%, #1a1f35 100%)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '20px',
        padding: '0',
        position: 'relative' as const,
        boxShadow: '0 30px 80px -10px rgba(0,0,0,0.9), 0 0 0 1px rgba(99,102,241,0.1)',
    },
    header: {
        padding: '2rem 2rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, transparent 100%)',
    },
    body: {
        padding: '1.5rem 2rem 2.5rem',
        display: 'flex' as const,
        flexDirection: 'column' as const,
        gap: '1.5rem',
    },
    closeBtn: {
        position: 'absolute' as const,
        top: '1.25rem',
        right: '1.25rem',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionCard: (accent: string) => ({
        background: `linear-gradient(135deg, ${accent}08 0%, rgba(255,255,255,0.02) 100%)`,
        border: `1px solid ${accent}25`,
        borderRadius: '14px',
        padding: '1.25rem 1.5rem',
    }),
    sectionTitle: (accent: string) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        marginBottom: '0.9rem',
        color: accent,
        fontSize: '0.82rem',
        fontWeight: 800,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
    }),
    h3: {
        margin: '0 0 0.5rem',
        fontSize: '1rem',
        fontWeight: 700,
        color: '#e2e8f0',
    },
    para: {
        margin: '0 0 0.6rem',
        fontSize: '0.84rem',
        color: 'rgba(255,255,255,0.55)',
        lineHeight: 1.7,
    },
    bullet: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        marginBottom: '0.45rem',
        fontSize: '0.84rem',
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.65,
    },
    dot: (color: string) => ({
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: color,
        marginTop: '0.45rem',
        flexShrink: 0,
    }),
    badge: (bg: string, color: string) => ({
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.15rem 0.55rem',
        borderRadius: '6px',
        fontSize: '0.72rem',
        fontWeight: 800,
        background: bg,
        color: color,
        letterSpacing: '0.04em',
        marginRight: '0.3rem',
    }),
    importantBox: {
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: '10px',
        padding: '0.9rem 1.1rem',
        marginTop: '0.75rem',
        display: 'flex',
        gap: '0.6rem',
        alignItems: 'flex-start',
    },
    importantText: {
        fontSize: '0.83rem',
        color: '#fca5a5',
        lineHeight: 1.65,
        margin: 0,
    },
    divider: {
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
        margin: '0.25rem 0',
    },
};

const Bullet: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
    <div style={S.bullet}>
        <span style={S.dot(color)} />
        <span>{children}</span>
    </div>
);

export const ManualeModal: React.FC<ManualeModalProps> = ({ onClose }) => (
    <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={S.panel}>
            {/* Pulsante Chiudi */}
            <button onClick={onClose} style={S.closeBtn}>
                <X size={17} />
            </button>

            {/* ── INTESTAZIONE ── */}
            <div style={S.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 10px #6366f1' }} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6366f1' }}>
                        Assistenza SK &middot; Documentazione Ufficiale
                    </span>
                </div>
                <h2 style={{ margin: '0 0 0.3rem', fontSize: '1.55rem', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.025em' }}>
                    Manuale Operativo Gestionale
                </h2>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', fontWeight: 600 }}>
                    VER 21.0.0 &nbsp;&mdash;&nbsp; PROFESSIONAL USER MANUAL
                </p>
            </div>

            {/* ── CORPO ── */}
            <div style={S.body}>

                {/* 1. STRUTTURA GENERALE */}
                <div style={S.sectionCard('#6366f1')}>
                    <div style={S.sectionTitle('#6366f1')}>
                        <BookOpen size={14} /> 1. Struttura Generale del Sistema
                    </div>
                    <p style={S.para}>
                        Il gestionale copre l'<strong style={{ color: '#c7d2fe' }}>intero ciclo di vita della commessa</strong>: dalla
                        ricezione del ticket di assistenza fino alla firma del collaudo finale. Ogni fase è tracciata
                        in tempo reale e sincronizzata su tutti i dispositivi degli utenti autorizzati.
                    </p>
                    <Bullet color="#6366f1">Ricezione ticket → Assegnazione → Pianificazione intervento → Esecuzione → Collaudo → Chiusura pratica</Bullet>
                    <Bullet color="#6366f1">Accesso multi-ruolo: Tecnico, Amministratore, Superamministratore.</Bullet>
                    <Bullet color="#6366f1">Sincronizzazione in tempo reale tramite database cloud Firestore.</Bullet>
                </div>

                {/* 2. TABELLA ORDINI */}
                <div style={S.sectionCard('#14b8a6')}>
                    <div style={S.sectionTitle('#14b8a6')}>
                        <List size={14} /> 2. Tabella Ordini (Dashboard)
                    </div>

                    <h3 style={{ ...S.h3, marginBottom: '0.75rem' }}>Significato dei Colori di Riga</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div style={S.bullet}>
                            <span style={{ ...S.badge('rgba(255,255,255,0.1)', '#e2e8f0'), border: '1px solid rgba(255,255,255,0.2)' }}>BIANCO</span>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.84rem' }}>
                                Ordine <strong style={{ color: '#e2e8f0' }}>In Attesa</strong> o <strong style={{ color: '#e2e8f0' }}>Pianificabile</strong> — nessuna azione completata.
                            </span>
                        </div>
                        <div style={S.bullet}>
                            <span style={{ ...S.badge('rgba(34,197,94,0.15)', '#4ade80'), border: '1px solid rgba(34,197,94,0.3)' }}>VERDE</span>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.84rem' }}>
                                Ordine <strong style={{ color: '#4ade80' }}>Collaudato / Chiuso</strong> — procedura completata con successo.
                            </span>
                        </div>
                        <div style={S.bullet}>
                            <span style={{ ...S.badge('rgba(148,163,184,0.15)', '#94a3b8'), border: '1px solid rgba(148,163,184,0.3)' }}>GRIGIO</span>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.84rem' }}>
                                Ordine <strong style={{ color: '#94a3b8' }}>Fatturato</strong> — la riga viene spostata automaticamente in fondo alla lista.
                            </span>
                        </div>
                    </div>

                    <div style={S.divider} />

                    <h3 style={{ ...S.h3, marginTop: '0.85rem' }}>Gestione Priorità e Stati Manuali</h3>
                    <p style={S.para}>
                        Per modificare colore o stato di un ordine manualmente, utilizzare il menu contestuale
                        accessibile tramite il pulsante <strong style={{ color: '#14b8a6' }}>⋮ (tre punti)</strong> a destra di ogni riga.
                    </p>
                    <Bullet color="#14b8a6">Selezionare «Cambia Colore» per applicare una priorità visiva personalizzata.</Bullet>
                    <Bullet color="#14b8a6">Selezionare «Cambia Stato» per aggiornare manualmente lo stato della commessa.</Bullet>
                    <Bullet color="#14b8a6">Le modifiche manuali hanno sempre la massima priorità rispetto ai colori automatici.</Bullet>
                </div>

                {/* 3. PIANIFICAZIONE */}
                <div style={S.sectionCard('#f59e0b')}>
                    <div style={S.sectionTitle('#f59e0b')}>
                        <CalendarDays size={14} /> 3. Pianificazione Attività
                    </div>
                    <p style={S.para}>
                        La pianificazione dell'intervento consente di assegnare una finestra temporale precisa
                        a ciascuna commessa, rendendola visibile nel <strong style={{ color: '#fbbf24' }}>Calendario Settimanale</strong>.
                    </p>
                    <Bullet color="#f59e0b">Aprire la scheda dell'ordine e compilare i campi <strong style={{ color: '#fcd34d' }}>«Data Inizio»</strong> e <strong style={{ color: '#fcd34d' }}>«Data Fine»</strong>.</Bullet>
                    <Bullet color="#f59e0b">Utilizzare il selettore data per collocare l'intervento nel carico di lavoro settimanale corretto.</Bullet>
                    <Bullet color="#f59e0b">L'ordine pianificato compare automaticamente nella vista Calendario con i dati del tecnico assegnato.</Bullet>
                    <Bullet color="#f59e0b">Per spostare un intervento, aggiornare la data direttamente dalla tabella ordini o dal Calendario.</Bullet>
                </div>

                {/* 4. COLLAUDI */}
                <div style={S.sectionCard('#8b5cf6')}>
                    <div style={S.sectionTitle('#8b5cf6')}>
                        <Shield size={14} /> 4. Collaudi e Checklist
                    </div>
                    <p style={S.para}>
                        Il processo di collaudo è la fase conclusiva della commessa. Il tecnico deve completare
                        ogni punto della checklist prima di chiudere la pratica.
                    </p>

                    <h3 style={S.h3}>Procedura per il Tecnico</h3>
                    <Bullet color="#8b5cf6">Aprire la commessa dalla Dashboard e selezionare <strong style={{ color: '#c4b5fd' }}>«Avvia Collaudo»</strong>.</Bullet>
                    <Bullet color="#8b5cf6">Compilare tutti i campi della checklist tecnica (impostazioni, parametri, verifiche funzionali).</Bullet>
                    <Bullet color="#8b5cf6">Caricare le foto di prova tramite il pulsante fotocamera integrato — la geolocalizzazione viene acquisita automaticamente.</Bullet>
                    <Bullet color="#8b5cf6">Verificare che tutti i punti obbligatori risultino spuntati prima di procedere.</Bullet>

                    <div style={S.importantBox}>
                        <AlertTriangle size={16} style={{ color: '#f87171', flexShrink: 0, marginTop: '0.1rem' }} />
                        <p style={S.importantText}>
                            <strong>AZIONE CRITICA:</strong> Premere il tasto{' '}
                            <strong style={{ background: 'rgba(239,68,68,0.2)', padding: '0 0.3rem', borderRadius: '4px' }}>
                                «INVIA E CONCLUDI»
                            </strong>{' '}
                            per chiudere definitivamente la pratica. Solo dopo questa azione la riga nella Tabella Ordini
                            verrà aggiornata allo stato <strong>Collaudato</strong> (verde) e tutti i dati saranno
                            trasmessi al database centrale.
                        </p>
                    </div>
                </div>

                {/* 5. GEOFENCING */}
                <div style={S.sectionCard('#ec4899')}>
                    <div style={S.sectionTitle('#ec4899')}>
                        <MapPin size={14} /> 5. Geofencing & Foto
                    </div>
                    <p style={S.para}>
                        Le fotografie di collaudo vengono associate automaticamente alle coordinate GPS del
                        dispositivo al momento dello scatto, garantendo la tracciabilità geografica dell'installazione.
                    </p>
                    <Bullet color="#ec4899">
                        <strong style={{ color: '#f9a8d4' }}>Permessi GPS obbligatori:</strong> il sistema richiede l'autorizzazione alla posizione.
                        Senza di essa non è possibile caricare foto di collaudo valide.
                    </Bullet>
                    <Bullet color="#ec4899">Su smartphone: abilitare la localizzazione per il browser (Safari/Chrome) nelle impostazioni di sistema.</Bullet>
                    <Bullet color="#ec4899">La posizione GPS è allegata ai metadati di ogni foto e non è modificabile dall'utente.</Bullet>
                    <Bullet color="#ec4899">Le installazioni con foto geolocalizzate sono indicate con l'icona <strong style={{ color: '#f9a8d4' }}>📍</strong> nella dashboard.</Bullet>
                </div>

                {/* 6. TICKET ASSISTENZA */}
                <div style={S.sectionCard('#22c55e')}>
                    <div style={S.sectionTitle('#22c55e')}>
                        <Ticket size={14} /> 6. Assistenza — Gestione Ticket
                    </div>
                    <p style={S.para}>
                        Il modulo Assistenza consente di aprire, assegnare e tracciare le richieste di supporto
                        tecnico ricevute da clienti o operatori interni.
                    </p>
                    <Bullet color="#22c55e">Selezionare <strong style={{ color: '#86efac' }}>«Nuovo Ticket»</strong> e compilare: cliente, descrizione problema, priorità e tecnico assegnato.</Bullet>
                    <Bullet color="#22c55e">Lo stato del ticket avanza automaticamente: <em>Aperto → In Lavorazione → Risolto → Chiuso</em>.</Bullet>
                    <Bullet color="#22c55e">Ogni ticket può essere collegato a un ordine esistente nella Tabella Ordini per la tracciabilità completa.</Bullet>
                    <Bullet color="#22c55e">Aggiungere note interne e allegati direttamente dalla scheda del ticket senza creare una nuova commessa.</Bullet>

                    <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
                        <ChevronRight size={12} />
                        Per assistenza tecnica sul gestionale contattare l'amministratore di sistema.
                    </div>
                </div>

            </div>
        </div>
    </div>
);
