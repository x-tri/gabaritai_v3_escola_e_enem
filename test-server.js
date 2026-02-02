import http from 'http';

const server = http.createServer((req, res) => {
  // Servir uma página HTML simples para testes
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GabaritAI - Sistema de Correção</title>
      </head>
      <body>
        <div id="root">
          <header>
            <h1>GabaritAI</h1>
            <p>Sistema de correção automática de provas</p>
          </header>
          <nav>
            <a href="/alunos">Alunos</a>
            <a href="/provas">Provas</a>
            <a href="/upload">Upload</a>
            <a href="/login">Login</a>
          </nav>
          <main>
            <h2>Bem-vindo ao GabaritAI</h2>
            <p>Plataforma para correção automática de gabaritos do ENEM.</p>
          </main>
        </div>
      </body>
      </html>
    `);
  } else if (req.url === '/alunos') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Alunos - GabaritAI</title></head>
      <body><h1>Alunos</h1><p>Gerenciamento de alunos</p></body>
      </html>
    `);
  } else if (req.url === '/provas') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Provas - GabaritAI</title></head>
      <body><h1>Provas</h1><p>Gerenciamento de provas</p></body>
      </html>
    `);
  } else if (req.url === '/upload') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Upload - GabaritAI</title></head>
      <body><h1>Upload</h1><p>Upload de arquivos</p></body>
      </html>
    `);
  } else if (req.url === '/login') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Login - GabaritAI</title></head>
      <body><h1>Login</h1><p>Área de login</p></body>
      </html>
    `);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 - Página não encontrada</h1>');
  }
});

const PORT = 5173;
server.listen(PORT, () => {
  console.log(`🚀 Servidor de teste E2E rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
});