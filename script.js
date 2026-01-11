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

// ===== INITIALIZATION =====
function init() {
    setupPaletteDragHandlers();
    setupCanvasDropHandlers();
    setupKeyboardHandlers();
    setupButtonHandlers();
    setupManualInput();
    saveState(); // Save initial empty state
    console.log('🎨 Math Draw initialized successfully!');
}

// ===== UNDO/REDO SYSTEM =====
function saveState() {
    // Get current canvas state
    const elements = Array.from(canvas.querySelectorAll('.canvas-element')).map(el => ({
        content: el.textContent,
        left: el.style.left,
        top: el.style.top,
        id: el.dataset.id
    }));

    // Remove any future states if we're not at the end
    if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
    }

    // Add new state
    state.history.push(elements);

    // Limit history size
    if (state.history.length > state.maxHistorySize) {
        state.history.shift();
    } else {
        state.historyIndex++;
    }
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        restoreState(state.history[state.historyIndex]);
    }
}

function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        restoreState(state.history[state.historyIndex]);
    }
}

function restoreState(elements) {
    // Clear current canvas
    canvas.querySelectorAll('.canvas-element').forEach(el => el.remove());
    clearSelection();

    // Restore elements
    elements.forEach(data => {
        const element = document.createElement('div');
        element.className = 'canvas-element';
        element.textContent = data.content;
        element.dataset.id = data.id;
        element.draggable = true;
        element.style.left = data.left;
        element.style.top = data.top;

        // Add event listeners
        element.addEventListener('mousedown', handleElementMouseDown);
        element.addEventListener('dragstart', handleElementDragStart);
        element.addEventListener('dragend', handleElementDragEnd);
        element.addEventListener('click', handleElementClick);

        canvas.appendChild(element);
    });

    // Update canvas state
    if (elements.length > 0) {
        canvas.classList.add('has-elements');
    } else {
        canvas.classList.remove('has-elements');
    }
}

// ===== MANUAL INPUT =====
function setupManualInput() {
    insertManualBtn.addEventListener('click', handleManualInsert);
    manualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleManualInsert();
        }
    });
}

function handleManualInsert() {
    const text = manualInput.value.trim();
    if (!text) return;

    // Get canvas center position
    const rect = canvas.getBoundingClientRect();
    const centerX = (canvas.scrollLeft + rect.width / 2) - 20;
    const centerY = (canvas.scrollTop + rect.height / 2) - 20;

    // Check for \frac{a}{b} notation
    const fracMatch = text.match(/\\frac\{([^}]+)\}\{([^}]+)\}/);
    if (fracMatch) {
        createFractionElement(fracMatch[1], fracMatch[2], centerX, centerY);
        manualInput.value = '';
        manualInput.focus();
        return;
    }

    // Check for \matrix{a,b;c,d} notation (comma separates cols, semicolon separates rows)
    const matrixMatch = text.match(/\\matrix\{([^}]+)\}/);
    if (matrixMatch) {
        const rows = matrixMatch[1].split(';').map(row => row.split(',').map(cell => cell.trim()));
        createMatrixElement(rows, centerX, centerY);
        manualInput.value = '';
        manualInput.focus();
        return;
    }

    // Auto-format superscripts (^), subscripts (_), and Greek letters
    const formatted = formatMathText(text);

    // Create element at center
    createCanvasElement(formatted, centerX, centerY);

    // Clear input and focus
    manualInput.value = '';
    manualInput.focus();
}

