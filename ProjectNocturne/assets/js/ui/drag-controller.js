"use strict";

import {
    deactivateModule,
    isModuleCurrentlyChanging
} from '../app/main.js';

// --- Estado y configuración del controlador de arrastre ---
let isDragging = false;
let startY = 0;
let currentY = 0;
let initialTransform = 0;
const dragThreshold = 0.5; // El menú debe ser arrastrado el 50% de su altura para cerrarse
let isEnabled = false;
let enableOpacityOnDrag = false;
let activeModule = null; // El contenedor principal del módulo activo
let activeMenu = null; // El menú específico que se está arrastrando
let dragHandleElement = null; // El elemento .drag-handle que inició el arrastre

/**
 * Función principal para inicializar el controlador de arrastre en dispositivos móviles.
 */
function initMobileDragController() {
    setupMobileClickListeners();
    setupResizeListener();
    // Decide si activar o no la funcionalidad de arrastre al cargar la página
    if (window.innerWidth <= 468) {
        enableDrag();
    }
}

/**
 * Configura los listeners para los eventos de arrastre (táctiles y de ratón).
 */
function setupDragListeners() {
    document.addEventListener('touchstart', handleDragStart, { passive: false });
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
    document.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
}

/**
 * Elimina los listeners para los eventos de arrastre.
 */
function removeDragListeners() {
    document.removeEventListener('touchstart', handleDragStart, { passive: false });
    document.removeEventListener('touchmove', handleDragMove, { passive: false });
    document.removeEventListener('touchend', handleDragEnd);
    document.removeEventListener('mousedown', handleDragStart);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
}

/**
 * Configura los listeners para cerrar los menús al hacer clic en el fondo oscuro.
 */
function setupMobileClickListeners() {
    const modulesToSetup = [
        { selector: '.module-control-center', name: 'controlCenter' },
        { selector: '.module-overlay', name: 'overlayContainer' },
        { selector: '.module-overlay-right', name: 'overlayContainerRight' }
    ];

    modulesToSetup.forEach(config => {
        const moduleElement = document.querySelector(config.selector);
        if (moduleElement) {
            moduleElement.addEventListener('click', function(e) {
                if (e.target === moduleElement) {
                    e.stopPropagation();
                    e.preventDefault();
                    if (isModuleCurrentlyChanging()) return;
                    deactivateModule(config.name, { source: 'mobile-background-click', withMobileAnimation: true });
                }
            }, true);
        }
    });

    const ringingModule = document.querySelector('.module-ringing-screen');
    if (ringingModule) {
        ringingModule.addEventListener('click', function(e) {
            if (e.target === ringingModule) {
                e.stopPropagation();
                e.preventDefault();
                if (isModuleCurrentlyChanging()) return;
                _deactivateRingingScreen(true);
            }
        });
    }
}

/**
 * Configura un listener para activar/desactivar la funcionalidad de arrastre
 * según el tamaño de la pantalla.
 */
function setupResizeListener() {
    window.addEventListener('resize', function() {
        const screenWidth = window.innerWidth;
        if (screenWidth > 468 && isEnabled) {
            disableDrag();
        } else if (screenWidth <= 468 && !isEnabled) {
            enableDrag();
        }
    });
}

/**
 * Maneja el inicio del arrastre. Identifica el módulo y el menú a arrastrar.
 * @param {Event} e - El evento de touchstart o mousedown.
 */
function handleDragStart(e) {
    if (!isEnabled) return;
    const dragTarget = e.target.closest('.drag-handle, .pill-container');
    if (!dragTarget) return;

    const moduleInfo = getModuleFromDragTarget(dragTarget);
    if (!moduleInfo || !moduleInfo.module.classList.contains('active') || !moduleInfo.menu) return;

    isDragging = true;
    activeModule = moduleInfo.module;
    activeMenu = moduleInfo.menu;
    dragHandleElement = dragTarget;

    startY = (e.type === 'touchstart') ? e.touches[0].clientY : e.clientY;

    const transform = window.getComputedStyle(activeMenu).transform;
    initialTransform = (transform !== 'none') ? new DOMMatrix(transform).m42 : 0;

    activeMenu.classList.add('dragging');
    activeMenu.addEventListener('touchmove', preventMenuScroll, { passive: false });
    e.preventDefault();
}

/**
 * Maneja el movimiento durante el arrastre, actualizando la posición del menú.
 * @param {Event} e - El evento de touchmove o mousemove.
 */
function handleDragMove(e) {
    if (!isDragging || !isEnabled || !activeMenu) return;

    currentY = (e.type === 'touchmove') ? e.touches[0].clientY : e.clientY;
    let deltaY = currentY - startY;

    if (deltaY < 0) deltaY = 0;

    const newTransform = initialTransform + deltaY;
    activeMenu.style.transform = `translateY(${newTransform}px)`;

    if (enableOpacityOnDrag) {
        const opacity = Math.max(0.3, 1 - (deltaY / (window.innerHeight * 0.4)));
        activeMenu.style.opacity = opacity;
    }
    e.preventDefault();
}

/**
 * Maneja el final del arrastre. Decide si cerrar el menú o devolverlo a su posición.
 * @param {Event} e - El evento de touchend o mouseup.
 */
