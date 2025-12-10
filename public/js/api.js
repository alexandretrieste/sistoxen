const API_URL = 'http://localhost:3000/api';

let token = localStorage.getItem('token');

const api = {
    setToken(newToken) {
        token = newToken;
        localStorage.setItem('token', newToken);
    },

    clearToken() {
        token = null;
        localStorage.removeItem('token');
    },

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Auth
    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        this.setToken(data.token);
        return data;
    },

    // Produtos
    async getProdutos() {
        return this.request('/produtos');
    },

    async getProduto(id) {
        return this.request(`/produtos/${id}`);
    },

    async getEstoque() {
        return this.request('/produtos/estoque/consolidado');
    },

    async createProduto(data) {
        return this.request('/produtos', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateProduto(id, data) {
        return this.request(`/produtos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteProduto(id) {
        return this.request(`/produtos/${id}`, {
            method: 'DELETE'
        });
    },

    // Lotes
    async getLotes() {
        const result = await this.request('/lotes');
        return Array.isArray(result) ? result : [];
    },

    async getLote(id) {
        return this.request(`/lotes/${id}`);
    },

    async getLotesByProduto(produtoId) {
        const result = await this.request(`/lotes/produto/${produtoId}`);
        return Array.isArray(result) ? result : [];
    },

    async createLote(data) {
        return this.request('/lotes', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async abrirLote(id, justificativa) {
        return this.request(`/lotes/${id}/abrir`, {
            method: 'POST',
            body: JSON.stringify({ justificativa })
        });
    },

    async updateLoteQuantidades(id, quantidade_fechado, quantidade_uso) {
        return this.request(`/lotes/${id}/quantidades`, {
            method: 'PUT',
            body: JSON.stringify({ quantidade_fechado, quantidade_uso })
        });
    },

    async deleteLote(id) {
        return this.request(`/lotes/${id}`, {
            method: 'DELETE'
        });
    },

    // Movimentações
    async getMovimentacoes() {
        const result = await this.request('/movimentacoes');
        return Array.isArray(result) ? result : [];
    },

    async getMovimentacoesByLote(loteId) {
        const result = await this.request(`/movimentacoes/lote/${loteId}`);
        return Array.isArray(result) ? result : [];
    },

    async createMovimentacao(data) {
        return this.request('/movimentacoes', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // Inventário
    async getInventarios() {
        const result = await this.request('/inventario');
        return Array.isArray(result) ? result : [];
    },

    async getInventario(id) {
        return await this.request(`/inventario/${id}`);
    },

    async createInventario(observacoes) {
        return this.request('/inventario', {
            method: 'POST',
            body: JSON.stringify({ observacoes })
        });
    },

    async updateInventarioItem(id, quantidade_contada, observacoes) {
        return this.request(`/inventario/item/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ quantidade_contada, observacoes })
        });
    },

    async finalizarInventario(id) {
        return this.request(`/inventario/${id}/finalizar`, {
            method: 'POST'
        });
    },

    // Usuários
    async getUsuarios() {
        return this.request('/usuarios');
    },

    async createUsuario(data) {
        return this.request('/usuarios', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateUsuario(id, data) {
        return this.request(`/usuarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async updateSenha(id, password) {
        return this.request(`/usuarios/${id}/senha`, {
            method: 'PUT',
            body: JSON.stringify({ password })
        });
    },

    async solicitarReset(username, email) {
        return this.request('/usuarios/reset-solicitar', {
            method: 'POST',
            body: JSON.stringify({ username, email })
        });
    },

    async confirmarReset(username, code, newPassword) {
        return this.request('/usuarios/reset-confirmar', {
            method: 'POST',
            body: JSON.stringify({ username, code, newPassword })
        });
    }
};