// Format math text with superscripts and subscripts
function formatMathText(text) {
    const superscriptMap = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        'n': 'ⁿ', 'i': 'ⁱ', '+': '⁺', '-': '⁻', '=': '⁼',
        '(': '⁽', ')': '⁾', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ',
        'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ',
        'k': 'ᵏ', 'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ',
        's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ',
        'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ'
    };

    const subscriptMap = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
        'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
        'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
        'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
        'v': 'ᵥ', 'x': 'ₓ', '+': '₊', '-': '₋', '=': '₌',
        '(': '₍', ')': '₎'
    };

    // Greek letter shortcuts
    const greekMap = {
        '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
        '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
        '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\mu': 'μ',
        '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ',
        '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
        '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
        '\\Alpha': 'Α', '\\Beta': 'Β', '\\Gamma': 'Γ', '\\Delta': 'Δ',
        '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Pi': 'Π', '\\Sigma': 'Σ',
        '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
        '\\infty': '∞', '\\infinity': '∞', '\\sum': '∑', '\\prod': '∏',
        '\\int': '∫', '\\sqrt': '√', '\\pm': '±', '\\times': '×',
        '\\div': '÷', '\\neq': '≠', '\\leq': '≤', '\\geq': '≥',
        '\\approx': '≈', '\\equiv': '≡', '\\forall': '∀', '\\exists': '∃',
        '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
        '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅',
        '\\rightarrow': '→', '\\leftarrow': '←', '\\Rightarrow': '⇒',
        '\\Leftrightarrow': '⇔', '\\partial': '∂', '\\nabla': '∇'
    };

    let result = text;

    // Replace Greek letters and math symbols
    for (const [key, value] of Object.entries(greekMap)) {
        result = result.replace(new RegExp(key.replace(/\\/g, '\\\\'), 'g'), value);
    }

    // Replace simple fractions like a/b with a⁄b (using fraction slash)
    result = result.replace(/(\d+)\/(\d+)/g, '$1⁄$2');

    // Replace ^{...} or ^x with superscripts
    result = result.replace(/\^(\{[^}]+\}|.)/g, (match, content) => {
        const chars = content.replace(/[{}]/g, '');
        return chars.split('').map(c => superscriptMap[c] || c).join('');
    });

    // Replace _{...} or _x with subscripts
    result = result.replace(/_(\{[^}]+\}|.)/g, (match, content) => {
        const chars = content.replace(/[{}]/g, '');
        return chars.split('').map(c => subscriptMap[c] || c).join('');
    });

    return result;
}

// ===== PALETTE DRAG HANDLERS =====
function setupPaletteDragHandlers() {
    charItems.forEach(item => {
        item.addEventListener('click', handlePaletteItemClick);
        item.addEventListener('dragstart', handlePaletteDragStart);
        item.addEventListener('dragend', handlePaletteDragEnd);
    });
}

function handlePaletteItemClick(e) {
    const item = e.currentTarget;
    const char = item.dataset.char;
    const isShiftClick = e.shiftKey; // Check shiftKey directly from event

    // If elements are selected on canvas, merge them with this character
    if (state.selectedElements.size > 0) {
        e.preventDefault();

        // Special case: if clicking "=", evaluate the expression
        if (char === '=') {
            evaluateSelectedElements();
        } else if (isBracket(char)) {
            // Wrap selected elements in brackets
            wrapSelectedInBrackets(char);
        } else {
            // Merge with the clicked character
            mergeSelectedElements(char);
        }
        return;
    }

    // Normal palette selection behavior
    if (isShiftClick) {
        // Multi-select mode
        if (item.classList.contains('palette-selected')) {
            // Deselect
            item.classList.remove('palette-selected');
            const index = state.selectedPaletteChars.indexOf(char);
            if (index > -1) {
                state.selectedPaletteChars.splice(index, 1);
            }
        } else {
            // Select
            item.classList.add('palette-selected');
            state.selectedPaletteChars.push(char);
        }
    } else {
        // Single select mode - clear previous selections
        clearPaletteSelection();
        item.classList.add('palette-selected');
        state.selectedPaletteChars = [char];
    }
}

// Bracket pairs for matching
const bracketPairs = {
    '(': ')', ')': '(',
    '[': ']', ']': '[',
    '{': '}', '}': '{',
    '⟨': '⟩', '⟩': '⟨',
    '|': '|',
    '‖': '‖'
};

const openBrackets = ['(', '[', '{', '⟨', '|', '‖'];
const closeBrackets = [')', ']', '}', '⟩'];

function isBracket(char) {
    return bracketPairs.hasOwnProperty(char);
}

