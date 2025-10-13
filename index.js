import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import passport from "passport";
import session from "express-session";
import bcrypt from "bcryptjs";
import env from "dotenv";
import axios from "axios";

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

//login route
app.get("/login", (req, res) => {
  res.redirect("/login.html");
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length > 0 && await bcrypt.compare(password, result.rows[0].password)) {
      req.session.userEmail = result.rows[0].email;
      req.session.username = result.rows[0].username;
      res.redirect("/");
    } else {
      res.redirect("/login.html?error=Your login details are invalid. Please try again.");
    }
  } catch (err) {
      console.error(err);
      res.redirect("/login.html?error= Please try again.");
  }
});

async function checkReviews(req) {
  const result = await db.query(
    "SELECT review_id, review, review_date, rating, cover_id FROM book_reviews JOIN users ON users.email = user_email WHERE user_email = $1;",
    [req.session.userEmail]
  );
  let reviews = [];
  result.rows.forEach((review) => {
    reviews.push(review);
  });
  console.log(reviews);
  return reviews;
}


//register route
app.get("/register", (req, res) => {
  res.redirect("/register.html");
});

app.post('/register', async (req, res) => {
  const { first_name, last_name, email, username, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (first_name, last_name, email, username, password) VALUES ($1, $2, $3, $4, $5)',
      [first_name, last_name, email, username, hash]
    );
    res.redirect("/");
  } catch (err) {
    if (err.code === "23505") {
      // 23505 = unique_violation in Postgres
      res.redirect("/register.html?error=This username or email is already taken");
    } else {
      console.error(err);
      res.redirect("/register.html?error=Something went wrong. Please try again.");
    }
  }
});

//home page route
app.get("/", async (req, res) => {
  if (req.session.userEmail) {
    const reviews = await checkReviews(req);
    res.render("index", { name: req.session.username, book_reviews: reviews });
  } else {
    res.redirect("/login");
  }
});

//add book review route
app.get("/add", (req, res) => {
  if (req.session.userEmail) {
    res.render("add");
  }
  else {
    res.redirect("/login");
  }
});


// API route for Open Library book search (using Axios)
app.get('/api/search-books', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);
  try {
    const response = await axios.get(`https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&limit=10`);
    const data = response.data;
    const books = data.docs.map(b => ({
      title: b.title,
      author_name: b.author_name ? b.author_name[0] : '',
      cover_id: b.cover_i || ''
    }));
    res.json(books);
  } catch (err) {
    res.status(500).json([]);
  }
});

// Add book review POST route
app.post('/add', async (req, res) => {
  const { title, author, cover_id, review, rating } = req.body;
  const userEmail = req.session.userEmail;
  try {
    await db.query(
      'INSERT INTO book_reviews (user_email, title, author, cover_id, review, rating, review_date) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [userEmail, title, author, cover_id, review, rating]
    );
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.redirect('/add');
  }
});

//logout button on home page
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
