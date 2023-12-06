const express = require('express');
const routes = require('./routes/index.js');

const app = express();
const port = process.env.PORT || 5000;

app.use('/', routes);
app.listen(port);
