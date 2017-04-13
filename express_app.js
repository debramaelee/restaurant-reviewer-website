const express = require('express');

const Promise = require('bluebird');

const pgp = require('pg-promise')({
   promiseLib: Promise
 });

 const bodyParser = require('body-parser');

 app.use(bodyParser.urlencoded({ extended: false }));

 app.use(express.static('public'));

 app.get('/search', function(req, res){
   var searchTerm = req.query.searchTerm;
   res.send('Searching ' + search_term + '...');
 });

 app.listen(3000, function() {
 	console.log('Example app listening on port 3000!');
 });
