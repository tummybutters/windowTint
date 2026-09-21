import {readFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
if(process.env.AUTOMOTIVE_QUOTES_ENABLED!=='true'){
 console.log('Automotive quotes disabled; no quote schema change.');
}else{
 try{
  if(!process.env.DATABASE_URL)throw Error('database_not_configured');
  const sql=neon(process.env.DATABASE_URL);
  const statements=readFileSync(new URL('../db/automotive-quotes.sql',import.meta.url),'utf8').split(';').map(s=>s.trim()).filter(Boolean);
  await sql.transaction(statements.map(s=>sql.query(s,[])));
  console.log('Automotive quote schema ready (additive migration).');
 }catch{
  console.error('Automotive quote schema setup failed; deployment must not proceed.');process.exitCode=1;
 }
}
