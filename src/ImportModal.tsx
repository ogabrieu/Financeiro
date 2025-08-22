import React, { useState, useMemo, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

// Importe as funções e ícones exportados de App.tsx
import { 
  formatCurrency, formatDate 
} from './App'; 
import { FileUpIcon, FileDownIcon, PlusCircleIcon } from './Icons'; 

// PapaParse via <script> no index.html
declare var Papa: any;

interface ImportModalProps {
  visible: boolean;
  categories: any[];
  setCategories: React.Dispatch<React.SetStateAction<any[]>>;
  categoryMappings: Record<string, string>;
  setCategoryMappings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setExpenses: React.Dispatch<React.SetStateAction<any[]>>;
  companyId: string | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setShowImportModal: (visible: boolean) => void;
  supabase: SupabaseClient; // A tipagem correta para o cliente Supabase
}

const ImportModal: React.FC<ImportModalProps> = ({ 
  visible,
  categories,
  setCategories,
  categoryMappings,
  setCategoryMappings,
  setExpenses,
  companyId,
  showToast,
  setShowImportModal,
  supabase 
}) => {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#64748b');

  const localCategories = useMemo(
    () => categories.filter(c => c.empresa_id === companyId),
    [categories, companyId]
  );
  
  // Sincroniza as categorias locais com as globais
  useEffect(() => {
    setCategories(localCategories);
  }, [localCategories, setCategories]);

  const normalizeHeaders = (fields: string[]) =>
    fields.map((f) => (f || '').toString().trim().toLowerCase());

  const findHeaderIndex = (headers: string[], candidates: string[]) => {
    for (const c of candidates) {
      const i = headers.indexOf(c);
      if (i !== -1) return i;
    }
    return -1;
  };
  
  const generateId = () => `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setLoading(true);
    setShowMapping(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target?.result || '');
        const delimiter = text.split('\n')[0]?.includes(';') ? ';' : ',';

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          delimiter,
          complete: (results: any) => {
            const headers = normalizeHeaders(results.meta.fields || []);
            if (!headers.length) {
              showToast('CSV vazio ou inválido.', 'error');
              setLoading(false);
              return;
            }

            const dateIdx = findHeaderIndex(headers, ['data']);
            const descIdx = findHeaderIndex(headers, ['descricao', 'descrica']);
            const valueIdx = findHeaderIndex(headers, ['valor']);
            const catIdx = findHeaderIndex(headers, ['categoria']);

            if (dateIdx === -1 || descIdx === -1 || valueIdx === -1) {
              const miss = [
                dateIdx === -1 && 'data',
                descIdx === -1 && 'descricao',
                valueIdx === -1 && 'valor',
              ].filter(Boolean).join(', ');
              showToast(`Faltam colunas: ${miss}`, 'error');
              setLoading(false);
              return;
            }

            const parsed = (results.data as any[]).map((row: any, i: number) => {
              const valRaw = row[headers[valueIdx]];
              const val = parseFloat(String(valRaw).replace(',', '.'));
              return {
                id: `tmp-${i}-${Math.random().toString(16).slice(2)}`,
                data: row[headers[dateIdx]] || new Date().toISOString().slice(0, 10),
                descricao: row[headers[descIdx]],
                valor: isNaN(val) ? 0 : Math.abs(val),
                categoriaLabel: catIdx !== -1 ? row[headers[catIdx]] : '',
                empresa_id: companyId,
              };
            });

            const autoMapped: any[] = [];
            const needMap: any[] = [];
            parsed.forEach((t) => {
              const mappedCatId = categoryMappings[t.descricao];
              if (mappedCatId) autoMapped.push({ ...t, categoria_id: mappedCatId });
              else needMap.push(t);
            });

            setTransactions(parsed);
            setLoading(false);
            setShowMapping(true);
          },
          error: (err: any) => {
            showToast(`Erro ao processar CSV: ${err.message}`, 'error');
            setLoading(false);
          }
        });
      } catch (e) {
        console.error(e);
        showToast('Erro ao ler arquivo.', 'error');
        setLoading(false);
      }
    };
    reader.readAsText(selected);
  };

  const handleCategoryChange = (originalCategoryName: string, categoryId: string) => {
    setCategoryMappings(prev => ({ ...prev, [originalCategoryName]: categoryId }));
  };

  const handleSaveCategory = async () => {
    if (!categoryName) return showToast('Nome da categoria é obrigatório.', 'error');
    if (!companyId) return showToast('Selecione uma empresa antes de criar uma categoria.', 'error');

    const newCategory = {
      id: generateId(),
      nome: categoryName,
      cor: categoryColor,
      ativa: true,
      empresa_id: companyId,
    };
    
    const { data, error } = await supabase
      .from('categories')
      .insert(newCategory)
      .select();

    if (error) {
      console.error('Erro ao criar categoria:', error);
      showToast('Erro ao criar categoria.', 'error');
    } else {
      setCategories(prev => [...prev, data[0]]);
      showToast('Categoria criada com sucesso!', 'success');
      setCategoryName('');
      setCategoryColor('#64748b');
    }
  };

  const handleImport = async () => {
    const expensesToInsert = transactions.map(t => ({
      id: generateId(),
      data: t.data,
      descricao: t.descricao,
      valor: t.valor,
      categoria_id: categoryMappings[t.descricao] || 'uncategorized',
      empresa_id: companyId,
    }));
    
    const { data, error } = await supabase
      .from('expenses')
      .insert(expensesToInsert)
      .select();

    if (error) {
      console.error('Erro ao importar despesas:', error);
      showToast('Erro ao importar despesas.', 'error');
    } else {
      setExpenses(prev => [...prev, ...data]);
      showToast('Despesas importadas com sucesso!', 'success');
      setShowImportModal(false);
    }
  };

  const unmappedTransactions = useMemo(() => {
    const unmapped = transactions.filter(t => !categoryMappings[t.descricao]);
    return [...new Map(unmapped.map(item => [item.descricao, item])).values()];
  }, [transactions, categoryMappings]);

  return (
    <div className={`fixed inset-0 z-50 ${visible ? 'flex' : 'hidden'} justify-center items-center bg-black bg-opacity-70`}>
      <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Importar Despesas (CSV)</h2>
          <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">&times;</button>
        </div>

        {!showMapping ? (
          <>
            <a href="data:text/csv;charset=utf-8,data%2Cdescricao%2Cvalor%0A2025-01-15%2CExemplo%20de%20despesa%2C-150%2C00" download="modelo-despesas.csv" className="w-full px-6 py-3 text-center bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center mb-4">
              <FileDownIcon className="ml-2" /><span className="ml-2">Baixar Modelo CSV</span>
            </a>
            <div className="flex items-center justify-center p-6 bg-slate-800 rounded-lg border-2 border-dashed border-slate-600">
              <label htmlFor="csv-file" className="cursor-pointer text-center">
                <FileUpIcon className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                <p className="text-slate-400">Arraste o CSV aqui ou clique para selecionar.</p>
                <input type="file" id="csv-file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            {loading && <p className="text-center mt-4">Processando...</p>}
          </>
        ) : (
          <div className="space-y-4">
            {unmappedTransactions.length > 0 && (
              <div className="bg-yellow-900 p-4 rounded-lg">
                <h3 className="font-bold text-yellow-300">⚠️ {unmappedTransactions.length} linhas precisam de categoria</h3>
                <p className="text-sm text-yellow-400">Selecione uma categoria para cada item.</p>
              </div>
            )}
            
            <div className="max-h-80 overflow-y-auto pr-2">
              {unmappedTransactions.map((t, i) => (
                <div key={i} className="bg-slate-800 p-4 rounded-lg flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4 mb-2">
                  <div className="flex-1">
                    <p className="font-semibold">{t.descricao}</p>
                    <p className="text-sm text-slate-400">{formatCurrency(t.valor)} em {formatDate(t.data)}</p>
                  </div>
                  <div className="flex space-x-2 w-full md:w-auto">
                    <select
                      value={categoryMappings[t.descricao] || ''}
                      onChange={(e) => handleCategoryChange(t.descricao, e.target.value)}
                      className="w-full p-2 bg-slate-700 rounded-lg"
                    >
                      <option value="">Selecione a categoria...</option>
                      {localCategories.map(cat => (<option key={cat.id} value={cat.id}>{cat.nome}</option>))}
                    </select>
                    <button onClick={() => handleSaveCategory()} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <PlusCircleIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-700 pt-4">
              <h4 className="text-lg font-semibold mb-2">Criar Nova Categoria</h4>
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <label className="block text-sm mb-1">Nome da Categoria</label>
                  <input type="text" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="w-full p-2 bg-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Cor</label>
                  <input type="color" value={categoryColor} onChange={(e) => setCategoryColor(e.target.value)} className="w-10 h-10 p-1 bg-slate-700 rounded-lg" />
                </div>
                <button onClick={handleSaveCategory} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex-shrink-0">Criar</button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleImport}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={unmappedTransactions.length > 0}
              >
                Confirmar Importação
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportModal;
