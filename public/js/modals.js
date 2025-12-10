// Modal utilities
function showModal(title, content, onSubmit) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            ${content}
        </div>
    `;
    
    document.getElementById('modalContainer').appendChild(modal);
    
    if (onSubmit) {
        modal.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await onSubmit(e);
                closeModal();
            } catch (error) {
                alert('❌ Erro: ' + error.message);
            }
        });
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
}

// Produto Modals
function showAddProdutoModal() {
    const content = `
        <form id="produtoForm">
            <div class="form-group">
                <label>Código *</label>
                <input type="text" name="codigo" required>
            </div>
            <div class="form-group">
                <label>Descrição *</label>
                <input type="text" name="descricao" required>
            </div>
            <div class="form-group">
                <label>Tipo de Unidade *</label>
                <select name="tipo_unidade" required>
                    <option value="">Selecione...</option>
                    <option value="L">Litros (L)</option>
                    <option value="mL">Mililitros (mL)</option>
                    <option value="kg">Quilogramas (kg)</option>
                    <option value="g">Gramas (g)</option>
                    <option value="mg">Miligramas (mg)</option>
                    <option value="unidade">Unidade</option>
                </select>
            </div>
            <div class="form-group">
                <label>Fabricante</label>
                <input type="text" name="fabricante">
            </div>
            <div class="form-group">
                <label>CMM (Consumo Médio Mensal)</label>
                <input type="number" step="0.01" name="cmm" value="0">
            </div>
            <div class="form-group">
                <label>Estoque Mínimo</label>
                <input type="number" step="0.01" name="estoque_minimo" value="0">
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        </form>
    `;
    
    showModal('Novo Produto', content, async (e) => {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await api.createProduto(data);
        loadProdutos();
        loadEstoque();
    });
}

// Lote Modals
async function showAddLoteModal() {
    const produtos = await api.getProdutos();
    
    const content = `
        <form id="loteForm">
            <div class="form-group">
                <label>Produto *</label>
                <select name="produto_id" required>
                    <option value="">Selecione...</option>
                    ${produtos.map(p => `<option value="${p.id}">${p.codigo} - ${p.descricao}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Número do Lote *</label>
                <input type="text" name="numero_lote" required>
            </div>
            <div class="form-group">
                <label>Fabricante</label>
                <input type="text" name="fabricante">
            </div>
            <div class="form-group">
                <label>Quantidade Inicial *</label>
                <input type="number" step="0.01" name="quantidade_inicial" required>
            </div>
            <div class="form-group">
                <label>Data de Validade *</label>
                <input type="date" name="data_validade" required>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        </form>
    `;
    
    showModal('Novo Lote', content, async (e) => {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await api.createLote(data);
        loadLotes();
        loadEstoqueCompleto();
    });
}

async function showAbrirLoteModal(loteId, produtoDescricao) {
    const content = `
        <form id="abrirLoteForm">
            <p>Produto: <strong>${produtoDescricao}</strong></p>
            <p class="error-message">⚠️ Já existe outro lote aberto para este produto.</p>
            <div class="form-group">
                <label>Justificativa *</label>
                <textarea name="justificativa" rows="4" required placeholder="Informe o motivo para abrir múltiplos lotes..."></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-warning">Abrir Lote</button>
            </div>
        </form>
    `;
    
    showModal('Abrir Lote', content, async (e) => {
        const formData = new FormData(e.target);
        const justificativa = formData.get('justificativa');
        await api.abrirLote(loteId, justificativa);
        loadLotes();
    });
}

// Movimentação Modal
async function showAddMovimentacaoModal() {
    const lotes = await api.getLotes();
    
    const content = `
        <form id="movimentacaoForm">
            <div class="form-group">
                <label>Lote *</label>
                <select name="lote_id" required>
                    <option value="">Selecione...</option>
                    ${lotes.map(l => `
                        <option value="${l.id}">
                            ${l.descricao} - Lote: ${l.numero_lote} (Disponível: ${l.quantidade_fechado + l.quantidade_uso} ${l.tipo_unidade})
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Tipo de Movimentação *</label>
                <select name="tipo" required>
                    <option value="ENTRADA">Entrada</option>
                    <option value="SAIDA">Saída</option>
                    <option value="DOACAO">Doação</option>
                    <option value="EMPRESTIMO">Empréstimo</option>
                    <option value="VENCIMENTO">Vencimento</option>
                    <option value="AJUSTE">Ajuste</option>
                </select>
            </div>
            <div class="form-group">
                <label>Quantidade *</label>
                <input type="number" step="0.01" name="quantidade" required>
            </div>
            <div class="form-group">
                <label>Motivo *</label>
                <input type="text" name="motivo" required>
            </div>
            <div class="form-group">
                <label>Observações</label>
                <textarea name="observacoes" rows="3"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar</button>
            </div>
        </form>
    `;
    
    showModal('Nova Movimentação', content, async (e) => {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await api.createMovimentacao(data);
        loadMovimentacoes();
        loadLotes();
        loadEstoque();
    });
}

// Usuário Modal
function showAddUsuarioModal() {
    const content = `
        <form id="usuarioForm">
            <div class="form-group">
                <label>Nome de Usuário *</label>
                <input type="text" name="username" required>
            </div>
            <div class="form-group">
                <label>Nome Completo *</label>
                <input type="text" name="nome" required>
            </div>
            <div class="form-group">
                <label>Email *</label>
                <input type="email" name="email" required>
            </div>
            <div class="form-group">
                <label>Senha *</label>
                <input type="password" name="password" required minlength="6">
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Criar Usuário</button>
            </div>
        </form>
    `;
    
    showModal('Novo Usuário', content, async (e) => {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        try {
            await api.createUsuario(data);
            loadUsuarios();
        } catch (error) {
            alert(error.message);
        }
    });
}

// Inventário Detail Modal
async function showInventarioDetail(inventarioId) {
    try {
        const itens = await api.getInventario(inventarioId);
        
        const content = `
            <div style="max-height: 60vh; overflow-y: auto; margin-bottom: 1rem;">
                <table class="data-table" style="width: 100%; font-size: 0.85rem;">
                    <thead style="position: sticky; top: 0; background: #f5f5f5; z-index: 10;">
                        <tr>
                            <th style="padding: 0.5rem;">Produto</th>
                            <th style="padding: 0.5rem;">Lote</th>
                            <th style="padding: 0.5rem;">Sistema</th>
                            <th style="padding: 0.5rem;">Contado</th>
                            <th style="padding: 0.5rem;">Diferença</th>
                            <th style="padding: 0.5rem;">Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itens.map(item => {
                            const diff = item.diferenca !== null ? item.diferenca : 0;
                            const diffClass = diff < 0 ? 'color: red; font-weight: bold;' : diff > 0 ? 'color: green; font-weight: bold;' : '';
                            return `
                            <tr>
                                <td style="padding: 0.5rem; font-size: 0.8rem;">${item.descricao}</td>
                                <td style="padding: 0.5rem;"><strong>${item.numero_lote}</strong></td>
                                <td style="padding: 0.5rem; text-align: center;">${item.quantidade_sistema} ${item.tipo_unidade}</td>
                                <td style="padding: 0.5rem; text-align: center;">
                                    <input type="number" step="0.01" 
                                        id="contagem_${item.id}" 
                                        value="${item.quantidade_contada !== null ? item.quantidade_contada : ''}"
                                        placeholder="${item.quantidade_sistema}"
                                        style="width: 70px; padding: 0.25rem; text-align: center; border: 1px solid #ccc; border-radius: 4px;">
                                    ${item.tipo_unidade}
                                </td>
                                <td style="padding: 0.5rem; text-align: center; ${diffClass}">${item.diferenca !== null ? (diff > 0 ? '+' + diff : diff) : '-'}</td>
                                <td style="padding: 0.5rem; text-align: center;">
                                    <button class="btn btn-sm btn-primary" 
                                        onclick="updateInventarioItem(${item.id})"
                                        style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                        ✓ Salvar
                                    </button>
                                </td>
                            </tr>
                        `;}).join('')}
                    </tbody>
                </table>
            </div>
            <div class="form-actions" style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #ddd;">
                <button type="button" class="btn" onclick="closeModal()">Fechar</button>
                <button type="button" class="btn btn-success" onclick="finalizarInventario(${inventarioId})">
                    ✓ Finalizar Inventário
                </button>
            </div>
        `;
        
        showModal('Detalhes do Inventário #' + inventarioId, content);
    } catch (error) {
        console.error('Erro ao carregar detalhes do inventário:', error);
        alert('❌ Erro ao carregar inventário: ' + error.message);
    }
}

async function updateInventarioItem(itemId) {
    const quantidadeInput = document.getElementById(`contagem_${itemId}`);
    const quantidade = parseFloat(quantidadeInput.value);
    
    if (isNaN(quantidade) || quantidade < 0) {
        alert('❌ Digite uma quantidade válida (maior ou igual a zero)');
        return;
    }
    
    try {
        await api.updateInventarioItem(itemId, quantidade, '');
        quantidadeInput.style.background = '#d4edda';
        setTimeout(() => quantidadeInput.style.background = '', 1000);
        
        // Recarregar a linha para mostrar diferença atualizada
        const inventarioId = new URLSearchParams(window.location.search).get('inv') || 
                            document.querySelector('.btn-success[onclick*="finalizarInventario"]')?.getAttribute('onclick')?.match(/\d+/)?.[0];
        if (inventarioId) {
            closeModal();
            setTimeout(() => showInventarioDetail(inventarioId), 100);
        }
    } catch (error) {
        alert('❌ Erro ao atualizar: ' + error.message);
    }
}

async function finalizarInventario(inventarioId) {
    if (confirm('Tem certeza que deseja finalizar este inventário?')) {
        try {
            await api.finalizarInventario(inventarioId);
            closeModal();
            alert('✅ Inventário finalizado com sucesso!');
            loadInventarios();
        } catch (error) {
            console.error('Erro ao finalizar inventário:', error);
            alert('❌ Erro ao finalizar inventário: ' + error.message);
        }
    }
}
