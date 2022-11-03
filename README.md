# Query Neon PostgreSQL from a Cloudflare Worker: example app

This repo gives a quick example of using Neon's driver package `@neon/cfworker-pg` to query PostgreSQL from a Cloudflare Worker.

It returns a list of your nearest UNESCO World Heritage Sites, based on your IP-geolocated latitude and longitude. (Please note that the UNESCO data is copyright &copy; 1992 – 2022 <a href="https://whc.unesco.org">UNESCO/World Heritage Centre</a>. All rights reserved.).

Neon's driver is based on and should be fully compatible with [node-postgres](https://node-postgres.com/): what you get from `npm install pg`. We've simply shimmed the Node libraries it requires, and replaced `net.Socket` and `tls.connect` with implementations that encrypt and transfer the data over WebSockets.

To run this app locally:

* __Create the database__ — Create a new project in the Neon dashboard, and connect to it securely using `psql` (substituting your own PostgreSQL connection string, of course):

  ```
  mkdir -p $HOME/.postgresql

  curl https://letsencrypt.org/certs/isrgrootx1.pem > $HOME/.postgresql/isrgrootx1.pem

  psql "postgresql://user:password@project-name-1234.cloud.neon.tech:5432/main?sslmode=verify-full&sslrootcert=$HOME/.postgresql/isrgrootx1.pem"
  ```

* __Get the data__ — Download [the Excel list](https://whc.unesco.org/en/list/xls/?2021) from the [UNESCO Syndication page](https://whc.unesco.org/en/syndication/). Open the XLS file and save it as CSV.

* __Load the data__ — Run the SQL commands in `data/import.psql` against your database in `psql`.

* __Set environment variables__ — Create a file `.dev.vars`, setting the environment variable `DATABASE_URL` to the PostgreSQL connection string you'll find in your Neon dashboard. That should look something like this:

    `DATABASE_URL=postgresql://user:password@project-name-1234.cloud.neon.tech:5432/main?sslmode=verify-full`

* __Install and run__ — Install via `npm install`, then run locally with `npx wrangler dev --local`.

* __Deploy__ — To deploy to Cloudflare Workers, use `npx wrangler secret put DATABASE_URL`, and use the same connection string as in `.dev.vars`. Then type `npx wrangler publish`.
