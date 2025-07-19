import { attachTooltipsToNewElements } from './tooltip-controller.js';

const COLOR_SEARCH_CONFIG = {
    searchInput: '.menu-component[data-menu="paletteColors"] .search-content-text input',
    mainColorsWrapper: '[data-colors-wrapper="main"]',
    searchColorsWrapper: '[data-colors-wrapper="search"]',
    maxResultsPerSection: 18,
    debounceDelay: 300
};

const COLOR_DATABASES = {
    'en-us': {
        'red': { hex: '#ff0000', key: 'base_red' },
        'green': { hex: '#00ff00', key: 'base_green' },
        'blue': { hex: '#0000ff', key: 'base_blue' },
        'yellow': { hex: '#ffff00', key: 'base_yellow' },
        'orange': { hex: '#ffa500', key: 'base_orange' },
        'purple': { hex: '#800080', key: 'base_purple' },
        'violet': { hex: '#8a2be2', key: 'base_violet' },
        'pink': { hex: '#ffc0cb', key: 'base_pink' },
        'black': { hex: '#000000', key: 'base_black' },
        'white': { hex: '#ffffff', key: 'base_white' },
        'gray': { hex: '#808080', key: 'base_gray' },
        'brown': { hex: '#a52a2a', key: 'base_brown' },
        'turquoise': { hex: '#40e0d0', key: 'base_turquoise' },
        'cyan': { hex: '#00ffff', key: 'base_cyan' },
        'magenta': { hex: '#ff00ff', key: 'base_magenta' },
        'lime': { hex: '#00ff00', key: 'base_lime' },
        'olive': { hex: '#808000', key: 'base_olive' },
        'navy': { hex: '#000080', key: 'base_navy' },
        'maroon': { hex: '#800000', key: 'base_maroon' },
        'silver': { hex: '#c0c0c0', key: 'base_silver' },
        'gold': { hex: '#ffd700', key: 'base_gold' },
        'coral': { hex: '#ff7f50', key: 'base_coral' },
        'salmon': { hex: '#fa8072', key: 'base_salmon' },
        'aqua': { hex: '#00ffff', key: 'base_aqua' },
        'beige': { hex: '#f5f5dc', key: 'base_beige' },
        'cream': { hex: '#fffdd0', key: 'base_cream' },
        'lavender': { hex: '#e6e6fa', key: 'base_lavender' },
        'mint': { hex: '#98fb98', key: 'base_mint' },
        'peach': { hex: '#ffcba4', key: 'base_peach' },
        'indigo': { hex: '#4b0082', key: 'base_indigo' },
        'cerulean': { hex: '#007ba7', key: 'base_cerulean' },
        'emerald': { hex: '#50c878', key: 'base_emerald' },
        'jade': { hex: '#00a86b', key: 'base_jade' },
        'teal': { hex: '#008080', key: 'base_teal' },
        'aquamarine': { hex: '#7fffd4', key: 'base_aquamarine' },
        'chartreuse': { hex: '#7fff00', key: 'base_chartreuse' },
        'vermilion': { hex: '#e34234', key: 'base_vermilion' },
        'amber': { hex: '#ffbf00', key: 'base_amber' },
        'sienna': { hex: '#a0522d', key: 'base_sienna' }
    },
    'es-mx': {
        'rojo': { hex: '#ff0000', key: 'base_red' },
        'verde': { hex: '#00ff00', key: 'base_green' },
        'azul': { hex: '#0000ff', key: 'base_blue' },
        'amarillo': { hex: '#ffff00', key: 'base_yellow' },
        'naranja': { hex: '#ffa500', key: 'base_orange' },
        'púrpura': { hex: '#800080', key: 'base_purple' },
        'violeta': { hex: '#8a2be2', key: 'base_violet' },
        'rosa': { hex: '#ffc0cb', key: 'base_pink' },
        'negro': { hex: '#000000', key: 'base_black' },
        'blanco': { hex: '#ffffff', key: 'base_white' },
        'gris': { hex: '#808080', key: 'base_gray' },
        'marrón': { hex: '#a52a2a', key: 'base_brown' },
        'turquesa': { hex: '#40e0d0', key: 'base_turquoise' },
        'cian': { hex: '#00ffff', key: 'base_cyan' },
        'magenta': { hex: '#ff00ff', key: 'base_magenta' },
        'lima': { hex: '#00ff00', key: 'base_lime' },
        'oliva': { hex: '#808000', key: 'base_olive' },
        'azul marino': { hex: '#000080', key: 'base_navy' },
        'granate': { hex: '#800000', key: 'base_maroon' },
        'plata': { hex: '#c0c0c0', key: 'base_silver' },
        'dorado': { hex: '#ffd700', key: 'base_gold' },
        'coral': { hex: '#ff7f50', key: 'base_coral' },
        'salmón': { hex: '#fa8072', key: 'base_salmon' },
        'aqua': { hex: '#00ffff', key: 'base_aqua' },
        'beige': { hex: '#f5f5dc', key: 'base_beige' },
        'crema': { hex: '#fffdd0', key: 'base_cream' },
        'lavanda': { hex: '#e6e6fa', key: 'base_lavender' },
        'menta': { hex: '#98fb98', key: 'base_mint' },
        'durazno': { hex: '#ffcba4', key: 'base_peach' },
        'índigo': { hex: '#4b0082', key: 'base_indigo' },
        'cerúleo': { hex: '#007ba7', key: 'base_cerulean' },
        'esmeralda': { hex: '#50c878', key: 'base_emerald' },
        'jade': { hex: '#00a86b', key: 'base_jade' },
        'verde azulado': { hex: '#008080', key: 'base_teal' },
        'aguamarina': { hex: '#7fffd4', key: 'base_aquamarine' },
        'cartujo': { hex: '#7fff00', key: 'base_chartreuse' },
        'bermellón': { hex: '#e34234', key: 'base_vermilion' },
        'ámbar': { hex: '#ffbf00', key: 'base_amber' },
        'siena': { hex: '#a0522d', key: 'base_sienna' }
    },
    'fr-fr': {
        'rouge': { hex: '#ff0000', key: 'base_red' },
        'vert': { hex: '#00ff00', key: 'base_green' },
        'bleu': { hex: '#0000ff', key: 'base_blue' },
        'jaune': { hex: '#ffff00', key: 'base_yellow' },
        'orange': { hex: '#ffa500', key: 'base_orange' },
        'violet': { hex: '#800080', key: 'base_purple' },
        'violine': { hex: '#8a2be2', key: 'base_violet' },
        'rose': { hex: '#ffc0cb', key: 'base_pink' },
        'noir': { hex: '#000000', key: 'base_black' },
        'blanc': { hex: '#ffffff', key: 'base_white' },
        'gris': { hex: '#808080', key: 'base_gray' },
        'brun': { hex: '#a52a2a', key: 'base_brown' },
        'turquoise': { hex: '#40e0d0', key: 'base_turquoise' },
        'cyan': { hex: '#00ffff', key: 'base_cyan' },
        'magenta': { hex: '#ff00ff', key: 'base_magenta' },
        'citron vert': { hex: '#00ff00', key: 'base_lime' },
        'olive': { hex: '#808000', key: 'base_olive' },
        'bleu marine': { hex: '#000080', key: 'base_navy' },
        'marron': { hex: '#800000', key: 'base_maroon' },
        'argent': { hex: '#c0c0c0', key: 'base_silver' },
        'or': { hex: '#ffd700', key: 'base_gold' },
        'corail': { hex: '#ff7f50', key: 'base_coral' },
        'saumon': { hex: '#fa8072', key: 'base_salmon' },
        'aqua': { hex: '#00ffff', key: 'base_aqua' },
        'beige': { hex: '#f5f5dc', key: 'base_beige' },
        'crème': { hex: '#fffdd0', key: 'base_cream' },
        'lavande': { hex: '#e6e6fa', key: 'base_lavender' },
        'menthe': { hex: '#98fb98', key: 'base_mint' },
        'pêche': { hex: '#ffcba4', key: 'base_peach' },
        'indigo': { hex: '#4b0082', key: 'base_indigo' },
        'céruléen': { hex: '#007ba7', key: 'base_cerulean' },
        'émeraude': { hex: '#50c878', key: 'base_emerald' },
        'jade': { hex: '#00a86b', key: 'base_jade' },
        'sarcelle': { hex: '#008080', key: 'base_teal' },
        'aigue-marine': { hex: '#7fffd4', key: 'base_aquamarine' },
        'chartreuse': { hex: '#7fff00', key: 'base_chartreuse' },
        'vermilion': { hex: '#e34234', key: 'base_vermilion' },
        'ambre': { hex: '#ffbf00', key: 'base_amber' },
        'terre de sienne': { hex: '#a0522d', key: 'base_sienna' }
    }
};

