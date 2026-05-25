const axios = require('axios');
const https = require('https');
const crypto = require('crypto');

// URLs e Credenciais
const API_PRIMARY = process.env.APOSTAS_API_PRIMARY || 'https://api-aposta-lutas.vercel.app';
const API_SECONDARY = process.env.APOSTAS_API_SECONDARY || 'http://187.77.235.119:5555';
const API_USER = process.env.APOSTAS_API_USER || 'admin';
const API_PASS = process.env.APOSTAS_API_PASS || '123';

// Agente para ignorar erro de certificado SSL no localhost, se usado localmente
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

class ApostasService {
  constructor() {
    this.token = null;
    this.secondaryPublicKey = null;
  }

  // --- Lógica da API Primária (JWT) ---

  async getAuthToken(baseUrl, forceRefresh = false) {
    if (this.token && !forceRefresh) {
      return this.token;
    }

    try {
      const response = await axios.post(`${baseUrl}/auth/login`, {
        usuario: API_USER,
        senha: API_PASS
      }, { httpsAgent });

      if (response.data && response.data.token) {
        this.token = response.data.token;
        return this.token;
      }
      throw new Error('Falha ao obter token de apostas');
    } catch (error) {
      console.error(`[ApostasService] Erro no login em ${baseUrl}:`, error.message);
      
      // Tenta registrar o usuário caso não exista e tenta logar novamente
      if (error.response && (error.response.status === 401 || error.response.status === 404)) {
        try {
          console.log(`[ApostasService] Tentando registrar o usuário padrão na Vercel...`);
          await axios.post(`${baseUrl}/auth/registrar`, { usuario: API_USER, senha: API_PASS }, { httpsAgent });
          
          const retryResponse = await axios.post(`${baseUrl}/auth/login`, { usuario: API_USER, senha: API_PASS }, { httpsAgent });
          if (retryResponse.data && retryResponse.data.token) {
             this.token = retryResponse.data.token;
             return this.token;
          }
        } catch (regError) {
          console.error(`[ApostasService] Erro ao registrar o usuário padrão:`, regError.message);
        }
      }
      throw error;
    }
  }

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
        console.log(`[ApostasService] Token expirado ou inválido em ${baseUrl}. Renovando...`);
        const newToken = await this.getAuthToken(baseUrl, true);
        
        config.headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await axios(config);
        return retryResponse.data;
      }
      throw error;
    }
  }

  // --- Lógica da API Secundária (Criptografia Híbrida: RSA + AES-256-CBC) ---

  async _getSecondaryPublicKey(baseUrl) {
    if (this.secondaryPublicKey) {
      return this.secondaryPublicKey;
    }
    console.log(`[ApostasService] Buscando chave pública em ${baseUrl}...`);
    const response = await axios.get(`${baseUrl}/crypto/public-key`, { httpsAgent });
    
    // Supondo que a API retorne { publicKey: '-----BEGIN PUBLIC KEY-----...' } ou text/plain
    if (response.data && response.data.publicKey) {
      this.secondaryPublicKey = response.data.publicKey;
    } else if (typeof response.data === 'string') {
      this.secondaryPublicKey = response.data;
    } else {
      throw new Error('Formato de chave pública não reconhecido');
    }
    return this.secondaryPublicKey;
  }

  async _encryptPayload(data, publicKeyPem) {
    // 1. Gera chave AES (32 bytes) e IV (16 bytes)
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    // 2. Cifra os dados com AES-256-CBC
    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    let encryptedData = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encryptedData += cipher.final('base64');

    // 3. Cifra a chave AES com a chave pública RSA (usando padding padrão para Node)
    // O README diz que usa OAEP SHA-256 no `/apostas/demo-cripto`, mas por padrão no crypto é PKCS1_OAEP_PADDING
    const encryptedKeyBuffer = crypto.publicEncrypt(
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      aesKey
    );
    const encryptedKey = encryptedKeyBuffer.toString('base64');

    return {
      encryptedKey,
      iv: iv.toString('base64'),
      encryptedData
    };
  }

  async _makeRequestSecondary(baseUrl, method, endpoint, data) {
    const config = {
      method,
      url: `${baseUrl}${endpoint}`,
      headers: {
        'X-Encrypted': 'true',
        'Content-Type': 'application/json'
      },
      httpsAgent
    };

    if (data && method !== 'GET') {
      // Adapter: Converte o padrão do Frontend (snake_case) para o padrão da API 2 (camelCase)
      const adaptedData = { ...data };
      if (adaptedData.id_apostador !== undefined) {
        adaptedData.idApostador = adaptedData.id_apostador;
        delete adaptedData.id_apostador;
      }
      if (adaptedData.id_luta !== undefined) {
        adaptedData.idLuta = adaptedData.id_luta;
        delete adaptedData.id_luta;
      }
      if (adaptedData.id_lutador !== undefined) {
        adaptedData.idLutador = adaptedData.id_lutador;
        delete adaptedData.id_lutador;
      }

      const publicKey = await this._getSecondaryPublicKey(baseUrl);
      const encryptedPayload = await this._encryptPayload(adaptedData, publicKey);
      config.data = encryptedPayload;
    }

    const response = await axios(config);
    return response.data;
  }

  // --- Fallback Principal ---

  async requestWithFallback(method, endpoint, data = null) {
    // Tenta API Primária (Vercel)
    try {
      return await this._makeRequest(API_PRIMARY, method, endpoint, data);
    } catch (error) {
      console.warn(`[ApostasService] Falha na API Primária (${API_PRIMARY}). Tentando API Secundária... Erro: ${error.message}`);
      
      if (error.response && error.response.status === 401) {
        this.token = null;
      }

      // Tenta API Secundária (nanadebets - Criptografia)
      try {
        return await this._makeRequestSecondary(API_SECONDARY, method, endpoint, data);
      } catch (fallbackError) {
        console.error(`[ApostasService] Falha na API Secundária (${API_SECONDARY}). Erro: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
  }

  // --- Contratos da API ---

  async getAllApostas() {
    return this.requestWithFallback('GET', '/apostas');
  }

  async getApostaById(id) {
    try {
      return await this.requestWithFallback('GET', `/apostas/${id}`);
    } catch (err) {
      const todas = await this.getAllApostas();
      return todas.find(a => String(a.id) === String(id));
    }
  }

  async createAposta(apostaData) {
    return this.requestWithFallback('POST', '/apostas', apostaData);
  }

  async updateAposta(id, apostaData) {
    return this.requestWithFallback('PUT', `/apostas/${id}`, apostaData);
  }

  async deleteAposta(id) {
    return this.requestWithFallback('DELETE', `/apostas/${id}`);
  }
}

module.exports = new ApostasService();
