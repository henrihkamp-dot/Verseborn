from pathlib import Path
import json,subprocess
root=Path(__file__).resolve().parents[1]
stories=json.loads(subprocess.check_output(['git','show','687962071fff5b9403c2a58296a2cb33302ab232:public/game/welcome-story.json'],cwd=root))
locations={'Mira':'Ember Hall · Main Hall','Torren':'Ember Hall · Kitchen','Seerin':'Ember Hall · Training Corner','Kael':'Ember Hall · Library','Sparky':'Ember Hall · Hearth'}
for id,s in stories.items():
    s['background']='ember-hall';s['location']=locations[id]
    for b in s['beats']:
        if b.get('speaker')=='Marli' and id=='Mira':b['offscreen']=True
        if b.get('event')=='arrival':b['event']='last-round-end'
kael=stories['Kael']['beats'];a=next(i for i,b in enumerate(kael) if b.get('event')=='jory-enter');z=next(i for i,b in enumerate(kael) if b.get('event')=='jory-leave')
kael[a:z]=[{'speaker':'Verseborn','text':"If someone comes here needing help, what do we charge?",'event':'healer'},{'speaker':'Kael','text':"For clean water, a dressing, a little kindness? Nothing."},{'speaker':'Verseborn','text':"Even if they cannot give you their name?"},{'speaker':'Kael','text':"Especially then. A name is not a price of admission."}]
kael[a+4]['event']='healer-end'
for b in stories['Seerin']['beats']:
    t=b.get('text','')
    b['text']=t.replace('I have to go with Verseborn for a while.',"I'll be staying here with the Flameguard for a while.").replace("But who'll stay here?","But who'll stay at the orphanage?").replace("The people who look after you are staying. I've checked the watches. Twice.","Your carers are staying at the orphanage. I've checked the watches. Twice.").replace('You always stay.',"You've always been there.").replace("If I wait for it to reach your door, I've waited too long.","If I wait for it to reach the orphanage door, I've waited too long.") if t else b.get('text','')
    if not t:b.pop('text',None)
    if 'window if you need us' in t:b['text']="A signal from the orphanage if you need us. Someone will answer."
    if b.get('event')=='poster':b['text']=b['text'].replace('I was wondering about the cape budget.','The Fiery Tornado? I was wondering about the cape budget.')
mira=stories['Mira']['beats'];at=next(i for i,b in enumerate(mira) if 'I would like you to visit.' in b.get('text',''))+1
mira[at:at]=[{'speaker':'Revus','text':'Have you eaten, Miri? Properly? And are you sleeping?','event':'revus-chibi','minMs':3000},{'speaker':'Mira','text':'Father. You can ask that at supper.'},{'speaker':'Revus','text':'Yes. Quite. Supper.','event':'revus-composed'}]
(root/'public/game/welcome-story.json').write_text(json.dumps(stories,ensure_ascii=False,indent=2),encoding='utf-8')
print('Five Hall locations; Jory confined to Seerin; Revus reaction added.')
