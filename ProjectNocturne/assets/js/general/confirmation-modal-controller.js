import { getTranslation } from './translations-controller.js';

let modalElement = null;
let titleElement = null;
let messageElement = null;
let nameElement = null;
let cancelButton = null;
let confirmButton = null;
let onConfirmCallback = null;

const typeToTranslationKey = {
    'alarm': 'alarms',
    'timer': 'timer',
    'world-clock': 'world_clock',
    'audio': 'sounds'
};

export function initConfirmationModal() {
    if (modalElement) return;

    const modalHTML = `
        <div class="menu-delete">
            <h1></h1>
            <span><strong class="item-name"></strong></span>
            <div class="menu-delete-btns">
                <button class="cancel-btn body-title"></button>
                <button class="confirm-btn body-title"></button>
            </div>
        </div>
    `;

    modalElement = document.createElement('div');
    modalElement.className = 'module-overlay confirmation-overlay disabled';
    modalElement.innerHTML = modalHTML;
    document.body.appendChild(modalElement);

    titleElement = modalElement.querySelector('h1');
    messageElement = modalElement.querySelector('span');
    nameElement = modalElement.querySelector('.item-name');
    cancelButton = modalElement.querySelector('.cancel-btn');
    confirmButton = modalElement.querySelector('.confirm-btn');

    cancelButton.addEventListener('click', hideConfirmation);
    confirmButton.addEventListener('click', () => {
        if (typeof onConfirmCallback === 'function') {
            onConfirmCallback();
        }
        hideConfirmation();
    });

    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) {
            hideConfirmation();
        }
    });

    console.log('✅ Confirmation Modal Initialized');
}

export function showConfirmation(type, name, onConfirm) {
    if (!modalElement) initConfirmationModal();

    const category = typeToTranslationKey[type] || 'general';
    const titleText = getTranslation(`confirm_delete_title_${type}`, 'confirmation') || `¿Quieres eliminar ${type}?`;
    const messageText = getTranslation(`confirm_delete_message_${type}`, 'confirmation') || 'Estás a punto de eliminar {name} de tu almacenamiento. No podrás deshacer la acción.';

    titleElement.textContent = titleText;
    messageElement.innerHTML = messageText.replace('{name}', `<strong>${name}</strong>`);
    
    cancelButton.textContent = getTranslation('cancel', 'confirmation') || 'Cancelar';
    confirmButton.textContent = getTranslation('delete', 'confirmation') || 'Eliminar';


    onConfirmCallback = onConfirm;

    modalElement.classList.remove('disabled');
    modalElement.classList.add('active');
}

function hideConfirmation() {
    if (!modalElement) return;
    modalElement.classList.remove('active');
    modalElement.classList.add('disabled');
    onConfirmCallback = null;
}