// jorgeortega-ux/projectnocturne-alpha/ProjectNocturne-Alpha-26af6d6a92240876cabfeecbd77228e34952e560/ProjectNocturne/assets/js/features/general-tools.js
import { getTranslation } from '../core/translations-controller.js';
import { showModal } from '../ui/menu-interactions.js';
import { showSimpleNotification } from '../ui/notification-controller.js';

const DB_NAME = 'ProjectNocturneDB';
const DB_VERSION = 1;
const AUDIO_STORE_NAME = 'user_audio_store';
const SOUNDS_SECTIONS_STORAGE_KEY = 'collapsed-sound-sections';

let db = null;
let dbPromise = null;

let isCachePopulated = false;
let userAudiosCache = [];
let audioCachePromise = null;
let collapsedSoundSections = new Set();

function openDB() {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const tempDb = event.target.result;
            if (!tempDb.objectStoreNames.contains(AUDIO_STORE_NAME)) {
                tempDb.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            dbPromise = null;
            console.error('Error opening IndexedDB:', event.target.error);
            reject('Error opening IndexedDB');
        };
    });

    return dbPromise;
}

function initDB() {
    return openDB();
}

async function saveAudioToDB(id, name, fileBlob) {
    const db = await openDB();
    const transaction = db.transaction(AUDIO_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(AUDIO_STORE_NAME);

    return new Promise((resolve, reject) => {
        const audioRecord = { id, name, file: fileBlob };
        const request = store.put(audioRecord);

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error('Error saving audio to DB:', event.target.error);
            reject('Error saving audio');
        };
    });
}

async function getAllAudiosFromDB() {
    const db = await openDB();
    const transaction = db.transaction(AUDIO_STORE_NAME, 'readonly');
    const store = transaction.objectStore(AUDIO_STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result || []);
        request.onerror = (event) => {
            console.error('Error fetching audios from DB:', event.target.error);
            reject('Error fetching audios');
        };
    });
}

async function deleteAudioFromDB(id) {
    const db = await openDB();
    const transaction = db.transaction(AUDIO_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(AUDIO_STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error('Error deleting audio from DB:', event.target.error);
            reject('Error deleting audio');
        };
    });
}

async function populateAudioCache() {
    if (isCachePopulated) return;
    if (audioCachePromise) return audioCachePromise;

    audioCachePromise = (async () => {
        try {
            userAudiosCache = await getAllAudiosFromDB();
            isCachePopulated = true;
        } catch (error) {
            console.error('Failed to populate audio cache:', error);
            isCachePopulated = false;
        } finally {
            audioCachePromise = null;
        }
    })();

    return audioCachePromise;
}

function startAudioCachePreload() {
    populateAudioCache();
}

async function saveUserAudio(name, fileBlob) {
    const newAudio = {
        id: `user_audio_${Date.now()}`,
        name: name,
        file: fileBlob,
        icon: 'music_note'
    };
    await saveAudioToDB(newAudio.id, newAudio.name, newAudio.file);
    userAudiosCache.push(newAudio);
    return newAudio;
}

async function deleteUserAudio(audioId, callback) {
    const audioToDelete = userAudiosCache.find(audio => audio.id === audioId);
    if (!audioToDelete) return;

    showModal('confirmation', { type: 'audio', name: audioToDelete.name }, async () => {
        await deleteAudioFromDB(audioId);
        userAudiosCache = userAudiosCache.filter(audio => audio.id !== audioId);
        replaceDeletedAudioInTools(audioId, 'classic_beep');

        showSimpleNotification('success', 'audio_deleted', 'notifications', { name: audioToDelete.name });

        if (typeof callback === 'function') {
            callback();
        }
    });
}

function replaceDeletedAudioInTools(deletedAudioId, defaultSoundId) {
    if (window.alarmManager && typeof window.alarmManager.getAllAlarms === 'function') {
        const { userAlarms, defaultAlarms } = window.alarmManager.getAllAlarms();
        let changed = false;
        [...userAlarms, ...defaultAlarms].forEach(alarm => {
            if (alarm.sound === deletedAudioId) {
                alarm.sound = defaultSoundId;
                changed = true;
            }
        });
        if (changed) {
            window.alarmManager.saveAllAlarms();
            window.alarmManager.renderAllAlarmCards();
        }
    }
    if (window.timerManager && typeof window.timerManager.getAllTimers === 'function') {
        const { userTimers, defaultTimers } = window.timerManager.getAllTimers();
        let changed = false;
        [...userTimers, ...defaultTimers].forEach(timer => {
            if (timer.sound === deletedAudioId) {
                timer.sound = defaultSoundId;
                changed = true;
            }
        });
        if (changed) {
            window.timerManager.saveAllTimers();
            window.timerManager.renderAllTimerCards();
        }
    }
}
const SOUND_PATTERNS = {
    'celestial_harp': { frequencies: [783, 987, 1318], beepDuration: 500, pauseDuration: 500, type: 'triangle' },
    'classic_beep': { frequencies: [900], beepDuration: 150, pauseDuration: 150, type: 'square' },
    'cosmic_synth': { frequencies: [220, 440, 660, 880, 660, 440, 220], beepDuration: 120, pauseDuration: 120, type: 'sine' },
    'crystal_clear': { frequencies: [4000], beepDuration: 100, pauseDuration: 350, type: 'sine' },
    'digital_alarm': { frequencies: [1500, 1000], beepDuration: 100, pauseDuration: 100, type: 'sawtooth' },
    'echo_chime': { frequencies: [880, 1046], beepDuration: 300, pauseDuration: 700, type: 'sine' },
    'electric_pulse': { frequencies: [400, 800], beepDuration: 80, pauseDuration: 180, type: 'square' },
    'fast_beeps': { frequencies: [1200, 1200, 1200], beepDuration: 60, pauseDuration: 60, type: 'square' },
    'gentle_chime': { frequencies: [523, 659, 783], beepDuration: 400, pauseDuration: 600, type: 'sine' },
    'morning_dew': { frequencies: [659, 880, 1046], beepDuration: 350, pauseDuration: 450, type: 'sine' },
    'peaceful_tone': { frequencies: [440, 587, 659], beepDuration: 500, pauseDuration: 700, type: 'triangle' },
    'sci_fi_alarm': { frequencies: [1000, 2000], beepDuration: 150, pauseDuration: 150, type: 'triangle' },
    'sonar_ping': { frequencies: [1200], beepDuration: 150, pauseDuration: 850, type: 'sine' },
    'urgent_beep': { frequencies: [1800, 1800], beepDuration: 80, pauseDuration: 80, type: 'sawtooth' },
    'woodpecker': { frequencies: [2000, 2000, 2000], beepDuration: 40, pauseDuration: 90, type: 'sawtooth' }
};
function getAvailableSounds() {
    const defaultSounds = [
        { id: 'celestial_harp', nameKey: 'celestial_harp', icon: 'filter_vintage' },
        { id: 'classic_beep', nameKey: 'classic_beep', icon: 'volume_up' },
        { id: 'cosmic_synth', nameKey: 'cosmic_synth', icon: 'auto_awesome' },
        { id: 'crystal_clear', nameKey: 'crystal_clear', icon: 'diamond' },
        { id: 'digital_alarm', nameKey: 'digital_alarm', icon: 'alarm' },
        { id: 'echo_chime', nameKey: 'echo_chime', icon: 'graphic_eq' },
        { id: 'electric_pulse', nameKey: 'electric_pulse', icon: 'flash_on' },
        { id: 'fast_beeps', nameKey: 'fast_beeps', icon: 'fast_forward' },
        { id: 'gentle_chime', nameKey: 'gentle_chime', icon: 'notifications' },
        { id: 'morning_dew', nameKey: 'morning_dew', icon: 'wb_sunny' },
        { id: 'peaceful_tone', nameKey: 'peaceful_tone', icon: 'self_care' },
        { id: 'sci_fi_alarm', nameKey: 'sci_fi_alarm', icon: 'smart_toy' },
        { id: 'sonar_ping', nameKey: 'sonar_ping', icon: 'radar' },
        { id: 'urgent_beep', nameKey: 'urgent_beep', icon: 'priority_high' },
        { id: 'woodpecker', nameKey: 'woodpecker', icon: 'animation' }
    ];
    const customAudios = userAudiosCache.map(audio => ({
        id: audio.id,
        nameKey: audio.name,
        isCustom: true,
        icon: 'music_note',
        file: audio.file
    }));
    return [...defaultSounds, ...customAudios];
}