const searchState = {
    isInitialized: false,
    searchTimeout: null,
    currentQuery: '',
    currentResults: null,
    isSearching: false
};

function getTranslation(key, category = 'tooltips') {
    if (typeof window.getTranslation === 'function') {
        return window.getTranslation(key, category);
    }
    return key;
}

function getSearchSectionTranslation(key) {
    return getTranslation(key, 'search_sections');
}

function getUnavailableText() {
    return getTranslation('color_unavailable', 'search');
}

function getSearchPlaceholder() {
    return getTranslation('search_placeholder', 'search');
}

function getNoResultsText() {
    return getTranslation('no_results', 'search');
}

function getCurrentTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark-mode')) {
        return 'dark';
    } else if (html.classList.contains('light-mode')) {
        return 'light';
    }
    return 'system';
}

function isValidForTheme(hex) {
    if (typeof window.colorTextManager === 'object' && typeof window.colorTextManager.isValidForTheme === 'function') {
        return window.colorTextManager.isValidForTheme(hex);
    }
    if (hex === 'auto') return true;
    if (hex.startsWith('linear-gradient') || hex.startsWith('radial-gradient')) return true;
    try {
        const color = chroma(hex);
        const luminance = color.luminance();
        const currentTheme = getCurrentTheme();
        return currentTheme === 'dark' ?
            luminance >= 0.08 :
            luminance <= 0.92;
    } catch (e) {
        return true;
    }
}

