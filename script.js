// ===== STATE MANAGEMENT =====
const state = {
    selectedElements: new Set(),
    selectedPaletteChars: [],
    draggedElement: null,
    dragOffset: { x: 0, y: 0 },
    elementCounter: 0,
    isShiftPressed: false,
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,
    zoomLevel: 1
};

// ===== DOM ELEMENTS =====
const canvas = document.getElementById('canvas');
const clearCanvasBtn = document.getElementById('clearCanvas');
const deleteSelectedBtn = document.getElementById('deleteSelected');
const manualInput = document.getElementById('manualInput');
const insertManualBtn = document.getElementById('insertManual');
const copyExpressionBtn = document.getElementById('copyExpression');
const exportImageBtn = document.getElementById('exportImage');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const alignLeftBtn = document.getElementById('alignLeft');
const alignCenterBtn = document.getElementById('alignCenter');
const fractionBuilderBtn = document.getElementById('fractionBuilder');
const matrixBuilderBtn = document.getElementById('matrixBuilder');
const charItems = document.querySelectorAll('.char-item');

// (full script.js content continues exactly as provided)
