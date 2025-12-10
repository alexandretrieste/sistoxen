// Auth functions
let currentUser = null;

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        showLogin();
        return false;
    }
    return true;
}

function showLogin() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('mainScreen').classList.remove('active');
}

function showMain() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainScreen').classList.add('active');
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');
    
    try {
        const data = await api.login(username, password);
        currentUser = data.user;
        document.getElementById('userName').textContent = data.user.nome;
        errorEl.textContent = '';
        
        // Mostrar/ocultar aba de usuários conforme permissão
        const usuariosBtn = document.querySelector('.nav-btn[data-view="usuarios"]');
        if (usuariosBtn) {
            usuariosBtn.style.display = data.user.is_admin ? '' : 'none';
        }
        
        showMain();
        loadAllData();
    } catch (error) {
        errorEl.textContent = error.message;
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    api.clearToken();
    currentUser = null;
    showLogin();
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
});

function showCadastroForm() {
    const content = `
        <form id="cadastroForm">
            <div class="form-group">
                <label>Nome Completo *</label>
                <input type="text" name="nome" required>
            </div>
            <div class="form-group">
                <label>Usuário *</label>
                <input type="text" name="username" required minlength="3">
            </div>
            <div class="form-group">
                <label>Email *</label>
                <input type="email" name="email" required>
            </div>
            <div class="form-group">
                <label>Senha *</label>
                <input type="password" name="password" required minlength="6">
            </div>
            <div class="form-group">
                <label>Confirmar Senha *</label>
                <input type="password" name="password2" required minlength="6">
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Criar Conta</button>
            </div>
        </form>
    `;
    
    showModal('Criar Nova Conta', content, async (e) => {
        const formData = new FormData(e.target);
        const data = {
            nome: formData.get('nome'),
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password')
        };
        
        if (data.password !== formData.get('password2')) {
            alert('❌ As senhas não coincidem!');
            return;
        }
        
        try {
            await fetch('http://localhost:3000/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            alert('✅ Conta criada com sucesso! Faça login.');
            closeModal();
        } catch (error) {
            alert('❌ Erro ao criar conta: ' + error.message);
        }
    });
}

function showResetRequestForm() {
    const content = `
        <form id="resetRequestForm">
            <div class="form-group">
                <label>Usuário</label>
                <input type="text" name="username" required>
            </div>
            <div class="form-group">
                <label>Email cadastrado</label>
                <input type="email" name="email" required>
            </div>
            <p style="font-size: 0.9rem; color: #555;">Enviaremos um código de 6 dígitos com validade de 15 minutos.</p>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Enviar código</button>
            </div>
        </form>
    `;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Recuperar senha</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            ${content}
        </div>
    `;
    document.getElementById('modalContainer').appendChild(modal);

    modal.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const email = formData.get('email');
        try {
            await api.solicitarReset(username, email);
            alert('Código enviado! Verifique seu email.');
            closeModal();
            showResetConfirmForm(username);
        } catch (err) {
            alert('❌ Erro ao enviar código: ' + err.message);
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function showResetConfirmForm(prefilledUsername = '') {
    const content = `
        <form id="resetConfirmForm">
            <div class="form-group">
                <label>Usuário</label>
                <input type="text" name="username" value="${prefilledUsername}" required>
            </div>
            <div class="form-group">
                <label>Código recebido</label>
                <input type="text" name="code" required maxlength="6" minlength="6" inputmode="numeric">
            </div>
            <div class="form-group">
                <label>Nova senha</label>
                <input type="password" name="newPassword" required minlength="6">
            </div>
            <p style="font-size: 0.9rem; color: #555;">O código expira em 15 minutos e só pode ser usado uma vez.</p>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Redefinir senha</button>
            </div>
        </form>
    `;

    showModal('Inserir código', content, async (e) => {
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const code = formData.get('code');
        const newPassword = formData.get('newPassword');
        await api.confirmarReset(username, code, newPassword);
        alert('Senha redefinida! Faça login com a nova senha.');
        closeModal();
    });
}

// Initialize
if (checkAuth()) {
    showMain();
    loadAllData();
}