function getAutoColor() {
    if (typeof window.colorTextManager === 'object' && typeof window.colorTextManager.getAutoColor === 'function') {
        return window.colorTextManager.getAutoColor();
    }
    const currentTheme = getCurrentTheme();
    return currentTheme === 'dark' ? '#ffffff' : '#000000';
}

function hideOtherColorSections() {
    const mainWrapper = document.querySelector(COLOR_SEARCH_CONFIG.mainColorsWrapper);
    if (mainWrapper) {
        mainWrapper.classList.remove('active');
        mainWrapper.classList.add('disabled');
    }
}

function showOtherColorSections() {
    const mainWrapper = document.querySelector(COLOR_SEARCH_CONFIG.mainColorsWrapper);
    if (mainWrapper) {
        mainWrapper.classList.remove('disabled');
        mainWrapper.classList.add('active');
    }
}

function initColorSearchSystem() {
    if (searchState.isInitialized) return;
    if (typeof chroma === 'undefined') {
        console.error("Chroma.js is not loaded. Color search system cannot initialize.");
        return;
    }
    const searchWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);
    if (searchWrapper) {
        searchWrapper.classList.add('disabled');
        searchWrapper.classList.remove('active');
    } else {
        console.error("Search results wrapper not found.");
    }
    
    // El input de búsqueda ahora es gestionado por palette-colors.js
    // por lo que aquí no se adjuntan listeners.
    
    searchState.isInitialized = true;

    // Se hace window.colorSearchManager disponible globalmente para ser accedido por palette-colors.js
    window.colorSearchManager = {
        init: initColorSearchSystem,
        refresh: refreshSearchSystem,
        clear: clearSearchColors,
        performSearch: performSearch, // Exportando esta función
        getState: getSearchState,
        debug: debugSearchSystem,
    };
}

function updateSearchPlaceholder() {
    const searchInput = document.querySelector(COLOR_SEARCH_CONFIG.searchInput);
    if (searchInput && !searchInput.hasAttribute('data-translate-target')) {
        searchInput.placeholder = getSearchPlaceholder();
    }
}

function performSearch(query) {
    if (!query) {
        showOtherColorSections();
        hideSearchSectionWrapper();
        searchState.currentQuery = '';
        searchState.currentResults = null;
        return;
    }
    searchState.isSearching = true;
    searchState.currentQuery = query;
    try {
        const searchResults = processSearchQuery(query);
        searchState.currentResults = searchResults;
        if (hasValidResults(searchResults)) {
            hideOtherColorSections();
            displaySearchResults(searchResults);
            showSearchSectionWrapper();
        } else {
            hideOtherColorSections();
            displaySearchError(getNoResultsText() + ' "' + searchState.currentQuery + '"');
            showSearchSectionWrapper();
        }
    } catch (error) {
        showOtherColorSections();
        displaySearchError(getTranslation('search_error', 'search'));
        hideSearchSectionWrapper();
    } finally {
        searchState.isSearching = false;
    }
}

