import { useState } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
    updateInstallationOnSheet,
    appendInstallationToSheet,
    deleteInstallationFromSheet,
} from '../services/InstallationService';
import { createGoogleCalendarEvent, formatTicketToEvent, CalendarEvent } from '../utils/calendarUtils';
import { Installation } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { AuditLogService } from '../services/AuditLogService';

export const useInstallationActions = (
    section: 'sk' | 's2',
    settings: any,
    googleToken: string | null,
    isAdmin: boolean,
    generateSemanticId: (inst: Installation) => string,
) => {
    const { currentUser, userProfile, isSuperadmin } = useAuth();
    const [selectedInst, setSelectedInst] = useState<Installation | null>(null);
    const [editData, setEditData] = useState<Partial<Installation>>({});
    const [saving, setSaving] = useState(false);
    const [exportToSheet, setExportToSheet] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

    // Dati orfani modal state
    const [showOrphanVault, setShowOrphanVault] = useState(false);
    const [orphanToRelink, setOrphanToRelink] = useState<Installation | null>(null);
    const [relinkTargetId, setRelinkTargetId] = useState('');

    const handleAddManual = () => {
        const newId = `manual-${Date.now()}`;
        const mockInst: Installation = {
            rowId: 'manual',
            orderNumber: '',
            client: '',
            machine: '',
            modelSK: '',
            serialSK: '',
            deliveryDate: new Date().toISOString().split('T')[0],
            installationSite: '',
            installDate: '',
            comments: '',
            isManual: true,
            section: section,
            _firestoreId: newId,
            createdAt: Date.now(),
        };
        setSelectedInst(mockInst);
        setEditData({
            isManual: true,
            section: section,
            comments: '',
            isInvoiced: false,
            toTest: false,
            tested: false,
            scheduledTime: '',
            scheduledDate: '',
            applications: [],
            localOverrides: {
                client: '',
                machine: '',
                modelSK: '',
                serialSK: '',
                orderDfv: '',
                installationSite: '',
            },
        });
        setDeleteConfirm(false);
    };

    const handleOpenDetail = (inst: Installation) => {
        setSelectedInst(inst);
        setEditData({
            comments: inst.comments || '',
            isInvoiced: inst.isInvoiced || false,
            toTest: inst.toTest || false,
            tested: inst.tested || false,
            scheduledTime: inst.scheduledTime || '',
            scheduledDate: inst.scheduledDate || '',
            testDate: inst.testDate || '',
            applications: inst.applications || [],
            localOverrides: inst.localOverrides || {},
        });
        setDeleteConfirm(false);
        setExportToSheet(false);
    };

    const handleSave = async () => {
        if (!selectedInst) return;
        setSaving(true);
        try {
            const sheetUrl = section === 's2' ? settings.section2InstallationsSheetUrl : settings.installationsSheetUrl;
            let finalDocId = selectedInst._firestoreId || generateSemanticId(selectedInst);
            let mergedEditData = { ...editData };

            if (selectedInst.isManual && exportToSheet && googleToken && sheetUrl) {
                const combinedData = { ...selectedInst, ...editData, ...editData.localOverrides } as Installation;
                const newRowIndex = await appendInstallationToSheet(
                    sheetUrl,
                    googleToken,
                    combinedData,
                    settings.insertInstallationsAtTop,
                );

                if (newRowIndex) {
                    mergedEditData.isManual = false;
                    mergedEditData.originalRowIndex = newRowIndex;
                    finalDocId = selectedInst._firestoreId || finalDocId;
                }
            }

            const docRef = doc(db, 'installation_data', finalDocId as string);

            const firestoreDoc = {
                scheduledDate: editData.scheduledDate || '',
                scheduledTime: editData.scheduledTime || '',
                tested: editData.tested || false,
                toTest: editData.toTest || false,
                testDate: editData.testDate || '',
                comments: editData.comments || '',
                isInvoiced: editData.isInvoiced || false,
                applications: editData.applications || [],
                localOverrides: editData.localOverrides || {},
                section: mergedEditData.section || section,
                isManual: mergedEditData.isManual || selectedInst.isManual || false,
                originalRowIndex: mergedEditData.originalRowIndex || selectedInst.originalRowIndex || '',
                _firestoreId: finalDocId,
                updatedAt: Date.now(),
                updatedBy: isAdmin ? 'admin' : 'superadmin',
            };
            await setDoc(docRef, firestoreDoc); // no merge

            const targetRowIndex = mergedEditData.originalRowIndex || selectedInst.originalRowIndex;
            if (googleToken && targetRowIndex && !mergedEditData.isManual && !exportToSheet) {
                const statusComment = editData.tested ? '[COLLAUDATA]' : editData.toTest ? '[DA COLLAUDARE]' : '';
                let cleanComments = editData.comments || '';
                cleanComments = cleanComments
                    .replace(/\[COLLAUDATA\]/gi, '')
                    .replace(/\[DA COLLAUDARE\]/gi, '')
                    .trim();

                const finalComments = statusComment ? `${statusComment} ${cleanComments}`.trim() : cleanComments;

                const sheetStatus = editData.tested ? 'tested' : (editData.toTest ? 'toTest' : 'none');

                try {
                    await updateInstallationOnSheet(sheetUrl || '', googleToken, targetRowIndex, {
                        installDate: editData.scheduledDate || '',
                        serialSK: editData.localOverrides?.serialSK ?? selectedInst.serialSK,
                        comments: finalComments,
                        status: sheetStatus,
                    });
                } catch (sheetErr: any) {
                    console.error('Sheet sync error:', sheetErr);
                    alert(
                        `Attenzione: Dati salvati nell'App, ma la sincronizzazione col foglio Google è fallita: ${sheetErr.message}`,
                    );
                }
            }

            if (currentUser) {
                const authorName = userProfile?.displayName || currentUser.displayName || 'Amministratore';
                const clientName = editData.localOverrides?.client || selectedInst.client || 'Cliente';
                AuditLogService.logAction({
                    userId: currentUser.uid, 
                    userEmail: currentUser.email || '', 
                    userName: authorName, 
                    userRole: isSuperadmin ? 'superadmin' : (isAdmin ? 'admin' : 'user'),
                    action: 'UPDATE', 
                    resourceType: 'INSTALLATION', 
                    resourceId: finalDocId as string,
                    details: `${authorName} ha AGGIORNATO l'installazione per: ${clientName} (${selectedInst.machine || 'N/D'}).`
                });
            }

            alert('Modifiche salvate con successo!');
            setSelectedInst(null);
        } catch (err) {
            console.error('Save error:', err);
            alert('Errore durante il salvataggio.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedInst) return;
        if (!deleteConfirm) {
            setDeleteConfirm(true);
            return;
        }

        setSaving(true);
        try {
            const id = selectedInst._firestoreId || generateSemanticId(selectedInst);
            const docRef = doc(db, 'installation_data', id);
            const sheetUrl = section === 's2' ? settings.section2InstallationsSheetUrl : settings.installationsSheetUrl;

            if (googleToken && selectedInst.originalRowIndex && sheetUrl) {
                try {
                    await deleteInstallationFromSheet(sheetUrl, googleToken, selectedInst.originalRowIndex);
                } catch (sheetErr) {
                    console.error('Sheet delete error:', sheetErr);
                }
            }

            await deleteDoc(docRef);

            alert('Installazione eliminata definitivamente.');
            setSelectedInst(null);
        } catch (err) {
            console.error('Delete error:', err);
            alert("Errore durante l'eliminazione.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddEventToCalendar = async (connectGoogle: () => void) => {
        if (!googleToken) {
            connectGoogle();
            return;
        }
        if (!editData.scheduledDate) {
            alert("Inserisci una data di installazione per creare l'evento su Google Calendar.");
            return;
        }

        setIsSyncingCalendar(true);
        try {
            const dateStr = editData.scheduledDate;
            const timeStr = editData.scheduledTime || '08:00';
            const scheduledDateTime = new Date(`${dateStr}T${timeStr}`);

            const clientName = editData.localOverrides?.client ?? selectedInst?.client ?? 'Cliente Sconosciuto';
            const machineName = editData.localOverrides?.machine ?? selectedInst?.machine ?? 'Macchina Sconosciuta';
            const locationStr = editData.localOverrides?.installationSite ?? selectedInst?.installationSite ?? '';

            const descriptionText = `Installazione: ${machineName}\nOrdine: ${selectedInst?.orderNumber || ''}\nMatricola: ${editData.localOverrides?.serialSK ?? selectedInst?.serialSK ?? ''}`;

            const googleEventTitle = locationStr ? `${clientName} - ${locationStr}` : clientName;

            const googleEvent: CalendarEvent = formatTicketToEvent(
                googleEventTitle,
                descriptionText,
                scheduledDateTime,
                window.location.origin,
            );

            if (locationStr) {
                googleEvent.location = locationStr;
            }

            await createGoogleCalendarEvent(googleToken, googleEvent);

            if (currentUser) {
                const authorName = userProfile?.displayName || currentUser.displayName || 'Amministratore';
                AuditLogService.logAction({
                    userId: currentUser.uid, 
                    userEmail: currentUser.email || '', 
                    userName: authorName, 
                    userRole: isSuperadmin ? 'superadmin' : (isAdmin ? 'admin' : 'user'),
                    action: 'UPDATE', 
                    resourceType: 'INSTALLATION', 
                    resourceId: selectedInst?._firestoreId || 'N/D',
                    details: `${authorName} ha SINCRONIZZATO l'installazione con Google Calendar per: ${clientName}.`
                });
            }

            if (selectedInst) {
                const calDocId = selectedInst._firestoreId || generateSemanticId(selectedInst);
                const docRef = doc(db, 'installation_data', calDocId);
                await setDoc(docRef, {
                    scheduledDate: editData.scheduledDate || '',
                    scheduledTime: editData.scheduledTime || '',
                    tested: editData.tested || false,
                    toTest: editData.toTest || false,
                    testDate: editData.testDate || '',
                    comments: editData.comments || '',
                    isInvoiced: editData.isInvoiced || false,
                    applications: editData.applications || [],
                    localOverrides: editData.localOverrides || {},
                    section: section,
                    isManual: selectedInst.isManual || false,
                    originalRowIndex: selectedInst.originalRowIndex || '',
                    _firestoreId: calDocId,
                    updatedAt: Date.now(),
                    updatedBy: isAdmin ? 'admin' : 'superadmin',
                });
            }

            alert('Evento aggiunto a Google Calendar e data salvata!');
        } catch (error: any) {
            console.error('Google Calendar Sync Error:', error);
            alert(`Errore durante la sincronizzazione con Google Calendar: ${error.message}`);
        } finally {
            setIsSyncingCalendar(false);
        }
    };

    const handleRelink = async (orphanId: string, targetId: string, orphanedData: Installation[]) => {
        if (!targetId || !orphanId) return;
        try {
            const orphan = orphanedData.find((o) => o._firestoreId === orphanId);
            if (!orphan) return;

            const targetRef = doc(db, 'installation_data', targetId);
            const orphanRef = doc(db, 'installation_data', orphanId);

            await setDoc(
                targetRef,
                {
                    comments: orphan.comments,
                    tested: orphan.tested,
                    toTest: orphan.toTest,
                    scheduledDate: orphan.scheduledDate,
                    scheduledTime: orphan.scheduledTime,
                    applications: orphan.applications,
                    updatedAt: Date.now(),
                    updatedBy: 'admin_relink',
                },
                { merge: true },
            );

            await setDoc(orphanRef, { isDeleted: true }, { merge: true });

            setOrphanToRelink(null);
            setRelinkTargetId('');
            if (orphanedData.length <= 1) setShowOrphanVault(false);
        } catch (err) {
            console.error(err);
            alert('Errore durante il recupero dei dati.');
        }
    };

    return {
        selectedInst,
        setSelectedInst,
        editData,
        setEditData,
        saving,
        exportToSheet,
        setExportToSheet,
        deleteConfirm,
        setDeleteConfirm,
        isSyncingCalendar,
        showOrphanVault,
        setShowOrphanVault,
        orphanToRelink,
        setOrphanToRelink,
        relinkTargetId,
        setRelinkTargetId,
        handleAddManual,
        handleOpenDetail,
        handleSave,
        handleDelete,
        handleAddEventToCalendar,
        handleRelink,
    };
};