function wrapSelectedInBrackets(bracket) {
    if (state.selectedElements.size === 0) return;

    // Get all selected elements and sort by position
    const elements = Array.from(state.selectedElements).sort((a, b) => {
        const aTop = parseInt(a.style.top) || 0;
        const bTop = parseInt(b.style.top) || 0;
        const aLeft = parseInt(a.style.left) || 0;
        const bLeft = parseInt(b.style.left) || 0;

        if (Math.abs(aTop - bTop) < 20) {
            return aLeft - bLeft;
        }
        return aTop - bTop;
    });

    // Combine text content
    const content = elements.map(el => el.textContent).join('');

    // Determine matching bracket
    let openBracket, closeBracket;
    if (openBrackets.includes(bracket)) {
        openBracket = bracket;
        closeBracket = bracketPairs[bracket];
    } else {
        closeBracket = bracket;
        openBracket = bracketPairs[bracket];
    }

    // Create wrapped content
    const wrapped = `${openBracket}${content}${closeBracket}`;

    // Calculate center position
    let totalX = 0;
    let totalY = 0;
    elements.forEach(el => {
        totalX += parseInt(el.style.left) || 0;
        totalY += parseInt(el.style.top) || 0;
    });
    const centerX = totalX / elements.length;
    const centerY = totalY / elements.length;

    // Remove selected elements
    elements.forEach(el => el.remove());
    clearSelection();

    // Create wrapped element
    createCanvasElement(wrapped, centerX, centerY);
}

// Evaluate mathematical expression from selected elements
function evaluateSelectedElements() {
    if (state.selectedElements.size === 0) return;

    // Get all selected elements and sort by position
    const elements = Array.from(state.selectedElements).sort((a, b) => {
        const aTop = parseInt(a.style.top) || 0;
        const bTop = parseInt(b.style.top) || 0;
        const aLeft = parseInt(a.style.left) || 0;
        const bLeft = parseInt(b.style.left) || 0;

        if (Math.abs(aTop - bTop) < 20) {
            return aLeft - bLeft;
        }
        return aTop - bTop;
    });

    // Combine text to form expression
    const expression = elements.map(el => el.textContent).join('');

    try {
        // Replace math symbols with JavaScript operators
        let evalExpression = expression
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/−/g, '-')
            .replace(/\^(\d+)/g, '**$1'); // Handle superscripts as powers

        // Evaluate the expression
        const result = eval(evalExpression);

        // Calculate center position
        let totalX = 0;
        let totalY = 0;
        elements.forEach(el => {
            totalX += parseInt(el.style.left) || 0;
            totalY += parseInt(el.style.top) || 0;
        });
        const centerX = totalX / elements.length;
        const centerY = totalY / elements.length;

        // Remove selected elements
        elements.forEach(el => el.remove());
        clearSelection();

        // Create result element (only the result, not the expression)
        createCanvasElement(String(result), centerX, centerY);

        // Update canvas state
        if (canvas.querySelectorAll('.canvas-element').length === 0) {
            canvas.classList.remove('has-elements');
        }
    } catch (error) {
        // If evaluation fails, just merge with "="
        mergeSelectedElements('=');
    }
}

function clearPaletteSelection() {
    charItems.forEach(item => {
        item.classList.remove('palette-selected');
    });
    state.selectedPaletteChars = [];
}

function handlePaletteDragStart(e) {
    const char = e.target.dataset.char;
    e.dataTransfer.effectAllowed = 'copy';

    // If multiple characters are selected, include them all
    if (state.selectedPaletteChars.length > 1) {
        e.dataTransfer.setData('text/plain', JSON.stringify(state.selectedPaletteChars));
        e.dataTransfer.setData('multiple', 'true');
    } else {
        e.dataTransfer.setData('text/plain', char);
    }

    e.dataTransfer.setData('source', 'palette');
    e.target.classList.add('dragging');
}

function handlePaletteDragEnd(e) {
    e.target.classList.remove('dragging');
}

// ===== CANVAS DROP HANDLERS =====
function setupCanvasDropHandlers() {
    canvas.addEventListener('dragover', handleCanvasDragOver);
    canvas.addEventListener('dragleave', handleCanvasDragLeave);
    canvas.addEventListener('drop', handleCanvasDrop);
}

function handleCanvasDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    canvas.classList.add('drag-over');
}

function handleCanvasDragLeave(e) {
    if (e.target === canvas) {
        canvas.classList.remove('drag-over');
    }
}