function processSearchQuery(query) {
    const results = {
        directMatch: null,
        lightVariations: [],
        darkVariations: [],
        saturatedVariations: [],
        desaturatedVariations: [],
        warmVariations: [],
        coolVariations: [],
        shades: [],
        tints: [],
        tones: []
    };
    const baseColorData = getBaseColorFromQuery(query);
    if (!baseColorData) {
        return results;
    }
    try {
        const chromaColor = chroma(baseColorData.hex);
        const isValid = isValidForTheme(chromaColor.hex());
        const matchData = {
            hex: chromaColor.hex(),
            name: getColorName(baseColorData.hex, query),
            color: chromaColor,
            translationKey: baseColorData.key || null
        };
        if (isValid) {
            results.directMatch = matchData;
        } else {
            results.directMatch = { ...matchData,
                invalidForTheme: true
            };
        }
        results.lightVariations = generateLightVariations(chromaColor).filter(c => isValidForTheme(c.hex));
        results.darkVariations = generateDarkVariations(chromaColor).filter(c => isValidForTheme(c.hex));
        results.saturatedVariations = generateSaturatedVariations(chromaColor).filter(c => isValidForTheme(c.hex));
        results.desaturatedVariations = generateDesaturatedVariations(chromaColor).filter(c => isValidForTheme(c.hex));
        results.warmVariations = generateWarmVariations(chromaColor).filter(c => isValidForTheme(c.hex));
        results.coolVariations = generateCoolVariations(chromaColor).filter(c => isValidForTheme(c.hex));
        const arePremiumFeaturesEnabled = window.colorTextManager && typeof window.colorTextManager.arePremiumFeaturesEnabled === 'function' ?
            window.colorTextManager.arePremiumFeaturesEnabled() :
            false;
        if (arePremiumFeaturesEnabled) {
            results.shades = generateShades(chromaColor).filter(c => isValidForTheme(c.hex));
            results.tints = generateTints(chromaColor).filter(c => isValidForTheme(c.hex));
            results.tones = generateTones(chromaColor).filter(c => isValidForTheme(c.hex));
        }
    } catch (error) {}
    return results;
}

function hasValidResults(results) {
    return results.directMatch ||
        results.lightVariations.length > 0 ||
        results.darkVariations.length > 0 ||
        results.saturatedVariations.length > 0 ||
        results.desaturatedVariations.length > 0 ||
        results.warmVariations.length > 0 ||
        results.coolVariations.length > 0 ||
        results.shades.length > 0 ||
        results.tints.length > 0 ||
        results.tones.length > 0;
}

function getBaseColorFromQuery(query) {
    const lowerQuery = query.toLowerCase().trim();
    if (/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(lowerQuery)) {
        return {
            hex: lowerQuery.startsWith('#') ? lowerQuery : '#' + lowerQuery,
            key: null
        };
    }
    const lang = (typeof window.getCurrentLanguage === 'function') ? window.getCurrentLanguage() : 'en-us';
    const currentDb = COLOR_DATABASES[lang] || COLOR_DATABASES['en-us'];
    if (currentDb[lowerQuery]) {
        return currentDb[lowerQuery];
    }
    if (lang === 'en-us') {
        try {
            const color = chroma(lowerQuery);
            return {
                hex: color.hex(),
                key: null
            };
        } catch (error) {}
    }
    return null;
}

function getColorName(colorHex, originalQuery) {
    const lowerHex = colorHex.toLowerCase();
    const englishDb = COLOR_DATABASES['en-us'];
    for (const [name, data] of Object.entries(englishDb)) {
        if (data.hex.toLowerCase() === lowerHex) {
            return name;
        }
    }
    for (const dbLang in COLOR_DATABASES) {
        if (Object.prototype.hasOwnProperty.call(COLOR_DATABASES, dbLang)) {
            const db = COLOR_DATABASES[dbLang];
            for (const [name, data] of Object.entries(db)) {
                if (data.hex.toLowerCase() === lowerHex) {
                    for (const [enName, enData] of Object.entries(englishDb)) {
                        if (enData.hex.toLowerCase() === lowerHex) {
                            return enName;
                        }
                    }
                }
            }
        }
    }
    return colorHex;
}

