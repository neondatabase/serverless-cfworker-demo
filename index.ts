import { Client, neonConfig } from '@jawj/tmp-cfworker-pg';

interface Env { DATABASE_URL: string }

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cf = request.cf ?? {} as any;
    const lat = parseFloat(cf.latitude ?? '37.818496');
    const lng = parseFloat(cf.longitude ?? '-122.473831');
    const city: string = cf.city ?? 'Unknown location (assuming San Francisco)';
    const country: string = cf.country ?? 'Earth';

    neonConfig.disableSNI = true;
    // neonConfig.wsProxy = 'localhost:9999';

    const client = new Client({ connectionString: env.DATABASE_URL });
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

    const responseJson = JSON.stringify({ lat, lng, city, country, nearestSites: rows }, null, 2);

    return new Response(responseJson, { headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }});
  }
}
