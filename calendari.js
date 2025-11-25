// ======= VARIABLES GLOBALS =======
let TORNS = {};
let CALENDARI = {};
let SERVEI_DIA_ACTUAL = 'N/A';
let SERVEI_DIA_ORIGINAL = 'N/A'; // Nou: per guardar el servei original
let DADES_CARREGADES = false;
let TORN_SELECCIONAT = null;
let MARKDOWN_TEXT = ''; // Nova variable per markdown
let MAPA_VISIBLE = false; // Nova variable per estat del mapa

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

// ======= NOVA FUNCIÓ: CARREGAR MARKDOWN =======
async function carregarMarkdown() {
    try {
        const response = await fetch('mapa_presencia.md');
        if (!response.ok) {
            console.warn('No s\'ha pogut carregar mapa_presencia.md');
            return;
        }
        MARKDOWN_TEXT = await response.text();
    } catch (error) {
        console.error('Error carregant markdown:', error);
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
    await Promise.all([
        carregarDadesJSON(),
        carregarMarkdown()
    ]);
    
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
    
    // Mostrar botó de mapa de presència
    const btnMapa = document.getElementById('btnMapaPresencia');
    if (btnMapa && MARKDOWN_TEXT) {
        btnMapa.style.display = 'block';
    }
    
    // Tancar mapa si estava obert
    if (MAPA_VISIBLE) {
        MAPA_VISIBLE = false;
        document.getElementById('mapaPresenciaContainer').style.display = 'none';
        if (btnMapa) {
            btnMapa.textContent = '📍 Mapa de presència';
        }
    }
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
    
    // Amagar botó de mapa
    const btnMapa = document.getElementById('btnMapaPresencia');
    if (btnMapa) {
        btnMapa.style.display = 'block';
    }
    
    // Tancar mapa si estava obert
    if (MAPA_VISIBLE) {
        MAPA_VISIBLE = false;
        document.getElementById('mapaPresenciaContainer').style.display = 'none';
    }
}

function mostrarError(missatge) {
    document.getElementById('serviceBadge').innerHTML = `<div class="error-box">${missatge}</div>`;
}

// ======= NOVA FUNCIÓ: FILTRAR MARKDOWN PER TORN =======
function filtrarMarkdownPerTorn(tornId) {
    if (!MARKDOWN_TEXT || !tornId) return '';
    
    const lines = MARKDOWN_TEXT.split('\n');
    let result = [];
    let capturing = false;
    let headerLevel = 0;
    
    for (let line of lines) {
        const headerMatch = line.match(/^(#+)\s+(.*)/i);
        
        if (headerMatch) {
            const level = headerMatch[1].length;
            const headerText = headerMatch[2];
            
            // Cerca exacte o parcial del torn al header
            if (headerText.toUpperCase().includes(tornId.toUpperCase())) {
                capturing = true;
                headerLevel = level;
                result.push(line);
            } else if (capturing && level <= headerLevel) {
                // Parem quan trobem un header del mateix nivell o superior
                break;
            } else if (capturing) {
                result.push(line);
            }
        } else if (capturing) {
            result.push(line);
        }
    }
    
    return result.join('\n');
}

// ======= NOVA FUNCIÓ: TOGGLE MAPA DE PRESÈNCIA =======
function toggleMapaPresencia() {
    if (!TORN_SELECCIONAT || !MARKDOWN_TEXT) return;
    
    const container = document.getElementById('mapaPresenciaContainer');
    const btn = document.getElementById('btnMapaPresencia');
    
    MAPA_VISIBLE = !MAPA_VISIBLE;
    
    if (MAPA_VISIBLE) {
        const markdown = filtrarMarkdownPerTorn(TORN_SELECCIONAT);
        if (markdown) {
            const html = marked.parse(markdown);
            document.getElementById('mapaPresenciaContent').innerHTML = html;
            container.style.display = 'block';
            btn.textContent = '📍 Amagar mapa';
        } else {
            // Si no hi ha contingut, mostrar missatge
            document.getElementById('mapaPresenciaContent').innerHTML = `
                <p style="color: #666; text-align: center; padding: 1rem;">
                    No s'ha trobat informació de mapa de presència per aquest torn.
                </p>
            `;
            container.style.display = 'block';
            btn.textContent = '📍 Amagar mapa';
        }
    } else {
        container.style.display = 'none';
        btn.textContent = '📍 Mapa de presència';
    }
}

// Funció per mostrar l'any actual al footer
document.getElementById('current-year').textContent = new Date().getFullYear();

// ======= INICIAR APLICACIÓ =======

inicialitzaAplicacio();


