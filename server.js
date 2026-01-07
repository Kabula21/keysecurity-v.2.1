require('dotenv').config();
const bcrypt = require('bcrypt');
const express = require('express');
const session = require('express-session');
const path = require('path');
const { Pool } = require('pg');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

/* =========================
   MIDDLEWARES GLOBAIS
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'keysecurity.sid',
  secret: process.env.SESSION_SECRET || 'keysecurity-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true
    // secure: true // usar apenas em HTTPS
  }
}));

/* =========================
   POSTGRESQL
========================= */
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});


pool.query('SELECT NOW()')
  .then(res => console.log('PostgreSQL conectado:', res.rows[0]))
  .catch(err => console.error('Erro PostgreSQL:', err.message));

/* =========================
   AUTH MIDDLEWARES
   - authMiddleware: páginas (redirect)
   - authApi: API (JSON 401)
========================= */
function authMiddleware(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

function authApi(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  next();
}

/* =========================
   LOGIN / LOGOUT
========================= */
app.post('/login', async (req, res) => {
  const email = req.body?.email;
  const password = req.body?.password;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    req.session.userId = user.id;

    req.session.save(() => {
      res.json({ success: true });
    });


  } catch (err) {
    console.error('Erro login:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('keysecurity.sid');
    res.redirect('/login');
  });
});

/* =========================
   PERFIL - API
========================= */
app.get('/api/profile', authApi, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        email,
        avatar,
        first_name,
        last_name,
        gender,
        birth_date,
        cep,
        address,
        country,
        state,
        city,
        complement
      FROM users
      WHERE id = $1
      `,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const u = result.rows[0];

    res.json({
      email: u.email,
      avatar: u.avatar,
      nome: u.first_name,
      sobrenome: u.last_name,
      genero: u.gender,
      data_nascimento: u.birth_date,
      cep: u.cep,
      endereco: u.address,
      pais: u.country,
      estado: u.state,
      cidade: u.city,
      complemento: u.complement
    });

  } catch (err) {
    console.error('Erro buscar perfil:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.put('/api/profile', authApi, async (req, res) => {
  const {
    email,
    senhaAtual,
    novaSenha,
    nome,
    sobrenome,
    genero,
    data_nascimento,
    cep,
    endereco,
    pais,
    estado,
    cidade,
    complemento
  } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT email, password_hash FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];
    let passwordHashFinal = user.password_hash;
    let logoutNecessario = false;

    if (novaSenha && novaSenha.trim() !== '') {
      if (!senhaAtual) {
        return res.status(400).json({ error: 'Informe a senha atual para alterar a senha' });
      }

      const senhaValida = await bcrypt.compare(senhaAtual, user.password_hash);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }

      passwordHashFinal = await bcrypt.hash(novaSenha, 10);
      logoutNecessario = true;
    }

    if (email && email !== user.email) {
      logoutNecessario = true;
    }

    await pool.query(
      `
      UPDATE users SET
        email = $1,
        password_hash = $2,
        first_name = $3,
        last_name = $4,
        gender = $5,
        birth_date = $6,
        cep = $7,
        address = $8,
        country = $9,
        state = $10,
        city = $11,
        complement = $12,
        updated_at = NOW()
      WHERE id = $13
      `,
      [
        email || user.email,
        passwordHashFinal,
        nome || null,
        sobrenome || null,
        genero || null,
        data_nascimento || null,
        cep || null,
        endereco || null,
        pais || null,
        estado || null,
        cidade || null,
        complemento || null,
        req.session.userId
      ]
    );

    if (logoutNecessario) {
      req.session.destroy(() => {
        res.clearCookie('keysecurity.sid');
        return res.json({ success: true, logout: true });
      });
    } else {
      res.json({ success: true });
    }

  } catch (err) {
    console.error('Erro atualizar perfil:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.delete('/api/profile', authApi, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.session.userId]);

    req.session.destroy(() => {
      res.clearCookie('keysecurity.sid');
      return res.json({ success: true });
    });

  } catch (err) {
    console.error('Erro ao excluir conta:', err);
    res.status(500).json({ error: 'Erro interno ao excluir conta' });
  }
});

app.post('/api/profile/avatar', authApi, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const mime = req.file.mimetype;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) {
      return res.status(400).json({ error: 'Formato inválido. Use PNG, JPG ou WEBP.' });
    }

    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${base64}`;

    await pool.query(
      'UPDATE users SET avatar = $1, updated_at = NOW() WHERE id = $2',
      [dataUrl, req.session.userId]
    );

    res.json({ success: true, avatar: dataUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar foto' });
  }
});

