// VERSÃO 1.0 - Utilitários e Helpers globais

// Proteção contra Cross-Site Scripting (XSS)
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        } [tag] || tag)
    );
}

// Formatação Monetária (R$ 0,00)
function formatCurrency(value) {
    return 'R$ ' + parseFloat(value).toFixed(2).replace('.', ',');
}

// Formatação de Data (Ex: 25 de out. de 2023)
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Retorna a data de hoje no padrão YYYY-MM-DD para os inputs de data
function getToday() {
    const d = new Date();
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

// Geração de ID Único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

// Normaliza strings (para busca e IDs de produtos)
function normalizeName(name) {
    return name.trim().toLowerCase();
}

// Capitaliza a primeira letra de cada palavra
function capitalizeWords(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
}

// Previne o travamento do Autocomplete ao digitar rápido
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
