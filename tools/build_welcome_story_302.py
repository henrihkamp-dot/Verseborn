from pathlib import Path
import re,json
root=Path(__file__).resolve().parents[1]
draft=root.parent.parent/'outputs/flameguard-welcome-cinematics-draft-1.md'
text=draft.read_text(encoding='utf-8').replace('Marla','Marli').replace('MARLA','MARLI')
chapters=re.split(r'\n## [1-5]\. ',text)[1:6]
meta=[('Mira','Terms of Membership','Ember Hall · Lobby','central-hall','MIRA VELN','THE WHISPERING ARROW'),('Torren','A-Rank, Obviously','Ember Hall · Kitchen','torren-kitchen','TORREN STONEKIN','THE STONEHEART'),('Seerin','One More Round','Orphanage · Training Room','gym','SEERIN VAHL',"THE FLAME’S SHIELD"),('Kael','What the Rules Are For','Ember Hall · Library','kael-library','KAEL IRONHAND','THE SILENT OATH'),('Sparky','He Has a Name','Ember Hall · Sparky’s Corner','sparky-coop','SPARKY','THE EMBERBORN')]
stories={}
names={'VERSEBORN':'Verseborn','REVUS':'Revus','MIRA':'Mira','TORREN':'Torren','MARLI':'Marli','SEERIN':'Seerin','KAEL':'Kael','GLIMMER':'Glimmer','SPARKY':'Sparky','CHILD ONE':'Rava','CHILD TWO':'Nyx','CHILD THREE':'Jory','CHILD':'Jory'}
for chapter,(id,title,location,bg,name,role) in zip(chapters,meta):
    beats=[]
    for m in re.finditer(r'\*\*([A-Z][A-Z ,’\-]*?)(?:, [^*]+)?:\*\*\s*([^\n]+)',chapter):
        who=m.group(1).split(',')[0];speaker=names.get(who)
        if not speaker:continue
        beats.append({'speaker':speaker,'text':m.group(2).strip()})
    stories[id]={'id':id,'title':title,'location':location,'background':bg,'name':name,'role':role,'beats':beats}
def find(id,phrase):return next(b for b in stories[id]['beats'] if phrase in b.get('text',''))
def tag(id,phrase,**kw):find(id,phrase).update(kw)
def insert(id,phrase,beat):
    b=stories[id]['beats'];b.insert(b.index(find(id,phrase)),beat)
def cameo(id,phrase,speaker,text,**kw):
    insert(id,phrase,{'speaker':speaker,'text':text,'requires':[speaker],**kw})
tag('Mira','You must be',event='verse-enter',minMs=2200)
tag('Mira','You have a home',event='father',shot='close')
tag('Mira','A Veln should',event='register',shot='prop')
tag('Mira','I don’t.',event='father') if any('I don’t.' in b['text'] for b in stories['Mira']['beats']) else None
tag('Mira',"I don't. I would",event='father',shot='close')
insert('Mira',"For what it's worth",{'event':'revus-leave','minMs':3800,'caption':'A choice made in her own name.'})
tag('Mira',"For what it's worth",event='sign',shot='wide')
tag('Mira','Not the one',requires=['Marli'])
tag('Mira',"We'll start",event='mira-door')
cameo('Mira',"For what it's worth",'Seerin','You held your ground. That takes more than a shield.')
cameo('Mira','Miri.','Kael',"There is a chair, Baron. You needn't stand on ceremony.")
tag('Torren','Torren Stonekin. A-rank',event='torren-enter',minMs=2500)
tag('Torren','Aye. Shelf failed.',event='shelf',shot='close')
tag('Torren','And who might',event='marli-enter',minMs=2200)
tag('Torren','A-rank.',event='badge',shot='prop')
insert('Torren','Remarkable defensive',{'event':'cooking','minMs':5200,'caption':'Quick hands. An immovable spoon.'})
tag('Torren','Is the spoon',event='stew',shot='prop')
tag('Torren','Depends. How many',event='supper',shot='close')
tag('Torren','Spent enough',event='quiet',shot='close',minMs=4200)
tag('Torren','A bowl for the lady',event='mira-enter',requires=['Mira'],minMs=1800)
for b in stories['Torren']['beats']:
    if b.get('speaker')=='Mira' or b.get('text') in ['With me, lass, ye get both.','Sensible woman.']:b['requires']=['Mira']
