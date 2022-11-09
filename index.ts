import { Client } from '@jawj/tmp-cfworker-pg';

interface Env { DATABASE_URL: string }

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // try to extract longitude and latitude from path
    let url; 
    try { url = new URL(request.url); } 
    catch { url = { pathname: '/' }; }
    const [, urlLng, , urlLat] = url.pathname.match(/^\/(-?\d{1,3}(\.\d+)?)\/(-?\d{1,2}(\.\d+)?)$/) ?? [];
    
    // fill in missing location data from IP or defaults
    const cf = request.cf ?? {} as any;
    const lng = parseFloat(urlLng ?? cf.longitude ?? '-122.473831');
    const lat = parseFloat(urlLat ?? cf.latitude ?? '37.818496');
    const location = urlLng ? 'via browser geolocation' : 
      cf.city ? `via IP address in ${cf.city}, ${cf.country}` : 
        'unknown, assuming San Francisco';

    // connect and query database
    const client = new Client(env.DATABASE_URL);
    await client.connect();

    const { rows } = await client.query(`
      select 
        id_no, name_en, category,
        st_setsrid(st_makepoint($1, $2), 4326)::geography <-> location as distance
      from whc_sites_2021
      order by distance limit 10`,
      [lng, lat]
    );

    ctx.waitUntil(client.end());

    // respond!
    const responseJson = JSON.stringify({ viaIp: !urlLng, lat, lng, location, nearestSites: rows }, null, 2);
    return new Response(responseJson, { headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }});
  }
}
