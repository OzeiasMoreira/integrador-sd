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
      console.error(`[ApostadoresService] Erro no login em ${baseUrl}:`, error.message);
      throw error;
    }
  }

  // Padrão do orquestrador usa camelCase
  _mapToCamelCase(item) {
    if (!item) return item;
    if (item.chave_pix !== undefined) {
      return { ...item, chavePix: item.chave_pix }; // Retorna chavePix e mantem chave_pix opcional ou removemos
    }
    return item;
  }

  async requestWithFallback(method, endpoint, data = null) {
    // 1. Tenta API Primária
    try {
      const responseData = await this._makeRequest(API_PRIMARY, method, endpoint, data);
      
      // Mapeia retorno caso venha com chave_pix (a API primária também retorna chave_pix em GET)
      if (Array.isArray(responseData)) {
        return responseData.map(i => this._mapToCamelCase(i));
      }
      return this._mapToCamelCase(responseData);

    } catch (error) {
      console.warn(`[ApostadoresService] Falha na API Primária (${API_PRIMARY}). Tentando API Reserva... Erro: ${error.message}`);
      
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
        console.error(`[ApostadoresService] Falha na API Reserva (${API_SECONDARY}). Erro: ${fallbackError.message}`);
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

    if (data && method !== 'GET') {
      config.data = data;
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
