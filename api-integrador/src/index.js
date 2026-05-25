const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Importando rotas
const lutasRoutes = require('./routes/lutas');
const apostasRoutes = require('./routes/apostas');
const lutadoresRoutes = require('./routes/lutadores');
const apostadoresRoutes = require('./routes/apostadores');

// Registrando rotas
app.use('/api/lutas', lutasRoutes);
app.use('/api/apostas', apostasRoutes);
app.use('/api/lutadores', lutadoresRoutes);
app.use('/api/apostadores', apostadoresRoutes);

// Rota raiz de teste
app.get('/', (req, res) => {
    res.json({ message: 'Orquestrador Betsdosjagas online!' });
});

const http = require('http');
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;

function startServer(port = DEFAULT_PORT, retries = 5) {
    const server = http.createServer(app);

    server.on('listening', () => {
        console.log(`Servidor orquestrador rodando na porta ${port}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Porta ${port} já está em uso.`);
            if (retries > 0) {
                const nextPort = port + 1;
                console.log(`Tentando porta alternativa ${nextPort} (tentativas restantes: ${retries - 1})`);
                // tenta novamente em próxima porta após breve espera
                setTimeout(() => startServer(nextPort, retries - 1), 300);
            } else {
                console.error('Não foi possível iniciar o servidor: nenhuma porta disponível. Saindo.');
                process.exit(1);
            }
        } else {
            console.error('Erro no servidor:', err);
            process.exit(1);
        }
    });

    server.listen(port);
    // handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('Recebido SIGINT, encerrando servidor...');
        server.close(() => process.exit(0));
    });
}

startServer();