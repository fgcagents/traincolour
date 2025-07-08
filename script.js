// Afegir event listener per al camp de referència d'estació
document.getElementById('stationReference').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        loadStationData();
    }
});

document.getElementById('loadStation').addEventListener('click', function() {
    loadStationData();
});

// Carregar dades d'estacions
let estacions = [];

fetch('estacions.json')
  .then(response => response.text())
  .then(text => {
    try {
      let rawData = JSON.parse(text);
      
      // Filtrar entrades vàlides
      estacions = rawData.filter(estacio => {
        return estacio && 
               estacio.ID && 
               estacio.Nom && 
               typeof estacio.ID === 'string' && 
               typeof estacio.Nom === 'string';
      });
      
      console.log(`Carregades ${estacions.length} estacions vàlides`);
      
    } catch (error) {
      console.warn('JSON amb errors, intentant arreglar...');
      
      const fixedText = text
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}');
      
      try {
        let rawData = JSON.parse(fixedText);
        
        // Filtrar entrades vàlides
        estacions = rawData.filter(estacio => {
          return estacio && 
                 estacio.ID && 
                 estacio.Nom && 
                 typeof estacio.ID === 'string' && 
                 typeof estacio.Nom === 'string';
        });
        
        console.log(`JSON arreglat. Carregades ${estacions.length} estacions vàlides`);
        
      } catch (secondError) {
        console.error('No s\'ha pogut arreglar el JSON:', secondError);
        estacions = [
          { "ID": "ESCAT0800000008750B", "Nom": "Molins de Rei" },
          { "ID": "ESCAT0800000008591B", "Nom": "Aiguafreda Aj." }
        ];
      }
    }
  })
  .catch(error => {
    console.error('Error carregant estacions:', error);
    estacions = [
      { "ID": "ESCAT0800000008750B", "Nom": "Molins de Rei" },
      { "ID": "ESCAT0800000008591B", "Nom": "Aiguafreda Aj." }
    ];
  });

// Funcionalitat de cerca amb autocompletat
const stationInput = document.getElementById('stationReference');
const suggestionsList = document.getElementById('suggestionsList');

stationInput.addEventListener('input', function() {
  const query = this.value.toLowerCase().trim();
  
  if (query.length < 2) {
    suggestionsList.style.display = 'none';
    return;
  }
  
  // Buscar estacions que coincideixin amb el nom o ID
  const matches = estacions.filter(estacio => {
    if (!estacio || !estacio.Nom || !estacio.ID) {
      return false;
    }
    
    const nom = String(estacio.Nom).toLowerCase();
    const id = String(estacio.ID).toLowerCase();
    
    return nom.includes(query) || id.includes(query);
  }).slice(0, 10);
  
  if (matches.length === 0) {
    suggestionsList.style.display = 'none';
    return;
  }
  
  suggestionsList.innerHTML = matches.map(estacio => {
    const nom = estacio.Nom || 'Nom desconegut';
    const id = estacio.ID || 'ID desconegut';
    
    return `
      <div class="suggestion-item" data-id="${id}">
        <span class="suggestion-name">${nom}</span>
        <span class="suggestion-id">${id}</span>
      </div>
    `;
  }).join('');
  
  suggestionsList.style.display = 'block';
});

// Gestionar selecció de suggeriment
suggestionsList.addEventListener('click', function(e) {
  const suggestionItem = e.target.closest('.suggestion-item');
  if (suggestionItem) {
    const selectedId = suggestionItem.dataset.id;
    stationInput.value = selectedId;
    suggestionsList.style.display = 'none';
  }
});

// Amagar suggeriments quan es fa clic fora
document.addEventListener('click', function(e) {
  if (!stationInput.contains(e.target) && !suggestionsList.contains(e.target)) {
    suggestionsList.style.display = 'none';
  }
});

// Funcionalitat de teclat per als suggeriments
stationInput.addEventListener('keydown', function(e) {
  const suggestions = suggestionsList.querySelectorAll('.suggestion-item');
  const activeSuggestion = suggestionsList.querySelector('.suggestion-item.active');
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (activeSuggestion) {
      activeSuggestion.classList.remove('active');
      const next = activeSuggestion.nextElementSibling;
      if (next) {
        next.classList.add('active');
      } else {
        suggestions[0].classList.add('active');
      }
    } else if (suggestions.length > 0) {
      suggestions[0].classList.add('active');
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (activeSuggestion) {
      activeSuggestion.classList.remove('active');
      const prev = activeSuggestion.previousElementSibling;
      if (prev) {
        prev.classList.add('active');
      } else {
        suggestions[suggestions.length - 1].classList.add('active');
      }
    } else if (suggestions.length > 0) {
      suggestions[suggestions.length - 1].classList.add('active');
    }
  } else if (e.key === 'Enter') {
    if (activeSuggestion) {
      e.preventDefault();
      const selectedId = activeSuggestion.dataset.id;
      stationInput.value = selectedId;
      suggestionsList.style.display = 'none';
    } else {
      loadStationData();
    }
  } else if (e.key === 'Escape') {
    suggestionsList.style.display = 'none';
  }
});

