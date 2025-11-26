document.addEventListener('DOMContentLoaded', function() {
    console.log("Això només s'executa a la pàgina 1.");
    // Afegir aquí funcionalitats específiques de Pantalles ISIC.
var img = document.getElementById("isic-next-pc");
var searchInput = document.getElementById("station-search");
var searchResults = document.querySelector(".search-results");
var currentURL = "https://geotren.fgc.cat/isic/pc?_=";

var sources = [
    {name: "Gràcia", url: "https://geotren.fgc.cat/isic/gr?_="},
    {name: "Sant Gervasi", url: "https://geotren.fgc.cat/isic/sg?_="},
    {name: "Peu del Funicular", url: "https://geotren.fgc.cat/isic/pf?_="},
    {name: "Baixador de Vallvidrera", url: "https://geotren.fgc.cat/isic/vl?_="},
    {name: "Mira-Sol", url: "https://geotren.fgc.cat/isic/ms?_="},
    {name: "Hospital General", url: "https://geotren.fgc.cat/isic/hg?_="},
    {name: "Volpelleres", url: "https://geotren.fgc.cat/isic/vo?_="},
    {name: "Can Feu - Gràcia", url: "https://geotren.fgc.cat/isic/cf?_="},
    {name: "Sabadell Nord", url: "https://geotren.fgc.cat/isic/no?_="},
    {name: "Sabadell Parc del Nord", url: "https://geotren.fgc.cat/isic/pn?_="},
    {name: "Provença", url: "https://geotren.fgc.cat/isic/pr?_="},
    {name: "Sarrià", url: "https://geotren.fgc.cat/isic/sr?_="},
    {name: "Reina Elisenda", url: "https://geotren.fgc.cat/isic/re?_="},
    {name: "La Floresta", url: "https://geotren.fgc.cat/isic/lf?_="},
    {name: "Terrassa - Rambla", url: "https://geotren.fgc.cat/isic/tr?_="},
    {name: "Bellaterra", url: "https://geotren.fgc.cat/isic/bt?_="},
    {name: "Universitat Autònoma", url: "https://geotren.fgc.cat/isic/un?_="},
    {name: "Gornal", url: "https://geotren.fgc.cat/isic/go?_="},
    {name: "Almeda", url: "https://geotren.fgc.cat/isic/al?_="},
    {name: "Molí Nou", url: "https://geotren.fgc.cat/isic/ml?_="},
    {name: "Pl. Catalunya", url: "https://geotren.fgc.cat/isic/pc?_="},
    {name: "Les Planes", url: "https://geotren.fgc.cat/isic/lp?_="},
    {name: "Sant Joan", url: "https://geotren.fgc.cat/isic/sj?_="},
    {name: "Vallparadís Universitat", url: "https://geotren.fgc.cat/isic/vp?_="},
    {name: "Magòria La Campana", url: "https://geotren.fgc.cat/isic/mg?_="},
    {name: "Ildefons Cerdà", url: "https://geotren.fgc.cat/isic/ic?_="},
    {name: "L'Hospitalet", url: "https://geotren.fgc.cat/isic/lh?_="},
    {name: "Quatre Camins", url: "https://geotren.fgc.cat/isic/qc?_="},
    {name: "Muntaner", url: "https://geotren.fgc.cat/isic/mn?_="},
    {name: "Pàdua", url: "https://geotren.fgc.cat/isic/pd?_="},
    {name: "El Putxet", url: "https://geotren.fgc.cat/isic/ep?_="},
    {name: "Av. Tibidabo", url: "https://geotren.fgc.cat/isic/tb?_="},
    {name: "Les Fonts", url: "https://geotren.fgc.cat/isic/fn?_="},
    {name: "Sant Josep", url: "https://geotren.fgc.cat/isic/sp?_="},
    {name: "Sant Boi", url: "https://geotren.fgc.cat/isic/bo?_="},
    {name: "Europa | Fira", url: "https://geotren.fgc.cat/isic/eu?_="},
    {name: "La Bonanova", url: "https://geotren.fgc.cat/isic/bn?_="},
    {name: "Les Tres Torres", url: "https://geotren.fgc.cat/isic/tt?_="},
    {name: "Pl. Molina", url: "https://geotren.fgc.cat/isic/pm?_="},
    {name: "Valldoreix", url: "https://geotren.fgc.cat/isic/vd?_="},
    {name: "Sant Cugat Centre", url: "https://geotren.fgc.cat/isic/sc?_="},
    {name: "Rubí Centre", url: "https://geotren.fgc.cat/isic/rb?_="},
    {name: "Sant Quirze", url: "https://geotren.fgc.cat/isic/sq?_="},
    {name: "Terrassa E. del nord", url: "https://geotren.fgc.cat/isic/en?_="},
    {name: "Terrassa Nacions Unides", url: "https://geotren.fgc.cat/isic/na?_="},
    {name: "Pl. Espanya", url: "https://geotren.fgc.cat/isic/pe?_="},
    {name: "Cornellà Riera", url: "https://geotren.fgc.cat/isic/co?_="},
    {name: "Sabadell Plaça Major", url: "https://geotren.fgc.cat/isic/pj?_="},
    {name: "La Creu Alta", url: "https://geotren.fgc.cat/isic/ct?_="},
    {name: "Monistrol", url: "https://geotren.fgc.cat/isic/mo?_="},
];

// Ordenar las fuentes alfabéticamente
sources.sort(function(a, b) {
    return a.name.localeCompare(b.name);
});

// Filtrar y mostrar las estaciones según el texto ingresado
searchInput.addEventListener("input", function() {
    var searchTerm = searchInput.value.toLowerCase();
    searchResults.innerHTML = "";
    sources.forEach(function(source) {
        if (source.name.toLowerCase().includes(searchTerm)) {
            var div = document.createElement("div");
            div.setAttribute("data-value", source.url);
            div.textContent = source.name;
            searchResults.appendChild(div);
        }
    });
    searchResults.style.display = searchTerm === "" ? "none" : "block";
});

// Manejar la selección de una estación
searchResults.addEventListener("click", function(e) {
    if (e.target && e.target.nodeName === "DIV") {
        searchInput.value = e.target.textContent;
        currentURL = e.target.getAttribute("data-value");
        updateImage();
        searchResults.innerHTML = "";
        searchResults.style.display = "none";
        searchInput.blur(); // Desenfocar el campo de búsqueda
    }
});

function updateImage() {
    img.src = currentURL + "&_=" + new Date().getTime();
}

// Actualiza la imagen cada 10 segundos
setInterval(updateImage, 10000);

// Cerrar el menú si se hace clic fuera de él y reiniciar el campo de búsqueda
document.addEventListener("click", function(e) {
    if (!document.querySelector(".search-container").contains(e.target)) {
        searchResults.style.display = "none";
        if (sources.every(source => source.name !== searchInput.value)) {
            searchInput.value = "";
        }
    }
});

// Funció per mostrar l'any actual al footer
document.getElementById('current-year').textContent = new Date().getFullYear();
});