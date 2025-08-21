import { supabase } from './lib/supabase.ts';
import React, { useState, useEffect, useMemo } from 'react';
import { format, parse, isWithinInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ImportModal from './ImportModal';

// PapaParse via <script> no index.html
declare var Papa: any;

// --------- ÍCONES (SVG inline) ----------
const HomeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);
const DollarSignIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>);
const TagIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.586 4.586a2 2 0 0 0-2.828 0l-7.072 7.072A2 2 0 0 0 2.929 15.657l7.071 7.07a2 2 0 0 0 2.828 0l7.071-7.07a2 2 0 0 0 0-2.828L12.586 4.586Z"/><path d="M16 18V6a2 2 0 0 0-2-2H8.5L2 10.5V16a2 2 0 0 0 2 2h8"/></svg>);
const FilterIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 2H22l-8 10.155V22l-5-5V12.155L2.5 2z"/></svg>);
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>);
const PencilIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const LogOutIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>);
const PlusCircleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>);
const FileDownIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m15 15-3 3-3-3"/></svg>);
const UsersIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const BuildingIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>);

// --------- Helpers ----------
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const formatDate = (date: string) => {
  try {
    const parsedDate = parse(date, 'dd/MM/yyyy', new Date());
    if (isNaN(parsedDate.getTime())) {
      return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR });
    }
    return format(parsedDate, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return date;
  }
};

const getLocalStorageData = (key: string, def: any) => {
  try { const data = localStorage.getItem(key); return data ? JSON.parse(data) : def; }
  catch (e) { console.error(`Erro ao carregar "${key}"`, e); return def; }
};
const setLocalStorageData = (key: string, value: any) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.error(`Erro ao salvar "${key}"`, e); }
};

