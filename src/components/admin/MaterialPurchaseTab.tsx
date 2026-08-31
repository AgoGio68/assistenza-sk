import React, { useState, useEffect, useMemo } from 'react';
import { MaterialPurchase, Company, MaterialPurchaseStatus, InventoryItem } from '../../types';
import { MaterialPurchaseService } from '../../services/MaterialPurchaseService';
import { InventoryService } from '../../services/InventoryService';
import { useAuth } from '../../contexts/AuthContext';
import { AuditLogService } from '../../services/AuditLogService';
import {
    Plus,
    Trash2,
    Edit2,
    CheckCircle2,
    Clock,
    Search,
    Truck,
    X,
    Save,
    RotateCcw,
    Building2,
    PackagePlus,
    Boxes,
} from 'lucide-react';


interface MaterialPurchaseTabProps {
    companies?: Company[];
}

export const MaterialPurchaseTab: React.FC<MaterialPurchaseTabProps> = ({ companies = [] }) => {
    const { currentUser, userProfile, isSuperadmin, isAdmin } = useAuth();
    const [materials, setMaterials] = useState<MaterialPurchase[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters and search
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'arrived'>('all');

    // Selection state for mass operations
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Modal state for Add/Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MaterialPurchase | null>(null);

    // Modal state for Carica a Magazzino
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [loadingMaterialItem, setLoadingMaterialItem] = useState<MaterialPurchase | null>(null);
    const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
    const [loadTargetMode, setLoadTargetMode] = useState<'matched' | 'existing' | 'new'>('matched');
    const [selectedExistingItemId, setSelectedExistingItemId] = useState<string>('');
    const [matchedInventoryItem, setMatchedInventoryItem] = useState<InventoryItem | null>(null);
    const [customItemName, setCustomItemName] = useState('');
    const [customItemCode, setCustomItemCode] = useState('');
    const [customItemQty, setCustomItemQty] = useState<number | string>(1);
    const [customItemMinThreshold, setCustomItemMinThreshold] = useState<number>(1);
    const [customItemUnit, setCustomItemUnit] = useState('pz');
    const [isSubmittingLoad, setIsSubmittingLoad] = useState(false);


    // Form inputs
    const getTodayStr = () => new Date().toISOString().split('T')[0];
    const [description, setDescription] = useState('');
    const [quantity, setQuantity] = useState<number | string>(1);
    const [code, setCode] = useState('');
    const [orderDate, setOrderDate] = useState(getTodayStr());
    const [arrivalDate, setArrivalDate] = useState('');
    const [client, setClient] = useState('');

    const authorName = userProfile?.displayName || currentUser?.displayName || 'Amministratore';

    useEffect(() => {
        loadMaterials();
    }, []);

    const loadMaterials = async () => {
        setLoading(true);
        try {
            const data = await MaterialPurchaseService.fetchMaterials();
            setMaterials(data);
        } catch (err) {
            console.error('Errore nel caricamento dei materiali acquistati:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filtered materials
    const filteredMaterials = useMemo(() => {
        return materials.filter((item) => {
            // Status filter
            if (statusFilter !== 'all' && item.status !== statusFilter) {
                return false;
            }
            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchDesc = item.description.toLowerCase().includes(q);
                const matchCode = (item.code || '').toLowerCase().includes(q);
                const matchClient = (item.client || '').toLowerCase().includes(q);
                return matchDesc || matchCode || matchClient;
            }
            return true;
        });
    }, [materials, statusFilter, searchQuery]);

    // Stats
    const totalPending = useMemo(() => materials.filter((m) => m.status === 'pending').length, [materials]);
    const totalArrived = useMemo(() => materials.filter((m) => m.status === 'arrived').length, [materials]);

    const resetForm = () => {
        setDescription('');
        setQuantity(1);
        setCode('');
        setOrderDate(getTodayStr());
        setArrivalDate('');
        setClient('');
        setEditingItem(null);
    };

    const handleOpenAddModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (item: MaterialPurchase) => {
        setEditingItem(item);
        setDescription(item.description);
        setQuantity(item.quantity);
        setCode(item.code || '');
        setOrderDate(item.orderDate || getTodayStr());
        setArrivalDate(item.arrivalDate || '');
        setClient(item.client || '');
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            alert('La descrizione è obbligatoria.');
            return;
        }

        try {
            if (editingItem) {
                // Update
                await MaterialPurchaseService.updateMaterial(editingItem.id, {
                    description,
                    quantity: quantity || 1,
                    code,
                    orderDate,
                    arrivalDate,
                    client,
                });

                if (currentUser) {
                    AuditLogService.logAction({
                        userId: currentUser.uid,
                        userEmail: currentUser.email || '',
                        userName: authorName,
                        userRole: isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'user',
                        action: 'UPDATE',
                        resourceType: 'MATERIAL_PURCHASE',
                        resourceId: editingItem.id,
                        details: `${authorName} ha MODIFICATO il materiale in arrivo: "${description}"`,
                    });
                }
            } else {
                // Add new
                const newId = await MaterialPurchaseService.addMaterial({
                    description,
                    quantity: quantity || 1,
                    code,
                    orderDate,
                    arrivalDate,
                    client,
                });

                if (currentUser) {
                    AuditLogService.logAction({
                        userId: currentUser.uid,
                        userEmail: currentUser.email || '',
                        userName: authorName,
                        userRole: isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'user',
                        action: 'CREATE',
                        resourceType: 'MATERIAL_PURCHASE',
                        resourceId: newId,
                        details: `${authorName} ha REGISTRATO un nuovo materiale in arrivo: "${description}" (Cliente: ${client || 'N/D'})`,
                    });
                }
            }

            setIsModalOpen(false);
            resetForm();
            await loadMaterials();
        } catch (err) {
            console.error('Errore durante il salvataggio:', err);
            alert('Errore durante il salvataggio del materiale.');
        }
    };

    // Toggle single status (Conferma Arrivo / Ripristina)
    const handleToggleStatus = async (item: MaterialPurchase) => {
        const newStatus: MaterialPurchaseStatus = item.status === 'pending' ? 'arrived' : 'pending';
        const actionLabel = newStatus === 'arrived' ? "confermare l'arrivo di" : 'ripristinare a "In Arrivo"';

        if (
            newStatus === 'arrived' &&
            !window.confirm(`Vuoi confermare l'arrivo della merce:\n"${item.description}"?`)
        ) {
            return;
        }

        try {
            await MaterialPurchaseService.toggleArrivalStatus(item.id, item.status, authorName);

            if (currentUser) {
                AuditLogService.logAction({
                    userId: currentUser.uid,
                    userEmail: currentUser.email || '',
                    userName: authorName,
                    userRole: isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'user',
                    action: 'STATUS_CHANGE',
                    resourceType: 'MATERIAL_PURCHASE',
                    resourceId: item.id,
                    details: `${authorName} ha ${actionLabel} "${item.description}" (${item.status} -> ${newStatus})`,
                });
            }

            await loadMaterials();

            // Se è diventato 'arrived' e non è ancora a magazzino, proponi subito il carico
            if (newStatus === 'arrived' && !item.loadedToInventory) {
                const wantLoad = window.confirm(
                    `Merce "${item.description}" confermata come ARRIVATA!\n\nVuoi caricarla subito nel Magazzino ricambi?`
                );
                if (wantLoad) {
                    await handleOpenLoadInventory({ ...item, status: 'arrived' });
                }
            }
        } catch (err) {
            console.error('Errore nel cambio stato:', err);
            alert('Errore durante il cambio di stato.');
        }
    };

    // Apertura modal Carica a Magazzino
    const handleOpenLoadInventory = async (item: MaterialPurchase) => {
        setLoadingMaterialItem(item);
        setCustomItemName(item.description);
        setCustomItemCode(item.code || '');
        setCustomItemQty(item.quantity || 1);
        setCustomItemMinThreshold(1);
        setCustomItemUnit('pz');
        setIsSubmittingLoad(false);

        try {
            const allItems = await InventoryService.fetchItems();
            setInventoryList(allItems);

            const match = await InventoryService.findItemByCodeOrName(item.code, item.description);
            if (match) {
                setMatchedInventoryItem(match);
                setLoadTargetMode('matched');
                setSelectedExistingItemId(match.id || '');
            } else {
                setMatchedInventoryItem(null);
                setLoadTargetMode('new');
                setSelectedExistingItemId('');
            }
            setIsLoadModalOpen(true);
        } catch (err) {
            console.error('Errore durante il recupero articoli di magazzino:', err);
            alert('Impossibile verificare gli articoli di magazzino.');
        }
    };

    // Conferma esecuzione Carica a Magazzino
    const handleConfirmLoadInventory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loadingMaterialItem) return;
        const qtyNum = Number(customItemQty) || 1;
        if (qtyNum <= 0) {
            alert('La quantità da caricare deve essere maggiore di zero.');
            return;
        }

        setIsSubmittingLoad(true);
        try {
            let targetId: string | undefined = undefined;
            if (loadTargetMode === 'matched' && matchedInventoryItem?.id) {
                targetId = matchedInventoryItem.id;
            } else if (loadTargetMode === 'existing' && selectedExistingItemId) {
                targetId = selectedExistingItemId;
            }

            let codeToUse = customItemCode;
            let nameToUse = customItemName;

            if (loadTargetMode === 'new') {
                if (!customItemName.trim()) {
                    alert("Il nome dell'articolo è obbligatorio.");
                    setIsSubmittingLoad(false);
                    return;
                }
            }

            const result = await InventoryService.loadMaterialToInventory({
                code: codeToUse,
                description: nameToUse,
                quantity: qtyNum,
                client: loadingMaterialItem.client,
                userId: currentUser?.uid || 'admin',
                userName: authorName,
                targetItemId: targetId,
            });

            if (result.isNew && result.itemId) {
                await InventoryService.updateItem(result.itemId, {
                    minThreshold: customItemMinThreshold || 1,
                    unit: customItemUnit.trim() || 'pz',
                });
            }

            // Segna il materiale come caricato a magazzino
            await MaterialPurchaseService.markAsLoadedToInventory(loadingMaterialItem.id, result.itemId);

            // Audit log
            if (currentUser) {
                AuditLogService.logAction({
                    userId: currentUser.uid,
                    userEmail: currentUser.email || '',
                    userName: authorName,
                    userRole: isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'user',
                    action: 'UPDATE',
                    resourceType: 'INVENTORY_ITEM',
                    resourceId: result.itemId,
                    details: `${authorName} ha CARICATO a magazzino ${qtyNum} pz per "${result.itemName}" da acquisto merce (Nuova giacenza: ${result.newStock})`,
                });
            }

            alert(`✅ Materiale caricato con successo nel Magazzino!\n\nArticolo: ${result.itemName}\nQuantità caricata: +${qtyNum}\nNuova giacenza: ${result.newStock}`);
            setIsLoadModalOpen(false);
            setLoadingMaterialItem(null);
            await loadMaterials();
        } catch (err) {
            console.error('Errore durante il carico a magazzino:', err);
            alert('Errore durante il caricamento del materiale a magazzino.');
        } finally {
            setIsSubmittingLoad(false);
        }
    };


    // Delete single material
    const handleDeleteSingle = async (item: MaterialPurchase) => {
        if (!window.confirm(`Sei sicuro di voler ELIMINARE definitivamente questo materiale:\n"${item.description}"?`)) {
            return;
        }

        try {
            await MaterialPurchaseService.deleteMaterial(item.id);

            if (currentUser) {
                AuditLogService.logAction({
                    userId: currentUser.uid,
                    userEmail: currentUser.email || '',
                    userName: authorName,
                    userRole: isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'user',
                    action: 'DELETE',
                    resourceType: 'MATERIAL_PURCHASE',
                    resourceId: item.id,
                    details: `${authorName} ha ELIMINATO il materiale: "${item.description}"`,
                });
            }

            setSelectedIds((prev) => prev.filter((id) => id !== item.id));
            await loadMaterials();
        } catch (err) {
            console.error("Errore durante l'eliminazione:", err);
            alert("Errore durante l'eliminazione del materiale.");
        }
    };

    // Select/Deselect All
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredMaterials.map((m) => m.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    // Mass confirm arrived
    const handleMassConfirmArrived = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Confermare l'arrivo per i ${selectedIds.length} materiali selezionati?`)) return;

        try {
            for (const id of selectedIds) {
                const item = materials.find((m) => m.id === id);
                if (item && item.status === 'pending') {
                    await MaterialPurchaseService.confirmArrival(id, authorName);
                }
            }

            if (currentUser) {
                AuditLogService.logAction({
                    userId: currentUser.uid,
                    userEmail: currentUser.email || '',
                    userName: authorName,
                    userRole: isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'user',
                    action: 'STATUS_CHANGE',
                    resourceType: 'MATERIAL_PURCHASE',
                    details: `${authorName} ha CONFERMATO L'ARRIVO MASSIVO per ${selectedIds.length} materiali.`,
                });
            }

            setSelectedIds([]);
            await loadMaterials();
        } catch (err) {
            console.error("Errore nella conferma massiva:", err);
            alert("Errore durante la conferma massiva.");
        }
    };

    // Mass delete selected
    const handleMassDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`ELIMINARE DEFINITIVAMENTE i ${selectedIds.length} materiali selezionati?`)) return;

        try {
            await MaterialPurchaseService.deleteMultipleMaterials(selectedIds);

            if (currentUser) {
                AuditLogService.logAction({
                    userId: currentUser.uid,
                    userEmail: currentUser.email || '',
                    userName: authorName,
                    userRole: isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'user',
                    action: 'DELETE',
                    resourceType: 'MATERIAL_PURCHASE',
                    details: `${authorName} ha ELIMINATO ${selectedIds.length} materiali in blocco.`,
                });
            }

            setSelectedIds([]);
            await loadMaterials();
        } catch (err) {
            console.error("Errore nell'eliminazione massiva:", err);
            alert("Errore durante l'eliminazione massiva.");
        }
    };

    // Delete all arrived materials
    const handleDeleteAllArrived = async () => {
        const arrivedItems = materials.filter((m) => m.status === 'arrived');
        if (arrivedItems.length === 0) {
            alert('Nessun materiale con stato "Arrivato" da eliminare.');
            return;
        }

        if (
            !window.confirm(
                `Stai per eliminare TUTTI i ${arrivedItems.length} materiali contrassegnati come "ARRIVATI". Sei sicuro?`
            )
        ) {
            return;
        }

        try {
            const idsToDelete = arrivedItems.map((m) => m.id);
            await MaterialPurchaseService.deleteMultipleMaterials(idsToDelete);

            if (currentUser) {
                AuditLogService.logAction({
                    userId: currentUser.uid,
                    userEmail: currentUser.email || '',
                    userName: authorName,
                    userRole: isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'user',
                    action: 'DELETE',
                    resourceType: 'MATERIAL_PURCHASE',
                    details: `${authorName} ha ELIMINATO TUTTI I MATERIALI ARRIVATI (${arrivedItems.length} elementi).`,
                });
            }

            setSelectedIds([]);
            await loadMaterials();
        } catch (err) {
            console.error("Errore nell'eliminazione materiali arrivati:", err);
            alert("Errore durante l'eliminazione dei materiali arrivati.");
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header & Stats Bar */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'var(--bg-surface, #ffffff)',
                    padding: '1.25rem',
                    borderRadius: 'var(--border-radius, 12px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
            >
                <div>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                        <Truck size={24} style={{ color: 'var(--primary, #2563eb)' }} /> Acquisto Materiale
                    </h3>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                        Gestione e tracciamento dei materiali ordinati in arrivo per i clienti
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Badge In Arrivo */}
                    <div
                        onClick={() => setStatusFilter('pending')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            background: statusFilter === 'pending' ? '#fef3c7' : '#fffbeb',
                            border: '1px solid #fde68a',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: statusFilter === 'pending' ? 700 : 500,
                        }}
                    >
                        <Clock size={18} style={{ color: '#d97706' }} />
                        <span style={{ color: '#92400e', fontSize: '0.9rem' }}>
                            In Arrivo: <strong>{totalPending}</strong>
                        </span>
                    </div>

                    {/* Badge Arrivati */}
                    <div
                        onClick={() => setStatusFilter('arrived')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            background: statusFilter === 'arrived' ? '#dcfce7' : '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: statusFilter === 'arrived' ? 700 : 500,
                        }}
                    >
                        <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                        <span style={{ color: '#166534', fontSize: '0.9rem' }}>
                            Arrivati: <strong>{totalArrived}</strong>
                        </span>
                    </div>

                    {/* Button Nuovo Materiale */}
                    <button className="btn btn-primary" onClick={handleOpenAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={18} /> Nuovo Materiale
                    </button>
                </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-surface, #ffffff)',
                    padding: '1rem',
                    borderRadius: 'var(--border-radius, 12px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
            >
                {/* Search Bar */}
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Cerca per descrizione, codice o cliente..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.6rem 0.75rem 0.6rem 2.4rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            outline: 'none',
                            fontSize: '0.9rem',
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#94a3b8',
                            }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Status Filter Tabs */}
                <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`btn ${statusFilter === 'all' ? 'btn-primary' : ''}`}
                        style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.85rem',
                            borderRadius: '6px',
                            background: statusFilter === 'all' ? undefined : 'transparent',
                            color: statusFilter === 'all' ? undefined : '#475569',
                            border: 'none',
                        }}
                    >
                        Tutti ({materials.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('pending')}
                        className={`btn ${statusFilter === 'pending' ? 'btn-primary' : ''}`}
                        style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.85rem',
                            borderRadius: '6px',
                            background: statusFilter === 'pending' ? undefined : 'transparent',
                            color: statusFilter === 'pending' ? undefined : '#475569',
                            border: 'none',
                        }}
                    >
                        In Arrivo ({totalPending})
                    </button>
                    <button
                        onClick={() => setStatusFilter('arrived')}
                        className={`btn ${statusFilter === 'arrived' ? 'btn-primary' : ''}`}
                        style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.85rem',
                            borderRadius: '6px',
                            background: statusFilter === 'arrived' ? undefined : 'transparent',
                            color: statusFilter === 'arrived' ? undefined : '#475569',
                            border: 'none',
                        }}
                    >
                        Arrivati ({totalArrived})
                    </button>
                </div>

                {/* Batch Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedIds.length > 0 && (
                        <>
                            <button
                                onClick={handleMassConfirmArrived}
                                className="btn"
                                style={{
                                    background: '#16a34a',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    padding: '0.4rem 0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                }}
                            >
                                <CheckCircle2 size={16} /> Conferma Arrivo ({selectedIds.length})
                            </button>
                            <button
                                onClick={handleMassDeleteSelected}
                                className="btn btn-danger"
                                style={{
                                    fontSize: '0.85rem',
                                    padding: '0.4rem 0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                }}
                            >
                                <Trash2 size={16} /> Elimina Selezionati ({selectedIds.length})
                            </button>
                        </>
                    )}

                    {totalArrived > 0 && (
                        <button
                            onClick={handleDeleteAllArrived}
                            className="btn"
                            style={{
                                background: '#ef4444',
                                color: 'white',
                                fontSize: '0.85rem',
                                padding: '0.4rem 0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                            }}
                            title="Elimina in blocco tutte le merci arrivate"
                        >
                            <Trash2 size={16} /> Elimina Arrivati ({totalArrived})
                        </button>
                    )}
                </div>
            </div>

            {/* Table / List View */}
            <div
                style={{
                    background: 'var(--bg-surface, #ffffff)',
                    borderRadius: 'var(--border-radius, 12px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    overflowX: 'auto',
                }}
            >
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        Caricamento materiali in corso...
                    </div>
                ) : filteredMaterials.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <Truck size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                        <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Nessun materiale trovato</p>
                        <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            {searchQuery || statusFilter !== 'all'
                                ? 'Prova a modificare i filtri o la ricerca.'
                                : 'Clicca su "Nuovo Materiale" per inserire una nuova voce.'}
                        </p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead>
                            <tr
                                style={{
                                    background: '#f8fafc',
                                    borderBottom: '2px solid #e2e8f0',
                                    color: '#475569',
                                    fontWeight: 700,
                                }}
                            >
                                <th style={{ padding: '0.85rem 1rem', width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        checked={
                                            filteredMaterials.length > 0 &&
                                            filteredMaterials.every((m) => selectedIds.includes(m.id))
                                        }
                                        onChange={handleSelectAll}
                                        style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                                    />
                                </th>
                                <th style={{ padding: '0.85rem 1rem', width: '120px' }}>Stato</th>
                                <th style={{ padding: '0.85rem 1rem' }}>Descrizione</th>
                                <th style={{ padding: '0.85rem 1rem', width: '90px' }}>Q.tà</th>
                                <th style={{ padding: '0.85rem 1rem', width: '130px' }}>Codice</th>
                                <th style={{ padding: '0.85rem 1rem', width: '120px' }}>Data Ordine</th>
                                <th style={{ padding: '0.85rem 1rem', width: '120px' }}>Data Arrivo</th>
                                <th style={{ padding: '0.85rem 1rem' }}>Cliente</th>
                                <th style={{ padding: '0.85rem 1rem', width: '150px', textAlign: 'center' }}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMaterials.map((item) => {
                                const isArrived = item.status === 'arrived';
                                const isSelected = selectedIds.includes(item.id);

                                return (
                                    <tr
                                        key={item.id}
                                        style={{
                                            borderBottom: '1px solid #f1f5f9',
                                            background: isSelected
                                                ? '#eff6ff'
                                                : isArrived
                                                ? '#f0fdf4'
                                                : 'transparent',
                                            transition: 'background 0.15s ease',
                                        }}
                                    >
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectRow(item.id)}
                                                style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            {isArrived ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                                                    <span
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem',
                                                            background: '#dcfce7',
                                                            color: '#166534',
                                                            padding: '0.25rem 0.6rem',
                                                            borderRadius: '20px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            border: '1px solid #bbf7d0',
                                                        }}
                                                    >
                                                        <CheckCircle2 size={13} /> Arrivato
                                                    </span>
                                                    {item.loadedToInventory && (
                                                        <span
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem',
                                                                background: '#e0f2fe',
                                                                color: '#0369a1',
                                                                padding: '0.15rem 0.45rem',
                                                                borderRadius: '12px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 600,
                                                                border: '1px solid #bae6fd',
                                                            }}
                                                            title="Giacenza già caricata nel Magazzino ricambi"
                                                        >
                                                            <Boxes size={11} /> A Magazzino
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem',
                                                        background: '#fef3c7',
                                                        color: '#92400e',
                                                        padding: '0.25rem 0.6rem',
                                                        borderRadius: '20px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        border: '1px solid #fde68a',
                                                    }}
                                                >
                                                    <Clock size={13} /> In Arrivo
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                                            {item.description}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#334155' }}>
                                            {item.quantity}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#475569' }}>
                                            {item.code || '-'}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                                            {formatDate(item.orderDate)}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                                            {formatDate(item.arrivalDate)}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', color: '#0f172a', fontWeight: 500 }}>
                                            {item.client ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Building2 size={14} style={{ color: '#64748b' }} /> {item.client}
                                                </span>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                                                {/* Button Conferma / Ripristina */}
                                                <button
                                                    onClick={() => handleToggleStatus(item)}
                                                    className="btn"
                                                    style={{
                                                        padding: '0.4rem 0.6rem',
                                                        fontSize: '0.8rem',
                                                        background: isArrived ? '#e2e8f0' : '#16a34a',
                                                        color: isArrived ? '#475569' : 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                    }}
                                                    title={isArrived ? 'Ripristina a In Arrivo' : "Conferma Arrivo Merce"}
                                                >
                                                    {isArrived ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
                                                </button>

                                                {/* Button Carica a Magazzino (attivo solo per merce arrivata) */}
                                                {isArrived && (
                                                    <button
                                                        onClick={() => handleOpenLoadInventory(item)}
                                                        className="btn"
                                                        style={{
                                                            padding: '0.4rem 0.6rem',
                                                            fontSize: '0.8rem',
                                                            background: item.loadedToInventory ? '#f0f9ff' : '#0284c7',
                                                            color: item.loadedToInventory ? '#0369a1' : 'white',
                                                            border: item.loadedToInventory ? '1px solid #bae6fd' : 'none',
                                                            borderRadius: '6px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                        }}
                                                        title={
                                                            item.loadedToInventory
                                                                ? 'Già caricato a magazzino (clicca per ricaricare o modificare)'
                                                                : 'Carica quantità direttamente nel Magazzino ricambi'
                                                        }
                                                    >
                                                        <PackagePlus size={15} />
                                                    </button>
                                                )}

                                                {/* Button Modifica */}
                                                <button
                                                    onClick={() => handleOpenEditModal(item)}
                                                    className="btn"
                                                    style={{
                                                        padding: '0.4rem 0.6rem',
                                                        fontSize: '0.8rem',
                                                        background: '#f1f5f9',
                                                        color: '#334155',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '6px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                    }}
                                                    title="Modifica materiale"
                                                >
                                                    <Edit2 size={15} />
                                                </button>


                                                {/* Button Elimina */}
                                                <button
                                                    onClick={() => handleDeleteSingle(item)}
                                                    className="btn btn-danger"
                                                    style={{
                                                        padding: '0.4rem 0.6rem',
                                                        fontSize: '0.8rem',
                                                        borderRadius: '6px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                    }}
                                                    title="Elimina materiale"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Datalist per il suggerimento dei clienti/aziende */}
            <datalist id="company-suggestions">
                {companies.map((c) => (
                    <option key={c.id || c.name} value={c.name} />
                ))}
            </datalist>

            {/* Modal Aggiungi / Modifica Materiale */}
            {isModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '1rem',
                    }}
                >
                    <div
                        style={{
                            background: 'var(--bg-surface, #ffffff)',
                            borderRadius: 'var(--border-radius, 16px)',
                            padding: '1.75rem',
                            maxWidth: '540px',
                            width: '100%',
                            margin: 'auto',
                            boxSizing: 'border-box',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.25rem',
                        }}
                    >

                        {/* Header Modal */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Truck size={22} style={{ color: 'var(--primary, #2563eb)' }} />
                                {editingItem ? 'Modifica Materiale' : 'Nuovo Materiale in Arrivo'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    padding: '4px',
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Descrizione */}
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                                    Descrizione <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Es. Scheda elettronica SK-v2, Motore 24V..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.9rem',
                                    }}
                                />
                            </div>

                            {/* Q.tà & Codice (Row 2 cols) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                                        Q.tà <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.65rem 0.75rem',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.9rem',
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                                        Codice
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Es. COD-9842"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.65rem 0.75rem',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.9rem',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Data Ordine & Data Arrivo (Row 2 cols) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                                        Data Ordine
                                    </label>
                                    <input
                                        type="date"
                                        value={orderDate}
                                        onChange={(e) => setOrderDate(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.65rem 0.75rem',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.9rem',
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                                        Data Arrivo
                                    </label>
                                    <input
                                        type="date"
                                        value={arrivalDate}
                                        onChange={(e) => setArrivalDate(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.65rem 0.75rem',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.9rem',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Cliente */}
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                                    Cliente
                                </label>
                                <input
                                    type="text"
                                    placeholder="Seleziona o digita il nome del cliente"
                                    value={client}
                                    onChange={(e) => setClient(e.target.value)}
                                    list="company-suggestions"
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.9rem',
                                    }}
                                />
                            </div>

                            {/* Actions Modal */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn"
                                    style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                                >
                                    Annulla
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Save size={16} /> {editingItem ? 'Salva Modifiche' : 'Aggiungi Materiale'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Carica a Magazzino */}
            {isLoadModalOpen && loadingMaterialItem && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '1rem',
                    }}
                >
                    <div
                        style={{
                            background: 'var(--bg-surface, #ffffff)',
                            borderRadius: 'var(--border-radius, 16px)',
                            padding: '1.75rem',
                            maxWidth: '560px',
                            width: '100%',
                            margin: 'auto',
                            boxSizing: 'border-box',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.25rem',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                        }}
                    >

                        {/* Header Modal */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7' }}>
                                <Boxes size={22} /> Carica a Magazzino Ricambi
                            </h3>
                            <button
                                onClick={() => setIsLoadModalOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    padding: '4px',
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Riepilogo Materiale Arrivato */}
                        <div
                            style={{
                                background: '#f0f9ff',
                                border: '1px solid #bae6fd',
                                borderRadius: '10px',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.35rem',
                                fontSize: '0.875rem',
                            }}
                        >
                            <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.95rem' }}>
                                {loadingMaterialItem.description}
                            </div>
                            <div style={{ color: '#334155', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <span><b>Codice:</b> {loadingMaterialItem.code || 'N/D'}</span>
                                <span><b>Quantità arrivata:</b> {loadingMaterialItem.quantity} pz</span>
                                {loadingMaterialItem.client && (
                                    <span><b>Cliente:</b> {loadingMaterialItem.client}</span>
                                )}
                            </div>
                        </div>

                        {/* Form Scelta Destinazione Magazzino */}
                        <form onSubmit={handleConfirmLoadInventory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Opzione 1: Match rilevato */}
                            {matchedInventoryItem && (
                                <label
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.75rem',
                                        padding: '0.85rem',
                                        borderRadius: '8px',
                                        border: loadTargetMode === 'matched' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                                        background: loadTargetMode === 'matched' ? '#f0fdf4' : 'transparent',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="loadMode"
                                        checked={loadTargetMode === 'matched'}
                                        onChange={() => setLoadTargetMode('matched')}
                                        style={{ marginTop: '0.2rem' }}
                                    />
                                    <div style={{ flex: 1, fontSize: '0.875rem' }}>
                                        <div style={{ fontWeight: 700, color: '#166534' }}>
                                            ✓ Articolo corrispondente trovato in magazzino
                                        </div>
                                        <div style={{ color: '#1e293b', marginTop: '0.2rem' }}>
                                            <b>{matchedInventoryItem.name}</b> (Cod: {matchedInventoryItem.code || '-'})
                                        </div>
                                        <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                            Giacenza attuale: <b>{matchedInventoryItem.stock}</b> {matchedInventoryItem.unit || 'pz'} → Con carico: <b style={{ color: '#16a34a' }}>{matchedInventoryItem.stock + Number(customItemQty)}</b> {matchedInventoryItem.unit || 'pz'}
                                        </div>
                                    </div>
                                </label>
                            )}

                            {/* Opzione 2: Seleziona da lista esistente */}
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.75rem',
                                    padding: '0.85rem',
                                    borderRadius: '8px',
                                    border: loadTargetMode === 'existing' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                                    background: loadTargetMode === 'existing' ? '#f8fafc' : 'transparent',
                                    cursor: 'pointer',
                                }}
                            >
                                <input
                                    type="radio"
                                    name="loadMode"
                                    checked={loadTargetMode === 'existing'}
                                    onChange={() => setLoadTargetMode('existing')}
                                    style={{ marginTop: '0.2rem' }}
                                />
                                <div style={{ flex: 1, fontSize: '0.875rem' }}>
                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                        Seleziona un altro articolo già presente a magazzino
                                    </div>
                                    {loadTargetMode === 'existing' && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <select
                                                value={selectedExistingItemId}
                                                onChange={(e) => setSelectedExistingItemId(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    borderRadius: '6px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '0.85rem',
                                                }}
                                            >
                                                <option value="">-- Scegli un articolo dal magazzino --</option>
                                                {inventoryList.map((inv) => (
                                                    <option key={inv.id} value={inv.id}>
                                                        {inv.name} (Cod: {inv.code || '-'}) - Giacenza: {inv.stock} {inv.unit || 'pz'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </label>

                            {/* Opzione 3: Crea come nuovo articolo */}
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.75rem',
                                    padding: '0.85rem',
                                    borderRadius: '8px',
                                    border: loadTargetMode === 'new' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                                    background: loadTargetMode === 'new' ? '#f8fafc' : 'transparent',
                                    cursor: 'pointer',
                                }}
                            >
                                <input
                                    type="radio"
                                    name="loadMode"
                                    checked={loadTargetMode === 'new'}
                                    onChange={() => setLoadTargetMode('new')}
                                    style={{ marginTop: '0.2rem' }}
                                />
                                <div style={{ flex: 1, fontSize: '0.875rem' }}>
                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                        Crea come nuovo articolo a magazzino
                                    </div>
                                    {loadTargetMode === 'new' && (
                                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                                                    Nome Articolo <span style={{ color: '#ef4444' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customItemName}
                                                    onChange={(e) => setCustomItemName(e.target.value)}
                                                    required={loadTargetMode === 'new'}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                                                        Codice Articolo
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={customItemCode}
                                                        onChange={(e) => setCustomItemCode(e.target.value)}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                                                        Unità di misura
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={customItemUnit}
                                                        onChange={(e) => setCustomItemUnit(e.target.value)}
                                                        placeholder="pz, mt, kg..."
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                                                    Soglia Minima Sottoscorta
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={customItemMinThreshold}
                                                    onChange={(e) => setCustomItemMinThreshold(Number(e.target.value) || 0)}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </label>

                            {/* Quantità da caricare */}
                            <div style={{ marginTop: '0.25rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                                    Quantità da caricare a magazzino <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={customItemQty}
                                    onChange={(e) => setCustomItemQty(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                    }}
                                />
                            </div>

                            {/* Actions Modal Carico */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsLoadModalOpen(false)}
                                    className="btn"
                                    disabled={isSubmittingLoad}
                                    style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="btn"
                                    disabled={isSubmittingLoad || (loadTargetMode === 'existing' && !selectedExistingItemId)}
                                    style={{
                                        background: '#0284c7',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.65rem 1.25rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    {isSubmittingLoad ? (
                                        'Caricamento in corso...'
                                    ) : (
                                        <>
                                            <PackagePlus size={16} /> Conferma Carico (+{customItemQty || 1} {customItemUnit || 'pz'})
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