app.delete('/api/profile/avatar', authApi, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET avatar = NULL, updated_at = NOW() WHERE id = $1',
      [req.session.userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover foto' });
  }
});

/* =========================
   PASSWORDS - API
========================= */
app.get('/api/passwords', authApi, async (req, res) => {
  try {
    const adminIds = [1, 3];
    const groupsResult = await pool.query(
      `
      SELECT id, name, category AS type
      FROM password_groups
      WHERE user_id = ANY($1)
      ORDER BY id DESC
      `,
      [adminIds]      
    );

    const groups = groupsResult.rows;

    if (groups.length === 0) {
      return res.json([]);
    }

    const groupIds = groups.map(g => g.id);

    let items = [];

    // ⚠️ só busca itens se houver grupos
    if (groupIds.length > 0) {
      const itemsResult = await pool.query(
        `
        SELECT id, group_id, username, email, password, note
        FROM password_items
        WHERE group_id = ANY($1)
        ORDER BY id DESC
        `,
        [groupIds]
      );

      items = itemsResult.rows;
    }

    const map = new Map(groups.map(g => [g.id, { ...g, items: [] }]));

    for (const item of items) {
      if (map.has(item.group_id)) {
        map.get(item.group_id).items.push({
          id: item.id,
          username: item.username,
          email: item.email,
          password: item.password,
          note: item.note
        });
      }
    }

    res.json(Array.from(map.values()));

  } catch (err) {
    console.error('Erro /api/passwords REAL:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});


app.post('/api/password-groups', authApi, async (req, res) => {
  const { name, type } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome do grupo é obrigatório' });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO password_groups (user_id, name, category)
      VALUES ($1, $2, $3)
      RETURNING id, name, category AS type
      `,
      [req.session.userId, name.trim(), type?.trim() || null]
    );

    res.status(201).json({
      success: true,
      group: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        type: result.rows[0].category
      }
    });

  } catch (err) {
    console.error('Erro criar grupo:', err);
    res.status(500).json({ error: 'Erro interno ao criar grupo' });
  }
});

app.post('/api/password-items', authApi, async (req, res) => {
  const { groupId, username, email, password, note } = req.body;

  if (!groupId) {
    return res.status(400).json({ error: 'groupId é obrigatório' });
  }

  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'password é obrigatório' });
  }

  try {
    // garante que o grupo pertence ao usuário logado
    const groupCheck = await pool.query(
      'SELECT id FROM password_groups WHERE id = $1 AND user_id = $2',
      [groupId, req.session.userId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    const result = await pool.query(
      `
      INSERT INTO password_items (group_id, username, email, password, note)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, group_id, username, email, password, note
      `,
      [
        groupId,
        username?.trim() || null,
        email?.trim() || null,
        password.trim(),
        note?.trim() || null
      ]
    );

    res.status(201).json({ success: true, item: result.rows[0] });

  } catch (err) {
    console.error('Erro criar item:', err);
    res.status(500).json({ error: 'Erro interno ao criar item' });
  }
});

app.delete('/api/password-items/:id', authApi, async (req, res) => {
  const itemId = Number(req.params.id);

  if (!itemId) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    // garante que o item pertence a um grupo do usuário logado
    const check = await pool.query(
      `
      SELECT pi.id
      FROM password_items pi
      JOIN password_groups pg ON pg.id = pi.group_id
      WHERE pi.id = $1 AND pg.user_id = $2
      `,
      [itemId, req.session.userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    await pool.query('DELETE FROM password_items WHERE id = $1', [itemId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir item:', err);
    res.status(500).json({ error: 'Erro interno ao excluir item' });
  }
});

app.delete('/api/password-groups/:id', authApi, async (req, res) => {
  const groupId = Number(req.params.id);

  if (!groupId) {
    return res.status(400).json({ error: 'ID do grupo inválido' });
  }

  try {
    // garante que o grupo pertence ao usuário logado
    const check = await pool.query(
      'SELECT id FROM password_groups WHERE id = $1 AND user_id = $2',
      [groupId, req.session.userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    // apaga o grupo (itens somem por cascade)
    await pool.query('DELETE FROM password_groups WHERE id = $1', [groupId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir grupo:', err);
    res.status(500).json({ error: 'Erro interno ao excluir grupo' });
  }
});

app.put('/api/password-groups/:id', authApi, async (req, res) => {
  const groupId = Number(req.params.id);
  const { name, type } = req.body;

  if (!groupId) return res.status(400).json({ error: 'ID inválido' });
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nome do grupo é obrigatório' });

  try {
    // garante que grupo é do usuário
    const check = await pool.query(
      'SELECT id FROM password_groups WHERE id = $1 AND user_id = $2',
      [groupId, req.session.userId]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Grupo não encontrado' });

    // coluna no banco é category, mas no front chamamos de type
    const result = await pool.query(
      `
      UPDATE password_groups
      SET name = $1, category = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, category AS type
      `,
      [name.trim(), type?.trim() || null, groupId]
    );

    res.json({ success: true, group: result.rows[0] });
  } catch (err) {
    console.error('Erro editar grupo:', err);
    res.status(500).json({ error: 'Erro interno ao editar grupo' });
  }
});

app.put('/api/password-items/:id', authApi, async (req, res) => {
  const itemId = Number(req.params.id);
  const { username, email, password, note } = req.body;

  if (!itemId) return res.status(400).json({ error: 'ID inválido' });
  if (!password || !password.trim()) return res.status(400).json({ error: 'Senha é obrigatória' });

  try {
    // garante que item pertence ao usuário
    const check = await pool.query(
      `
      SELECT pi.id
      FROM password_items pi
      JOIN password_groups pg ON pg.id = pi.group_id
      WHERE pi.id = $1 AND pg.user_id = $2
      `,
      [itemId, req.session.userId]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Item não encontrado' });

    const result = await pool.query(
      `
      UPDATE password_items
      SET username = $1, email = $2, password = $3, note = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING id, group_id, username, email, password, note
      `,
      [
        username?.trim() || null,
        email?.trim() || null,
        password.trim(),
        note?.trim() || null,
        itemId
      ]
    );

    res.json({ success: true, item: result.rows[0] });
  } catch (err) {
    console.error('Erro editar item:', err);
    res.status(500).json({ error: 'Erro interno ao editar item' });
  }
});



/* =========================
   DEBUG
========================= */
app.get('/api/debug-session', (req, res) => {
  res.json({
    session: req.session,
    userId: req.session.userId || null
  });
});

/* =========================
   ARQUIVOS ESTÁTICOS
========================= */
app.use('/css', express.static(path.join(__dirname, 'main', 'css')));
app.use('/js', express.static(path.join(__dirname, 'main', 'js')));
app.use('/icons', express.static(path.join(__dirname, 'main', 'icons')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

/* =========================
   PÁGINAS
========================= */
const PAGES_PATH = path.join(__dirname, 'main', 'pages');

app.get('/login', (req, res) => {
  res.sendFile(path.join(PAGES_PATH, 'page-login.html'));
});

app.get('/home', authMiddleware, (req, res) => {
  res.sendFile(path.join(PAGES_PATH, 'home.html'));
});

app.get('/perfil', authMiddleware, (req, res) => {
  res.sendFile(path.join(PAGES_PATH, 'perfil.html'));
});

app.get('/listasenhas', authMiddleware, (req, res) => {
  res.sendFile(path.join(PAGES_PATH, 'listasenhas.html'));
});

app.get('/gerador', authMiddleware, (req, res) => {
  res.sendFile(path.join(PAGES_PATH, 'gerador.html'));
});

app.get('/sobre', authMiddleware, (req, res) => {
  res.sendFile(path.join(PAGES_PATH, 'sobre.html'));
});

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('keysecurity.sid');
    res.redirect('/login');
  });
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
