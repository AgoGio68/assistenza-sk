import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';

export interface CollectionQuotaMetric {
    name: string;
    displayName: string;
    docCount: number;
    estimatedSizeKb: number;
    color: string;
}

export interface StorageQuotaSummary {
    totalDocuments: number;
    estimatedStorageMb: number;
    limitStorageMb: number;
    freeStorageMb: number;
    percentageUsed: number;
    isOver90Percent: boolean;
    statusLevel: 'normal' | 'warning' | 'critical';
    collections: CollectionQuotaMetric[];
    dailyReadsLimit: number;
    dailyWritesLimit: number;
    storageLimitGb: number;
    lastUpdated: number;
}

export const SPARK_LIMITS = {
    FIRESTORE_STORAGE_MB: 1024,      // 1 GiB storage totale
    STORAGE_FILES_GB: 5,             // 5 GB Storage foto / file
    DAILY_READS: 50000,              // 50k letture/giorno
    DAILY_WRITES: 20000,             // 20k scritture/giorno
    DAILY_DELETES: 20000,            // 20k cancellazioni/giorno
};

const COLLECTION_WEIGHTS: { name: string; displayName: string; avgKb: number; color: string }[] = [
    { name: 'tickets', displayName: 'Ticket Assistenza', avgKb: 3.5, color: '#3b82f6' },
    { name: 'ordini', displayName: 'Ordini & Fogli SK', avgKb: 2.2, color: '#10b981' },
    { name: 'ordini_s2', displayName: 'Ordini & Fogli S2', avgKb: 2.2, color: '#14b8a6' },
    { name: 'installation_data', displayName: 'Dati Installazioni', avgKb: 2.8, color: '#8b5cf6' },
    { name: 'inventory', displayName: 'Articoli Magazzino', avgKb: 1.8, color: '#f59e0b' },
    { name: 'inventory_movements', displayName: 'Registro Movimenti', avgKb: 1.5, color: '#f97316' },
    { name: 'material_purchases', displayName: 'Acquisti Materiali', avgKb: 1.6, color: '#06b6d4' },
    { name: 'activity_logs', displayName: 'Audit Log & Attività', avgKb: 2.0, color: '#64748b' },
    { name: 'collaudo_reports', displayName: 'Report Collaudi', avgKb: 4.0, color: '#ec4899' },
    { name: 'users', displayName: 'Profili Utenti', avgKb: 1.5, color: '#6366f1' },
    { name: 'companies', displayName: 'Anagrafica Aziende', avgKb: 1.2, color: '#84cc16' },
    { name: 'unita_sk', displayName: 'Unità SK & Matricole', avgKb: 1.4, color: '#a855f7' },
    { name: 'eventi_calendario', displayName: 'Eventi Calendario', avgKb: 1.8, color: '#eab308' },
];

export const StorageQuotaService = {
    async calculateQuota(): Promise<StorageQuotaSummary> {
        let totalDocs = 0;
        let totalEstimatedKb = 0;
        const collectionMetrics: CollectionQuotaMetric[] = [];

        await Promise.all(
            COLLECTION_WEIGHTS.map(async (colInfo) => {
                try {
                    const colRef = collection(db, colInfo.name);
                    const snap = await getCountFromServer(colRef);
                    const count = snap.data().count || 0;
                    const estimatedSizeKb = count * colInfo.avgKb;

                    totalDocs += count;
                    totalEstimatedKb += estimatedSizeKb;

                    collectionMetrics.push({
                        name: colInfo.name,
                        displayName: colInfo.displayName,
                        docCount: count,
                        estimatedSizeKb: Math.round(estimatedSizeKb * 10) / 10,
                        color: colInfo.color,
                    });
                } catch (err) {
                    console.warn(`[StorageQuotaService] Errore conteggio ${colInfo.name}:`, err);
                    collectionMetrics.push({
                        name: colInfo.name,
                        displayName: colInfo.displayName,
                        docCount: 0,
                        estimatedSizeKb: 0,
                        color: colInfo.color,
                    });
                }
            })
        );

        collectionMetrics.sort((a, b) => b.estimatedSizeKb - a.estimatedSizeKb);

        const estimatedStorageMb = Math.round((totalEstimatedKb / 1024) * 100) / 100;
        const limitStorageMb = SPARK_LIMITS.FIRESTORE_STORAGE_MB;
        const freeStorageMb = Math.max(0, Math.round((limitStorageMb - estimatedStorageMb) * 100) / 100);
        const percentageUsed = Math.min(100, Math.round((estimatedStorageMb / limitStorageMb) * 10000) / 100);

        let statusLevel: 'normal' | 'warning' | 'critical' = 'normal';
        if (percentageUsed >= 90) {
            statusLevel = 'critical';
        } else if (percentageUsed >= 75) {
            statusLevel = 'warning';
        }

        return {
            totalDocuments: totalDocs,
            estimatedStorageMb,
            limitStorageMb,
            freeStorageMb,
            percentageUsed,
            isOver90Percent: percentageUsed >= 90,
            statusLevel,
            collections: collectionMetrics,
            dailyReadsLimit: SPARK_LIMITS.DAILY_READS,
            dailyWritesLimit: SPARK_LIMITS.DAILY_WRITES,
            storageLimitGb: SPARK_LIMITS.STORAGE_FILES_GB,
            lastUpdated: Date.now(),
        };
    },
};
