"""WB1, page 1 of the supplied Flow House PDF, traced at 1500px page height.
Scale is estimated from the published 970 sq ft interior area, not a survey.
"""
import json, math, pathlib
R=pathlib.Path(__file__).resolve().parents[1]; D=R/'app/decorate/homes/flowhouse-wb1'
S=71.05
P=lambda x,z:[round((x-332)/S,5),round((z-337)/S,5)]
L=lambda n:round(n/S,5)
pi=math.pi
inside=[[332,331],[551,331],[551,342],[948,342],[948,1075],[332,1075]]
outline=inside[:-1]+[[332,1075],[232,1075],[232,811],[332,811]]
p={'name':'Flow House · WB1','height':2.7,'footprint':[P(*v) for v in outline],'interiorFootprint':[P(*v) for v in inside],'floors':[],'floorFinishes':[],'walls':[],'windows':[],'doors':[],'fixtures':[],'furniture':[],'surfacePanels':[],'railings':[],'appearance':{'floor':'#c8aa83','tile':'#d8dad5','wood':'#bb936c','stone':'#f2eee6','wall':'#f2eee8','refrigerator':'#adb5b7','trim':True},'spawn':P(850,477),'yaw':pi/2,'source':{'url':'https://flowhouse.imgix.net/cms/2_Bed_Floor_Plans_Final_65747c1695.pdf?fm=pdf','page':1,'unit':'WB1','variant':'Floors 11–15 and 16–41, with balcony','interiorSqft':970,'exteriorSqft':58,'pixelsPerMetre':S,'note':'Approximate trace scaled to the published interior area. No room dimensions are supplied. Ceiling height, finishes, door operation and furniture are proposed. Source shows a king primary bed; staging uses the catalog queen bed. Balcony slider is represented by an operable glazed hinged door.'}}
def wall(x,z,xx,zz,wins=()):
 i=len(p['walls']);p['walls'].append(P(x,z)+P(xx,zz))
 for start,width in wins:p['windows'].append({'wall':i,'start':L(start),'width':L(width),'sill':.18,'height':2.3})
 return i
