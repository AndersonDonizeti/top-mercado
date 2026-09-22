// VERSÃO 1.0 - Motor de Inteligência e Histórico de Produtos

(function () {
    const productSearch = document.getElementById('productSearch');
    const productSort = document.getElementById('productSort');
    const productsList = document.getElementById('productsList');
    const uniqueProductsCount = document.getElementById('uniqueProductsCount');

    if (!productSearch) return;

    let globalProductsData = []; // Armazena os dados processados na memória para filtrar rápido

    // Inicia a extração de dados
    carregarInteligenciaProdutos();

    // Eventos de Filtro e Ordenação
    productSearch.addEventListener('input', () => renderizarLista());
    productSort.addEventListener('change', () => renderizarLista());

    // ==========================================
    // MOTOR DE PROCESSAMENTO DE DADOS
    // ==========================================
    function carregarInteligenciaProdutos() {
        if (!window.db) return;

        const tx = window.db.transaction(['purchases'], 'readonly');
        const store = tx.objectStore('purchases');
        const request = store.getAll();

        request.onsuccess = () => {
            const compras = request.result || [];
            processarHistorico(compras);
        };

        request.onerror = (err) => {
            console.error("Erro ao carregar produtos:", err);
            productsList.innerHTML = '<p class="error-msg">Erro ao carregar os dados.</p>';
        };
    }

    function processarHistorico(compras) {
        if (compras.length === 0) {
            uniqueProductsCount.textContent = "0 produtos catalogados";
            productsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-boxes"></i>
                    <p>Você ainda não registrou nenhuma compra.</p>
                </div>`;
            return;
        }

        const mapaProdutos = {};

        // Agrupa todas as compras por produto (usando o nome normalizado como chave)
        compras.forEach(compra => {
            const key = normalizeName(compra.name);
            const custoTotal = compra.price * compra.quantity;

            if (!mapaProdutos[key]) {
                mapaProdutos[key] = {
                    name: compra.name,
                    frequency: 0,
                    totalSpent: 0,
                    minPrice: compra.price,
                    maxPrice: compra.price,
                    lastPrice: compra.price,
                    lastDate: compra.date
                };
            }

            const p = mapaProdutos[key];
            p.frequency += 1;
            p.totalSpent += custoTotal;
            
            // Atualiza Mínimo e Máximo
            if (compra.price < p.minPrice) p.minPrice = compra.price;
            if (compra.price > p.maxPrice) p.maxPrice = compra.price;

            // Atualiza Último Preço baseado na data mais recente
            if (new Date(compra.date) >= new Date(p.lastDate)) {
                p.lastPrice = compra.price;
                p.lastDate = compra.date;
            }
        });

        // Converte o objeto em array para facilitar a ordenação
        globalProductsData = Object.values(mapaProdutos);
        uniqueProductsCount.textContent = `${globalProductsData.length} produtos catalogados`;
        
        renderizarLista();
    }

    // ==========================================
    // RENDERIZAÇÃO E ORDENAÇÃO
    // ==========================================
    function renderizarLista() {
        const termoBusca = productSearch.value.trim().toLowerCase();
        const criterioOrdenacao = productSort.value;

        // 1. Filtra pela busca
        let filtrados = globalProductsData.filter(p => 
            p.name.toLowerCase().includes(termoBusca)
        );

        // 2. Ordena
        filtrados.sort((a, b) => {
            if (criterioOrdenacao === 'frequency') {
                return b.frequency - a.frequency; // Mais comprados primeiro
            } else if (criterioOrdenacao === 'totalSpent') {
                return b.totalSpent - a.totalSpent; // Maior gasto primeiro
            } else if (criterioOrdenacao === 'az') {
                return a.name.localeCompare(b.name); // Ordem alfabética
            }
            return 0;
        });

        // 3. Renderiza o HTML
        if (filtrados.length === 0) {
            productsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>Nenhum produto encontrado com este nome.</p>
                </div>`;
            return;
        }

        let html = '';
        filtrados.forEach(p => {
            // Define cor do indicador (Verde se o último preço for o mínimo, vermelho se for o máximo)
            let statusColor = 'var(--text-muted)';
            let statusIcon = 'fa-minus';
            
            if (p.minPrice !== p.maxPrice) {
                if (p.lastPrice <= p.minPrice) {
                    statusColor = 'var(--success)';
                    statusIcon = 'fa-arrow-down';
                } else if (p.lastPrice >= p.maxPrice) {
                    statusColor = 'var(--danger)';
                    statusIcon = 'fa-arrow-up';
                }
            }

            html += `
                <div class="product-intel-card">
                    <div class="intel-header">
                        <h4 class="intel-name">${escapeHTML(p.name)}</h4>
                        <span class="intel-freq">${p.frequency}x compras</span>
                    </div>
                    
                    <div class="intel-prices">
                        <div class="price-box">
                            <span class="label">Menor Preço</span>
                            <span class="value success">${formatCurrency(p.minPrice)}</span>
                        </div>
                        <div class="price-box">
                            <span class="label">Maior Preço</span>
                            <span class="value danger">${formatCurrency(p.maxPrice)}</span>
                        </div>
                        <div class="price-box highlight" style="border-bottom-color: ${statusColor}">
                            <span class="label">Último Preço</span>
                            <span class="value" style="color: ${statusColor}">
                                <i class="fas ${statusIcon}" style="font-size:10px;"></i> ${formatCurrency(p.lastPrice)}
                            </span>
                        </div>
                    </div>
                    
                    <div class="intel-footer">
                        <span>Gasto Histórico: <strong>${formatCurrency(p.totalSpent)}</strong></span>
                        <span>Última compra: ${formatDate(p.lastDate)}</span>
                    </div>
                </div>
            `;
        });

        productsList.innerHTML = html;
    }
})();
