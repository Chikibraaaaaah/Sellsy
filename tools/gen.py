import json,re,sys,os,collections
S=sys.argv[1]; OUT=sys.argv[2]
schemas=json.load(open(f'{S}/schemas.json'))
dts=open(f'{S}/dl_yetty/package/dist/index.d.mts',encoding='utf8').read()
rows=[l.split('\t') for l in open(f'{S}/routes.tsv').read().splitlines()]
title_idx={v.get('title'):k for k,v in schemas.items() if isinstance(v,dict) and v.get('title') and not k.endswith('Writable')}

def ptr(ref):
    parts=ref.split('#/components/schemas/')[1].split('/')
    node=schemas[parts[0]]
    for p in parts[1:]:
        node=node[int(p)] if isinstance(node,list) else node[p]
    return node

def body_schema(op):
    tn=op[0].upper()+op[1:]+'Data'
    m=re.search(r'^type '+tn+r' = \{\n(.*?)\n\};',dts,re.S|re.M)
    if not m: return None,None
    blk=m.group(1)
    b=re.search(r'^  body\?: (\w+);',blk,re.M) or re.search(r'^  body: (\w+);',blk,re.M)
    if b:
        n=b.group(1)
        return n, schemas.get(n) or schemas.get(n.replace('Writable',''))
    t=re.search(r'/\*\*\s*\n\s*\*\s*(.+?)\s*\n\s*\*/\s*\n\s*body\??:',blk)
    if t and t.group(1) in title_idx:
        n=title_idx[t.group(1)]; w=n+'Writable'
        return (w if w in schemas else n), schemas.get(w) or schemas[n]
    return ('inline' if re.search(r'^  body\??:',blk,re.M) else None),None

def merge(s,depth=0):
    """resolve $ref / allOf -> {'properties':..., 'required':[...], ...}"""
    if depth>12 or not isinstance(s,dict): return s or {}
    if '$ref' in s:
        try: s={**merge(ptr(s['$ref']),depth+1),**{k:v for k,v in s.items() if k!='$ref'}}
        except Exception: return {'type':'unknown','$ref':s['$ref']}
    if 'allOf' in s:
        acc={'type':'object','properties':{},'required':[]}
        for sub in s['allOf']:
            r=merge(sub,depth+1)
            acc['properties'].update(r.get('properties',{})); acc['required']+=r.get('required',[])
            for k in ('description','title'):
                if r.get(k) and not acc.get(k): acc[k]=r[k]
        rest={k:v for k,v in s.items() if k!='allOf'}
        acc['properties'].update(rest.get('properties',{})); acc['required']+=rest.get('required',[])
        return acc
    if 'oneOf' in s or 'anyOf' in s:
        opts=[merge(x,depth+1) for x in s.get('oneOf',s.get('anyOf'))]
        types=sorted({o.get('type','?') for o in opts})
        return {**{k:v for k,v in s.items() if k not in('oneOf','anyOf')},'type':'|'.join(types),'oneOf_count':len(opts)}
    return s

KEEP=('type','format','enum','nullable','maxLength','minLength','minimum','maximum','pattern','default','example','description')
def flatten(s,prefix='',req_parent=True,depth=0,out=None):
    out=[] if out is None else out
    s=merge(s)
    req=set(s.get('required',[]))
    for name,p in (s.get('properties') or {}).items():
        p=merge(p)
        if p.get('readOnly'): continue
        path=f'{prefix}{name}'
        t=p.get('type')
        if t=='object' and p.get('properties') and depth<4:
            flatten(p,path+'.',req_parent and name in req,depth+1,out)
        elif t=='array' and depth<4:
            it=merge(p.get('items',{}))
            if it.get('type')=='object' and it.get('properties'):
                out.append({'field':path+'[]','type':'array','required':name in req and req_parent,'description':p.get('description','')})
                flatten(it,path+'[].',name in req,depth+1,out)
            else:
                out.append({'field':path,'type':'array','items':it.get('type'),**({'enum':it['enum']} if it.get('enum') else {}),'required':name in req and req_parent,'description':p.get('description','')})
        else:
            d={'field':path,'required':(name in req) and req_parent}
            for k in KEEP:
                if k in p and p[k] not in (None,''): d[k]=p[k]
            out.append(d)
    return out

TECH={'batch','notifications','webhooks','scopes','search','settings','ocr','listings','email','emails','files','profiles','quotas','accounts','clients','gocardless','timeline','primes','accounting-journal','activities','documents','proposals','mandates','proforma-invoices'}
g=collections.defaultdict(list)
for u,m,n,d,ct in rows: g[u.split('/')[1]].append({'method':m,'path':u,'operation':n,'summary':d,'contentType':'multipart/form-data' if ct!='json' else 'application/json'})
summary=[]
for res,routes in sorted(g.items()):
    if res in TECH: continue
    if not any(r['method'] in('POST','PUT','PATCH','DELETE') for r in routes): continue
    base='/'+res
    def find(m,p): return next((r['operation'] for r in routes if r['method']==m and r['path']==p),None)
    crud={'create':find('POST',base),'list':find('GET',base),'search':find('POST',base+'/search'),'get':find('GET',base+'/{id}'),
          'update':find('PUT',base+'/{id}') or find('PATCH',base+'/{id}'),'delete':find('DELETE',base+'/{id}')}
    crud={k:v for k,v in crud.items() if v}
    upd_method=next((r['method'] for r in routes if r['operation']==crud.get('update')),None)
    os.makedirs(f'{OUT}/{res}',exist_ok=True)
    models={}
    for kind in('create','update'):
        if kind in crud:
            n,sch=body_schema(crud[kind])
            models[kind]={'operation':crud[kind],'schema':n,'fields':flatten(sch) if sch else []}
    json.dump({'object':res,'apiVersion':'v2','baseUrl':'https://api.sellsy.com/v2','crud':crud,'updateMethod':upd_method,'routes':routes},open(f'{OUT}/{res}/v2.routes.json','w'),indent=2,ensure_ascii=False)
    for kind,mdl in models.items():
        json.dump({'object':res,'operation':mdl['operation'],'sourceSchema':mdl['schema'],'fields':mdl['fields']},open(f'{OUT}/{res}/model.{kind}.json','w'),indent=2,ensure_ascii=False)
    summary.append((res,''.join(k[0].upper() for k in crud),len(routes),{k:len(v['fields']) for k,v in models.items()},{k:v['schema'] for k,v in models.items()}))
for s in summary: print(*s)