function generateLightVariations(baseColor) {
    const variations = [];
    try {
        const hsl = baseColor.hsl();
        const baseHue = hsl[0] || 0;
        const baseSat = hsl[1] || 0;
        const baseLightness = hsl[2] || 0;
        for (let i = 1; i <= 8; i++) {
            const newLightness = Math.min(1, baseLightness + (i * 0.08));
            if (newLightness > baseLightness) {
                const lighter = chroma.hsl(baseHue, baseSat, newLightness);
                variations.push({
                    hex: lighter.hex(),
                    name: `Lighter ${i}`,
                    color: lighter
                });
            }
        }
    } catch (error) {}
    return variations;
}

function generateDarkVariations(baseColor) {
    const variations = [];
    try {
        const hsl = baseColor.hsl();
        const baseHue = hsl[0] || 0;
        const baseSat = hsl[1] || 0;
        const baseLightness = hsl[2] || 0;
        for (let i = 1; i <= 8; i++) {
            const newLightness = Math.max(0, baseLightness - (i * 0.08));
            if (newLightness < baseLightness) {
                const darker = chroma.hsl(baseHue, baseSat, newLightness);
                variations.push({
                    hex: darker.hex(),
                    name: `Darker ${i}`,
                    color: darker
                });
            }
        }
    } catch (error) {}
    return variations;
}

function generateSaturatedVariations(baseColor) {
    const variations = [];
    try {
        const hsl = baseColor.hsl();
        const baseHue = hsl[0] || 0;
        const baseSat = hsl[1] || 0;
        const baseLightness = hsl[2] || 0;
        for (let i = 1; i <= 6; i++) {
            const newSat = Math.min(1, baseSat + (i * 0.12));
            if (newSat > baseSat) {
                const moreSaturated = chroma.hsl(baseHue, newSat, baseLightness);
                variations.push({
                    hex: moreSaturated.hex(),
                    name: `More Saturated ${i}`,
                    color: moreSaturated
                });
            }
        }
    } catch (error) {}
    return variations;
}

function generateDesaturatedVariations(baseColor) {
    const variations = [];
    try {
        const hsl = baseColor.hsl();
        const baseHue = hsl[0] || 0;
        const baseSat = hsl[1] || 0;
        const baseLightness = hsl[2] || 0;
        for (let i = 1; i <= 6; i++) {
            const newSat = Math.max(0, baseSat - (i * 0.12));
            if (newSat < baseSat) {
                const lessSaturated = chroma.hsl(baseHue, newSat, baseLightness);
                variations.push({
                    hex: lessSaturated.hex(),
                    name: `Less Saturated ${i}`,
                    color: lessSaturated
                });
            }
        }
    } catch (error) {}
    return variations;
}

function generateWarmVariations(baseColor) {
    const variations = [];
    try {
        const hsl = baseColor.hsl();
        const baseHue = hsl[0] || 0;
        const baseSat = hsl[1] || 0;
        const baseLightness = hsl[2] || 0;
        for (let i = 1; i <= 4; i++) {
            const hueShift = i * 8;
            const newHue = (baseHue + hueShift) % 360;
            const warmer = chroma.hsl(newHue, baseSat, baseLightness);
            variations.push({
                hex: warmer.hex(),
                name: `Warmer ${i}`,
                color: warmer
            });
        }
    } catch (error) {}
    return variations;
}

function generateCoolVariations(baseColor) {
    const variations = [];
    try {
        const hsl = baseColor.hsl();
        const baseHue = hsl[0] || 0;
        const baseSat = hsl[1] || 0;
        const baseLightness = hsl[2] || 0;
        for (let i = 1; i <= 4; i++) {
            const hueShift = i * 8;
            const newHue = (baseHue - hueShift + 360) % 360;
            const cooler = chroma.hsl(newHue, baseSat, baseLightness);
            variations.push({
                hex: cooler.hex(),
                name: `Cooler ${i}`,
                color: cooler
            });
        }
    } catch (error) {}
    return variations;
}

