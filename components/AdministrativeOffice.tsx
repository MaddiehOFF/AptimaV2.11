import React, { useState, useEffect, useRef } from 'react';
import { User, OfficeDocument, AdminTask, UserActivityLog, CalendarEvent, OvertimeRecord, AbsenceRecord, CashShift, Employee, OfficeDocAttachment, InventorySession, InternalMessage, SanctionRecord, EmployeeNotice, ChecklistSnapshot, BudgetRequest, View, OfficeStickyNote } from '../types';
import { supabase } from '../supabaseClient';
import { FileText, Plus, Search, Trash2, Save, ArrowLeft, Download, File, User as UserIcon, Sparkles, FolderOpen, PenTool, Users, X, Share2, Briefcase, Clock, Send, CheckCircle2, LayoutDashboard, Calendar as CalendarIcon, Paperclip, Bot, Image, Bell, RotateCcw, AlertTriangle, StickyNote, Mail, MoreHorizontal, GripHorizontal, AlignLeft, AlignCenter, AlignRight, AlignJustify, Indent, Outdent, Type, Minus } from 'lucide-react';
import jsPDF from 'jspdf';
import { playSound } from '../utils/soundUtils';
import { AdminHub } from './AdminHub';
import { CalendarWidget } from './widgets/CalendarWidget';
import { CatWidget } from './widgets/CatWidget';

import { generateDocumentStructure } from '../services/geminiService';
import { UserProfileModal } from './UserProfileModal';
import { generateUUID } from '../utils/uuid';
import { ConfirmationModal } from './common/ConfirmationModal';

// MODULE_NAMES_ES Constant moved outside component
const MODULE_NAMES_ES: Record<string, string> = {
    'OFFICE': 'Oficina',
    'DASHBOARD': 'Panel General',
    'EMPLOYEES': 'Empleados',
    'SETTINGS': 'Configuración',
    'ADMIN_HUB': 'Central Administrativa',
    'PAYROLL': 'Pagos y Nómina',
    'SUPPLIERS': 'Insumos',
    'FINANCE': 'Finanzas',
    'OVERTIME': 'Horas Extra',
    'FILES': 'Legajos',
    'SANCTIONS': 'Sanciones',
    'USERS': 'Usuarios',
    'FORUM': 'Foro',
    'INTERNAL_MAIL': 'Mensajería',
    'AI_REPORT': 'Informe IA',
    'MEMBER_CALENDAR': 'Mi Agenda',
    'MEMBER_TASKS': 'Mis Tareas',
    'MEMBER_FILE': 'Mi Legajo',
    'MEMBER_FORUM': 'Foro Equipo',
    'INVENTORY': 'Inventario',
    'CASH_REGISTER': 'Caja'
};

interface AdministrativeOfficeProps {
    currentUser: User;
    users?: User[];
    tasks?: AdminTask[];
    setTasks?: React.Dispatch<React.SetStateAction<AdminTask[]>>;
    activityLogs?: UserActivityLog[];
    onComposeMessage?: (userId: string) => void;
    // Calendar Props
    calendarEvents?: CalendarEvent[];
    onAddCalendarEvent?: (event: CalendarEvent) => void;
    onDeleteEvent?: (id: string) => void;
    records?: OvertimeRecord[];
    absences?: AbsenceRecord[];
    holidays?: string[];
    employees?: Employee[];
    cashShifts?: CashShift[];
    inventorySessions?: InventorySession[];
    // Widget Data
    internalMessages?: InternalMessage[];
    sanctions?: SanctionRecord[];
    employeeNotices?: EmployeeNotice[];
    checklistSnapshots?: ChecklistSnapshot[];
    budgetRequests?: BudgetRequest[];
    // Notes
    officeNotes?: OfficeStickyNote[];
    onAddOfficeNote?: (note: OfficeStickyNote) => Promise<void>;
    onUpdateOfficeNote?: (note: OfficeStickyNote) => Promise<void>;
    onRemoveOfficeNote?: (id: string) => Promise<void>;
    // Documents (Lifted)
    documents: OfficeDocument[];
    setDocuments: (newValOrFn: OfficeDocument[] | ((prev: OfficeDocument[]) => OfficeDocument[])) => Promise<void>;
}

