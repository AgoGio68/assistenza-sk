import React from 'react';
import { Company } from '../../types';

interface CompanyManagementTabProps {
    companies: Company[];
    loadingCompanies: boolean;
    newCompany: { name: string; contactName: string; phone: string };
    setNewCompany: React.Dispatch<React.SetStateAction<{ name: string; contactName: string; phone: string }>>;
    editingCompanyId: string | null;
    setEditingCompanyId: React.Dispatch<React.SetStateAction<string | null>>;
    editForm: Partial<Company>;
    setEditForm: React.Dispatch<React.SetStateAction<Partial<Company>>>;
    onAddCompany: (e: React.FormEvent) => Promise<void>;
    onRemoveCompany: (id: string) => Promise<void>;
    onStartEditing: (comp: Company) => void;
    onSaveEdit: () => Promise<void>;
}

export const CompanyManagementTab: React.FC<CompanyManagementTabProps> = ({
    companies,
    loadingCompanies,
    newCompany,
    setNewCompany,
    editingCompanyId,
    setEditingCompanyId,
    editForm,
    setEditForm,
    onAddCompany,
    onRemoveCompany,
    onStartEditing,
    onSaveEdit
}) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            {/* Add Company Form */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Aggiungi Nuova Azienda</h3>
                <form onSubmit={onAddCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Nome Azienda / Ente"
                        value={newCompany.name}
                        onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                        required
                        style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid #cbd5e1' }}
                    />
                    <input
                        type="text"
                        placeholder="Nome Referente predefinito"
                        value={newCompany.contactName}
                        onChange={e => setNewCompany({ ...newCompany, contactName: e.target.value })}
                        style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid #cbd5e1' }}
                    />
                    <input
                        type="text"
                        placeholder="Telefono predefinito"
                        value={newCompany.phone}
                        onChange={e => setNewCompany({ ...newCompany, phone: e.target.value })}
                        style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid #cbd5e1' }}
                    />
                    <button type="submit" className="btn btn-primary">Salva Azienda</button>
                </form>
            </div>

            {/* Companies List */}
            <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                <h3 style={{ marginBottom: '1rem' }}>Lista Aziende in DB</h3>

                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--text-secondary)', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem 0' }}>Nome</th>
                            <th>Referente</th>
                            <th>Telefono</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingCompanies ? (
                            <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center' }}>Caricamento...</td></tr>
                        ) : companies.map(comp => (
                            <tr key={comp.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                                {editingCompanyId === comp.id ? (
                                    <>
                                        <td style={{ padding: '0.75rem 0' }}>
                                            <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ width: '100%', padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                        </td>
                                        <td>
                                            <input type="text" value={editForm.contactName || ''} onChange={e => setEditForm({ ...editForm, contactName: e.target.value })} style={{ width: '100%', padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                        </td>
                                        <td>
                                            <input type="text" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ width: '100%', padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={onSaveEdit} style={{ background: 'none', border: 'none', color: 'var(--success-color)', cursor: 'pointer', fontWeight: 'bold' }}>Salva</button>
                                                <button onClick={() => setEditingCompanyId(null)} style={{ background: 'none', border: 'none', color: 'var(--secondary-color)', cursor: 'pointer' }}>Annulla</button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ padding: '0.75rem 0', fontWeight: 'bold' }}>{comp.name}</td>
                                        <td>{comp.contactName}</td>
                                        <td>{comp.phone}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => onStartEditing(comp)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--secondary-color)', cursor: 'pointer', textDecoration: 'underline' }}
                                                >
                                                    Modifica
                                                </button>
                                                <button
                                                    onClick={() => { if (window.confirm('Sicuro di voler eliminare questa azienda?')) onRemoveCompany(comp.id!) }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', textDecoration: 'underline' }}
                                                >
                                                    Elimina
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