function generateShades(baseColor) {
    const shades = [];
    try {
        for (let i = 1; i <= 6; i++) {
            const amount = i * 0.15;
            const shade = chroma.mix(baseColor, 'black', amount);
            shades.push({
                hex: shade.hex(),
                name: `Shade ${Math.round(amount * 100)}%`,
                color: shade
            });
        }
    } catch (error) {}
    return shades;
}

function generateTints(baseColor) {
    const tints = [];
    try {
        for (let i = 1; i <= 6; i++) {
            const amount = i * 0.15;
            const tint = chroma.mix(baseColor, 'white', amount);
            tints.push({
                hex: tint.hex(),
                name: `Tint ${Math.round(amount * 100)}%`,
                color: tint
            });
        }
    } catch (error) {}
    return tints;
}

function generateTones(baseColor) {
    const tones = [];
    try {
        for (let i = 1; i <= 6; i++) {
            const amount = i * 0.15;
            const tone = chroma.mix(baseColor, '#808080', amount);
            tones.push({
                hex: tone.hex(),
                name: `Tone Gray ${Math.round(amount * 100)}%`,
                color: tone
            });
        }
    } catch (error) {}
    return tones;
}

function displaySearchResults(results) {
    const searchResultsWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);
    if (!searchResultsWrapper) return;
    searchResultsWrapper.innerHTML = '';
    const sections = [{
        key: 'directMatch',
        titleKey: 'search_result',
        icon: 'search',
        single: true
    }, {
        key: 'lightVariations',
        titleKey: 'brightness_light',
        icon: 'brightness_high'
    }, {
        key: 'darkVariations',
        titleKey: 'brightness_dark',
        icon: 'brightness_low'
    }, {
        key: 'saturatedVariations',
        titleKey: 'saturation_more',
        icon: 'water_drop'
    }, {
        key: 'desaturatedVariations',
        titleKey: 'saturation_less',
        icon: 'opacity'
    }, {
        key: 'warmVariations',
        titleKey: 'temperature_warmer',
        icon: 'thermostat'
    }, {
        key: 'coolVariations',
        titleKey: 'temperature_cooler',
        icon: 'ac_unit'
    }, {
        key: 'tints',
        titleKey: 'tints',
        icon: 'light_mode'
    }, {
        key: 'shades',
        titleKey: 'shades',
        icon: 'dark_mode'
    }, {
        key: 'tones',
        titleKey: 'tones',
        icon: 'contrast'
    }];
    const fragment = document.createDocumentFragment();
    sections.forEach(sectionInfo => {
        const data = results[sectionInfo.key];
        const colorsToDisplay = sectionInfo.single ? (data ? [data] : []) : (data || []);
        if (colorsToDisplay.length > 0) {
            const sectionElement = createSearchResultSection(
                sectionInfo.titleKey,
                sectionInfo.icon,
                colorsToDisplay
            );
            fragment.appendChild(sectionElement);
        }
    });
    searchResultsWrapper.appendChild(fragment);
    if (typeof attachTooltipsToNewElements === 'function') {
        attachTooltipsToNewElements(searchResultsWrapper);
    }
    if (searchResultsWrapper.children.length === 0) {
        displaySearchError(getTranslation('no_valid_results', 'search') + ' "' + searchState.currentQuery + '"');
    }
}

function createSearchResultSection(titleKey, icon, colors) {
    const section = document.createElement('div');
    section.className = 'menu-content';
    section.setAttribute('data-section', titleKey);
    const header = document.createElement('div');
    header.className = 'menu-content-header';
    header.innerHTML = `
        <div class="menu-content-header-primary">
            <span class="material-symbols-rounded">${icon}</span>
            <span>${getSearchSectionTranslation(titleKey)}</span>
        </div>
    `;
    const content = document.createElement('div');
    content.className = 'menu-content-general';
    const colorWrapper = document.createElement('div');
    colorWrapper.className = 'color-wrapper';
    colors.slice(0, COLOR_SEARCH_CONFIG.maxResultsPerSection).forEach(colorData => {
        const colorElement = window.colorTextManager.createColorElementForSearch(colorData);
        if (colorData.invalidForTheme) {
            colorElement.classList.add('invalid-for-theme');
        }
        colorElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSearchColorClick(colorData);
        });
        colorElement.addEventListener('mouseenter', () => {
            if (!colorElement.classList.contains('active')) {
                colorElement.style.transform = 'scale(1.05)';
            }
        });
        colorElement.addEventListener('mouseleave', () => {
            if (!colorElement.classList.contains('active')) {
                colorElement.style.transform = 'scale(1)';
            }
        });
        colorWrapper.appendChild(colorElement);
    });
    content.appendChild(colorWrapper);
    section.appendChild(header);
    section.appendChild(content);
    return section;
}

