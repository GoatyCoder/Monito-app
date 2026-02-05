
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useData } from '../services/store';
import { LabelElement, LabelFieldType } from '../types';
import { 
    Layout, Type, Move, AlignLeft, AlignCenter, AlignRight, 
    Bold, Grid, BoxSelect, Trash2, Printer, Save, Maximize, X,
    AlignStartVertical, AlignEndVertical, AlignCenterVertical,
    Undo, Redo, Settings, FileText
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

export const LabelEditor: React.FC<{ readOnly?: boolean; mockData?: any; onClose?: () => void }> = ({ readOnly = false, mockData, onClose }) => {
    const { labelLayout, saveLabelLayout } = useData();
    
    // -- STATE --
    // Standard size 10x15 cm approx 400x600 px for screen editing (Scale ~4px/mm)
    const [canvasSize] = useState({ width: 400, height: 600 });
    const [elements, setElements] = useState<LabelElement[]>(labelLayout.elements);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showGrid, setShowGrid] = useState(true);
    
    // -- HISTORY (Undo/Redo) --
    const [history, setHistory] = useState<LabelElement[][]>([labelLayout.elements]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const canvasRef = useRef<HTMLDivElement>(null);

    // -- DRAG & RESIZE STATE --
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStartPositions, setDragStartPositions] = useState<{id: string, x: number, y: number}[]>([]);
    
    // Sync initial load
    useEffect(() => {
        if (!readOnly) {
            setElements(labelLayout.elements);
            // We enforce the standard size here implicitly by not updating canvasSize state from layout if different
            // But we ensure history is synced
            setHistory([labelLayout.elements]);
            setHistoryIndex(0);
        }
    }, [labelLayout, readOnly]);

    // -- HISTORY HELPERS --
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
            setSelectedIds([]); // Clear selection on undo to avoid ghosting
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

    // -- DATA ACTIONS --

    const handleSave = () => {
        saveLabelLayout({ width: canvasSize.width, height: canvasSize.height, elements });
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
        const newElements = [...elements, newEl];
        addToHistory(newElements);
        setSelectedIds([newEl.id]);
    };

    // Update single element (helper)
    const updateElement = (id: string, updates: Partial<LabelElement>, commit = true) => {
        if (readOnly) return;
        const newElements = elements.map(el => el.id === id ? { ...el, ...updates } : el);
        if (commit) addToHistory(newElements);
        else setElements(newElements);
    };

    // Update ALL selected elements (batch)
    const updateSelectedElements = (updates: Partial<LabelElement>) => {
        if (readOnly) return;
        const newElements = elements.map(el => selectedIds.includes(el.id) ? { ...el, ...updates } : el);
        addToHistory(newElements);
    };

    const deleteSelectedElements = () => {
        if (readOnly) return;
        const newElements = elements.filter(el => !selectedIds.includes(el.id));
        addToHistory(newElements);
        setSelectedIds([]);
    };

    // --- INTERACTION LOGIC ---

    // 1. DRAGGING
    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        if (readOnly) return;
        e.stopPropagation(); // Stop bubbling to canvas background
        
        // Handle Multi-Selection
        let newSelection = [...selectedIds];
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            if (newSelection.includes(id)) {
                newSelection = newSelection.filter(sid => sid !== id);
            } else {
                newSelection.push(id);
            }
        } else {
            if (!newSelection.includes(id)) {
                newSelection = [id];
            }
        }
        
        // Only change selection if we are NOT already selecting a group member to drag
        if (!newSelection.includes(id) && (e.ctrlKey || e.metaKey)) {
            setSelectedIds(newSelection);
            return;
        }
        
        if (newSelection.length === 0) newSelection = [id];
        setSelectedIds(newSelection);
        setIsDragging(true);

        const currentElementsMap = new Map<string, LabelElement>(elements.map(el => [el.id, el]));
        const startPositions = newSelection.map(sid => {
            const el = currentElementsMap.get(sid);
            return el ? { id: sid, x: el.x, y: el.y } : null;
        }).filter((p): p is {id: string, x: number, y: number} => p !== null);

        setDragStartPositions(startPositions);
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;

        const handleWindowMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startMouseX;
            const dy = moveEvent.clientY - startMouseY;

            setElements(prev => prev.map(el => {
                const startPos = startPositions.find(p => p.id === el.id);
                if (startPos) {
                    let newX = startPos.x + dx;
                    let newY = startPos.y + dy;

                    if (showGrid) {
                        newX = Math.round(newX / 10) * 10;
                        newY = Math.round(newY / 10) * 10;
                    }

                    newX = Math.max(0, newX);
                    newY = Math.max(0, newY);
                    return { ...el, x: newX, y: newY };
                }
                return el;
            }));
        };

        const handleWindowMouseUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
    };

    // Hack to commit history after Drag/Resize ends
    const prevDragging = useRef(false);
    const prevResizing = useRef(false);
    useEffect(() => {
        if (prevDragging.current && !isDragging) {
            addToHistory(elements);
        }
        prevDragging.current = isDragging;
    }, [isDragging, elements]);

    useEffect(() => {
        if (prevResizing.current && !isResizing) {
            addToHistory(elements);
        }
        prevResizing.current = isResizing;
    }, [isResizing, elements]);


    // 2. RESIZING
    const handleResizeStart = (e: React.MouseEvent, id: string, handle: string) => {
        if (readOnly) return;
        e.stopPropagation(); // Stop drag
        setIsResizing(true);
        
        const el = elements.find(e => e.id === id);
        if (!el) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const startEl = { ...el };

        const handleWindowMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            let newX = startEl.x;
            let newY = startEl.y;
            let newW = startEl.width;
            let newH = startEl.height;

            if (handle.includes('e')) newW = startEl.width + dx;
            if (handle.includes('w')) { newX = startEl.x + dx; newW = startEl.width - dx; }
            if (handle.includes('s')) newH = startEl.height + dy;
            if (handle.includes('n')) { newY = startEl.y + dy; newH = startEl.height - dy; }

            // Constraints
            if (newW < 10) newW = 10;
            if (newH < 10) newH = 10;

            // Grid Snap
            if (showGrid) {
                if (handle.includes('e') || handle.includes('w')) newW = Math.round(newW / 10) * 10;
                if (handle.includes('s') || handle.includes('n')) newH = Math.round(newH / 10) * 10;
                if (handle.includes('w')) newX = Math.round(newX / 10) * 10;
                if (handle.includes('n')) newY = Math.round(newY / 10) * 10;
            }

            setElements(prev => prev.map(item => item.id === id ? { ...item, x: newX, y: newY, width: newW, height: newH } : item));
        };

        const handleWindowMouseUp = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
    };

    // Render content for an element
    const renderContent = (el: LabelElement) => {
        let text = el.customText || el.label;
        
        if (readOnly && mockData) {
            switch(el.type) {
                case 'rawMaterial': text = mockData.rawMaterial || '---'; break;
                case 'productType': text = mockData.productType || '---'; break;
                case 'variety': text = mockData.variety || '---'; break;
                case 'lotCode': text = mockData.lotCode || '---'; break;
                case 'weight': text = mockData.weight?.toFixed(2) || '0.00'; break;
                case 'caseCount': text = mockData.caseCount || '0'; break;
                case 'date': text = new Date().toLocaleDateString(); break;
                case 'palletId': text = mockData.id || 'PID-00000'; break;
                case 'producer': text = mockData.producer || ''; break;
                case 'packaging': text = mockData.packaging || ''; break;
                case 'quality': text = mockData.quality || 'I Cat'; break;
            }
        } else {
             switch(el.type) {
                case 'lotCode': text = '14002'; break;
                case 'weight': text = '120.00'; break;
                case 'caseCount': text = '48'; break;
                case 'date': text = '31/12/2024'; break;
                case 'companyInfo': text = 'MONITO FRUIT LTD'; break;
             }
        }

        const displayText = `${el.prefix || ''}${text}${el.suffix || ''}`;

        return (
            <div 
                className="w-full h-full overflow-hidden whitespace-nowrap text-ellipsis pointer-events-none"
                style={{ 
                    fontSize: `${el.fontSize}px`, 
                    fontWeight: el.isBold ? 'bold' : 'normal',
                    textAlign: el.textAlign,
                    lineHeight: `${el.height}px`
                }}
            >
                {displayText}
            </div>
        );
    };

    // --- ALIGNMENT LOGIC ---
    const anchorId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
    const anchorElement = elements.find(e => e.id === anchorId);

    const align = (direction: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') => {
        if (selectedIds.length === 0) return;

        let newElements = [...elements];
        
        if (selectedIds.length === 1) {
            // Align to Canvas
            const el = newElements.find(e => e.id === selectedIds[0]);
            if (!el) return;
            switch(direction) {
                case 'left': el.x = 0; break;
                case 'center-x': el.x = (canvasSize.width - el.width) / 2; break;
                case 'right': el.x = canvasSize.width - el.width; break;
                case 'top': el.y = 0; break;
                case 'center-y': el.y = (canvasSize.height - el.height) / 2; break;
                case 'bottom': el.y = canvasSize.height - el.height; break;
            }
        } else {
            // Align to Anchor
            if (!anchorElement) return;
            newElements = newElements.map(el => {
                if (selectedIds.includes(el.id) && el.id !== anchorId) {
                    const updated = { ...el };
                    switch(direction) {
                        case 'left': updated.x = anchorElement.x; break;
                        case 'center-x': updated.x = anchorElement.x + (anchorElement.width/2) - (el.width/2); break;
                        case 'right': updated.x = anchorElement.x + anchorElement.width - el.width; break;
                        case 'top': updated.y = anchorElement.y; break;
                        case 'center-y': updated.y = anchorElement.y + (anchorElement.height/2) - (el.height/2); break;
                        case 'bottom': updated.y = anchorElement.y + anchorElement.height - el.height; break;
                    }
                    return updated;
                }
                return el;
            });
        }
        addToHistory(newElements);
    };

    // Calculated properties for the panel
    const isSingleSelection = selectedIds.length === 1;
    const isMultipleSelection = selectedIds.length > 1;
    const primaryElement = anchorElement; 

    return (
        <div className="flex h-full bg-slate-100 overflow-hidden relative">
             {readOnly && onClose && (
                <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-slate-800 text-white p-2 rounded-full hover:bg-slate-700 shadow-lg"><X className="w-6 h-6"/></button>
            )}

            {/* --- SIDEBAR (Tools) --- */}
            {!readOnly && (
                <div className="w-64 bg-white border-r border-slate-200 flex flex-col z-10 shadow-lg shrink-0">
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><FileText className="w-5 h-5"/> Impostazioni Etichetta</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Formato Standard 10x15 cm</p>
                    </div>
                    
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Layout className="w-5 h-5"/> Campi Disponibili</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Trascina o clicca per aggiungere</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {FIELD_TYPES.map(field => (
                            <div 
                                key={field.type} 
                                onClick={() => addElement(field.type)}
                                className="p-3 bg-white border border-slate-200 rounded cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center gap-3 group"
                            >
                                <div className="bg-slate-100 p-1.5 rounded text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-100">
                                    <Type className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-slate-700">{field.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-200 bg-slate-50">
                        <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded font-bold shadow-md hover:bg-blue-700 flex items-center justify-center gap-2"><Save className="w-4 h-4"/> Salva Layout</button>
                    </div>
                </div>
            )}

            {/* --- MAIN CANVAS AREA --- */}
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-200/50 relative overflow-hidden p-8" onClick={() => !readOnly && setSelectedIds([])}>
                {/* Toolbar for Editor */}
                {!readOnly && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-sm border border-slate-200 p-1 flex gap-2" onClick={e => e.stopPropagation()}>
                         <button onClick={undo} disabled={historyIndex <= 0} className="p-2 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30" title="Annulla"><Undo className="w-4 h-4"/></button>
                         <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30" title="Ripeti"><Redo className="w-4 h-4"/></button>
                         <div className="w-px bg-slate-200 mx-1"></div>
                         <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded ${showGrid ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`} title="Griglia"><Grid className="w-4 h-4"/></button>
                         <div className="w-px bg-slate-200 mx-1"></div>
                         <button onClick={() => align('left')} className="p-2 text-slate-500 hover:bg-slate-100 rounded" title={isMultipleSelection ? "Allinea a Sinistra (Anchor)" : "Allinea a Sinistra (Canvas)"}><AlignLeft className="w-4 h-4"/></button>
                         <button onClick={() => align('center-x')} className="p-2 text-slate-500 hover:bg-slate-100 rounded" title="Centra Orizz."><AlignCenter className="w-4 h-4"/></button>
                         <button onClick={() => align('right')} className="p-2 text-slate-500 hover:bg-slate-100 rounded" title="Allinea Destra"><AlignRight className="w-4 h-4"/></button>
                         <div className="w-px bg-slate-200 mx-1"></div>
                         <button onClick={() => align('top')} className="p-2 text-slate-500 hover:bg-slate-100 rounded" title="Allinea in Alto"><AlignStartVertical className="w-4 h-4"/></button>
                         <button onClick={() => align('center-y')} className="p-2 text-slate-500 hover:bg-slate-100 rounded" title="Centra Vert."><AlignCenterVertical className="w-4 h-4"/></button>
                         <button onClick={() => align('bottom')} className="p-2 text-slate-500 hover:bg-slate-100 rounded" title="Allinea in Basso"><AlignEndVertical className="w-4 h-4"/></button>
                    </div>
                )}
                
                {/* CANVAS */}
                <div className="relative shadow-2xl bg-white transition-all"
                    ref={canvasRef}
                    style={{ 
                        width: canvasSize.width, 
                        height: canvasSize.height,
                        backgroundImage: showGrid && !readOnly ? 'radial-gradient(#cbd5e1 1px, transparent 1px)' : 'none',
                        backgroundSize: '10px 10px'
                    }}
                    onClick={(e) => { e.stopPropagation(); if(!readOnly) setSelectedIds([]); }}
                >
                    {elements.map(el => {
                        const isSelected = selectedIds.includes(el.id);
                        const isAnchor = el.id === anchorId;
                        
                        // Render resize handles function
                        const renderHandles = () => {
                            if (!isSelected || readOnly) return null;
                            const hClass = `absolute w-2.5 h-2.5 bg-white border border-blue-600 rounded-full z-30`;
                            return (
                                <>
                                    {/* Corners */}
                                    <div onMouseDown={(e) => handleResizeStart(e, el.id, 'nw')} className={`${hClass} -top-1.5 -left-1.5 cursor-nw-resize`} />
                                    <div onMouseDown={(e) => handleResizeStart(e, el.id, 'ne')} className={`${hClass} -top-1.5 -right-1.5 cursor-ne-resize`} />
                                    <div onMouseDown={(e) => handleResizeStart(e, el.id, 'sw')} className={`${hClass} -bottom-1.5 -left-1.5 cursor-sw-resize`} />
                                    <div onMouseDown={(e) => handleResizeStart(e, el.id, 'se')} className={`${hClass} -bottom-1.5 -right-1.5 cursor-se-resize`} />
                                    
                                    {/* Sides (Only if size > 20px to avoid clutter) */}
                                    {el.width > 20 && <>
                                        <div onMouseDown={(e) => handleResizeStart(e, el.id, 'n')} className={`${hClass} -top-1.5 left-1/2 -ml-1.5 cursor-n-resize`} />
                                        <div onMouseDown={(e) => handleResizeStart(e, el.id, 's')} className={`${hClass} -bottom-1.5 left-1/2 -ml-1.5 cursor-s-resize`} />
                                    </>}
                                    {el.height > 20 && <>
                                        <div onMouseDown={(e) => handleResizeStart(e, el.id, 'w')} className={`${hClass} top-1/2 -mt-1.5 -left-1.5 cursor-w-resize`} />
                                        <div onMouseDown={(e) => handleResizeStart(e, el.id, 'e')} className={`${hClass} top-1/2 -mt-1.5 -right-1.5 cursor-e-resize`} />
                                    </>}
                                </>
                            );
                        };

                        return (
                        <div
                            key={el.id}
                            onMouseDown={(e) => handleMouseDown(e, el.id)}
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute border select-none group 
                                ${isSelected ? (isAnchor ? 'border-blue-600 z-20 ring-1 ring-blue-600' : 'border-blue-400 z-10 border-dashed') : 'border-transparent hover:border-slate-300'}
                                ${isSelected && !readOnly ? 'bg-blue-50/10' : ''}
                                ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                            `}
                            style={{
                                left: el.x,
                                top: el.y,
                                width: el.width,
                                height: el.height
                            }}
                        >
                            {renderContent(el)}
                            {renderHandles()}
                        </div>
                    )})}
                    {elements.length === 0 && !readOnly && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none">
                            <span className="text-sm font-medium uppercase tracking-widest">Trascina elementi qui</span>
                        </div>
                    )}
                </div>
                {readOnly && <div className="mt-4 text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Printer className="w-4 h-4"/> Anteprima di Stampa</div>}
                {!readOnly && <div className="mt-4 text-slate-400 text-[10px] uppercase font-bold tracking-widest">CTRL+CLICK per selezione multipla • L'ultimo selezionato è l'ancora per l'allineamento</div>}
            </div>

            {/* --- PROPERTIES PANEL --- */}
            {!readOnly && (
                <div className="w-72 bg-white border-l border-slate-200 flex flex-col z-10 shadow-lg shrink-0">
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <SettingsPanelHeader count={selectedIds.length} />
                        </h3>
                    </div>
                    
                    {primaryElement ? (
                        <div className="p-4 space-y-6 overflow-y-auto">
                            {isMultipleSelection && (
                                <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700 mb-2">
                                    Modifica di <strong>{selectedIds.length}</strong> elementi. 
                                    Coordinate e testi sono bloccati.
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Contenuto</label>
                                {isSingleSelection ? (
                                    <>
                                        <input disabled value={primaryElement.label} className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-600 mb-2" />
                                        {primaryElement.type === 'staticText' && (
                                            <input 
                                                value={primaryElement.customText || ''} 
                                                onChange={e => updateElement(primaryElement.id, { customText: e.target.value })}
                                                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" 
                                                placeholder="Inserisci testo..."
                                            />
                                        )}
                                        <div className="flex gap-2 mt-2">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Prefisso</label>
                                                <input 
                                                    value={primaryElement.prefix || ''} 
                                                    onChange={e => updateElement(primaryElement.id, { prefix: e.target.value })}
                                                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs" 
                                                    placeholder="Es. Peso: "
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Suffisso</label>
                                                <input 
                                                    value={primaryElement.suffix || ''} 
                                                    onChange={e => updateElement(primaryElement.id, { suffix: e.target.value })}
                                                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs" 
                                                    placeholder="Es. Kg"
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-sm text-slate-400 italic">Vario (Multi-selezione)</div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">X (px)</label>
                                    <input 
                                        type="number" 
                                        disabled={isMultipleSelection}
                                        value={primaryElement.x} 
                                        onChange={e => updateElement(primaryElement.id, { x: parseInt(e.target.value) })} 
                                        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono disabled:bg-slate-100 disabled:text-slate-400" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Y (px)</label>
                                    <input 
                                        type="number" 
                                        disabled={isMultipleSelection}
                                        value={primaryElement.y} 
                                        onChange={e => updateElement(primaryElement.id, { y: parseInt(e.target.value) })} 
                                        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono disabled:bg-slate-100 disabled:text-slate-400" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">W (px)</label>
                                    <input 
                                        type="number" 
                                        value={primaryElement.width} 
                                        onChange={e => updateSelectedElements({ width: parseInt(e.target.value) })} 
                                        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">H (px)</label>
                                    <input 
                                        type="number" 
                                        value={primaryElement.height} 
                                        onChange={e => updateSelectedElements({ height: parseInt(e.target.value) })} 
                                        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono" 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Stile Testo</label>
                                <div className="flex gap-2 mb-3">
                                    <button onClick={() => updateSelectedElements({ isBold: !primaryElement.isBold })} className={`flex-1 py-1.5 border rounded flex justify-center ${primaryElement.isBold ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white text-slate-600'}`}><Bold className="w-4 h-4"/></button>
                                    <button onClick={() => updateSelectedElements({ textAlign: 'left' })} className={`flex-1 py-1.5 border rounded flex justify-center ${primaryElement.textAlign === 'left' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white text-slate-600'}`}><AlignLeft className="w-4 h-4"/></button>
                                    <button onClick={() => updateSelectedElements({ textAlign: 'center' })} className={`flex-1 py-1.5 border rounded flex justify-center ${primaryElement.textAlign === 'center' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white text-slate-600'}`}><AlignCenter className="w-4 h-4"/></button>
                                    <button onClick={() => updateSelectedElements({ textAlign: 'right' })} className={`flex-1 py-1.5 border rounded flex justify-center ${primaryElement.textAlign === 'right' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white text-slate-600'}`}><AlignRight className="w-4 h-4"/></button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="text-sm text-slate-600">Font Size:</label>
                                    <input type="range" min="8" max="72" value={primaryElement.fontSize} onChange={e => updateSelectedElements({ fontSize: parseInt(e.target.value) })} className="flex-1" />
                                    <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{primaryElement.fontSize}px</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-200 mt-auto">
                                <button onClick={deleteSelectedElements} className="w-full border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 py-2 rounded text-sm font-bold flex items-center justify-center gap-2"><Trash2 className="w-4 h-4"/> Rimuovi {isMultipleSelection ? 'Selezionati' : 'Elemento'}</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                            <BoxSelect className="w-12 h-12 mb-2 opacity-20" />
                            <p className="text-sm">Seleziona elementi sul canvas.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const SettingsPanelHeader = ({ count }: { count: number }) => (
    <>
        {count > 0 ? <Move className="w-5 h-5"/> : <Maximize className="w-5 h-5"/>}
        {count === 0 ? 'Nessuna Selezione' : count === 1 ? 'Proprietà Elemento' : `Selezione Multipla (${count})`}
    </>
);
