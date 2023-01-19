import { Client } from '@jawj/test-serverless';
interface Env { DATABASE_URL: string }

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // try to extract longitude and latitude from path
    let url; 
    try { url = new URL(request.url); } 
    catch { url = { pathname: '/' }; }
    const [, urlLongitude, , urlLatitude] = url.pathname.match(/^\/(-?\d{1,3}(\.\d+)?)\/(-?\d{1,2}(\.\d+)?)$/) ?? [];
    
    // fill in missing location data from IP or defaults
    const cf = request.cf ?? {} as any;
    const round2dp = (n: number) => Math.round(n * 100) / 100;  // round for caching
    const longitude = round2dp(parseFloat(urlLongitude ?? cf.longitude ?? '-122.473831'));
    const latitude = round2dp(parseFloat(urlLatitude ?? cf.latitude ?? '37.818496'));
    const location = urlLongitude ? 'via browser geolocation' : 
      cf.city ? `via IP address in ${cf.city}, ${cf.country}` : 
        'unknown, assuming San Francisco';

    let nearestSites;
    let cached;

    // check cache
    const cacheKey = `https://whs.cache.neon.tech/${longitude}/${latitude}/data.js`;
    const cachedResponse = await caches.default.match(cacheKey);

    if (cachedResponse) {
      cached = true;
      nearestSites = await cachedResponse.json();

    } else {
      // connect and query database
      const client = new Client(env.DATABASE_URL);
      await client.connect();
      
      const { rows } = await client.query(`
        select 
          id_no, name_en, category,
          st_makepoint($1, $2) <-> location as distance
        from whc_sites_2021
        order by distance limit 10`,
        [longitude, latitude]
      );  // no cast needed: PostGIS casts geometry -> geography, never the reverse: https://gis.stackexchange.com/a/367374
      
      ctx.waitUntil(client.end()); 

      cached = false;
      nearestSites = rows;

      // cache result
      ctx.waitUntil(caches.default.put(cacheKey,
        new Response(JSON.stringify(nearestSites), { headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400' /* 24 hours */,
        } }),
      ));
    }

    // respond!
    const responseJson = JSON.stringify({ viaIp: !urlLongitude, longitude, latitude, location, cached, nearestSites }, null, 2);
    return new Response(responseJson, { headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }});
  }
}
