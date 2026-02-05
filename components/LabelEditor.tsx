
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../services/store';
import { LabelElement, LabelFieldType, LabelLayout } from '../types';
import { 
    Layout, Type, Move, AlignLeft, AlignCenter, AlignRight, 
    Bold, Grid, BoxSelect, Trash2, Printer, Save, Maximize, X,
    AlignStartVertical, AlignEndVertical, AlignCenterVertical,
    Undo, Redo, Settings, FileText, Check
} from 'lucide-react';

const FIELD_TYPES: { type: LabelFieldType; label: string }[] = [
    { type: 'companyInfo', label: 'Nome Azienda' },
    { type: 'productType', label: 'Prodotto (Lavorato)' },
    { type: 'rawMaterial', label: 'Materia Prima (Grezzo)' },
    { type: 'variety', label: 'Varietà' },
    { type: 'quality', label: 'Categoria' },
    { type: 'lotCode', label: 'Codice Lotto' },
    { type: 'producer', label: 'Produttore' },
    { type: 'packaging', label: 'Imballaggio' },
    { type: 'weight', label: 'Peso Netto' },
    { type: 'caseCount', label: 'N. Colli' },
    { type: 'date', label: 'Data/Ora' },
    { type: 'palletId', label: 'ID Pedana (Barcode)' },
    { type: 'staticText', label: 'Testo Libero' },
];

interface Props {
    layoutId?: string; // If provided, we are editing this layout
    readOnly?: boolean;
    mockData?: any;
    onClose?: () => void;
}

