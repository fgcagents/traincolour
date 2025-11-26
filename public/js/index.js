// Funció per obtenir l'hora actual en format HH:MM
    function getCurrentTime() {
        const currentDate = new Date();
        return currentDate.toTimeString().slice(0, 5); // Retornem només HH:MM
    }

    // Funció per corregir hores com 24:25 a 00:25
    function corregirHora(horaStr) {
        let [hores, minuts] = horaStr.split(':').map(Number);
        if (hores >= 24) {
            hores -= 24;
            return `${hores.toString().padStart(2, '0')}:${minuts.toString().padStart(2, '0')}`;
        }
        return horaStr;
    }

    // Funció per obtenir les dades de l'API i mostrar-les
    async function fetchTrainData(stationCode, trainCount, selectedTime, lineName) {
        let url = `https://fgc.opendatasoft.com/api/records/1.0/search/?dataset=viajes-de-hoy&rows=1000&q=stop_id:${stationCode}`;

        try {
            let response = await fetch(url);
            let data = await response.json();

            // Si no hay resultados y el código es 'NA', buscar por nombre de estación
            if (stationCode.toUpperCase() === 'NA' && (!data.records || data.records.length === 0)) {
            url = `https://fgc.opendatasoft.com/api/records/1.0/search/?dataset=viajes-de-hoy&rows=1000&q=stop_name:"nacions unides" OR stop_name:"NACIONS UNIDES" OR stop_name:"Nacions Unides"`;
            response = await fetch(url);
            data = await response.json();
            }

            // Si no s'ha seleccionat cap hora, fem servir l'hora actual
            let current_time = selectedTime || getCurrentTime();

            if (data.records && data.records.length > 0) {
                const upcoming_trains = data.records
                    .map(record => record.fields)
                    .filter(train => train.departure_time >= current_time)
                    .filter(train => lineName === '' || train.route_short_name.toLowerCase() === lineName.toLowerCase())
                    .sort((a, b) => a.departure_time.localeCompare(b.departure_time));

                displayTrains(upcoming_trains, trainCount);
            } else {
                console.log('No s\'han trobat trens.');
                const scheduleDiv = document.getElementById('train-schedule');
                scheduleDiv.innerHTML = '<div class="no-trains">No s\'han trobat trens disponibles</div>';
            }
        } catch (error) {
            console.error('Error obtenint dades de l\'API:', error);
            const scheduleDiv = document.getElementById('train-schedule');
            scheduleDiv.innerHTML = '<div class="error">Error en obtenir les dades</div>';
        }
    }

    // Funció per mostrar els trens a la pantalla
    function displayTrains(trains, trainCount) {
        const scheduleDiv = document.getElementById('train-schedule');
        scheduleDiv.innerHTML = '';  // Esborrem el contingut anterior

        trains.slice(0, trainCount).forEach(train => {
            const trainDiv = document.createElement('div');
            trainDiv.className = 'train';

            const lineIcon = document.createElement('div');
            lineIcon.className = `line-icon ${train.route_short_name.toLowerCase()}`;
            lineIcon.textContent = train.route_short_name;

            const destination = document.createElement('div');
            destination.className = 'destination';
            destination.textContent = train.trip_headsign;

            const time = document.createElement('div');
            time.className = 'time';
            time.textContent = corregirHora(train.departure_time);

            trainDiv.appendChild(lineIcon);
            trainDiv.appendChild(destination);
            trainDiv.appendChild(time);

            scheduleDiv.appendChild(trainDiv);
        });
    }

    // Llistar trens inicialment amb valors per defecte
    document.getElementById('station-form').addEventListener('submit', function(event) {
        event.preventDefault();

        // Obtenir valors del formulari
        const stationCode = document.getElementById('station-code').value;
        const trainCount = document.getElementById('train-count').value;
        const lineName = document.getElementById('line-name').value;
        let selectedTime = document.getElementById('selected-time').value;

        // Si no s'ha seleccionat cap hora, agafem l'hora actual
        if (!selectedTime) {
            selectedTime = getCurrentTime();
        }

        // Actualitzar el nom de l'estació
        document.getElementById('station-name').textContent = stationCode;

        // Obtenir i mostrar els trens
        fetchTrainData(stationCode, trainCount, selectedTime, lineName);

    });
    document.getElementById('current-year').textContent = new Date().getFullYear();