function handleCanvasDrop(e) {
    e.preventDefault();
    canvas.classList.remove('drag-over');

    const source = e.dataTransfer.getData('source');

    if (source === 'palette') {
        const isMultiple = e.dataTransfer.getData('multiple') === 'true';
        const data = e.dataTransfer.getData('text/plain');
        const rect = canvas.getBoundingClientRect();

        // Optimized position calculation accounting for scroll
        const x = e.clientX - rect.left + canvas.scrollLeft - 15; // Offset for better centering
        const y = e.clientY - rect.top + canvas.scrollTop - 15;

        if (isMultiple) {
            // Combine all selected characters into a single element
            const chars = JSON.parse(data);
            const combined = chars.join(''); // Join all characters together
            createCanvasElement(combined, x, y);
            clearPaletteSelection();
        } else {
            createCanvasElement(data, x, y);
        }
    }
}

// ===== CREATE CANVAS ELEMENT =====
function createCanvasElement(char, x, y) {
    const element = document.createElement('div');
    element.className = 'canvas-element';
    element.textContent = char;
    element.dataset.id = `element-${state.elementCounter++}`;
    element.draggable = true;

    // Position element
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;

    // Add event listeners
    element.addEventListener('mousedown', handleElementMouseDown);
    element.addEventListener('dragstart', handleElementDragStart);
    element.addEventListener('dragend', handleElementDragEnd);
    element.addEventListener('click', handleElementClick);

    canvas.appendChild(element);
    canvas.classList.add('has-elements');

    // Animate in
    element.style.animation = 'fadeIn 0.3s ease';

    // Save state for undo
    saveState();
}

// ===== ELEMENT SELECTION =====
function handleElementClick(e) {
    e.stopPropagation();
    const element = e.currentTarget;
    const isShiftClick = e.shiftKey; // Check shiftKey directly from event

    if (isShiftClick) {
        // Multi-select with Shift
        toggleElementSelection(element);
    } else {
        // Single select
        clearSelection();
        selectElement(element);
    }
}

function selectElement(element) {
    element.classList.add('selected');
    state.selectedElements.add(element);
}

function deselectElement(element) {
    element.classList.remove('selected');
    state.selectedElements.delete(element);
}

function toggleElementSelection(element) {
    if (state.selectedElements.has(element)) {
        deselectElement(element);
    } else {
        selectElement(element);
    }
}

function clearSelection() {
    state.selectedElements.forEach(element => {
        element.classList.remove('selected');
    });
    state.selectedElements.clear();
}

// Click on canvas to deselect all
canvas.addEventListener('click', (e) => {
    if (e.target === canvas) {
        clearSelection();
    }
});

// ===== ELEMENT DRAGGING =====
function handleElementMouseDown(e) {
    const element = e.currentTarget;
    const isShiftClick = e.shiftKey;

    // If clicking on a non-selected element, select only it
    if (!state.selectedElements.has(element) && !isShiftClick) {
        clearSelection();
        selectElement(element);
    }
}

function handleElementDragStart(e) {
    const element = e.currentTarget;

    // If dragging a non-selected element, select only it
    if (!state.selectedElements.has(element)) {
        clearSelection();
        selectElement(element);
    }

    state.draggedElement = element;

    const rect = element.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    state.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };

    // Mark all selected elements as dragging
    state.selectedElements.forEach(el => {
        el.classList.add('dragging');
        // Store initial position for relative movement
        el.dataset.dragStartX = el.offsetLeft;
        el.dataset.dragStartY = el.offsetTop;
    });

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('source', 'canvas');
}

function handleElementDragEnd(e) {
    state.selectedElements.forEach(el => {
        el.classList.remove('dragging');
        delete el.dataset.dragStartX;
        delete el.dataset.dragStartY;
    });

    state.draggedElement = null;
}

