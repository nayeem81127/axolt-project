var util = require('util');
var express = require('express');
var app = express();
var passport = require("passport");
var request = require('request');
const { Pool } = require('pg')
const bcrypt = require('bcrypt')
const uuidv4 = require('uuid');

app.use(express.static('public'));

const LocalStrategy = require('passport-local').Strategy;

const pool = new Pool({
	user: process.env.PGUSER,
	host: process.env.PGHOST,
	database: process.env.PGDATABASE,
	password: process.env.PGPASSWORD,
	port: process.env.PGPORT,
	ssl: true
});


module.exports = function (app) {

	app.get('/', function (req, res, next) {
		if (req.isAuthenticated()) {
			res.redirect('/index');
		}
		else {
			const success = req.flash('success');
			const danger = req.flash('danger');
			res.render('login', { success, danger });
		}
	});

	app.get('/register', function (req, res, next) {
		const warning = req.flash('warning');
		const allEmpty = req.flash('allEmpty');
		const Len = req.flash('Len');
		const checkTick = req.flash('checkTick');
		const pass = req.flash('pass');
		res.render('register', { warning, allEmpty, Len, checkTick, pass });
		// , {messages: {warning: req.flash('warning')}});
	});


	app.post('/register', async function (req, res) {

		try {
			let { name, email, password, password2, checkbox } = req.body;

			let errors = [];
			var createdDate = new Date().toISOString();

			console.log({
				name,
				email,
				password,
				password2,
				checkbox
			});

			if (!name || !email || !password || !password2) {				
				errors.push({ message: '• Please enter all fields' });
			}

			if (password.length < 6) {
				errors.push({ message: '• Password must be a least 6 characters long' });
			}

			if (!checkbox) {
				errors.push({ message: '• Please check Term and Condition' });
			}

			if (password !== password2) {
				errors.push({ message: '• Passwords do not match' });
			}

			var user = "user";

			if (errors.length > 0) {
				res.render("register", { name: name, email: email, password: password });				
			} else {

				const client = await pool.connect()
				await client.query('BEGIN')
				var pwd = await bcrypt.hash(req.body.password, 5);
				await JSON.stringify(client.query('SELECT id FROM "users" WHERE "email"=$1', [email], function (err, result) {
					if (result.rows.length > 0) {						
						req.flash('warning', "• This email address is already registered. Log In!");
						res.redirect('/register');
					}
					else {
						client.query('INSERT INTO users (id, name, email, password, created_at, updated_at, role, has_access_of) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [uuidv4(), name, email, pwd, createdDate, createdDate, user, []], function (err, result) {
							if (err) { console.log(err); }
							else {

								client.query('COMMIT')
								console.log(result)
								req.flash('success', '• User created. LogIn!')
								res.redirect('/');
								return;
							}
						});
					}
				}));
				client.release();
			}
			// res.render("register", { name: name, email: email, password: password, password2: password2 });

			//res.redirect('/register');
		}
		catch (e) { throw (e) }
	});

	app.get('/index', function (req, res, next) {
		if (req.isAuthenticated()) {
			res.render('index');
		}
		else {
			res.redirect('/');
		}
	});

	/*
	app.get('/login', function (req, res, next) {
		if (req.isAuthenticated()) {
			res.redirect('/index');
		}
		else{
			res.render('login', {title: "Log in", userData: req.user, messages: {danger: req.flash('danger'), warning: req.flash('warning'), success: req.flash('success')}});
		}
		
	});
	*/

	app.get('/logout', function (req, res) {

		console.log(req.isAuthenticated());
		req.logout();
		console.log(req.isAuthenticated());
		req.flash('success', "Logged out. See you soon!");
		res.redirect('/');
	});

	app.post('/', passport.authenticate('local', {
		successRedirect: '/index',
		failureRedirect: '/',
		failureFlash: true
	}));

	/* , function(req, res) {
		if (req.body.remember) {
			req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // Cookie expires after 30 days
			} else {
			req.session.cookie.expires = false; // Cookie expires at end of session
		}
		res.redirect('/');
	} */
}

passport.use('local', new LocalStrategy({ passReqToCallback: true }, (req, email, password, done) => {
	console.log(email, password);
	loginAttempt();
	async function loginAttempt() {


		const client = await pool.connect()
		try {
			await client.query('BEGIN')
			var currentAccountsData = await JSON.stringify(client.query('SELECT id, name, email, password FROM users WHERE email=$1', [email], function (err, result) {
				console.log('result.rows[0]'+result.rows[0]);
				if (err) {
					return done(err)
				}
				if (result.rows[0] == null) {
					console.log("1");
					req.flash('danger', "Oops. Incorrect login details.");
					return done(null, false);
				}
				else {
					bcrypt.compare(password, result.rows[0].password, function (err, check) {
						if (err) {
							console.log("2");
							console.log('Error while checking password');
							return done();
						}
						else if (check) {
							console.log("3");
							return done(null, user);
							//[{email: result.rows[0].email, name: result.rows[0].name}]);
						}
						else {
							console.log("4");
							req.flash('danger', "Oops. Incorrect login details.");
							return done(null, false);
						}
					});
				}
			}))
		}

		catch (e) { throw (e); }
	};

}
))

passport.serializeUser(function (user, done) {
	done(null, user);
});

passport.deserializeUser(function (user, done) {
	done(null, user);
});		