function getSoundNameById(soundId) {
    const sound = getAvailableSounds().find(s => s.id === soundId);
    if (!sound) {
        return getTranslation('classic_beep', 'sounds');
    }
    return sound.isCustom ? sound.nameKey : getTranslation(sound.nameKey, 'sounds');
}

let audioContext = null;
const activeSounds = new Map();

function initializeAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error('AudioContext is not supported.', e);
            return false;
        }
    }
    return true;
}

function isSoundPlaying(toolId = 'global') {
    return activeSounds.has(toolId);
}

async function playSound(soundId, toolId = 'global') {
    if (!initializeAudioContext()) return;

    stopSound(toolId);

    const allSounds = getAvailableSounds();
    const soundToPlay = allSounds.find(s => s.id === soundId);

    if (soundToPlay && soundToPlay.isCustom) {
        try {
            const audioURL = URL.createObjectURL(soundToPlay.file);
            const audio = new Audio(audioURL);
            audio.loop = true;
            audio.play();
            activeSounds.set(toolId, { type: 'file', element: audio, url: audioURL });
        } catch (error) {
            console.error('Error playing custom audio:', error);
        }
        return;
    }

    const pattern = SOUND_PATTERNS[soundId] || SOUND_PATTERNS['classic_beep'];
    let freqIndex = 0;

    const sourceInfo = {
        intervalId: null,
        type: 'pattern',
        oscillators: new Set()
    };

    const playBeep = () => {
        if (!activeSounds.has(toolId)) {
            if (sourceInfo.intervalId) clearInterval(sourceInfo.intervalId);
            return;
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        const freq = pattern.frequencies[freqIndex % pattern.frequencies.length];
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = pattern.type;
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + (pattern.beepDuration / 1000));

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + (pattern.beepDuration / 1000));
        freqIndex++;
    };

    playBeep();
    sourceInfo.intervalId = setInterval(playBeep, pattern.beepDuration + pattern.pauseDuration);
    activeSounds.set(toolId, sourceInfo);
}

function stopSound(toolId = 'global') {
    const source = activeSounds.get(toolId);
    if (source) {
        if (source.type === 'pattern' && source.intervalId) {
            clearInterval(source.intervalId);
        } else if (source.type === 'file' && source.element) {
            source.element.pause();
            source.element.currentTime = 0;
            URL.revokeObjectURL(source.url);
        }
        activeSounds.delete(toolId);
    }
}

function loadCollapsedSoundSections() {
    const stored = localStorage.getItem(SOUNDS_SECTIONS_STORAGE_KEY);
    if (stored) {
        try {
            collapsedSoundSections = new Set(JSON.parse(stored));
        } catch (e) {
            collapsedSoundSections = new Set();
        }
    }
}

function saveCollapsedSoundSections() {
    localStorage.setItem(SOUNDS_SECTIONS_STORAGE_KEY, JSON.stringify([...collapsedSoundSections]));
}

function toggleSoundSection(sectionId, headerElement) {
    const content = headerElement.nextElementSibling;
    if (!content || !content.classList.contains('sounds-list-content')) return;

    const toggleBtn = headerElement.querySelector('.collapse-btn');
    const isExpanding = !toggleBtn.classList.contains('expanded');

    content.classList.toggle('active', isExpanding);
    content.classList.toggle('disabled', !isExpanding);
    toggleBtn.classList.toggle('expanded', isExpanding);
    
    if (isExpanding) {
        collapsedSoundSections.delete(sectionId);
    } else {
        collapsedSoundSections.add(sectionId);
    }
    saveCollapsedSoundSections();
}

async function generateSoundList(uploadElement, listElement, actionName, activeSoundId = null) {
    await populateAudioCache();
    loadCollapsedSoundSections();

    if (!listElement) {
        return;
    }

    listElement.innerHTML = '';

    const createSection = (sectionId, titleKey, icon, sounds, isCustom) => {
        const isCollapsed = collapsedSoundSections.has(sectionId);

        const header = document.createElement('div');
        header.className = 'menu-content-header';
        header.innerHTML = `
            <div class="menu-content-header-primary">
                <span class="material-symbols-rounded">${icon}</span>
                <span data-translate="${titleKey}" data-translate-category="sounds">${getTranslation(titleKey, 'sounds')}</span>
            </div>
            <div class="menu-content-header-secondary">
                <button class="collapse-btn ${isCollapsed ? '' : 'expanded'}">
                    <span class="material-symbols-rounded expand-icon">expand_more</span>
                </button>
            </div>
        `;

        const listContent = document.createElement('div');
        listContent.className = `menu-list sounds-list-content ${isCollapsed ? 'disabled' : 'active'}`;
        
        sounds.forEach(sound => {
            const menuLink = createSoundMenuItem(sound, actionName, activeSoundId, isCustom);
            listContent.appendChild(menuLink);
        });
        
        // CORRECCIÓN APLICADA AQUÍ
        // El evento de clic ahora solo se asigna al botón de expandir/contraer.
        const collapseButton = header.querySelector('.collapse-btn');
        if (collapseButton) {
            collapseButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita que el clic se propague a elementos padres.
                toggleSoundSection(sectionId, header);
            });
        }

        listElement.appendChild(header);
        listElement.appendChild(listContent);
    };

    const availableSounds = getAvailableSounds();
    const defaultSounds = availableSounds.filter(s => !s.isCustom);
    const userAudios = availableSounds.filter(s => s.isCustom);

    if (defaultSounds.length > 0) {
        createSection('default_audios', 'default_audios', 'volume_up', defaultSounds, false);
    }

    if (userAudios.length > 0) {
        createSection('uploaded_audios', 'uploaded_audios', 'music_note', userAudios, true);
    }
}
function createSoundMenuItem(sound, actionName, activeSoundId, isCustom) {
    const menuLink = document.createElement('div');
    menuLink.className = 'menu-link';
    menuLink.dataset.soundId = sound.id;
    menuLink.dataset.action = actionName;

    if (sound.id === activeSoundId) {
        menuLink.classList.add('active');
    }

    const soundName = isCustom ? sound.nameKey : getTranslation(sound.nameKey, 'sounds');
    const translationAttrs = isCustom ? '' : `data-translate="${sound.nameKey}" data-translate-category="sounds"`;

    menuLink.innerHTML = `
        <div class="menu-link-icon"><span class="material-symbols-rounded">${sound.icon}</span></div>
        <div class="menu-link-text"><span ${translationAttrs}>${soundName}</span></div>
    `;

    const menuContainer = document.createElement('div');
    menuContainer.className = 'card-menu-container disabled';

    if (isCustom) {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'card-action-btn';
        deleteButton.dataset.action = 'delete-user-audio';
        deleteButton.innerHTML = `<span class="material-symbols-rounded">delete</span>`;
        menuContainer.appendChild(deleteButton);
    }

    const testButton = document.createElement('button');
    testButton.className = 'card-action-btn sound-test-btn';
    testButton.dataset.action = 'test-sound';
    const isThisSoundPlaying = (window.getCurrentlyPlayingSoundId && window.getCurrentlyPlayingSoundId() === sound.id);
    testButton.innerHTML = `<span class="material-symbols-rounded">${isThisSoundPlaying ? 'stop' : 'play_arrow'}</span>`;
    menuContainer.appendChild(testButton);

    menuLink.appendChild(menuContainer);

    menuLink.addEventListener('mouseenter', () => {
        menuContainer.classList.remove('disabled');
        menuLink.dataset.hovering = 'true';
    });

    menuLink.addEventListener('mouseleave', () => {
        delete menuLink.dataset.hovering;
        const isCurrentlyPlaying = (window.getCurrentlyPlayingSoundId && window.getCurrentlyPlayingSoundId() === sound.id);
        if (!isCurrentlyPlaying) {
            menuContainer.classList.add('disabled');
        }
    });

    return menuLink;
}

