// VERSÃO 1.0 - Lógica de Fechamento Mensal e Dashboard

(function () {
    const monthSelect = document.getElementById('monthSelect');
    const monthTotalGasto = document.getElementById('monthTotalGasto');
    const monthMediaDiaria = document.getElementById('monthMediaDiaria');
    const monthTotalItens = document.getElementById('monthTotalItens');
    const daysListContainer = document.getElementById('daysListContainer');

    if (!monthSelect) return;

    // Define o mês atual como padrão (Formato YYYY-MM)
    const today = new Date();
    const currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    monthSelect.value = currentMonth;

    // Inicia o cálculo
    calcularMes(currentMonth);

    // Recalcula se o usuário trocar o mês
    monthSelect.addEventListener('change', (e) => {
        calcularMes(e.target.value);
    });

    // ==========================================
    // MOTOR DE CÁLCULO E RENDERIZAÇÃO
    // ==========================================
    function calcularMes(monthStr) {
        if (!window.db) {
            console.error("Banco de dados não está pronto.");
            return;
        }

        const tx = window.db.transaction(['purchases'], 'readonly');
        const store = tx.objectStore('purchases');
        const index = store.index('month');
        const request = index.getAll(monthStr);

        request.onsuccess = () => {
            const compras = request.result || [];
            processarDadosDoMes(compras);
        };

        request.onerror = (err) => {
            console.error("Erro ao buscar dados do mês:", err);
            daysListContainer.innerHTML = '<p style="color:var(--danger); text-align:center;">Erro ao carregar os dados.</p>';
        };
    }

    function processarDadosDoMes(compras) {
        if (compras.length === 0) {
            monthTotalGasto.textContent = 'R$ 0,00';
            monthMediaDiaria.textContent = 'R$ 0,00';
            monthTotalItens.textContent = '0';
            daysListContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>Nenhuma compra registrada neste mês.</p>
                </div>`;
            return;
        }

        let totalGasto = 0;
        let totalItens = 0;
        const diasComprados = new Set();
        const gastosPorDia = {};

        // Varre todas as compras do mês
        compras.forEach(compra => {
            const custoTotalItem = compra.price * compra.quantity;
            totalGasto += custoTotalItem;
            totalItens += compra.quantity;
            diasComprados.add(compra.date);

            if (!gastosPorDia[compra.date]) {
                gastosPorDia[compra.date] = 0;
            }
            gastosPorDia[compra.date] += custoTotalItem;
        });

        const diasAtivos = diasComprados.size;
        const mediaDiaria = totalGasto / diasAtivos;

        // Atualiza os cartões (Dashboard)
        monthTotalGasto.textContent = formatCurrency(totalGasto);
        monthMediaDiaria.textContent = formatCurrency(mediaDiaria);
        monthTotalItens.textContent = Math.round(totalItens).toString();

        // Ordena os dias do mais recente para o mais antigo
        const diasOrdenados = Object.keys(gastosPorDia).sort((a, b) => new Date(b) - new Date(a));

        // Renderiza a lista de dias
        let htmlDias = '';
        diasOrdenados.forEach(dataStr => {
            htmlDias += `
                <div class="day-card">
                    <div class="day-info">
                        <i class="fas fa-calendar-day"></i>
                        <span class="day-date">${formatDate(dataStr)}</span>
                    </div>
                    <div class="day-total">
                        ${formatCurrency(gastosPorDia[dataStr])}
                    </div>
                </div>
            `;
        });

        daysListContainer.innerHTML = htmlDias;
    }
})();
