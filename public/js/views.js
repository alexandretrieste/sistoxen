// View Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchView(btn.dataset.view);
    });
});

function switchView(viewName) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(`${viewName}View`).classList.add('active');
    
    const loadFunctions = {
        estoque: loadEstoqueCompleto,
        produtos: loadProdutos,
        lotes: loadLotes,
        movimentacoes: loadMovimentacoes,
        inventario: loadInventarios,
        usuarios: loadUsuarios
    };
    
    if (loadFunctions[viewName]) loadFunctions[viewName]();
}

// ESTOQUE COMPLETO - Formato Planilha Excel
async function loadEstoqueCompleto() {
    try {
        const [produtos, lotes] = await Promise.all([api.getProdutos(), api.getLotes()]);
        document.getElementById('dataAtualizacao').textContent = new Date().toLocaleDateString('pt-BR');
        const tbody = document.getElementById('estoqueTableBody');
        let html = '';
        
        // Ordenar produtos por código (numérico quando possível, depois alfabético)
        const produtosOrdenados = [...produtos].sort((a, b) => {
            const numA = parseInt(a.codigo);
            const numB = parseInt(b.codigo);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.codigo.localeCompare(b.codigo);
        });
        
        produtosOrdenados.forEach(produto => {
            const lotesdoProduto = lotes.filter(l => l.produto_id === produto.id);
            const estoqueTotal = lotesdoProduto.reduce((sum, l) => sum + l.quantidade_fechado + l.quantidade_uso, 0);
            
            if (lotesdoProduto.length === 0) {
                html += `<tr class="row-produto-principal">
                    <td class="cell-codigo">${produto.codigo}</td>
                    <td class="cell-total">0</td>
                    <td>0</td><td>0</td><td>-</td>
                    <td style="text-align: left; font-weight: 600;">${produto.descricao}</td>
                    <td>${produto.tipo_unidade}</td>
                    <td>${produto.fabricante || '-'}</td>
                    <td>-</td><td>-</td><td>-</td>
                    <td>${produto.estoque_minimo}</td>
                    <td>-</td>
                    <td>-</td>
                </tr>`;
            } else {
                lotesdoProduto.forEach((lote, index) => {
                    const validade = new Date(lote.data_validade);
                    const diasRestantes = Math.ceil((validade - new Date()) / (1000 * 60 * 60 * 24));
                    let validadeClass = 'cell-validade-ok';
                    let validadeTexto = formatDate(lote.data_validade);
                    
                    if (diasRestantes < 0) {
                        validadeClass = 'cell-validade-vencida';
                        validadeTexto += ' ❌';
                    } else if (diasRestantes <= 30) {
                        validadeClass = 'cell-validade-proxima';
                        validadeTexto += ` (${diasRestantes}d)`;
                    }
                    
                    html += `<tr>
                        ${index === 0 ? `<td class="cell-codigo" rowspan="${lotesdoProduto.length}">${produto.codigo}</td>` : ''}
                        ${index === 0 ? `<td class="cell-total" rowspan="${lotesdoProduto.length}">${estoqueTotal}</td>` : ''}
                        <td>${lote.quantidade_fechado}</td>
                        <td>${lote.quantidade_uso}</td>
                        <td><strong>${lote.numero_lote}</strong></td>
                        ${index === 0 ? `<td rowspan="${lotesdoProduto.length}" style="text-align: left; font-weight: 600;">${produto.descricao}</td>` : ''}
                        ${index === 0 ? `<td rowspan="${lotesdoProduto.length}">${produto.tipo_unidade}</td>` : ''}
                        <td>${lote.fabricante || produto.fabricante || '-'}</td>
                        <td class="${validadeClass}">${validadeTexto}</td>
                        <td>${lote.data_abertura ? formatDate(lote.data_abertura) : '-'}</td>
                        <td>${lote.data_finalizacao ? formatDate(lote.data_finalizacao) : '-'}</td>
                        ${index === 0 ? `<td rowspan="${lotesdoProduto.length}">${produto.estoque_minimo}</td>` : ''}
                        <td>
                            <select onchange="updateArmazenamento(${lote.id}, this.value)" style="padding: 0.25rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.75rem;">
                                <option value="Ambiente" ${lote.armazenamento === 'Ambiente' || !lote.armazenamento ? 'selected' : ''}>Ambiente</option>
                                <option value="2°C - 8°C (geladeira)" ${lote.armazenamento === '2°C - 8°C (geladeira)' ? 'selected' : ''}>2°C - 8°C (geladeira)</option>
                                <option value="-20°C (freezer)" ${lote.armazenamento === '-20°C (freezer)' ? 'selected' : ''}>-20°C (freezer)</option>
                            </select>
                        </td>
                        <td><input type="checkbox" ${lote.licitar ? 'checked' : ''} onchange="toggleLicitar(${lote.id}, this.checked)"></td>
                    </tr>`;
                });
            }
        });
        
        tbody.innerHTML = html;
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function updateArmazenamento(loteId, valor) {
    await fetch(`http://localhost:3000/api/lotes/${loteId}/armazenamento`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ armazenamento: valor })
    });
}

