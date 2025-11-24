// ======= VARIABLES GLOBALS =======
let TORNS = {};
let CALENDARI = {};
let SERVEI_DIA_ACTUAL = 'N/A';
let SERVEI_DIA_ORIGINAL = 'N/A'; // Nou: per guardar el servei original
let DADES_CARREGADES = false;
let TORN_SELECCIONAT = null;

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

// Normalitza codis de servei a 3 caràcters
function normalitzarCodi(codi) {
    if (!codi) return '';
    const codiStr = String(codi).trim();
    return codiStr.padEnd(3, ' '); // Assegura 3 caràcters
}

// Compara codis pels primers 2 caràcters
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

// ======= CÀRREGA I TRANSFORMACIÓ DE DADES =======
async function carregarDadesJSON() {
    try {
        const [tornResponse, calendariResponse] = await Promise.all([
            fetch('torn.json'),
            fetch('calendari.json')
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
    await carregarMarkdown();
}

function inicialitzarUI() {
    const avui = new Date().toISOString().split('T')[0];
    document.getElementById('dateSelector').value = avui;
    actualitzarServeiDia(avui);
    
    document.getElementById('dateSelector').addEventListener('change', handleDateChange);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('searchInput').addEventListener('focus', () => mostrarAutocomplete());
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
        
        // Determinar si cal mostrar servei alternatiu per línia LA
        let serveiMostrar = diaInfo.servei.trim();
        let textAlternatiu = '';
        
        if (comparaCodis(diaInfo.servei, '800')) {
            textAlternatiu = ' (200 per LA)';
        } else if (comparaCodis(diaInfo.servei, '900')) {
            textAlternatiu = ' (300 per LA)';
        }
        
        SERVEI_DIA_ACTUAL = diaInfo.servei;
        
        badge.innerHTML = `
            <div class="service-badge">
                <div class="service-label">SERVEI DEL DIA</div>
                <div class="service-value">${serveiMostrar}${textAlternatiu}</div>
            </div>
        `;
    } else {
        SERVEI_DIA_ACTUAL = 'N/A';
        SERVEI_DIA_ORIGINAL = 'N/A';
        badge.innerHTML = `
            <div class="warning-box">
                ⚠️ No s'ha trobat informació per aquesta data
            </div>
        `;
    }
}

function handleSearch(event) {
    const query = event.target.value.toUpperCase();
    mostrarAutocomplete(query);
}

function mostrarAutocomplete(query = '') {
    const dropdown = document.getElementById('autocompleteDropdown');
    
    if (!query || !DADES_CARREGADES) {
        dropdown.style.display = 'none';
        return;
    }

    const tornsFiltrats = Object.keys(TORNS).filter(torn => 
        torn.toUpperCase().includes(query)
    ).slice(0, 8);

    if (tornsFiltrats.length > 0) {
        dropdown.innerHTML = tornsFiltrats.map(tornId => {
            const torn = TORNS[tornId];
            return `
                <div class="autocomplete-item" onclick="seleccionarTorn('${tornId}')">
                    <div class="autocomplete-label">${tornId}</div>
                    <div class="autocomplete-meta">Línia ${torn.linia} • Zona ${torn.zona}</div>
                </div>
            `;
        }).join('');
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
    }
}

function seleccionarTorn(tornId) {
    document.getElementById('searchInput').value = tornId;
    document.getElementById('autocompleteDropdown').style.display = 'none';
    
    TORN_SELECCIONAT = tornId.toUpperCase();
    cercarHorari(TORN_SELECCIONAT);
}

function handleClickOutside(event) {
    const searchContainer = document.querySelector('.custom-card:nth-child(3)');
    if (!searchContainer.contains(event.target)) {
        document.getElementById('autocompleteDropdown').style.display = 'none';
    }
}

// ======= LÒGICA DE CERCA =======
function obtenirServeiEfectiu(serveiDia, liniaTorn) {
    // Normalitzem el servei dia
    const serveiNormalitzat = normalitzarCodi(serveiDia);
    
    // Lògica especial per la línia LA: 800→200, 900→300
    if (liniaTorn === 'LA') {
        if (comparaCodis(serveiNormalitzat, '800')) return normalitzarCodi('200');
        if (comparaCodis(serveiNormalitzat, '900')) return normalitzarCodi('300');
    }
    return serveiNormalitzat;
}

function cercarHorari(tornId) {
    if (!DADES_CARREGADES) return;

    const id = tornId || TORN_SELECCIONAT || document.getElementById('searchInput').value;
    if (!id || SERVEI_DIA_ACTUAL === 'N/A') {
        mostrarEmptyState();
        return;
    }

    const torn = TORNS[id.toUpperCase()];
    if (!torn) {
        mostrarEmptyState();
        return;
    }

    // Determinar el servei efectiu segons la lògica especial per LA
    const serveiEfectiu = obtenirServeiEfectiu(SERVEI_DIA_ACTUAL, torn.linia);

    const resultats = [];
    Object.values(torn.serveis).forEach(servei => {
        // Comparem pels primers 2 caràcters
        const trobat = servei.codis.some(codi => comparaCodis(codi, serveiEfectiu));
        
        if (trobat) {
            resultats.push({
                torn: id.toUpperCase(),
                inici: servei.inici,
                fi: servei.fi,
                linia: torn.linia,
                zona: torn.zona
            });
        }
    });

    mostrarResultats(resultats, id.toUpperCase());
}

function mostrarResultats(resultats, tornCercat) {
    if (!DADES_CARREGADES) return;

    const container = document.getElementById('resultsContainer');
    const emptyState = document.getElementById('emptyState');

    if (resultats.length === 0) {
        mostrarEmptyState();
        return;
    }

    emptyState.classList.remove('active');

    container.innerHTML = `

        <div class="success-banner">
          ✅ Horari trobat per ${tornCercat} • Servei: ${SERVEI_DIA_ORIGINAL.trim()}
        </div>
        <div class="results-card">
            <table>
                <thead>
                    <tr>
                        <th>Torn</th>
                        <th>Inici</th>
                        <th>Fi</th>
                        <th>Línia</th>
                        <th>Zona</th>
                    </tr>
                </thead>
                <tbody>
                    ${resultats.map(r => `
                        <tr>
                            <td>${r.torn}</td>
                            <td>${r.inici}</td>
                            <td>${r.fi}</td>
                            <td>${r.linia}</td>
                            <td>${r.zona}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function mostrarEmptyState() {
    document.getElementById('resultsContainer').innerHTML = '';
    document.getElementById('emptyState').classList.add('active');
}

function mostrarError(missatge) {
    document.getElementById('serviceBadge').innerHTML = `<div class="error-box">${missatge}</div>`;
}

// Funció per mostrar l'any actual al footer
document.getElementById('current-year').textContent = new Date().getFullYear();

// ======= INICIAR APLICACIÓ =======
inicialitzaAplicacio();



// ======= NOU: FUNCIONALITAT MAPA DE PRESÈNCIA =======

// Variable global per emmagatzemar el contingut del markdown
let markdownText = '';

/**
 * Carrega el fitxer markdown al inicialitzar l'aplicació
 */
async function carregarMarkdown() {
    try {
        const response = await fetch('mapa_presencia.md');
        if (!response.ok) {
            throw new Error('No s'ha pogut carregar el fitxer markdown');
        }
        markdownText = await response.text();
        console.log('✓ Markdown carregat correctament');
    } catch (error) {
        console.error('Error carregant markdown:', error);
        markdownText = '# Error\n\nNo s'ha pogut carregar el mapa de presència.';
    }
}

/**
 * Mostra/amaga el contenidor del mapa de presència
 */
function toggleMapaPresencia() {
    const container = document.getElementById('markdownContainer');
    const btn = document.getElementById('btnMapaPresencia');

    if (container.classList.contains('open')) {
        // Tancar
        container.classList.remove('open');
        btn.textContent = '📍 Mapa de presència';
    } else {
        // Obrir i filtrar contingut
        filtrarMarkdownPerTorn();
        container.classList.add('open');
        btn.textContent = '📍 Amagar mapa';
    }
}

/**
 * Filtra el contingut del markdown segons el torn seleccionat
 */
function filtrarMarkdownPerTorn() {
    const contentDiv = document.getElementById('markdownContent');

    if (!TORN_SELECCIONAT) {
        contentDiv.innerHTML = '<p style="color: #ff9800;"><strong>No hi ha cap torn seleccionat.</strong></p>';
        return;
    }

    if (!markdownText) {
        contentDiv.innerHTML = '<p style="color: #f44336;"><strong>El fitxer markdown no s'ha carregat correctament.</strong></p>';
        return;
    }

    // Lògica de filtratge: cerca capçaleres que continguin el torn
    const query = TORN_SELECCIONAT.toLowerCase();
    const lines = markdownText.split('\n');
    let result = [];
    let capturing = false;
    let captureLevel = 0;

    for (let line of lines) {
        // Detectar capçalera
        const headerMatch = line.match(/^(#+)\s+(.*)/i);

        if (headerMatch) {
            const level = headerMatch[1].length; // Nombre de #
            const headerText = headerMatch[2];

            // Comprovar si aquesta capçalera conté el torn cercat
            if (headerText.toLowerCase().includes(query)) {
                capturing = true;
                captureLevel = level;
                result.push(line);
            } else if (capturing && level <= captureLevel) {
                // Hem arribat a una capçalera del mateix nivell o superior: parar
                capturing = false;
            } else if (capturing) {
                // Subcapçalera dins la secció: continuar capturant
                result.push(line);
            }
        } else if (capturing) {
            // Contingut de la secció
            result.push(line);
        }
    }

    // Processar markdown i mostrar
    if (result.length === 0) {
        contentDiv.innerHTML = `
            <p style="color: #ff9800;">
                <strong>No s'ha trobat informació per al torn "${TORN_SELECCIONAT}"</strong><br>
                <small>Comprova que el fitxer markdown tingui una secció amb aquest nom.</small>
            </p>
        `;
    } else {
        const markdownFiltered = result.join('\n');
        const html = marked.parse(markdownFiltered);
        contentDiv.innerHTML = html;
    }
}

/**
 * Mostra/amaga el botó de mapa segons si hi ha torn seleccionat
 */
function actualitzarBotoMapa() {
    const btn = document.getElementById('btnMapaPresencia');
    if (TORN_SELECCIONAT) {
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
        // Tancar el desplegable si estava obert
        const container = document.getElementById('markdownContainer');
        if (container.classList.contains('open')) {
            container.classList.remove('open');
        }
    }
}
