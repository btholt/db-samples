const express = require("express");
const pg = require('pg');

const connectionString =
  process.env.POSTGRES_CONNECTION_STRING 
  || "postgres://postgres:postgres@localhost:5432/";

async function init() {

  const client = new pg.Client({ connectionString });

  await client.connect(); 

  await client.query("CREATE TEMP TABLE pets(id INT,text TEXT)");

  await client.query({
    text: 'INSERT INTO pets(id, text) VALUES ($1, $2)',
    values: [1, 'brian' ],
  })

  const app = express();
 
  app.get("/get", async (req, res) => {
    console.log(req.query);

    const pets = await client.query({ 
      text: "SELECT * FROM pets WHERE text LIKE $1 limit 10", 
      values: [`%${req.query.search}%`],
      rowMode: 'array', 
    });

    res.json({ status: "ok", pets: pets.rows }).end();
  });

  app.use(express.static("./static"));
  app.listen(process.env.PORT || 3000);
}
init();