async function handleAudioUpload(callback) {
    await populateAudioCache();
    const uploadLimit = 10;
    const singleFileSizeLimit = 1024 * 1024 * 1024;
    const maxSizeInMB = '1 GB';

    if (userAudiosCache.length >= uploadLimit) {
        const messageKey = 'limit_reached_message_premium';
        showSimpleNotification(
            'error',
            'limit_reached_title',
            messageKey,
            'notifications',
            { type: getTranslation('audio_singular', 'sounds') }
        );
        return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('audio/')) {
            showSimpleNotification('error', 'invalid_file_type_title', 'invalid_file_type_message', 'notifications');
            return;
        }

        if (file.size > singleFileSizeLimit) {
            showSimpleNotification('error', 'file_too_large_title', 'file_too_large_message', 'notifications', { maxSize: maxSizeInMB });
            return;
        }

        try {
            const newAudio = await saveUserAudio(file.name, file);
            if (callback && typeof callback === 'function') {
                callback(newAudio);
            }
        } catch (error) {
            console.error('Error handling audio upload:', error);
        }
    };
    fileInput.click();
}

function createExpandableToolContainer({ type, titleKey, translationCategory, icon, containerClass, badgeClass, gridAttribute, toggleFunction }) {
    const container = document.createElement('div');
    container.className = containerClass;
    container.dataset.container = type;

    container.innerHTML = `
        <div class="expandable-card-header">
            <div class="expandable-card-header-left">
                <div class="expandable-card-header-icon">
                    <span class="material-symbols-rounded">${icon}</span>
                </div>
                <div class="expandable-card-header-title">
                    <h3 data-translate="${titleKey}" data-translate-category="${translationCategory}">${getTranslation(titleKey, translationCategory)}</h3>
                </div>
            </div>
            <div class="expandable-card-header-right">
                <span class="${badgeClass}" data-count-for="${type}">0</span>
                <button class="expandable-card-toggle-btn">
                    <span class="material-symbols-rounded expand-icon">expand_more</span>
                </button>
            </div>
        </div>
        <div class="tool-grid" ${gridAttribute}="${type}"></div>
    `;

    const header = container.querySelector('.expandable-card-header');
    if (header) {
        header.addEventListener('click', (e) => {
            // Ahora cualquier clic en el header activará la función
            toggleFunction(type);
        });
    }

    return container;
}

function initializeCategorySliderService() {
    const config = {
        enableService: true,
        enableButtons: true,
        scrollStep: 200,
        containerSelector: '.tool-options-wrapper',
        wrapperSelector: '.section-top',
        pointerOnly: true
    };
    if (!config.enableService) return;
    if (config.pointerOnly && !window.matchMedia('(pointer: fine)').matches) return;
    const wrappers = document.querySelectorAll(config.wrapperSelector);
    if (!wrappers.length) return;
    function createScrollButton(dir, container, wrapper) {
        const btn = document.createElement('button');
        btn.className = `scroll-btn scroll-btn-${dir}`;
        btn.setAttribute('aria-label', `Scroll ${dir}`);
        btn.innerHTML = dir === 'left'
            ? '<span class="material-symbols-rounded">arrow_left</span>'
            : '<span class="material-symbols-rounded">arrow_right</span>';
        btn.addEventListener('click', function handleScrollButtonClick() {
            container.scrollBy({
                left: (dir === 'left' ? -1 : 1) * config.scrollStep,
                behavior: 'smooth'
            });
        });
        return btn;
    }
    function updateScrollButtons(container, wrapper, buttons) {
        if (!config.enableButtons) {
            buttons.left?.remove();
            buttons.right?.remove();
            buttons.left = buttons.right = null;
            return;
        }
        const canScroll = container.scrollWidth > container.clientWidth;
        if (!canScroll) {
            buttons.left?.remove();
            buttons.right?.remove();
            buttons.left = buttons.right = null;
            return;
        }
        const scrollLeft = container.scrollLeft;
        const scrollWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;
        const roundedScrollLeft = Math.round(scrollLeft);
        if (roundedScrollLeft > 0) {
            if (!buttons.left) {
                buttons.left = createScrollButton('left', container, wrapper);
                wrapper.append(buttons.left);
            }
        } else {
            buttons.left?.remove();
            buttons.left = null;
        }
        if (roundedScrollLeft + clientWidth < scrollWidth) {
            if (!buttons.right) {
                buttons.right = createScrollButton('right', container, wrapper);
                wrapper.append(buttons.right);
            }
        } else {
            buttons.right?.remove();
            buttons.right = null;
        }
    }
    function setupDragScrollBehavior(container) {
        let isDragging = false, startX = 0, scrollStart = 0;
        function handleMouseDown(e) {
            if (container.scrollWidth <= container.clientWidth) return;
            isDragging = true;
            startX = e.pageX - container.offsetLeft;
            scrollStart = container.scrollLeft;
            container.classList.add('dragging');
        }
        function handleMouseUpOrLeave() {
            isDragging = false;
            container.classList.remove('dragging');
        }
        function handleMouseMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            container.scrollLeft = scrollStart - (x - startX);
        }
        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mouseup', handleMouseUpOrLeave);
        container.addEventListener('mouseleave', handleMouseUpOrLeave);
        container.addEventListener('mousemove', handleMouseMove);
    }
    function initializeWrappers() {
        wrappers.forEach(function processWrapper(wrapper) {
            const container = wrapper.querySelector(config.containerSelector);
            if (!container) return;
            const buttons = { left: null, right: null };
            setupDragScrollBehavior(container);
            function updateButtonsForThisWrapper() {
                updateScrollButtons(container, wrapper, buttons);
            }
            container.addEventListener('scroll', updateButtonsForThisWrapper);
            new ResizeObserver(function handleResize() {
                updateButtonsForThisWrapper();
            }).observe(container);
            requestAnimationFrame(updateButtonsForThisWrapper);
        });
    }
    function handleWindowResize() {
        wrappers.forEach(function processWrapperOnResize(wrapper) {
            const container = wrapper.querySelector(config.containerSelector);
            if (container) {
                requestAnimationFrame(function updateButtonsOnResize() {
                    const buttons = {
                        left: wrapper.querySelector('.scroll-btn-left'),
                        right: wrapper.querySelector('.scroll-btn-right')
                    };
                    updateScrollButtons(container, wrapper, buttons);
                });
            }
        });
    }
    function handleWindowLoad() {
        requestAnimationFrame(function updateButtonsOnLoad() {
            wrappers.forEach(function processWrapperOnLoad(wrapper) {
                const container = wrapper.querySelector(config.containerSelector);
                if (container) {
                    const buttons = {
                        left: wrapper.querySelector('.scroll-btn-left'),
                        right: wrapper.querySelector('.scroll-btn-right')
                    };
                    updateScrollButtons(container, wrapper, buttons);
                }
            });
        });
    }
    initializeWrappers();
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('load', handleWindowLoad);
}

