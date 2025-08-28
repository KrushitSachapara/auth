require('dotenv').config();
require('./config/db');
const express = require('express');
const cors = require('cors');

const routes = require('./routes/index');

const app = express();

app.use(cors());
app.set('view engine', 'ejs');

app.use(express.json({ limit: '1024mb' }));
app.use(express.urlencoded({ limit: '1024mb', extended: true }));

app.use('/api', routes);

const PORT = process.env.PORT || 5500;

app.listen(PORT, () => console.log(`${PORT} Server is listening...`));