insert('Torren','A bowl for the lady',{'speaker':'Marli','text':'Is that a portion or a challenge?','unless':['Mira'],'event':'stew'})
insert('Torren','A bowl for the lady',{'speaker':'Torren','text':"Depends how hungry ye are.",'unless':['Mira']})
cameo('Torren','Spent enough','Glimmer','Pressure cooker? Four valves. Five, if you want it to remain a cooker.')
cameo('Torren','Spent enough','Seerin','If it stands up on its own, does it count as a sparring partner?')
# The guests are the named young teens from the reference sheets, not interchangeable toddlers.
tag('Seerin','Feet apart.',event='practice',shot='wide')
find('Seerin','Feet apart.')['text']='Feet apart. Eyes up. Jory—enthusiasm is not a guard stance.'
find('Seerin',"You didn't say that last time!")['text']='It is when I do it with rhythm!'
tag('Seerin','Excellent. No notes.',event='verse-enter',minMs=2200)
tag('Seerin','I have to go',event='farewell',shot='close')
find('Seerin','To be the Fiery Tornado')['text']='The Fiery Tornado. Arach says the poster is understated.'
tag('Seerin','cape budget',event='poster',shot='wide')
tag('Seerin','You always stay.',event='rava-worry',shot='close')
tag('Seerin','What if you fall',event='rava-worry',shot='close')
tag('Seerin','You have to help',event='promise',shot='close')
tag('Seerin','So you remember',event='ribbon',shot='prop')
tag('Seerin','I know my team.',event='ribbon',shot='close')
insert('Seerin','Should I announce',{'event':'last-round','minMs':3800,'caption':'One more round. Together.'})
tag('Seerin','Should I announce',event='arrival',shot='wide')
cameo('Seerin','I have to go','Mira',"A signal at the window if you need us. Someone will answer.")
cameo('Seerin','Should I announce','Torren',"Packed lunches. Proper portions. Don't let the bard ration them.")
tag('Kael','We found you',event='supplies',shot='wide')
tag('Kael','It was confirmed',event='cup',shot='close')
tag('Kael','They called them',event='ledger',shot='prop')
tag('Kael','Sold under',event='ledger',shot='close',minMs=4500)
tag('Kael','I will not let',event='oath',shot='close',minMs=4500)
tag('Kael','Does it cost',event='jory-enter',minMs=2000)
tag('Kael','No. It',event='heal',shot='close')
tag('Kael','There. Ask',event='heal',shot='close')
tag('Kael','So. How many',event='jory-leave',minMs=2000)
tag('Kael','Wash that first.',event='wash',shot='close')
cameo('Kael','Is this why','Glimmer',"Where do I put the tools that might explode?")
insert('Kael','Is this why',{'speaker':'Kael','text':'Outside. We can begin with that rule.','requires':['Glimmer']})
tag('Sparky',"That's the water",event='bowl',shot='wide')
tag('Sparky','Oh, sweetheart.',event='duo-enter',minMs=2000)
insert('Sparky','Did you see',{'event':'cute','minMs':2800,'caption':'A very small foot. A very large impact.'})
tag('Sparky',"Careful. I don't",event='freeze',shot='wide')
tag('Sparky','He.',event='scold',shot='close')
tag('Sparky','Sparky. I am sorry.',event='apology',shot='close')
tag('Sparky','That is not a suggestion.',event='strap',shot='close')
tag('Sparky','Is this all right?',event='choice',shot='wide',minMs=3500)
tag('Sparky','I think so.',event='settle',shot='wide')
tag('Sparky','Finally.',event='torren-cameo',requires=['Torren'],minMs=2000)
for b in stories['Sparky']['beats']:
    if b.get('speaker')=='Torren' or 'A tiny portion, Torren.' in b.get('text',''):b['requires']=['Torren']
stories['Sparky']['shortBeats']=[{'speaker':'Verseborn','text':"That's the water bowl.",'event':'bowl'},{'speaker':'Sparky','text':'Prrrp?'},{'speaker':'Verseborn','text':"A bold interpretation. We'll get a second one."},{'speaker':'Verseborn','text':"Sparky. Is this all right? Staying here?",'event':'choice','minMs':3000},{'speaker':'Sparky','text':'Prrr.','event':'settle'},{'speaker':'Verseborn','text':"Your choice, then. Welcome home."}]
for id,s in stories.items():
    s['beats'].insert(0,{'event':'establish','minMs':2600,'caption':s['title']})
    s['beats'].append({'event':'title','minMs':3300,'caption':s['name']})
(root/'public/game/welcome-story.json').write_text(json.dumps(stories,ensure_ascii=False,indent=2),encoding='utf-8')
draft.write_text(text,encoding='utf-8')
print({k:len(v['beats']) for k,v in stories.items()})