// Handle dragging over canvas for repositioning
canvas.addEventListener('dragover', (e) => {
    if (state.draggedElement) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const rect = canvas.getBoundingClientRect();
        const newX = e.clientX - rect.left - state.dragOffset.x + canvas.scrollLeft;
        const newY = e.clientY - rect.top - state.dragOffset.y + canvas.scrollTop;

        // Calculate delta from the dragged element's start position
        const deltaX = newX - parseInt(state.draggedElement.dataset.dragStartX);
        const deltaY = newY - parseInt(state.draggedElement.dataset.dragStartY);

        // Move all selected elements by the same delta
        state.selectedElements.forEach(element => {
            const startX = parseInt(element.dataset.dragStartX);
            const startY = parseInt(element.dataset.dragStartY);

            element.style.left = `${startX + deltaX}px`;
            element.style.top = `${startY + deltaY}px`;
        });
    }
});

// ===== KEYBOARD HANDLERS =====
function setupKeyboardHandlers() {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
}

function handleKeyDown(e) {
    // Don't process if typing in input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    // Track Shift key
    if (e.key === 'Shift') {
        state.isShiftPressed = true;
    }

    // Delete selected elements with Delete or Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedElements.size > 0) {
        e.preventDefault();
        deleteSelectedElements();
    }

    // Merge selected elements with Enter key (no separator)
    if (e.key === 'Enter' && state.selectedElements.size > 1) {
        e.preventDefault();
        mergeSelectedElements(''); // Empty string means no separator
    }

    // Select all with Ctrl+A
    if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        selectAllElements();
    }

    // Undo with Ctrl+Z
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    }

    // Redo with Ctrl+Y or Ctrl+Shift+Z
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
    }

    // Deselect all with Escape
    if (e.key === 'Escape') {
        clearSelection();
    }

    // Arrow keys to move selected elements
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        moveSelectedElements(e.key);
    }

    // Merge selected elements with typed character
    if (state.selectedElements.size > 1 && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        mergeSelectedElements(e.key);
    }
}

// Merge selected elements with a character
function mergeSelectedElements(char) {
    if (state.selectedElements.size < 2) return;

    // Get all selected elements and sort by position (left to right, top to bottom)
    const elements = Array.from(state.selectedElements).sort((a, b) => {
        const aTop = parseInt(a.style.top) || 0;
        const bTop = parseInt(b.style.top) || 0;
        const aLeft = parseInt(a.style.left) || 0;
        const bLeft = parseInt(b.style.left) || 0;

        // Sort by top first, then by left
        if (Math.abs(aTop - bTop) < 20) { // If roughly same row
            return aLeft - bLeft;
        }
        return aTop - bTop;
    });

    // Combine text content with the character in between
    const combinedText = elements.map(el => el.textContent).join(char);

    // Calculate center position of all selected elements
    let totalX = 0;
    let totalY = 0;
    elements.forEach(el => {
        totalX += parseInt(el.style.left) || 0;
        totalY += parseInt(el.style.top) || 0;
    });
    const centerX = totalX / elements.length;
    const centerY = totalY / elements.length;

    // Remove all selected elements
    elements.forEach(el => {
        el.remove();
    });

    // Clear selection
    clearSelection();

    // Create new merged element at center
    createCanvasElement(combinedText, centerX, centerY);

    // Update canvas state
    if (canvas.querySelectorAll('.canvas-element').length === 0) {
        canvas.classList.remove('has-elements');
    }
}

function handleKeyUp(e) {
    if (e.key === 'Shift') {
        state.isShiftPressed = false;
    }
}

function moveSelectedElements(direction) {
    if (state.selectedElements.size === 0) return;

    const moveAmount = 5; // pixels

    state.selectedElements.forEach(element => {
        const currentLeft = parseInt(element.style.left) || 0;
        const currentTop = parseInt(element.style.top) || 0;

        switch (direction) {
            case 'ArrowUp':
                element.style.top = `${currentTop - moveAmount}px`;
                break;
            case 'ArrowDown':
                element.style.top = `${currentTop + moveAmount}px`;
                break;
            case 'ArrowLeft':
                element.style.left = `${currentLeft - moveAmount}px`;
                break;
            case 'ArrowRight':
                element.style.left = `${currentLeft + moveAmount}px`;
                break;
        }
    });
}

function selectAllElements() {
    const elements = canvas.querySelectorAll('.canvas-element');
    clearSelection();
    elements.forEach(element => {
        selectElement(element);
    });
}

