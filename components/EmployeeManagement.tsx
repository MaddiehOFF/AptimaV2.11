
import React, { useState } from 'react';
import { Employee, SanctionRecord, PaymentModality, PaymentMethod, EmployeeRole } from '../types';
import { Plus, Trash2, User as UserIcon, Briefcase, DollarSign, X, Clock, Camera, Pencil, AlertTriangle, Archive, RefreshCcw, Eye, EyeOff, Building, Calendar, Phone, CreditCard, Hash, UserCheck, Zap, Lock, Key, Crown, Shield, Medal, ChefHat, Bike, Circle, FileText, Table as TableIcon } from 'lucide-react';
import { exportToExcel, exportToPDF, exportCredentialsPDF } from '../utils/exportUtils';
import { playSound } from '../utils/soundUtils';
import { supabase } from '../supabaseClient';
import { ConfirmationModal } from './common/ConfirmationModal';

interface EmployeeManagementProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  sanctions: SanctionRecord[];
  customRoles: string[]; // Added customRoles prop
}

type TabType = 'GENERAL' | 'CONTRACT' | 'PERSONAL' | 'BANK';

// VISUAL HIERARCHY RANKING
export const RoleBadge = ({ role }: { role?: EmployeeRole }) => {
  switch (role) {
    case 'EMPRESA':
      return (
        <div className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2 py-0.5 rounded border border-purple-400 shadow-sm" title="Dueño / Empresa">
          <Crown className="w-3 h-3 fill-white" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Empresa</span>
        </div>
      );
    case 'GERENTE':
      return (
        <div className="flex items-center gap-1 bg-sushi-gold text-sushi-black px-2 py-0.5 rounded border border-yellow-500 shadow-sm" title="Gerente">
          <Shield className="w-3 h-3 fill-sushi-black" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Gerencia</span>
        </div>
      );
    case 'COORDINADOR':
      return (
        <div className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30" title="Coordinador">
          <Medal className="w-3 h-3" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Coord.</span>
        </div>
      );
    case 'JEFE_COCINA':
      return (
        <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-500/30" title="Jefe de Cocina">
          <ChefHat className="w-3 h-3" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Jefe Cocina</span>
        </div>
      );
    case 'ADMINISTRATIVO':
    case 'MOSTRADOR':
      return (
        <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/30" title="Staff Operativo">
          <Briefcase className="w-3 h-3" />
          <span className="text-[9px] font-bold uppercase tracking-wider">{role === 'ADMINISTRATIVO' ? 'Admin' : 'Mostrador'}</span>
        </div>
      );
    default: // COCINA, REPARTIDOR, etc AND CUSTOM ROLES
      // Check if it's a known system role or custom
      const isDelivery = role === 'REPARTIDOR' || role === 'DELIVERY';
      const isSystem = ['COCINA', 'REPARTIDOR', 'DELIVERY', 'MOSTRADOR', 'ADMINISTRATIVO', 'GERENTE', 'EMPRESA', 'COORDINADOR', 'JEFE_COCINA'].includes(role || '');

      return (
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded border ${!isSystem
          ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30'
          : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-sushi-muted border-gray-200 dark:border-white/10'}`}
          title={role}
        >
          {isDelivery ? <Bike className="w-3 h-3" /> : (!isSystem ? <Briefcase className="w-3 h-3" /> : <Circle className="w-3 h-3" />)}
          <span className="text-[9px] font-bold uppercase tracking-wider">
            {role ? role.replace(/_/g, ' ') : 'Staff'}
          </span>
        </div>
      );
  }
};

// Re-export simply for compatibility with other files if they imported it
export const RankBadge = RoleBadge;

// FIX: Component defined outside to prevent re-renders losing focus
const InputField = ({ label, icon: Icon, type = "text", value, onChange, placeholder, required = false }: any) => (
  <div>
    <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-sushi-muted" />}
      <input
        type={type}
        required={required}
        value={value || ''}
        onChange={onChange}
        className={`w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 ${Icon ? 'pl-10' : 'pl-4'} pr-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors`}
        placeholder={placeholder}
      />
    </div>
  </div>
);

// Role Selector Component
const RoleSelector = ({ value, onChange, customRoles = [] }: { value?: string, onChange: (role: EmployeeRole, label: string) => void, customRoles?: string[] }) => {
  // HIERARCHY ORDER
  const systemRoles: { id: EmployeeRole, label: string }[] = [
    { id: 'EMPRESA', label: 'Dueño / Empresa' },
    { id: 'GERENTE', label: 'Gerente' },
    { id: 'COORDINADOR', label: 'Coordinador' },
    { id: 'JEFE_COCINA', label: 'Jefe de Cocina' },
    { id: 'ADMINISTRATIVO', label: 'Administrativo' },
    { id: 'MOSTRADOR', label: 'Mostrador' },
    { id: 'COCINA', label: 'Cocina' },
    { id: 'REPARTIDOR', label: 'Delivery / Repartidor' },
  ];

  // Merge with custom roles
  const allRoles = [
    ...systemRoles,
    ...customRoles.map(r => ({ id: r, label: r.replace(/_/g, ' ') }))
  ];

  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Rol / Jerarquía</label>
      <div className="relative">
        <Briefcase className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-sushi-muted" />
        <select
          value={value || 'COCINA'}
          onChange={(e) => {
            const selectedRole = e.target.value as EmployeeRole;
            const label = allRoles.find(r => r.id === selectedRole)?.label || '';
            onChange(selectedRole, label);
          }}
          className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 pl-10 pr-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors appearance-none"
        >
          {allRoles.map(r => (
            <option key={r.id} value={r.id} className="dark:bg-sushi-dark">
              {r.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const DaysSelector = ({ value = [], onChange }: { value?: string[], onChange: (days: string[]) => void }) => {
  const allDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const toggleDay = (day: string) => {
    if (value.includes(day)) {
      onChange(value.filter(d => d !== day));
    } else {
      onChange([...value, day]);
    }
  };
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-2">Días Asignados</label>
      <div className="flex flex-wrap gap-2">
        {allDays.map(day => (
          <button
            key={day}
            type="button"
            onClick={() => toggleDay(day)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-all ${value.includes(day)
              ? 'bg-sushi-gold text-sushi-black border-sushi-gold font-bold shadow-sm'
              : 'bg-transparent text-gray-400 dark:text-sushi-muted border-gray-300 dark:border-white/10 hover:border-sushi-gold/50'
              }`}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
};

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ employees, setEmployees, sanctions }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('GENERAL');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

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

  const initialFormState: Partial<Employee> = {
    name: '',
    position: 'Personal',
    role: 'COCINA',
    monthlySalary: 0,
    scheduleStart: '17:00',
    scheduleEnd: '01:00',
    active: true,
    photoUrl: '',
    password: '',
    dni: '',
    cuil: '',
    address: '',
    phone: '',
    startDate: '',
    interviewer: '',
    paymentModality: 'MENSUAL',
    nextPaymentDate: '',
    nextPaymentMethod: 'TRANSFERENCIA',
    cbu: '',
    alias: '',
    bankName: '',
    bankAccountHolder: '',
    bankAccountNumber: '',
    bankAccountType: 'CAJA_AHORRO',
    assignedDays: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] // Default 6 days
  };

  const [formData, setFormData] = useState<Partial<Employee>>(initialFormState);

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Client-side Image Resize to prevent huge payloads
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8)); // 80% quality
        };
      };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedImage = await resizeImage(file);
        setPhotoPreview(resizedImage);
        setFormData({ ...formData, photoUrl: resizedImage });
      } catch (error) {
        console.error("Error resizing image", error);
        alert("Error al procesar la imagen");
      }
    }
  };

  const openModalForCreate = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setPhotoPreview(null);
    setActiveTab('GENERAL');
    setIsModalOpen(true);
  };

  const createDemoEmployee = () => {
    const demo: Employee = {
      id: generateUUID(),
      name: "Hiroshi Tanaka",
      position: "Jefe de Cocina",
      role: 'JEFE_COCINA',
      monthlySalary: 850000,
      scheduleStart: "16:00",
      scheduleEnd: "23:00",
      active: true,
      photoUrl: "", // No default image
      password: "1234",
      dni: "94.123.456",
      cuil: "20-94123456-9",
      address: "Av. Libertador 1234, CABA",
      phone: "+54 9 11 5555-1234",
      startDate: new Date().toISOString().split('T')[0],
      interviewer: "Gerente General",
      paymentModality: "MENSUAL",
      cbu: "0170123456789012345678",
      alias: "HIROSHI.SUSHI.BBVA",
      bankName: "BBVA Francés",
      bankAccountHolder: "Hiroshi Tanaka",
      bankAccountNumber: "123-456789/0",
      bankAccountType: "CAJA_AHORRO",
      assignedDays: ['Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      nextPaymentDate: '',
      nextPaymentMethod: 'TRANSFERENCIA'
    };
    setEmployees([...employees, demo]);
  };

  const openModalForEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormData({ ...emp });
    setPhotoPreview(emp.photoUrl || null);
    setActiveTab('GENERAL');
    setIsModalOpen(true);
  };

  const handleResetData = async () => {
    if (!editingId) return;

    // Double Confirmation via Modal
    setConfirmModal({
      isOpen: true,
      title: '⚠️ ¿REINICIAR DATOS?',
      message: '¿Estás SEGURO? Se borrará TODO el historial (asistencias, pagos, sanciones). El saldo volverá a $0. Esta acción es IRREVERSIBLE.',
      type: 'danger',
      confirmText: 'SÍ, BORRAR TODO',
      onConfirm: async () => {
        try {
          playSound('CLICK');

          // 1. Delete Attendance (Table 'records' uses JSONB 'data' column)
          // Since it's JSONB, we can't use .eq('employeeId', ...), we must filter the JSON.
          const { error: attError } = await supabase
            .from('records')
            .delete()
            .filter('data->>employeeId', 'eq', editingId);
          if (attError) throw attError;

          // 2. Delete Absences (Table 'absences' uses JSONB 'data' column)
          const { error: absError } = await supabase
            .from('absences')
            .delete()
            .filter('data->>employeeId', 'eq', editingId);
          if (absError) throw absError;

          // 3. Delete Payroll Movements (Table 'payroll_movements' is STRUCTURED with columns)
          const { error: payError } = await supabase
            .from('payroll_movements')
            .delete()
            .eq('employee_id', editingId); // Correct Snake Case Column
          if (payError) throw payError;

          // 4. Delete Sanctions (Table 'sanctions' uses JSONB 'data' column)
          const { error: sancError } = await supabase
            .from('sanctions')
            .delete()
            .filter('data->>employeeId', 'eq', editingId);
          if (sancError) throw sancError;

          // 5. Reset Employee Stats (Table 'employees' uses JSONB 'data' column)
          // We must Read -> Modify -> Write to preserve other fields in 'data'

          // A. Fetch current data
          const { data: currentEmpRow, error: fetchError } = await supabase
            .from('employees')
            .select('data')
            .eq('id', editingId)
            .single();

          if (fetchError) throw fetchError;

          // B. Prepare new data
          const updatedEmpData = {
            ...currentEmpRow.data,
            balance: 0,
            payroll_start_date: null // Reset cycle
          };

          // C. Update the row
          const { error: empError } = await supabase
            .from('employees')
            .update({
              data: updatedEmpData
            })
            .eq('id', editingId);

          if (empError) throw empError;

          // 5. Update Local State
          setEmployees(prev => prev.map(emp => {
            if (emp.id === editingId) {
              return { ...emp, balance: 0, payrollStartDate: undefined };
            }
            return emp;
          }));

          playSound('SUCCESS');
          alert("✅ Datos reiniciados correctamente. El empleado está limpio de historial.");
          setIsModalOpen(false);

        } catch (error) {
          console.error('Error resetting data:', error);
          playSound('ERROR');
          alert("Error al reiniciar datos. Revisa la consola.");
        }
      }
    });
  };

  const handleDeletePermanently = async () => {
    if (!employeeToDelete) return;

    // Double Confirmation removed as the custom modal already validates this
    const empId = employeeToDelete.id;

    try {
      playSound('CLICK');

      // 1. Delete Attendance
      const { error: attError } = await supabase
        .from('records')
        .delete()
        .filter('data->>employeeId', 'eq', empId);
      if (attError) throw attError;

      // 2. Delete Absences
      const { error: absError } = await supabase
        .from('absences')
        .delete()
        .filter('data->>employeeId', 'eq', empId);
      if (absError) throw absError;

      // 3. Delete Payroll Movements
      const { error: payError } = await supabase
        .from('payroll_movements')
        .delete()
        .eq('employee_id', empId);
      if (payError) throw payError;

      // 4. Delete Sanctions
      const { error: sancError } = await supabase
        .from('sanctions')
        .delete()
        .filter('data->>employeeId', 'eq', empId);
      if (sancError) throw sancError;

      // 5. Delete Employee Record
      const { error: empError } = await supabase
        .from('employees')
        .delete()
        .eq('id', empId);
      if (empError) throw empError;

      // 6. Update Local State
      setEmployees(prev => prev.filter(emp => emp.id !== empId));
      setEmployeeToDelete(null);

      playSound('SUCCESS');
      alert("✅ Empleado eliminado definitivamente.");

    } catch (error) {
      console.error('Error deleting employee:', error);
      playSound('ERROR');
      alert("Error al eliminar empleado. Revisa la consola.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.role) {
      alert("El nombre y el rol son obligatorios");
      return;
    }

    if (editingId) {
      setEmployees(employees.map(emp => emp.id === editingId ? { ...emp, ...formData } as Employee : emp));
    } else {
      const employee: Employee = {
        id: generateUUID(),
        name: formData.name!,
        position: formData.position || 'Empleado',
        role: formData.role,
        monthlySalary: Number(formData.monthlySalary) || 0,
        scheduleStart: formData.scheduleStart || '17:00',
        scheduleEnd: formData.scheduleEnd || '01:00',
        active: true,
        photoUrl: formData.photoUrl,
        password: formData.password || '1234',
        dni: formData.dni,
        cuil: formData.cuil,
        address: formData.address,
        phone: formData.phone,
        startDate: formData.startDate,
        interviewer: formData.interviewer,
        paymentModality: formData.paymentModality,
        nextPaymentDate: formData.nextPaymentDate,
        nextPaymentMethod: formData.nextPaymentMethod,
        cbu: formData.cbu,
        alias: formData.alias,
        bankName: formData.bankName,
        bankAccountHolder: formData.bankAccountHolder,
        bankAccountNumber: formData.bankAccountNumber,
        bankAccountType: formData.bankAccountType,
        assignedDays: formData.assignedDays || ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      };
      setEmployees([...employees, employee]);
    }

    setIsModalOpen(false);
  };

  const confirmArchive = () => {
    if (employeeToDelete) {
      if (showArchived) {
        // If viewing archived, logic is handled by handleDeletePermanently
        handleDeletePermanently();
      } else {
        setEmployees(employees.map(e => e.id === employeeToDelete.id ? { ...e, active: false } : e));
        setEmployeeToDelete(null);
      }
    }
  };

  const restoreEmployee = (id: string) => {
    setEmployees(employees.map(e => e.id === id ? { ...e, active: true } : e));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
  };

  const calculateHourlyRate = (salary: number) => {
    return salary / 200;
  };

  const getStrikesCount = (empId: string) => {
    return sanctions.filter(s => s.employeeId === empId && s.type === 'STRIKE').length;
  };

  const filteredEmployees = employees.filter(e => showArchived ? !e.active : e.active);

  const handleExport = (type: 'PDF' | 'EXCEL') => {
    playSound('CLICK');
    const dataToExport = filteredEmployees.map(e => ({
      Nombre: e.name,
      Rol: e.position,
      Sueldo: e.monthlySalary,
      Ingreso: e.scheduleStart,
      Salida: e.scheduleEnd,
      DNI: e.dni || '-',
      Telefono: e.phone || '-',
      Estado: e.active ? 'Activo' : 'Inactivo'
    }));

    if (type === 'PDF') {
      const rows = dataToExport.map(r => [r.Nombre, r.Rol, r.Sueldo, `${r.Ingreso}-${r.Salida}`, r.DNI, r.Estado]);
      exportToPDF(
        `Listado de Personal - ${showArchived ? 'Histórico' : 'Activos'}`,
        ['Nombre', 'Rol', 'Sueldo', 'Horario', 'DNI', 'Estado'],
        rows,
        `Personal_${new Date().toISOString().split('T')[0]}`
      );
    } else {
      exportToExcel(dataToExport, `Personal_${new Date().toISOString().split('T')[0]}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-serif text-gray-900 dark:text-white">Equipo Sushiblack</h2>
          <p className="text-gray-500 dark:text-sushi-muted mt-2">Gestiona contratos, horarios y remuneraciones.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1 mr-2">
            <button
              onClick={() => handleExport('EXCEL')}
              className="p-2 text-xs text-green-700 dark:text-green-500 hover:bg-white dark:hover:bg-white/10 rounded-md transition-all"
              title="Exportar Excel"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <div className="w-px bg-gray-300 dark:bg-white/10 mx-1"></div>
            <button
              onClick={() => handleExport('PDF')}
              className="p-2 text-xs text-red-700 dark:text-red-500 hover:bg-white dark:hover:bg-white/10 rounded-md transition-all group relative"
              title="Exportar PDF"
            >
              <FileText className="w-4 h-4" />
              <span className="absolute -top-8 right-0 w-max px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Recomendado para informes
              </span>
            </button>
          </div>

          <button
            onClick={createDemoEmployee}
            className="px-3 py-2 rounded-lg font-medium text-xs bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-sushi-muted hover:bg-gray-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1"
            title="Crear empleado de prueba"
          >
            <Zap className="w-3 h-3" />
            Demo
          </button>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm border ${showArchived ? 'bg-sushi-gold text-sushi-black border-sushi-gold' : 'bg-transparent text-gray-500 dark:text-sushi-muted border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 hover:text-gray-900 dark:hover:text-white'}`}
          >
            {showArchived ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showArchived ? 'Ocultar Archivo' : 'Ver Histórico'}
          </button>
          <button
            id="btn-add-employee"
            onClick={openModalForCreate}
            className="bg-sushi-gold text-sushi-black px-4 py-2 rounded-lg font-medium hover:bg-sushi-goldhover transition-colors flex items-center gap-2 shadow-lg shadow-sushi-gold/20"
          >
            <Plus className="w-5 h-5" />
            Registrar Empleado
          </button>
        </div>
      </div>

      {showArchived && (
        <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg flex items-center gap-3 text-orange-600 dark:text-orange-400 text-sm">
          <Archive className="w-5 h-5" />
          <span>Estás visualizando el personal archivado. Estos empleados no aparecen en las listas de selección diarias.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((emp) => {
          const strikes = getStrikesCount(emp.id);
          return (
            <div key={emp.id} className={`bg-white dark:bg-sushi-dark border p-5 rounded-xl flex flex-col justify-between group transition-all relative overflow-hidden shadow-sm hover:shadow-lg dark:shadow-none ${emp.active ? 'border-gray-200 dark:border-white/5 hover:border-sushi-gold/30' : 'border-gray-200 dark:border-white/5 opacity-70 grayscale hover:grayscale-0'}`}>
              {/* Background glow for active */}
              {emp.active && <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 dark:bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-sushi-gold/10 transition-colors pointer-events-none"></div>}

              <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-sushi-gold/20 overflow-hidden bg-gray-100 dark:bg-black/50 relative">
                    {emp.photoUrl ? (
                      <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-sushi-muted">
                        <UserIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                      {emp.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <RoleBadge role={emp.role} />
                    </div>
                    <p className="text-gray-500 dark:text-sushi-muted text-xs uppercase tracking-wide mt-1">{emp.position}</p>

                    {emp.active ? (
                      strikes > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded text-[10px] w-fit font-bold border border-red-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{strikes} {strikes === 1 ? 'Strike' : 'Strikes'}</span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-1 mt-1 text-gray-500 dark:text-sushi-muted bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-[10px] w-fit font-bold border border-gray-200 dark:border-white/10">
                        <Archive className="w-3 h-3" />
                        <span>ARCHIVADO</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {emp.active ? (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); openModalForEdit(emp); }}
                        className="text-gray-400 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEmployeeToDelete(emp); }}
                        className="text-gray-400 dark:text-sushi-muted hover:text-red-500 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg"
                        title="Dar de Baja"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); restoreEmployee(emp.id); }}
                        className="text-gray-400 dark:text-sushi-muted hover:text-sushi-gold transition-colors p-1.5 hover:bg-sushi-gold/10 rounded-lg"
                        title="Restaurar Empleado"
                      >
                        <RefreshCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEmployeeToDelete(emp); }}
                        className="text-gray-400 dark:text-sushi-muted hover:text-red-500 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg"
                        title="Eliminar Definitivamente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-200 dark:border-white/5 pt-4 mt-4 z-10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-sushi-muted">
                    {emp.paymentModality === 'DIARIO' ? 'Pago Diario:' :
                      emp.paymentModality === 'SEMANAL' ? 'Sueldo Semanal:' :
                        emp.paymentModality === 'QUINCENAL' ? 'Sueldo Quincenal:' :
                          'Sueldo Mensual:'}
                  </span>
                  <span className="text-gray-900 dark:text-white font-mono flex items-center gap-2">
                    {formatCurrency(emp.monthlySalary)}
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${emp.paymentModality === 'DIARIO' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      emp.paymentModality === 'SEMANAL' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                        emp.paymentModality === 'QUINCENAL' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                      {emp.paymentModality?.substring(0, 3) || 'MEN'}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-sushi-muted">Horario:</span>
                  <span className="text-sushi-gold font-bold bg-sushi-gold/10 px-2 py-0.5 rounded text-xs border border-sushi-gold/20">{emp.scheduleStart} - {emp.scheduleEnd}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400 dark:text-sushi-muted mt-2">
                  <span>Valor Hora (Est.):</span>
                  <span>{formatCurrency(calculateHourlyRate(emp.monthlySalary))}</span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredEmployees.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 dark:text-sushi-muted bg-gray-50 dark:bg-sushi-dark/50 rounded-xl border border-dashed border-gray-300 dark:border-white/10">
            {showArchived ? 'No hay empleados archivados en el historial.' : 'No hay empleados activos. Añade uno nuevo para comenzar.'}
          </div>
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/10 p-6 rounded-xl w-full max-w-sm shadow-2xl relative">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-500 mb-4">
                <Archive className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{showArchived ? '¿Eliminar Definitivamente?' : '¿Archivar Empleado?'}</h3>
              <p className="text-gray-600 dark:text-sushi-muted text-sm mb-6">
                {showArchived ? (
                  <>
                    Estás a punto de <strong className="text-red-600">ELIMINAR DEFINITIVAMENTE</strong> a <strong className="text-gray-900 dark:text-white">{employeeToDelete.name}</strong>.
                    <br /><br />
                    Esta acción esirreversible y eliminará <strong>TODO</strong> el historial (pagos, asistencias, sanciones).
                  </>
                ) : (
                  <>
                    Estás a punto de dar de baja a <strong className="text-gray-900 dark:text-white">{employeeToDelete.name}</strong>.
                    <br /><br />
                    Sus datos históricos (horas y sanciones) se conservarán, pero ya no aparecerá en las listas de personal activo.
                  </>
                )}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setEmployeeToDelete(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmArchive}
                  className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors font-medium shadow-lg hover:shadow-xl ${showArchived ? 'bg-red-800 hover:bg-red-900 shadow-red-800/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'}`}
                >
                  {showArchived ? 'Eliminar' : 'Archivar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative animate-fade-in max-h-[90vh] overflow-hidden flex flex-col">

            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-black/20">
              <h3 className="text-2xl font-serif text-gray-900 dark:text-white">
                {editingId ? 'Editar Expediente' : 'Nuevo Contrato'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              {/* Tabs and Content are identical to previous version, just ensuring RoleSelector is used inside content */}
              <div className="flex border-b border-gray-200 dark:border-white/10 px-6 pt-2">
                {[
                  { id: 'GENERAL', label: 'General', icon: UserIcon },
                  { id: 'CONTRACT', label: 'Contrato', icon: Briefcase },
                  { id: 'PERSONAL', label: 'Personal', icon: Phone },
                  { id: 'BANK', label: 'Bancario', icon: CreditCard }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'GENERAL' && tab.id === 'GENERAL' ? 'border-sushi-gold text-sushi-gold' : activeTab === tab.id ? 'border-sushi-gold text-sushi-gold' : 'border-transparent text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8">

                {activeTab === 'GENERAL' && (
                  <div className="space-y-6">
                    {/* Photo Upload */}
                    <div className="flex justify-center mb-6">
                      <div className="relative group cursor-pointer">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-gray-300 dark:border-sushi-muted group-hover:border-sushi-gold transition-colors bg-gray-100 dark:bg-black/30 flex items-center justify-center">
                          {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-8 h-8 text-gray-400 dark:text-sushi-muted group-hover:text-sushi-gold" />
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/10 px-2 py-0.5 rounded text-[10px] text-gray-500 dark:text-sushi-muted whitespace-nowrap shadow-sm">
                          {photoPreview ? 'Cambiar Foto' : 'Subir Foto'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      <InputField label="Nombre Completo" icon={UserIcon} value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Juan Pérez" required />
                      <RoleSelector
                        value={formData.role}
                        onChange={(role, label) => setFormData({ ...formData, role, position: label })}
                      />

                      {/* New Password Field */}
                      <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                        <div className="flex items-center gap-2 mb-4 text-sushi-gold">
                          <Lock className="w-4 h-4" />
                          <h4 className="font-bold uppercase text-xs tracking-wider">Seguridad de Acceso</h4>
                        </div>
                        <InputField label="Contraseña Portal Miembro" icon={Key} type="text" value={formData.password} onChange={(e: any) => setFormData({ ...formData, password: e.target.value })} placeholder="Ej. 1234" required />
                        <p className="text-[10px] text-gray-500 dark:text-sushi-muted mt-2">Esta contraseña será utilizada por el empleado para ingresar a su portal personal junto con su DNI.</p>
                      </div>

                      {/* DANGER ZONE - Only for Admins/Editing */}
                      {editingId && (
                        <div className="pt-6 mt-2 border-t border-red-200 dark:border-red-900/30">
                          <div className="flex items-center gap-2 mb-4 text-red-600 dark:text-red-500">
                            <AlertTriangle className="w-4 h-4" />
                            <h4 className="font-bold uppercase text-xs tracking-wider">Zona de Peligro / Pruebas</h4>
                          </div>
                          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20">
                            <h5 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Reiniciar Datos del Empleado</h5>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                              Esta acción eliminará <strong>permanentemente</strong>:
                              <ul className="list-disc list-inside mt-1 ml-1 space-y-0.5">
                                <li>Todo el historial de asistencias (entradas/salidas).</li>
                                <li>Todos los movimientos de nómina y pagos (ledger).</li>
                                <li>Todas las sanciones y descuentos registrados.</li>
                                <li>El historial de balance (queda en $0).</li>
                              </ul>
                              <span className="block mt-2 font-bold text-red-600">
                                ¡No afecta Contrato, Sueldo ni Datos Personales!
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleResetData}
                              className="w-full py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 text-xs flex items-center justify-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Confirmar Reinicio de Datos
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'CONTRACT' && (
                  <div className="space-y-6">
                    <InputField
                      label={formData.paymentModality === 'DIARIO' ? "Monto Diario (ARS)" : "Label should be Sueldo (ARS)"}
                      icon={DollarSign}
                      type="number"
                      value={formData.monthlySalary}
                      onChange={(e: any) => setFormData({ ...formData, monthlySalary: parseFloat(e.target.value) })}
                      required
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Hora Ingreso</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-sushi-muted" />
                          <input
                            type="time"
                            value={formData.scheduleStart}
                            onChange={e => setFormData({ ...formData, scheduleStart: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 pl-9 pr-2 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Hora Salida</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-sushi-muted" />
                          <input
                            type="time"
                            value={formData.scheduleEnd}
                            onChange={e => setFormData({ ...formData, scheduleEnd: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 pl-9 pr-2 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Fecha de Ingreso" icon={Calendar} type="date" value={formData.startDate} onChange={(e: any) => setFormData({ ...formData, startDate: e.target.value })} />
                      <InputField label="Entrevistado Por" icon={UserCheck} value={formData.interviewer} onChange={(e: any) => setFormData({ ...formData, interviewer: e.target.value })} />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Modalidad de Pago</label>
                      <select
                        value={formData.paymentModality}
                        onChange={(e) => setFormData({ ...formData, paymentModality: e.target.value as PaymentModality })}
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors appearance-none"
                      >
                        <option value="MENSUAL">Mensual</option>
                        <option value="QUINCENAL">Quincenal</option>
                        <option value="SEMANAL">Semanal</option>
                        <option value="DIARIO">Diario</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                      <DaysSelector
                        value={formData.assignedDays}
                        onChange={(days) => setFormData({ ...formData, assignedDays: days })}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'PERSONAL' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="DNI" value={formData.dni} onChange={(e: any) => setFormData({ ...formData, dni: e.target.value })} placeholder="XX.XXX.XXX" />
                      <InputField label="CUIL" value={formData.cuil} onChange={(e: any) => setFormData({ ...formData, cuil: e.target.value })} placeholder="XX-XXXXXXXX-X" />
                    </div>
                    <InputField label="Dirección" value={formData.address} onChange={(e: any) => setFormData({ ...formData, address: e.target.value })} placeholder="Calle 123, Ciudad" />
                    <InputField label="Teléfono" value={formData.phone} onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })} placeholder="+54 9 11 ..." />
                    <InputField label="Fecha Nacimiento" type="date" value={formData.birthDate} onChange={(e: any) => setFormData({ ...formData, birthDate: e.target.value })} />
                  </div>
                )}

                {activeTab === 'BANK' && (
                  <div className="space-y-6">
                    <InputField label="Titular de la cuenta" icon={UserIcon} value={formData.bankAccountHolder} onChange={(e: any) => setFormData({ ...formData, bankAccountHolder: e.target.value })} placeholder="Nombre completo del titular" />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Nombre del Banco" icon={Building} value={formData.bankName} onChange={(e: any) => setFormData({ ...formData, bankName: e.target.value })} placeholder="Ej. Galicia" />
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-sushi-muted mb-1">Tipo de Cuenta</label>
                        <select
                          value={formData.bankAccountType}
                          onChange={(e) => setFormData({ ...formData, bankAccountType: e.target.value as any })}
                          className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-sushi-gold transition-colors appearance-none"
                        >
                          <option value="CAJA_AHORRO">Caja de Ahorro</option>
                          <option value="CUENTA_CORRIENTE">Cuenta Corriente</option>
                        </select>
                      </div>
                    </div>
                    <InputField label="Número de Cuenta" icon={Hash} value={formData.bankAccountNumber} onChange={(e: any) => setFormData({ ...formData, bankAccountNumber: e.target.value })} placeholder="000-000000/0" />
                    <InputField label="CBU / CVU" icon={CreditCard} value={formData.cbu} onChange={(e: any) => setFormData({ ...formData, cbu: e.target.value })} placeholder="22 dígitos" />
                    <InputField label="Alias" icon={Hash} value={formData.alias} onChange={(e: any) => setFormData({ ...formData, alias: e.target.value })} placeholder="alias.banco" />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex flex-col md:flex-row gap-3">
                {editingId && formData.password && formData.dni && (
                  <button
                    type="button"
                    onClick={() => exportCredentialsPDF(formData)}
                    className="w-full md:w-auto px-4 py-3 rounded-lg border border-sushi-gold text-sushi-gold font-bold hover:bg-sushi-gold/10 transition-colors flex items-center justify-center gap-2"
                    title="Generar PDF de Bienvenida"
                  >
                    <Key className="w-4 h-4" /> Exportar Credenciales
                  </button>
                )}
                <button
                  type="submit"
                  className="w-full bg-sushi-gold text-sushi-black font-bold py-3 rounded-lg hover:bg-sushi-goldhover transition-colors shadow-lg shadow-sushi-gold/20 flex-1"
                >
                  {editingId ? 'Actualizar Expediente' : 'Guardar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