function loadStationData() {
    const stationRef = document.getElementById('stationReference').value.trim();
    if (!stationRef) {
        alert('Si us plau, introdueix una referència d\'estació');
        return;
    }
    // ...eliminado mensaje de carga...
    document.getElementById('weatherInfo').classList.remove('show');
    document.querySelector('.upload-section').style.display = 'none';
    const feedUrl = `https://corsproxy.io/?http://meteoclimatic.net/feed/rss/${stationRef}`;
    fetch(feedUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return response.text();
        })
        .then(xmlText => {
            processXml(xmlText);
        })
        .catch(error => {
            console.error('Error:', error);
            document.querySelector('.upload-section').style.display = 'block';
        });
}

// Botó per carregar Molins de Rei
document.getElementById('fetchXml').addEventListener('click', function () {
    document.getElementById('weatherInfo').classList.remove('show');
    document.querySelector('.upload-section').style.display = 'none';
    fetch('https://corsproxy.io/?http://meteoclimatic.net/feed/rss/ESCAT0800000008750B')
        .then(response => response.text())
        .then(xmlText => {
            processXml(xmlText);
        })
        .catch(() => {
            document.querySelector('.upload-section').style.display = 'block';
        });
});

function decodeHtmlEntities(str) {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

function processXml(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'application/xml');
    const item = xml.querySelector('item');
    const pubDate = item ? item.querySelector('pubDate')?.textContent : '';

    let lat = '';
    let lon = '';

    const geoPointEl = item ? item.getElementsByTagName('georss:point')[0] : null;
    if (geoPointEl) {
        [lat, lon] = geoPointEl.textContent.trim().split(' ');
    } else {
        const latEl = item ? item.getElementsByTagName('geo:lat')[0] : null;
        const lonEl = item ? item.getElementsByTagName('geo:long')[0] : null;
        if (latEl && lonEl) {
            lat = latEl.textContent.trim();
            lon = lonEl.textContent.trim();
        }
    }

    const dataRegex = /\[\[<([A-Z0-9]+);\(([^)]+)\);\(([^)]+)\);\(([^)]+)\);\(([^)]+)\);\(([^)]+)\);(.+?)>\]\]/;
    const match = xmlText.match(dataRegex);

    if (!match) {
        return;
    }

    const [, codiEstacio, temperatura, humitat, pressio, vent, precipitacio, nomEstacio] = match;
    const [tempAct, tempMax, tempMin] = temperatura.split(';');
    const [humAct, humMax, humMin] = humitat.split(';');
    const [presAct, presMax, presMin] = pressio.split(';');
    const [ventAct, ventMax, ventDir] = vent.split(';');
    const pluja = precipitacio;

    const formattedDate = new Date(pubDate).toLocaleString('ca-ES');

    document.getElementById('stationName').textContent = decodeHtmlEntities(nomEstacio);
    document.getElementById('stationCode').textContent = decodeHtmlEntities(codiEstacio);
    document.getElementById('lastUpdate').textContent = formattedDate;

    document.getElementById('tempCurrent').textContent = `${tempAct}°C`;
    document.getElementById('tempMin').textContent = `${tempMin}°C`;
    document.getElementById('tempMax').textContent = `${tempMax}°C`;

    document.getElementById('humCurrent').textContent = `${humAct}%`;
    document.getElementById('humMin').textContent = `${humMin}%`;
    document.getElementById('humMax').textContent = `${humMax}%`;

    document.getElementById('presCurrent').textContent = `${presAct} hPa`;
    document.getElementById('presMin').textContent = `${presMin} hPa`;
    document.getElementById('presMax').textContent = `${presMax} hPa`;

    document.getElementById('ventCurrent').textContent = `${ventAct} km/h`;
    document.getElementById('ventMax').textContent = `${ventMax} km/h`;
    document.getElementById('ventDir').textContent = `${ventDir}°`;

    document.getElementById('precipitacio').textContent = `${pluja} mm`;

    if (lat && lon) {
        const mapButton = document.getElementById('mapButton');
        mapButton.style.display = 'block';
        mapButton.onclick = () => {
            window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank');
        };
    }

    document.getElementById('weatherInfo').classList.add('show');
    document.querySelector('.upload-section').style.display = 'none';
    document.getElementById('resetButton').style.display = 'block';
}

// Botó per reiniciar la cerca
document.getElementById('resetButton').addEventListener('click', function() {
    document.getElementById('weatherInfo').classList.remove('show');
    document.getElementById('resetButton').style.display = 'none';
    document.querySelector('.upload-section').style.display = 'block';
    document.getElementById('stationReference').value = '';
    document.getElementById('suggestionsList').style.display = 'none';
});