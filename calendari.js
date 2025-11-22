// ======= VARIABLES GLOBALS =======
let TORNS = {};
let CALENDARI = {};
let SERVEI_DIA_ACTUAL = 'N/A';
let DADES_CARREGADES = false;
let TORN_SELECCIONAT = null;

// ======= FUNCIONS DE PARSEIG =======
function parseDateISO(dateStr) {
  if (!dateStr) return '';
  if (dateStr.match(/^d{4}-d{2}-d{2}$/)) {
    return dateStr;
  }
  const parts = dateStr.split(/[-/]/);
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
  if (time.match(/^d{1,2}:d{2}$/)) {
    const parts = time.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }
  if (time.match(/^d{1,2}:d{2}:d{2}$/)) {
    return time.substring(0, 5);
  }
  return time;
}

// Sempre retorna codis de 3 caràcters, ja sigui de comes o agrupats
function parseServiceCodes(serviceValue) {
  if (serviceValue === null || serviceValue === undefined) return [];
  const serviceStr = String(serviceValue).replace(/s+/g, "");
  if (serviceStr.includes(",")) {
    return serviceStr.split(",").map(c=>c.padStart(3,"0"));
  }
  // Si està agrupat en blocs de 3
  const codis = [];
  for (let i = 0; i < serviceStr.length; i += 3) {
    codis.push(serviceStr.substring(i,i+3).padStart(3,"0"));
  }
  if (codis.length===0 && serviceStr) codis.push(serviceStr.padStart(3, "0"));
  return codis;
}

// ======= CARREGA I TRANSFORMACIÓ DE DADES =======
async function carregarDadesJSON() {
  try {
    const [tornResponse, calendariResponse] = await Promise.all([
      fetch("torn.json"),
      fetch("calendari.json"),
    ]);
    if (!tornResponse.ok || !calendariResponse.ok) throw new Error("No es poden carregar dades JSON");
    const tornsArray = await tornResponse.json();
    const calendariArray = await calendariResponse.json();
    transformarDades(tornsArray, calendariArray);
    DADES_CARREGADES = true;
  } catch (error) {
    mostrarError("Error carregant dades: " + error.message);
    console.error(error);
  }
}

function transformarDades(tornsArray, calendariArray) {
  TORNS = {};
  tornsArray.forEach((tornItem) => {
    const tornId = tornItem.Torn ? String(tornItem.Torn).toUpperCase() : "";
    if (!tornId) return;
    const serveis = [];
    for (let i = 1; i < 4; i++) {
      const serveiCol = "Servei" + i;
      const iniciCol = "Inici S" + i;
      const finalCol = "Final S" + i;
      if (tornItem[serveiCol] && tornItem[iniciCol] && tornItem[finalCol]) {
        const codis = parseServiceCodes(tornItem[serveiCol]);
        serveis.push({ codis, inici: formatTime(tornItem[iniciCol]), fi: formatTime(tornItem[finalCol]) });
      }
    }
    if (serveis.length === 0) return;
    TORNS[tornId] = {
      id: tornId,
      linia: tornItem.Línia || tornItem.Linia || "",
      zona: tornItem.Zona || "",
      serveis
    };
  });

  CALENDARI = {};
  calendariArray.forEach((diaItem) => {
    if (diaItem.Data) {
      const dataISO = parseDateISO(diaItem.Data);
      CALENDARI[dataISO] = {
        // Servei sempre trim i 3 caràcters
        servei: String(diaItem.ServeiBV || diaItem["Servei BV"] || "").trim().padStart(3,"0"),
        diasetmana: diaItem.DiaSet,
        diames: diaItem.DiaMes,
        dianum: diaItem.DiaNum
      };
    }
  });
}

// ======= INICIALITZACIÓ =======
async function inicialitzaAplicacio() {
  await carregarDadesJSON();
  if (DADES_CARREGADES) inicialitzarUI();
}

function inicialitzarUI() {
  const avui = new Date().toISOString().split("T")[0];
  document.getElementById("dateSelector").value = avui;
  actualitzarServeiDia(avui);
  document.getElementById("dateSelector").addEventListener("change", handleDateChange);
  document.getElementById("searchInput").addEventListener("input", handleSearch);
  document.getElementById("searchInput").addEventListener("focus", () => mostrarAutocomplete(document.getElementById("searchInput").value));
  document.addEventListener("click", handleClickOutside);
}

// ======= GESTIÓ D'ESDEVENIMENTS =======
function handleDateChange(event) {
  const data = event.target.value;
  actualitzarServeiDia(data);
  if (TORN_SELECCIONAT) setTimeout(() => cercarHorari(TORN_SELECCIONAT), 100);
}

