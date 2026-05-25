const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// URLs e Credenciais
const API_PRIMARY = process.env.LUTAS_API_PRIMARY || 'https://bet3m-production.up.railway.app';
const API_SECONDARY = process.env.LUTAS_API_SECONDARY || 'https://betting-api-beta.vercel.app';
const API_KEY = process.env.LUTAS_API_KEY || 'bet3M-UENP';
const API_NOME = process.env.LUTAS_API_NOME || 'api_integrador_node';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

class LutasService {
  constructor() {
    this.privateKey = null;
    this._initKeys();
  }

  // --- Inicialização de Chaves M2M ---
  _initKeys() {
    const privKeyPath = path.join(process.cwd(), 'private_key.pem');
    const pubKeyPath = path.join(process.cwd(), 'public_key.pem');

    if (!fs.existsSync(privKeyPath)) {
      console.log('[LutasService] Chaves M2M não encontradas. Gerando novo par de chaves RSA-2048...');
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
        },
      });

      fs.writeFileSync(privKeyPath, privateKey);
      fs.writeFileSync(pubKeyPath, publicKey);
      console.log('[LutasService] Chaves salvas na raiz do projeto (private_key.pem, public_key.pem).');
    }

    // Carrega a chave privada para memória
    this.privateKey = fs.readFileSync(privKeyPath, 'utf8');
  }

  // Gera Assinatura Digital RSA-PSS baseada na rota
  _gerarAssinatura(rota) {
    const mensagem = `${API_NOME}:${rota}`;
    const assinatura = crypto.sign("sha256", Buffer.from(mensagem), {
      key: this.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN,
    });
    return assinatura.toString("base64");
  }

  // --- API Primária (Railway) ---
  async _makeRequest(baseUrl, method, endpoint, data = null) {
    const config = {
      method,
      url: `${baseUrl}${endpoint}`,
      headers: {
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      },
      httpsAgent
    };

    if (data && method !== 'GET') {
      // ADAPTER: A Railway exige lutador1/lutador2, o Frontend e a Vercel usam id_lutador1/id_lutador2.
      const adaptedData = { ...data };
      if (adaptedData.id_lutador1 !== undefined) {
        adaptedData.lutador1 = Number(adaptedData.id_lutador1);
        delete adaptedData.id_lutador1;
      }
      if (adaptedData.id_lutador2 !== undefined) {
        adaptedData.lutador2 = Number(adaptedData.id_lutador2);
        delete adaptedData.id_lutador2;
      }
      if (adaptedData.lutador1 !== undefined) {
        adaptedData.lutador1 = Number(adaptedData.lutador1);
      }
      if (adaptedData.lutador2 !== undefined) {
        adaptedData.lutador2 = Number(adaptedData.lutador2);
      }
      config.data = adaptedData;
    }

    const response = await axios(config);
    return response.data;
  }

  // --- API Secundária M2M (Vercel) ---
  async _makeRequestSecondary(baseUrl, method, endpoint, data = null) {
    // A rota assinada tem que ser EXATAMENTE a que está sendo chamada, com a barra certa
    // O Vercel espera "/lutas/" para listagem e criação, e "/lutas/5" para IDs.
    let rotaAssinada = endpoint; 
    if (endpoint === '/lutas') rotaAssinada = '/lutas/';

    const config = {
      method,
      url: `${baseUrl}${rotaAssinada}`,
      headers: {
        'x-api-nome': API_NOME,
        'x-assinatura': this._gerarAssinatura(rotaAssinada),
        'Content-Type': 'application/json'
      },
      httpsAgent
    };

    if (data && method !== 'GET') {
      // A Vercel aceita "id_lutador1" nativamente, não precisamos do adapter aqui
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  }

  // --- Motor de Fallback (Primary -> Secondary) ---
  async requestWithFallback(method, endpoint, data = null) {
    let currentUrl = API_PRIMARY;
    
    try {
      return await this._makeRequest(currentUrl, method, endpoint, data);
    } catch (error) {
      console.warn(`[LutasService] Falha na API Primária (${currentUrl}). Erro: ${error.message}`);
      
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }

      currentUrl = API_SECONDARY;
      console.warn(`[LutasService] Tentando API Reserva (${currentUrl})...`);
      try {
        return await this._makeRequestSecondary(currentUrl, method, endpoint, data);
      } catch (fallbackError) {
        console.error(`[LutasService] Falha na API Reserva (${currentUrl}). Erro: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
  }

  // --- Contratos da API ---

  async getAllLutas() {
    return this.requestWithFallback('GET', '/lutas');
  }

  async getLutaById(id) {
    return this.requestWithFallback('GET', `/lutas/${id}`);
  }

  async createLuta(lutaData) {
    return this.requestWithFallback('POST', '/lutas', lutaData);
  }

  async updateLuta(id, lutaData) {
    return this.requestWithFallback('PUT', `/lutas/${id}`, lutaData);
  }

  async deleteLuta(id) {
    return this.requestWithFallback('DELETE', `/lutas/${id}`);
  }
}

module.exports = new LutasService();
