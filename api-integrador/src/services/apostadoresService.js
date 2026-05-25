const axios = require('axios');
const https = require('https');

// URLs e Credenciais
const API_PRIMARY = process.env.APOSTADORES_API_PRIMARY || 'https://api-apostadores-fight-azure.vercel.app';
const API_SECONDARY = process.env.APOSTADORES_API_SECONDARY || 'https://api-sd-df8o.onrender.com';
const API_USER = process.env.APOSTADORES_API_USER || 'admin';
const API_PASS = process.env.APOSTADORES_API_PASS || '123';

// Agente para ignorar erro de certificado SSL no localhost, caso usado localmente
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

// Converte recursivamente chaves camelCase para snake_case
function toSnakeCase(obj) {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(toSnakeCase);
    if (typeof obj !== 'object') return obj;

    return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        acc[snakeKey] = toSnakeCase(obj[key]);
        return acc;
    }, {});
}

// Converte recursivamente chaves snake_case para camelCase
function toCamelCase(obj) {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(toCamelCase);
    if (typeof obj !== 'object') return obj;

    return Object.keys(obj).reduce((acc, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        acc[camelKey] = toCamelCase(obj[key]);
        return acc;
    }, {});
}

class ApostadoresService {
    constructor() {
        this.token = null;
    }

    async getAuthToken(baseUrl, forceRefresh = false) {
        if (this.token && !forceRefresh) {
            return this.token;
        }

        try {
            const response = await axios.post(`${baseUrl}/login`, {
                usuario: API_USER,
                senha: API_PASS
            }, { httpsAgent });

            if (response.data && response.data.token) {
                this.token = response.data.token;
                return this.token;
            }
            throw new Error('Falha ao obter token');
        } catch (error) {
            const detalhe = error.response ? error.response.data : error.message;
            console.error(`[ApostadoresService] Erro no login em ${baseUrl}:`, detalhe);
            throw error;
        }
    }

    // Padrão do orquestrador usa camelCase
    _mapToCamelCase(item) {
        if (!item) return item;
        if (item.chave_pix !== undefined) {
            return {...item, chavePix: item.chave_pix }; // Retorna chavePix e mantem chave_pix opcional ou removemos
        }
        return item;
    }

    async requestWithFallback(method, endpoint, data = null) {
        // Ajustes específicos para criação de apostador: preencher valores padrão mínimos
        if (method === 'POST' && endpoint === '/apostadores' && data) {
            if (data.idade === undefined || data.idade === null) {
                console.warn('[ApostadoresService] Campo `idade` ausente — usando valor padrão 0');
                data.idade = 0;
            }
        }
        // 1. Tenta API Primária
        try {
            const responseData = await this._makeRequest(API_PRIMARY, method, endpoint, data);

            // Mapeia retorno caso venha com chave_pix (a API primária também retorna chave_pix em GET)
            if (Array.isArray(responseData)) {
                return responseData.map(i => this._mapToCamelCase(i));
            }
            return this._mapToCamelCase(responseData);

        } catch (error) {
            const detalhePrim = error.response ? error.response.data : error.message;
            console.warn(`[ApostadoresService] Falha na API Primária (${API_PRIMARY}). Tentando API Reserva... Erro:`, detalhePrim);

            // Limpa token para garantir que não foi um problema de token expirado
            if (error.response && error.response.status === 401) {
                this.token = null;
            }

            // 2. Tenta API Reserva
            try {
                const responseData = await this._makeRequestSecondary(API_SECONDARY, method, endpoint, data);

                // Mapeia retorno
                if (Array.isArray(responseData)) {
                    return responseData.map(i => this._mapToCamelCase(i));
                }
                return this._mapToCamelCase(responseData);
            } catch (fallbackError) {
                const detalheSec = fallbackError.response ? fallbackError.response.data : fallbackError.message;
                console.error(`[ApostadoresService] Falha na API Reserva (${API_SECONDARY}). Erro:`, detalheSec);
                throw fallbackError;
            }
        }
    }

    // Request para a API Primária (JWT / camelCase data)
    async _makeRequest(baseUrl, method, endpoint, data) {
        const token = await this.getAuthToken(baseUrl);

        const config = {
            method,
            url: `${baseUrl}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            httpsAgent
        };

        // Se existir payload, converte snake_case -> camelCase antes de enviar para a API primária
        if (data && method !== 'GET') {
            config.data = toCamelCase(data);
        }

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log(`[ApostadoresService] Token expirado em ${baseUrl}. Renovando...`);
                const newToken = await this.getAuthToken(baseUrl, true);
                config.headers['Authorization'] = `Bearer ${newToken}`;
                const retryResponse = await axios(config);
                return retryResponse.data;
            }
            const detalhe = error.response ? { status: error.response.status, data: error.response.data } : error.message;
            console.error(`[ApostadoresService] Erro na requisição para ${baseUrl}${endpoint}:`, detalhe);
            throw error;
        }
    }

    // Request para a API Secundária (FastAPI, No Auth, snake_case data)
    async _makeRequestSecondary(baseUrl, method, endpoint, data) {
        // Ajusta o endpoint para garantir trailing slash se for GET apostadores
        let adjustedEndpoint = endpoint;
        if (!adjustedEndpoint.endsWith('/')) {
            adjustedEndpoint += '/';
        }

        // Traduz o payload para a API 2 (snake_case)
        let adaptedData = data;
        if (data && data.chavePix) {
            adaptedData = {
                ...data,
                chave_pix: data.chavePix
            };
            delete adaptedData.chavePix;
        }
        // Converte todas as chaves para snake_case antes de enviar à API secundária
        if (adaptedData) {
            adaptedData = toSnakeCase(adaptedData);
        }

        const config = {
            method,
            url: `${baseUrl}${adjustedEndpoint}`,
            headers: {
                'Content-Type': 'application/json'
            },
            httpsAgent
        };

        if (adaptedData && method !== 'GET') {
            config.data = adaptedData;
        }

        const response = await axios(config);
        return response.data;
    }

    // --- Contratos da API ---

    async getAllApostadores() {
        return this.requestWithFallback('GET', '/apostadores');
    }

    async getApostadorById(id) {
        return this.requestWithFallback('GET', `/apostadores/${id}`);
    }

    async createApostador(apostadorData) {
        return this.requestWithFallback('POST', '/apostadores', apostadorData);
    }

    async updateApostador(id, apostadorData) {
        return this.requestWithFallback('PUT', `/apostadores/${id}`, apostadorData);
    }

    async deleteApostador(id) {
        return this.requestWithFallback('DELETE', `/apostadores/${id}`);
    }
}

module.exports = new ApostadoresService();