async function toggleLicitar(loteId, checked) {
    await fetch(`http://localhost:3000/api/lotes/${loteId}/licitar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ licitar: checked ? 1 : 0 })
    });
}

async function transferirParaUso(loteId, quantidadeDisponivel, numeroLote) {
    const quantidade = prompt(`Transferir quanto de "${numeroLote}" para Em Uso?\n\nDisponível em Estoque Fechado: ${quantidadeDisponivel}`);
    if (!quantidade || isNaN(quantidade) || quantidade <= 0) return;
    
    const qtd = parseFloat(quantidade);
    if (qtd > quantidadeDisponivel) {
        return alert('❌ Quantidade maior que o disponível!');
    }
    
    try {
        const lote = await api.getLote(loteId);
        const novoFechado = lote.quantidade_fechado - qtd;
        const novoUso = lote.quantidade_uso + qtd;
        
        await fetch(`http://localhost:3000/api/lotes/${loteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({
                quantidade_fechado: novoFechado,
                quantidade_uso: novoUso,
                data_validade: lote.data_validade,
                data_abertura: lote.data_abertura || new Date().toISOString().split('T')[0],
                data_finalizacao: lote.data_finalizacao,
                data_solicitacao: lote.data_solicitacao,
                observacoes: lote.observacoes
            })
        });
        
        alert(`✅ Transferido ${qtd} para Em Uso!`);
        loadEstoqueCompleto();
    } catch (error) {
        alert('❌ Erro: ' + error.message);
    }
}