// ===== BUTTON HANDLERS =====
function setupButtonHandlers() {
    clearCanvasBtn.addEventListener('click', handleClearCanvas);
    deleteSelectedBtn.addEventListener('click', deleteSelectedElements);
    copyExpressionBtn.addEventListener('click', handleCopyExpression);
    exportImageBtn.addEventListener('click', handleExportImage);
    zoomInBtn.addEventListener('click', () => handleZoom(0.1));
    zoomOutBtn.addEventListener('click', () => handleZoom(-0.1));
    alignLeftBtn.addEventListener('click', () => handleAlign('left'));
    alignCenterBtn.addEventListener('click', () => handleAlign('center'));
    fractionBuilderBtn.addEventListener('click', handleFractionBuilder);
    matrixBuilderBtn.addEventListener('click', handleMatrixBuilder);
}

// Create stacked fraction from selected elements
function handleFractionBuilder() {
    if (state.selectedElements.size === 2) {
        // Use 2 selected elements as numerator and denominator
        const elements = Array.from(state.selectedElements).sort((a, b) => {
            const aTop = parseInt(a.style.top) || 0;
            const bTop = parseInt(b.style.top) || 0;
            return aTop - bTop; // Top one is numerator
        });

        const numerator = elements[0].textContent;
        const denominator = elements[1].textContent;

        // Calculate position
        const x = parseInt(elements[0].style.left) || 100;
        const y = (parseInt(elements[0].style.top) + parseInt(elements[1].style.top)) / 2 || 100;

        // Remove selected elements
        elements.forEach(el => el.remove());
        clearSelection();

        // Create fraction
        createFractionElement(numerator, denominator, x, y);
    } else {
        // Prompt for numerator and denominator
        const numerator = prompt('Enter numerator:', 'a');
        if (numerator === null) return;
        const denominator = prompt('Enter denominator:', 'b');
        if (denominator === null) return;

        // Get canvas center
        const rect = canvas.getBoundingClientRect();
        const x = (canvas.scrollLeft + rect.width / 2) - 20;
        const y = (canvas.scrollTop + rect.height / 2) - 20;

        createFractionElement(numerator, denominator, x, y);
    }
}

// Create fraction element
function createFractionElement(numerator, denominator, x, y) {
    const element = document.createElement('div');
    element.className = 'canvas-element';
    element.dataset.id = `element-${state.elementCounter++}`;
    element.dataset.type = 'fraction';
    element.draggable = true;

    // Create fraction HTML
    element.innerHTML = `
        <div class="fraction-element">
            <div class="fraction-numerator">${numerator}</div>
            <div class="fraction-line"></div>
            <div class="fraction-denominator">${denominator}</div>
        </div>
    `;

    element.style.left = `${x}px`;
    element.style.top = `${y}px`;

    // Add event listeners
    element.addEventListener('mousedown', handleElementMouseDown);
    element.addEventListener('dragstart', handleElementDragStart);
    element.addEventListener('dragend', handleElementDragEnd);
    element.addEventListener('click', handleElementClick);

    canvas.appendChild(element);
    canvas.classList.add('has-elements');
    element.style.animation = 'fadeIn 0.3s ease';

    saveState();
    showNotification('Fraction created!');
}

// Create matrix
function handleMatrixBuilder() {
    const rowsInput = prompt('Enter number of rows:', '2');
    if (rowsInput === null) return;
    const colsInput = prompt('Enter number of columns:', '2');
    if (colsInput === null) return;

    const rows = parseInt(rowsInput) || 2;
    const cols = parseInt(colsInput) || 2;

    // Prompt for each cell
    const cells = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            const value = prompt(`Enter value for cell [${r + 1},${c + 1}]:`, '0');
            if (value === null) return;
            row.push(value);
        }
        cells.push(row);
    }

    // Get canvas center
    const rect = canvas.getBoundingClientRect();
    const x = (canvas.scrollLeft + rect.width / 2) - 50;
    const y = (canvas.scrollTop + rect.height / 2) - 30;

    createMatrixElement(cells, x, y);
}

