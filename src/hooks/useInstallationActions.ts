import { useState } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Installation } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { AuditLogService } from '../services/AuditLogService';
import { syncInstallationStatus, syncResetAssignment } from '../utils/sheetSyncUtils';
import { UnitaSkService } from '../services/UnitaSkService';

export const useInstallationActions = (
    section: 'sk' | 's2',
    _settings: any,
    isAdmin: boolean,
    generateSemanticId: (inst: Installation) => string,
) => {
    const { currentUser, userProfile, isSuperadmin } = useAuth();
    const [selectedInst, setSelectedInst] = useState<Installation | null>(null);
    const [editData, setEditData] = useState<Partial<Installation>>({});
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

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
    };

    const handleSave = async () => {
        if (!selectedInst) return;
        setSaving(true);
        try {
            let finalDocId = selectedInst._firestoreId || generateSemanticId(selectedInst);
            const mergedEditData = { ...editData };

            const docRef = doc(db, 'installation_data', finalDocId as string);

            // Check if we unlinked a paired Unit SK
            const oldSerial = selectedInst.pairedUnit?.seriale;
            const newSerial = editData.pairedUnit === null ? null : (editData.pairedUnit?.seriale || oldSerial);
            if (oldSerial && oldSerial !== newSerial) {
                try {
                    const prevUnit = await UnitaSkService.findUnitBySerial(oldSerial);
                    if (prevUnit && prevUnit.id) {
                        await UnitaSkService.updateUnit(prevUnit.id, {
                            assignedToInstallationId: '',
                            assignedToClientName: ''
                        });
                    }
                } catch (err) {
                    console.error('Error clearing old Unit SK assignment:', err);
                }
            }

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
                client: selectedInst.client || '',   // Denormalizzazione per Calendario
                machine: selectedInst.machine || '', // Denormalizzazione per Calendario
                pairedUnit: editData.pairedUnit === null ? null : (editData.pairedUnit || selectedInst.pairedUnit || null),
                updatedAt: Date.now(),
                updatedBy: isAdmin ? 'admin' : 'superadmin',
            };
            await setDoc(docRef, firestoreDoc);

            // Sincronizzazione isArchived sull'Unità SK abbinata (VER 26.3.0)
            const pairedSerial = firestoreDoc.pairedUnit?.seriale ?? selectedInst.pairedUnit?.seriale;
            if (pairedSerial) {
                try {
                    const pairedUnit = await UnitaSkService.findUnitBySerial(pairedSerial);
                    if (pairedUnit && pairedUnit.id) {
                        await UnitaSkService.updateUnit(pairedUnit.id, {
                            isArchived: firestoreDoc.tested === true,
                        });
                    }
                } catch (err) {
                    console.error('[UnitaSK] Errore sync isArchived:', err);
                }
            }

            // Sincronizzazione con lo spreadsheet basata sui Flag Manuali (VER 23.7.0)
            const sheetType = (section === 's2' ? 'ordini_s2' : 'ordini') as 'ordini' | 'ordini_s2';
            if (firestoreDoc.tested) {
                await syncInstallationStatus(finalDocId, 'COLLAUDATA', sheetType).catch(err => 
                    console.error('[Sync] Errore sync collaudata:', err)
                );
            } else if (firestoreDoc.toTest) {
                await syncInstallationStatus(finalDocId, 'DA COLLAUDARE', sheetType).catch(err => 
                    console.error('[Sync] Errore sync da collaudare:', err)
                );
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

            // Clear Unit SK assignment if there is one!
            if (selectedInst.pairedUnit?.seriale) {
                try {
                    const unit = await UnitaSkService.findUnitBySerial(selectedInst.pairedUnit.seriale);
                    if (unit && unit.id) {
                        await UnitaSkService.updateUnit(unit.id, {
                            assignedToInstallationId: '',
                            assignedToClientName: ''
                        });
                    }
                } catch (err) {
                    console.error('Error clearing Unit SK assignment on delete:', err);
                }
            }

            const docRef = doc(db, 'installation_data', id);
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

    const handleResetAssignment = async () => {
        if (!selectedInst) return;
        if (!window.confirm('Sei sicuro di voler rimuovere "chirurgicamente" l\'assegnazione (date e stati) per questa macchina?')) return;
        
        setSaving(true);
        try {
            const id = selectedInst._firestoreId || generateSemanticId(selectedInst);
            const docRef = doc(db, 'installation_data', id);
            
            // 1. Reset campi su Firebase
            await setDoc(docRef, {
                scheduledDate: '',
                scheduledTime: '',
                testDate: '',
                toTest: false,
                tested: false,
                updatedAt: Date.now(),
                updatedBy: isAdmin ? 'admin_reset' : 'superadmin_reset',
            }, { merge: true });

            // 2. Sincronizzazione "chirurgica" spreadsheet
            const sheetType = (section === 's2' ? 'ordini_s2' : 'ordini') as 'ordini' | 'ordini_s2';
            await syncResetAssignment(id, sheetType);

            // 3. Log attività
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
                    resourceId: id,
                    details: `${authorName} ha RIMOSSO l'assegnazione per: ${clientName}.`
                });
            }

            alert('Assegnazione rimossa con successo.');
            setSelectedInst(null);
        } catch (err) {
            console.error('Reset assignment error:', err);
            alert("Errore durante la rimozione dell'assegnazione.");
        } finally {
            setSaving(false);
        }
    };

    return {
        selectedInst,
        setSelectedInst,
        editData,
        setEditData,
        saving,
        deleteConfirm,
        setDeleteConfirm,
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
        handleRelink,
        handleResetAssignment,
    };
};