// --------- APP ----------
const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'dashboard'|'expenses'|'categories'|'users'|'companies'>('dashboard');
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categoryMappings, setCategoryMappings] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'expense'|'category'|'user'|'company'|''>('');
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingCompany, setEditingCompany] = useState<any>(null);

  const [toastMessage, setToastMessage] = useState<{message:string; type:'success'|'error'}|null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const currentUser = useMemo(() => ({ id: 'user_123', name: 'Gabriel', companyId: 'cnpj_12345', role: 'admin' as const }), []);
  const exampleCompanies = [{ id: 'consolidated', name: 'Consolidado' }];
  const exampleUsers = [{ id: 'user_123', name: 'Gabriel', companyId: 'cnpj_12345', role: 'admin' }];

  const generateId = () => `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // Carregar dados do Supabase ao iniciar a aplicação
  useEffect(() => {
    const fetchAllData = async () => {
      // Buscar Empresas
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*');
      if (companiesError) console.error('Erro ao buscar empresas:', companiesError);
      if (companiesData) setCompanies([...companiesData, ...exampleCompanies]);

      // Buscar Usuários
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');
      if (usersError) console.error('Erro ao buscar usuários:', usersError);
      if (usersData) setUsers([...usersData, ...exampleUsers]);
      
      // Buscar Categorias
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');
      if (categoriesError) console.error('Erro ao buscar categorias:', categoriesError);
      if (categoriesData) setCategories(categoriesData);

      // Buscar Despesas
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*');
      if (expensesError) console.error('Erro ao buscar despesas:', expensesError);
      if (expensesData) setExpenses(expensesData);

      // Mapeamentos de Categoria (vamos manter em localStorage por ser dado volátil e específico do usuário)
      setCategoryMappings(getLocalStorageData('category_mappings', {}));

      // Persistir a empresa selecionada do último uso
      const savedCompanyId = getLocalStorageData('selected_company_id', null);
      if (savedCompanyId) {
        setCompanyId(savedCompanyId);
      }
    };

    fetchAllData();
  }, []);

  // Persistir a empresa atualmente selecionada (ainda usa localStorage)
  useEffect(() => {
    setLocalStorageData('selected_company_id', companyId);
  }, [companyId]);

  // toast
  const showToast = (message: string, type: 'success'|'error'='success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // permissões
  const canEdit = companyId !== 'consolidated' && currentUser.role === 'admin';

  // modais
  const openExpenseModal = (expense: any = null) => {
    if (!canEdit) return showToast('Você não tem permissão para editar.', 'error');
    setEditingExpense(expense); setModalType('expense'); setShowModal(true);
  };
  const openCategoryModal = (category: any = null) => {
    if (!canEdit) return showToast('Você não tem permissão para editar.', 'error');
    setEditingCategory(category); setModalType('category'); setShowModal(true);
  };
  const openUserModal = (user: any = null) => {
    if (!canEdit) return showToast('Você não tem permissão para editar.', 'error');
    setEditingUser(user); setModalType('user'); setShowModal(true);
  };
  const openCompanyModal = (company: any = null) => {
    setEditingCompany(company); setModalType('company'); setShowModal(true);
  };
  const openImportModal = () => {
    if (!canEdit) return showToast('Você não tem permissão para editar.', 'error');
    setShowImportModal(true);
  };
  const closeModals = () => {
    setShowModal(false);
    setShowImportModal(false);
    setEditingExpense(null); setEditingCategory(null); setEditingUser(null); setEditingCompany(null);
  };

  // ----- Funções de mapeamento manual (ainda usam localStorage) -----
  const salvarMapeamento = () => {
    try {
      setLocalStorageData('category_mappings', categoryMappings);
      showToast('Mapeamento salvo com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar mapeamento.', 'error');
    }
  };

  const resetarMapeamento = () => {
    if (!window.confirm('Tem certeza que deseja apagar todos os mapeamentos?')) return;
    try {
      localStorage.removeItem('category_mappings');
      setCategoryMappings({});
      showToast('Mapeamentos removidos!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao resetar mapeamentos.', 'error');
    }
  };

  // ---------- UI ----------
  const Sidebar: React.FC = () => (
    <div className="flex flex-col w-64 bg-slate-900 text-white p-4 h-full rounded-2xl shadow-xl mr-4">
      <div className="flex items-center justify-between mb-8">
        <img src="https://placehold.co/150x50/2563EB/ffffff?text=Empresa+Inc." alt="Logo" className="h-10 rounded-md" />
        <button onClick={() => setCompanyId(null)} className="p-2 rounded-lg hover:bg-slate-700" title="Trocar Empresa"><LogOutIcon /></button>
      </div>
      <div className="text-xs text-slate-400 mb-4">Empresa: <strong>{companies.find(c => c.id === companyId)?.name}</strong></div>
      <nav className="flex-1">
        <ul>
          <li><a href="#" onClick={() => setCurrentPage('dashboard')} className={`flex items-center p-3 rounded-lg hover:bg-slate-700 ${currentPage==='dashboard'?'bg-slate-700':''}`}><HomeIcon /><span className="ml-3">Dashboard</span></a></li>
          <li><a href="#" onClick={() => setCurrentPage('expenses')} className={`flex items-center p-3 rounded-lg hover:bg-slate-700 mt-2 ${currentPage==='expenses'?'bg-slate-700':''}`}><DollarSignIcon /><span className="ml-3">Despesas</span></a></li>
          <li><a href="#" onClick={() => setCurrentPage('categories')} className={`flex items-center p-3 rounded-lg hover:bg-slate-700 mt-2 ${currentPage==='categories'?'bg-slate-700':''}`}><TagIcon /><span className="ml-3">Categorias</span></a></li>
          <li><a href="#" onClick={() => setCurrentPage('users')} className={`flex items-center p-3 rounded-lg hover:bg-slate-700 mt-2 ${currentPage==='users'?'bg-slate-700':''}`}><UsersIcon /><span className="ml-3">Usuários</span></a></li>
          <li><a href="#" onClick={() => setCurrentPage('companies')} className={`flex items-center p-3 rounded-lg hover:bg-slate-700 mt-2 ${currentPage==='companies'?'bg-slate-700':''}`}><BuildingIcon /><span className="ml-3">Empresas</span></a></li>
        </ul>
      </nav>
    </div>
  );

  const Header: React.FC<{ title: string }> = ({ title }) => (
    <header className="flex justify-between items-center py-4">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="flex space-x-4">
        {currentPage === 'expenses' && canEdit && (
          <button onClick={openImportModal} className="px-6 py-3 bg-slate-700 text-white rounded-xl shadow-lg hover:bg-slate-600">Importar CSV</button>
        )}
        {currentPage === 'expenses' && (
          <button
            onClick={() => {
              const dataToExport = expenses
                .filter(exp => exp.empresa_id === companyId || companyId === 'consolidated')
                .map(exp => ({
                  data: exp.data,
                  descricao: exp.descricao,
                  valor: exp.valor,
                  categoria: categories.find(cat => cat.id === exp.categoria_id)?.nome || 'N/A',
                  empresa: companies.find(comp => comp.id === exp.empresa_id)?.name || 'N/A'
                }));
              const csv = Papa.unparse(dataToExport, { header: true, delimiter: ';' });
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `despesas-empresa-${companyId}.csv`;
              link.click();
              showToast('Dados exportados com sucesso!', 'success');
            }}
            className="px-6 py-3 bg-slate-700 text-white rounded-xl shadow-lg hover:bg-slate-600 flex items-center"
          >
            <FileDownIcon /><span className="ml-2">Exportar CSV</span>
          </button>
        )}
        {currentPage === 'expenses' && canEdit && (
          <button onClick={() => openExpenseModal()} className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 flex items-center">
            <PlusIcon /><span className="ml-2">Nova Despesa</span>
          </button>
        )}

        {/* Botões para gerenciamento manual de mapeamentos (ainda com localStorage) */}
        {currentPage === 'expenses' && canEdit && (
          <button
            onClick={salvarMapeamento}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 flex items-center"
            title="Salvar mapeamento de descrição → categoria"
          >
            <span>Salvar Mapeamento</span>
          </button>
        )}
        {currentPage === 'expenses' && canEdit && (
          <button
            onClick={resetarMapeamento}
            className="px-6 py-3 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 flex items-center"
            title="Apagar todos os mapeamentos salvos"
          >
            <span>Resetar Mapeamento</span>
          </button>
        )}
        {currentPage === 'categories' && canEdit && (
          <button onClick={() => openCategoryModal()} className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 flex items-center">
            <PlusIcon /><span className="ml-2">Nova Categoria</span>
          </button>
        )}
        {currentPage === 'users' && canEdit && (
          <button onClick={() => openUserModal()} className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 flex items-center">
            <PlusIcon /><span className="ml-2">Novo Usuário</span>
          </button>
        )}
        {currentPage === 'companies' && canEdit && (
          <button onClick={() => openCompanyModal()} className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 flex items-center">
            <PlusIcon /><span className="ml-2">Nova Empresa</span>
          </button>
        )}
      </div>
    </header>
  );

  const Card: React.FC<{ title: string; className?: string; children: React.ReactNode }> = ({ title, children, className = '' }) => (
    <div className={`bg-slate-800 p-6 rounded-3xl shadow-xl ${className}`}>
      <h3 className="text-xl font-semibold mb-4 text-slate-200">{title}</h3>
      {children}
    </div>
  );

  const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );

  const CategoryForm: React.FC = () => {
    const [formData, setFormData] = useState({ nome: editingCategory?.nome || '', cor: editingCategory?.cor || '#64748b', ativa: editingCategory?.ativa ?? true });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!companyId) return showToast('Selecione uma empresa antes de criar uma categoria.', 'error');
      
      if (editingCategory) {
        const { data, error } = await supabase
          .from('categories')
          .update(formData)
          .eq('id', editingCategory.id)
          .select();

        if (error) {
          console.error('Erro ao atualizar categoria:', error);
          showToast('Erro ao atualizar categoria.', 'error');
        } else {
          setCategories(prev => prev.map(cat => cat.id === editingCategory.id ? data[0] : cat));
          showToast('Categoria atualizada!', 'success');
          closeModals();
        }
      } else {
        const { data, error } = await supabase
          .from('categories')
          .insert({ ...formData, id: generateId(), empresa_id: companyId })
          .select();
        
        if (error) {
          console.error('Erro ao criar categoria:', error);
          showToast('Erro ao criar categoria.', 'error');
        } else {
          setCategories(prev => [...prev, data[0]]);
          showToast('Categoria criada!', 'success');
          closeModals();
        }
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 text-white">
        <div><label className="block text-sm mb-1">Nome</label><input name="nome" value={formData.nome} onChange={handleChange} required className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700" /></div>
        <div><label className="block text-sm mb-1">Cor</label><input type="color" name="cor" value={formData.cor} onChange={handleChange} className="w-full h-10 p-1 bg-slate-800 rounded-lg border border-slate-700" /></div>
        <div className="flex items-center"><input type="checkbox" name="ativa" checked={formData.ativa} onChange={e => setFormData(p => ({ ...p, ativa: e.target.checked }))} className="mr-2" id="cat-ativa" /><label htmlFor="cat-ativa">Ativa</label></div>
        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={closeModals} className="px-6 py-3 border border-slate-700 text-white rounded-xl hover:bg-slate-700">Cancelar</button>
          <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700">Salvar</button>
        </div>
      </form>
    );
  };

  const ExpenseForm: React.FC = () => {
    const [formData, setFormData] = useState({
      data: editingExpense?.data || format(new Date(), 'yyyy-MM-dd'),
      descricao: editingExpense?.descricao || '',
      valor: editingExpense?.valor || '',
      categoria_id: editingExpense?.categoria_id || '',
    });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const expenseData = {
        ...formData,
        valor: parseFloat(String(formData.valor).replace(',', '.')),
        data: format(parseISO(formData.data), 'dd/MM/yyyy'),
        empresa_id: companyId,
      };

      if (editingExpense) {
        const { data, error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)
          .select();

        if (error) {
          console.error('Erro ao atualizar despesa:', error);
          showToast('Erro ao atualizar despesa.', 'error');
        } else {
          setExpenses(prev => prev.map(exp => exp.id === editingExpense.id ? data[0] : exp));
          showToast('Despesa atualizada!', 'success');
          closeModals();
        }
      } else {
        const { data, error } = await supabase
          .from('expenses')
          .insert({ ...expenseData, id: generateId() })
          .select();
        
        if (error) {
          console.error('Erro ao criar despesa:', error);
          showToast('Erro ao criar despesa.', 'error');
        } else {
          setExpenses(prev => [...prev, data[0]]);
          showToast('Despesa criada!', 'success');
          closeModals();
        }
      }
    };
    return (
      <form onSubmit={handleSubmit} className="space-y-4 text-white">
        <div><label className="block text-sm mb-1">Data</label><input type="date" name="data" value={formData.data} onChange={handleChange} required className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700" /></div>
        <div><label className="block text-sm mb-1">Descrição</label><input name="descricao" value={formData.descricao} onChange={handleChange} required className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700" /></div>
        <div><label className="block text-sm mb-1">Valor</label><input type="number" name="valor" value={formData.valor} onChange={handleChange} required step="0.01" className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700" /></div>
        <div>
          <label className="block text-sm mb-1">Categoria</label>
          <select name="categoria_id" value={formData.categoria_id} onChange={handleChange} required className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700">
            <option value="">Selecionar Categoria</option>
            {categories.filter(c => c.empresa_id === companyId).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={closeModals} className="px-6 py-3 border border-slate-700 text-white rounded-xl hover:bg-slate-700">Cancelar</button>
          <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700">Salvar</button>
        </div>
      </form>
    );
  };

  const UserForm: React.FC = () => {
    const [formData, setFormData] = useState({ name: editingUser?.name || '', email: editingUser?.email || '', role: editingUser?.role || 'viewer' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const userData = { ...formData, companyId: companyId };
      
      if (editingUser) {
        const { data, error } = await supabase
          .from('users')
          .update(userData)
          .eq('id', editingUser.id)
          .select();

        if (error) {
          console.error('Erro ao atualizar usuário:', error);
          showToast('Erro ao atualizar usuário.', 'error');
        } else {
          setUsers(prev => prev.map(u => u.id === editingUser.id ? data[0] : u));
          showToast('Usuário atualizado!', 'success');
          closeModals();
        }
      } else {
        const { data, error } = await supabase
          .from('users')
          .insert({ ...userData, id: generateId() })
          .select();

        if (error) {
          console.error('Erro ao criar usuário:', error);
          showToast('Erro ao criar usuário.', 'error');
        } else {
          setUsers(prev => [...prev, data[0]]);
          showToast('Usuário criado!', 'success');
          closeModals();
        }
      }
    };
    return (
      <form onSubmit={handleSubmit} className="space-y-4 text-white">
        <div><label className="block text-sm mb-1">Nome</label><input name="name" value={formData.name} onChange={handleChange} required className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700" /></div>
        <div><label className="block text-sm mb-1">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700" /></div>
        <div>
          <label className="block text-sm mb-1">Função</label>
          <select name="role" value={formData.role} onChange={handleChange} required className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700">
            <option value="admin">Administrador</option>
            <option value="viewer">Visualizador</option>
          </select>
        </div>
        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={closeModals} className="px-6 py-3 border border-slate-700 text-white rounded-xl hover:bg-slate-700">Cancelar</button>
          <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700">Salvar</button>
        </div>
      </form>
    );
  };

  const CompanyForm: React.FC = () => {
    const [formData, setFormData] = useState({ name: editingCompany?.name || '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (editingCompany) {
        const { data, error } = await supabase
          .from('companies')
          .update(formData)
          .eq('id', editingCompany.id)
          .select();

        if (error) {
          console.error('Erro ao atualizar empresa:', error);
          showToast('Erro ao atualizar empresa.', 'error');
        } else {
          setCompanies(prev => prev.map(c => c.id === editingCompany.id ? data[0] : c));
          showToast('Empresa atualizada!', 'success');
          closeModals();
        }
      } else {
        const newId = generateId();
        const { data, error } = await supabase
          .from('companies')
          .insert({ ...formData, id: newId })
          .select();

        if (error) {
          console.error('Erro ao criar empresa:', error);
          showToast('Erro ao criar empresa.', 'error');
        } else {
          setCompanies(prev => [...prev.filter(c => c.id !== 'consolidated'), data[0], { id: 'consolidated', name: 'Consolidado' }]);
          setCompanyId(newId);
          showToast('Empresa criada!', 'success');
          closeModals();
        }
      }
    };
    return (
      <form onSubmit={handleSubmit} className="space-y-4 text-white">
        <div><label className="block text-sm mb-1">Nome</label><input name="name" value={formData.name} onChange={handleChange} required className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700" /></div>
        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={closeModals} className="px-6 py-3 border border-slate-700 text-white rounded-xl hover:bg-slate-700">Cancelar</button>
          <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700">Salvar</button>
        </div>
      </form>
    );
  };

  const DashboardPage: React.FC = () => {
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    const filteredExpenses = useMemo(() => {
      const start = parseISO(startDate); const end = parseISO(endDate);
      const all = expenses.filter(exp => {
        const expDate = typeof exp.data === 'string' && exp.data.includes('-') ? parseISO(exp.data) : parse(exp.data, 'dd/MM/yyyy', new Date());
        return isWithinInterval(expDate, { start, end });
      });
      return companyId === 'consolidated' ? all : all.filter(exp => exp.empresa_id === companyId);
    }, [expenses, startDate, endDate, companyId]);

    const consolidatedData = useMemo(() => {
      const totals: Record<string, number> = {};
      filteredExpenses.forEach(exp => {
        const cat = categories.find(c => c.id === exp.categoria_id);
        if (cat) totals[cat.nome] = (totals[cat.nome] || 0) + exp.valor;
      });
      const total = Object.values(totals).reduce((s, n) => s + n, 0);
      const data = Object.keys(totals).map(name => {
        const cat = categories.find(c => c.nome === name);
        const value = totals[name];
        return { name, total: value, color: cat ? cat.cor : '#94a3b8', percent: total > 0 ? ((value / total) * 100).toFixed(1) : 0 };
      }).sort((a, b) => b.total - a.total);
      return { total, data };
    }, [filteredExpenses, categories]);

    const renderDonutChart = () => {
      if (!consolidatedData.data.length) return null;
      let currentOffset = 0;
      return (
        <svg viewBox="0 0 36 36" className="donut w-full h-full">
          <circle className="donut-ring" cx="18" cy="18" r="15.915494309189535" fill="transparent" stroke="#334155" strokeWidth="3"></circle>
          {consolidatedData.data.map(item => {
            const p = parseFloat(String(item.percent));
            const seg = <circle key={item.name} className="donut-segment" cx="18" cy="18" r="15.915494309189535" fill="transparent" stroke={item.color} strokeWidth="3" strokeDasharray={`${p} ${100-p}`} strokeDashoffset={100-currentOffset}></circle>;
            currentOffset += p; return seg;
          })}
        </svg>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-800 shadow-md">
          <FilterIcon />
          <div className="flex-1">
            <label className="text-sm text-slate-400">Data de Início</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 text-white rounded-lg" />
          </div>
          <div className="flex-1">
            <label className="text-sm text-slate-400">Data de Fim</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 text-white rounded-lg" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card title="Total no Período"><span className="text-4xl font-bold text-blue-500">{formatCurrency(consolidatedData.total)}</span></Card>
          <Card title="Nº de Despesas"><span className="text-4xl font-bold">{filteredExpenses.length}</span></Card>
          <Card title="Ticket Médio"><span className="text-4xl font-bold">{formatCurrency(consolidatedData.total / (filteredExpenses.length || 1))}</span></Card>
        </div>

        <Card title="Consolidado por Categoria" className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-8">
          <div className="w-full lg:w-1/2 flex justify-center items-center h-40"><div className="w-40 h-40">{renderDonutChart()}</div></div>
          <div className="w-full lg:w-1/2">
            <table className="w-full text-left">
              <thead><tr className="border-b border-slate-700"><th className="py-2">Categoria</th><th className="py-2">Total</th><th className="py-2">% do Total</th></tr></thead>
              <tbody>
                {consolidatedData.data.map(item => (
                  <tr key={item.name} className="border-b border-slate-800">
                    <td className="py-2"><div className="flex items-center"><span className="w-4 h-4 rounded-full mr-2" style={{backgroundColor:item.color}}></span>{item.name}</div></td>
                    <td className="py-2">{formatCurrency(item.total)}</td>
                    <td className="py-2">{item.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Despesas do Período">
          {filteredExpenses.length ? <ExpenseTable expenses={filteredExpenses} categories={categories} openExpenseModal={openExpenseModal} /> :
            <div className="text-center text-slate-500 py-10"><p>Nenhuma despesa encontrada para o período selecionado.</p></div>}
        </Card>
      </div>
    );
  };

  const ExpensesPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filtered, setFiltered] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const perPage = 20;

    useEffect(() => {
      const lower = searchTerm.toLowerCase();
      setFiltered(expenses.filter(e => e.descricao.toLowerCase().includes(lower)));
      setPage(1);
    }, [expenses, searchTerm]);

    const totalPages = Math.ceil(filtered.length / perPage) || 1;
    const slice = filtered.slice((page - 1) * perPage, page * perPage);

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-800 shadow-md">
          <FilterIcon />
          <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar por descrição..." className="flex-1 p-2 bg-slate-700 text-white rounded-lg" />
        </div>

        {expenses.length ? (
          <>
            <ExpenseTable expenses={slice} categories={categories} openExpenseModal={openExpenseModal} />
            <div className="flex justify-between items-center mt-4">
              <button onClick={()=>setPage(p=>Math.max(p-1,1))} disabled={page===1} className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-50">Anterior</button>
              <span>Página {page} de {totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(p+1,totalPages))} disabled={page===totalPages} className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-50">Próxima</button>
            </div>
          </>
        ) : (
          <div className="text-center text-slate-500 py-20">
            <DollarSignIcon />
            <h2 className="text-2xl font-semibold mb-2">Sem gastos ainda?</h2>
            <p>Cadastre sua primeira despesa ou importe um arquivo CSV para começar.</p>
            {canEdit && <button onClick={() => openExpenseModal()} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700">Nova Despesa</button>}
          </div>
        )}
      </div>
    );
  };

  const CategoriesPage: React.FC = () => {
    const handleDeleteCategory = async (id: string) => {
      if (expenses.some(e => e.categoria_id === id)) return showToast('Não é possível apagar uma categoria com despesas vinculadas.', 'error');
      if (window.confirm('Tem certeza que deseja apagar esta categoria?')) {
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('Erro ao apagar categoria:', error);
          showToast('Erro ao apagar categoria.', 'error');
        } else {
          setCategories(prev => prev.filter(c => c.id !== id));
          showToast('Categoria apagada com sucesso!', 'success');
        }
      }
    };
    return (
      <div className="space-y-6">
        <Card title="Minhas Categorias">
          {categories.filter(c => c.empresa_id === companyId).length ? (
            <table className="w-full text-left table-auto">
              <thead><tr className="border-b border-slate-700"><th className="py-2 px-4">Nome</th><th className="py-2 px-4">Cor</th><th className="py-2 px-4">Status</th><th className="py-2 px-4">Ações</th></tr></thead>
              <tbody>
                {categories.filter(c => c.empresa_id === companyId).map(cat => (
                  <tr key={cat.id} className="border-b border-slate-800">
                    <td className="py-2 px-4">{cat.nome}</td>
                    <td className="py-2 px-4 flex items-center"><span className="w-6 h-6 rounded-full mr-2" style={{backgroundColor:cat.cor}}></span>{cat.cor}</td>
                    <td className="py-2 px-4">{cat.ativa ? 'Ativa' : 'Inativa'}</td>
                    <td className="py-2 px-4 space-x-2">
                      {canEdit && <button onClick={()=>openCategoryModal(cat)} className="text-blue-500 hover:text-blue-400"><PencilIcon /></button>}
                      {canEdit && <button onClick={()=>handleDeleteCategory(cat.id)} className="text-red-500 hover:text-red-400"><TrashIcon /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-slate-500 py-10">
              <p>Nenhuma categoria encontrada.</p>
              {canEdit && <button onClick={()=>openCategoryModal()} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700">Criar Categoria</button>}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const ExpenseTable: React.FC<{ expenses: any[]; categories: any[]; openExpenseModal: (e?: any)=>void }> =
  ({ expenses: expensesList, categories, openExpenseModal }) => {
    const handleDeleteExpense = async (id: string) => {
      if (window.confirm('Tem certeza que deseja apagar esta despesa?')) {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Erro ao apagar despesa:', error);
          showToast('Erro ao apagar despesa.', 'error');
        } else {
          setExpenses(prev => prev.filter(exp => exp.id !== id));
          showToast('Despesa apagada com sucesso!', 'success');
        }
      }
    };
    return (
      <table className="w-full text-left table-auto">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="py-2 px-4">Data</th>
            <th className="py-2 px-4">Descrição</th>
            <th className="py-2 px-4">Categoria</th>
            <th className="py-2 px-4">Valor</th>
            {companyId === 'consolidated' && <th className="py-2 px-4">Empresa</th>}
            <th className="py-2 px-4">Ações</th>
          </tr>
        </thead>
        <tbody>
          {expensesList
            .filter(exp => exp.empresa_id === companyId || companyId === 'consolidated')
            .map(exp => {
              const category = categories.find(c => c.id === exp.categoria_id);
              const companyName = companies.find(comp => comp.id === exp.empresa_id)?.name || 'N/A';
              return (
                <tr key={exp.id} className="border-b border-slate-800">
                  <td className="py-2 px-4">{formatDate(exp.data)}</td>
                  <td className="py-2 px-4">{exp.descricao}</td>
                  <td className="py-2 px-4"><div className="flex items-center"><span className="w-4 h-4 rounded-full mr-2" style={{backgroundColor:category?.cor || '#94a3b8'}}></span>{category?.nome || 'N/A'}</div></td>
                  <td className="py-2 px-4 font-semibold text-red-400">{formatCurrency(exp.valor)}</td>
                  {companyId === 'consolidated' && <td className="py-2 px-4">{companyName}</td>}
                  <td className="py-2 px-4 space-x-2">
                    {canEdit && <button onClick={()=>openExpenseModal(exp)} className="text-blue-500 hover:text-blue-400"><PencilIcon /></button>}
                    {canEdit && <button onClick={()=>handleDeleteExpense(exp.id)} className="text-red-500 hover:text-red-400"><TrashIcon /></button>}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    );
  };

  const CompanySelectPage: React.FC = () => {
    const userCompanies = companies.filter(c => c.id !== 'consolidated');
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
        <h1 className="text-4xl font-bold mb-8">Selecione uma Empresa</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userCompanies.map(company => (
            <div key={company.id} onClick={()=>setCompanyId(company.id)} className="flex flex-col items-center p-8 bg-slate-800 rounded-3xl shadow-xl cursor-pointer hover:bg-slate-700 w-64 h-48">
              <UserIcon className="w-16 h-16 mb-4" /><h2 className="text-xl font-semibold text-center">{company.name}</h2>
            </div>
          ))}
          <div key="consolidado" onClick={()=>setCompanyId('consolidated')} className="flex flex-col items-center p-8 bg-slate-800 rounded-3xl shadow-xl cursor-pointer hover:bg-slate-700 w-64 h-48">
            <BuildingIcon className="w-16 h-16 mb-4" /><h2 className="text-xl font-semibold text-center">Consolidado</h2>
          </div>
          <div className="flex flex-col items-center p-8 bg-slate-800 rounded-3xl shadow-xl cursor-pointer hover:bg-slate-700 w-64 h-48" onClick={()=>openCompanyModal()}>
            <PlusCircleIcon className="w-16 h-16 mb-4" /><h2 className="text-xl font-semibold text-center">Adicionar Empresa</h2>
          </div>
        </div>
      </div>
    );
  };

  const UsersPage: React.FC = () => {
    const handleDeleteUser = async (id: string) => {
      if (window.confirm('Tem certeza que deseja apagar este usuário?')) {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Erro ao apagar usuário:', error);
          showToast('Erro ao apagar usuário.', 'error');
        } else {
          setUsers(prev => prev.filter(u => u.id !== id));
          showToast('Usuário apagado com sucesso!', 'success');
        }
      }
    };
    return (
      <div className="space-y-6">
        <Card title="Usuários da Empresa">
          {users.filter(u => u.companyId === companyId).length ? (
            <table className="w-full text-left table-auto">
              <thead><tr className="border-b border-slate-700"><th className="py-2 px-4">Nome</th><th className="py-2 px-4">Email</th><th className="py-2 px-4">Função</th><th className="py-2 px-4">Ações</th></tr></thead>
              <tbody>
                {users.filter(u => u.companyId === companyId).map(user => (
                  <tr key={user.id} className="border-b border-slate-800">
                    <td className="py-2 px-4">{user.name}</td>
                    <td className="py-2 px-4">{user.email}</td>
                    <td className="py-2 px-4">{user.role === 'admin' ? 'Administrador' : 'Visualizador'}</td>
                    <td className="py-2 px-4 space-x-2">
                      {canEdit && <button onClick={()=>openUserModal(user)} className="text-blue-500 hover:text-blue-400"><PencilIcon /></button>}
                      {canEdit && <button onClick={()=>handleDeleteUser(user.id)} className="text-red-500 hover:text-red-400"><TrashIcon /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-slate-500 py-10">
              <p>Nenhum usuário encontrado.</p>
              {canEdit && <button onClick={()=>openUserModal()} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700">Criar Usuário</button>}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const CompaniesPage: React.FC = () => {
    const handleDeleteCompany = async (id: string) => {
      if (expenses.some(e => e.empresa_id === id) || users.some(u => u.companyId === id) || categories.some(c => c.empresa_id === id)) {
        return showToast('Não é possível apagar uma empresa com despesas, usuários ou categorias vinculadas.', 'error');
      }
      if (window.confirm('Tem certeza que deseja apagar esta empresa?')) {
        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Erro ao apagar empresa:', error);
          showToast('Erro ao apagar empresa.', 'error');
        } else {
          setCompanies(prev => prev.filter(c => c.id !== id));
          showToast('Empresa apagada com sucesso!', 'success');
          if (companyId === id) setCompanyId(null);
        }
      }
    };
    return (
      <div className="space-y-6">
        <Card title="Minhas Empresas">
          {companies.filter(c => c.id !== 'consolidated').length ? (
            <table className="w-full text-left table-auto">
              <thead><tr className="border-b border-slate-700"><th className="py-2 px-4">Nome</th><th className="py-2 px-4">Ações</th></tr></thead>
              <tbody>
                {companies.filter(c => c.id !== 'consolidated').map(comp => (
                  <tr key={comp.id} className="border-b border-slate-800">
                    <td className="py-2 px-4">{comp.name}</td>
                    <td className="py-2 px-4 space-x-2">
                      {canEdit && <button onClick={()=>openCompanyModal(comp)} className="text-blue-500 hover:text-blue-400"><PencilIcon /></button>}
                      {canEdit && <button onClick={()=>handleDeleteCompany(comp.id)} className="text-red-500 hover:text-red-400"><TrashIcon /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-slate-500 py-10">
              <p>Nenhuma empresa encontrada.</p>
              {canEdit && <button onClick={()=>openCompanyModal()} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700">Criar Empresa</button>}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderPage = () => {
    if (!companyId) return <CompanySelectPage />;
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'expenses': return <ExpensesPage />;
      case 'categories': return <CategoriesPage />;
      case 'users': return <UsersPage />;
      case 'companies': return <CompaniesPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-white p-4">
      <Sidebar />
      <main className="flex-1 bg-slate-800 p-8 rounded-2xl shadow-xl flex flex-col">
        <Header title={currentPage.charAt(0).toUpperCase() + currentPage.slice(1)} />
        <div className="flex-1 overflow-y-auto pr-4">
          {renderPage()}
        </div>
      </main>

      {showModal && (
        <Modal title={modalType === 'expense' ? (editingExpense ? 'Editar Despesa' : 'Nova Despesa') :
                        modalType === 'category' ? (editingCategory ? 'Editar Categoria' : 'Nova Categoria') :
                        modalType === 'user' ? (editingUser ? 'Editar Usuário' : 'Novo Usuário') :
                        modalType === 'company' ? (editingCompany ? 'Editar Empresa' : 'Nova Empresa') : ''}
               onClose={closeModals}>
          {modalType === 'expense' && <ExpenseForm />}
          {modalType === 'category' && <CategoryForm />}
          {modalType === 'user' && <UserForm />}
          {modalType === 'company' && <CompanyForm />}
        </Modal>
      )}

      {/* O componente ImportModal agora está no seu próprio arquivo e aceita 'supabase' */}
      <ImportModal
        visible={showImportModal}
        categories={categories}
        setCategories={setCategories}
        categoryMappings={categoryMappings}
        setCategoryMappings={setCategoryMappings}
        setExpenses={setExpenses}
        companyId={companyId}
        showToast={showToast}
        setShowImportModal={setShowImportModal}
        supabase={supabase}
      />

      {toastMessage && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white ${toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toastMessage.message}
        </div>
      )}
    </div>
  );
};

export default App;
