const Promise = require('bluebird');
const express = require('express');
const app = express();
const session = require('express-session');
const pgp = require('pg-promise')({
   promiseLib: Promise
 });

const bodyParser = require('body-parser');

const request = require('request-promise');
const fs = require('fs-promise');
const bcrypt = require('bcrypt');

app.set('view engine', 'hbs');

 app.use(express.static('public'));
 app.use(session({
   secret: 'shhhhhhhhh',
   cookie: {
     maxAge: 600000
   }
 }));

 // Will write out all request method and request path for all requests on page onto logfile.txt
 app.use(function myMiddleware(req, res, next){
 	var contents = req.method + ' ' + req.path + '\n';
 	fs.appendFile('logfile.txt', contents, function(err){
    next();
  });
 });

app.use(bodyParser.urlencoded({ extended: false }));

const dbconfig = require('./config');
const db = pgp(dbconfig);

app.use(function(req, res, next){
   res.locals.session = req.session;
   next();
});

app.get('/register', function(req, res) {
  res.render('register.hbs');
});

app.post('/submit_registration', function(req, res, next){
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;
  bcrypt.hash(password, 10)
    .then(function(encryptedPassword){
      return db.none(`insert into reviewer values (default, $1, $2, 1, $3)`, [username, email, encryptedPassword])
    })
    .then(function(){
      req.session.loggedInUser = username;
      res.redirect('/');
    })
    .catch(function(err){
      console.log(err.message);
    });
});

 app.get('/login', function(req, res) {
   res.render('login.hbs');
 });

 app.post('/submit_login', function(req, res, next){
   console.log('in submit login');
   var username = req.body.username;
   console.log(username);
   var password = req.body.password;
   console.log(password);
  db.one(`select id, password from reviewer where email = $1`, username)

  .then(function(result){
    console.log(result);
    // return [result, bcrypt.compare(password, result.password)];
    bcrypt.compare(password, result.password)
    .then(function(matched){
      console.log(matched);
      if (matched) {
        req.session.loggedInUser = username;
        req.session.loggedInUserID = result.id;
        res.redirect('/');
      }
      else {
        res.redirect('/login');
      }
    })
      .catch(function(err){
        console.log(err.message);
        res.redirect('/login');
      });

  });
  // .spread(function(result, matched){

  });

  app.get('/', function(req, res){
   res.render('searchpg.hbs');
  });

 app.get('/search', function(req, res, next){
   let searchTerm = req.query.search;
   db.any(`select * from restaurant where restaurant.category ilike '${searchTerm}'`)

   .then(function(data){
     res.render('search_results.hbs', {
       results: data
     });
   })
   .catch(next);
 });

// app.get('/restaurant/:id', function(req, res, next){
//   let id = req.params.id;
//   db.one("select * from restaurant where restaurant.id = " + id)
//   .then(function(info){
//     res.render('restaurant.hbs', {
//       results: info
//     })
//   db.any("select restaurant.name as restaurant_name, restaurant.address, restaurant.category, reviewer.name as reviewer_name, review.title, review.stars, review.review from restaurant left outer join review on review.restaurant_id = restaurant.id left outer join reviewer on review.reviewer_id = reviewer.id where restaurant.id = " + id)
//   .then(function(review_info){
//
//   })
app.get('/restaurant/:id', function(req, res, next) {
  let id = req.params.id;
  db.any(`
    select
      restaurant.name as restaurant_name,
      restaurant.address,
      restaurant.category,
      reviewer.name as reviewer_name,
      review.title,
      review.stars,
      review.review,
      restaurant.id
    from
      restaurant
    left outer join
      review on review.restaurant_id = restaurant.id
    left outer join
      reviewer on review.reviewer_id = reviewer.id
      where restaurant.id = ${id}

  `)
    .then(function(reviews) {
      console.log('reviews', reviews);
      res.render('restaurant.hbs', {
        restaurant: reviews[0],
        reviews: reviews,
        hasReviews: reviews[0].reviewer_name
      });
    })
  .catch(next);
});



app.use(function authentication(req, res, next) {
  if (req.session.loggedInUser) {
    next();
  } else {
    res.redirect('/login');
  }
});

app.post('/submit_review/:id', function(req, res, next){
    var restaurantID = req.params.id;
    console.log('res ID', restaurantID);
    console.log('from form', req.body);
    db.none(`insert into review values (default, $1, $2, $3, $4, $5)`, [req.session.loggedInUserID, req.body.stars, req.body.review_title, req.body.review_text, restaurantID])
    // db.none(`insert into review values (default, NULL, ${req.body.stars}, '${req.body.review_title}', '${req.body.review_text}', ${restaurantID})`)
    .then(function(){
      res.redirect(`/restaurant/${restaurantID}`);
    })
    .catch(next);
  // let stars = req.query.stars;
  // let review_title = req.query.review_title;
  // let review_text = req.query.review_text;
  // console.log(stars, review_title, review_text);
});


 app.listen(3000, function() {
 	console.log('Example app listening on port 3000!');
 });
