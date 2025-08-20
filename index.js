import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import ejs from "ejs";


const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));


app.get("/", (req, res) => {
  const books = [
    {
      title: "The Purpose Driven Life",
      author: "Rick Warren",
      review: "A Christian book that guides readers toward discovering purpose through faith and service.",
      rating: 4.5,
      cover: null
    },
    {
      title: "Think and Grow Rich",
      author: "Napoleon Hill",
      review: "A classic personal development book about principles of success, wealth, and mindset.",
      rating: 4.8,
      cover: null
    }
  ];
  res.render("index", { books });  // Pass books to index.ejs
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
