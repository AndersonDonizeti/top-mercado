// VERSÃO 1.0 - Lógica da Tela de Adicionar & Autocomplete com IndexedDB

(function () {
    // Referências do DOM
    const purchaseDateInput = document.getElementById('purchaseDate');
    const productInput = document.getElementById('productInput');
    const priceInput = document.getElementById('priceInput');
    const qtyInput = document.getElementById('qtyInput');
    const unitSelect = document.getElementById('unitSelect');
    const addBtn = document.getElementById('addBtn');
    const clearFormBtn = document.getElementById('clearFormBtn');
    const todaySearchInput = document.getElementById('todaySearchInput');
    const todayLabel = document.getElementById('todayLabel');
    const todayList = document.getElementById('todayList');
    const todayResultCount = document.getElementById('todayResultCount');

    if (!purchaseDateInput) return;

    // Define data padrão como hoje
    const initialDate = getToday();
    purchaseDateInput.value = initialDate;

    // Inicialização da tela
    renderTodayList(initialDate);
    setupAutocomplete();

    // ==========================================
    // EVENTOS DE INTERAÇÃO
    // ==========================================

    // Mudança de data no calendário
    purchaseDateInput.addEventListener('change', () => {
        const dateStr = purchaseDateInput.value;
        renderTodayList(dateStr, todaySearchInput.value);
    });

    // Inserção de nova compra no IndexedDB
    addBtn.addEventListener('click', async () => {
        const dateStr = purchaseDateInput.value;
        const productName = productInput.value.trim();
        const price = parseFloat(priceInput.value.replace(',', '.'));
        const qty = parseFloat(qtyInput.value.replace(',', '.'));
        const unit = unitSelect.value;

        if (!dateStr) { alert('Selecione uma data.'); return; }
        if (!productName) { alert('Digite o nome do produto.'); return; }
        if (isNaN(price) || price <= 0) { alert('Informe um preço válido.'); return; }
        if (isNaN(qty) || qty <= 0) { alert('Informe uma quantidade válida.'); return; }

        const [year, month] = dateStr.split('-');

        const novaCompra = {
            id: generateId(),
            date: dateStr,
            month: `${year}-${month}`,
            year: year,
            name: capitalizeWords(productName),
            price: price,
            quantity: qty,
            unit: unit || 'un'
        };

        try {
            await salvarCompraNoBanco(novaCompra);
            
            // Reseta apenas os campos do produto
            productInput.value = '';
            priceInput.value = '';
            qtyInput.value = '1';
            productInput.focus();

            renderTodayList(dateStr, todaySearchInput.value);
        } catch (err) {
            console.error("Erro ao salvar compra:", err);
            alert("Erro ao salvar compra no banco de dados.");
        }
    });

    // Limpar formulário
    clearFormBtn.addEventListener('click', () => {
        productInput.value = '';
        priceInput.value = '';
        qtyInput.value = '1';
        unitSelect.value = 'un';
        productInput.focus();
    });

    // Filtro rápido da lista do dia
    todaySearchInput.addEventListener('input', () => {
        renderTodayList(purchaseDateInput.value, todaySearchInput.value);
    });

    // ==========================================
    // RENDERIZAÇÃO DA LISTA DO DIA
    // ==========================================

    async function renderTodayList(dateStr, filterText = '') {
        todayLabel.textContent = formatDate(dateStr);

        try {
            const items = await buscarComprasPorData(dateStr);

            if (!items || items.length === 0) {
                todayList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Nenhuma compra registrada para este dia.</p>
                    </div>`;
                todayResultCount.textContent = '0 itens';
                return;
            }

            const filterLower = filterText.trim().toLowerCase();
            const filteredItems = filterLower
                ? items.filter(it => it.name.toLowerCase().includes(filterLower))
                : items;

            todayResultCount.textContent = `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''}`;

            if (filteredItems.length === 0) {
                todayList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>Nenhum produto encontrado com este filtro.</p>
                    </div>`;
                return;
            }

            let html = '';
            for (const item of filteredItems) {
                const total = item.price * item.quantity;
                html += `
                    <div class="purchase-item">
                        <div class="info">
                            <span class="name">${escapeHTML(item.name)}</span>
                            <span class="detail">${escapeHTML(item.quantity)} ${escapeHTML(item.unit)}</span>
                            <span class="price-tag">${escapeHTML(formatCurrency(item.price))}</span>
                            <span class="detail" style="font-weight:700; color:var(--primary);">${escapeHTML(formatCurrency(total))}</span>
                        </div>
                        <div class="actions">
                            <button class="btn-remove" data-id="${escapeHTML(item.id)}" title="Remover">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>`;
            }
            todayList.innerHTML = html;

            // Eventos de Remoção
            todayList.querySelectorAll('.btn-remove').forEach(btn => {
                btn.addEventListener('click', async function () {
                    const id = this.dataset.id;
                    if (confirm('Deseja remover este item?')) {
                        await removerCompraDoBanco(id);
                        renderTodayList(dateStr, todaySearchInput.value);
                    }
                });
            });

        } catch (err) {
            console.error("Erro ao buscar lista:", err);
        }
    }

    // ==========================================
    // AUTOCOMPLETE OTIMIZADO (DEBOUNCE + INDEXEDDB)
    // ==========================================

    function setupAutocomplete() {
        const list = document.getElementById('autocompleteList');
        let activeIndex = -1;

        const executeSearch = debounce(async (query) => {
            const q = query.trim().toLowerCase();
            if (!q || !window.db) {
                list.classList.remove('show');
                return;
            }

            const tx = window.db.transaction(['products'], 'readonly');
            const store = tx.objectStore('products');
            const request = store.getAll();

            request.onsuccess = () => {
                const products = request.result || [];
                const matches = products.filter(p => p.key.includes(q)).slice(0, 8);

                if (matches.length === 0) {
                    list.classList.remove('show');
                    return;
                }

                list.innerHTML = '';
                matches.forEach(prod => {
                    const li = document.createElement('li');
                    const last = prod.history && prod.history.length > 0 ? prod.history[prod.history.length - 1] : null;

                    li.innerHTML = `
                        <span>${escapeHTML(prod.name)}</span>
                        ${last ? `<span class="suggestion-price">${escapeHTML(formatCurrency(last.price))}</span>` : ''}
                    `;

                    li.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        productInput.value = prod.name;
                        list.classList.remove('show');
                        if (last) {
                            priceInput.value = last.price;
                            qtyInput.value = last.qty || 1;
                            unitSelect.value = last.unit || 'un';
                        }
                        productInput.focus();
                    });

                    list.appendChild(li);
                });
                list.classList.add('show');
                activeIndex = -1;
            };
        }, 200);

        productInput.addEventListener('input', (e) => executeSearch(e.target.value));

        // Navegação por teclado
        productInput.addEventListener('keydown', (e) => {
            const items = list.querySelectorAll('li');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
                items.forEach((el, i) => el.classList.toggle('active-suggestion', i === activeIndex));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
                items.forEach((el, i) => el.classList.toggle('active-suggestion', i === activeIndex));
            } else if (e.key === 'Enter') {
                if (activeIndex >= 0 && items[activeIndex]) {
                    e.preventDefault();
                    items[activeIndex].dispatchEvent(new Event('mousedown'));
                }
            } else if (e.key === 'Escape') {
                list.classList.remove('show');
            }
        });

        document.addEventListener('click', (e) => {
            if (!list.contains(e.target) && e.target !== productInput) {
                list.classList.remove('show');
            }
        });
    }
})();
