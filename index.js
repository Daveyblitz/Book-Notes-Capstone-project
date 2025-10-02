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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
