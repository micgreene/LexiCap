'use strict';

//dependencies
const express = require('express');
const app = express();
const pg = require('pg');
const superagent = require('superagent');
const cors = require('cors');
const Owlbot = require('owlbot-js');

//declare our PORT
const PORT = process.env.PORT || 3000;

//bring in da cors
app.use(cors());

//configure dotenv environmental variables
require('dotenv').config();

//create new clients
const client = new pg.Client(process.env.DATABASE_URL);
const obClient = Owlbot(process.env.OWLBOT_API);

//Decode POST data
app.use(express.urlencoded({ extended: true }));


//set default view engine
app.set('view engine', 'ejs');

//Routes
app.get('/', (request, response) => {
  response.render('pages/index');
});
app.post('/searchWord', searchHandler);
app.post('/add', addHandler);

//route handlers
function searchHandler(request, response) {
  try {
    //creating variables
    const searchedWord = request.body.search;
    let defArr = [];
    //Dictionary API call
    let dAPI = process.env.DICT_API;
    let dURL = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${searchedWord}?key=${dAPI}`;
    const pooperagent = superagent.get(dURL)
      .then(data => {
        defArr = data.body[0].shortdef.map(element => {
          return element;
        });
        return defArr;
      });

    //Thesaurus API call
    let tAPI = process.env.THES_API;
    let tURL = `https://www.dictionaryapi.com/api/v3/references/thesaurus/json/${searchedWord}?key=${tAPI}`;
    const scooperagent = superagent.get(tURL)
      .then(data => {
        let syn = data.body[0].meta ? data.body[0].meta.syns[0] : ['No Common Synonyms'];
        return syn;
      });

    //Quote API call
    let qAPI = process.env.QUOTE_API;
    let URL2 = `https://favqs.com/api/quotes/?filter=${searchedWord}`;
    const duperagent = superagent.get(URL2).set('Authorization', `Bearer ${qAPI}`).then(data => {
      return data.body.quotes[0].body;
    });

    //OwlBot API call requires its own client setup
    const owlbutt = obClient.define(searchedWord).then(function (result) {
      return result.definitions[0];
    }).catch(error => {
      console.log('error', error);
    });

    //Promise.all resolves allllll promises, then returns their data in a single large array
    Promise.all([pooperagent, scooperagent, duperagent, owlbutt])
      .then(results => {
        console.log('Results from Promise.all(): ', results);
        response.render('pages/searchResults', { word: results, searchedWord: searchedWord });
      });
  }
  catch (error) {
    console.log('ERROR', error);
    response.status(500).send('So sorry, something went wrong.');
  }
}

function addHandler(request, response) {
  let addWordSQL = 'INSERT INTO words (word, definitions, synonyms, image_url, quote) VALUES ($1, $2, $3, $4, $5) returning *;';
  //const parsedDefs = JSON.stringify(request.body.definitions);
  //const parsedSyns = JSON.stringify(request.body.synonyms);
  const sqlParams = [request.body.word, request.body.definitions, request.body.synonyms, request.body.image_url, request.body.quote];  
  client.query(addWordSQL, sqlParams).then(results => {
    
    
  });

  let getTableSQL = 'SELECT * from words;';
  client.query(getTableSQL)
    .then(results => {
      response.render('pages/collection', { wordList: results.rows });
    });
}

//connect to client
client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`In da Matrix. Plugged-in to Port: ${PORT}`);
    });
  }).catch(error => {
    console.log('ERROR', error);
  });

