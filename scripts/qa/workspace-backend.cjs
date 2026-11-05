/** Local-only QA transport: verifies real database passwords, then forwards all business requests to the actual backend. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const http = require('node:http');
if (process.env.NODE_ENV === 'production') throw Error('QA server is local-only');
const backend = path.resolve(process.env.ZAWANA_QA_BACKEND || '../zawana-web-app/backend');
const manifestPath = process.env.MOBILE_QA_MANIFEST || path.join(os.tmpdir(),'zawana-mobile-qa-manifest.json');
execFileSync(path.join(backend,'node_modules/.bin/tsx'),['tests/mobile-workspace-browser-fixture.ts'],{cwd:backend,env:{...process.env,MOBILE_QA_MANIFEST:manifestPath},stdio:'inherit'});
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(!manifest.databaseUrl.startsWith('file:/')||!manifest.databaseUrl.includes('/zawana-mobile-workspace-'))throw Error('Temporary database required');
const child=spawn(path.join(backend,'node_modules/.bin/tsx'),['src/server.ts'],{cwd:backend,detached:true,env:{...process.env,DATABASE_URL:manifest.databaseUrl,AUTH_MODE:'database',NODE_ENV:'development',JWT_SECRET:randomBytes(40).toString('hex'),PORT:'8129',CLIENT_URL:'http://localhost:8087,http://127.0.0.1:8087',PUBLIC_API_URL:'http://127.0.0.1:8129'},stdio:['ignore','pipe','pipe']});
child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);
const proxy=http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://localhost:8087');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type,Idempotency-Key');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 try{const chunks=[];for await(const c of req)chunks.push(c);let body=Buffer.concat(chunks),requestPath=req.url;
 if(requestPath==='/api/auth/mobile/email-login'){const input=JSON.parse(body);requestPath='/api/auth/login';body=Buffer.from(JSON.stringify({username:input.email,password:input.password}));}
 const headers={};for(const k of ['authorization','content-type','idempotency-key'])if(req.headers[k])headers[k]=req.headers[k];
 const upstream=await fetch('http://127.0.0.1:8129'+requestPath,{method:req.method,headers,...(body.length?{body}:{})});
 res.statusCode=upstream.status;res.setHeader('Content-Type',upstream.headers.get('content-type')||'application/json');res.end(Buffer.from(await upstream.arrayBuffer()));
 }catch{res.statusCode=502;res.end(JSON.stringify({message:'Local QA backend unavailable.'}));}
});
proxy.listen(8130,'127.0.0.1',()=>console.log('Isolated mobile QA transport listening on 8130.'));
const stop=()=>{proxy.close();try{process.kill(-child.pid,'SIGTERM')}catch{}process.exit(0)};
process.on('SIGINT',stop);process.on('SIGTERM',stop);child.on('exit',()=>{proxy.close();process.exitCode=0});
