"""Parse OpenAPI schema object literals in the generated SDK as text -> JSON (no code executed)."""
import re,sys,json
lines=open(sys.argv[1],encoding='utf8').read().split('\n')
out={};fails=[];name=None;buf=[]
def conv(t):
    t=re.sub(r'^(\s*)([A-Za-z_$][\w$]*)\s*:',r'\1"\2":',t,flags=re.M)
    t=re.sub(r'([{,]\s*)([A-Za-z_$][\w$]*)\s*:',r'\1"\2":',t)
    t=re.sub(r',(\s*[}\]])',r'\1',t)
    return json.loads(t)
for line in lines:
    if name is None:
        m=re.match(r'^const (\w+)Schema = (\{.*)$',line)
        if m:
            name,buf=m.group(1),[m.group(2)]
            if m.group(2).endswith('};'):
                try: out[name]=conv(m.group(2)[:-1])
                except Exception as e: fails.append(name)
                name=None
    elif not line[:1].isspace() and line.endswith('};'):
        buf.append(line[:-1])
        try: out[name]=conv('\n'.join(buf))
        except Exception as e: fails.append((name,str(e)[:80]))
        name=None
    else: buf.append(line)
json.dump(out,open(sys.argv[2],'w'))
print(len(out),'ok; fails:',fails[:10],len(fails))
