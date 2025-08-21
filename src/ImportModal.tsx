import React, { useState, useMemo } from 'react';
import { format, parse, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// PapaParse will be available globally via script tag (as no import)
declare var Papa: any;

// ---------- ÍCONES UTILIZADOS ----------
const FileDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="M12 18v-6"/>
    <path d="m15 15-3 3-3-3"/>
  </svg>
);

const FileUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L15 2z"/>
    <path d="M14 2v6h6"/>
    <path d="M4 16v-2.4a2 2 0 0 1 1.6-1.92l5.7-.93c.95-.15 1.7-.85 2.1-1.74a4.12 4.12 0 0 1 2.3-2.5 2.1 2.1 0 0 1 2.7-.2v.22c.1.1.2.2.3.4s.2.3.2.5v.5c0 .2 0 .4-.2.6s-.2.3-.4.4-.3.2-.5.2-.5.1-.7.1a2 2 0 0 1-.7-.1c-1.2-.4-2.2-1.3-2.8-2.4l-5-5-5 5z"/>
  </svg>
);

const PlusCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 8v8"/>
    <path d="M8 12h8"/>
  </svg>
);

// ---------- HELPERS ----------
const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
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

// ---------- PROPS INTERFACE ----------
interface ImportModalProps {
  visible: boolean;
  categories: any[];
  setCategories: React.Dispatch<React.SetStateAction<any[]>>;
  categoryMappings: Record<string, string>;
  setCategoryMappings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setExpenses: React.Dispatch<React.SetStateAction<any[]>>;
  companyId: string | null;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  setShowImportModal: (val: boolean) => void;
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
  setShowImportModal
}) => {
  // estado local
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [unmappedTransactions, setUnmappedTransactions] = useState<any[]>([]);
  const [mappedTransactions, setMappedTransactions] = useState<any[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);

  const localCategories = useMemo(
    () => categories.filter(c => c.empresa_id === companyId && c.ativa),
    [categories, companyId]
  );

  // normalização de cabeçalhos
  const normalizeHeaders = (fields: string[]) =>
    fields.map(f => (f || '').toString().trim().toLowerCase());
  const findHeaderIndex = (headers: string[], candidates: string[]) => {
    for (const c of candidates) {
      const idx = headers.indexOf(c);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // parse de números considerando formato pt-BR ou en-US
  const parseLocaleNumber = (val: any): number => {
    let str = String(val || '').trim();
    if (!str) return NaN;
    // remove caracteres não numéricos exceto vírgula, ponto e hífen
    str = str.replace(/[^0-9,\.\-]/g, '');
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    let decimalSep: string | null = null;
    if (lastComma > lastDot) decimalSep = ',';
    else if (lastDot > lastComma) decimalSep = '.';
    if (decimalSep) {
      const thousandSep = decimalSep === ',' ? '.' : ',';
      const regex = new RegExp('\\' + thousandSep, 'g');
      str = str.replace(regex, '');
      if (decimalSep === ',') {
        str = str.replace(',', '.');
      }
    }
    return parseFloat(str);
  };

  // leitura e processamento do CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
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
            const parsedRows = results.data as any[];
            let skipped = 0;
            const parsed: any[] = [];
            parsedRows.forEach((row: any, i: number) => {
              const valRaw = row[headers[valueIdx]];
              const valParsed = parseLocaleNumber(valRaw);
              if (isNaN(valParsed)) return;
              if (valParsed >= 0) {
                skipped++;
                return;
              }
              const absVal = Math.abs(valParsed);
              parsed.push({
                id: `tmp-${i}-${Math.random().toString(16).slice(2)}`,
                data: row[headers[dateIdx]] || new Date().toISOString().slice(0, 10),
                descricao: row[headers[descIdx]],
                valor: absVal,
                categoriaLabel: catIdx !== -1 ? row[headers[catIdx]] : '',
                empresa_id: companyId,
              });
            });
            const autoMapped: any[] = [];
            const needMap: any[] = [];
            parsed.forEach((t) => {
              const mappedCatId = categoryMappings[t.descricao];
              if (mappedCatId) autoMapped.push({ ...t, categoria_id: mappedCatId });
              else needMap.push(t);
            });
            setMappedTransactions(autoMapped);
            setUnmappedTransactions(needMap);
            setSkippedCount(skipped);
            setLoading(false);
            setShowMapping(true);
            if (skipped > 0) {
              showToast(`${skipped} linha(s) com valor positivo foram ignoradas.`, 'success');
            }
          },
          error: (err: any) => {
            showToast(`Erro ao processar CSV: ${err.message}`, 'error');
            setLoading(false);
          }
        });
      } catch (err) {
        console.error(err);
        showToast('Erro ao ler arquivo.', 'error');
        setLoading(false);
      }
    };
    reader.readAsText(selected);
  };

  // alteração de categoria para transação
  const handleCategoryChange = (idx: number, categoryId: string) => {
    setUnmappedTransactions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], categoria_id: categoryId };
      return copy;
    });
  };

  // criar nova categoria vinculada a uma transação
  const handleNewCategoryFor = (idx: number) => {
    const name = prompt('Digite o nome da nova categoria:');
    if (!name) return;
    const color = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
    const newCat = {
      id: `cat-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      nome: name,
      cor: color,
      ativa: true,
      empresa_id: companyId
    };
    setCategories((prev) => [...prev, newCat]);
    const desc = unmappedTransactions[idx]?.descricao;
    if (desc) setCategoryMappings((prev) => ({ ...prev, [desc]: newCat.id }));
    setUnmappedTransactions((prev) => {
      const copy = [...prev];
      if (copy[idx]) copy[idx] = { ...copy[idx], categoria_id: newCat.id };
      return copy;
    });
    showToast(`Categoria '${name}' criada e aplicada.`, 'success');
  };

  // confirmar importação
  const confirmImport = () => {
    const all = [...mappedTransactions, ...unmappedTransactions];
    const missing = all.filter(t => !t.categoria_id).length;
    if (missing) {
      showToast('Categorize todas as linhas antes de importar.', 'error');
      return;
    }
    const newMaps: Record<string, string> = {};
    unmappedTransactions.forEach((t) => {
      if (t.descricao && t.categoria_id) newMaps[t.descricao] = t.categoria_id;
    });
    setCategoryMappings((prev) => ({ ...prev, ...newMaps }));
    setExpenses((prev) => [
      ...prev,
      ...all.map((t) => ({
        id: `id-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        data: t.data,
        descricao: t.descricao,
        valor: t.valor,
        categoria_id: t.categoria_id,
        empresa_id: t.empresa_id,
      }))
    ]);
    showToast('Importação concluída!', 'success');
    setShowImportModal(false);
  };

  const csvTemplate = "data;descricao;valor\n2025-01-15;Exemplo de despesa;-150,00";
  const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvTemplate}`);

  return (
    <div className={`fixed inset-0 z-50 ${visible ? 'flex' : 'hidden'} justify-center items-center bg-black bg-opacity-70`}>
      <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Importar Despesas (CSV)</h2>
          <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">&times;</button>
        </div>
        {!showMapping ? (
          <>
            <a href={encodedUri} download="modelo-despesas.csv" className="w-full px-6 py-3 text-center bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center mb-4">
              <FileDownIcon /><span className="ml-2">Baixar Modelo CSV</span>
            </a>
            <div className="flex items-center justify-center p-6 bg-slate-800 rounded-lg border-2 border-dashed border-slate-600">
              <label htmlFor="csv-file-new" className="cursor-pointer text-center">
                <FileUpIcon />
                <p className="text-slate-400">Arraste o CSV aqui ou clique para selecionar.</p>
                <input type="file" id="csv-file-new" accept=".csv" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            {loading && <p className="text-center mt-4">Processando...</p>}
          </>
        ) : (
          <div className="space-y-4">
            {mappedTransactions.length > 0 && (
              <div className="bg-green-900 p-4 rounded-lg">
                <h3 className="font-bold text-green-300">🎉 {mappedTransactions.length} linha(s) mapeada(s) automaticamente</h3>
                <p className="text-sm text-green-400">Regras por descrição foram aplicadas.</p>
              </div>
            )}
            {unmappedTransactions.length > 0 && (
              <div className="bg-yellow-900 p-4 rounded-lg">
                <h3 className="font-bold text-yellow-300">⚠️ {unmappedTransactions.filter(t=>!t.categoria_id).length} linha(s) precisam de categoria</h3>
                <p className="text-sm text-yellow-400">Selecione uma categoria para cada item.</p>
              </div>
            )}
            <div className="max-h-80 overflow-y-auto pr-2">
              {unmappedTransactions.map((t, i) => (
                <div key={t.id} className="bg-slate-800 p-4 rounded-lg flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4 mb-2">
                  <div className="flex-1">
                    <p className="font-semibold">{t.descricao}</p>
                    <p className="text-sm text-slate-400">{formatCurrency(t.valor)} em {formatDate(t.data)}</p>
                  </div>
                  <div className="flex space-x-2 w-full md:w-auto">
                    <select
                      value={t.categoria_id || ''}
                      onChange={(e) => handleCategoryChange(i, e.target.value)}
                      className="w-full p-2 bg-slate-700 rounded-lg"
                    >
                      <option value="">Selecione a categoria...</option>
                      {localCategories.map(cat => (<option key={cat.id} value={cat.id}>{cat.nome}</option>))}
                    </select>
                    <button onClick={() => handleNewCategoryFor(i)} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <PlusCircleIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={confirmImport}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={[...mappedTransactions, ...unmappedTransactions].some(t => !t.categoria_id)}
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