function handleDragEnd(e) {
    if (!isDragging || !isEnabled || !activeMenu) return;

    const deltaY = currentY - startY;
    const menuHeight = activeMenu.offsetHeight;
    const threshold = menuHeight * dragThreshold;

    isDragging = false;
    activeMenu.classList.remove('dragging');
    activeMenu.removeEventListener('touchmove', preventMenuScroll);

    if (deltaY > threshold) {
        const moduleName = getModuleNameFromElement(activeModule);
        if (moduleName === 'ringingScreen') {
            _deactivateRingingScreen(true);
        } else if (moduleName) {
            deactivateModule(moduleName, { source: 'mobile-drag', withMobileAnimation: true });
        }
    } else {
        returnToOriginalPosition();
    }

    activeModule = null;
    activeMenu = null;
    dragHandleElement = null;
}

function _deactivateRingingScreen(withAnimation) {
    const ringingScreen = document.querySelector('.module-ringing-screen');
    const menu = ringingScreen?.querySelector('.menu-ringing');
    const restoreButton = document.querySelector('.ringing-restore-btn');
    const ringingToolsSize = window.ringingState?.tools.size || 0;

    if (!menu) return;

    const completeDeactivation = () => {
        menu.classList.remove('closing', 'slide-out-mobile', 'dragging');
        menu.removeAttribute('style');
        
        ringingScreen.classList.add('disabled');
        ringingScreen.classList.remove('active');
        
        if (restoreButton && ringingToolsSize > 0) {
            restoreButton.classList.add('active');
        }
        
        document.dispatchEvent(new CustomEvent('moduleDeactivated', { detail: { module: 'ringingScreen' } }));
    };

    if (withAnimation) {
        menu.classList.add('closing', 'slide-out-mobile');
        menu.addEventListener('transitionend', completeDeactivation, { once: true });
    } else {
        completeDeactivation();
    }
}


function preventMenuScroll(e) {
    if (isDragging) {
        e.preventDefault();
    }
}

function returnToOriginalPosition() {
    if (!activeMenu) return;
    const menuElement = activeMenu;

    let transitionStyle = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    if (enableOpacityOnDrag) {
        transitionStyle += ', opacity 0.3s ease';
    }
    menuElement.style.transition = transitionStyle;
    menuElement.style.transform = 'translateY(0)';
    if (enableOpacityOnDrag) {
        menuElement.style.opacity = '1';
    }

    menuElement.addEventListener('transitionend', function handler() {
        menuElement.removeAttribute('style');
        menuElement.removeEventListener('transitionend', handler);
    }, { once: true });
}

function getModuleFromDragTarget(dragTarget) {
    const controlCenterModule = dragTarget.closest('.module-control-center');
    if (controlCenterModule) {
        return {
            module: controlCenterModule,
            menu: controlCenterModule.querySelector('.menu-control-center.active'),
            type: 'controlCenter'
        };
    }

    const overlayModule = dragTarget.closest('.module-overlay');
    if (overlayModule) {
        return {
            module: overlayModule,
            menu: overlayModule.querySelector('.menu-component.active'),
            type: 'overlay'
        };
    }

    const overlayRightModule = dragTarget.closest('.module-overlay-right');
    if (overlayRightModule) {
        return {
            module: overlayRightModule,
            menu: overlayRightModule.querySelector('.menu-notifications'),
            type: 'overlayRight'
        };
    }

    const ringingModule = dragTarget.closest('.module-ringing-screen');
    if (ringingModule) {
        return {
            module: ringingModule,
            menu: ringingModule.querySelector('.menu-ringing'),
            type: 'ringing'
        };
    }

    return null;
}

function getModuleNameFromElement(moduleElement) {
    if (moduleElement.classList.contains('module-control-center')) return 'controlCenter';
    if (moduleElement.classList.contains('module-overlay')) return 'overlayContainer';
    if (moduleElement.classList.contains('module-overlay-right')) return 'overlayContainerRight';
    if (moduleElement.classList.contains('module-ringing-screen')) return 'ringingScreen';
    return null;
}


function enableDrag() {
    if (window.innerWidth <= 468 && !isEnabled) {
        setupDragListeners();
        isEnabled = true;
        document.querySelectorAll('.drag-handle').forEach(h => h.style.cursor = 'grab');
    }
}

function disableDrag() {
    removeDragListeners();
    isEnabled = false;
    isDragging = false;
    document.querySelectorAll('.drag-handle').forEach(h => h.style.cursor = '');
    resetAllMenuStyles();
    activeModule = null;
    activeMenu = null;
    dragHandleElement = null;
}

function resetAllMenuStyles() {
    document.querySelectorAll('.menu-component, .menu-control-center, .menu-ringing')
        .forEach(menu => {
            menu.classList.remove('closing', 'dragging', 'slide-out-mobile');
            menu.removeAttribute('style');
        });
}


function isDragEnabled() {
    return isEnabled;
}

function setDragThreshold(newThreshold) {
    if (newThreshold >= 0 && newThreshold <= 1) {
        dragThreshold = newThreshold;
    }
}

function getDragThreshold() {
    return dragThreshold;
}

function setOpacityOnDrag(enabled) {
    enableOpacityOnDrag = !!enabled;
}

function getOpacityOnDrag() {
    return enableOpacityOnDrag;
}

function forceCloseDrag() {
    if (isDragging && activeModule) {
        isDragging = false;
        const moduleName = getModuleNameFromElement(activeModule);
        if (moduleName) {
            deactivateModule(moduleName, { source: 'force-close-drag', withMobileAnimation: false });
        }
        activeModule = null;
        activeMenu = null;
        dragHandleElement = null;
    }
}

export {
    initMobileDragController,
    enableDrag,
    disableDrag,
    isDragEnabled,
    setDragThreshold,
    getDragThreshold,
    setOpacityOnDrag,
    getOpacityOnDrag,
    forceCloseDrag
};