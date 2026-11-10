import { build } from 'esbuild';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
mkdirSync('.sites-runtime',{recursive:true});
const tmp=mkdtempSync(resolve('.sites-runtime/api-tests-'));
const sql=new DatabaseSync(':memory:');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()) for(const statement of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint'))sql.exec(statement);
const d1={prepare(query){let params=[];const prepared={bind(...values){params=values;return prepared;},async raw(){const stmt=sql.prepare(query);stmt.setReturnArrays(true);return stmt.all(...params);},async all(){return {results:sql.prepare(query).all(...params),success:true};},async run(){return {meta:sql.prepare(query).run(...params),success:true};},async first(){return sql.prepare(query).get(...params)??null;}};return prepared;}};
d1.batch=async statements=>{sql.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.all());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}};
const objects=new Map();
const bucket={async put(key,stream,options){objects.set(key,{bytes:await new Response(stream).arrayBuffer(),type:options.httpMetadata.contentType});},async delete(key){objects.delete(key);},async get(key){const o=objects.get(key);return o?{body:o.bytes,size:o.bytes.byteLength,httpEtag:'"test"'}:null;}};
globalThis.__textfolioTest={headers:new Headers(),env:{DB:d1,BUCKET:bucket}};
const mocks={name:'test-runtime',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const env=globalThis.__textfolioTest.env;'}));b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'navigation'}));b.onLoad({filter:/.*/,namespace:'navigation'},()=>({contents:'export function redirect(){throw new Error("redirect");}'}));b.onResolve({filter:/^next\/headers$/},()=>({path:'headers',namespace:'auth'}));b.onLoad({filter:/.*/,namespace:'auth'},()=>({contents:'export async function headers(){return globalThis.__textfolioTest.headers;}'}));}};
const routes={};
try{
 for(const route of ['portfolio','publish','media','media/[id]']){const out=join(tmp,route.replaceAll('/','-')+'.mjs');await build({entryPoints:[resolve(`app/api/${route}/route.ts`)],outfile:out,bundle:true,platform:'node',format:'esm',packages:'external',plugins:[mocks],alias:{'@':resolve('.')},nodePaths:[resolve('node_modules')]});routes[route]=await import(out);}
 // Dependency resolution for external imports uses a runtime file under the project.
}catch(e){rmSync(tmp,{recursive:true,force:true});throw e;}
const request=(method,body)=>new Request('https://test.example/api/test',{method,headers:{Origin:'https://test.example','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
function account(id){globalThis.__textfolioTest.headers=new Headers({'oai-authenticated-user-id':id,'oai-authenticated-user-email':id+'@example.com'});}
const p={version:1,theme:'bureau',name:'Test author',role:'Редактор',bio:'',email:'',location:'',available:true,sections:[],works:[]};
const work={id:'work',type:'article',title:'Real work',project:'Project',sections:[],excerpt:'',body:'Original text',original:'',comment:'',items:[],status:'published',color:'#eeeeee',sender:'',platform:'telegram',seoTitle:'',seoDescription:'',keywords:'',videoUrl:'',model:'',goal:'',contribution:'',result:'',metricBefore:'',metricAfter:'',metricLabel:''};
try{
 assert.equal((await routes.portfolio.PUT(request('PUT',{portfolio:p,revision:0}))).status,401);
 let guestResponse=await routes.portfolio.GET();assert.equal(guestResponse.status,200);const guestCookie=guestResponse.headers.get('Set-Cookie');assert.match(guestCookie,/HttpOnly; Secure; SameSite=Lax/);const guestTokenCookie=guestCookie.split(';')[0];const guestData=await guestResponse.json();assert.equal(guestData.guest,true);assert.equal(guestData.portfolio.works.length,0);assert.ok(!JSON.stringify(guestData).includes(guestTokenCookie.split('=')[1]));
 globalThis.__textfolioTest.headers=new Headers({Cookie:guestTokenCookie});let guestWrite=await routes.portfolio.PUT(request('PUT',{portfolio:{...p,name:'Guest author',works:[work]},revision:0}));assert.equal(guestWrite.status,200);assert.equal((await (await routes.portfolio.GET()).json()).portfolio.name,'Guest author');
 globalThis.__textfolioTest.headers=new Headers();const stranger=await (await routes.portfolio.GET()).json();assert.notEqual(stranger.account,guestData.account);assert.equal(stranger.portfolio.works.length,0);
 globalThis.__textfolioTest.headers=new Headers({Cookie:'__Host-textfolio-guest='+'a'.repeat(64)});assert.equal((await routes.portfolio.PUT(request('PUT',{portfolio:p,revision:1}))).status,401);
 globalThis.__textfolioTest.headers=new Headers({Cookie:guestTokenCookie,'oai-authenticated-user-id':'upgraded-guest','oai-authenticated-user-email':'guest@example.com'});const upgraded=await (await routes.portfolio.GET()).json();assert.equal(upgraded.guest,false);assert.equal(upgraded.portfolio.name,'Guest author');assert.equal(sql.prepare('select count(*) n from guest_sessions where user_id=?').get(guestData.account).n,0);
 globalThis.__textfolioTest.headers=new Headers({Cookie:guestTokenCookie});assert.equal((await routes.portfolio.PUT(request('PUT',{portfolio:p,revision:1}))).status,401);
 sql.prepare('delete from portfolios where user_id=?').run('upgraded-guest');
 account('author-a');let data=await (await routes.portfolio.GET()).json();assert.equal(data.portfolio.works.length,0);assert.equal(data.revision,0);assert.equal(sql.prepare('select count(*) n from portfolios').get().n,0);
 let response=await routes.portfolio.PUT(request('PUT',{portfolio:{...p,works:[work]},revision:0}));assert.equal(response.status,200);assert.equal((await response.json()).revision,1);
 response=await routes.portfolio.PUT(request('PUT',{portfolio:{...p,name:'Other tab'},revision:0}));assert.equal(response.status,409);
 data=await (await routes.portfolio.GET()).json();assert.equal(data.portfolio.works[0].body,'Original text');
 account('author-b');data=await (await routes.portfolio.GET()).json();assert.equal(data.portfolio.works.length,0);assert.equal(data.revision,0);
 response=await routes.portfolio.PUT(request('PUT',{portfolio:{...p,name:'Author B'},revision:1}));assert.equal(response.status,409);
 account('author-a');response=await routes.portfolio.PUT(request('PUT',{portfolio:{...p,works:[work]},revision:1}));assert.equal(response.status,200);
 const cross=new Request('https://test.example/api/portfolio',{method:'PUT',headers:{Origin:'https://evil.example'},body:JSON.stringify({portfolio:p,revision:2})});assert.equal((await routes.portfolio.PUT(cross)).status,403);
 response=await routes.publish.POST(request('POST',{portfolio:{...p,works:[work,{...work,id:'draft',status:'draft'}]},slug:'author-a'}));assert.equal(response.status,200);let pub=sql.prepare('select * from publications').get();assert.equal(JSON.parse(pub.document).works.length,1);
 response=await routes.portfolio.PUT(request('PUT',{portfolio:{...p,works:[{...work,body:'Unpublished edit'}]},revision:2}));assert.equal(response.status,200);pub=sql.prepare('select * from publications').get();assert.equal(JSON.parse(pub.document).works[0].body,'Original text');
 account('author-b');assert.equal((await routes.publish.POST(request('POST',{portfolio:{...p,works:[work]},slug:'author-a'}))).status,409);
 account('author-a');assert.equal((await routes.publish.DELETE(request('DELETE'))).status,200);assert.equal(sql.prepare('select active from publications').get().active,0);assert.equal(sql.prepare('select count(*) n from portfolios').get().n,1);
 const form=new FormData();form.append('file',new File(['image-bytes'],'cover.png',{type:'image/png'}));response=await routes.media.POST(new Request('https://test.example/api/media',{method:'POST',headers:{Origin:'https://test.example'},body:form}));assert.equal(response.status,200);data=await response.json();assert.match(data.url,/^\/api\/media\//);assert.equal(objects.size,1);assert.equal(sql.prepare('select user_id from media').get().user_id,'author-a');
 const mediaId=data.id;let fileResponse=await routes['media/[id]'].GET(new Request('https://test.example'+data.url),{params:Promise.resolve({id:mediaId})});assert.equal(fileResponse.status,200);assert.equal(await fileResponse.text(),'image-bytes');
 account('author-b');assert.equal((await routes['media/[id]'].GET(new Request('https://test.example/api/media/'+mediaId),{params:Promise.resolve({id:mediaId})})).status,404);
 account('author-a');await routes.publish.POST(request('POST',{portfolio:{...p,works:[{...work,coverImage:'/api/media/'+mediaId}]},slug:'author-a'}));
 globalThis.__textfolioTest.headers=new Headers();assert.equal((await routes['media/[id]'].GET(new Request('https://test.example/api/media/'+mediaId),{params:Promise.resolve({id:mediaId})})).status,200);
 account('author-a');await routes.publish.DELETE(request('DELETE'));globalThis.__textfolioTest.headers=new Headers();assert.equal((await routes['media/[id]'].GET(new Request('https://test.example/api/media/'+mediaId),{params:Promise.resolve({id:mediaId})})).status,404);
 account('author-a');
 const unsupported=new FormData();unsupported.append('file',new File(['<script>'],'file.svg',{type:'image/svg+xml'}));assert.equal((await routes.media.POST(new Request('https://test.example/api/media',{method:'POST',headers:{Origin:'https://test.example'},body:unsupported}))).status,400);
 console.log('PASS: no-login guest creation, private cookie, guest persistence and isolation, forged token rejection, account upgrade, revoked guest token, authentication, empty account, persistent round trip, stale-write conflict, account isolation, CSRF, publication snapshot, draft exclusion, slug ownership, unpublish preservation, upload persistence and content-type restrictions.');
}finally{sql.close();rmSync(tmp,{recursive:true,force:true});delete globalThis.__textfolioTest;}