// Create matrix element
function createMatrixElement(cells, x, y) {
    const element = document.createElement('div');
    element.className = 'canvas-element';
    element.dataset.id = `element-${state.elementCounter++}`;
    element.dataset.type = 'matrix';
    element.draggable = true;

    const rows = cells.length;
    const cols = cells[0].length;

    // Create matrix HTML
    let cellsHtml = '';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            cellsHtml += `<div class="matrix-cell">${cells[r][c]}</div>`;
        }
    }

    element.innerHTML = `
        <div class="matrix-element">
            <span class="matrix-bracket">[</span>
            <div class="matrix-content" style="grid-template-columns: repeat(${cols}, 1fr);">
                ${cellsHtml}
            </div>
            <span class="matrix-bracket">]</span>
        </div>
    `;

    element.style.left = `${x}px`;
    element.style.top = `${y}px`;

    // Add event listeners
    element.addEventListener('mousedown', handleElementMouseDown);
    element.addEventListener('dragstart', handleElementDragStart);
    element.addEventListener('dragend', handleElementDragEnd);
    element.addEventListener('click', handleElementClick);

    canvas.appendChild(element);
    canvas.classList.add('has-elements');
    element.style.animation = 'fadeIn 0.3s ease';

    saveState();
    showNotification('Matrix created!');
}

// Copy expression to clipboard
function handleCopyExpression() {
    const elements = Array.from(canvas.querySelectorAll('.canvas-element')).sort((a, b) => {
        const aTop = parseInt(a.style.top) || 0;
        const bTop = parseInt(b.style.top) || 0;
        const aLeft = parseInt(a.style.left) || 0;
        const bLeft = parseInt(b.style.left) || 0;

        if (Math.abs(aTop - bTop) < 20) {
            return aLeft - bLeft;
        }
        return aTop - bTop;
    });

    const text = elements.map(el => el.textContent).join('');

    if (text) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Expression copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    } else {
        showNotification('No expression to copy');
    }
}

// Export canvas as image
function handleExportImage() {
    const elements = canvas.querySelectorAll('.canvas-element');
    if (elements.length === 0) {
        showNotification('No elements to export');
        return;
    }

    // Create a temporary canvas for rendering
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
        const left = parseInt(el.style.left) || 0;
        const top = parseInt(el.style.top) || 0;
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, left + el.offsetWidth);
        maxY = Math.max(maxY, top + el.offsetHeight);
    });

    const padding = 40;
    tempCanvas.width = maxX - minX + padding * 2;
    tempCanvas.height = maxY - minY + padding * 2;

    // Fill background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw elements
    ctx.font = '24px "Fira Code", monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.textBaseline = 'top';

    elements.forEach(el => {
        const left = (parseInt(el.style.left) || 0) - minX + padding;
        const top = (parseInt(el.style.top) || 0) - minY + padding;
        ctx.fillText(el.textContent, left, top);
    });

    // Download
    const link = document.createElement('a');
    link.download = 'math-expression.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();

    showNotification('Image exported!');
}

// Zoom canvas
function handleZoom(delta) {
    state.zoomLevel = Math.max(0.5, Math.min(2, state.zoomLevel + delta));
    canvas.style.transform = `scale(${state.zoomLevel})`;
    canvas.style.transformOrigin = 'top left';
    showNotification(`Zoom: ${Math.round(state.zoomLevel * 100)}%`);
}

// Align selected elements
function handleAlign(alignment) {
    if (state.selectedElements.size < 2) {
        showNotification('Select 2+ elements to align');
        return;
    }

    const elements = Array.from(state.selectedElements);

    if (alignment === 'left') {
        const minLeft = Math.min(...elements.map(el => parseInt(el.style.left) || 0));
        elements.forEach(el => {
            el.style.left = `${minLeft}px`;
        });
    } else if (alignment === 'center') {
        const avgLeft = elements.reduce((sum, el) => sum + (parseInt(el.style.left) || 0), 0) / elements.length;
        elements.forEach(el => {
            el.style.left = `${avgLeft}px`;
        });
    }

    saveState();
    showNotification(`Elements aligned ${alignment}`);
}

// Show notification toast
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

