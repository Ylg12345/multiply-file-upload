const bodyParser = require('body-parser');
const express = require('express');

const router = require('./router');

let app = express();

const jsonParser = bodyParser.json({ extended: false });

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next()
});

app.use(jsonParser);

app.use('/api', router);

app.listen(3001, () => {
  console.log('listen:3001')
})