import {parse} from 'parse5';
export class PublicError extends Error { constructor(status, code, message) { super(message); this.status=status; this.code=code; } }
export function companyURL(value, allowed) {
  if (typeof value !== 'string' || value.length>250) throw new PublicError(400,'invalid_company','Enter an allowed company domain.');
  let u; try {u=new URL(value.includes('://')?value:`https://${value}`);} catch {throw new PublicError(400,'invalid_company','Invalid domain.');}
  const domain=u.hostname.toLowerCase().replace(/^www\./,'');
  if (u.protocol!=='https:' || u.port || u.username || u.password || !allowed.includes(domain) || u.pathname!=='/' || u.search || u.hash) throw new PublicError(400,'domain_not_allowed','This deployment only researches the company domains listed in its status.');
  return {domain,url:`https://${domain}/`};
}
async function bounded(response, max) {
  if (!response.body) return '';
  const reader=response.body.getReader(); let size=0; const chunks=[];
  try { for (;;) { const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>max)throw new PublicError(502,'source_too_large','Company source exceeded the safe size limit.'); chunks.push(value); } }
  finally {await reader.cancel().catch(()=>{});}
  const joined=new Uint8Array(size); let at=0; for(const c of chunks){joined.set(c,at);at+=c.length;} return new TextDecoder().decode(joined);
}
export async function sourceFetch(url, domain, fetcher, max=2000000) {
  for(let redirects=0;redirects<4;redirects++) {
    const r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'User-Agent':'MakeEnterpriseShowcaseBot/1.0 (+https://github.com/phlppgdfry/make-enterprise-showcase)','Accept':'text/html,text/plain'}});
    if([301,302,303,307,308].includes(r.status)) {
      const next=new URL(r.headers.get('location')||'',url);
      if(next.protocol!=='https:' || next.port || next.username || next.password || ![domain,`www.${domain}`].includes(next.hostname)) throw new PublicError(502,'unsafe_redirect','Company source redirected outside its approved domain.');
      url=next.href; continue;
    }
    return {status:r.status,ok:r.ok,type:r.headers.get('content-type')||'',url,text:await bounded(r,max)};
  }
  throw new PublicError(502,'redirect_limit','Company source redirected too often.');
}
export function robotsAllowed(text, path='/') {
  const groups=[]; let agents=[],rules=[],started=false;
  const flush=()=>{if(agents.length)groups.push({agents,rules});agents=[];rules=[];started=false;};
  for(const raw of text.split(/\r?\n/)) {const line=raw.split('#')[0].trim(); const m=line.match(/^([\w-]+)\s*:\s*(.*)$/); if(!m)continue; const key=m[1].toLowerCase(),value=m[2].trim(); if(key==='user-agent'){if(started)flush();agents.push(value.toLowerCase());} else if(['allow','disallow'].includes(key)&&agents.length){started=true;if(value)rules.push({allow:key==='allow',path:value});}}
  flush(); const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&'makeenterpriseshowcasebot'.includes(a))); const selected=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
  let best=null;
  for(const g of selected)for(const rule of g.rules){const regex='^'+rule.path.split('*').map(x=>x.replace(/[.+?^{}()|[\]\\]/g,'\\$&')).join('.*').replace(/\$$/,'$'); if(new RegExp(regex).test(path)&&(!best||rule.path.length>best.path.length||rule.path.length===best.path.length&&rule.allow))best=rule;}
  return !best||best.allow;
}
function textOf(node){if(node.nodeName==='#text')return node.value||'';return(node.childNodes||[]).map(textOf).join(' ');}
export function extractCompany(html) {
  const document=parse(html); let title='',description='';
  const walk=node=>{if(node.tagName==='title'&&!title)title=textOf(node).replace(/\s+/g,' ').trim().slice(0,300); if(node.tagName==='meta'){const a=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value])); if((a.name||'').toLowerCase()==='description'&&!description)description=(a.content||'').replace(/\s+/g,' ').trim().slice(0,1000);} for(const c of node.childNodes||[])walk(c);};walk(document);
  if(!title&&!description)throw new PublicError(422,'no_evidence','The company page did not provide a usable title or description.');
  return {title:title||null,description:description||null,contacts:[],employeeCount:null,fitScore:null,limitations:['Website metadata only; claims have not been independently corroborated.','No person data, contact addresses or AI fit scores are inferred.']};
}
export async function research(value, allowed, fetcher=fetch) {
  const {domain,url}=companyURL(value,allowed);
  const robots=await sourceFetch(new URL('robots.txt',url).href,domain,fetcher,100000);
  if(robots.status!==404&&(!robots.ok||!robotsAllowed(robots.text))) throw new PublicError(422,'robots_restricted','The company website does not permit this research request.');
  const page=await sourceFetch(url,domain,fetcher);
  if(!page.ok||!page.type.includes('text/html'))throw new PublicError(502,'source_unavailable','Company source is unavailable or is not HTML.');
  const result=extractCompany(page.text); const observedAt=new Date().toISOString();
  return {...result,domain,source:page.url,observedAt,evidence:[...(result.title?[{field:'title',quote:result.title,url:page.url}]:[]),...(result.description?[{field:'description',quote:result.description,url:page.url}]:[])]};
}
