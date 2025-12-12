
import React, { useState } from 'react';
import { User, UserPermissions, UserRole } from '../types';
import { UserCog, Trash2, Shield, User as UserIcon, Mail, Clock, Check, Lock, Edit3, X, Archive, Wallet, Box, Users } from 'lucide-react';
import { playSound } from '../utils/soundUtils';
import { exportUserCredentialsPDF } from '../utils/exportUtils';
import { ConfirmationModal } from './common/ConfirmationModal';
import { supabase } from '../supabaseClient';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User | null;
  customRoles: string[];
  roleDefinitions: Record<string, UserPermissions>;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers, currentUser, customRoles, roleDefinitions }) => {
  const [isDarkMode] = useState(() => localStorage.getItem('sushiblack_theme') === 'dark');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Combine System Roles + Custom Roles
  // SYNCED WITH EMPLOYEE ROLES
  const SYSTEM_ROLES = ['ADMIN', 'EMPRESA', 'GERENTE', 'COORDINADOR', 'JEFE_COCINA', 'ADMINISTRATIVO', 'MOSTRADOR', 'COCINA', 'REPARTIDOR'];
  const AVAILABLE_ROLES = [...SYSTEM_ROLES, ...customRoles];

  const ROLE_LABELS: Record<string, string> = {
    'ADMIN': 'Administrador del Sistema',
    'EMPRESA': 'Dueño / Empresa',
    'GERENTE': 'Gerente',
    'COORDINADOR': 'Coordinador',
    'JEFE_COCINA': 'Jefe de Cocina',
    'ADMINISTRATIVO': 'Administrativo',
    'MOSTRADOR': 'Mostrador',
    'COCINA': 'Cocina',
    'REPARTIDOR': 'Delivery / Repartidor'
  };

  const [newUser, setNewUser] = useState<Partial<User>>({
    username: '',
    password: '',
    email: '',
    name: '',
    role: 'CAJERO',
  });

  const [permissions, setPermissions] = useState<UserPermissions>({
    viewHr: false, manageHr: false, createHr: false, editHr: false, deleteHr: false,
    viewOps: false, manageOps: false, createOps: false, editOps: false, deleteOps: false, approveOps: false,
    viewFinance: false, manageFinance: false, createFinance: false, editFinance: false, deleteFinance: false, approveFinance: false,
    viewInventory: false, manageInventory: false, createInventory: false, editInventory: false, deleteInventory: false,
    superAdmin: false
  });

  const [tags, setTags] = useState<string[]>([]);
  const addTag = (tag: string) => setTags(prev => [...prev, tag]);
  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const handleRoleChange = (role: string) => {
    setNewUser(prev => ({ ...prev, role: role as UserRole }));

    // Find definition for this role
    const def = roleDefinitions[role];
    if (def) {
      setPermissions({ ...def });
    }
  };

  const startEditing = (user: User) => {
    setEditingUser(user);
    setNewUser({
      username: user.username,
      email: user.email || '',
      password: '',
      name: user.name,
      role: user.role || 'MANAGER'
    });
    setPermissions(user.permissions);
    setTags(user.tags || []);
    setShowModal(true);
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setNewUser({ username: '', email: '', password: '', name: '', role: 'CAJERO' });
    setPermissions({
      viewHr: false, manageHr: false, createHr: false, editHr: false, deleteHr: false,
      viewOps: false, manageOps: false, createOps: false, editOps: false, deleteOps: false, approveOps: false,
      viewFinance: false, manageFinance: false, createFinance: false, editFinance: false, deleteFinance: false, approveFinance: false,
      viewInventory: false, manageInventory: false, createInventory: false, editInventory: false, deleteInventory: false,
      superAdmin: false
    });
    setTags([]);
    setShowModal(false);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.name) return;
    // Password required for new users
    if (!editingUser && !newUser.password) {
      alert("La contraseña es obligatoria para nuevos usuarios");
      return;
    }

    try {
      if (editingUser) {
        // UPDATE MODE
        const updatedUser: User = {
          ...editingUser,
          username: newUser.username!,
          email: newUser.email!,
          name: newUser.name!,
          password: newUser.password || editingUser.password,
          role: newUser.role as UserRole,
          permissions: permissions,
          tags: newUser.role === 'ADMIN' ? tags : []
        };

        const { error } = await supabase
          .from('app_users')
          .update({
            data: {
              username: updatedUser.username,
              email: updatedUser.email,
              name: updatedUser.name,
              password: updatedUser.password,
              role: updatedUser.role,
              permissions: updatedUser.permissions,
              tags: updatedUser.tags
            }
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
        playSound('SUCCESS');
        cancelEditing();
      } else {
        // CREATE MODE
        // Check uniqueness
        if (users.some(u => u.username === newUser.username)) {
          alert('El nombre de usuario ya existe');
          return;
        }

        const user: User = {
          id: crypto.randomUUID(),
          username: newUser.username!,
          email: newUser.email || '',
          name: newUser.name!,
          password: newUser.password!,
          role: newUser.role as UserRole,
          permissions: permissions,
          tags: newUser.role === 'ADMIN' ? tags : []
        };

        const { error } = await supabase
          .from('app_users')
          .insert([{ id: user.id, data: user }]);

        if (error) throw error;

        setUsers([...users, user]);
        playSound('SUCCESS');
        cancelEditing();
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error al guardar el usuario.');
      playSound('ERROR');
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    if (id === currentUser.id) {
      alert("No puedes eliminar tu propio usuario.");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar Usuario?',
      message: '¿Eliminar usuario del sistema? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('app_users')
            .delete()
            .eq('id', id);

          if (error) throw error;

          setUsers(users.filter(u => u.id !== id));
          playSound('CLICK');
        } catch (error) {
          console.error('Error deleting user:', error);
          alert('Error al eliminar usuario.');
        }
      }
    });
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    playSound('CLICK');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-fade-in">
      {/* List Users */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-serif text-gray-900 dark:text-white">Gestión de Accesos</h2>
          <button
            onClick={() => { cancelEditing(); setShowModal(true); }}
            className="lg:hidden bg-sushi-gold p-2 rounded-full shadow-lg"
          >
            <UserCog className="w-6 h-6 text-sushi-black" />
          </button>
        </div>

        <div className="space-y-4">
          {users.map(u => (
            <div key={u.id} className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 p-5 rounded-xl flex items-center justify-between group hover:border-sushi-gold/30 transition-all shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${u.permissions.superAdmin ? 'bg-sushi-gold/20 text-yellow-700 dark:text-sushi-gold' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-sushi-muted'}`}>
                  {u.permissions.superAdmin ? <Shield className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 dark:text-white font-bold text-lg">{u.name}</p>
                    {u.permissions.superAdmin && <span className="text-[10px] bg-sushi-gold text-sushi-black px-1.5 rounded font-bold">ADMIN</span>}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-sushi-muted flex flex-col sm:flex-row gap-x-4 mt-1">
                    <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> @{u.username}</span>
                    {u.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</span>}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {/* Tags Badges */}
                    {u.tags && u.tags.length > 0 && u.tags.filter(t => t !== 'CUENTA_ADMINISTRADORA').map(tag => (
                      <span key={tag} className="text-[9px] bg-sushi-gold/20 text-yellow-800 dark:text-sushi-gold border border-sushi-gold/30 px-1 rounded font-bold">{tag}</span>
                    ))}

                    {/* Permissions Badges */}
                    {u.permissions.viewFinance && <span className="text-[9px] bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-500 border border-green-200 dark:border-green-500/20 px-1 rounded">Finanzas{u.permissions.manageFinance ? '+' : ''}</span>}
                    {u.permissions.viewHr && <span className="text-[9px] bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500 px-1 rounded">RRHH{u.permissions.manageHr ? '+' : ''}</span>}
                    {u.permissions.viewOps && <span className="text-[9px] bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 px-1 rounded">Operaciones{u.permissions.manageOps ? '+' : ''}</span>}
                    {u.permissions.viewInventory && <span className="text-[9px] bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-500 px-1 rounded">Inventario{u.permissions.manageInventory ? '+' : ''}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {currentUser && (u.username !== 'admin' || currentUser.username === 'admin') && (
                  <>
                    <button
                      onClick={() => startEditing(u)}
                      className="text-gray-400 dark:text-sushi-muted hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-lg transition-all"
                      title="Editar usuario"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    {(currentUser.id === u.id || currentUser.permissions.superAdmin) && (
                      <button
                        onClick={() => exportUserCredentialsPDF(u)}
                        className="text-gray-400 dark:text-sushi-muted hover:text-sushi-gold hover:bg-sushi-gold/10 p-2 rounded-lg transition-all"
                        title="Exportar Credenciales PDF"
                      >
                        <Archive className="w-5 h-5" />
                      </button>
                    )}

                    {u.username !== 'admin' && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-gray-400 dark:text-sushi-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-lg transition-all"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create/Edit User Form (Modal on Mobile, Fixed on Desktop) */}
      <div className={`
        fixed inset-0 z-50 lg:static lg:z-auto bg-black/50 lg:bg-transparent flex items-center justify-center p-4 lg:p-0
        ${!showModal ? 'hidden lg:block' : ''}
      `}>
        <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 p-8 rounded-xl h-fit shadow-xl w-full max-w-2xl lg:max-w-none relative animate-slide-up">

          {/* Close Button Mobile */}
          <button onClick={() => setShowModal(false)} className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-white"><X /></button>

          <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-white/10 pb-4">
            <UserCog className="w-6 h-6 text-sushi-gold" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">{editingUser ? 'Editar Usuario' : 'Crear Nuevo Perfil'}</h3>
          </div>

          <form onSubmit={handleSaveUser} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Nombre Real</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors"
                  placeholder="Ej. Martín Gomez"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Usuario</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors"
                    placeholder="mgomez"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Contraseña</label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors"
                    placeholder={editingUser ? "Dejar en blanco para mantener actual" : "••••••"}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Rol del Usuario</label>
              <select
                value={newUser.role}
                onChange={e => handleRoleChange(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors appearance-none"
              >
                {AVAILABLE_ROLES.map(role => (
                  <option key={role} value={role}>{ROLE_LABELS[role] || role.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1 pl-1 italic">
                Seleccionar un rol aplicará automáticamente los permisos predeterminados definidos en Configuración.
              </p>
            </div>

            {/* ADMIN TAGS SYSTEM */}
            {newUser.role === 'ADMIN' && (
              <div className="mt-4">
                <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-2">Etiquetas de Sistema</label>
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-lg border border-gray-200 dark:border-white/5">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.filter(t => t !== 'CUENTA_ADMINISTRADORA').map(tag => (
                      <span key={tag} className="bg-sushi-gold/20 text-yellow-700 dark:text-sushi-gold border border-sushi-gold/30 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value && !tags.includes(e.target.value)) addTag(e.target.value);
                        e.target.value = '';
                      }}
                      className="flex-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-sushi-gold"
                    >
                      <option value="">+ Agregar Etiqueta...</option>
                      <option value="FINANZAS">FINANZAS</option>
                      <option value="INSUMOS">INSUMOS</option>
                      <option value="RECURSOS_HUMANOS">RECURSOS HUMANOS</option>
                      <option value="CEO">CEO</option>
                      <option value="GERENCIA">GERENCIA</option>
                      <option value="COCINA">COCINA</option>
                      <option value="BARRA">BARRA</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-white/10 pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-sushi-gold" />
                <label className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Matriz de Permisos (Personalizable)</label>
              </div>

              {/* Permission Matrix */}
              <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-4 border border-gray-200 dark:border-white/5 overflow-x-auto">
                <div className="grid grid-cols-6 gap-2 mb-2 text-[10px] uppercase font-bold text-gray-500 dark:text-sushi-muted border-b border-gray-200 dark:border-white/5 pb-2 min-w-[500px]">
                  <span className="col-span-1">Módulo</span>
                  <span className="text-center">Ver</span>
                  <span className="text-center">Crear</span>
                  <span className="text-center">Editar</span>
                  <span className="text-center">Borrar</span>
                  <span className="text-center">Aprobar</span>
                </div>

                <GranularPermissionRow
                  label="RRHH"
                  icon={Users}
                  baseKey="Hr"
                  permissions={permissions}
                  toggle={togglePermission}
                />
                <GranularPermissionRow
                  label="Operaciones"
                  icon={Clock}
                  baseKey="Ops"
                  permissions={permissions}
                  toggle={togglePermission}
                  hasApprove
                />
                <GranularPermissionRow
                  label="Finanzas"
                  icon={Wallet}
                  baseKey="Finance"
                  permissions={permissions}
                  toggle={togglePermission}
                  hasApprove
                />
                <GranularPermissionRow
                  label="Inventario"
                  icon={Box}
                  baseKey="Inventory"
                  permissions={permissions}
                  toggle={togglePermission}
                />
              </div>

              <div className="mt-4 flex items-center justify-between p-3 bg-sushi-gold/10 rounded-lg border border-sushi-gold/30">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-sushi-gold" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">Super Admin</p>
                    <p className="text-[10px] text-gray-500 dark:text-sushi-muted">Acceso total + Gestión de Usuarios</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.superAdmin}
                    onChange={() => togglePermission('superAdmin')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sushi-gold"></div>
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button type="button" onClick={cancelEditing} className="w-full bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">
                Cancelar
              </button>
              <button type="submit" className="w-full bg-sushi-gold text-sushi-black font-bold py-3 rounded-lg hover:bg-sushi-goldhover shadow-lg shadow-sushi-gold/10 transition-colors flex items-center justify-center gap-2 transform active:scale-95">
                <Check className="w-5 h-5" />
                {editingUser ? 'Guardar Cambios' : 'Registrar Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type="danger"
        confirmText="ELIMINAR"
      />
    </div >
  );
};

// Helper Row Component
const GranularPermissionRow = ({ label, icon: Icon, baseKey, permissions, toggle, hasApprove }: any) => {
  // Construct keys dynamically
  const viewKey = `view${baseKey}`;
  const createKey = `create${baseKey}`;
  const editKey = `edit${baseKey}`;
  const deleteKey = `delete${baseKey}`;
  const approveKey = `approve${baseKey}`;

  return (
    <div className="grid grid-cols-6 gap-2 py-2 items-center border-b border-gray-100 dark:border-white/5 last:border-0 min-w-[500px]">
      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-white font-medium col-span-1">
        <Icon className="w-4 h-4 text-gray-400" /> {label}
      </div>
      <div className="flex justify-center"><input type="checkbox" checked={!!permissions[viewKey]} onChange={() => toggle(viewKey)} className="w-4 h-4 accent-sushi-gold cursor-pointer" /></div>
      <div className="flex justify-center"><input type="checkbox" checked={!!permissions[createKey]} onChange={() => toggle(createKey)} className="w-4 h-4 accent-sushi-gold cursor-pointer" /></div>
      <div className="flex justify-center"><input type="checkbox" checked={!!permissions[editKey]} onChange={() => toggle(editKey)} className="w-4 h-4 accent-sushi-gold cursor-pointer" /></div>
      <div className="flex justify-center"><input type="checkbox" checked={!!permissions[deleteKey]} onChange={() => toggle(deleteKey)} className="w-4 h-4 accent-sushi-gold cursor-pointer" /></div>
      <div className="flex justify-center">
        {hasApprove && <input type="checkbox" checked={!!permissions[approveKey]} onChange={() => toggle(approveKey)} className="w-4 h-4 accent-sushi-gold cursor-pointer" />}
      </div>
    </div>
  );
};