def door(x,z,w,r,s,name,**kw):p['doors'].append({'x':P(x,z)[0],'z':P(x,z)[1],'width':L(w),'rotation':r,'swing':s,'label':name}|kw)
def fixture(t,x,z,w,d,h,r=0,**kw):p['fixtures'].append({'type':t,'x':P(x,z)[0],'z':P(x,z)[1],'width':w,'depth':d,'height':h,'rotation':r}|kw)
def floor(x,z,w,d,finish='floor'):p['floors'].append(P(x,z)+[L(w),L(d)]);p['floorFinishes'].append(finish)
# Exterior and glazed openings. The entry is on the east wall.
wall(332,331,551,331);wall(551,331,551,342);wall(551,342,948,342)
wall(948,342,948,434);wall(948,505,948,1075)
door(948,505,71,pi/2,pi/2,'Main entrance')
wall(948,1075,332,1075,[(30,140),(306,63),(450,115)])
wall(332,331,332,811,[(45,138),(298,140)])
wall(332,811,332,897);wall(332,969,332,1075)
door(332,897,72,-pi/2,-pi/2,'Balcony door',glazed=True)
# Bedroom 2 and its closet; the door opens back against the east wall.
wall(548,342,548,473);wall(548,549,548,605)
wall(332,605,566,605);wall(410,575,548,575);wall(410,575,410,605)
door(676,478,71,-pi/2,-pi/2,'Second bedroom')
# North bathroom and services.
wall(548,473,695,473);wall(766,473,777,473);wall(777,342,777,473)
door(766,473,71,pi,-pi/2,'Hall bathroom')
wall(777,417,796,417);wall(849,417,865,417);wall(865,342,865,417);wall(865,417,948,417)
door(796,417,53,0,-pi/2,'Laundry cupboard',initialOpen=False)
# Angled hall, linen closet, ensuite and primary-bedroom entry.
wall(548,549,676,549);wall(676,549,676,575);wall(676,575,606,643);wall(606,643,566,605)
fixture('closet-interior',602,570,1.22,.32,2.15)
wall(835,529,948,529);wall(835,529,774,591)
door(774,591,69,-3*pi/4,pi/2,'Primary suite')
wall(725,640,750,681);wall(750,681,750,712);wall(750,775,750,816)
wall(725,640,665,704);wall(665,704,665,816);wall(665,816,750,816)
door(750,712,63,-pi/2,-pi/2,'Primary closet',initialOpen=False)
fixture('closet-interior',681,778,.82,.25,2.15,pi/2)
wall(830,634,948,634);wall(830,634,830,736);wall(830,806,830,816)
door(830,806,70,pi/2,-pi/2,'Primary bathroom')
wall(725,816,750,816);wall(830,816,948,816);wall(725,816,725,1075)
# Primary bedroom opens north into the suite corridor, between x=750 and x=830.
# Floors cover interior, with bathroom tile and a separate outdoor deck.
floor(332,331,219,11);floor(332,342,216,263);floor(548,342,229,131,'tile');floor(777,342,171,131)
floor(548,473,400,132);floor(332,605,498,211);floor(830,605,118,211,'tile')
floor(332,816,393,259);floor(725,816,223,259);floor(232,811,100,264,'tile')
for a,b in [((232,811),(332,811)),((232,811),(232,1075)),((232,1075),(332,1075))]:p['railings'].append(P(*a)+P(*b))
# Fixed appliances and bath fittings, matched to the source plan symbols.
fixture('bathtub',580,413,.62,1.48,.55)
fixture('toilet',638,372,.40,.68,.81)
fixture('vanity',729,369,1.02,.55,.86)
fixture('laundry',822,378,.65,.66,1.95)
fixture('cabinet',903,379,.82,.72,2.15,upper=False)
fixture('shower',889,597,1.43,.70,.10)
fixture('toilet',921,673,.40,.68,.81,-pi/2)
fixture('vanity',927,758,1.37,.48,.86,-pi/2)
fixture('refrigerator',696,879,.80,.62,1.94,-pi/2,freezer='bottom')
fixture('stove',696,967,.72,.62,.90,-pi/2,cooktop='ceramic')
fixture('cabinet',696,1036,.72,.62,.90,-pi/2,upper=True)
fixture('cabinet',696,927,.32,.62,.90,-pi/2,upper=True)
fixture('cabinet',552,917,.61,.78,.90,pi/2,upper=False)
fixture('sink',552,962,.66,.78,.90,pi/2)
fixture('dishwasher',552,1010,.62,.78,.90,pi/2)
fixture('cabinet',552,1053,.49,.78,.90,pi/2,upper=False)
fixture('shelving',470,590,1.40,.28,1.10,pi)
def f(id,x,z,r=0):return {'id':id,'x':P(x,z)[0],'z':P(x,z)[1],'r':r}
a=[f('bed',444,426),f('nightstand',366,354),f('nightstand',519,354),
 f('bed',865,942,-pi/2),f('nightstand',926,844),f('nightstand',926,1039),
 f('sofa',453,648),f('rug',453,728,pi/2),f('coffee-table',453,728),
 f('armchair',385,792,pi),f('armchair',498,792,pi),f('floor-lamp',364,705),
 f('dining-table',434,968),f('armchair',434,893),f('armchair',434,1043,pi),
 f('bookshelf',612,1056),f('floor-lamp',767,1036)]
b=[dict(v) for v in a]
b[6]=f('morabo',388,712,pi/2);b[8]=f('coffee-table',465,716,pi/2);b[9]=f('armchair',522,649,-pi/2);b[10]=f('armchair',522,794,-pi/2);b[11]=f('floor-lamp',446,643)
p['furniture']=a;p['layouts']=[{'id':'gather','name':'Palm & oak','furniture':a},{'id':'retreat','name':'Quiet mornings','furniture':b}]
p['design']={'name':'Palm & oak','description':'Warm oak, soft linen and an airy living room. Proposed catalog furnishings and finishes, with two arrangements.'}
p['lights']=[P(x,z) for x,z in [(439,476),(679,429),(842,478),(722,570),(794,727),(890,716),(441,750),(623,961),(830,965)]]
p['rooms']=[{'name':name,'point':P(x,z)} for name,x,z in [('Foyer',850,477),('Hall bathroom',682,420),('Second bedroom',501,516),('Living room',570,747),('Kitchen',619,970),('Dining',365,963),('Primary bedroom',780,912),('Primary bathroom',867,716),('Primary closet',721,751),('Balcony',283,943)]]
D.mkdir(parents=True,exist_ok=True);(D/'plan.json').write_text(json.dumps(p,indent=2)+'\n')
listing={'source':p['source']['url'],'photos':[],'note':p['source']['note'],'finishes':{}}
(D/'listing.json').write_text(json.dumps(listing,indent=2)+'\n')
print('WB1 generated:',len(p['walls']),'wall segments;',len(a),'pieces in each of two layouts;',round(sum(w*d for x,z,w,d in p['floors'][:-1]),2),'m² interior')
