const express = require('express');
const router = express.Router();
const apostadoresService = require('../services/apostadoresService');

// Retorna todos os apostadores
router.get('/', async (req, res) => {
  try {
    const apostadores = await apostadoresService.getAllApostadores();
    res.json(apostadores);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    console.error('[API] Erro ao buscar apostadores:', detalhe);
    res.status(500).json({ error: 'Erro ao buscar apostadores', detalhe });
  }
});

// Retorna um apostador específico
router.get('/:id', async (req, res) => {
  try {
    const apostador = await apostadoresService.getApostadorById(req.params.id);
    res.json(apostador);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Apostador não encontrado' });
    }
    console.error(`[API] Erro ao buscar apostador ${req.params.id}:`, error.message);
    res.status(500).json({ error: 'Erro ao buscar apostador', detalhe: error.message });
  }
});

// Cria um novo apostador
router.post('/', async (req, res) => {
  try {
    const novoApostador = await apostadoresService.createApostador(req.body);
    res.status(201).json(novoApostador);
  } catch (error) {
    console.error('[API] Erro ao criar apostador:', error.message);
    const status = error.response ? error.response.status : 500;
    res.status(status).json({ error: 'Erro ao criar apostador', detalhe: error.message });
  }
});

// Atualiza um apostador existente
router.put('/:id', async (req, res) => {
  try {
    const apostadorAtualizado = await apostadoresService.updateApostador(req.params.id, req.body);
    res.json(apostadorAtualizado);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Apostador não encontrado' });
    }
    console.error(`[API] Erro ao atualizar apostador ${req.params.id}:`, error.message);
    res.status(500).json({ error: 'Erro ao atualizar apostador', detalhe: error.message });
  }
});

// Remove um apostador
router.delete('/:id', async (req, res) => {
  try {
    const resultado = await apostadoresService.deleteApostador(req.params.id);
    res.json(resultado);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Apostador não encontrado' });
    }
    console.error(`[API] Erro ao remover apostador ${req.params.id}:`, error.message);
    res.status(500).json({ error: 'Erro ao remover apostador', detalhe: error.message });
  }
});

module.exports = router;