function initializeCentralizedFontManager() {
    const sections = ['alarm', 'timer', 'stopwatch', 'worldClock'];
    const clockContainers = {};
    const clockElements = {};
    const decreaseButtons = {};
    const increaseButtons = {};
    const fontSizeDisplays = {};
    let resizeObservers = [];
    let globalScaleFactor = 1.0;
    let isInitialized = false;
    const STORAGE_KEY = 'clockFontScale_global';
    const FONT_SIZE_RATIO = 8;
    const MIN_FONT_SIZE_RATIO = 16;
    const ABSOLUTE_MIN_PX = 8;
    const PIXEL_INCREMENT = 2;
    const autoIncrementState = {
        isActive: false,
        intervalId: null,
        direction: null,
        initialDelay: 500,
        repeatInterval: 150,
        currentButton: null,
        currentSection: null
    };
    function initializeFontManager() {
        setupFontManager();
    }
    function setupFontManager() {
        if (isInitialized) return;
        findFontElements();
        const hasElements = Object.keys(clockElements).length > 0;
        if (!hasElements) {
            setTimeout(setupFontManager, 1000);
            return;
        }
        loadFontScalesFromStorage();
        setupFontEventListeners();
        setupFontResizeObservers();
        adjustAndApplyFontSizeToAllSections();
        isInitialized = true;
    }
    function findFontElements() {
        sections.forEach(function processSectionElements(sectionName) {
            const section = document.querySelector(`[data-section="${sectionName}"]`);
            if (!section) return;
            const clockContainer = section.querySelector('.tool-content');
            const clockElement = section.querySelector(`.tool-${sectionName} span`);
            const decreaseBtn = section.querySelector('.increse-font-zise-left');
            const increaseBtn = section.querySelector('.increse-font-zise-right');
            const fontSizeDisplay = section.querySelector('.increse-font-zise-center');
            if (clockContainer && clockElement && decreaseBtn && increaseBtn && fontSizeDisplay) {
                clockContainers[sectionName] = clockContainer;
                clockElements[sectionName] = clockElement;
                decreaseButtons[sectionName] = decreaseBtn;
                increaseButtons[sectionName] = increaseBtn;
                fontSizeDisplays[sectionName] = fontSizeDisplay;
            }
        });
    }
    function loadFontScalesFromStorage() {
        const savedScale = localStorage.getItem(STORAGE_KEY);
        if (savedScale && !isNaN(parseFloat(savedScale))) {
            globalScaleFactor = Math.max(0.2, Math.min(3.0, parseFloat(savedScale)));
        } else {
            globalScaleFactor = 1.0;
        }
    }

    function saveFontScaleToStorage() {
        localStorage.setItem(STORAGE_KEY, globalScaleFactor.toString());
    }
    function startAutoIncrement(direction, button, sectionName) {
        stopAutoIncrement();
        autoIncrementState.isActive = true;
        autoIncrementState.direction = direction;
        autoIncrementState.currentButton = button;
        autoIncrementState.currentSection = sectionName;
        button.classList.add('auto-incrementing');
        autoIncrementState.intervalId = setTimeout(function startRepeating() {
            autoIncrementState.intervalId = setInterval(function performAutoIncrement() {
                let success = false;
                if (autoIncrementState.direction === 'increase') {
                    success = increaseFontSizeForSection(autoIncrementState.currentSection);
                } else if (autoIncrementState.direction === 'decrease') {
                    success = decreaseFontSizeForSection(autoIncrementState.currentSection);
                }
                if (!success) {
                    stopAutoIncrement();
                }
            }, autoIncrementState.repeatInterval);
        }, autoIncrementState.initialDelay);
    }
    function stopAutoIncrement() {
        if (autoIncrementState.intervalId) {
            clearTimeout(autoIncrementState.intervalId);
            clearInterval(autoIncrementState.intervalId);
            autoIncrementState.intervalId = null;
        }
        if (autoIncrementState.currentButton) {
            autoIncrementState.currentButton.classList.remove('auto-incrementing');
        }
        autoIncrementState.isActive = false;
        autoIncrementState.direction = null;
        autoIncrementState.currentButton = null;
        autoIncrementState.currentSection = null;
    }
    function setupFontEventListeners() {
        sections.forEach(function setupSectionListeners(sectionName) {
            if (increaseButtons[sectionName]) {
                const increaseBtn = increaseButtons[sectionName];
                increaseBtn.addEventListener('click', function handleIncreaseFontSize(e) {
                    if (!autoIncrementState.isActive) {
                        increaseFontSizeForSection(sectionName);
                    }
                });
                increaseBtn.addEventListener('mousedown', function handleIncreaseMouseDown(e) {
                    e.preventDefault();
                    startAutoIncrement('increase', increaseBtn, sectionName);
                });
                increaseBtn.addEventListener('mouseup', stopAutoIncrement);
                increaseBtn.addEventListener('mouseleave', stopAutoIncrement);
                increaseBtn.addEventListener('touchstart', function handleIncreaseTouchStart(e) {
                    e.preventDefault();
                    startAutoIncrement('increase', increaseBtn, sectionName);
                });
                increaseBtn.addEventListener('touchend', stopAutoIncrement);
                increaseBtn.addEventListener('touchcancel', stopAutoIncrement);
            }
            if (decreaseButtons[sectionName]) {
                const decreaseBtn = decreaseButtons[sectionName];
                decreaseBtn.addEventListener('click', function handleDecreaseFontSize(e) {
                    if (!autoIncrementState.isActive) {
                        decreaseFontSizeForSection(sectionName);
                    }
                });
                decreaseBtn.addEventListener('mousedown', function handleDecreaseMouseDown(e) {
                    e.preventDefault();
                    startAutoIncrement('decrease', decreaseBtn, sectionName);
                });
                decreaseBtn.addEventListener('mouseup', stopAutoIncrement);
                decreaseBtn.addEventListener('mouseleave', stopAutoIncrement);
                decreaseBtn.addEventListener('touchstart', function handleDecreaseTouchStart(e) {
                    e.preventDefault();
                    startAutoIncrement('decrease', decreaseBtn, sectionName);
                });
                decreaseBtn.addEventListener('touchend', stopAutoIncrement);
                decreaseBtn.addEventListener('touchcancel', stopAutoIncrement);
            }
        });
        document.addEventListener('mouseup', function handleGlobalMouseUp() {
            if (autoIncrementState.isActive) {
                stopAutoIncrement();
            }
        });
        window.addEventListener('blur', function handleWindowBlur() {
            if (autoIncrementState.isActive) {
                stopAutoIncrement();
            }
        });
    }
    function setupFontResizeObservers() {
        sections.forEach(function setupSectionObserver(sectionName) {
            if (clockContainers[sectionName]) {
                const observer = new ResizeObserver(function handleContainerResize() {
                    adjustAndApplyFontSizeToSection(sectionName);
                });
                observer.observe(clockContainers[sectionName]);
                resizeObservers.push(observer);
            }
        });
    }
    function roundToEvenNumber(number) {
        const rounded = Math.round(number);
        return rounded % 2 === 0 ? rounded : rounded + 1;
    }
    function calculateBaseFontSize(containerWidth) {
        const baseSize = containerWidth / FONT_SIZE_RATIO;
        return roundToEvenNumber(baseSize);
    }
    function getMinFontSize(sectionName) {
        const container = clockContainers[sectionName];
        if (!container || !container.offsetWidth) {
            return ABSOLUTE_MIN_PX;
        }
        const minSize = container.offsetWidth / MIN_FONT_SIZE_RATIO;
        return Math.max(ABSOLUTE_MIN_PX, roundToEvenNumber(minSize));
    }
    function getCurrentActualFontSize(sectionName) {
        if (!sectionName || !clockContainers[sectionName]) {
            return 0;
        }
        const baseSize = calculateBaseFontSize(clockContainers[sectionName].offsetWidth);
        const calculatedSize = baseSize * globalScaleFactor;
        return roundToEvenNumber(calculatedSize);
    }
    function checkIfWouldOverflowWithPixelSize(sectionName, targetPixelSize) {
        const container = clockContainers[sectionName];
        const element = clockElements[sectionName];
        if (!container || !element) return true;
        const currentSize = element.style.fontSize;
        element.style.fontSize = targetPixelSize + 'px';
        const overflows = element.scrollWidth > container.offsetWidth;
        element.style.fontSize = currentSize;
        return overflows;
    }
    function adjustAndApplyFontSizeToSection(sectionName) {
        const container = clockContainers[sectionName];
        const element = clockElements[sectionName];
        const display = fontSizeDisplays[sectionName];
        if (!container || !element || !display) return;

        if (container.offsetWidth === 0) {
            return;
        }

        const baseSize = calculateBaseFontSize(container.offsetWidth);
        if (baseSize === 0) return;

        // Primero, aplicamos el tamaño de fuente según el factor de escala global
        const calculatedSize = baseSize * globalScaleFactor;
        const finalSize = roundToEvenNumber(calculatedSize);
        element.style.fontSize = finalSize + 'px';
        display.textContent = finalSize + ' px';

        // --- LÓGICA DE ROBUSTEZ GLOBAL ---
        // Inmediatamente después de aplicar el tamaño, verificamos si hay desbordamiento.
        // Esto se encarga tanto del reajuste por resize/zoom como por cambio de contenido.
        const fitText = () => {
            if (element.scrollWidth > container.offsetWidth) {
                // La función 'decreaseFontSize' ya es específica de la sección
                const success = decreaseFontSizeForSection(sectionName);
                if (success) {
                    // Si se pudo reducir, vuelve a comprobar en el siguiente fotograma
                    requestAnimationFrame(fitText);
                }
            }
        };
        // Iniciamos la comprobación de seguridad.
        fitText();
        // --- FIN DE LA LÓGICA ---

        // Finalmente, actualizamos el estado de los botones.
        updateFontButtonStatesForSection(sectionName);
    }
    function adjustAndApplyFontSizeToAllSections() {
        sections.forEach(function adjustEachSection(sectionName) {
            if (clockContainers[sectionName]) {
                adjustAndApplyFontSizeToSection(sectionName);
            }
        });
    }
    function updateFontButtonStatesForSection(sectionName) {
        const currentSize = getCurrentActualFontSize(sectionName);
        const minSize = getMinFontSize(sectionName);
        const canDecrease = currentSize > minSize;
        const canIncrease = !checkIfWouldOverflowWithPixelSize(sectionName, currentSize + PIXEL_INCREMENT);
        const decreaseBtn = decreaseButtons[sectionName];
        const increaseBtn = increaseButtons[sectionName];
        if (decreaseBtn) {
            if (canDecrease) {
                decreaseBtn.classList.remove('disabled-interactive');
            } else {
                decreaseBtn.classList.add('disabled-interactive');
            }
        }
        if (increaseBtn) {
            if (canIncrease) {
                increaseBtn.classList.remove('disabled-interactive');
            } else {
                increaseBtn.classList.add('disabled-interactive');
            }
        }
    }
    function increaseFontSizeForSection(sectionName) {
        const currentSize = getCurrentActualFontSize(sectionName);
        const targetSize = currentSize + PIXEL_INCREMENT;
        const wouldOverflow = sections.some(function (section) {
            return clockContainers[section] &&
                checkIfWouldOverflowWithPixelSize(section, targetSize);
        });
        if (!wouldOverflow) {
            const container = clockContainers[sectionName];
            if (container) {
                const baseSize = calculateBaseFontSize(container.offsetWidth);
                if (baseSize > 0) {
                    globalScaleFactor = targetSize / baseSize;
                    adjustAndApplyFontSizeToAllSections();
                    saveFontScaleToStorage();
                    return true;
                }
            }
        }
        return false;
    }
    function decreaseFontSizeForSection(sectionName) {
        const currentSize = getCurrentActualFontSize(sectionName);
        const minSize = getMinFontSize(sectionName);
        const targetSize = Math.max(minSize, currentSize - PIXEL_INCREMENT);

        if (targetSize < currentSize) {
            const container = clockContainers[sectionName];
            if (container) {
                const baseSize = calculateBaseFontSize(container.offsetWidth);
                if (baseSize > 0) {
                    globalScaleFactor = targetSize / baseSize;
                    adjustAndApplyFontSizeToAllSections();
                    saveFontScaleToStorage();
                    return true;
                }
            }
        }
        return false;
    }
    function increaseFontSize() {
        const firstSection = Object.keys(clockElements)[0];
        if (firstSection) {
            return increaseFontSizeForSection(firstSection);
        }
        return false;
    }
    function decreaseFontSize(sectionName) {
        // Si se especifica una sección, la usamos. Si no, usamos la primera como antes.
        const targetSection = sectionName || Object.keys(clockElements)[0];
        if (targetSection) {
            return decreaseFontSizeForSection(targetSection);
        }
        return false;
    }
    function setFontScaleForSection(sectionName, scale) {
        if (typeof scale !== 'number' || scale < 0.2) return false;
        const wouldOverflow = sections.some(function (section) {
            const container = clockContainers[section];
            if (!container) return false;
            const baseSize = calculateBaseFontSize(container.offsetWidth);
            const testSize = roundToEvenNumber(baseSize * scale);
            return checkIfWouldOverflowWithPixelSize(section, testSize);
        });
        if (!wouldOverflow) {
            globalScaleFactor = scale;
            adjustAndApplyFontSizeToAllSections();
            saveFontScaleToStorage();
            return true;
        }
        return false;
    }
    function resetFontSizeForAllSections() {
        globalScaleFactor = 1.0;
        adjustAndApplyFontSizeToAllSections();
        saveFontScaleToStorage();
    }
    function getCurrentFontScale() {
        return globalScaleFactor;
    }
    function getCurrentActualFontSizePublic(sectionName) {
        if (!sectionName) {
            const firstSection = Object.keys(clockElements)[0];
            if (firstSection) {
                return getCurrentActualFontSize(firstSection);
            }
            return 0;
        }
        return getCurrentActualFontSize(sectionName);
    }
    function getFontManagerStatus() {
        return {
            initialized: isInitialized,
            globalScaleFactor: globalScaleFactor,
            pixelIncrement: PIXEL_INCREMENT,
            autoIncrement: {
                isActive: autoIncrementState.isActive,
                direction: autoIncrementState.direction,
                currentSection: autoIncrementState.currentSection,
                initialDelay: autoIncrementState.initialDelay,
                repeatInterval: autoIncrementState.repeatInterval
            },
            elements: {
                containers: Object.keys(clockContainers),
                elements: Object.keys(clockElements),
                decreaseButtons: Object.keys(decreaseButtons),
                increaseButtons: Object.keys(increaseButtons),
                displays: Object.keys(fontSizeDisplays)
            },
            observers: resizeObservers.length
        };
    }
    function destroyFontManager() {
        stopAutoIncrement();
        resizeObservers.forEach(function disconnectObserver(observer) {
            observer.disconnect();
        });
        resizeObservers = [];
        isInitialized = false;
    }
    const publicFontAPI = {
        increaseFontSizeForSection: increaseFontSizeForSection,
        decreaseFontSizeForSection: decreaseFontSizeForSection,
        setFontScaleForSection: setFontScaleForSection,
        resetFontSizeForAllSections: resetFontSizeForAllSections,
        getCurrentFontScaleForSection: getCurrentFontScale,
        getCurrentActualSizeForSection: getCurrentActualFontSizePublic,
        increaseFontSize: increaseFontSize,
        decreaseFontSize: decreaseFontSize,
        resetFontSize: resetFontSizeForAllSections,
        getCurrentScale: getCurrentFontScale,
        getCurrentActualSize: getCurrentActualFontSizePublic,
        adjustAndApplyFontSizeToAll: adjustAndApplyFontSizeToAllSections,
        adjustAndApplyFontSizeToSection: adjustAndApplyFontSizeToSection,

        // --- FUNCIÓN NUEVA Y CLAVE ---
        ensureTextFits: function (sectionName) {
            if (!isInitialized || !sectionName) return;

            // Usamos requestAnimationFrame para asegurar que el DOM se haya actualizado
            requestAnimationFrame(() => {
                const element = clockElements[sectionName];
                const container = clockContainers[sectionName];

                if (!element || !container) return;

                // Función recursiva que se ejecuta hasta que el texto quepa
                const fitText = () => {
                    if (element.scrollWidth > container.offsetWidth) {
                        // Llama a la versión interna y específica de decreaseFontSize
                        const success = decreaseFontSize(sectionName);
                        if (success) {
                            // Si se pudo reducir, vuelve a comprobar
                            requestAnimationFrame(fitText);
                        }
                    }
                };
                fitText();
            });
        },

        updateAllButtonStates: function () {
            sections.forEach(function updateSection(sectionName) {
                if (clockContainers[sectionName]) {
                    updateFontButtonStatesForSection(sectionName);
                }
            });
        },
        startAutoIncrement: startAutoIncrement,
        stopAutoIncrement: stopAutoIncrement,
        setAutoIncrementSettings: function (initialDelay, repeatInterval) {
            if (typeof initialDelay === 'number' && initialDelay > 0) {
                autoIncrementState.initialDelay = initialDelay;
            }
            if (typeof repeatInterval === 'number' && repeatInterval > 0) {
                autoIncrementState.repeatInterval = repeatInterval;
            }
        },
        getStatus: getFontManagerStatus,
        destroy: destroyFontManager,
        debugInfo: function () {
            console.log('Font Manager Debug Info:', getFontManagerStatus());
        }
    };
    window.centralizedFontManager = publicFontAPI;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = publicFontAPI;
    }
    initializeFontManager();
}

