// ======= VARIABLES GLOBALS =======
let TORNS = {};
let CALENDARI = {};
let SERVEI_DIA_ACTUAL = 'N/A';
let SERVEI_DIA_ORIGINAL = 'N/A';
let DADES_CARREGADES = false;
let TORN_SELECCIONAT = null;
let MARKDOWN_CONTINGUT = ''; // Nova variable per guardar el markdown

// ======= FUNCIONS DE PARSEIG =======

function parseDateISO(dateStr) {
    if (!dateStr) return '';
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
    }
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return dateStr;
}

function formatTime(timeStr) {
    if (!timeStr) return '00:00';
    const time = String(timeStr).trim();
    if (time.match(/^\d{1,2}:\d{2}$/)) {
        const parts = time.split(':');
        return `${parts[0].padStart(2, '0')}:${parts[1]}`;
    }
    if (time.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
        return time.substring(0, 5);
    }
    return time;
}

function normalitzarCodi(codi) {
    if (!codi) return '';
    const codiStr = String(codi).trim();
    return codiStr.padEnd(3, ' ');
}

function comparaCodis(codi1, codi2) {
    const c1 = normalitzarCodi(codi1).substring(0, 2);
    const c2 = normalitzarCodi(codi2).substring(0, 2);
    return c1 === c2;
}

function parseServiceCodes(serviceValue) {
    if (serviceValue === null || serviceValue === undefined) return [];
    if (typeof serviceValue === 'string' && serviceValue.includes(',')) {
        return serviceValue.split(',')
            .map(c => normalitzarCodi(c))
            .filter(c => c.trim());
    }
    const serviceStr = String(serviceValue);
    if (!serviceStr) return [];
    const codis = [];
    for (let i = 0; i < serviceStr.length; i += 3) {
        const codi = serviceStr.substring(i, i + 3);
        if (codi) codis.push(normalitzarCodi(codi));
    }
    if (codis.length === 0) {
        codis.push(normalitzarCodi(serviceStr));
    }
    return codis;
}

// ======= FUNCIONS DE MARKDOWN =======

async function carregarMarkdown() {
    try {
        const response = await fetch('mapa_presencia.md'); // Carregar fitxer .md
        if (!response.ok) {
            throw new Error(`Error carregant markdown: ${response.status}`);
        }
        MARKDOWN_CONTINGUT = await response.text();
        console.log('✅ Markdown carregat correctament');
    } catch (error) {
        console.error('Error carregant markdown:', error);
        MARKDOWN_CONTINGUT = '# Error\nNo s\'ha pogut carregar el mapa de presència';
    }
}

