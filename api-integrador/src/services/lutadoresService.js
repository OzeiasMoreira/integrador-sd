const axios = require('axios');
const https = require('https');
const crypto = require('crypto');

// URLs
const API_PRIMARY = process.env.LUTADORES_API_PRIMARY || 'https://lutadores-api-22f61a69f511.herokuapp.com';
const API_SECONDARY = process.env.LUTADORES_API_SECONDARY || 'https://api-lutadoressd.onrender.com/api';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

class LutadoresService {
  constructor() {
    this.handshakeRealizado = {}; // Controla o handshake por baseUrl { 'https://...': true }
    this.privateKey = null;
    this.publicKeyBase64 = null;
    this._initKeys();
  }

  // Gera o par de chaves RSA do lado do Orquestrador
  _initKeys() {
    console.log('[LutadoresService] Gerando par de chaves RSA-2048 para o Orquestrador...');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'der'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    this.publicKeyBase64 = publicKey.toString('base64');
    this.privateKey = privateKey;
    console.log('[LutadoresService] Chaves geradas com sucesso.');
  }

  // Faz o handshake se ainda não tiver feito para a API requisitada (API Primária)
  async _ensureHandshake(baseUrl) {
    if (this.handshakeRealizado[baseUrl]) {
      return;
    }

    try {
      console.log(`[LutadoresService] Realizando Handshake com ${baseUrl}...`);
      await axios.post(`${baseUrl}/handshake`, {
        publicKey: this.publicKeyBase64
      }, {
        headers: { 'Content-Type': 'application/json' },
        httpsAgent
      });
      
      this.handshakeRealizado[baseUrl] = true;
      console.log(`[LutadoresService] Handshake com ${baseUrl} realizado com sucesso.`);
    } catch (error) {
      console.error(`[LutadoresService] Erro no Handshake com ${baseUrl}:`, error.message);
      throw error;
    }
  }

  // Descriptografa os chunks RSA retornados pela API Primária
  _decryptResponse(axiosResponse) {
    if (axiosResponse.headers['x-content-encrypted'] !== 'true') {
      return axiosResponse.data;
    }

    try {
      const chunksBase64 = axiosResponse.data;
      let decryptedBuffer = Buffer.alloc(0);

      for (const chunk of chunksBase64) {
        const chunkBuffer = Buffer.from(chunk, 'base64');
        const decryptedChunk = crypto.privateDecrypt(
          {
            key: this.privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
          },
          chunkBuffer
        );
        decryptedBuffer = Buffer.concat([decryptedBuffer, decryptedChunk]);
      }

      let jsonString = decryptedBuffer.toString('utf8');
      
      // Higienização para consertar o bug da Heroku de ""Socrates""
      jsonString = jsonString.replace(/""([^"]*)""/g, '"$1"');
      
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        console.error('[LutadoresService] Erro ao dar parse no JSON. String decifrada:');
        console.error(jsonString);
        throw new Error('Falha ao decifrar resposta do servidor. JSON Invalido.');
      }
    } catch (error) {
      if (error.message.includes('JSON Invalido')) throw error;
      console.error('[LutadoresService] Erro ao decifrar chunks RSA:', error.message);
      throw new Error('Falha ao decifrar resposta do servidor.');
    }
  }

  // Método central para a API Primária (Heroku + RSA)
  async _makeRequest(baseUrl, method, endpoint, params = null) {
    await this._ensureHandshake(baseUrl);

    const config = {
      method,
      url: `${baseUrl}${endpoint}`,
      httpsAgent
    };

    // Parâmetros vão na Query String (conforme exigência da Heroku)
    if (params) {
      config.params = params;
    }

    const response = await axios(config);
    return this._decryptResponse(response);
  }

  // Método central para a API Secundária (Render + Spring Boot + Plain JSON)
  async _makeRequestSecondary(baseUrl, method, endpoint, params = null) {
    const config = {
      method,
      url: `${baseUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      },
      httpsAgent
    };

    // Na API Secundária, os dados são enviados como JSON (Body), e não como Query Params!
    if (params && method !== 'GET') {
      config.data = params;
    }

    const response = await axios(config);
    return response.data;
  }

  // Motor de Fallback (Primary -> Secondary)
  async requestWithFallback(method, endpoint, params = null) {
    let currentUrl = API_PRIMARY;
    
    try {
      return await this._makeRequest(currentUrl, method, endpoint, params);
    } catch (error) {
      console.warn(`[LutadoresService] Falha na API Primária (${currentUrl}). Erro: ${error.message}`);
      
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }

      currentUrl = API_SECONDARY;
      console.warn(`[LutadoresService] Tentando API Reserva (${currentUrl})...`);
      try {
        return await this._makeRequestSecondary(currentUrl, method, endpoint, params);
      } catch (fallbackError) {
        console.error(`[LutadoresService] Falha na API Reserva (${currentUrl}). Erro: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
  }

  // --- Contratos da API ---

  async getAllLutadores() {
    return this.requestWithFallback('GET', '/lutadores');
  }

  async getLutadorById(id) {
    return this.requestWithFallback('GET', `/lutadores/${id}`);
  }

  async createLutador(lutadorData) {
    return this.requestWithFallback('POST', '/lutadores', lutadorData);
  }

  async updateLutador(id, lutadorData) {
    return this.requestWithFallback('PUT', `/lutadores/${id}`, lutadorData);
  }

  async deleteLutador(id) {
    return this.requestWithFallback('DELETE', `/lutadores/${id}`);
  }
}

module.exports = new LutadoresService();
