const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'pages', 'Installations.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// The new imports we need to add:
const newImports = `
import { useInstallations } from '../hooks/useInstallations';
import { useInstallationActions } from '../hooks/useInstallationActions';
`;

// Insert them after the existing imports but before interface InstallationsProps
const injectImportsIdx = content.indexOf('interface InstallationsProps');
content = content.slice(0, injectImportsIdx) + newImports + content.slice(injectImportsIdx);

// Now, we find the start of the component body
const compStartStr = "export const Installations: React.FC<InstallationsProps> = ({ section = 'sk' }) => {";
const compStartIdx = content.indexOf(compStartStr) + compStartStr.length;

// And we find the end of the logic block to replace, which is right before:
// const filteredInstallations = [...installations].filter((inst: Installation) => {
const targetEndStr = "const filteredInstallations = [...installations].filter((inst: Installation) => {";
const compEndIdx = content.indexOf(targetEndStr);

const newLogicBlock = `
    const [usageModal, setUsageModal] = useState<{ isOpen: boolean; instId: string; clientName: string }>({
        isOpen: false,
        instId: '',
        clientName: '',
    });

    const { settings } = useSettings();
    const { isSuperadmin, isAdmin, googleToken, connectGoogle } = useAuth();
    
    // UI Local State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortVerifiedAtBottom, setSortVerifiedAtBottom] = useState(true);

    const fieldConfig =
        section === 's2'
            ? (settings as any).section2InstallationsFields || {}
            : {
                  showModelSK: true,
                  showSerialSK: true,
                  showOrderNumber: true,
                  showOrderDfv: true,
                  showPlanning: true,
                  showModules: true,
                  showExtractedNotes: true,
                  showTechnicalNotes: true,
              };

    // --- custom hooks ---
    const {
        installations,
        orphanedData,
        loading,
        error,
        dbData,
        generateSemanticId,
        loadSheetData,
        handleHardResetDB
    } = useInstallations(section, settings, isSuperadmin);

    const {
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
        handleRelink
    } = useInstallationActions(section, settings, googleToken, isAdmin, isSuperadmin, generateSemanticId);

    const getCardColor = (inst: Installation) => {
        if (inst.isInvoiced) return '#94a3b8';
        if (inst.tested) return 'var(--success-color)';
        if (inst.toTest) return '#facc15';
        return 'var(--secondary-color)';
    };

    const getGlowType = (inst: Installation): 'orange' | 'yellow' | 'green' | null => {
        if (inst.isInvoiced) return null;
        const firestoreData = inst._firestoreId ? dbData[inst._firestoreId] : null;
        const tested = firestoreData?.tested ?? inst.tested;
        const toTest = firestoreData?.toTest ?? inst.toTest;
        const sDateStr = firestoreData?.scheduledDate || inst.scheduledDate;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const parseAnyDate = (dateStr: string | undefined): Date | null => {
            if (!dateStr) return null;
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    let y = parseInt(parts[0]);
                    if (y < 100) y += 2000;
                    return new Date(y, parseInt(parts[1]) - 1, parseInt(parts[2]));
                }
            }
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const d = parseInt(parts[0]);
                    const m = parseInt(parts[1]);
                    let y = parseInt(parts[2]);
                    if (y < 100) y += 2000;
                    return new Date(y, m - 1, d);
                }
            }
            return null;
        };

        if (tested) return 'green';
        if (toTest) return 'yellow';
        const sDate = parseAnyDate(sDateStr);
        if (sDate && sDate >= now) return 'orange';

        return null;
    };

    `;

content = content.slice(0, compStartIdx) + newLogicBlock + content.slice(compEndIdx);

// Fix onClick that passes parameters differently if needed
content = content.replace(
    /onClick=\{\(\) => handleRelink\(orphan\._firestoreId!, relinkTargetId\)\}/g,
    "onClick={() => handleRelink(orphan._firestoreId!, relinkTargetId, orphanedData)}"
);
content = content.replace(
    /onClick=\{handleHardResetDB\}/g,
    "onClick={() => handleHardResetDB(activeInstallations)}"
);
content = content.replace(
    /onClick=\{handleAddEventToCalendar\}/g,
    "onClick={() => handleAddEventToCalendar(connectGoogle)}"
);
// Now we write it back
fs.writeFileSync(targetPath, content, 'utf8');
console.log('Refactoring complete via node script.');
