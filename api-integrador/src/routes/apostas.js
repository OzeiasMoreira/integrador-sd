const express = require('express');
const router = express.Router();
const apostasService = require('../services/apostasService');

// Retorna todas as apostas
router.get('/', async (req, res) => {
  try {
    const apostas = await apostasService.getAllApostas();
    res.json(apostas);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    console.error('[API Apostas] Erro ao buscar apostas:', detalhe);
    res.status(500).json({ error: 'Erro ao buscar apostas', detalhe });
  }
});

// Retorna uma aposta específica
router.get('/:id', async (req, res) => {
  try {
    const aposta = await apostasService.getApostaById(req.params.id);
    if (!aposta) {
      return res.status(404).json({ error: 'Aposta não encontrada' });
    }
    res.json(aposta);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Aposta não encontrada' });
    }
    console.error(`[API Apostas] Erro ao buscar aposta ${req.params.id}:`, detalhe);
    res.status(500).json({ error: 'Erro ao buscar aposta', detalhe });
  }
});

// Cria uma nova aposta
router.post('/', async (req, res) => {
  try {
    const novaAposta = await apostasService.createAposta(req.body);
    res.status(201).json(novaAposta);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    console.error('[API Apostas] Erro ao registrar aposta:', detalhe);
    const status = error.response ? error.response.status : 500;
    res.status(status).json({ error: 'Erro ao registrar aposta', detalhe });
  }
});

// Atualiza uma aposta existente
router.put('/:id', async (req, res) => {
  try {
    const apostaAtualizada = await apostasService.updateAposta(req.params.id, req.body);
    res.json(apostaAtualizada);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Aposta não encontrada' });
    }
    console.error(`[API Apostas] Erro ao atualizar aposta ${req.params.id}:`, detalhe);
    res.status(500).json({ error: 'Erro ao atualizar aposta', detalhe });
  }
});

// Remove uma aposta
router.delete('/:id', async (req, res) => {
  try {
    const resultado = await apostasService.deleteAposta(req.params.id);
    res.json(resultado);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Aposta não encontrada' });
    }
    console.error(`[API Apostas] Erro ao remover aposta ${req.params.id}:`, detalhe);
    res.status(500).json({ error: 'Erro ao remover aposta', detalhe });
  }
});

module.exports = router;
