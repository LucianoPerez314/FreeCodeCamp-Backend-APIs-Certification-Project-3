require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// <My Code>
const bodyParser = require('body-parser');
const dns = require('dns');
const mongoose = require('mongoose');
const uriValidator = require('valid-url');
// Connect to mongoose, enable post parsing.
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
app.use(bodyParser.urlencoded({extended: false}));

//Create schema
const UrlSchema = new mongoose.Schema({
  original: { type: String, required: true, unique: true },
  short: { type: Number, required: true, unique: true }
});

const currentShortSchema = new mongoose.Schema({short: {type: Number, required: true, unique: true}});

const CurrentShort = mongoose.model('ShortUrlIndex', currentShortSchema);
const Url = mongoose.model('Url', UrlSchema);

const postHandler = async (req, res) => {
  if(!uriValidator.isWebUri(req.body.url)) {
    res.json({ error: 'invalid url' });
    return
  }

  const bodyURL = new URL(req.body.url);
  const host = bodyURL.hostname;

  // verify url
  await dns.lookup(host, (err) => {
  // Handle error if any.
    if (err) {
      res.json({ error: 'invalid url' });
      return;
    }
  });

  // Generate short from database.
  const generatedShort = await CurrentShort.findOneAndUpdate({}, { $inc: { short: 1 } }, { new: true }).exec();
  // Create entry in database.
  const mongoURL = new Url({original: bodyURL.origin, short: generatedShort.short});
  //Save to database if not a duplicate.
  await mongoURL.save((err) => {
    if (err && err.code !== 11000) return console.error(err)
  });
  // Get short from database.
  const foundShort = await Url.findOne({original: bodyURL.origin}).exec();
  // Respond with json object.
  console.log('FOUND', foundShort);
  const jsonObj = {'original_url': bodyURL.origin, 'short_url': foundShort.short};
  res.json(jsonObj);
}

const shortURLHandler = async (req, res) => {
  //Find document with shorturl, redirect using original url.
  const shortNum = parseInt(req.params.shorturl);
  const foundUrl = await Url.findOne({short: shortNum}).exec();
  console.log('FOUNDURL', foundUrl);
  res.redirect(foundUrl.original);
}

app.use('/api/shorturl/:shorturl', shortURLHandler);

app.post('/api/shorturl', postHandler);
// <My Code />


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
