// VERSÃO: 1.0 - Motor de Navegação SPA

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa a data no header
    const dateElement = document.getElementById('headerDate');
    if (dateElement && typeof formatDate === 'function') {
        dateElement.textContent = formatDate(new Date().toISOString().split('T')[0]);
    } else {
        dateElement.textContent = new Date().toLocaleDateString('pt-BR');
    }

    // Configura os botões de navegação
    const navButtons = document.querySelectorAll('.tab-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const route = e.currentTarget.dataset.route;
            
            // Atualiza classe ativa no menu
            navButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Carrega a página
            loadPage(route);
        });
    });

    // Inicia o app na tela de adição
    loadPage('adicionar');
});

// Função para buscar o HTML e injetar no DOM
async function loadPage(pageName) {
    const container = document.getElementById('app-content');
    container.innerHTML = '<div style="text-align:center; padding: 40px; color: #5a6e8a;">Carregando...</div>';

    try {
        const response = await fetch(`pages/${pageName}.html`);
        if (!response.ok) throw new Error('Página não encontrada');
        
        const html = await response.text();
        container.innerHTML = html;

        // Carrega o script específico da tela dinamicamente (se existir)
        loadPageScript(pageName);

    } catch (error) {
        console.error('Erro ao carregar rota:', error);
        container.innerHTML = `
            <div style="text-align:center; padding: 40px; color: #c73b3b;">
                <i class="fas fa-exclamation-triangle fa-2x"></i>
                <p style="margin-top: 10px;">Erro ao carregar o módulo.</p>
            </div>`;
    }
}

// Injeta o arquivo JS correspondente à página
function loadPageScript(pageName) {
    const scriptId = `script-${pageName}`;
    
    // Remove o script anterior se existir para evitar duplicação de eventos
    const oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `controllers/${pageName}.js`;
    document.body.appendChild(script);
}