export const LabelEditor: React.FC<Props> = ({ layoutId, readOnly = false, mockData, onClose }) => {
    const { labelLayouts, updateLabelLayout } = useData();
    
    // Find the layout to edit
    const currentLayout = labelLayouts.find(l => l.id === layoutId) || labelLayouts.find(l => l.isDefault) || labelLayouts[0];

    // -- STATE --
    const [canvasSize] = useState({ width: 400, height: 600 });
    const [elements, setElements] = useState<LabelElement[]>(currentLayout.elements);
    const [layoutName, setLayoutName] = useState(currentLayout.name);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showGrid, setShowGrid] = useState(true);
    
    // -- HISTORY --
    const [history, setHistory] = useState<LabelElement[][]>([currentLayout.elements]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const canvasRef = useRef<HTMLDivElement>(null);

    // -- INTERACTION STATE --
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    
    useEffect(() => {
        if (!readOnly && currentLayout) {
            setElements(currentLayout.elements);
            setLayoutName(currentLayout.name);
            setHistory([currentLayout.elements]);
            setHistoryIndex(0);
        }
    }, [currentLayout?.id, readOnly]);

    const addToHistory = (newElements: LabelElement[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newElements);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setElements(newElements);
    };

    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setElements(history[newIndex]);
            setSelectedIds([]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setElements(history[newIndex]);
            setSelectedIds([]);
        }
    };

    const handleSave = () => {
        if (layoutId) {
            updateLabelLayout(layoutId, { elements, name: layoutName });
        }
    };

    const addElement = (type: LabelFieldType) => {
        if (readOnly) return;
        const newEl: LabelElement = {
            id: `el-${Date.now()}`,
            type,
            label: FIELD_TYPES.find(f => f.type === type)?.label || 'Campo',
            customText: type === 'staticText' ? 'TESTO FISSO' : undefined,
            x: 20,
            y: 20,
            width: 200,
            height: 30,
            fontSize: 14,
            isBold: false,
            textAlign: 'left'
        };
        addToHistory([...elements, newEl]);
        setSelectedIds([newEl.id]);
    };

    const updateElement = (id: string, updates: Partial<LabelElement>, commit = true) => {
        if (readOnly) return;
        const newElements = elements.map(el => el.id === id ? { ...el, ...updates } : el);
        if (commit) addToHistory(newElements);
        else setElements(newElements);
    };

    const updateSelectedElements = (updates: Partial<LabelElement>) => {
        if (readOnly) return;
        const newElements = elements.map(el => selectedIds.includes(el.id) ? { ...el, ...updates } : el);
        addToHistory(newElements);
    };

    const deleteSelectedElements = () => {
        if (readOnly) return;
        addToHistory(elements.filter(el => !selectedIds.includes(el.id)));
        setSelectedIds([]);
    };

    // --- INTERACTION LOGIC (Simplified for brevity as core logic exists) ---
    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        if (readOnly) return;
        e.stopPropagation();
        let newSelection = [...selectedIds];
        if (e.ctrlKey || e.shiftKey) {
            newSelection = newSelection.includes(id) ? newSelection.filter(sid => sid !== id) : [...newSelection, id];
        } else {
            if (!newSelection.includes(id)) newSelection = [id];
        }
        setSelectedIds(newSelection);
        setIsDragging(true);

        const currentElementsMap = new Map<string, LabelElement>(elements.map(el => [el.id, el]));
        const startPositions = newSelection.map(sid => {
            const el = currentElementsMap.get(sid);
            return el ? { id: sid, x: el.x, y: el.y } : null;
        }).filter((p): p is {id: string, x: number, y: number} => p !== null);

        const startMouseX = e.clientX;
        const startMouseY = e.clientY;

        const move = (mE: MouseEvent) => {
            const dx = mE.clientX - startMouseX;
            const dy = mE.clientY - startMouseY;
            setElements(prev => prev.map(el => {
                const startPos = startPositions.find(p => p.id === el.id);
                if (startPos) {
                    let nx = startPos.x + dx; let ny = startPos.y + dy;
                    if (showGrid) { nx = Math.round(nx / 10) * 10; ny = Math.round(ny / 10) * 10; }
                    return { ...el, x: Math.max(0, nx), y: Math.max(0, ny) };
                }
                return el;
            }));
        };
        const up = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    const handleResizeStart = (e: React.MouseEvent, id: string, handle: string) => {
        if (readOnly) return;
        e.stopPropagation();
        setIsResizing(true);
        const el = elements.find(e => e.id === id);
        if (!el) return;
        const startX = e.clientX; const startY = e.clientY;
        const startEl = { ...el };

        const move = (mE: MouseEvent) => {
            const dx = mE.clientX - startX; const dy = mE.clientY - startY;
            let nw = startEl.width; let nh = startEl.height; let nx = startEl.x; let ny = startEl.y;
            if (handle.includes('e')) nw += dx; if (handle.includes('w')) { nx += dx; nw -= dx; }
            if (handle.includes('s')) nh += dy; if (handle.includes('n')) { ny += dy; nh -= dy; }
            if (showGrid) { nw = Math.round(nw/10)*10; nh = Math.round(nh/10)*10; nx = Math.round(nx/10)*10; ny = Math.round(ny/10)*10; }
            setElements(prev => prev.map(item => item.id === id ? { ...item, x: nx, y: ny, width: Math.max(10, nw), height: Math.max(10, nh) } : item));
        };
        const up = () => { setIsResizing(false); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    // Commit history on action end
    const lastElements = useRef(elements);
    useEffect(() => { lastElements.current = elements; }, [elements]);
    useEffect(() => { if (!isDragging && !isResizing && lastElements.current !== history[historyIndex]) addToHistory(lastElements.current); }, [isDragging, isResizing]);

    const align = (dir: string) => {
        if (selectedIds.length === 0) return;
        const anchor = elements.find(e => e.id === selectedIds[selectedIds.length - 1]);
        if (!anchor) return;
        const newEls = elements.map(el => {
            if (!selectedIds.includes(el.id) || el.id === anchor.id) return el;
            const up = { ...el };
            if (dir === 'left') up.x = anchor.x;
            if (dir === 'center-x') up.x = anchor.x + anchor.width/2 - el.width/2;
            if (dir === 'right') up.x = anchor.x + anchor.width - el.width;
            if (dir === 'top') up.y = anchor.y;
            if (dir === 'center-y') up.y = anchor.y + anchor.height/2 - el.height/2;
            if (dir === 'bottom') up.y = anchor.y + anchor.height - el.height;
            return up;
        });
        addToHistory(newEls);
    };

    const renderContent = (el: LabelElement) => {
        let text = el.customText || el.label;
        if (readOnly && mockData) {
            text = mockData[el.type] || text;
        }
        return <div className="w-full h-full overflow-hidden whitespace-nowrap text-ellipsis pointer-events-none" style={{ fontSize: `${el.fontSize}px`, fontWeight: el.isBold ? 'bold' : 'normal', textAlign: el.textAlign, lineHeight: `${el.height}px` }}>{el.prefix || ''}{text}{el.suffix || ''}</div>;
    };

    return (
        <div className="flex h-full bg-slate-100 overflow-hidden relative w-full">
            {!readOnly && (
                <div className="w-64 bg-white border-r flex flex-col z-10 shadow-lg shrink-0">
                    <div className="p-4 border-b bg-slate-50">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome Template</label>
                        <input value={layoutName} onChange={e => setLayoutName(e.target.value)} className="w-full border rounded px-2 py-1 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="p-4 border-b bg-slate-50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Layout className="w-5 h-5"/> Campi</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {FIELD_TYPES.map(f => (
                            <div key={f.type} onClick={() => addElement(f.type)} className="p-2.5 bg-white border rounded cursor-pointer hover:bg-blue-50 transition-all flex items-center gap-3 group text-sm font-medium text-slate-700">
                                <Type className="w-4 h-4 text-slate-400 group-hover:text-blue-600" /> {f.label}
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t bg-slate-50 space-y-2">
                        <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded font-bold shadow-md hover:bg-blue-700 flex items-center justify-center gap-2"><Save className="w-4 h-4"/> Salva Layout</button>
                        {onClose && <button onClick={onClose} className="w-full bg-slate-200 text-slate-700 py-2 rounded font-bold hover:bg-slate-300">Torna alla Lista</button>}
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center bg-slate-200/50 relative overflow-hidden" onClick={() => setSelectedIds([])}>
                {!readOnly && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-sm border p-1 flex gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={undo} disabled={historyIndex <= 0} className="p-2 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30"><Undo className="w-4 h-4"/></button>
                        <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30"><Redo className="w-4 h-4"/></button>
                        <div className="w-px bg-slate-200 mx-1"></div>
                        <button onClick={() => align('left')} className="p-2 text-slate-500 hover:bg-slate-100 rounded"><AlignLeft className="w-4 h-4"/></button>
                        <button onClick={() => align('center-x')} className="p-2 text-slate-500 hover:bg-slate-100 rounded"><AlignCenter className="w-4 h-4"/></button>
                        <button onClick={() => align('top')} className="p-2 text-slate-500 hover:bg-slate-100 rounded"><AlignStartVertical className="w-4 h-4"/></button>
                        <button onClick={() => align('center-y')} className="p-2 text-slate-500 hover:bg-slate-100 rounded"><AlignCenterVertical className="w-4 h-4"/></button>
                        <div className="w-px bg-slate-200 mx-1"></div>
                        <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded ${showGrid ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}><Grid className="w-4 h-4"/></button>
                    </div>
                )}
                
                <div className="relative shadow-2xl bg-white" style={{ width: canvasSize.width, height: canvasSize.height, backgroundImage: showGrid && !readOnly ? 'radial-gradient(#cbd5e1 1px, transparent 1px)' : 'none', backgroundSize: '10px 10px' }}>
                    {elements.map(el => (
                        <div key={el.id} onMouseDown={(e) => handleMouseDown(e, el.id)} className={`absolute border select-none ${selectedIds.includes(el.id) ? 'border-blue-600 z-20 bg-blue-50/10' : 'border-transparent hover:border-slate-300'}`} style={{ left: el.x, top: el.y, width: el.width, height: el.height }}>
                            {renderContent(el)}
                            {selectedIds.includes(el.id) && !readOnly && (
                                <>
                                    <div onMouseDown={(e) => handleResizeStart(e, el.id, 'nw')} className="absolute w-2.5 h-2.5 bg-white border border-blue-600 rounded-full -top-1.5 -left-1.5 cursor-nw-resize" />
                                    <div onMouseDown={(e) => handleResizeStart(e, el.id, 'ne')} className="absolute w-2.5 h-2.5 bg-white border border-blue-600 rounded-full -top-1.5 -right-1.5 cursor-ne-resize" />
                                    <div onMouseDown={(e) => handleResizeStart(e, el.id, 'sw')} className="absolute w-2.5 h-2.5 bg-white border border-blue-600 rounded-full -bottom-1.5 -left-1.5 cursor-sw-resize" />
                                    <div onMouseDown={(e) => handleResizeStart(e, el.id, 'se')} className="absolute w-2.5 h-2.5 bg-white border border-blue-600 rounded-full -bottom-1.5 -right-1.5 cursor-se-resize" />
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {!readOnly && (
                <div className="w-72 bg-white border-l flex flex-col z-10 shadow-lg shrink-0">
                    <div className="p-4 border-b bg-slate-50">
                        <h3 className="font-bold text-slate-700">Proprietà</h3>
                    </div>
                    {selectedIds.length > 0 ? (
                        <div className="p-4 space-y-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-slate-400 uppercase">W (px)</label><input type="number" value={elements.find(e => e.id === selectedIds[0])?.width} onChange={e => updateSelectedElements({ width: parseInt(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                                <div><label className="block text-xs font-bold text-slate-400 uppercase">H (px)</label><input type="number" value={elements.find(e => e.id === selectedIds[0])?.height} onChange={e => updateSelectedElements({ height: parseInt(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Stile</label>
                                <div className="flex gap-2">
                                    <button onClick={() => updateSelectedElements({ isBold: !elements.find(e => e.id === selectedIds[0])?.isBold })} className={`flex-1 py-1.5 border rounded ${elements.find(e => e.id === selectedIds[0])?.isBold ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white'}`}><Bold className="w-4 h-4 mx-auto"/></button>
                                    <button onClick={() => updateSelectedElements({ textAlign: 'left' })} className="flex-1 py-1.5 border rounded"><AlignLeft className="w-4 h-4 mx-auto"/></button>
                                    <button onClick={() => updateSelectedElements({ textAlign: 'center' })} className="flex-1 py-1.5 border rounded"><AlignCenter className="w-4 h-4 mx-auto"/></button>
                                </div>
                            </div>
                            <div className="pt-6 border-t mt-auto">
                                <button onClick={deleteSelectedElements} className="w-full border border-red-200 text-red-600 bg-red-50 py-2 rounded text-sm font-bold flex items-center justify-center gap-2"><Trash2 className="w-4 h-4"/> Rimuovi</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 p-8 text-center text-sm">Seleziona un elemento.</div>
                    )}
                </div>
            )}
            {readOnly && onClose && <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-slate-800 text-white p-2 rounded-full shadow-lg"><X className="w-6 h-6"/></button>}
        </div>
    );
};