function handleSearchColorClick(colorData) {
    if (colorData.invalidForTheme) {
        return;
    }
    if (window.colorTextManager && window.colorTextManager.setColor) {
        window.colorTextManager.setColor(colorData.hex, colorData.name || colorData.hex, 'search');
    }
    clearSearchColors();
    const event = new CustomEvent('searchColorSelected', {
        detail: {
            color: colorData.hex,
            name: colorData.name || colorData.hex,
            source: 'search'
        }
    });
    document.dispatchEvent(event);
}

function displaySearchError(message) {
    const searchResultsWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);
    if (!searchResultsWrapper) return;
    searchResultsWrapper.innerHTML = '';
    const errorContent = document.createElement('div');
    errorContent.className = 'menu-content-general';
    const errorMessage = document.createElement('p');
    errorMessage.textContent = message;
    errorContent.appendChild(errorMessage);
    searchResultsWrapper.appendChild(errorContent);
}

function displaySearchErrorMinimal(message) {
    const searchResultsWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);
    if (!searchResultsWrapper) return;
    searchResultsWrapper.innerHTML = `
        <div class="menu-content-general" style="padding: 20px;">
            <p style="color: #888; text-align: center; margin: 0;">${message}</p>
        </div>
    `;
}

function showSearchSectionWrapper() {
    const searchWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);
    if (searchWrapper) {
        searchWrapper.classList.remove('disabled');
        searchWrapper.classList.add('active');
    }
}

function hideSearchSectionWrapper() {
    const searchWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);
    if (searchWrapper) {
        searchWrapper.classList.remove('active');
        searchWrapper.classList.add('disabled');
        searchWrapper.innerHTML = '';
    }
}

function clearSearchColors() {
    const searchInput = document.querySelector(COLOR_SEARCH_CONFIG.searchInput);
    if (searchInput) {
        searchInput.value = '';
    }
    showOtherColorSections();
    hideSearchSectionWrapper();
    searchState.currentQuery = '';
    searchState.currentResults = null;
    if (searchState.searchTimeout) {
        clearTimeout(searchState.searchTimeout);
        searchState.searchTimeout = null;
    }
    if (typeof window.forceRefresh === 'function') {
        window.forceRefresh({
            source: 'searchCleared',
            preset: 'TOOLTIPS_ONLY'
        });
    }
}

function isLightColor(hex) {
    if (typeof chroma !== 'undefined') {
        try {
            return chroma(hex).luminance() > 0.7;
        } catch (e) {}
    }
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.7;
}

function refreshSearchSystem() {
    if (searchState.isInitialized) {
        updateSearchPlaceholder();
        const searchInput = document.querySelector(COLOR_SEARCH_CONFIG.searchInput);
        if (searchInput && searchInput.value.trim()) {
            performSearch(searchInput.value.trim());
        } else {
            showOtherColorSections();
            hideSearchSectionWrapper();
        }
    }
}

function getSearchState() {
    const lang = (typeof window.getCurrentLanguage === 'function') ? window.getCurrentLanguage() : 'en-us';
    return {
        isInitialized: searchState.isInitialized,
        currentQuery: searchState.currentQuery,
        isSearching: searchState.isSearching,
        totalColorsInDatabase: COLOR_DATABASES[lang] ? Object.keys(COLOR_DATABASES[lang]).length : 0,
        currentLanguage: lang,
        currentTheme: getCurrentTheme()
    };
}

function debugSearchSystem() {}


export {
    initColorSearchSystem,
    performSearch, // MODIFICADO: Exportar función
    clearSearchColors, // MODIFICADO: Exportar función
    refreshSearchSystem,
    getSearchState,
    debugSearchSystem,
    hideOtherColorSections,
    showOtherColorSections,
    isValidForTheme,
    getCurrentTheme,
    updateSearchPlaceholder,
    showSearchSectionWrapper,
    hideSearchSectionWrapper
};