async function editarLote(loteId) {
    const lote = await api.getLote(loteId);
    const content = `
        <form id="editLoteForm">
            <div class="form-group"><label>Produto</label><input type="text" value="${lote.codigo} - ${lote.descricao}" disabled></div>
            <div class="form-group"><label>Número do Lote</label><input type="text" value="${lote.numero_lote}" disabled></div>
            <div class="form-group"><label>Fabricante</label><input type="text" name="fabricante" value="${lote.fabricante || ''}"></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group"><label>Fechado</label><input type="number" name="quantidade_fechado" step="0.01" value="${lote.quantidade_fechado}"></div>
                <div class="form-group"><label>Em Uso</label><input type="number" name="quantidade_uso" step="0.01" value="${lote.quantidade_uso}"></div>
            </div>
            <div class="form-group"><label>Validade</label><input type="date" name="data_validade" value="${lote.data_validade}"></div>
            <div class="form-group"><label>Data de Abertura</label><input type="date" name="data_abertura" value="${lote.data_abertura || ''}"></div>
            <div class="form-group"><label>Data de Finalização</label><input type="date" name="data_finalizacao" value="${lote.data_finalizacao || ''}"></div>
            <div class="form-group"><label>Data da Solicitação</label><input type="date" name="data_solicitacao" value="${lote.data_solicitacao || ''}"></div>
            <div class="form-group"><label>Observações</label><textarea name="observacoes" rows="3">${lote.observacoes || ''}</textarea></div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        </form>
    `;
    showModal('Editar Lote', content, async (e) => {
        const formData = new FormData(e.target);
        const response = await fetch(`http://localhost:3000/api/lotes/${loteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(Object.fromEntries(formData))
        });
        if (!response.ok) throw new Error('Erro ao atualizar lote');
        alert('✅ Lote atualizado com sucesso!');
        loadEstoqueCompleto();
    });
}

async function showAddLoteParaProduto(produtoId) {
    const produto = await api.getProduto(produtoId);
    const content = `
        <form id="loteForm">
            <input type="hidden" name="produto_id" value="${produtoId}">
            <div class="form-group"><label>Produto</label><input type="text" value="${produto.codigo} - ${produto.descricao}" disabled></div>
            <div class="form-group"><label>Número do Lote *</label><input type="text" name="numero_lote" required></div>
            <div class="form-group"><label>Fabricante</label><input type="text" name="fabricante" value="${produto.fabricante || ''}" placeholder="Deixe vazio para usar o padrão do produto"></div>
            <div class="form-group"><label>Quantidade Inicial *</label><input type="number" step="0.01" name="quantidade_inicial" required></div>
            <div class="form-group"><label>Data de Validade *</label><input type="date" name="data_validade" required></div>
            <div class="form-group"><label>Observações</label><textarea name="observacoes" rows="2"></textarea></div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        </form>
    `;
    showModal('Adicionar Lote', content, async (e) => {
        await api.createLote(Object.fromEntries(new FormData(e.target)));
        alert('✅ Lote adicionado com sucesso!');
        loadEstoqueCompleto();
    });
}

async function showMovimentacaoParaProduto(produtoId) {
    const lotes = await api.getLotesByProduto(produtoId);
    if (lotes.length === 0) return alert('Produto sem lotes.');
    const content = `
        <form id="movForm">
            <div class="form-group"><label>Lote *</label><select name="lote_id" required>
                ${lotes.map(l => `<option value="${l.id}">${l.numero_lote} - Disp: ${l.quantidade_fechado + l.quantidade_uso} ${l.tipo_unidade}</option>`).join('')}
            </select></div>
            <div class="form-group"><label>Tipo *</label><select name="tipo" required>
                <option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option>
                <option value="DOACAO">Doação</option><option value="EMPRESTIMO">Empréstimo</option>
                <option value="VENCIMENTO">Vencimento</option><option value="AJUSTE">Ajuste</option>
            </select></div>
            <div class="form-group"><label>Quantidade *</label><input type="number" step="0.01" name="quantidade" required></div>
            <div class="form-group"><label>Motivo *</label><input type="text" name="motivo" required></div>
            <div class="form-group"><label>Observações</label><textarea name="observacoes" rows="2"></textarea></div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar</button>
            </div>
        </form>
    `;
    showModal('Movimentação', content, async (e) => {
        await api.createMovimentacao(Object.fromEntries(new FormData(e.target)));
        alert('✅ Movimentação registrada com sucesso!');
        loadEstoqueCompleto();
        loadMovimentacoes();
        closeModal();
    });
}

async function showAddProdutoLoteModal() {
    const content = `
        <form id="produtoLoteForm">
            <h4>Produto</h4>
            <div class="form-group"><label>Código *</label><input type="text" name="codigo" required></div>
            <div class="form-group"><label>Descrição *</label><input type="text" name="descricao" required></div>
            <div class="form-group"><label>Tipo *</label><select name="tipo_unidade" required>
                <option value="">Selecione...</option><option value="L">Litros (L)</option><option value="mL">mL</option>
                <option value="kg">kg</option><option value="g">g</option><option value="mg">mg</option><option value="unidade">Unidade</option>
            </select></div>
            <div class="form-group"><label>Fabricante</label><input type="text" name="fabricante"></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group"><label>CMM</label><input type="number" step="0.01" name="cmm" value="0"></div>
                <div class="form-group"><label>Estoque Mínimo</label><input type="number" step="0.01" name="estoque_minimo" value="0"></div>
            </div>
            <hr><h4>Primeiro Lote (Opcional)</h4>
            <div class="form-group"><label>Nº Lote</label><input type="text" name="numero_lote"></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group"><label>Quantidade</label><input type="number" step="0.01" name="quantidade_inicial"></div>
                <div class="form-group"><label>Validade</label><input type="date" name="data_validade"></div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-success">Salvar</button>
            </div>
        </form>
    `;
    showModal('Adicionar Produto + Lote', content, async (e) => {
        const data = Object.fromEntries(new FormData(e.target));
        const result = await api.createProduto({codigo: data.codigo, descricao: data.descricao, tipo_unidade: data.tipo_unidade, fabricante: data.fabricante, cmm: data.cmm, estoque_minimo: data.estoque_minimo});
        if (data.numero_lote && data.quantidade_inicial && data.data_validade) {
            await api.createLote({produto_id: result.id, numero_lote: data.numero_lote, quantidade_inicial: data.quantidade_inicial, data_validade: data.data_validade});
            alert('✅ Produto e lote criados com sucesso!');
        } else {
            alert('✅ Produto criado com sucesso!');
        }
        loadEstoqueCompleto();
    });
}

function showMovimentacaoRapida() { showAddMovimentacaoModal(); }
function showIniciarInventario() { createInventario(); }

function updateQuantidadeDisponivel() {
    const select = document.getElementById('loteSelect');
    const option = select.options[select.selectedIndex];
    if (option.value) {
        const qtd = option.dataset.qtd;
        const tipo = option.dataset.tipo;
        document.getElementById('disponivelInfo').textContent = `Disponível: ${qtd} ${tipo}`;
        document.getElementById('quantidadeAbrir').max = qtd;
    }
}

function updateQuantidadeFinalizar() {
    const select = document.getElementById('loteFinalizarSelect');
    const option = select.options[select.selectedIndex];
    const grupo = document.getElementById('quantidadeFinalizarGroup');
    
    if (option.value) {
        const qtd = parseFloat(option.dataset.qtd);
        const tipo = option.dataset.tipo;
        
        if (qtd > 1) {
            // Mais de 1 unidade: mostrar campo de quantidade
            grupo.style.display = 'block';
            document.getElementById('emUsoInfo').textContent = `Em uso: ${qtd} ${tipo}`;
            document.getElementById('quantidadeFinalizar').max = qtd;
            document.getElementById('quantidadeFinalizar').value = '';
        } else {
            // Apenas 1 unidade: esconder campo (finaliza automaticamente)
            grupo.style.display = 'none';
        }
    } else {
        grupo.style.display = 'none';
    }
}


async function showAbrirUnidadeModal() {
    const lotes = await api.getLotes();
    const lotesFechados = lotes.filter(l => l.quantidade_fechado > 0);
    
    if (lotesFechados.length === 0) {
        return alert('❌ Não há lotes com estoque fechado disponível para abertura.');
    }
    
    const content = `
        <form id="abrirUnidadeForm">
            <div class="form-group">
                <label>Selecione o Lote *</label>
                <select name="lote_id" id="loteSelect" required onchange="updateQuantidadeDisponivel()">
                    <option value="">Selecione...</option>
                    ${lotesFechados.map(l => `<option value="${l.id}" data-qtd="${l.quantidade_fechado}" data-tipo="${l.tipo_unidade}">${l.codigo} - ${l.descricao} | Lote: ${l.numero_lote} | Disponível: ${l.quantidade_fechado} ${l.tipo_unidade}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Quantidade a Abrir *</label>
                <input type="number" step="0.01" name="quantidade" id="quantidadeAbrir" required min="0.01">
                <small id="disponivelInfo" style="color: #666;"></small>
            </div>
            <div class="form-group">
                <label>Motivo/Justificativa</label>
                <textarea name="motivo" rows="2" placeholder="Ex: Abertura para uso no laboratório"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-success">📦 Abrir Unidade</button>
            </div>
        </form>
    `;
    
    showModal('Abrir Unidade para Uso', content, async (e) => {
        const formData = new FormData(e.target);
        const loteId = formData.get('lote_id');
        const quantidade = parseFloat(formData.get('quantidade'));
        const motivo = formData.get('motivo');
        
        const lote = await api.getLote(loteId);
        
        if (quantidade > lote.quantidade_fechado) {
            throw new Error('Quantidade maior que o disponível em estoque fechado!');
        }
        
        // Transferir de fechado para uso
        await fetch(`http://localhost:3000/api/lotes/${loteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({
                quantidade_fechado: lote.quantidade_fechado - quantidade,
                quantidade_uso: lote.quantidade_uso + quantidade,
                data_validade: lote.data_validade,
                data_abertura: new Date().toISOString().split('T')[0],
                data_finalizacao: lote.data_finalizacao,
                data_solicitacao: lote.data_solicitacao,
                observacoes: lote.observacoes,
                fabricante: lote.fabricante
            })
        });
        
        // Registrar movimentação
        await api.createMovimentacao({
            lote_id: loteId,
            tipo: 'AJUSTE',
            quantidade: quantidade,
            motivo: motivo || 'Abertura de unidade para uso'
        });
        
        alert(`✅ ${quantidade} ${lote.tipo_unidade} transferido(s) para Em Uso!`);
        loadEstoqueCompleto();
        loadMovimentacoes();
    });
}

async function showFinalizarUnidadeModal() {
    const lotes = await api.getLotes();
    const lotesEmUso = lotes.filter(l => l.quantidade_uso > 0 && !l.data_finalizacao);
    
    if (lotesEmUso.length === 0) {
        return alert('❌ Não há estoque em aberto para finalizar.');
    }
    
    const content = `
        <form id="finalizarUnidadeForm">
            <div class="form-group">
                <label>Selecione o Lote *</label>
                <select name="lote_id" id="loteFinalizarSelect" required onchange="updateQuantidadeFinalizar()">
                    <option value="">Selecione...</option>
                    ${lotesEmUso.map(l => `<option value="${l.id}" data-qtd="${l.quantidade_uso}" data-tipo="${l.tipo_unidade}">${l.codigo} - ${l.descricao} | Lote: ${l.numero_lote} | Em Uso: ${l.quantidade_uso} ${l.tipo_unidade}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" id="quantidadeFinalizarGroup" style="display: none;">
                <label>Quantidade a Finalizar *</label>
                <input type="number" step="0.01" name="quantidade" id="quantidadeFinalizar" required min="0.01">
                <small id="emUsoInfo" style="color: #666;"></small>
            </div>
            <div class="form-group">
                <label>Motivo da Finalização</label>
                <textarea name="motivo" rows="2" placeholder="Ex: Produto totalmente utilizado"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn" style="background: #9C27B0; color: white;">✓ Finalizar Unidade</button>
            </div>
        </form>
    `;
    
    showModal('Finalizar Unidade', content, async (e) => {
        const formData = new FormData(e.target);
        const loteId = formData.get('lote_id');
        const motivo = formData.get('motivo');
        
        const lote = await api.getLote(loteId);
        
        // Determinar quantidade a finalizar
        let quantidadeFinalizar;
        if (lote.quantidade_uso === 1) {
            // Se tem apenas 1 unidade, finaliza automaticamente
            quantidadeFinalizar = 1;
        } else {
            // Se tem mais de 1, usa o valor do input
            quantidadeFinalizar = parseFloat(formData.get('quantidade'));
            if (!quantidadeFinalizar || quantidadeFinalizar <= 0) {
                throw new Error('Informe a quantidade a finalizar');
            }
            if (quantidadeFinalizar > lote.quantidade_uso) {
                throw new Error('Quantidade maior que o disponível em uso!');
            }
        }
        
        const novaQuantidadeUso = lote.quantidade_uso - quantidadeFinalizar;
        const dataFinalizacao = novaQuantidadeUso === 0 ? new Date().toISOString().split('T')[0] : lote.data_finalizacao;
        
        // Atualizar quantidade em uso
        await fetch(`http://localhost:3000/api/lotes/${loteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({
                quantidade_fechado: lote.quantidade_fechado,
                quantidade_uso: novaQuantidadeUso,
                data_validade: lote.data_validade,
                data_abertura: lote.data_abertura,
                data_finalizacao: dataFinalizacao,
                data_solicitacao: lote.data_solicitacao,
                observacoes: lote.observacoes,
                fabricante: lote.fabricante,
                armazenamento: lote.armazenamento
            })
        });
        
        // Registrar movimentação
        await api.createMovimentacao({
            lote_id: loteId,
            tipo: 'SAIDA',
            quantidade: quantidadeFinalizar,
            motivo: motivo || 'Finalização de unidade em uso'
        });
        
        const msg = novaQuantidadeUso === 0 
            ? `✅ Lote finalizado! ${quantidadeFinalizar} ${lote.tipo_unidade} consumido(s).`
            : `✅ ${quantidadeFinalizar} ${lote.tipo_unidade} finalizado(s). Restam ${novaQuantidadeUso} em uso.`;
        alert(msg);
        loadEstoqueCompleto();
        loadMovimentacoes();
    });
}

// Outras Views
async function loadProdutos() {
    const produtos = await api.getProdutos();
    // Ordenar por código (numérico quando possível, depois alfabético)
    const produtosOrdenados = [...produtos].sort((a, b) => {
        const numA = parseInt(a.codigo);
        const numB = parseInt(b.codigo);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.codigo.localeCompare(b.codigo);
    });
    
    document.querySelector('#produtosTable tbody').innerHTML = produtosOrdenados.map(p => `
        <tr><td>${p.codigo}</td><td>${p.descricao}</td><td>${p.tipo_unidade}</td><td>${p.fabricante || '-'}</td><td>${p.cmm}</td><td>${p.estoque_minimo}</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteProduto(${p.id})">Excluir</button></td></tr>
    `).join('');
}

async function deleteProduto(id) {
    if (confirm('Excluir produto e todos os seus lotes?')) {
        try {
            await api.deleteProduto(id);
            alert('✅ Produto excluído com sucesso!');
            loadProdutos();
            loadEstoqueCompleto();
        } catch (error) {
            alert('❌ Erro ao excluir: ' + error.message);
        }
    }
}

async function loadLotes() {
    const lotes = await api.getLotes();
    // Ordenar por código do produto (numérico quando possível, depois alfabético)
    const lotesOrdenados = [...lotes].sort((a, b) => {
        const numA = parseInt(a.codigo);
        const numB = parseInt(b.codigo);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.codigo.localeCompare(b.codigo);
    });
    
    document.querySelector('#lotesTable tbody').innerHTML = lotesOrdenados.map(l => {
        const dias = Math.ceil((new Date(l.data_validade) - new Date()) / 86400000);
        let validadeClass = '', validadeTexto = formatDate(l.data_validade);
        if (dias < 0) { validadeClass = 'row-danger'; validadeTexto += ' ❌ VENCIDO'; }
        else if (dias <= 30) { validadeClass = 'row-warning'; validadeTexto += ` (⚠️ ${dias}d)`; }
        
        const quantidadeInicial = l.quantidade_fechado + l.quantidade_uso;
        return `<tr class="${validadeClass}">
            <td><strong>${l.codigo}</strong> - ${l.descricao}</td>
            <td><strong>${l.numero_lote}</strong></td>
            <td>${l.fabricante || '-'}</td>
            <td>${quantidadeInicial} ${l.tipo_unidade}</td>
            <td>${validadeTexto}</td>
            <td style="font-size: 0.75rem;">${l.observacoes || '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editarLoteBasico(${l.id})">✏️ Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteLote(${l.id})">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

async function abrirLote(loteId, descricao) {
    try {
        await api.abrirLote(loteId, null);
        loadLotes();
        loadEstoqueCompleto();
    } catch (error) {
        if (error.message.includes('Justificativa')) showAbrirLoteModal(loteId, descricao);
        else alert(error.message);
    }
}

async function deleteLote(id) {
    if (confirm('Tem certeza que deseja excluir este lote?')) {
        try {
            await api.deleteLote(id);
            alert('✅ Lote excluído com sucesso!');
            loadLotes();
            loadEstoqueCompleto();
        } catch (error) {
            alert('❌ Erro ao excluir: ' + error.message);
        }
    }
}

async function editarLoteBasico(loteId) {
    const lote = await api.getLote(loteId);
    const content = `
        <form id="editLoteBasicoForm">
            <div class="form-group"><label>Produto</label><input type="text" value="${lote.codigo} - ${lote.descricao}" disabled></div>
            <div class="form-group"><label>Número do Lote</label><input type="text" value="${lote.numero_lote}" disabled></div>
            <div class="form-group"><label>Fabricante</label><input type="text" name="fabricante" value="${lote.fabricante || ''}"></div>
            <div class="form-group"><label>Validade *</label><input type="date" name="data_validade" value="${lote.data_validade}" required></div>
            <div class="form-group"><label>Observações</label><textarea name="observacoes" rows="3">${lote.observacoes || ''}</textarea></div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        </form>
    `;
    showModal('Editar Lote', content, async (e) => {
        const formData = new FormData(e.target);
        await fetch(`http://localhost:3000/api/lotes/${loteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({
                quantidade_fechado: lote.quantidade_fechado,
                quantidade_uso: lote.quantidade_uso,
                data_validade: formData.get('data_validade'),
                data_abertura: lote.data_abertura,
                data_finalizacao: lote.data_finalizacao,
                data_solicitacao: lote.data_solicitacao,
                observacoes: formData.get('observacoes'),
                fabricante: formData.get('fabricante')
            })
        });
        alert('✅ Lote atualizado com sucesso!');
        loadLotes();
        loadEstoqueCompleto();
    });
}

async function finalizarLote(loteId, numeroLote) {
    if (!confirm(`Finalizar lote "${numeroLote}"?\n\nIsso irá:\n- Zerar as quantidades\n- Marcar data de finalização\n- Indicar que o produto acabou`)) return;
    
    try {
        const lote = await api.getLote(loteId);
        await fetch(`http://localhost:3000/api/lotes/${loteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({
                quantidade_fechado: 0,
                quantidade_uso: 0,
                data_validade: lote.data_validade,
                data_abertura: lote.data_abertura,
                data_finalizacao: new Date().toISOString().split('T')[0],
                data_solicitacao: lote.data_solicitacao,
                observacoes: (lote.observacoes || '') + '\n[Finalizado em ' + new Date().toLocaleDateString('pt-BR') + ']'
            })
        });
        
        alert('✅ Lote finalizado com sucesso!');
        loadEstoqueCompleto();
    } catch (error) {
        alert('❌ Erro: ' + error.message);
    }
}

async function loadMovimentacoes() {
    const movimentacoes = await api.getMovimentacoes();
    document.querySelector('#movimentacoesTable tbody').innerHTML = movimentacoes.map(m => {
        let tipoClass = m.tipo === 'ENTRADA' ? 'badge-success' : (m.tipo === 'SAIDA' || m.tipo === 'VENCIMENTO') ? 'badge-danger' : 'badge-warning';
        return `<tr><td>${formatDateTime(m.data_movimentacao)}</td><td>${m.descricao}</td><td>${m.numero_lote}</td><td><span class="badge ${tipoClass}">${m.tipo}</span></td><td>${m.quantidade}</td><td>${m.motivo}</td><td>${m.usuario_nome}</td></tr>`;
    }).join('');
}

async function loadInventarios() {
    try {
        console.log('📋 Carregando inventários...');
        const inventarios = await api.getInventarios();
        console.log('📋 Inventários recebidos:', inventarios);
        
        const container = document.getElementById('inventarioList');
        if (!container) {
            console.error('❌ Container inventarioList não encontrado!');
            return;
        }
        
        if (!inventarios || inventarios.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Nenhum inventário encontrado. Clique em "+ Novo Inventário" para começar.</p>';
            return;
        }
        
        container.innerHTML = inventarios.map(inv => `
            <div class="inventory-card">
                <div class="inventory-header">
                    <div>
                        <h3>📋 Inventário #${inv.id}</h3>
                        <p><strong>Data:</strong> ${formatDateTime(inv.data_inventario)}</p>
                        <p><strong>Responsável:</strong> ${inv.usuario_nome}</p>
                        <p><strong>Total de Itens:</strong> ${inv.total_itens}</p>
                        ${inv.observacoes ? `<p><strong>Observações:</strong> ${inv.observacoes}</p>` : ''}
                    </div>
                    <div class="inventory-actions">
                        ${inv.finalizado 
                            ? `<span class="badge badge-success" style="margin-right: 0.5rem;">✓ Finalizado</span>
                               <button class="btn btn-success" onclick="verInventario(${inv.id})">Ver Detalhes</button>` 
                            : `<button class="btn btn-primary" onclick="continuarInventario(${inv.id})">Continuar Contagem</button>
                               <button class="btn btn-success" onclick="finalizarInventarioConfirm(${inv.id})">✓ Finalizar</button>`
                        }
                    </div>
                </div>
            </div>
        `).join('');
        
        console.log('✅ Inventários renderizados com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar inventários:', error);
        const container = document.getElementById('inventarioList');
        if (container) {
            container.innerHTML = `<p style="text-align: center; color: red; padding: 2rem;">Erro ao carregar inventários: ${error.message}</p>`;
        }
    }
}

async function createInventario() {
    if (!confirm('Deseja criar um novo inventário?\n\nIsso irá registrar todos os lotes atuais do estoque.')) {
        return;
    }
    
    const obs = prompt('Observações (opcional):') || '';
    
    try {
        console.log('📋 Criando novo inventário...');
        const result = await api.createInventario(obs);
        console.log('✅ Inventário criado:', result);
        alert(`✅ Inventário #${result.id} criado com sucesso!\n\nTotal de itens: ${result.totalItens}`);
        await loadInventarios();
        // Abrir automaticamente o inventário recém-criado
        setTimeout(() => continuarInventario(result.id), 500);
    } catch (error) {
        console.error('❌ Erro ao criar inventário:', error);
        alert('❌ Erro ao criar inventário: ' + error.message);
    }
}

async function continuarInventario(inventarioId) {
    try {
        console.log('📋 Carregando detalhes do inventário #' + inventarioId);
        const inventarioData = await api.getInventario(inventarioId);
        const itens = inventarioData.itens || [];
        const finalizado = inventarioData.finalizado;
        
        console.log('📋 Itens recebidos:', itens);
        console.log('📋 Finalizado:', finalizado);
        
        if (!itens || itens.length === 0) {
            alert('⚠️ Este inventário não possui itens.');
            return;
        }

        // Se finalizado, mostrar mensagem e desabilitar edição
        const statusMsg = finalizado ? '<div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 0.75rem; margin-bottom: 1rem; color: #856404;"><strong>⚠️ Inventário Finalizado</strong><br>Este inventário está finalizado e não pode ser modificado.</div>' : '';
        
        const content = `
            ${statusMsg}
            <div style="margin-bottom: 1rem;">
                <p><strong>Total de itens:</strong> ${itens.length}</p>
                <p style="color: #666; font-size: 0.9rem;">Insira a quantidade contada fisicamente para cada lote.</p>
            </div>
            <div style="max-height: 55vh; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px;">
                <table class="data-table" style="width: 100%; font-size: 0.85rem; margin: 0;">
                    <thead style="position: sticky; top: 0; background: #f5f5f5; z-index: 10;">
                        <tr>
                            <th style="padding: 0.5rem; min-width: 150px;">Produto</th>
                            <th style="padding: 0.5rem; min-width: 80px;">Lote</th>
                            <th style="padding: 0.5rem; min-width: 80px;">Sistema</th>
                            <th style="padding: 0.5rem; min-width: 100px;">Contado</th>
                            <th style="padding: 0.5rem; min-width: 70px;">Diferença</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itens.map(item => {
                            const diff = item.diferenca !== null ? parseFloat(item.diferenca) : null;
                            let diffClass = '';
                            let diffText = '-';
                            
                            if (diff !== null) {
                                if (diff < 0) {
                                    diffClass = 'style="color: red; font-weight: bold;"';
                                    diffText = diff.toString();
                                } else if (diff > 0) {
                                    diffClass = 'style="color: green; font-weight: bold;"';
                                    diffText = '+' + diff;
                                } else {
                                    diffClass = 'style="color: #4CAF50; font-weight: bold;"';
                                    diffText = '0 ✓';
                                }
                            }
                            
                            const unidade = item.tipo_unidade === 'L' || item.tipo_unidade === 'mL' || item.tipo_unidade === 'kg' || item.tipo_unidade === 'g' || item.tipo_unidade === 'mg' ? item.tipo_unidade : item.tipo_unidade;
                            
                            return `
                            <tr id="row_${item.id}">
                                <td style="padding: 0.5rem; font-size: 0.8rem;">${item.descricao}</td>
                                <td style="padding: 0.5rem;"><strong>${item.numero_lote}</strong></td>
                                <td style="padding: 0.5rem; text-align: center;">${item.quantidade_sistema} ${unidade}</td>
                                <td style="padding: 0.5rem; text-align: center;">
                                    <input type="number" 
                                        step="0.01" 
                                        id="contagem_${item.id}" 
                                        value="${item.quantidade_contada !== null ? item.quantidade_contada : ''}"
                                        placeholder="${item.quantidade_sistema}"
                                        onchange="salvarContagemItem(${item.id})"
                                        ${finalizado ? 'disabled' : ''}
                                        style="width: 70px; padding: 0.3rem; text-align: center; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem; ${finalizado ? 'background: #f5f5f5; cursor: not-allowed;' : ''}">
                                    ${unidade}
                                </td>
                                <td id="diff_${item.id}" style="padding: 0.5rem; text-align: center;" ${diffClass}>${diffText}</td>
                            </tr>
                        `;}).join('')}
                    </tbody>
                </table>
            </div>
            <div class="form-actions" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid #ddd;">
                <button type="button" class="btn" onclick="adicionarLoteInventario(${inventarioId})" ${finalizado ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>+ Adicionar Lote</button>
                <button type="button" class="btn" onclick="closeModal()">Fechar</button>
                ${!finalizado ? `<button type="button" class="btn btn-success" onclick="finalizarInventarioConfirm(${inventarioId})">
                    ✓ Finalizar Inventário
                </button>` : ''}
            </div>
        `;
        
        showModal(`Inventário #${inventarioId}`, content);
    } catch (error) {
        console.error('❌ Erro ao carregar inventário:', error);
        alert('❌ Erro ao carregar inventário: ' + error.message);
    }
}

async function verInventario(inventarioId) {
    continuarInventario(inventarioId);
}

async function salvarContagemItem(itemId) {
    const input = document.getElementById(`contagem_${itemId}`);
    const quantidade = parseFloat(input.value);
    
    if (isNaN(quantidade) || quantidade < 0) {
        input.style.background = '#ffebee';
        alert('❌ Digite uma quantidade válida (maior ou igual a zero)');
        return;
    }
    
    try {
        input.disabled = true;
        input.style.background = '#fff9c4';
        
        const result = await api.updateInventarioItem(itemId, quantidade, '');
        
        input.style.background = '#c8e6c9';
        input.disabled = false;
        
        // Atualizar diferença
        const row = document.getElementById(`row_${itemId}`);
        if (row) {
            const diffCell = document.getElementById(`diff_${itemId}`);
            const sistemaTd = row.querySelector('td:nth-child(3)');
            const sistemaText = sistemaTd.textContent.trim();
            const sistema = parseFloat(sistemaText.split(' ')[0]);
            const diff = quantidade - sistema;
            
            let diffClass = '';
            let diffText = '';
            
            if (diff < 0) {
                diffClass = 'style="color: red; font-weight: bold;"';
                diffText = diff.toString();
            } else if (diff > 0) {
                diffClass = 'style="color: green; font-weight: bold;"';
                diffText = '+' + diff;
            } else {
                diffClass = 'style="color: #4CAF50; font-weight: bold;"';
                diffText = '0 ✓';
            }
            
            diffCell.innerHTML = diffText;
            diffCell.setAttribute('style', diffClass.replace('style="', '').replace('"', ''));
        }
        
        setTimeout(() => {
            input.style.background = '';
        }, 1500);
        
    } catch (error) {
        input.style.background = '#ffebee';
        input.disabled = false;
        console.error('❌ Erro ao salvar item:', error);
        alert('❌ Erro ao salvar: ' + error.message);
    }
}

async function finalizarInventarioConfirm(inventarioId) {
    if (!confirm('⚠️ Finalizar inventário?\n\nApós finalizado, não será mais possível editar as contagens.')) {
        return;
    }
    
    try {
        await api.finalizarInventario(inventarioId);
        closeModal();
        alert('✅ Inventário finalizado com sucesso!');
        await loadInventarios();
        loadEstoqueCompleto();
        loadMovimentacoes();
    } catch (error) {
        console.error('❌ Erro ao finalizar:', error);
        alert('❌ Erro ao finalizar inventário: ' + error.message);
    }
}

async function removerLoteInventario(itemId, inventarioId) {
    if (!confirm('Remover este lote da contagem?')) return;
    
    try {
        await fetch(`http://localhost:3000/api/inventario/item/${itemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const row = document.getElementById(`row_${itemId}`);
        if (row) row.remove();
        alert('✅ Lote removido da contagem');
    } catch (error) {
        alert('❌ Erro ao remover: ' + error.message);
    }
}

async function adicionarLoteInventario(inventarioId) {
    const produtos = await api.getProdutos();
    
    const content = `
        <form id="adicionarLoteInventarioForm">
            <div class="form-group">
                <label>Produto *</label>
                <select name="produto_id" required>
                    <option value="">Selecione...</option>
                    ${produtos.map(p => `<option value="${p.id}">${p.codigo} - ${p.descricao}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Número do Lote *</label>
                <input type="text" name="numero_lote" required placeholder="Ex: BCBX6055, SZD267XV">
            </div>
            <div class="form-group">
                <label>Fabricante</label>
                <input type="text" name="fabricante" placeholder="Opcional">
            </div>
            <div class="form-group">
                <label>Quantidade *</label>
                <input type="number" step="0.01" name="quantidade" required min="0.01" placeholder="0.00">
            </div>
            <div class="form-group">
                <label>Data de Validade *</label>
                <input type="date" name="data_validade" required>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Adicionar Lote</button>
            </div>
        </form>
    `;
    
    showModal('Adicionar Novo Lote', content, async (e) => {
        const formData = new FormData(e.target);
        
        try {
            // Primeiro criar o lote
            const loteResult = await api.createLote({
                produto_id: formData.get('produto_id'),
                numero_lote: formData.get('numero_lote'),
                quantidade_inicial: formData.get('quantidade'),
                fabricante: formData.get('fabricante'),
                data_validade: formData.get('data_validade')
            });
            
            // Depois adicionar ao inventário
            await fetch(`http://localhost:3000/api/inventario/${inventarioId}/lote/${loteResult.id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            alert('✅ Lote criado e adicionado ao inventário!');
            closeModal();
            setTimeout(() => continuarInventario(inventarioId), 300);
        } catch (error) {
            alert('❌ Erro: ' + error.message);
        }
    });
}

async function loadUsuarios() {
    const usuarios = await api.getUsuarios();
    document.querySelector('#usuariosTable tbody').innerHTML = usuarios.map(u => `
        <tr>
            <td>${u.username}</td>
            <td>${u.nome}</td>
            <td>${u.email || '-'}</td>
            <td><span class="badge ${u.ativo ? 'badge-success' : 'badge-danger'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
            <td>${formatDate(u.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editarUsuario(${u.id})">✏️ Editar</button>
                <button class="btn btn-sm btn-warning" onclick="toggleUsuario(${u.id}, ${u.ativo})">${u.ativo ? 'Desativar' : 'Ativar'}</button>
            </td>
        </tr>
    `).join('');
}

async function editarUsuario(id) {
    const usuarios = await api.getUsuarios();
    const usuario = usuarios.find(u => u.id === id);
    
    const content = `
        <form id="editUsuarioForm">
            <div class="form-group">
                <label>Username</label>
                <input type="text" name="username" value="${usuario.username}" disabled>
            </div>
            <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" name="nome" value="${usuario.nome}" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" value="${usuario.email || ''}" required>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        </form>
    `;
    
    showModal('Editar Usuário', content, async (e) => {
        const formData = new FormData(e.target);
        await api.updateUsuario(id, {
            username: usuario.username,
            nome: formData.get('nome'),
            email: formData.get('email'),
            ativo: usuario.ativo
        });
        alert('✅ Usuário atualizado com sucesso!');
        loadUsuarios();
    });
}

async function toggleUsuario(id, ativoAtual) {
    const usuarios = await api.getUsuarios();
    const usuario = usuarios.find(u => u.id === id);
    if (confirm(`${ativoAtual ? 'Desativar' : 'Ativar'} usuário?`)) {
        await api.updateUsuario(id, { username: usuario.username, nome: usuario.nome, email: usuario.email, ativo: ativoAtual ? 0 : 1 });
        loadUsuarios();
    }
}

function formatDate(dateString) { return new Date(dateString).toLocaleDateString('pt-BR'); }
function formatDateTime(dateString) { return new Date(dateString).toLocaleString('pt-BR'); }
function loadAllData() { loadEstoqueCompleto(); }

document.getElementById('searchEstoque')?.addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    document.querySelectorAll('#estoqueTableBody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
    });
});
