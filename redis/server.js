const { promisify } = require("util");
const express = require("express");
const redis = require("redis");
const client = redis.createClient();

const rIncr = promisify(client.incr).bind(client);
const rGet = promisify(client.get).bind(client);
const rSetex = promisify(client.setex).bind(client);

function cache(key, ttl, slowFn) {
  return async function (...props) {
    const cachedResponse = await rGet(key);
    if (cachedResponse) {
      return cachedResponse;
    }
    const result = await slowFn(...props);
    await rSetex(key, ttl, result);
    return result;
  };
}

async function verySlowAndExpensiveFunction() {
  // imagine this is like a really big join on PostgreSQL
  // or a call to an expensive API

  console.log("oh no an expensive call!");
  const p = new Promise((resolve) => {
    setTimeout(() => {
      resolve(new Date().toUTCString());
    }, 5000);
  });

  return p;
}

const cachedFn = cache("expensive_call", 10, verySlowAndExpensiveFunction);

async function init() {
  const app = express();

  app.get("/pageview", async (req, res) => {
    const views = await rIncr("pageviews");

    res.json({
      status: "ok",
      views,
    });
  });

  app.get("/get", async (req, res) => {
    const data = await cachedFn();

    res.json({
      data,
      status: "ok",
    });
  });

  const PORT = process.env.PORT || 3000;
  app.use(express.static("./static"));
  app.listen(PORT);

  console.log(`running on http://localhost:${PORT}`);
}
init();
