const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const DATOS_TRANSFERENCIA = {
  alias: 'pablo.rnc',
  cvu: '0000003100067988368399',
  titular: 'Pablo Rodrigo Nahuel'
};

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://127.0.0.1:27017/tienda-juegos')
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión:', err));

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' }
});

const ProductSchema = new mongoose.Schema({
  titulo: String,
  precio: Number,
  plataforma: String,
  imagen: String,
  descripcion: String,
  stock: Number
});

const OrderSchema = new mongoose.Schema({
  usuario: String,
  productos: Array,
  total: Number,
  estado: { type: String, default: 'pendiente' },
  fecha: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const Order = mongoose.model('Order', OrderSchema);

app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    res.json({ message: 'Usuario creado' });
  } catch (error) {
    res.status(400).json({ error: 'Error al crear usuario' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Contraseña incorrecta' });
    
    const token = jwt.sign({ email: user.email, role: user.role }, 'secreto123');
    res.json({ token, role: user.role });
  } catch (error) {
    res.status(400).json({ error: 'Error al iniciar sesión' });
  }
});

app.get('/api/products', async (req, res) => {
  const { plataforma, search } = req.query;
  let query = {};
  if (plataforma) query.plataforma = plataforma;
  if (search) query.titulo = { $regex: search, $options: 'i' };
  const products = await Product.find(query);
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const product = new Product(req.body);
  await product.save();
  res.json(product);
});

app.put('/api/products/:id', async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(product);
});

app.delete('/api/products/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: 'Producto eliminado' });
});

app.post('/api/orders', async (req, res) => {
  const order = new Order(req.body);
  await order.save();
  res.json(order);
});

app.get('/api/orders', async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
});

app.put('/api/orders/:id', async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(order);
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Pedido eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el pedido' });
  }
});

app.post('/api/make-admin', async (req, res) => {
  const { email } = req.body;
  await User.findOneAndUpdate({ email }, { role: 'admin' });
  res.json({ message: 'Usuario ahora es admin' });
});

// Hacer admin al primer usuario (ejecutar una vez)
setTimeout(async () => {
  await User.findOneAndUpdate({ email: 'gpablinn@gmail.com' }, { role: 'admin' });
  console.log('Usuario admin creado');
}, 3000);

app.listen(5000, () => console.log('Servidor en puerto 5000'));