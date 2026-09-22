// VERSÃO 1.0 - Motor do Relatório Anual e Gráfico Dinâmico

(function () {
    const yearSelect = document.getElementById('yearSelect');
    const yearTotalEl = document.getElementById('yearTotal');
    const yearMediaEl = document.getElementById('yearMedia');
    const highestMonthEl = document.getElementById('highestMonth');
    const annualChart = document.getElementById('annualChart');

    if (!yearSelect) return;

    // Define o ano atual como padrão
    const currentYear = new Date().getFullYear().toString();
    yearSelect.value = currentYear;

    // Nomes dos meses para o gráfico
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    // Inicia o cálculo
    calcularAno(currentYear);

    // Recalcula se o usuário trocar o ano
    yearSelect.addEventListener('change', (e) => {
        calcularAno(e.target.value.toString());
    });

    // ==========================================
    // CÁLCULO E RENDERIZAÇÃO DO GRÁFICO
    // ==========================================
    function calcularAno(yearStr) {
        if (!window.db) return;

        const tx = window.db.transaction(['purchases'], 'readonly');
        const store = tx.objectStore('purchases');
        const index = store.index('year');
        const request = index.getAll(yearStr);

        request.onsuccess = () => {
            const compras = request.result || [];
            processarDadosDoAno(compras);
        };
    }

    function processarDadosDoAno(compras) {
        // Inicializa os 12 meses zerados
        const gastosPorMes = Array(12).fill(0);
        let totalAno = 0;

        compras.forEach(compra => {
            // A data vem como YYYY-MM-DD. Pegamos o MM (índice 1) e convertemos para inteiro (0 a 11)
            const mesIndex = parseInt(compra.date.split('-')[1], 10) - 1;
            const custoTotal = compra.price * compra.quantity;
            
            gastosPorMes[mesIndex] += custoTotal;
            totalAno += custoTotal;
        });

        // Cálculos do Dashboard
        const mesesAtivos = gastosPorMes.filter(valor => valor > 0).length || 1;
        const mediaMensal = totalAno / mesesAtivos;
        
        let maiorGasto = 0;
        let mesMaisCaro = "-";

        gastosPorMes.forEach((valor, index) => {
            if (valor > maiorGasto) {
                maiorGasto = valor;
                mesMaisCaro = monthNames[index];
            }
        });

        // Atualiza os cartões
        yearTotalEl.textContent = formatCurrency(totalAno);
        yearMediaEl.textContent = formatCurrency(mediaMensal);
        highestMonthEl.textContent = mesMaisCaro;

        // Renderiza o Gráfico de Barras
        renderizarGrafico(gastosPorMes, maiorGasto);
    }

    function renderizarGrafico(gastos, valorMaximo) {
        if (valorMaximo === 0) {
            annualChart.innerHTML = `
                <div class="empty-state" style="width:100%; grid-column:1/-1;">
                    <i class="fas fa-chart-line"></i>
                    <p>Sem dados para este ano.</p>
                </div>`;
            return;
        }

        let html = '';
        gastos.forEach((valor, index) => {
            // Define a altura da barra em % (com um mínimo de 2% para meses com gasto muito baixo)
            let altura = valorMaximo > 0 ? (valor / valorMaximo) * 100 : 0;
            if (valor > 0 && altura < 2) altura = 2; 

            // Formatação compacta para o topo da barra (ex: 1.2k)
            let valorFormatado = '';
            if (valor > 0) {
                valorFormatado = valor >= 1000 
                    ? (valor/1000).toFixed(1) + 'k' 
                    : Math.round(valor).toString();
            }

            // Destaca a barra do mês mais caro
            const activeClass = valor === valorMaximo ? 'highest' : '';

            html += `
                <div class="bar-wrapper">
                    <span class="bar-value">${valorFormatado}</span>
                    <div class="bar ${activeClass}" style="height: ${altura}%;"></div>
                    <span class="bar-label">${monthNames[index]}</span>
                </div>
            `;
        });

        annualChart.innerHTML = html;
    }

      // ==========================================
    // SISTEMA DE BACKUP (JSON)
    // ==========================================
    const btnExportar = document.getElementById('btnExportar');
    const btnImportar = document.getElementById('btnImportar');

    if (btnExportar) {
        btnExportar.addEventListener('click', async () => {
            if (!window.db) return alert("Banco de dados não conectado.");

            const tx = window.db.transaction(['purchases', 'products'], 'readonly');
            const reqCompras = tx.objectStore('purchases').getAll();
            const reqProdutos = tx.objectStore('products').getAll();

            Promise.all([
                new Promise(resolve => reqCompras.onsuccess = () => resolve(reqCompras.result)),
                new Promise(resolve => reqProdutos.onsuccess = () => resolve(reqProdutos.result))
            ]).then(([compras, produtos]) => {
                const dataAtual = new Date().toISOString().split('T')[0];
                
                // Monta o pacote de dados
                const backupData = {
                    appName: 'TopMercado',
                    version: '1.0',
                    date: dataAtual,
                    purchases: compras || [],
                    products: produtos || []
                };

                // Transforma em arquivo e força o download
                const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `TopMercado_Backup_${dataAtual}.json`;
                document.body.appendChild(a);
                a.click();
                
                // Limpeza
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            });
        });
    }

    if (btnImportar) {
        btnImportar.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validação simples
                    if (data.appName !== 'TopMercado') {
                        throw new Error("Arquivo de backup inválido.");
                    }

                    if (!confirm(`Restauração detectada (${data.date}).\nIsso apagará os lançamentos atuais e carregará o backup. Deseja continuar?`)) {
                        event.target.value = ''; // Reseta o input
                        return;
                    }

                    const tx = window.db.transaction(['purchases', 'products'], 'readwrite');
                    const storeCompras = tx.objectStore('purchases');
                    const storeProdutos = tx.objectStore('products');

                    // 1. Limpa os dados atuais
                    storeCompras.clear();
                    storeProdutos.clear();

                    // 2. Injeta os dados do backup
                    data.purchases.forEach(compra => storeCompras.add(compra));
                    data.products.forEach(produto => storeProdutos.add(produto));

                    tx.oncomplete = () => {
                        alert("Backup restaurado com sucesso!");
                        window.location.reload(); // Recarrega o app para atualizar tudo
                    };

                    tx.onerror = (err) => {
                        console.error("Erro na restauração:", err);
                        alert("Houve um erro ao restaurar os dados.");
                    };

                } catch (error) {
                    alert("Erro ao ler o arquivo. Certifique-se de que é um backup válido.");
                    console.error(error);
                }
                
                event.target.value = ''; // Reseta o input após tentar importar
            };
            
            reader.readAsText(file);
        });
    }
})();
