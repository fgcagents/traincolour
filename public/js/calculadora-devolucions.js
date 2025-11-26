 document.addEventListener("DOMContentLoaded", () => {
    console.log("Això només s'executa a la pàgina 1.");
    // Afegir aquí funcionalitats específiques de calculadora devolucions.
const bitllets = {
    "Senzill 1Z": 2.65,
    "Senzill 2Z": 3.80,
    "Senzill 3Z": 4.95,
    "PENSTA B 50% 1Z": 1.35,
    "PENSTA B 50% 2Z": 1.9,
    "PENSTA B 50% 3Z": 2.5,
    "PENSTA A 75% 1Z": 0.65,
    "PENSTA A 75% 2Z": 0.95,
    "PENSTA A 75% 3Z": 1.25,
    "F.N. CAT GEN 20% 1Z": 2.10,
    "F.N. CAT GEN 20% 2Z": 3.05,
    "F.N. CAT GEN 20% 3Z": 3.95,
};

document.getElementById('formulari').addEventListener('submit', function (e) {
    e.preventDefault();
    const importObjectiu = parseFloat(document.getElementById('import').value);
    const errorDiv = document.getElementById('error');
    const resultatDiv = document.getElementById('resultat');
    const detallsDiv = document.getElementById('detalls');

    if (isNaN(importObjectiu) || importObjectiu <= 0 || importObjectiu > 20) {
        errorDiv.classList.add('visible');
        errorDiv.textContent = 'Si us plau, introdueix un import vàlid entre 0,05 i 20 €.';
        resultatDiv.classList.remove('visible');
        return;
    } else {
        errorDiv.classList.remove('visible');
    }

    resultatDiv.classList.add('visible');
    detallsDiv.innerHTML = 'Calculant...';

    const combinacio = trobarCombinacio(importObjectiu);

    if (combinacio) {
        detallsDiv.innerHTML = generarTaula(combinacio);
    } else {
        detallsDiv.innerHTML = `<strong>Error:</strong> No s'ha trobat cap combinació possible per aquest import.`;
    }
});

function trobarCombinacio(importObjectiu, maxQuantitat = 10) {
    const nomsBitllets = Object.keys(bitllets);
    const preusBitllets = Object.values(bitllets);
    const n = preusBitllets.length;

    let millorCombinacio = null;
    let menorBitllets = Infinity;

    for (let compres = 1; compres <= maxQuantitat; compres++) {
        for (let vendes = 1; vendes <= maxQuantitat; vendes++) {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    const total = preusBitllets[i] * compres - preusBitllets[j] * vendes;

                    if (Math.abs(total - importObjectiu) < 0.01) {
                        const totalBitllets = compres + vendes;

                        if (totalBitllets < menorBitllets) {
                            millorCombinacio = [
                                { tipus: nomsBitllets[i], quantitat: compres, accio: 'Anul·lar' },
                                { tipus: nomsBitllets[j], quantitat: vendes, accio: 'Comprar' }
                            ];
                            menorBitllets = totalBitllets;
                        }
                    }
                }
            }
        }
    }

    return millorCombinacio;
}

function generarTaula(combinacio) {
    let taulaHTML = `
        <table>
            <thead>
                <tr>
                    <th>Acció</th>
                    <th>Quantitat</th>
                    <th>Tipus</th>
                </tr>
            </thead>
            <tbody>
    `;
    let total = 0;

    combinacio.forEach(item => {
        taulaHTML += `
            <tr>
                <td>${item.accio}</td>
                <td>${item.quantitat}</td>
                <td>${item.tipus}</td>
            </tr>
        `;
        const preuBitllet = bitllets[item.tipus];
        total += item.accio === 'Comprar' ? preuBitllet * item.quantitat : -preuBitllet * item.quantitat;
    });

    taulaHTML += `
            </tbody>
        </table>
        <p class="import-total"><strong>Total:</strong> ${total.toFixed(2)} €</p>
    `;
    return taulaHTML;
}

document.getElementById('current-year').textContent = new Date().getFullYear();

});