export const AdministrativeOffice: React.FC<AdministrativeOfficeProps> = ({
    currentUser,
    users = [],
    tasks = [],
    setTasks,
    activityLogs = [],
    onComposeMessage,
    calendarEvents = [],
    onAddCalendarEvent,
    onDeleteEvent,
    records = [],
    absences = [],
    holidays = [],
    employees = [],
    cashShifts = [],
    inventorySessions = [],
    internalMessages = [],
    sanctions = [],
    employeeNotices = [],
    checklistSnapshots = [],
    budgetRequests = [],
    officeNotes = [],
    onAddOfficeNote,
    onUpdateOfficeNote,
    onRemoveOfficeNote,
    documents,
    setDocuments
}) => {


    // Component State
    const [viewMode, setViewMode] = useState<'DOCS' | 'TEAM' | 'CENTRAL'>('DOCS');
    const [activeDocId, setActiveDocId] = useState<string | null>(null);
    const [selectedPeer, setSelectedPeer] = useState<User | null>(null);
    const [trashView, setTrashView] = useState(false);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
        confirmText?: string;
        cancelText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { },
    });

    // Editor State
    const [editorTitle, setEditorTitle] = useState('');
    const [editorContent, setEditorContent] = useState('');
    const [editorAttachments, setEditorAttachments] = useState<OfficeDocAttachment[]>([]);

    // Editor Ref for direct DOM manipulation (Images, Focus)
    const editorRef = useRef<HTMLDivElement>(null);



    // Sharing State
    const [docFilter, setDocFilter] = useState<'MINE' | 'SHARED'>('MINE');
    const [showPublicEvents, setShowPublicEvents] = useState(true);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareSelectedUsers, setShareSelectedUsers] = useState<string[]>([]);

    // Attachment State
    const [showAttachmentModal, setShowAttachmentModal] = useState(false);
    const [attachmentTab, setAttachmentTab] = useState<'INVENTORY' | 'CASH' | 'CALENDAR'>('INVENTORY');
    const [selectedAttachmentDetail, setSelectedAttachmentDetail] = useState<OfficeDocAttachment | null>(null);

    // AI Coach State
    const [showAICoach, setShowAICoach] = useState(false);
    const [aiIntent, setAiIntent] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    // Calendar Resizing State
    const [calendarHeight, setCalendarHeight] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sushiblack_calendar_height');
            return saved ? parseInt(saved) : 600;
        }
        return 600;
    });

    // Office Cat State - Migrated to CatWidget
    // Keeping visibility persistence here

    // Cat Visibility
    const [catHidden, setCatHidden] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sushiblack_office_cat_hidden');
            return saved ? JSON.parse(saved) : false;
        }
        return false;
    });




    // Notes State
    const [showNoteCreator, setShowNoteCreator] = useState(false);
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [newNoteColor, setNewNoteColor] = useState('yellow');

    const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());

    const currentDoc = documents.find(d => d.id === activeDocId);

    // Initial Load of Content into Ref
    useEffect(() => {
        if (editorRef.current && currentDoc) {
            // Check if content mismatch to avoid loop, though mostly for initial load of new doc
            if (editorRef.current.innerHTML !== currentDoc.content) {
                editorRef.current.innerHTML = currentDoc.content || '';
            }
        }
    }, [currentDoc?.id]); // Only re-run when changing docs

    const handleInsertImage = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result && editorRef.current) {
                const imgTag = `<img src="${e.target.result}" style="max-width: 100%; resize: both; overflow: auto; display: inline-block; border: 1px dashed transparent;" class="hover:border-gray-300" />`;

                // Append to end as requested
                editorRef.current.innerHTML += `<div class="my-2">${imgTag}</div>`;

                // Trigger Input event manually to update state
                setEditorContent(editorRef.current.innerHTML);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find(f => f.type.startsWith('image/'));

        if (imageFile) {
            handleInsertImage(imageFile);
        }
    };

    // Filtered Content
    const myDocs = documents.filter(d => d.authors?.includes(currentUser.id) && d.status !== 'TRASHED');
    const sharedDocs = documents.filter(d => d.sharedWith?.includes(currentUser.id) && d.status !== 'TRASHED');
    const trashedDocs = documents.filter(d => d.authors?.includes(currentUser.id) && d.status === 'TRASHED');

    const myNotes = officeNotes.filter(n => n.authorId === currentUser.id);

    // Notifications Logic
    const unreadSharedCount = sharedDocs.filter(d => !d.readBy?.includes(currentUser.id)).length;

    useEffect(() => {
        if (viewMode === 'DOCS' && !activeDocId && !trashView && docFilter === 'MINE' && myDocs.length > 0) {
            handleSelectDoc(myDocs[0]);
        }
    }, [viewMode, activeDocId, trashView, docFilter, myDocs.length]);

    // Safety Check Helper
    const executeWithUnsavedCheck = (action: () => void) => {
        if (!activeDocId || !currentDoc) {
            action();
            return;
        }

        // Normalize content for comparison (handle potential nulls/undefined)
        const currentTitle = currentDoc.title || '';
        const currentContent = currentDoc.content || '';
        const currentAttachments = currentDoc.attachments || [];

        const hasChanges =
            editorTitle !== currentTitle ||
            editorContent !== currentContent ||
            JSON.stringify(editorAttachments) !== JSON.stringify(currentAttachments);

        if (hasChanges) {
            setConfirmModal({
                isOpen: true,
                title: '¿Cambios sin guardar?',
                message: 'Tienes cambios sin guardar. ¿Quieres salir y perder los cambios?',
                type: 'warning',
                confirmText: 'SÍ, SALIR',
                onConfirm: action
            });
        } else {
            action();
        }
    };

    const handleNewDoc = () => {
        executeWithUnsavedCheck(() => {
            const draftDoc: OfficeDocument = {
                id: 'draft-' + Date.now(),
                title: 'Nuevo Documento',
                type: 'DOC',
                content: '',
                authors: [currentUser.id],
                status: 'DRAFT',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                sharedWith: [],
                readBy: [currentUser.id],
                attachments: []
            };
            setDocuments([draftDoc, ...documents]);
            setActiveDocId(draftDoc.id);
            setEditorTitle('Nuevo Documento');
            setEditorContent('');
            setEditorAttachments([]);
            setViewMode('DOCS');
            setDocFilter('MINE');
            setTrashView(false);
        });
    };

    const handleSelectDoc = async (doc: OfficeDocument) => {
        if (doc.id === activeDocId) return; // Prevent re-select same doc

        executeWithUnsavedCheck(async () => {
            if (doc.status === 'TRASHED' && !trashView) return;

            setActiveDocId(doc.id);
            setEditorTitle(doc.title);
            setEditorContent(doc.content);
            setEditorAttachments(doc.attachments || []);
            setShareSelectedUsers(doc.sharedWith || []);

            if (viewMode !== 'DOCS') setViewMode('DOCS');

            if (doc.sharedWith?.includes(currentUser.id) && !doc.authors.includes(currentUser.id) && !doc.readBy?.includes(currentUser.id)) {
                const newReadBy = [...(doc.readBy || []), currentUser.id];
                setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, readBy: newReadBy } : d));
                if (!doc.id.startsWith('draft-')) {
                    const updatedDoc = { ...doc, readBy: newReadBy };
                    await supabase.from('office_documents').update({ data: updatedDoc }).eq('id', doc.id);
                }
            }
        });
    };

    const handleSave = async () => {
        if (currentDoc?.status === 'TRASHED') {
            alert('No puedes editar un documento en la papelera. Restáuralo primero.');
            return;
        }

        if (!editorTitle.trim()) {
            alert('El documento debe tener un título.');
            return;
        }

        try {
            const isDraft = activeDocId?.startsWith('draft-');
            const docId = isDraft ? generateUUID() : (activeDocId || generateUUID());

            const docData: Partial<OfficeDocument> = {
                title: editorTitle,
                content: editorContent,
                type: 'DOC',
                status: currentDoc ? currentDoc.status : 'PUBLISHED',
                updatedAt: new Date().toISOString(),
                authors: currentDoc ? (currentDoc.authors || [currentUser.id]) : [currentUser.id],
                sharedWith: currentDoc ? (currentDoc.sharedWith || []) : [],
                readBy: currentDoc ? (currentDoc.readBy || [currentUser.id]) : [currentUser.id],
                attachments: editorAttachments
            };

            const dbData = { ...docData, id: docId };

            if (!isDraft && activeDocId) {
                const { error } = await supabase.from('office_documents').update({ data: dbData, updated_at: new Date().toISOString() }).eq('id', activeDocId);
                if (error) throw error;
                setDocuments(prev => prev.map(d => d.id === activeDocId ? { ...d, ...docData, updatedAt: new Date().toISOString() } as OfficeDocument : d));
            } else {
                const newDocFull = { ...dbData, id: docId, createdAt: new Date().toISOString(), tags: [], pinned: false } as OfficeDocument;
                const { error } = await supabase.from('office_documents').insert([{ id: docId, data: newDocFull, updated_at: new Date().toISOString() }]);
                if (error) throw error;
                setDocuments(prev => [newDocFull, ...prev.filter(d => d.id !== activeDocId)]);
                setActiveDocId(docId);
            }
            playSound('SUCCESS');
        } catch (err) {
            console.error('Error saving doc', err);
            playSound('ERROR');
            alert('Error al guardar documento');
        }
    };

    const handleTrashDoc = async (doc: OfficeDocument, e: React.MouseEvent) => {
        e.stopPropagation();
        if (doc.sharedWith?.includes(currentUser.id) && !doc.authors.includes(currentUser.id)) {
            alert('No puedes eliminar documentos compartidos por otros.');
            return;
        }
        setConfirmModal({
            isOpen: true,
            title: '¿Mover a papelera?',
            message: 'El documento se moverá a la papelera.',
            type: 'warning',
            confirmText: 'MOVER',
            onConfirm: async () => {
                try {
                    if (doc.id.startsWith('draft-')) {
                        setDocuments(prev => prev.filter(d => d.id !== doc.id));
                        if (activeDocId === doc.id) setActiveDocId(null);
                        return;
                    }
                    const updatedDoc = { ...doc, status: 'TRASHED', updatedAt: new Date().toISOString() };
                    await supabase.from('office_documents').update({ data: updatedDoc }).eq('id', doc.id);
                    setDocuments(prev => prev.map(d => d.id === doc.id ? updatedDoc as OfficeDocument : d));
                    if (activeDocId === doc.id) setActiveDocId(null);
                    playSound('CLICK');
                } catch (error) {
                    console.error(error);
                    alert('Error al mover a papelera');
                }
            }
        });
    };

    const handleRestoreDoc = async (doc: OfficeDocument, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const updatedDoc = { ...doc, status: 'PUBLISHED', updatedAt: new Date().toISOString() };
            await supabase.from('office_documents').update({ data: updatedDoc }).eq('id', doc.id);
            setDocuments(prev => prev.map(d => d.id === doc.id ? updatedDoc as OfficeDocument : d));
            playSound('SUCCESS');
        } catch (error) {
            console.error(error);
            alert('Error al restaurar');
        }
    };

    const handleEmptyTrash = async () => {
        setConfirmModal({
            isOpen: true,
            title: '¿VACIAR PAPELERA?',
            message: '¿ELIMINAR DEFINITIVAMENTE todos los documentos de la papelera? Esta acción no se puede deshacer.',
            type: 'danger',
            confirmText: 'SÍ, ELIMINAR TODO',
            onConfirm: async () => {
                const idsToDelete = trashedDocs.map(d => d.id);
                if (idsToDelete.length === 0) return;
                try {
                    const { error } = await supabase.from('office_documents').delete().in('id', idsToDelete);
                    if (error) throw error;
                    setDocuments(prev => prev.filter(d => !idsToDelete.includes(d.id)));
                    if (activeDocId && idsToDelete.includes(activeDocId)) setActiveDocId(null);
                    playSound('CLICK');
                } catch (error) {
                    console.error(error);
                    alert('Error al vaciar papelera');
                }
            }
        });
    };

    const handleShare = async () => {
        if (!currentDoc || currentDoc.id.startsWith('draft-')) {
            alert('Guarda el documento antes de compartirlo.');
            return;
        }
        try {
            const updatedDoc = { ...currentDoc, sharedWith: shareSelectedUsers, updatedAt: new Date().toISOString() };
            const { error } = await supabase.from('office_documents').update({ data: updatedDoc, updated_at: new Date().toISOString() }).eq('id', currentDoc.id);
            if (error) throw error;

            const oldShares = currentDoc.sharedWith || [];
            const newShares = shareSelectedUsers.filter(id => !oldShares.includes(id));

            for (const userId of newShares) {
                const newMsg = {
                    id: generateUUID(),
                    senderId: currentUser.id,
                    recipientIds: [userId],
                    subject: `Documento Compartido: ${currentDoc.title}`,
                    content: `${currentUser.name} te ha compartido el documento "${currentDoc.title}".`,
                    date: new Date().toISOString(),
                    readBy: [],
                    attachments: [],
                    isSystem: true
                };
                await supabase.from('internal_messages').insert([{ id: newMsg.id, data: newMsg }]);
            }
            playSound('SUCCESS');
            setDocuments(prev => prev.map(d => d.id === currentDoc.id ? updatedDoc : d));
            setShowShareModal(false);
        } catch (err) {
            console.error(err);
            playSound('ERROR');
            alert('Error al compartir');
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        doc.setFillColor(20, 20, 20);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);

        // Fixed Title Clipping
        const titleLines = doc.splitTextToSize(editorTitle, 180);
        doc.text(titleLines, 10, 20);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleDateString()} por ${currentUser.name}`, 10, 37);

        let yPos = 50;

        doc.setFontSize(12);
        const splitText = doc.splitTextToSize(editorContent, 180);
        doc.text(splitText, 15, yPos);
        yPos += (splitText.length * 7) + 20;

        if (editorAttachments.length > 0) {
            if (yPos > 250) { doc.addPage(); yPos = 20; }
            doc.setFontSize(16);
            doc.setTextColor(212, 175, 55);
            doc.text("ADJUNTOS EXPANDIDOS", 15, yPos);
            doc.line(15, yPos + 2, 195, yPos + 2);
            yPos += 15;

            editorAttachments.forEach(att => {
                if (yPos > 240) { doc.addPage(); yPos = 20; }
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                doc.setFont("helvetica", "bold");
                doc.text(`• ${att.label}`, 15, yPos);
                yPos += 7;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.setTextColor(80, 80, 80);
                doc.text(`Fecha Registro: ${att.date} | Módulo: ${att.module}`, 20, yPos);
                yPos += 8;

                if (att.data) {
                    const dataStr = Object.entries(att.data).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`).join(' | ');
                    const splitData = doc.splitTextToSize(dataStr, 170);
                    doc.setFont("courier", "normal");
                    doc.text(splitData, 20, yPos);
                    yPos += (splitData.length * 5) + 10;
                } else {
                    yPos += 5;
                }
            });
        }
        doc.save(`${editorTitle.replace(/\s+/g, '_')}_Aptima.pdf`);
    };

    const handleAddAttachment = (attachment: OfficeDocAttachment) => {
        setEditorAttachments(prev => [...prev, attachment]);
        setShowAttachmentModal(false);
        playSound('SUCCESS');
    };

    const handleRunAICoach = async () => {
        if (!aiIntent.trim()) return;
        setAiLoading(true);
        try {
            const result = await generateDocumentStructure(aiIntent);
            setEditorContent(prev => prev ? prev + '\n\n' + result : result);
            setShowAICoach(false);
            setAiIntent('');
            playSound('SUCCESS');
        } catch (error) {
            console.error(error);
            alert('Error al consultar IA');
        } finally {
            setAiLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

        try {
            const newNote: OfficeStickyNote = {
                id: generateUUID(),
                authorId: currentUser.id,
                title: newNoteTitle,
                content: newNoteContent,
                color: newNoteColor,
                date: new Date().toISOString()
            };
            if (onAddOfficeNote) await onAddOfficeNote(newNote);
            setShowNoteCreator(false);
            setNewNoteTitle('');
            setNewNoteContent('');
            playSound('SUCCESS');
        } catch (e) { console.error(e); }
    };

    const handleResizeCalendar = (e: React.MouseEvent) => {
        const startY = e.clientY;
        const startHeight = calendarHeight;

        const doDrag = (ev: MouseEvent) => {
            const newHeight = startHeight + (ev.clientY - startY);
            if (newHeight > 300 && newHeight < 1200) {
                setCalendarHeight(newHeight);
            }
        };

        const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
            localStorage.setItem('sushiblack_calendar_height', calendarHeight.toString());
        };

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    };




    // UI Renders


    const renderShareModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1e1e2d] w-full max-w-sm rounded-xl shadow-2xl p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-sushi-gold" />
                    Compartir Documento
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-2 mb-6 pr-2">
                    {users.filter(u => u.id !== currentUser.id).map(user => (
                        <div
                            key={user.id}
                            onClick={() => {
                                setShareSelectedUsers(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]);
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${shareSelectedUsers.includes(user.id) ? 'bg-sushi-gold/20' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-white">{user.name}</span>
                            </div>
                            {shareSelectedUsers.includes(user.id) && <CheckCircle2 className="w-4 h-4 text-sushi-gold" />}
                        </div>
                    ))}
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowShareModal(false)} className="flex-1 py-2 text-gray-500 hover:text-white">Cancelar</button>
                    <button onClick={handleShare} className="flex-1 bg-sushi-gold text-sushi-black font-bold py-2 rounded-lg">Confirmar</button>
                </div>
            </div>
        </div>
    );

    const renderAICoachModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white dark:bg-[#1e1e2d] w-full max-w-lg rounded-xl shadow-2xl p-6 border border-sushi-gold/20">
                <div className="flex items-center gap-3 mb-6">
                    <Bot className="w-8 h-8 text-sushi-gold" />
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Coach de Escritura IA</h3>
                        <p className="text-xs text-gray-400">Te ayudo a estructurar tus ideas.</p>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg mb-4">
                    <textarea
                        value={aiIntent}
                        onChange={(e) => setAiIntent(e.target.value)}
                        placeholder="Ej: Un informe sobre el ausentismo del mes de marzo..."
                        className="w-full h-24 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-md p-3 text-sm outline-none focus:border-sushi-gold text-white placeholder-gray-500"
                    />
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowAICoach(false)} className="px-4 py-2 text-gray-500 hover:text-white">Cancelar</button>
                    <button
                        onClick={handleRunAICoach}
                        disabled={aiLoading}
                        className="flex-1 bg-sushi-gold text-sushi-black font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-sushi-goldhover disabled:opacity-50"
                    >
                        {aiLoading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {aiLoading ? 'Generando Estructura...' : 'Generar Estructura'}
                    </button>
                </div>
            </div>
        </div>
    );

    const renderAttachmentModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
            {/* ... SAME AS BEFORE ... Copied for brevity but included in output */}
            <div className="bg-white dark:bg-[#1e1e2d] w-full max-w-2xl rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Paperclip className="w-5 h-5 text-sushi-gold" />
                        Adjuntar Historial
                    </h3>
                    <button onClick={() => setShowAttachmentModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-white/5 pb-2">
                    <button onClick={() => setAttachmentTab('INVENTORY')} className={`text-sm px-3 py-1 rounded-md transition-colors ${attachmentTab === 'INVENTORY' ? 'bg-sushi-gold text-sushi-black font-bold' : 'text-gray-500 hover:text-white'}`}>Inventario</button>
                    <button onClick={() => setAttachmentTab('CASH')} className={`text-sm px-3 py-1 rounded-md transition-colors ${attachmentTab === 'CASH' ? 'bg-sushi-gold text-sushi-black font-bold' : 'text-gray-500 hover:text-white'}`}>Caja</button>
                </div>

                <div className="h-64 overflow-y-auto space-y-2 pr-2">
                    {attachmentTab === 'INVENTORY' && inventorySessions.map(sess => (
                        <div key={sess.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/5">
                            <div>
                                <p className="text-sm font-bold dark:text-white">Inventario {sess.date}</p>
                                <p className="text-xs text-gray-500">Abierto por: {sess.openedBy} - Estado: {sess.status}</p>
                            </div>
                            <button onClick={() => handleAddAttachment({ id: generateUUID(), module: 'INVENTORY', refId: sess.id, date: sess.date, label: `Reporte de Inventario (${sess.date})`, data: { status: sess.status, totalItems: sess.data.length } })} className="text-xs bg-gray-200 dark:bg-white/10 px-2 py-1 rounded text-white hover:bg-sushi-gold hover:text-sushi-black transition-colors">Adjuntar</button>
                        </div>
                    ))}
                    {attachmentTab === 'CASH' && cashShifts.map(shift => (
                        <div key={shift.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/5">
                            <div>
                                <p className="text-sm font-bold dark:text-white">Caja {shift.date}</p>
                                <p className="text-xs text-gray-500">Apertura: {shift.openedBy} (${shift.initialAmount})</p>
                            </div>
                            <button onClick={() => handleAddAttachment({ id: generateUUID(), module: 'CASH_SHIFT', refId: shift.id, date: shift.date, label: `Cierre de Caja (${shift.date})`, data: { final: shift.finalCash, openedBy: shift.openedBy } })} className="text-xs bg-gray-200 dark:bg-white/10 px-2 py-1 rounded text-white hover:bg-sushi-gold hover:text-sushi-black transition-colors">Adjuntar</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderDetailAttachmentModal = () => {
        if (!selectedAttachmentDetail) return null;
        const data = selectedAttachmentDetail.data || {};
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
                <div className="bg-white dark:bg-[#1e1e2d] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10">
                    <div className="bg-gradient-to-r from-gray-800 to-black p-4 flex justify-between items-center">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-sushi-gold" />
                            Detalle del Registro
                        </h3>
                        <button onClick={() => setSelectedAttachmentDetail(null)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6">
                        <div className="mb-4">
                            <h4 className="text-lg font-bold text-white mb-1">{selectedAttachmentDetail.label}</h4>
                            <p className="text-xs text-sushi-gold uppercase tracking-wider">{selectedAttachmentDetail.module} | {selectedAttachmentDetail.date}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 space-y-2 border border-white/5">
                            {Object.entries(data).map(([key, val]) => (
                                <div key={key} className="flex justify-between border-b border-white/5 pb-1 last:border-0">
                                    <span className="text-sm text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    <span className="text-sm text-white font-mono font-bold">{String(val)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6">
                            <button onClick={() => setSelectedAttachmentDetail(null)} className="w-full py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 font-bold transition-colors">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (viewMode === 'CENTRAL') {
        return (
            <div className="h-full flex flex-col relative text-gray-900 dark:text-white">


                <div className="bg-white dark:bg-sushi-dark border-b border-gray-200 dark:border-white/5 p-4 flex items-center gap-4">
                    <button onClick={() => setViewMode('DOCS')} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-xl font-bold dark:text-white">Central Administrativa</h2>
                </div>
                {/* Min-Height Fix for Central Admin */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0c0c14] min-h-[calc(100vh-100px)]">
                    <AdminHub adminTasks={tasks} setAdminTasks={setTasks || (() => { })} currentUser={currentUser} allUsers={users} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full animate-fade-in bg-gray-50 dark:bg-[#0c0c14] overflow-hidden relative">
            {selectedPeer && (
                <UserProfileModal
                    user={selectedPeer}
                    onClose={() => setSelectedPeer(null)}
                    readOnly={true}
                    onMessage={() => onComposeMessage && onComposeMessage(selectedPeer.id)}
                />
            )}
            {showShareModal && renderShareModal()}
            {showAICoach && renderAICoachModal()}
            {showAttachmentModal && renderAttachmentModal()}
            {selectedAttachmentDetail && renderDetailAttachmentModal()}

            {/* Notification Bell (REMOVED - MOVED TO GLOBAL APP) */}


            {/* SIDEBAR */}
            <div className="w-full md:w-64 flex-shrink-0 border-r border-gray-200 dark:border-white/5 bg-white dark:bg-sushi-dark flex flex-col shadow-lg z-10">
                <div className="p-4 border-b border-gray-200 dark:border-white/5 space-y-4">
                    <h2 className="text-lg font-serif text-gray-800 dark:text-white flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-sushi-gold" />
                        Oficina
                    </h2>
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                        <button onClick={() => { executeWithUnsavedCheck(() => setViewMode('DOCS')); }} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'DOCS' ? 'bg-white dark:bg-white/10 shadow-sm text-sushi-gold' : 'text-gray-500'}`}>Archivos</button>
                        <button onClick={() => { executeWithUnsavedCheck(() => setViewMode('TEAM')); }} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'TEAM' ? 'bg-white dark:bg-white/10 shadow-sm text-sushi-gold' : 'text-gray-500'}`}>Equipo</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {viewMode === 'DOCS' && (
                        <>
                            <button onClick={handleNewDoc} className="w-full bg-sushi-gold/10 text-sushi-gold font-bold py-2 rounded-lg mb-4 flex items-center justify-center gap-2 hover:bg-sushi-gold/20 transition-colors">
                                <Plus className="w-4 h-4" /> Nuevo
                            </button>

                            <div className="flex flex-col gap-1 px-2 pb-2">
                                <div className="flex gap-2 text-xs font-medium text-gray-400 mb-2">
                                    <button onClick={() => { setDocFilter('MINE'); setTrashView(false); }} className={`${docFilter === 'MINE' && !trashView ? 'text-sushi-gold' : ''} hover:text-white transition-colors`}>Mis Docs</button>
                                    <span>|</span>
                                    <button onClick={() => { setDocFilter('SHARED'); setTrashView(false); }} className={`relative ${docFilter === 'SHARED' && !trashView ? 'text-sushi-gold' : ''} hover:text-white transition-colors flex items-center gap-1`}>
                                        Compartidos
                                        {unreadSharedCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                                    </button>
                                </div>
                                <button onClick={() => { setDocFilter('MINE'); setTrashView(true); setActiveDocId(null); }} className={`text-xs flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 ${trashView ? 'text-red-400 bg-white/5' : 'text-gray-500'}`}>
                                    <Trash2 className="w-3 h-3" /> Papelera
                                </button>
                            </div>

                            {/* Removed loading check */}
                            {(

                                (trashView ? trashedDocs : (docFilter === 'MINE' ? myDocs : sharedDocs)).length === 0 ? (
                                    <p className="text-center text-xs text-gray-500 py-4 italic">{trashView ? 'Papelera vacía.' : 'No hay documentos.'}</p>
                                ) : (
                                    (trashView ? trashedDocs : (docFilter === 'MINE' ? myDocs : sharedDocs)).map(doc => {
                                        const creator = users.find(u => u.id === doc.authors[0]);
                                        const isUnread = docFilter === 'SHARED' && !doc.readBy?.includes(currentUser.id);

                                        return (
                                            <div
                                                key={doc.id}
                                                onClick={() => handleSelectDoc(doc)}
                                                className={`p-3 rounded-lg cursor-pointer border transition-all ${activeDocId === doc.id ? 'bg-sushi-gold/10 border-sushi-gold/50' : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <h4 className={`text-sm font-bold truncate ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{doc.title}</h4>
                                                    {isUnread && <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm"></div>}
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[10px] text-gray-400 truncate max-w-[70%]">{creator?.name}</span>
                                                    {doc.attachments && doc.attachments.length > 0 && <Paperclip className="w-3 h-3 text-gray-400" />}
                                                </div>
                                            </div>
                                        );
                                    })
                                )
                            )}

                            {trashView && trashedDocs.length > 0 && (
                                <button onClick={handleEmptyTrash} className="w-full mt-4 text-xs text-red-500 hover:text-red-400 hover:underline">Vaciar Papelera</button>
                            )}
                        </>
                    )}

                    {viewMode === 'TEAM' && (
                        users.filter(u => u.id !== currentUser.id).map(user => (
                            <div key={user.id} onClick={() => setSelectedPeer(user)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer">
                                <div className="relative w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold overflow-hidden">
                                    {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white dark:border-sushi-dark rounded-full ${user.status === 'break' ? 'bg-orange-500' : ((new Date().getTime() - new Date(user.lastActive || 0).getTime() > 5 * 60 * 1000) ? 'bg-gray-400' : 'bg-green-500')}`}></span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        {user.name}
                                        {user.status === 'break' ? (
                                            <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full dark:bg-orange-900/30 dark:text-orange-400">DESCANSO</span>
                                        ) : (
                                            <span className="text-[10px] font-bold bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">ACTIVO</span>
                                        )}
                                    </p>
                                    <p className="text-[10px] text-gray-500 uppercase">{user.role}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-white/5">
                    <button
                        onClick={() => { executeWithUnsavedCheck(() => setViewMode('CENTRAL')); }}
                        className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-700 transition-colors shadow-lg"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Central Admin
                    </button>
                    {/* Unhide Cat Button */}
                    {catHidden && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setCatHidden(false); localStorage.setItem('sushiblack_office_cat_hidden', JSON.stringify(false)); }}
                            className="w-full mt-2 flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-sushi-gold transition-colors"
                        >
                            <Sparkles className="w-3 h-3" />
                            Mostrar Mascota
                        </button>
                    )}
                </div>
            </div>



            {/* MAIN AREA */}
            <div className="flex-1 bg-white dark:bg-[#1a1a24] relative flex flex-col h-full overflow-hidden">
                {viewMode === 'TEAM' ? (
                    <div className="flex-1 flex flex-col p-4 bg-gray-50 dark:bg-[#0c0c14] h-full overflow-y-auto relative">
                        <div className="flex items-center gap-2 mb-4">
                            <CalendarIcon className="w-5 h-5 text-sushi-gold" />
                            <h3 className="font-bold text-gray-700 dark:text-white">Agenda & Eventos</h3>
                        </div>

                        <div className="flex gap-4 items-start flex-col xl:flex-row h-full">
                            {/* RESIZABLE CALENDAR */}
                            <div className="w-full xl:w-2/3 flex flex-col relative" style={{ height: calendarHeight }}>
                                <div className="flex-1 overflow-hidden relative rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-sushi-dark shadow-sm z-10">
                                    <div className="flex justify-between items-center mb-4 px-1">
                                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                            <CalendarIcon className="w-5 h-5 text-sushi-gold" /> Calendario de Oficina
                                        </h3>
                                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 cursor-pointer select-none bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={showPublicEvents}
                                                onChange={() => setShowPublicEvents(!showPublicEvents)}
                                                className="accent-sushi-gold rounded w-4 h-4"
                                            />
                                            Mostrar Eventos Públicos
                                        </label>
                                    </div>
                                    <CalendarWidget
                                        events={showPublicEvents
                                            ? calendarEvents.filter(e => e.visibility === 'ALL' || e.visibility === 'ADMIN' || e.userId === currentUser.id)
                                            : calendarEvents.filter(e => e.visibility === 'PRIVATE' && e.userId === currentUser.id)
                                        }
                                        onAddEvent={(evt) => {
                                            const newEvent = { ...evt, userId: currentUser.id, visibility: evt.visibility || 'PRIVATE' };
                                            onAddCalendarEvent && onAddCalendarEvent(newEvent);
                                        }}
                                        onDeleteEvent={onDeleteEvent}
                                        records={showPublicEvents ? records : records.filter(r => r.employeeId === employees.find(emp => emp.name === currentUser.name)?.id)}
                                        absences={showPublicEvents ? absences : absences.filter(a => a.employeeId === employees.find(emp => emp.name === currentUser.name)?.id)}
                                        holidays={showPublicEvents ? holidays : []}
                                        employees={showPublicEvents ? employees : employees.filter(emp => emp.name === currentUser.name)}
                                        cashShifts={showPublicEvents ? cashShifts : cashShifts.filter(s => s.openedBy === currentUser.name || s.closedBy === currentUser.name)}
                                    />
                                </div>
                                {/* Resizer Handle */}
                                <div
                                    className="w-full h-4 absolute -bottom-2 cursor-ns-resize flex items-center justify-center group z-20"
                                    onMouseDown={handleResizeCalendar}
                                >
                                    <div className="w-20 h-1 bg-gray-300 dark:bg-white/20 rounded-full group-hover:bg-sushi-gold transition-colors"></div>
                                </div>
                            </div>

                            {/* STICKY NOTES WIDGET */}
                            <div className="w-full xl:w-1/3 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-gray-700 dark:text-white flex items-center gap-2"><StickyNote className="w-4 h-4 text-yellow-500" /> Notas</h4>
                                    <button onClick={() => setShowNoteCreator(true)} className="p-1 text-gray-500 hover:text-white"><Plus className="w-5 h-5" /></button>
                                </div>
                                {showNoteCreator && (
                                    <div className="bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 animate-fade-in-down">
                                        <input
                                            value={newNoteTitle}
                                            onChange={(e) => setNewNoteTitle(e.target.value)}
                                            placeholder="Título..."
                                            className="w-full bg-transparent border-b border-gray-200 dark:border-white/10 pb-2 mb-2 outline-none text-sm font-bold dark:text-white"
                                        />
                                        <textarea
                                            value={newNoteContent}
                                            onChange={(e) => setNewNoteContent(e.target.value)}
                                            placeholder="Escribe una nota..."
                                            className="w-full bg-transparent min-h-[60px] text-sm text-gray-600 dark:text-gray-300 outline-none resize-none mb-2"
                                        />
                                        <div className="flex gap-2">
                                            {['yellow', 'blue', 'pink', 'green'].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setNewNoteColor(c)}
                                                    className={`w-4 h-4 rounded-full ${c === 'yellow' ? 'bg-yellow-400' : c === 'blue' ? 'bg-blue-400' : c === 'pink' ? 'bg-pink-400' : 'bg-green-400'} ${newNoteColor === c ? 'ring-2 ring-white' : ''}`}
                                                ></button>
                                            ))}
                                            <div className="flex-1"></div>
                                            <button onClick={() => setShowNoteCreator(false)} className="text-xs text-gray-500 hover:text-white px-2">Cancelar</button>
                                            <button onClick={handleAddNote} className="text-xs bg-sushi-gold text-sushi-black px-3 py-1 rounded font-bold">Guardar</button>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 overflow-y-auto max-h-[500px]">
                                    {myNotes.length === 0 && !showNoteCreator && <p className="text-sm text-gray-500 italic">No hay notas.</p>}
                                    {myNotes.map(note => {
                                        const bgClass = {
                                            'yellow': 'bg-yellow-100 border-yellow-200 text-yellow-900',
                                            'blue': 'bg-blue-100 border-blue-200 text-blue-900',
                                            'pink': 'bg-pink-100 border-pink-200 text-pink-900',
                                            'green': 'bg-green-100 border-green-200 text-green-900'
                                        }[note.color] || 'bg-yellow-100 border-yellow-200';

                                        return (
                                            <div key={note.id} className={`p-4 rounded-xl border relative group ${bgClass} shadow-sm transition-transform hover:-translate-y-1`}>
                                                <h5 className="font-bold text-sm mb-1">{note.title}</h5>
                                                <p className="text-xs whitespace-pre-wrap leading-relaxed opacity-90">{note.content}</p>
                                                <button
                                                    onClick={() => onRemoveOfficeNote && onRemoveOfficeNote(note.id)}
                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                                <span className="text-[9px] absolute bottom-2 right-2 opacity-50">{new Date(note.date).toLocaleDateString()}</span>
                                            </div>
                                        )
                                    })}
                                </div>


                            </div>
                        </div>
                    </div>
                ) : (
                    // DOCS VIEW
                    activeDocId ? (
                        <>
                            <div className="h-16 border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-6 bg-white dark:bg-sushi-dark flex-shrink-0 relative">
                                {currentDoc?.sharedWith?.includes(currentUser.id) && !currentDoc?.authors.includes(currentUser.id) && (
                                    <div className="absolute top-1 left-6 flex items-center gap-1">
                                        <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/30 uppercase tracking-wider">
                                            Modo Colaboración
                                        </span>
                                    </div>
                                )}
                                <input
                                    value={editorTitle}
                                    onChange={e => setEditorTitle(e.target.value)}
                                    placeholder="Título..."
                                    disabled={currentDoc?.status === 'TRASHED'}
                                    className="bg-transparent text-lg font-bold text-gray-900 dark:text-white outline-none w-full placeholder-gray-500 disabled:opacity-50 mt-2"
                                />
                                <div className="flex items-center gap-2">
                                    {currentDoc?.status === 'TRASHED' ? (
                                        <>
                                            <button onClick={(e) => handleRestoreDoc(currentDoc, e)} className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg flex items-center gap-1 font-bold text-xs"><RotateCcw className="w-4 h-4" /> Restaurar</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => setShowAICoach(true)} className="p-2 text-purple-500 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1" title="IA Coach"><Bot className="w-5 h-5" /></button>
                                            <button onClick={() => setShowAttachmentModal(true)} className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg transition-colors" title="Adjuntar"><Paperclip className="w-5 h-5" /></button>
                                            <button onClick={handleExportPDF} className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"><Download className="w-5 h-5" /></button>

                                            {docFilter === 'MINE' && (
                                                <button onClick={() => setShowShareModal(true)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Share2 className="w-5 h-5" /></button>
                                            )}

                                            {(docFilter === 'MINE' || currentDoc?.authors.includes(currentUser.id) || currentDoc?.sharedWith?.includes(currentUser.id)) && (
                                                <button onClick={handleSave} className="flex items-center gap-2 bg-sushi-gold text-sushi-black px-3 py-1.5 rounded-lg font-bold text-sm hover:scale-105 transition-transform"><Save className="w-4 h-4" /> Guardar</button>
                                            )}

                                            {(currentDoc?.authors?.includes(currentUser.id) || activeDocId.startsWith('draft-')) && (
                                                <button onClick={(e) => handleTrashDoc(currentDoc!, e)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                                            )}
                                        </>
                                    )}
                                    <button onClick={() => { setActiveDocId(null); }} className="md:hidden"><X className="w-5 h-5" /></button>
                                </div>
                            </div>

                            <div className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-[#0c0c14]">
                                <div className="max-w-3xl mx-auto bg-white min-h-[800px] shadow-sm rounded-xl p-8 relative flex flex-col gap-6 text-black">

                                    {currentDoc?.status === 'TRASHED' && (
                                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-center gap-3 text-red-500 mb-4">
                                            <Trash2 className="w-6 h-6" />
                                            <div>
                                                <p className="font-bold">Documento en Papelera</p>
                                                <p className="text-xs">Restaura este documento para editarlo.</p>
                                            </div>
                                        </div>
                                    )}

                                    {editorAttachments.length > 0 && (
                                        <div className="grid grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-dashed border-gray-300 dark:border-white/10">
                                            <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Paperclip className="w-3 h-3" /> Registros Adjuntos
                                            </div>
                                            {editorAttachments.map((att, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => setSelectedAttachmentDetail(att)}
                                                    className="group relative flex flex-col gap-3 p-4 bg-[#1a1a24] rounded-xl shadow-lg border border-gray-800 hover:border-sushi-gold cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1"
                                                >
                                                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                                                        <div className={`p-2 rounded-lg ${att.module === 'INVENTORY' ? 'bg-blue-900/30 text-blue-400' : 'bg-sushi-gold/20 text-sushi-gold'}`}>
                                                            <FileText className="w-5 h-5" />
                                                        </div>
                                                        <div className="overflow-hidden flex-1">
                                                            <p className="text-sm font-bold text-white truncate">{att.label}</p>
                                                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                                <span className="uppercase tracking-wider font-bold">{att.module}</span>
                                                                <span>•</span>
                                                                <span>{att.date}</span>
                                                            </div>
                                                        </div>
                                                        {!currentDoc?.status && (
                                                            <button onClick={(e) => { e.stopPropagation(); setEditorAttachments(prev => prev.filter((_, i) => i !== idx)); }} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* DATA PREVIEW */}
                                                    <div className="space-y-1">
                                                        {att.data && Object.entries(att.data).slice(0, 3).map(([k, v]) => (
                                                            <div key={k} className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-500 capitalize">{k}</span>
                                                                <span className="text-gray-300 font-mono">{String(v)}</span>
                                                            </div>
                                                        ))}
                                                        {att.data && Object.keys(att.data).length > 3 && (
                                                            <p className="text-[10px] text-center text-gray-600 italic pt-1">
                                                                +{Object.keys(att.data).length - 3} campos más...
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* RICH TEXT EDITOR TOOLBAR */}
                                    <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-gray-100 dark:bg-black/60 rounded-xl border-2 border-gray-200 dark:border-white/10 sticky top-0 z-10 backdrop-blur-md shadow-md">
                                        <div className="flex bg-white dark:bg-white/10 rounded-lg p-1 border border-gray-200 dark:border-white/5 shadow-sm">
                                            <button
                                                onClick={() => document.execCommand('bold', false)}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-800 dark:text-white"
                                                title="Negrita"
                                            >
                                                <span className="font-bold text-sm">B</span>
                                            </button>
                                            <button
                                                onClick={() => document.execCommand('italic', false)}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-800 dark:text-white italic"
                                                title="Cursiva"
                                            >
                                                <span className="font-serif text-sm">I</span>
                                            </button>
                                            <div className="h-full w-px bg-gray-300 dark:bg-white/20 mx-1"></div>
                                            <label className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-800 dark:text-white cursor-pointer relative" title="Insertar Imagen">
                                                <Image className="w-4 h-4" />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleInsertImage(file);
                                                        e.target.value = ''; // Reset
                                                    }}
                                                />
                                            </label>
                                        </div>

                                        <div className="h-full w-px bg-gray-300 dark:bg-white/20 mx-1"></div>

                                        {/* Font Size Group */}
                                        <div className="flex bg-white dark:bg-white/10 rounded-lg p-1 border border-gray-200 dark:border-white/5 shadow-sm">
                                            <button
                                                onClick={() => document.execCommand('fontSize', false, '3')}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-800 dark:text-white"
                                                title="Tamaño Normal"
                                            >
                                                <Type className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => document.execCommand('fontSize', false, '5')}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-800 dark:text-white"
                                                title="Tamaño Grande"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => document.execCommand('fontSize', false, '1')}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-800 dark:text-white"
                                                title="Tamaño Pequeño"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                        </div>

                                        <div className="h-full w-px bg-gray-300 dark:bg-white/20 mx-1"></div>

                                        {/* Alignment Group */}
                                        <div className="flex bg-white dark:bg-white/10 rounded-lg p-1 border border-gray-200 dark:border-white/5 shadow-sm">
                                            <button
                                                onClick={() => document.execCommand('justifyLeft', false)}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-800 dark:text-white"
                                                title="Alinear Izquierda"
                                            >
                                                <AlignLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => document.execCommand('justifyCenter', false)}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-800 dark:text-white"
                                                title="Centrar"
                                            >
                                                <AlignCenter className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => document.execCommand('justifyRight', false)}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-800 dark:text-white"
                                                title="Alinear Derecha"
                                            >
                                                <AlignRight className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => document.execCommand('justifyFull', false)}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-800 dark:text-white"
                                                title="Justificar"
                                            >
                                                <AlignJustify className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="h-full w-px bg-gray-300 dark:bg-white/20 mx-1"></div>

                                        {/* Indentation Group */}
                                        <div className="flex bg-white dark:bg-white/10 rounded-lg p-1 border border-gray-200 dark:border-white/5 shadow-sm">
                                            <button
                                                onClick={() => document.execCommand('indent', false)}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-800 dark:text-white"
                                                title="Aumentar Sangría"
                                            >
                                                <Indent className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => document.execCommand('outdent', false)}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-800 dark:text-white"
                                                title="Disminuir Sangría"
                                            >
                                                <Outdent className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="h-8 w-px bg-gray-300 dark:bg-white/20 mx-2 hidden sm:block"></div>

                                        {/* Minimalist Color Highlights */}
                                        <div className="flex items-center gap-2 bg-white dark:bg-white/10 p-1.5 rounded-lg border border-gray-200 dark:border-white/5 shadow-sm">
                                            <span className="text-[9px] uppercase font-bold text-gray-400 mr-1 select-none">Resaltar:</span>
                                            {[
                                                { color: '#fef08a', label: 'Amarillo' }, // yellow-200
                                                { color: '#bbf7d0', label: 'Verde' },    // green-200
                                                { color: '#fbcfe8', label: 'Rosa' },     // pink-200
                                                { color: '#bae6fd', label: 'Azul' },     // blue-200
                                            ].map(opt => (
                                                <button
                                                    key={opt.color}
                                                    onClick={() => document.execCommand('hiliteColor', false, opt.color)}
                                                    className="w-6 h-6 rounded-full border-2 border-transparent hover:border-gray-400 transition-all shadow-sm hover:scale-110"
                                                    style={{ backgroundColor: opt.color }}
                                                    title={`Resaltar ${opt.label}`}
                                                />
                                            ))}
                                            <div className="w-px h-6 bg-gray-300 mx-1"></div>
                                            <button
                                                onClick={() => document.execCommand('hiliteColor', false, 'transparent')}
                                                className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-white/20 hover:border-red-400 hover:scale-110 transition-all flex items-center justify-center bg-transparent group"
                                                title="Sin Resaltado (Borrar)"
                                            >
                                                <X className="w-3 h-3 text-gray-400 group-hover:text-red-500" />
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        ref={editorRef}
                                        contentEditable={currentDoc?.status !== 'TRASHED'}
                                        suppressContentEditableWarning={true}
                                        onInput={(e) => {
                                            // Only update state, do NOT force re-render via dangerouslySetInnerHTML
                                            setEditorContent(e.currentTarget.innerHTML);
                                        }}
                                        onDrop={handleDrop}
                                        onDragOver={(e) => e.preventDefault()}
                                        className="w-full flex-1 bg-transparent outline-none text-gray-900 leading-relaxed min-h-[600px] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 selection:bg-sushi-gold/30"
                                        data-placeholder="Escribe aquí... (Usa el botón de Robot para ayuda o arrastra imágenes)"
                                        style={{ whiteSpace: 'pre-wrap' }}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                            <Briefcase className="w-16 h-16 mb-4 opacity-50" />
                            <h3 className="text-xl font-bold mb-2">Oficina Administrativa</h3>
                            <p className="text-sm">Selecciona un documento o crea uno nuevo.</p>
                        </div>
                    )
                )}
            </div>
            <CatWidget
                hidden={catHidden}
                onClose={() => {
                    setCatHidden(true);
                    localStorage.setItem('sushiblack_office_cat_hidden', JSON.stringify(true));
                }}
            />
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
            />
        </div>
    );
};
