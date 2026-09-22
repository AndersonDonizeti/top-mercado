// VERSÃO 1.0 - Motor de Banco de Dados (IndexedDB)

const DB_NAME = 'TopMercadoDB';
const DB_VERSION = 1;
window.db = null; // Instância global do banco

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Criação das tabelas (Roda apenas na primeira vez ou se mudar a versão)
        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Tabela 1: Compras
            if (!database.objectStoreNames.contains('purchases')) {
                const purchaseStore = database.createObjectStore('purchases', { keyPath: 'id' });
                // Índices para busca rápida (Data exata, Mês e Ano)
                purchaseStore.createIndex('date', 'date', { unique: false });
                purchaseStore.createIndex('month', 'month', { unique: false }); 
                purchaseStore.createIndex('year', 'year', { unique: false });
                purchaseStore.createIndex('name', 'name', { unique: false });
            }

            // Tabela 2: Produtos (Para o Autocomplete e Estatísticas Gerais)
            if (!database.objectStoreNames.contains('products')) {
                const productStore = database.createObjectStore('products', { keyPath: 'key' });
                productStore.createIndex('name', 'name', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            window.db = event.target.result;
            resolve(window.db);
        };

        request.onerror = (event) => {
            console.error("Erro ao abrir IndexedDB:", event.target.error);
            reject(event.target.error);
        };
    });
}

// ==========================================
// FUNÇÕES DE OPERAÇÃO (CRUD)
// ==========================================

function salvarCompraNoBanco(compra) {
    return new Promise((resolve, reject) => {
        const transaction = window.db.transaction(['purchases', 'products'], 'readwrite');
        const purchaseStore = transaction.objectStore('purchases');
        const productStore = transaction.objectStore('products');

        // 1. Salva a compra
        purchaseStore.add(compra);

        // 2. Atualiza o produto para o Autocomplete
        const prodKey = normalizeName(compra.name);
        const getProd = productStore.get(prodKey);

        getProd.onsuccess = () => {
            let produto = getProd.result;
            if (!produto) {
                produto = { 
                    key: prodKey, 
                    name: capitalizeWords(compra.name), 
                    history: [] 
                };
            }
            // Guarda apenas os últimos 10 históricos para não pesar
            produto.history.push({
                date: compra.date,
                price: compra.price,
                qty: compra.quantity,
                unit: compra.unit
            });
            if (produto.history.length > 10) produto.history.shift();
            
            productStore.put(produto);
        };

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = (e) => reject(e.target.error);
    });
}

function buscarComprasPorData(dateStr) {
    return new Promise((resolve, reject) => {
        const transaction = window.db.transaction(['purchases'], 'readonly');
        const store = transaction.objectStore('purchases');
        const index = store.index('date');
        const request = index.getAll(dateStr);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

function removerCompraDoBanco(id) {
    return new Promise((resolve, reject) => {
        const transaction = window.db.transaction(['purchases'], 'readwrite');
        const store = transaction.objectStore('purchases');
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
}

// Inicializa o banco assim que o arquivo carrega
initDB().then(() => console.log("📦 TopMercadoDB Conectado."));
