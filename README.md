🔐 KeySecurity 2.0

O KeySecurity 2.0 é uma aplicação web moderna para armazenamento e gerenciamento seguro de senhas, desenvolvida com foco em segurança, organização e experiência do usuário.

A versão 2.0 foi totalmente reestruturada, abandonando Blazor, .NET e Firebase, e adotando uma stack baseada em Node.js, PostgreSQL e tecnologias web padrão, garantindo maior controle, escalabilidade e independência tecnológica.

📌 Visão Geral

🔒 Segurança com criptografia forte

🗂️ Organização por grupos de senhas

🌐 API REST em Node.js

📱 Interface 100% responsiva (desktop, tablet e mobile)

🧩 Arquitetura limpa e extensível

✨ Funcionalidades
🔑 Cadastro de Senhas

Armazenamento seguro de credenciais com os seguintes campos:

Nome do serviço

E-mail

Usuário

Senha

🗂️ Grupos de Senhas

Criação de grupos personalizados para melhor organização, como:

Trabalho

Pessoal

Financeiro

Estudos

Facilita a visualização, filtragem e navegação entre credenciais.

📋 Gerenciador de Senhas

Listagem centralizada

Busca rápida

Filtro por grupos

Organização eficiente das credenciais

🔐 Criptografia Avançada

Senhas protegidas com criptografia AES-256

Dados sensíveis nunca armazenados em texto puro

👤 Autenticação Segura

Sistema de autenticação robusto

Suporte a MFA (Autenticação Multifator)

Controle de acesso via tokens

🌐 Arquitetura Web Moderna

Frontend em HTML, CSS e JavaScript

Backend em Node.js

Comunicação via API REST

📱 Design 100% Responsivo

Interface mobile-first

Compatível com:

🖥️ Desktop

📱 Smartphones

📟 Tablets

💾 Modo Offline (Opcional)

Acesso local às senhas previamente sincronizadas

Funcionalidade disponível mesmo sem conexão com a internet

🛠️ Tecnologias Utilizadas
🎨 Frontend

HTML5

CSS3

JavaScript

⚙️ Backend

Node.js

API REST

🗄️ Banco de Dados

PostgreSQL

🛡️ Segurança

Criptografia AES-256

Hash seguro para autenticação

MFA

Validação e controle de acesso na API

📂 Estrutura do Projeto (Exemplo)
keysecurity/
├── backend/
│   └── server.js
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── js/
│   └── index.html
├── README.md
└── package.json

🚀 Instalação e Execução
📋 Pré-requisitos

Node.js (versão LTS recomendada)

PostgreSQL

Git

🔧 Backend
# Clonar o repositório
git clone https://github.com/seu-usuario/keysecurity.git

# Acessar a pasta do backend
cd keysecurity/backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Iniciar o servidor
npm run dev

🗄️ Banco de Dados

Criar um banco PostgreSQL

Executar o script schema.sql

Configurar as credenciais no arquivo .env

🌐 Frontend

Basta abrir o arquivo index.html ou servir os arquivos via servidor web local.

🛣️ Roadmap

 Estrutura inicial do projeto

 Cadastro e gerenciamento de senhas

 Grupos de senhas

 Design responsivo

 Auditoria de segurança

 Exportação segura de dados

 Extensão para navegador

 Aplicativo mobile

🤝 Contribuição

Contribuições são bem-vindas.
Siga os passos:

Faça um fork do projeto

Crie uma branch (feature/nova-feature)

Commit suas alterações

Abra um Pull Request

📄 Licença

Este projeto está sob a licença MIT.
Consulte o arquivo LICENSE para mais detalhes.

👨‍💻 Autor

Desenvolvido por [Anderson Kabula]
📌 Projeto voltado para estudo, portfólio e evolução contínua.
