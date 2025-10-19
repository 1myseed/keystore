const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Archivos JSON para almacenar datos
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const usersFile = path.join(dataDir, 'users.json');
const productsFile = path.join(dataDir, 'products.json');
const ordersFile = path.join(dataDir, 'orders.json');

// Inicializar archivos si no existen
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]');
if (!fs.existsSync(productsFile)) fs.writeFileSync(productsFile, '[]');
if (!fs.existsSync(ordersFile)) fs.writeFileSync(ordersFile, '[]');

// Funciones auxiliares
const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// RUTAS - AUTENTICACIÓN
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readJSON(usersFile);
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Usuario ya existe' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ 
      id: Date.now().toString(), 
      email, 
      password: hashedPassword, 
      role: 'user' 
    });
    
    writeJSON(usersFile, users);
    res.json({ message: 'Usuario creado' });
  } catch (error) {
    res.status(400).json({ error: 'Error al crear usuario' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readJSON(usersFile);
    const user = users.find(u => u.email === email);
    
    if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Contraseña incorrecta' });
    
    const token = jwt.sign({ email: user.email, role: user.role }, 'secreto123');
    res.json({ token, role: user.role });
  } catch (error) {
    res.status(400).json({ error: 'Error al iniciar sesión' });
  }
});

// RUTAS - PRODUCTOS
app.get('/api/products', (req, res) => {
  const { plataforma, search } = req.query;
  let products = readJSON(productsFile);
  
  if (plataforma) {
    products = products.filter(p => p.plataforma === plataforma);
  }
  
  if (search) {
    products = products.filter(p => 
      p.titulo.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const products = readJSON(productsFile);
  const newProduct = { 
    _id: Date.now().toString(), 
    ...req.body 
  };
  products.push(newProduct);
  writeJSON(productsFile, products);
  res.json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
  const products = readJSON(productsFile);
  const index = products.findIndex(p => p._id === req.params.id);
  
  if (index !== -1) {
    products[index] = { ...products[index], ...req.body };
    writeJSON(productsFile, products);
    res.json(products[index]);
  } else {
    res.status(404).json({ error: 'Producto no encontrado' });
  }
});

app.delete('/api/products/:id', (req, res) => {
  let products = readJSON(productsFile);
  products = products.filter(p => p._id !== req.params.id);
  writeJSON(productsFile, products);
  res.json({ message: 'Producto eliminado' });
});

// RUTAS - PEDIDOS
app.post('/api/orders', (req, res) => {
  const orders = readJSON(ordersFile);
  const newOrder = { 
    _id: Date.now().toString(), 
    ...req.body, 
    fecha: new Date() 
  };
  orders.push(newOrder);
  writeJSON(ordersFile, orders);
  res.json(newOrder);
});

app.get('/api/orders', (req, res) => {
  const orders = readJSON(ordersFile);
  res.json(orders);
});

app.put('/api/orders/:id', (req, res) => {
  const orders = readJSON(ordersFile);
  const index = orders.findIndex(o => o._id === req.params.id);
  
  if (index !== -1) {
    orders[index] = { ...orders[index], ...req.body };
    writeJSON(ordersFile, orders);
    res.json(orders[index]);
  } else {
    res.status(404).json({ error: 'Pedido no encontrado' });
  }
});

// RUTA - HACER ADMIN
app.post('/api/make-admin', (req, res) => {
  const { email } = req.body;
  const users = readJSON(usersFile);
  const user = users.find(u => u.email === email);
  
  if (user) {
    user.role = 'admin';
    writeJSON(usersFile, users);
    res.json({ message: 'Usuario ahora es admin' });
  } else {
    res.status(404).json({ error: 'Usuario no encontrado' });
  }
});

console.log('✅ Sistema de archivos JSON inicializado');
app.listen(5000, () => console.log('🚀 Servidor en puerto 5000'));