function handleClearCanvas() {
    if (confirm('Are you sure you want to clear the entire canvas?')) {
        const elements = canvas.querySelectorAll('.canvas-element');
        elements.forEach(element => {
            element.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => element.remove(), 300);
        });

        clearSelection();

        setTimeout(() => {
            if (canvas.querySelectorAll('.canvas-element').length === 0) {
                canvas.classList.remove('has-elements');
            }
            saveState(); // Save state after clearing
        }, 350);
    }
}

function deleteSelectedElements() {
    if (state.selectedElements.size === 0) return;

    state.selectedElements.forEach(element => {
        element.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => element.remove(), 300);
    });

    clearSelection();

    setTimeout(() => {
        if (canvas.querySelectorAll('.canvas-element').length === 0) {
            canvas.classList.remove('has-elements');
        }
        saveState(); // Save state after deletion
    }, 350);
}

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: scale(1);
        }
        to {
            opacity: 0;
            transform: scale(0.8);
        }
    }
`;
document.head.appendChild(style);

// ===== MULTI-SELECT WITH DRAG BOX =====
let selectionBox = null;
let selectionStart = null;
let isCreatingSelectionBox = false;

canvas.addEventListener('mousedown', (e) => {
    // Only create selection box if clicking directly on canvas (not on an element)
    if (e.target === canvas && !state.isShiftPressed) {
        isCreatingSelectionBox = true;
        const rect = canvas.getBoundingClientRect();
        selectionStart = {
            x: e.clientX - rect.left + canvas.scrollLeft,
            y: e.clientY - rect.top + canvas.scrollTop
        };

        selectionBox = document.createElement('div');
        selectionBox.className = 'selection-box';
        selectionBox.style.left = `${selectionStart.x}px`;
        selectionBox.style.top = `${selectionStart.y}px`;
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        canvas.appendChild(selectionBox);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (selectionBox && selectionStart && isCreatingSelectionBox) {
        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left + canvas.scrollLeft;
        const currentY = e.clientY - rect.top + canvas.scrollTop;

        const width = Math.abs(currentX - selectionStart.x);
        const height = Math.abs(currentY - selectionStart.y);
        const left = Math.min(currentX, selectionStart.x);
        const top = Math.min(currentY, selectionStart.y);

        selectionBox.style.width = `${width}px`;
        selectionBox.style.height = `${height}px`;
        selectionBox.style.left = `${left}px`;
        selectionBox.style.top = `${top}px`;
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (selectionBox && isCreatingSelectionBox) {
        // Get selection box bounds in canvas coordinates
        const boxLeft = parseInt(selectionBox.style.left);
        const boxTop = parseInt(selectionBox.style.top);
        const boxRight = boxLeft + parseInt(selectionBox.style.width);
        const boxBottom = boxTop + parseInt(selectionBox.style.height);

        // Find elements within selection box
        const elements = canvas.querySelectorAll('.canvas-element');

        if (!state.isShiftPressed) {
            clearSelection();
        }

        elements.forEach(element => {
            const elemLeft = parseInt(element.style.left) || 0;
            const elemTop = parseInt(element.style.top) || 0;
            const elemRight = elemLeft + element.offsetWidth;
            const elemBottom = elemTop + element.offsetHeight;

            // Check if element overlaps with selection box
            if (
                elemLeft < boxRight &&
                elemRight > boxLeft &&
                elemTop < boxBottom &&
                elemBottom > boxTop
            ) {
                selectElement(element);
            }
        });

        selectionBox.remove();
        selectionBox = null;
        selectionStart = null;
        isCreatingSelectionBox = false;
    }
});

// ===== VISUAL FEEDBACK =====
// Add ripple effect to buttons
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - button.offsetLeft - radius}px`;
    ripple.style.top = `${event.clientY - button.offsetTop - radius}px`;
    ripple.classList.add('ripple');

    const existingRipple = button.getElementsByClassName('ripple')[0];
    if (existingRipple) {
        existingRipple.remove();
    }

    button.appendChild(ripple);
}

const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    .action-button {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

document.querySelectorAll('.action-button').forEach(button => {
    button.addEventListener('click', createRipple);
});

// ===== INITIALIZE APP =====
init();
