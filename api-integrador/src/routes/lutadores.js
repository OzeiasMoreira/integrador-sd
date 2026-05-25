const express = require('express');
const router = express.Router();
const lutadoresService = require('../services/lutadoresService');

// Retorna todos os lutadores
router.get('/', async (req, res) => {
  try {
    const lutadores = await lutadoresService.getAllLutadores();
    res.json(lutadores);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    console.error('[API Lutadores] Erro ao buscar lutadores:', detalhe);
    res.status(500).json({ error: 'Erro ao buscar lutadores', detalhe });
  }
});

// Retorna um lutador específico
router.get('/:id', async (req, res) => {
  try {
    const lutador = await lutadoresService.getLutadorById(req.params.id);
    if (!lutador) {
      return res.status(404).json({ error: 'Lutador não encontrado' });
    }
    res.json(lutador);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Lutador não encontrado' });
    }
    console.error(`[API Lutadores] Erro ao buscar lutador ${req.params.id}:`, detalhe);
    res.status(500).json({ error: 'Erro ao buscar lutador', detalhe });
  }
});

// Cria um novo lutador
router.post('/', async (req, res) => {
  try {
    const novoLutador = await lutadoresService.createLutador(req.body);
    res.status(201).json(novoLutador);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    console.error('[API Lutadores] Erro ao registrar lutador:', detalhe);
    const status = error.response ? error.response.status : 500;
    res.status(status).json({ error: 'Erro ao registrar lutador', detalhe });
  }
});

// Atualiza um lutador existente
router.put('/:id', async (req, res) => {
  try {
    const lutadorAtualizado = await lutadoresService.updateLutador(req.params.id, req.body);
    res.json(lutadorAtualizado);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Lutador não encontrado' });
    }
    console.error(`[API Lutadores] Erro ao atualizar lutador ${req.params.id}:`, detalhe);
    res.status(500).json({ error: 'Erro ao atualizar lutador', detalhe });
  }
});

// Remove um lutador
router.delete('/:id', async (req, res) => {
  try {
    const resultado = await lutadoresService.deleteLutador(req.params.id);
    res.json(resultado);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Lutador não encontrado' });
    }
    console.error(`[API Lutadores] Erro ao remover lutador ${req.params.id}:`, detalhe);
    res.status(500).json({ error: 'Erro ao remover lutador', detalhe });
  }
});

module.exports = router;
