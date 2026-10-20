from pathlib import Path
import json
root=Path.cwd();p=root/'public/game/welcome-story.json';stories=json.loads(p.read_text(encoding='utf-8'))
def span(id,trigger,key,until):
 beats=stories[id]['beats'];start=next(i for i,b in enumerate(beats) if trigger(b));end=next(i for i in range(start+1,len(beats)) if until(beats[i]));beats[start]['panel']=key;beats[start]['minMs']=max(beats[start].get('minMs',0),3600);beats[end]['panel']=None
span('Mira',lambda b:b.get('text')=='That answer is why I\'m here.','mira-stand',lambda b:b.get('text')=='You know what people will say.')
span('Torren',lambda b:'rank' in b.get('text','').lower() and b.get('speaker')=='Torren','torren-rank',lambda b:b.get('event')=='cooking')
span('Torren',lambda b:b.get('event')=='quiet','torren-memory',lambda b:b.get('speaker')=='Marli')
span('Seerin',lambda b:b.get('event')=='poster','seerin-tornado',lambda b:'orphanage' in b.get('text',''))
span('Seerin',lambda b:b.get('event')=='ribbon','seerin-team',lambda b:b.get('event')=='last-round')
span('Kael',lambda b:b.get('event')=='cup','kael-rules',lambda b:b.get('text','').startswith('Is this why'))
span('Kael',lambda b:b.get('event')=='ledger','kael-ledger',lambda b:b.get('text','').startswith('I believe in discipline'))
def b(speaker,text,**extra):return dict(speaker=speaker,text=text,**extra)
stories['Glimmer']={'id':'Glimmer','title':'Bench Rights','location':'Ember Hall · Workshop','background':'ember-hall','name':'GLIMMER','role':'THE GEARMIND'}
# Her bar opening is a separate sequence. This begins after her Stonewake visit.
stories['Glimmer']['beats']=[
 {'event':'establish','caption':'Bench Rights','minMs':2400},
 b('Glimmer','Good news. I came back.',event='glimmer-arrive',minMs=2500),
 b('Verseborn','You told Stonewake?'),
 b('Glimmer','I told Kaeldrin. Very professionally.'),
 b('Verseborn','How professionally?'),
 b('Glimmer','Only one demonstration. And I put the pin back in before the end.',panel='glimmer-return',minMs=4000),
 b('Glimmer','He wanted a maintenance report. I wanted to talk about what that machine could do for people.'),
 b('Verseborn','And?'),
 b('Glimmer','Stonewake has a place for every tool. A form for every improvement. Sometimes I think they would like a drawer for me.'),
 b('Verseborn','We have a bench. It is less organized.',panel=None),
 b('Glimmer','I noticed. It has potential.',event='glimmer-bench',minMs=2400),
 b('Verseborn','You could have stayed somewhere established.'),
 b('Glimmer','Yes. And maintained things that already work. Here, when something breaks, somebody actually needs it fixed.'),
 b('Glimmer','People. Not just equipment. You are trying to bring people home. I can build things that help.'),
 b('Verseborn','Then the bench is yours.'),
 b('Glimmer','Excellent. I have improved it already.',event='glimmer-gadget'),
 b('Verseborn','Why is it smoking?',panel='glimmer-lab',minMs=3600),
 b('Glimmer','Because progress is happening.'),
 b('Verseborn','I admire the confidence. I fear the result.'),
 b('Glimmer','Both are correct.'),
 b('Kael','Where do you put the tools that might explode?',requires=['Kael']),
 b('Glimmer','Within reach. That is what makes them useful.'),
 b('Verseborn','Could we agree on a warning first?',panel=None),
 b('Glimmer','The little light turns purple.'),
 b('Verseborn','It is purple now.'),
 b('Glimmer','See? An excellent warning system.'),
 b('Mira','Glinda.',requires=['Mira']),
 b('Glimmer','Professional names, Mira. We discussed this.',requires=['Mira']),
 b('Mira','My mistake.',requires=['Mira']),
 b('Glimmer','I built Torren a locking hinge once. He jammed it during a collapse. Once. A statistical miracle.'),
 b('Verseborn','You are proud of that?'),
 b('Glimmer','Of him holding up the building? Yes. Of the hinge? We do not discuss the hinge.'),
 b('Kael','No cups on the bookshelves. No live current on the medical table.',requires=['Kael']),
 b('Glimmer','Separate tables. Sensible. I like working with professionals.'),
 b('Verseborn','Welcome to the Flameguard, Glimmer.'),
 b('Glimmer','Good. Now hold this. Carefully.',event='glimmer-gadget'),
 {'event':'title','caption':'GLIMMER','minMs':3300}]
p.write_text(json.dumps(stories,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
