import React, { useState, useEffect } from 'react';
import { Trophy, Users, Swords, DollarSign, PlusCircle, TrendingUp, Shield, Zap, Info, Clock, Calendar, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
});

const IMAGES = [
  'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1599552375245-dfb1191eb5c1?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=500&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=500&auto=format&fit=crop&q=60'
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // App State
  const [apostadores, setApostadores] = useState([]);
  const [lutadores, setLutadores] = useState([]);
  const [lutas, setLutas] = useState([]);
  const [apostas, setApostas] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Form states
  const [novoApostadorNome, setNovoApostadorNome] = useState('');
  const [novoApostadorEmail, setNovoApostadorEmail] = useState('');
  const [novoApostadorSenha, setNovoApostadorSenha] = useState('');
  const [novoApostadorIdade, setNovoApostadorIdade] = useState('');
  const [novoApostadorChavePix, setNovoApostadorChavePix] = useState('');

  const [novoLutadorNome, setNovoLutadorNome] = useState('');
  const [novoLutadorCategoria, setNovoLutadorCategoria] = useState('');
  const [novoLutadorArte, setNovoLutadorArte] = useState('');
  
  const [novaLutaL1, setNovaLutaL1] = useState('');
  const [novaLutaL2, setNovaLutaL2] = useState('');
  const [novaLutaData, setNovaLutaData] = useState('');
  const [novaLutaHorario, setNovaLutaHorario] = useState('');
  
  const [betAmounts, setBetAmounts] = useState({});
  const [showBetFeedback, setShowBetFeedback] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  // Volume state for simulation
  const [totalVolume, setTotalVolume] = useState(45200);

  useEffect(() => {
    const interval = setInterval(() => {
      setTotalVolume(v => v + Math.floor(Math.random() * 50));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoadingMsg('Sincronizando com o Orquestrador...');
      const [resLutadores, resLutas, resApostas, resApostadores] = await Promise.all([
        api.get('/lutadores'),
        api.get('/lutas'),
        api.get('/apostas'),
        api.get('/apostadores')
      ]);

      const lutadoresMap = resLutadores.data.map((l, i) => ({
        ...l,
        imagem: IMAGES[l.id % 4] || IMAGES[0],
        vitorias: Math.floor(Math.random() * 30), // API nao tem isso
        derrotas: Math.floor(Math.random() * 10)
      }));

      setLutadores(lutadoresMap);
      
      const lutasData = Array.isArray(resLutas.data) ? resLutas.data : [];
      // Monta as lutas conectando com os lutadores
      const lutasMapeadas = lutasData.map(luta => {
        const lutador1Obj = lutadoresMap.find(l => l.id == luta.lutador1) || { nome: 'Desconhecido', imagem: IMAGES[0] };
        const lutador2Obj = lutadoresMap.find(l => l.id == luta.lutador2) || { nome: 'Desconhecido', imagem: IMAGES[1] };
        return {
          ...luta,
          lutador1Obj,
          lutador2Obj,
          status: 'agendada'
        };
      });

      setLutas(lutasMapeadas);
      setApostas(Array.isArray(resApostas.data) ? resApostas.data : []);
      setApostadores(Array.isArray(resApostadores.data) ? resApostadores.data : []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      alert('Falha ao conectar com o Orquestrador. Verifique se ele está rodando na porta 4000.');
    } finally {
      setLoadingMsg('');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if(!novoApostadorNome || !novoApostadorEmail || !novoApostadorSenha) return;
    
    try {
      setLoadingMsg('Criando conta no Sistema Distribuído...');
      const response = await api.post('/apostadores', {
        nome: novoApostadorNome,
        email: novoApostadorEmail,
        senha: novoApostadorSenha,
        idade: novoApostadorIdade ? Number(novoApostadorIdade) : 0,
        chavePix: novoApostadorChavePix || ''
      });
      
      const novo = { ...response.data, saldo: 1000 };
      setApostadores([...apostadores, novo]);
      setCurrentUser(novo);
      
      // Limpa os campos
      setNovoApostadorNome('');
      setNovoApostadorEmail('');
      setNovoApostadorSenha('');
      setNovoApostadorIdade('');
      setNovoApostadorChavePix('');
      setActiveTab('dashboard');
    } catch (error) {
      alert('Erro ao criar conta: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingMsg('');
    }
  };

  const handleCriarLutador = async (e) => {
    e.preventDefault();
    if (!novoLutadorNome || !novoLutadorCategoria) return;

    try {
      setLoadingMsg('Registrando lutador no Sistema...');
      const response = await api.post('/lutadores', {
        nome: novoLutadorNome,
        categoria: novoLutadorCategoria,
        arte: novoLutadorArte || 'Mista'
      });

      const novo = {
        ...response.data,
        imagem: IMAGES[response.data.id % 4] || IMAGES[0],
        vitorias: Math.floor(Math.random() * 30),
        derrotas: Math.floor(Math.random() * 10)
      };

      setLutadores([...lutadores, novo]);
      setNovoLutadorNome('');
      setNovoLutadorCategoria('');
      setNovoLutadorArte('');
      alert('Lutador registrado com sucesso!');
    } catch (error) {
      alert('Erro ao registrar lutador: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingMsg('');
    }
  };

  const handleCriarLuta = async (e) => {
    e.preventDefault();
    if(!novaLutaL1 || !novaLutaL2 || novaLutaL1 === novaLutaL2 || !novaLutaData || !novaLutaHorario) return;
    
    try {
      setLoadingMsg('Agendando luta na API de Lutas...');
      const response = await api.post('/lutas', {
        data: novaLutaData,
        horario: novaLutaHorario,
        lutador1: Number(novaLutaL1),
        lutador2: Number(novaLutaL2)
      });
      
      const novaLuta = response.data;
      
      const lutador1Obj = lutadores.find(l => l.id == novaLuta.lutador1) || { nome: 'Desconhecido', imagem: IMAGES[0] };
      const lutador2Obj = lutadores.find(l => l.id == novaLuta.lutador2) || { nome: 'Desconhecido', imagem: IMAGES[1] };
      
      setLutas([...lutas, { ...novaLuta, lutador1Obj, lutador2Obj, status: 'agendada' }]);
      
      setNovaLutaL1('');
      setNovaLutaL2('');
      setNovaLutaData('');
      setNovaLutaHorario('');
    } catch (error) {
      alert('Erro ao agendar luta: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingMsg('');
    }
  };

  const handleApostar = async (lutaId, lutadorId) => {
    const key = `${lutaId}-${lutadorId}`;
    const valor = Number(betAmounts[key] || 0);

    if (valor <= 0) return alert('Insira um valor válido');
    if(!currentUser) {
       setActiveTab('registro');
       return;
    }
    if (currentUser.saldo < valor) return alert('Saldo insuficiente!');

    try {
      setLoadingMsg('Processando aposta via Orquestrador...');
      
      // O POST de aposta precisa enviar id_luta, id_lutador, id_apostador e valor
      const response = await api.post('/apostas', {
        valor: valor,
        id_luta: Number(lutaId),
        id_lutador: Number(lutadorId),
        id_apostador: Number(currentUser.id)
      });

      const novaAposta = response.data.aposta || response.data;
      setApostas([novaAposta, ...apostas]);
      
      // Atualiza saldo visualmente
      const userAtualizado = { ...currentUser, saldo: currentUser.saldo - valor };
      setCurrentUser(userAtualizado);
      
      // Feedback e volume
      setTotalVolume(v => v + valor);
      setShowBetFeedback(true);
      setTimeout(() => setShowBetFeedback(false), 3000);
      setBetAmounts(prev => ({ ...prev, [key]: '' }));
    } catch (error) {
      alert('Erro ao realizar aposta: ' + (error.response?.data?.error || error.response?.data?.detalhe?.error || error.message));
    } finally {
      setLoadingMsg('');
    }
  };

  // UI Components
  const Navbar = () => (
    <nav className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
        <Swords className="w-6 h-6 text-brand-blue" />
        <div className="text-2xl font-black italic tracking-tighter text-white font-display">
          BETS <span className="text-brand-yellow">JAGAS</span>
        </div>
      </div>
      
      <div className="hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest text-white/70">
        <button onClick={() => setActiveTab('dashboard')} className={`hover:text-brand-blue transition-colors ${activeTab === 'dashboard' && 'text-brand-blue'}`}>Dashboard</button>
        <button onClick={() => setActiveTab('lutadores')} className={`hover:text-brand-blue transition-colors ${activeTab === 'lutadores' && 'text-brand-blue'}`}>Lutadores</button>
        <button onClick={() => setActiveTab('lutas')} className={`hover:text-brand-blue transition-colors ${activeTab === 'lutas' && 'text-brand-blue'}`}>Apostas</button>
        <button onClick={() => setActiveTab('apostas')} className={`hover:text-brand-blue transition-colors ${activeTab === 'apostas' && 'text-brand-blue'}`}>Minhas Apostas</button>
      </div>

      <div className="flex items-center gap-4">
        {loadingMsg && <span className="text-brand-yellow text-xs font-bold uppercase tracking-widest animate-pulse mr-4">{loadingMsg}</span>}
        {currentUser ? (
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">{currentUser.nome}</p>
            <p className="text-sm font-black text-brand-yellow glow-yellow">R$ {currentUser.saldo.toFixed(2)}</p>
          </div>
        ) : (
          <button onClick={() => setActiveTab('registro')} className="bg-brand-blue hover:bg-neon-blue text-white px-6 py-2 rounded-full font-bold uppercase text-xs tracking-widest transition-all box-glow-blue flex items-center gap-2">
            <Users size={14} /> Entrar
          </button>
        )}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-brand-blue selection:text-white font-inter">
      <Navbar />

      <main className="pt-20">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
            <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
              <div 
                className="absolute inset-0 z-0 opacity-20 bg-cover bg-center"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1517438476312-10d79c077509?w=1600&auto=format&fit=crop')` }}
              />
              <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/80" />
              
              <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-blue/20 blur-[120px] rounded-full animate-pulse" />
              <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-yellow/10 blur-[120px] rounded-full animate-pulse" />

              <div className="relative z-10 container mx-auto px-6 text-center">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="inline-block px-4 py-1 border border-brand-yellow/30 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-brand-yellow mb-4 bg-brand-yellow/5">
                    A Arena Definitiva
                  </div>
                  <h1 className="text-6xl md:text-9xl font-black italic tracking-tighter mb-4 leading-none font-display">
                    O OCTÓGONO <span className="text-brand-blue">TE</span> ESPERA
                  </h1>
                  <p className="text-lg md:text-2xl font-bold uppercase tracking-widest text-white/60 max-w-2xl mx-auto mb-8">
                    Faça suas previsões, coloque seu dinheiro onde sua boca está e saia vitorioso.
                  </p>
                  <button onClick={() => setActiveTab('lutas')} className="bg-white text-black px-12 py-4 rounded-full font-black uppercase text-sm tracking-widest hover:bg-brand-yellow transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/5">
                    Apostar Agora
                  </button>
                  <button onClick={() => fetchData()} className="block mx-auto mt-6 bg-transparent border border-white/20 text-white/50 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:text-white transition-all">
                    Sincronizar com Orquestrador
                  </button>
                </motion.div>
              </div>
            </section>

            <div className="container mx-auto px-6 pb-24">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center group hover:border-brand-blue/50 transition-all box-glow-blue">
                  <Swords className="w-12 h-12 text-brand-blue mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xs font-bold uppercase text-white/40 tracking-widest mb-2">Lutas Agendadas</h3>
                  <p className="text-5xl font-black text-white glow-blue">{lutas.length}</p>
                </div>
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center group hover:border-brand-yellow/50 transition-all box-glow-yellow">
                  <Users className="w-12 h-12 text-brand-yellow mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xs font-bold uppercase text-white/40 tracking-widest mb-2">Lutadores Ativos</h3>
                  <p className="text-5xl font-black text-white glow-yellow">{lutadores.length}</p>
                </div>
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center group hover:border-neon-green/50 transition-all">
                  <DollarSign className="w-12 h-12 text-neon-green mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xs font-bold uppercase text-white/40 tracking-widest mb-2">Apostas Realizadas</h3>
                  <p className="text-5xl font-black text-neon-green">{apostas.length}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Registro Tab */}
        {activeTab === 'registro' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-6 py-24 flex justify-center">
            <div className="w-full max-w-md p-8 rounded-3xl bg-black border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-blue to-brand-yellow" />
              <h2 className="text-3xl font-black italic mb-6 text-center font-display">CRIAR CONTA</h2>
              
              <form onSubmit={handleRegister} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Seu Nome</label>
                  <input 
                    type="text" 
                    value={novoApostadorNome}
                    onChange={(e) => setNovoApostadorNome(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-brand-blue transition-all"
                    placeholder="Apelido na arena"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Seu Email</label>
                  <input 
                    type="email" 
                    value={novoApostadorEmail}
                    onChange={(e) => setNovoApostadorEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-brand-blue transition-all"
                    placeholder="voce@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Sua Senha</label>
                  <input 
                    type="password" 
                    value={novoApostadorSenha}
                    onChange={(e) => setNovoApostadorSenha(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-brand-blue transition-all"
                    placeholder="********"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Idade</label>
                  <input
                    type="number"
                    value={novoApostadorIdade}
                    onChange={(e) => setNovoApostadorIdade(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-brand-blue transition-all"
                    placeholder="18"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Chave Pix</label>
                  <input
                    type="text"
                    value={novoApostadorChavePix}
                    onChange={(e) => setNovoApostadorChavePix(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-brand-blue transition-all"
                    placeholder="chave Pix (CPF, email ou aleatória)"
                  />
                </div>
                
                <div className="p-4 bg-brand-green/10 border border-green-500/20 rounded-xl text-center">
                  <p className="text-xs font-bold uppercase text-green-500 mb-1 flex items-center justify-center gap-2"><Zap size={14} /> Bônus de Boas-vindas</p>
                  <p className="text-3xl font-black text-green-500">R$ 1.000,00</p>
                </div>

                <button type="submit" className="w-full bg-brand-blue hover:bg-neon-blue py-5 rounded-xl font-black uppercase tracking-widest text-sm transition-all hover:scale-[1.02] active:scale-[0.98] box-glow-blue">
                  Entrar na Arena
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* Lutadores Tab */}
        {activeTab === 'lutadores' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container mx-auto px-6 py-24">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-black italic mb-4 font-display">CATÁLOGO DE <span className="text-brand-blue">LUTADORES</span></h2>
              <p className="text-white/40 uppercase tracking-widest text-sm font-bold">Os melhores do mundo ({lutadores.length})</p>
            </div>

            <div className="mb-10 p-6 rounded-3xl bg-white/5 border border-white/10">
              <h3 className="text-xl font-black uppercase tracking-widest mb-4 font-display">Registrar Novo Lutador</h3>
              <form onSubmit={handleCriarLutador} className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Nome</label>
                  <input
                    type="text"
                    value={novoLutadorNome}
                    onChange={(e) => setNovoLutadorNome(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-brand-blue transition-all"
                    placeholder="Nome do lutador"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Categoria</label>
                  <input
                    type="text"
                    value={novoLutadorCategoria}
                    onChange={(e) => setNovoLutadorCategoria(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-brand-blue transition-all"
                    placeholder="Peso / Categoria"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Arte Marcial</label>
                  <input
                    type="text"
                    value={novoLutadorArte}
                    onChange={(e) => setNovoLutadorArte(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-brand-blue transition-all"
                    placeholder="Ex.: Jiu-Jitsu, Muay Thai"
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <button type="submit" className="bg-brand-yellow hover:bg-neon-green text-black uppercase font-black tracking-widest px-6 py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Registrar Lutador
                  </button>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {lutadores.map(l => (
                <motion.div 
                  key={l.id}
                  whileHover={{ y: -10 }}
                  className="group relative h-[400px] overflow-hidden rounded-2xl border-2 border-white/10 hover:border-brand-blue transition-all duration-500 bg-black cursor-pointer"
                >
                  <img src={l.imagem} alt={l.nome} className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100 opacity-60 group-hover:opacity-100" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  
                  <div className="absolute bottom-0 left-0 w-full p-6">
                    <span className="inline-block px-3 py-1 bg-brand-blue/20 border border-brand-blue/30 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-blue mb-3">
                      {l.categoria || 'Desconhecido'}
                    </span>
                    <h3 className="text-2xl font-black italic leading-none mb-2 font-display">{l.nome.toUpperCase()}</h3>
                    <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-1">{l.arte || 'Mista'}</p>
                    
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest mt-4 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                      <div className="text-green-500">{l.vitorias}V</div>
                      <div className="text-red-500">{l.derrotas}D</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Lutas Tab (Betting) */}
        {activeTab === 'lutas' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container mx-auto px-6 py-24">
            <div className="flex flex-col xl:flex-row justify-between items-end mb-16 gap-8">
              <div>
                <div className="flex items-center gap-3 text-brand-yellow mb-4">
                  <TrendingUp size={20} />
                  <span className="font-bold uppercase tracking-widest text-sm">Mercado Aberto</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black italic mb-2 font-display">SIMULADOR DE APOSTAS</h2>
                <p className="text-white/40 uppercase tracking-widest text-sm font-bold">Faça suas escolhas e veja os retornos</p>
              </div>

              {/* Form to create fight */}
              <form onSubmit={handleCriarLuta} className="flex flex-wrap items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <input 
                  type="date" 
                  value={novaLutaData}
                  onChange={(e) => setNovaLutaData(e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-4 py-2 text-white font-bold text-sm outline-none focus:border-brand-blue"
                  required
                />
                <input 
                  type="time" 
                  value={novaLutaHorario}
                  onChange={(e) => setNovaLutaHorario(e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-4 py-2 text-white font-bold text-sm outline-none focus:border-brand-blue"
                  required
                />
                <select value={novaLutaL1} onChange={(e) => setNovaLutaL1(e.target.value)} className="bg-black border border-white/10 rounded-lg px-4 py-2 text-white font-bold text-sm outline-none focus:border-brand-blue" required>
                  <option value="">Lutador 1</option>
                  {lutadores.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
                <span className="text-brand-yellow font-black italic text-xl mx-2">VS</span>
                <select value={novaLutaL2} onChange={(e) => setNovaLutaL2(e.target.value)} className="bg-black border border-white/10 rounded-lg px-4 py-2 text-white font-bold text-sm outline-none focus:border-brand-yellow" required>
                  <option value="">Lutador 2</option>
                  {lutadores.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
                <button type="submit" className="bg-brand-blue hover:bg-neon-blue px-4 py-2 text-white rounded-lg transition-colors font-bold uppercase text-xs tracking-widest box-glow-blue flex gap-2 items-center"><PlusCircle size={16} /> Agendar</button>
              </form>
            </div>

            <div className="space-y-12">
              {lutas.map(luta => {
                const odds1 = (1.1 + Math.random()).toFixed(2);
                const odds2 = (1.1 + Math.random()).toFixed(2);
                
                return (
                  <div key={luta.id} className="relative p-1 rounded-3xl bg-gradient-to-r from-brand-blue/20 via-black to-brand-yellow/20 overflow-hidden group">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xl group-hover:bg-black/40 transition-all" />
                    <div className="relative p-8 rounded-[22px] bg-[#0a0a0a] border border-white/5 flex flex-col lg:flex-row gap-8 items-center">
                      
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 px-6 py-1 bg-white/10 rounded-b-xl border-x border-b border-white/10">
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">{luta.data} {luta.horario}</p>
                      </div>

                      {/* Fighter 1 */}
                      <div className="flex-1 flex flex-col items-center w-full">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-brand-blue/30 group-hover:border-brand-blue transition-all mb-4 box-glow-blue">
                          <img src={luta.lutador1Obj?.imagem} alt={luta.lutador1Obj?.nome} className="w-full h-full object-cover" />
                        </div>
                        <h3 className="text-2xl font-black italic text-center font-display">{luta.lutador1Obj?.nome}</h3>
                        <p className="text-brand-blue text-xs font-bold uppercase tracking-widest mt-1 mb-6">Odds: x{odds1}</p>
                        
                        <div className="w-full max-w-xs flex gap-2">
                          <input 
                            type="number" 
                            placeholder="R$"
                            value={betAmounts[`${luta.id}-${luta.lutador1Obj?.id}`] || ''}
                            onChange={(e) => setBetAmounts({...betAmounts, [`${luta.id}-${luta.lutador1Obj?.id}`]: e.target.value})}
                            className="w-1/2 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-bold outline-none focus:border-brand-blue"
                          />
                          <button 
                            onClick={() => handleApostar(luta.id, luta.lutador1Obj?.id)}
                            className="w-1/2 bg-brand-blue/10 hover:bg-brand-blue border border-brand-blue/30 hover:border-brand-blue text-brand-blue hover:text-white rounded-lg font-bold uppercase text-xs tracking-widest transition-all"
                          >
                            Apostar
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-center px-8">
                        <div className="text-4xl md:text-6xl font-black italic text-white/10 select-none font-display">VS</div>
                      </div>

                      {/* Fighter 2 */}
                      <div className="flex-1 flex flex-col items-center w-full">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-brand-yellow/30 group-hover:border-brand-yellow transition-all mb-4 box-glow-yellow">
                          <img src={luta.lutador2Obj?.imagem} alt={luta.lutador2Obj?.nome} className="w-full h-full object-cover" />
                        </div>
                        <h3 className="text-2xl font-black italic text-center font-display">{luta.lutador2Obj?.nome}</h3>
                        <p className="text-brand-yellow text-xs font-bold uppercase tracking-widest mt-1 mb-6">Odds: x{odds2}</p>
                        
                        <div className="w-full max-w-xs flex gap-2">
                          <input 
                            type="number" 
                            placeholder="R$"
                            value={betAmounts[`${luta.id}-${luta.lutador2Obj?.id}`] || ''}
                            onChange={(e) => setBetAmounts({...betAmounts, [`${luta.id}-${luta.lutador2Obj?.id}`]: e.target.value})}
                            className="w-1/2 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-bold outline-none focus:border-brand-yellow"
                          />
                          <button 
                            onClick={() => handleApostar(luta.id, luta.lutador2Obj?.id)}
                            className="w-1/2 bg-brand-yellow/10 hover:bg-brand-yellow border border-brand-yellow/30 hover:border-brand-yellow text-brand-yellow hover:text-black rounded-lg font-bold uppercase text-xs tracking-widest transition-all"
                          >
                            Apostar
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Apostas (Extrato) Tab */}
        {activeTab === 'apostas' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container mx-auto px-6 py-24 max-w-5xl">
            <div className="flex items-center gap-4 mb-12">
              <Shield className="text-brand-yellow" size={40} />
              <div>
                <h2 className="text-4xl md:text-5xl font-black italic font-display">RANKING GERAL & EXTRATO</h2>
                <p className="text-white/40 uppercase tracking-widest text-sm font-bold mt-1">Histórico de Movimentações</p>
              </div>
            </div>

            {!currentUser ? (
               <div className="p-12 text-center border border-white/5 rounded-3xl bg-white/5">
                 <p className="text-white/40 uppercase font-bold tracking-widest">Faça login para ver seu histórico.</p>
               </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 bg-brand-blue/5 blur-[100px] rounded-full" />
                <div className="relative p-8 rounded-3xl bg-black border border-white/10 shadow-2xl">
                  
                  <div className="space-y-4">
                    {apostas.filter(a => a.id_apostador == currentUser.id).length === 0 && (
                       <p className="text-center text-white/40 font-bold text-sm uppercase py-8">Nenhuma aposta registrada.</p>
                    )}
                    {apostas.filter(a => a.id_apostador == currentUser.id).map((aposta, i) => {
                      const luta = lutas.find(l => l.id == aposta.id_luta);
                      const lutador = lutadores.find(l => l.id == aposta.id_lutador);
                      const isFirst = luta && luta.lutador1 == aposta.id_lutador;
                      
                      return (
                        <motion.div 
                          layout
                          key={aposta.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all gap-6"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-black text-white/40 text-xs">
                              #{aposta.id.toString().slice(-4)}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest mb-1">
                                {luta?.lutador1Obj?.nome} <span className="text-white/20">VS</span> {luta?.lutador2Obj?.nome}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white/60">Escolha:</span>
                                <span className={`font-black italic text-lg ${isFirst ? 'text-brand-blue' : 'text-brand-yellow'}`}>{lutador?.nome}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-8">
                            <div className="text-left md:text-right">
                              <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest mb-1">Valor Apostado</p>
                              <p className="font-black text-2xl text-neon-green glow-green">R$ {Number(aposta.valor).toLocaleString()}</p>
                            </div>
                            <div className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-[10px] font-bold uppercase tracking-widest border border-white/10">
                              Pendente
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                  
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-20 border-t border-white/10 bg-black mt-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="text-3xl font-black italic tracking-tighter font-display">
              BETS <span className="text-brand-yellow">JAGAS</span>
            </div>
            
            <div className="flex gap-12 text-xs font-bold uppercase tracking-widest text-white/40">
              <a href="#" className="hover:text-white transition-colors">Termos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Contato</a>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all cursor-pointer">
                <Trophy size={18} className="text-brand-blue" />
              </div>
              <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all cursor-pointer">
                <Shield size={18} className="text-brand-yellow" />
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-white/5 text-center text-[10px] font-bold uppercase text-white/20 tracking-[0.4em]">
            &copy; 2026 BetsJagas. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Feedback Toast */}
      <AnimatePresence>
        {showBetFeedback && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[60] bg-brand-blue text-white px-8 py-4 rounded-2xl font-black uppercase text-sm shadow-2xl flex items-center gap-4"
          >
            <Zap className="text-brand-yellow animate-pulse" />
            Aposta Registrada com Sucesso!
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