function initializeTextStyleManager() {
    const textStyleState = {
        isBold: false,
        isItalic: false,
        sections: ['alarm', 'timer', 'stopwatch', 'worldClock'],
        boldButtonSelector: '[data-action="toggleBoldMode"]',
        italicButtonSelector: '[data-action="toggleItalicMode"]',
        toolDivSelectors: {
            'alarm': '.tool-alarm',
            'timer': '.tool-timer',
            'stopwatch': '.tool-stopwatch',
            'worldClock': '.tool-worldClock'
        },
        localStorageKeys: {
            bold: 'textStyle_isBold',
            italic: 'textStyle_isItalic'
        },
        isInitialized: false,
        _attachedListeners: new WeakSet()
    };
    if (textStyleState.isInitialized) return;
    loadTextStylesFromStorage();
    attachTextStyleEventListeners();
    applyTextStylesToAllSections();
    updateTextButtonStates();
    document.addEventListener('sectionChanged', handleSectionChangeForTextStyles);
    const observer = new MutationObserver((mutationsList) => {
        let relevantChange = false;
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && (
                mutation.addedNodes.length > 0 &&
                Array.from(mutation.addedNodes).some(node => node.nodeType === Node.ELEMENT_NODE && (
                    node.matches(textStyleState.boldButtonSelector) ||
                    node.matches(textStyleState.italicButtonSelector) ||
                    node.matches('.section-alarm') || node.matches('.section-timer') ||
                    node.matches('.section-stopwatch') || node.matches('.section-worldClock') ||
                    node.querySelector(textStyleState.boldButtonSelector) ||
                    node.querySelector(textStyleState.italicButtonSelector) ||
                    node.querySelector('.section-alarm') || node.querySelector('.section-timer') ||
                    node.querySelector('.section-stopwatch') || node.querySelector('.section-worldClock')
                ))
            )) {
                relevantChange = true;
                break;
            }
        }
        if (relevantChange) {
            clearTimeout(textStyleState._refreshTimeout);
            textStyleState._refreshTimeout = setTimeout(() => {
                attachTextStyleEventListeners();
                applyTextStylesToAllSections();
                updateTextButtonStates();
            }, 50);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    textStyleState.isInitialized = true;
    function loadTextStylesFromStorage() {
        textStyleState.isBold = localStorage.getItem(textStyleState.localStorageKeys.bold) === 'true';
        textStyleState.isItalic = localStorage.getItem(textStyleState.localStorageKeys.italic) === 'true';
    }
    function saveTextStylesToStorage() {
        localStorage.setItem(textStyleState.localStorageKeys.bold, textStyleState.isBold);
        localStorage.setItem(textStyleState.localStorageKeys.italic, textStyleState.isItalic);
    }
    function attachTextStyleEventListeners() {
        const boldButtons = document.querySelectorAll(textStyleState.boldButtonSelector);
        const italicButtons = document.querySelectorAll(textStyleState.italicButtonSelector);
        boldButtons.forEach(button => {
            if (!textStyleState._attachedListeners.has(button)) {
                button.addEventListener('click', toggleBoldMode);
                textStyleState._attachedListeners.add(button);
            }
        });
        italicButtons.forEach(button => {
            if (!textStyleState._attachedListeners.has(button)) {
                button.addEventListener('click', toggleItalicMode);
                textStyleState._attachedListeners.add(button);
            }
        });
    }
    function handleSectionChangeForTextStyles() {
        applyTextStylesToAllSections();
        updateTextButtonStates();
    }
    function toggleBoldMode(event) {
        event.preventDefault();
        textStyleState.isBold = !textStyleState.isBold;
        applyTextStylesToAllSections();
        updateTextButtonStates();
        saveTextStylesToStorage();
        dispatchTextStyleChangeEvent();
    }
    function toggleItalicMode(event) {
        event.preventDefault();
        textStyleState.isItalic = !textStyleState.isItalic;
        applyTextStylesToAllSections();
        updateTextButtonStates();
        saveTextStylesToStorage();
        dispatchTextStyleChangeEvent();
    }
    function applyTextStylesToAllSections() {
        textStyleState.sections.forEach(sectionName => {
            const toolDiv = document.querySelector(textStyleState.toolDivSelectors[sectionName]);
            if (toolDiv) {
                if (textStyleState.isBold) {
                    toolDiv.classList.add('bold-mode');
                } else {
                    toolDiv.classList.remove('bold-mode');
                }
                if (textStyleState.isItalic) {
                    toolDiv.classList.add('italic-mode');
                } else {
                    toolDiv.classList.remove('italic-mode');
                }
            }
        });
    }
    function updateTextButtonStates() {
        const boldButtons = document.querySelectorAll(textStyleState.boldButtonSelector);
        const italicButtons = document.querySelectorAll(textStyleState.italicButtonSelector);
        boldButtons.forEach(button => {
            if (textStyleState.isBold) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        italicButtons.forEach(button => {
            if (textStyleState.isItalic) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    function dispatchTextStyleChangeEvent() {
        const event = new CustomEvent('textStyleChanged', {
            detail: {
                isBold: textStyleState.isBold,
                isItalic: textStyleState.isItalic
            }
        });
        document.dispatchEvent(event);
    }
}

function initializeScrollShadow() {
    const menus = document.querySelectorAll('[data-menu]');
    const generalContent = document.querySelector('.general-content');

    const setupScrollShadow = (topContainer, scrollableContainer) => {
        if (topContainer && scrollableContainer) {
            const handleScroll = () => {
                if (scrollableContainer.scrollTop > 0) {
                    topContainer.classList.add('shadow');
                } else {
                    topContainer.classList.remove('shadow');
                }
            };
            scrollableContainer.removeEventListener('scroll', handleScroll);
            scrollableContainer.addEventListener('scroll', handleScroll);
        }
    };

    menus.forEach(menu => {
        const topContainer = menu.querySelector('.menu-section-top, .menu-header');
        const scrollableContainer = menu.querySelector('.overflow-y');
        setupScrollShadow(topContainer, scrollableContainer);
    });

    if (generalContent) {
        const topContainer = generalContent.querySelector('.general-content-top');
        const scrollableContainer = generalContent.querySelector('.scrollable-content');
        setupScrollShadow(topContainer, scrollableContainer);
    }
}

function initializeFullScreenManager() {
    if (!document.documentElement.requestFullscreen) {
        document.querySelectorAll('[data-action="toggleFullScreen"]').forEach(button => {
            button.style.display = 'none';
        });
        return;
    }
    document.addEventListener('click', function (event) {
        const fullScreenButton = event.target.closest('[data-action="toggleFullScreen"]');
        if (!fullScreenButton) return;
        event.preventDefault();
        const section = fullScreenButton.closest('.section-alarm, .section-timer, .section-stopwatch, .section-worldClock');
        if (!section) {
            return;
        }
        const sectionCenter = section.querySelector('.section-center');
        if (!sectionCenter) {
            return;
        }
        toggleFullScreen(sectionCenter);
    });
    function toggleFullScreen(element) {
        if (!document.fullscreenElement) {
            element.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    document.addEventListener('fullscreenchange', () => {
        const fullscreenElement = document.fullscreenElement;
        const isInFullScreen = !!fullscreenElement;
        const allButtons = document.querySelectorAll('[data-action="toggleFullScreen"]');
        allButtons.forEach(button => {
            const icon = button.querySelector('.material-symbols-rounded');
            if (!icon) return;
            const section = button.closest('.section-alarm, .section-timer, .section-stopwatch, .section-worldClock');
            const sectionCenter = section ? section.querySelector('.section-center') : null;
            if (fullscreenElement && sectionCenter === fullscreenElement) {
                icon.textContent = 'fullscreen_exit';
            } else {
                icon.textContent = 'fullscreen';
            }
        });
    });
}

function handleCardMenuToggle(button) {
    const card = button.closest('.tool-card, .search-result-item');
    if (!card) return;

    const dropdown = card.querySelector('.card-dropdown-menu');
    if (!dropdown) return;

    if (dropdown.popperInstance) {
        dropdown.popperInstance.destroy();
        dropdown.popperInstance = null;
        dropdown.classList.add('disabled');
        // --- INICIO DE LA CORRECCIÓN ---
        // Elimina el atributo de estilo para un reseteo completo
        dropdown.removeAttribute('style'); 
        // --- FIN DE LA CORRECCIÓN ---
        return;
    }

    document.querySelectorAll('.card-dropdown-menu').forEach(menu => {
        if (menu.popperInstance) {
            menu.popperInstance.destroy();
            menu.popperInstance = null;
        }
        menu.classList.add('disabled');
        // --- INICIO DE LA CORRECCIÓN ---
        // Asegura que todas las demás instancias también se limpien por completo
        menu.removeAttribute('style'); 
        // --- FIN DE LA CORRECCIÓN ---
        const parentContainer = menu.closest('.card-menu-container');
        if (parentContainer) {
            parentContainer.classList.add('disabled');
        }
    });

    dropdown.classList.remove('disabled');

    const popperReference = button.closest('.card-menu-container');
    if (popperReference) {
        popperReference.classList.remove('disabled');
    }

    const popperInstance = Popper.createPopper(popperReference, dropdown, {
        placement: 'bottom-end',
        modifiers: [
            { name: 'offset', options: { offset: [0, 8] } },
            {
                name: 'flip',
                options: {
                    fallbackPlacements: ['right-end', 'left-end', 'top-end'],
                },
            },
            { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } }
        ]
    });

    dropdown.popperInstance = popperInstance;
}
function initializeCardEventListeners() {
    const mainContainer = document.querySelector('.general-content-scrolleable');
    if (!mainContainer) return;

    mainContainer.addEventListener('click', (e) => {
        const actionTarget = e.target.closest('[data-action]');

        // Lógica para cerrar menús desplegables al hacer clic fuera
        if (!actionTarget || !actionTarget.closest('.card-menu-container')) {
            document.querySelectorAll('.card-dropdown-menu').forEach(menu => {
                if (menu.popperInstance) {
                    menu.popperInstance.destroy();
                    menu.popperInstance = null;
                }
                menu.classList.add('disabled');
                // --- INICIO DE LA CORRECCIÓN ---
                menu.removeAttribute('style'); // Limpieza del atributo style
                // --- FIN DE LA CORRECCIÓN ---
                const parentContainer = menu.closest('.card-menu-container');
                if (parentContainer) {
                    parentContainer.classList.add('disabled');
                }
            });
        }

        if (!actionTarget) return;

        const cardOrItem = actionTarget.closest('.tool-card, .search-result-item');
        let cardType = null;
        if (cardOrItem) {
            if (cardOrItem.classList.contains('alarm-card') || cardOrItem.dataset.type === 'alarm') {
                cardType = 'alarm';
            } else if (cardOrItem.classList.contains('timer-card') || cardOrItem.dataset.type === 'timer') {
                cardType = 'timer';
            } else if (cardOrItem.classList.contains('world-clock-card') || cardOrItem.dataset.type === 'world-clock') {
                cardType = 'world-clock';
            }
        }

        // Lógica de seguridad centralizada
        if (actionTarget.classList.contains('disabled-interactive')) {
            let isRinging = false;
            if (cardType === 'alarm' && window.alarmManager && typeof window.alarmManager.isAnyAlarmRinging === 'function') {
                isRinging = window.alarmManager.isAnyAlarmRinging();
            } else if (cardType === 'timer' && window.timerManager && typeof window.timerManager.isAnyTimerRinging === 'function') {
                isRinging = window.timerManager.isAnyTimerRinging();
            }

            if (isRinging) {
                showDynamicIslandNotification('error', 'action_not_allowed_while_ringing', 'notifications');
            }
            e.stopPropagation();
            return;
        }

        const cardId = cardOrItem?.dataset.id;
        const action = actionTarget.dataset.action;

        if (action === 'toggle-card-menu') {
            e.stopPropagation();
            handleCardMenuToggle(actionTarget);
            return;
        }

        if (cardType && cardId) {
            switch (cardType) {
                case 'alarm':
                    handleAlarmCardAction(action, cardId, actionTarget);
                    break;
                case 'timer':
                    handleTimerCardAction(action, cardId, actionTarget);
                    break;
                case 'world-clock':
                    handleWorldClockCardAction(action, cardId, actionTarget);
                    break;
            }

            // --- INICIO DE LA CORRECCIÓN ---
            if (cardOrItem) {
                const dropdown = cardOrItem.querySelector('.card-dropdown-menu');
                if (dropdown) {
                    if (dropdown.popperInstance) {
                        dropdown.popperInstance.destroy();
                        dropdown.popperInstance = null;
                    }
                    dropdown.classList.add('disabled');
                    dropdown.removeAttribute('style'); // Limpieza del atributo style
                }
            }
            // --- FIN DE LA CORRECCIÓN ---
        }
    });

    mainContainer.addEventListener('mouseover', (e) => {
        const card = e.target.closest('.tool-card');
        if (card) {
            const menuContainer = card.querySelector('.card-menu-container');
            if (menuContainer) menuContainer.classList.remove('disabled');
        }
    });

    mainContainer.addEventListener('mouseout', (e) => {
        const card = e.target.closest('.tool-card');
        if (card) {
            const dropdown = card.querySelector('.card-dropdown-menu');
            if (dropdown && dropdown.popperInstance) return;
            const menuContainer = card.querySelector('.card-menu-container');
            if (menuContainer && !menuContainer.contains(e.relatedTarget)) {
                menuContainer.classList.add('disabled');
            }
        }
    });
}

function handleAlarmCardAction(action, alarmId, target) {
    if (!window.alarmManager) {
        return;
    }

    // --- LÓGICA DE SEGURIDAD MEJORADA ---
    const isRinging = window.alarmManager.isAnyAlarmRinging && window.alarmManager.isAnyAlarmRinging();
    const alarm = window.alarmManager.findAlarmById(alarmId);

    // Permitir solo la acción de descartar si esta alarma específica está sonando
    if (isRinging) {
        if (!alarm || !alarm.isRinging || action !== 'dismiss-alarm') {
            showSimpleNotification('error', 'action_not_allowed_while_ringing', 'notifications');
            return;
        }
    }
    // --- FIN DE LA LÓGICA DE SEGURIDAD ---

    switch (action) {
        case 'toggle-alarm':
            window.alarmManager.toggleAlarm(alarmId);
            break;
        case 'test-alarm':
            window.alarmManager.testAlarm(alarmId);
            break;
        case 'edit-alarm':
            window.alarmManager.handleEditAlarm(alarmId);
            break;
        case 'delete-alarm':
            window.alarmManager.handleDeleteAlarm(alarmId);
            break;
        case 'dismiss-alarm':
            window.alarmManager.dismissAlarm(alarmId);
            break;
    }
}

function handleTimerCardAction(action, timerId, target) {
    if (!window.timerManager) {
        return;
    }

    // --- LÓGICA DE SEGURIDAD MEJORADA ---
    const isRinging = window.timerManager.isAnyTimerRinging && window.timerManager.isAnyTimerRinging();
    const timer = window.timerManager.findTimerById(timerId);

    // Permitir solo la acción de descartar si este temporizador específico está sonando
    if (isRinging) {
        if (!timer || !timer.isRinging || action !== 'dismiss-timer') {
            showSimpleNotification('error', 'action_not_allowed_while_ringing', 'notifications');
            return;
        }
    }
    // --- FIN DE LA LÓGICA DE SEGURIDAD ---

    switch (action) {
        case 'pin-timer':
            window.timerManager.handlePinTimer(timerId);
            break;
        case 'start-card-timer':
            window.timerManager.startTimer(timerId);
            break;
        case 'pause-card-timer':
            window.timerManager.pauseTimer(timerId);
            break;
        case 'reset-card-timer':
            window.timerManager.resetTimer(timerId);
            break;
        case 'edit-timer':
            window.timerManager.handleEditTimer(timerId);
            break;
        case 'delete-timer':
            window.timerManager.handleDeleteTimer(timerId);
            break;
        case 'dismiss-timer':
            window.timerManager.dismissTimer(timerId);
            break;
    }
}

function handleWorldClockCardAction(action, clockId, target) {
    if (!window.worldClockManager) {
        return;
    }

    switch (action) {
        case 'pin-clock':
            window.worldClockManager.pinClock(target);
            break;
        case 'edit-clock':
            window.worldClockManager.handleEditClock(clockId);
            break;
        case 'delete-clock':
            window.worldClockManager.handleDeleteClock(clockId);
            break;
    }
}

function createToolCard(data) {
    const card = document.createElement('div');
    card.className = `tool-card ${data.cardClass}`;
    card.id = data.id;
    card.dataset.id = data.id;
    if (data.type) {
        card.dataset.type = data.type;
    }

    if (data.isFinished) {
        card.classList.add('timer-finished');
    }
    if (data.isDisabled) {
        card.classList.add('alarm-disabled');
    }

    const tagsHTML = data.tags.map(tag => {
        const classList = ['card-tag'];
        if (tag.className) {
            classList.push(tag.className);
        }
        const soundIdAttr = tag.soundId ? `data-sound-id="${tag.soundId}"` : '';
        return `<span class="${classList.join(' ')}" ${soundIdAttr}>${tag.text}</span>`;
    }).join('');

    const menuItemsHTML = data.menuItems.map(item => `
        <div class="menu-link ${item.disabled ? 'disabled-interactive' : ''}" data-action="${item.action}">
            <div class="menu-link-icon"><span class="material-symbols-rounded">${item.icon}</span></div>
            <div class="menu-link-text"><span data-translate="${item.textKey}" data-translate-category="${item.textCategory}">${getTranslation(item.textKey, item.textCategory)}</span></div>
        </div>
    `).join('');

    const actionButtonsHTML = (data.actionButtons || []).map(btn => `
        <button class="card-action-btn ${btn.active ? 'active' : ''}" data-action="${btn.action}" data-translate="${btn.tooltipKey}" data-translate-category="tooltips" data-translate-target="tooltip">
            <span class="material-symbols-rounded">${btn.icon}</span>
        </button>
    `).join('');

    card.innerHTML = `
        <div class="card-header">
            <div class="card-details">
                <span class="card-title">${data.title}</span>
                <span class="card-value">${data.value}</span>
            </div>
        </div>
        <div class="card-footer">
            <div class="card-tags">${tagsHTML}</div>
        </div>
        <div class="card-options-container">
            <button class="card-dismiss-btn" data-type="${data.cardType}" data-action="${data.dismissAction}">
                <span data-translate="dismiss" data-translate-category="alarms">${getTranslation('dismiss', 'alarms')}</span>
            </button>
        </div>
        <div class="card-menu-container disabled">
            ${actionButtonsHTML}
            <button class="card-action-btn" data-action="toggle-card-menu" data-translate="options" data-translate-category="world_clock_options" data-translate-target="tooltip">
                <span class="material-symbols-rounded">more_horiz</span>
            </button>
            <div class="card-dropdown-menu disabled body-title">
                ${menuItemsHTML}
            </div>
        </div>
    `;

    const dismissButton = card.querySelector('[data-action="dismiss-alarm"], [data-action="dismiss-timer"]');
    if (dismissButton) {
        dismissButton.addEventListener('click', () => {
            if (data.cardType === 'alarm' && window.alarmManager) {
                window.alarmManager.dismissAlarm(data.id);
            } else if (data.cardType === 'timer' && window.timerManager) {
                window.timerManager.dismissTimer(data.id);
            }
        });
    }

    return card;
}

export {
    initDB,
    startAudioCachePreload,
    playSound,
    stopSound,
    generateSoundList,
    handleAudioUpload,
    createExpandableToolContainer,
    initializeCategorySliderService,
    initializeCentralizedFontManager,
    initializeTextStyleManager,
    initializeScrollShadow,
    initializeFullScreenManager,
    initializeCardEventListeners,
    handleAlarmCardAction,
    handleTimerCardAction,
    handleWorldClockCardAction,
    createToolCard,
    deleteUserAudio,
    getSoundNameById,
    getAvailableSounds,
    isSoundPlaying
};