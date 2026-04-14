let listaCompleta = [];
let nombresActuales = [];
let anguloActual = 0;
let ganadorTemporal = "";
let contadorSorteo = 1;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const selector = document.getElementById('division-selector');
const listaUI = document.getElementById('lista-historial');
const fixtureUI = document.getElementById('fixture-container');

const paletaColores = ['#1e3a8a', '#991b1b', '#b45309', '#1e293b'];

function guardarTodo() {
    const estado = {
        listaCompleta,
        nombresActuales,
        contadorSorteo,
        divisionSeleccionada: selector.value,
        historialHTML: listaUI.innerHTML
    };
    localStorage.setItem('sorteo_master_config', JSON.stringify(estado));
}

function cargarTodo() {
    const guardado = localStorage.getItem('sorteo_master_config');
    if (!guardado) return;

    const estado = JSON.parse(guardado);
    listaCompleta = estado.listaCompleta || [];
    nombresActuales = estado.nombresActuales || [];
    contadorSorteo = estado.contadorSorteo || 1;
    listaUI.innerHTML = estado.historialHTML || "";

    if (listaCompleta.length > 0) {
        const divisiones = [...new Set(listaCompleta.map(item => item.Division).filter(Boolean))];
        selector.innerHTML = '<option value="">-- Seleccionar División --</option>';
        divisiones.forEach(div => {
            const opt = document.createElement('option');
            opt.value = div; opt.textContent = div;
            if (div === estado.divisionSeleccionada) opt.selected = true;
            selector.appendChild(opt);
        });
    }

    if (nombresActuales.length > 0) {
        dibujarRuleta();
        spinBtn.disabled = false;
    }
    actualizarFixtureUI();
}

window.onload = cargarTodo;

// GENERACIÓN DINÁMICA DE GRUPOS
function actualizarFixtureUI() {
    fixtureUI.innerHTML = '';
    
    // Obtenemos los nombres que ya salieron (en orden de aparición)
    const sorteados = Array.from(listaUI.querySelectorAll('li'))
                           .map(li => li.querySelector('span:last-child').innerText)
                           .reverse(); 

    // Solo creamos grupos para la cantidad de gente que hay actualmente (sorteados + los que quedan en ruleta)
    const totalPersonas = sorteados.length + nombresActuales.length;
    if (totalPersonas === 0) return;

    const numGrupos = Math.ceil(totalPersonas / 4);

    for (let i = 0; i < numGrupos; i++) {
        const box = document.createElement('div');
        box.className = 'grupo-box';
        box.innerHTML = `<h4>GRUPO ${i + 1}</h4>`;

        for (let j = 0; j < 4; j++) {
            const idx = (i * 4) + j;
            // Si el índice supera el total de personas posibles, no dibujamos ese slot vacío
            if (idx < totalPersonas) {
                const nombre = sorteados[idx] || "...";
                const slot = document.createElement('div');
                slot.className = 'jugador-slot';
                slot.innerHTML = `Pos ${j + 1} <span>${nombre}</span>`;
                box.appendChild(slot);
            }
        }
        fixtureUI.appendChild(box);
    }
}

document.getElementById('excel-input').addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
        const workbook = XLSX.read(evt.target.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        listaCompleta = data.map(item => ({
            Nombre: item.Nombre || item.Jugador || item.nombre,
            Division: item.Division || item.Categoría || item.division
        }));

        const divs = [...new Set(listaCompleta.map(p => p.Division).filter(Boolean))];
        selector.innerHTML = '<option value="">-- Seleccionar --</option>';
        divs.forEach(d => {
            const o = document.createElement('option');
            o.value = d; o.textContent = d;
            selector.appendChild(o);
        });
        guardarTodo();
    };
    reader.readAsBinaryString(e.target.files[0]);
});

selector.onchange = (e) => {
    const sel = e.target.value;
    if(!sel) return;
    nombresActuales = listaCompleta.filter(p => p.Division === sel).map(p => p.Nombre);
    
    const yaSorteados = Array.from(listaUI.querySelectorAll('li span:last-child')).map(s => s.innerText);
    nombresActuales = nombresActuales.filter(n => !yaSorteados.includes(n));

    dibujarRuleta();
    spinBtn.disabled = nombresActuales.length === 0;
    actualizarFixtureUI();
    guardarTodo();
};

function dibujarRuleta() {
    const cant = nombresActuales.length;
    if (cant === 0) {
        ctx.clearRect(0, 0, 500, 500);
        return;
    }
    const arco = (2 * Math.PI) / cant;
    ctx.clearRect(0, 0, 500, 500);

    nombresActuales.forEach((nom, i) => {
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = paletaColores[i % paletaColores.length];
        ctx.moveTo(250, 250);
        ctx.arc(250, 250, 240, i * arco, (i + 1) * arco);
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.stroke();
        
        ctx.translate(250, 250);
        ctx.rotate(i * arco + arco / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "white";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(nom, 230, 5);
        ctx.restore();
    });
}

// CORRECCIÓN: AGREGAR PARTICIPANTE MANUAL
document.getElementById('add-manual-btn').onclick = () => {
    const input = document.getElementById('manual-name');
    const nombre = input.value.trim();
    
    if (nombre) {
        nombresActuales.push(nombre);
        input.value = "";
        dibujarRuleta();
        actualizarFixtureUI(); // Actualiza los grupos para incluir el nuevo espacio
        spinBtn.disabled = false;
        guardarTodo();
    } else {
        alert("Escribe un nombre válido");
    }
};

spinBtn.onclick = () => {
    spinBtn.disabled = true;
    
    // 1. Aumentamos las vueltas (mínimo 25, máximo 35) para que gire con mucha fuerza
    const vueltas = 25 + Math.floor(Math.random() * 10); 
    
    // 2. El cálculo del destino se mantiene, pero con más vueltas acumuladas
    const destino = anguloActual + (vueltas * 360) + Math.random() * 360;
    canvas.style.transform = `rotate(${destino}deg)`;

    // 3. El tiempo debe subir a 8100 (8.1 segundos) para que la animación termine de frenar
    setTimeout(() => {
        anguloActual = destino % 360;
        const arcoGrados = 360 / nombresActuales.length;
        const indice = Math.floor(((360 - (anguloActual % 360)) % 360) / arcoGrados);
        ganadorTemporal = nombresActuales[indice];
        document.getElementById('ganador-nombre').innerText = ganadorTemporal;
        document.getElementById('modal').style.display = 'block';
    }, 8100); // <-- Cambiado de 5100 a 8100
};

document.getElementById('close-modal').onclick = () => {
    const idx = nombresActuales.indexOf(ganadorTemporal);
    if (idx > -1) {
        const li = document.createElement('li');
        li.innerHTML = `<span>#${contadorSorteo}</span> <span>${ganadorTemporal}</span>`;
        listaUI.prepend(li);
        contadorSorteo++;
        nombresActuales.splice(idx, 1);
    }
    document.getElementById('modal').style.display = 'none';
    dibujarRuleta();
    actualizarFixtureUI();
    spinBtn.disabled = nombresActuales.length === 0;
    guardarTodo();
};

document.getElementById('clear-history').onclick = () => {
    if(confirm("¿Limpiar historial y grupos?")) {
        listaUI.innerHTML = '';
        contadorSorteo = 1;
        const sel = selector.value;
        if(sel) {
            nombresActuales = listaCompleta.filter(p => p.Division === sel).map(p => p.Nombre);
        } else {
            nombresActuales = [];
        }
        dibujarRuleta();
        actualizarFixtureUI();
        guardarTodo();
    }
};