function extreuSeccioMarkdown(query) {
    if (!MARKDOWN_CONTINGUT) return '<p>Contingut no disponible</p>';
    
    const lines = MARKDOWN_CONTINGUT.split('\n');
    let result = [];
    let capturing = false;

    for (let line of lines) {
        // Detecta capçaleres (# ## ###)
        if (line.match(/^#+\s+(.*)/i)) {
            const headerText = line.replace(/^#+\s+/i, '');
            // Inicia captura si la capçalera conté el query
            capturing = headerText.toUpperCase().includes(query.toUpperCase());
        }
        // Si estem capturant, afegeix línies fins a la pròxima capçalera
        if (capturing) {
            result.push(line);
            // Si s'arriba a una nova capçalera i no és la primera, parar
            if (line.match(/^#+\s+/) && result.length > 1) {
                result.pop(); // Eliminar la nova capçalera
                break;
            }
        }
    }

    return result.length > 0 ? result.join('\n') : '';
}

function markdownToHtml(markdownText) {
    let html = markdownText;
    
    // Convertir capçaleres
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
    // Convertir negreta
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Convertir cursiva
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Convertir salts de línia simples
    html = html.split('\n\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('');
    
    return html;
}

function mostrarMapaPresencia() {
    const container = document.getElementById('markdownContainer');
    const content = document.getElementById('markdownContent');
    
    if (!TORN_SELECCIONAT) {
        alert('Si us plau, selecciona un torn primer');
        return;
    }
    
    // Extreure la secció del markdown per al torn seleccionat
    const markdownSeccio = extreuSeccioMarkdown(TORN_SELECCIONAT);
    
    if (!markdownSeccio) {
        content.innerHTML = `<p>No hi ha informació disponible per a ${TORN_SELECCIONAT}</p>`;
    } else {
        // Convertir markdown a HTML
        const htmlContent = markdownToHtml(markdownSeccio);
        content.innerHTML = htmlContent;
    }
    
    // Toggle entre col·lapsat i expandit
    container.classList.toggle('collapsed');
    container.classList.toggle('expanded');
    
    // Scroll suau al contingut
    if (container.classList.contains('expanded')) {
        setTimeout(() => {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// ======= CÀRREGA I TRANSFORMACIÓ DE DADES =======

async function carregarDadesJSON() {
    try {
        const [tornResponse, calendariResponse] = await Promise.all([
            fetch('torn.json'),
            fetch('calendari.json'),
            carregarMarkdown() // Carregar markdown en paral·lel
        ]);
        
        if (!tornResponse.ok) {
            throw new Error(`No s'ha pogut carregar torn.json: ${tornResponse.status}`);
        }
        if (!calendariResponse.ok) {
            throw new Error(`No s'ha pogut carregar calendari.json: ${calendariResponse.status}`);
        }
        
        const tornsArray = await tornResponse.json();
        const calendariArray = await calendariResponse.json();
        
        transformarDades(tornsArray, calendariArray);
        DADES_CARREGADES = true;
    } catch (error) {
        mostrarError(`❌ Error carregant dades: ${error.message}`);
        console.error('Error detallat:', error);
    }
}

function transformarDades(tornsArray, calendariArray) {
    TORNS = {};
    tornsArray.forEach(tornItem => {
        const tornId = tornItem.Torn;
        if (!tornId) return;
        
        const serveis = {};
        for (let i = 1; i <= 4; i++) {
            const serveiCol = `Servei ${i}`;
            const iniciCol = `Inici S${i}`;
            const finalCol = `Final S${i}`;
            
            if (tornItem[serveiCol] && tornItem[iniciCol] && tornItem[finalCol]) {
                const codis = parseServiceCodes(tornItem[serveiCol]);
                const horaInici = formatTime(tornItem[iniciCol]);
                const horaFi = formatTime(tornItem[finalCol]);
                serveis[i] = {
                    codis: codis,
                    inici: horaInici,
                    fi: horaFi
                };
            }
        }
        
        if (Object.keys(serveis).length > 0) {
            TORNS[tornId] = {
                id: tornId,
                linia: tornItem.Línia || tornItem.Linia || '',
                zona: tornItem.Zona || '',
                serveis: serveis
            };
        }
    });
    
    CALENDARI = {};
    calendariArray.forEach(diaItem => {
        if (diaItem.Data) {
            const dataISO = parseDateISO(diaItem.Data);
            CALENDARI[dataISO] = {
                servei: normalitzarCodi(String(diaItem['Servei BV'] || '').trim()),
                dia_setmana: diaItem.Dia_Set || '',
                dia_mes: diaItem.Dia_Mes || '',
                dia_num: diaItem.Dia_Num || ''
            };
        }
    });
}

// ======= INICIALITZACIÓ =======

async function inicialitzaAplicacio() {
    await carregarDadesJSON();
    if (DADES_CARREGADES) {
        inicialitzarUI();
    }
}

function inicialitzarUI() {
    const avui = new Date().toISOString().split('T')[0];
    document.getElementById('dateSelector').value = avui;
    actualitzarServeiDia(avui);
    
    document.getElementById('dateSelector').addEventListener('change', handleDateChange);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('searchInput').addEventListener('focus', () => mostrarAutocomplete());
    document.getElementById('mapaPresenciaBtn').addEventListener('click', mostrarMapaPresencia);
    document.addEventListener('click', handleClickOutside);
}

// ======= GESTIÓ D'ESDEVENIMENTS =======

function handleDateChange(event) {
    const data = event.target.value;
    actualitzarServeiDia(data);
    if (TORN_SELECCIONAT) {
        setTimeout(() => {
            cercarHorari(TORN_SELECCIONAT);
        }, 100);
    }
}

function actualitzarServeiDia(data) {
    const diaInfo = CALENDARI[data];
    const badge = document.getElementById('serviceBadge');
    
    if (diaInfo && diaInfo.servei) {
        SERVEI_DIA_ORIGINAL = diaInfo.servei;
        let serveiMostrar = diaInfo.servei.trim();
        let textAlternatiu = '';
        
        if (comparaCodis(diaInfo.servei, '800')) {
            textAlternatiu = ' (200 per LA)';
        } else if (comparaCodis(diaInfo.servei, '900')) {
            textAlternatiu = ' (300 per LA)';
        }
        
        SERVEI_DIA_ACTUAL = diaInfo.servei;
        badge.innerHTML = `${serveiMostrar}${textAlternatiu}`;
    } else {
        SERVEI_DIA_ACTUAL = 'N/A';
        badge.innerHTML = 'N/A';
    }
}

function handleSearch(event) {
    const query = event.target.value.trim().toUpperCase();
    
    if (!query) {
        document.getElementById('emptyState').classList.add('active');
        document.getElementById('resultsContainer').style.display = 'none';
        document.getElementById('autocompleteDropdown').style.display = 'none';
        TORN_SELECCIONAT = null;
        return;
    }
    
    const matches = Object.keys(TORNS).filter(tornId =>
        tornId.includes(query)
    );
    
    if (matches.length > 0) {
        mostrarAutocomplete(matches);
    } else {
        document.getElementById('autocompleteDropdown').style.display = 'none';
    }
}

function mostrarAutocomplete(matches = null) {
    const query = document.getElementById('searchInput').value.trim().toUpperCase();
    const dropdown = document.getElementById('autocompleteDropdown');
    
    if (!matches) {
        matches = Object.keys(TORNS).filter(tornId =>
            tornId.includes(query) || !query
        ).slice(0, 10);
    }
    
    if (matches.length === 0) {
        dropdown.style.display = 'none';
        return;
    }
    
    dropdown.innerHTML = matches.map(tornId => `
        <div class="autocomplete-item" onclick="seleccionarTorn('${tornId}')">
            <div class="autocomplete-label">${tornId}</div>
            <div class="autocomplete-meta">
                Línia: ${TORNS[tornId].linia} | Zona: ${TORNS[tornId].zona}
            </div>
        </div>
    `).join('');
    
    dropdown.style.display = 'block';
}

function seleccionarTorn(tornId) {
    document.getElementById('searchInput').value = tornId;
    document.getElementById('autocompleteDropdown').style.display = 'none';
    cercarHorari(tornId);
}

function cercarHorari(tornId) {
    TORN_SELECCIONAT = tornId;
    
    const torn = TORNS[tornId];
    if (!torn) {
        mostrarError('Torn no encontrat');
        return;
    }
    
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';
    
    // Afegir fila per cada servei
    for (const [num, servei] of Object.entries(torn.serveis)) {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${torn.id}</td>
            <td>${servei.inici}</td>
            <td>${servei.fi}</td>
            <td>${torn.linia}</td>
            <td>${torn.zona}</td>
        `;
    }
    
    document.getElementById('emptyState').classList.remove('active');
    document.getElementById('resultsContainer').style.display = 'block';
}

function handleClickOutside(event) {
    const dropdown = document.getElementById('autocompleteDropdown');
    const searchInput = document.getElementById('searchInput');
    
    if (!event.target.closest('.chat-input-wrapper')) {
        dropdown.style.display = 'none';
    }
}

function mostrarError(missatge) {
    document.getElementById('emptyState').innerHTML = `
        <div class="empty-icon">⚠️</div>
        <p>${missatge}</p>
    `;
    document.getElementById('emptyState').classList.add('active');
}

// ======= INICIAR L'APP =======
document.addEventListener('DOMContentLoaded', inicialitzaAplicacio);