function actualitzarServeiDia(data) {
  const diaInfo = CALENDARI[data];
  const badge = document.getElementById("serviceBadge");
  if (diaInfo && diaInfo.servei) {
    SERVEI_DIA_ACTUAL = diaInfo.servei;
    let serveiText = diaInfo.servei;
    if (serveiText === "800") serveiText = "800/200";
    else if (serveiText === "900") serveiText = "900/300";
    badge.innerHTML = `<div class="service-badge"><div class="service-label">SERVEI DEL DIA</div><div class="service-value">${serveiText}</div></div>`;
  } else {
    SERVEI_DIA_ACTUAL = "N/A";
    badge.innerHTML = `<div class="warning-box">No s'ha trobat informació per aquesta data</div>`;
  }
}

// ======= AUTOCOMPLETAR I SELECCIÓ =======
function handleSearch(event) {
  const query = event.target.value.toUpperCase();
  mostrarAutocomplete(query);
}

function mostrarAutocomplete(query) {
  const dropdown = document.getElementById("autocompleteDropdown");
  if (!query || !DADES_CARREGADES) {
    dropdown.style.display = "none";
    return;
  }
  const tornsFiltrats = Object.keys(TORNS).filter(torn => torn.includes(query)).slice(0, 8);
  if (tornsFiltrats.length === 0) {
    dropdown.innerHTML = "";
    dropdown.style.display = "none";
  } else {
    dropdown.innerHTML = tornsFiltrats
      .map(tornId => {
        const torn = TORNS[tornId];
        return `
        <div class="autocomplete-item" onclick="seleccionarTorn('${tornId}')">
          <div class="autocomplete-label">${tornId}</div>
          <div class="autocomplete-meta">Línia: ${torn.linia} / Zona: ${torn.zona}</div>
        </div>`;
      })
      .join("");
    dropdown.style.display = "block";
  }
}

function seleccionarTorn(tornId) {
  document.getElementById("searchInput").value = tornId;
  document.getElementById("autocompleteDropdown").style.display = "none";
  TORN_SELECCIONAT = tornId.toUpperCase();
  cercarHorari(TORN_SELECCIONAT);
}

function handleClickOutside(event) {
  const searchContainer = document.querySelector(".custom-card:nth-child(3)");
  if (!searchContainer.contains(event.target)) {
    document.getElementById("autocompleteDropdown").style.display = "none";
  }
}

// ======= LÒGICA DE CERCA =======
function obtenirServeiEfectiu(serveiDia, liniaTorn) {
  // Per LA: 800=>200, 900=>300, si cal
  if (liniaTorn === "LA") {
    if (serveiDia === "800") return "200";
    if (serveiDia === "900") return "300";
  }
  return serveiDia;
}

function cercarHorari(tornId) {
  if (!DADES_CARREGADES) return;
  const id = tornId || TORN_SELECCIONAT || document.getElementById("searchInput").value;
  if (!id) {
    SERVEI_DIA_ACTUAL = "N/A";
    mostrarEmptyState();
    return;
  }
  const torn = TORNS[id.toUpperCase()];
  if (!torn) {
    mostrarEmptyState();
    return;
  }

  // Normalitza sempre a tres caràcters
  const serveiEfectiu = obtenirServeiEfectiu(SERVEI_DIA_ACTUAL, torn.linia).padStart(3,"0");
  const prefix = serveiEfectiu.substring(0,2);

  const resultats = [];
  torn.serveis.forEach(servei => {
    // Per cada codi normalitza a tres caràcters i compara dos primers
    if (servei.codis.some(codi => codi.padStart(3,"0").substring(0,2) === prefix)) {
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
  const container = document.getElementById("resultsContainer");
  const emptyState = document.getElementById("emptyState");
  if (resultats.length === 0) {
    mostrarEmptyState();
    return;
  }
  emptyState.classList.remove("active");
  container.innerHTML =
    `<div class="success-banner">Horari trobat per ${tornCercat}</div>
    <div class="results-card">
      <table>
        <thead><tr><th>Torn</th><th>Inici</th><th>Fi</th><th>Línia</th><th>Zona</th></tr></thead>
        <tbody>
          ${resultats
            .map(
              r =>
                `<tr><td>${r.torn}</td><td>${r.inici}</td><td>${r.fi}</td><td>${r.linia}</td><td>${r.zona}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function mostrarEmptyState() {
  document.getElementById("resultsContainer").innerHTML = "";
  document.getElementById("emptyState").classList.add("active");
}
function mostrarError(missatge) {
  document.getElementById("serviceBadge").innerHTML = `<div class="error-box">${missatge}</div>`;
}

// Footer any actual
document.getElementById("current-year").textContent = new Date().getFullYear();

// ======= INICI =======
inicialitzaAplicacio();
