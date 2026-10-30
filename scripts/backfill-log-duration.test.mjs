import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertMergedSource, connectionOptions, runBackfill } from './backfill-log-duration.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PREFIX='api-server/src/main/resources/db/operations/log-duration/';
const SQL=readFileSync(resolve(ROOT,PREFIX+'backfill.sql'),'utf8');
const PARITY=readFileSync(resolve(ROOT,PREFIX+'verify-parity.sql'),'utf8');
const targets=['tb_sys_log.prcs_req_msec','tb_web_log.prcs_req_msec'];
const state=(pending,drift=0,systemPending=0)=>targets.map((target,index)=>({target,pending_rows:String(index?pending:systemPending),
  nonnull_drift_rows:String(index?drift:0),mismatches:String(index?pending+drift:systemPending)}));
function connection({states=[state(0)],sizes=[[0,0]],failure,guardFailure,history='1'}={}) {
  const events=[];let inWrite=false,writeCommits=0,batches=0;
  return {events,get writeCommits(){return writeCommits;},get batches(){return batches;},async query(sql){
    events.push(sql);
    if(sql==='BEGIN')inWrite=true;
    if(sql==='COMMIT'){if(inWrite)writeCommits++;inWrite=false;}
    if(sql==='ROLLBACK')inWrite=false;
    if(sql.includes('current_database()'))return {rows:[{database_name:'fixture',server_version_num:170009,expand_history:history,expanded_columns:'2'}]};
    if(sql===PARITY)return {rows:states.length>1?states.shift():states[0]};
    if(sql===SQL){batches++;if(failure)throw Object.assign(new Error('fixture SQL failure'),{code:failure});
      const size=sizes.length>1?sizes.shift():sizes[0];return [{rows:[]},...targets.map((target,i)=>({rows:[{target,changed_rows:String(size[i])}]}))];}
    if(sql.includes('DO $d02_log_function_guard$')&&guardFailure)throw Object.assign(new Error('fixture guard'),{code:'55000'});
    return {rows:[]};
  }};
}
test('bounded committed batches resume and completion depends on full parity',async()=>{
  const client=connection({states:[state(501,0,71),state(1),state(0)],sizes:[[71,500],[0,1]]});
  const progress=[];const result=await runBackfill(client,SQL,PARITY,{progress:item=>progress.push(item)});
  assert.equal(result.changedRows,'572');assert.equal(client.writeCommits,2);assert.equal(client.batches,2);
  assert.deepEqual(progress.map(item=>item.pendingRows),['1','0']);
});
test('SKIP LOCKED zero changed rows with pending data stops without claiming success',async()=>{
  const client=connection({states:[state(1)],sizes:[[0,0]]});
  await assert.rejects(runBackfill(client,SQL,PARITY),{code:'LOCKED_PENDING_ROWS'});
  assert.equal(client.batches,1);
});
test('failed later ledger rolls back the batch instead of committing earlier updates',async()=>{
  const client=connection({states:[state(1)],failure:'23514'});
  await assert.rejects(runBackfill(client,SQL,PARITY),{code:'23514'});
  assert.equal(client.writeCommits,0);assert.equal(client.events.at(-1),'ROLLBACK');
});
test('drift, replaced functions and absent Flyway provenance prevent any write',async()=>{
  for(const fixture of [{states:[state(0,1)]},{states:[state(1)],guardFailure:true},{history:'0'}]) {
    const client=connection(fixture);await assert.rejects(runBackfill(client,SQL,PARITY));
    assert.equal(client.batches,0);assert.equal(client.writeCommits,0);
  }
});
test('server batch results above 500 per table roll back, and bounded budgets stop cleanly',async()=>{
  const oversized=connection({states:[state(501)],sizes:[[0,501]]});
  await assert.rejects(runBackfill(oversized,SQL,PARITY),{code:'BATCH_LIMIT_EXCEEDED'});
  assert.equal(oversized.writeCommits,0);
  const resumable=connection({states:[state(501),state(1)],sizes:[[0,500]]});
  await assert.rejects(runBackfill(resumable,SQL,PARITY,{maxBatches:1}),{code:'BUDGET_EXHAUSTED'});
  assert.equal(resumable.writeCommits,1);assert.equal(resumable.batches,1);
});
test('the operator accepts only unchanged inputs from a commit already on main',()=>{
  const base=resolve(tmpdir());const dir=mkdtempSync(join(base,'egov-log-source-'));
  assert.ok(resolve(dir).startsWith(join(base,'egov-log-source-')));
  const files=['scripts/backfill-log-duration.mjs',PREFIX+'backfill.sql',PREFIX+'verify-parity.sql',
    'api-server/src/main/resources/db/migration/V2_145__expand_log_duration_milliseconds.sql',
    'api-server/src/main/resources/db/migration/V2_146__require_log_duration_parity_before_redirect.sql'];
  const git=args=>{const result=spawnSync('git',args,{cwd:dir,encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);return result.stdout.trim();};
  try {
    git(['init','-b','main']);git(['config','user.name','Fixture']);git(['config','user.email','fixture@example.invalid']);
    git(['config','commit.gpgsign','false']);git(['config','core.hooksPath',join(dir,'empty-fixture-hooks')]);
    for(const file of files){mkdirSync(dirname(resolve(dir,file)),{recursive:true});writeFileSync(resolve(dir,file),'fixture\n');}
    git(['add','--',...files]);git(['commit','-m','fixture']);const approved=git(['rev-parse','HEAD']);
    git(['update-ref','refs/remotes/origin/main',approved]);assert.doesNotThrow(()=>assertMergedSource(dir,approved));
    const snapshot=assertMergedSource(dir,approved);
    writeFileSync(resolve(dir,files[1]),'fixture\r\n');assert.doesNotThrow(()=>assertMergedSource(dir,approved));
    writeFileSync(resolve(dir,files[1]),'altered\n');assert.throws(()=>assertMergedSource(dir,approved),{code:'SOURCE_BYTES_DIFFER'});
    assert.equal(snapshot.get(files[1]),'fixture\n','verified SQL stays fixed after a worktree edit');
    git(['add','--',files[1]]);git(['commit','-m','unmerged']);const unmerged=git(['rev-parse','HEAD']);
    assert.throws(()=>assertMergedSource(dir,unmerged),{code:'SOURCE_NOT_ON_MAIN'});
  } finally { if(!resolve(dir).startsWith(join(base,'egov-log-source-')))throw new Error('Unsafe fixture cleanup');rmSync(dir,{recursive:true,force:true}); }
});

test('source validation is mandatory even for the default read-only CLI',()=>{
  const cli=spawnSync(process.execPath,[resolve(ROOT,'scripts/backfill-log-duration.mjs'),
    '--expected-host','127.0.0.1','--expected-database','fixture'],{encoding:'utf8',windowsHide:true,
    env:{...process.env,DB_URL:'jdbc:postgresql://127.0.0.1/fixture',DB_HOST:'127.0.0.1',DB_PORT:'5432',
      DB_NAME:'fixture',DB_USERNAME:'fixture',DB_PASSWORD:'synthetic',DB_SSL:'false'}});
  assert.equal(cli.status,1);assert.match(cli.stderr,/MERGED_SOURCE_REQUIRED/);
});

test('connection binding rejects host changes, URL overrides and TLS downgrades',()=>{
  const base={DB_URL:'jdbc:postgresql://127.0.0.1/fixture',DB_HOST:'127.0.0.1',DB_USERNAME:'fixture',DB_PASSWORD:'synthetic'};
  const options=query=>connectionOptions({...base,DB_URL:base.DB_URL+query},'127.0.0.1','fixture');
  assert.equal(options('?currentSchema=public&sslmode=disable').ssl,false);
  assert.deepEqual(options('?sslmode=require').ssl,{rejectUnauthorized:true});
  assert.deepEqual(options('?sslmode=verify-full').ssl,{rejectUnauthorized:true});
  assert.throws(()=>connectionOptions(base,'localhost','fixture'),{code:'DATABASE_TARGET_MISMATCH'});
  for(const query of ['?host=elsewhere','?options=x','?currentSchema=private','?sslmode=disable&sslmode=require']) {
    assert.throws(()=>options(query),{code:'UNSUPPORTED_DATABASE_OPTION'});
  }
  for(const query of ['?sslmode=prefer','?sslmode=no-verify']) assert.throws(()=>options(query),{code:'DATABASE_TLS_OPTIONS_CONFLICT'});
  assert.throws(()=>connectionOptions({...base,DB_URL:base.DB_URL+'?sslmode=require',DB_SSL:'false'},'127.0.0.1','fixture'),{code:'DATABASE_TLS_OPTIONS_CONFLICT'});
  assert.throws(()=>connectionOptions({...base,DB_URL:base.DB_URL+'?sslmode=verify-full',DB_SSL_REJECT_UNAUTHORIZED:'false'},'127.0.0.1','fixture'),{code:'DATABASE_TLS_OPTIONS_CONFLICT'});
});
