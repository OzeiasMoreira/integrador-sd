const express = require('express');
const router = express.Router();
const lutasService = require('../services/lutasService');

// Retorna todas as lutas
router.get('/', async (req, res) => {
  try {
    const lutas = await lutasService.getAllLutas();
    res.json(lutas);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    console.error('[API Lutas] Erro ao buscar lutas:', detalhe);
    res.status(500).json({ error: 'Erro ao buscar lutas', detalhe });
  }
});

// Retorna uma luta específica
router.get('/:id', async (req, res) => {
  try {
    const luta = await lutasService.getLutaById(req.params.id);
    res.json(luta);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    const status = error.response ? error.response.status : 500;
    res.status(status).json({ error: 'Erro ao buscar luta', detalhe });
  }
});

// Cria uma luta
router.post('/', async (req, res) => {
  try {
    const novaLuta = await lutasService.createLuta(req.body);
    res.status(201).json(novaLuta);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    console.error('[API Lutas] Erro ao registrar luta:', detalhe);
    const status = error.response ? error.response.status : 500;
    res.status(status).json({ error: 'Erro ao registrar luta', detalhe });
  }
});

// Atualiza uma luta
router.put('/:id', async (req, res) => {
  try {
    const lutaAtualizada = await lutasService.updateLuta(req.params.id, req.body);
    res.json(lutaAtualizada);
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    console.error(`[API Lutas] Erro ao atualizar luta ${req.params.id}:`, detalhe);
    const status = error.response ? error.response.status : 500;
    res.status(status).json({ error: 'Erro ao atualizar luta', detalhe });
  }
});

// Deleta uma luta
router.delete('/:id', async (req, res) => {
  try {
    await lutasService.deleteLuta(req.params.id);
    res.status(204).send();
  } catch (error) {
    const detalhe = error.response ? error.response.data : error.message;
    console.error(`[API Lutas] Erro ao deletar luta ${req.params.id}:`, detalhe);
    const status = error.response ? error.response.status : 500;
    res.status(status).json({ error: 'Erro ao deletar luta', detalhe });
  }
});

module.exports = router;
