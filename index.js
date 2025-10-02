import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import bcrypt from "bcryptjs";
import ejs from "ejs";
import env from "dotenv";

const app = express();
const port = 3000;
env.config();

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: Number(process.env.PG_PORT)
});
db.connect();

//register route
app.get("/register", (req, res) => {
  res.redirect("/register.html");
});

app.post('/register', async (req, res) => {
  const { first_name, last_name, email, username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await db.query('INSERT INTO users (first_name, last_name, email, username, password) VALUES ($1, $2, $3, $4, $5)', [first_name, last_name, email, username, hash]);
  res.redirect("/");
});

//login route
app.get("/login", (req, res) => {
  res.redirect("/login.html");
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  if (result.rows.length > 0 && await bcrypt.compare(password, result.rows[0].password)) {
    req.session.userEmail = result.rows[0].email;
    res.redirect("/");
  } else {
    res.send('Invalid credentials');
  }
});

//home page route
app.get("/", (req, res) => {
  if (req.session.userEmail) {
    res.render("index", { email: req.session.userEmail});
  } else {
    res.redirect("/login");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
