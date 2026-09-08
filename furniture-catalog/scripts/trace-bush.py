"""Trace the archived Compass / Open Homes plan in pixels; 78 px/m from labeled bedrooms.
Furniture is proposed IKEA staging. Heights and concealed details are approximate.
"""
import json,math,pathlib
R=pathlib.Path(__file__).resolve().parents[1];D=R/'app/decorate/homes/bush-4101';S=78
P=lambda x,z:[round((x-99)/S,5),round((z-453)/S,5)]
L=lambda n:round(n/S,5)
outline=[[365,453],[1167,453],[1167,787],[817,787],[817,1135],[470,1135],[470,1482],[123,1482],[123,1070],[99,1070],[99,897],[294,897],[294,657],[280,657],[280,600],[294,600],[294,510],[365,510]]
p={'name':'333 Bush Street · #4101','height':2.7,'footprint':[P(*v) for v in outline],'floors':[],'floorFinishes':[],'walls':[],'windows':[],'doors':[],'fixtures':[],'furniture':[],'surfacePanels':[],'columns':[],'appearance':{'wood':'#666965','stone':'#eeece7','wall':'#f8f7f4','refrigerator':'#afb7ba','trim':True},'spawn':P(350,800),'yaw':math.pi,'source':{'image':'/city-plans/333-bush-street-unit-4101-1.jpg','pixelsPerMetre':78,'note':'Traced from the downloaded marketing plan and checked against listing photos. Dimensions are approximate; ceiling height and hidden construction are inferred.'}}
def wall(x,z,xx,zz,windows=[]):
 i=len(p['walls']);p['walls'].append(P(x,z)+P(xx,zz))
 for start,width in windows:p['windows'].append({'wall':i,'start':L(start),'width':L(width),'sill':.12,'height':2.28})
 return i
def door(x,z,width,rotation,swing,label,**options):p['doors'].append(dict(zip(['x','z'],P(x,z)))|{'width':L(width),'rotation':rotation,'swing':swing,'label':label}|options)
# Exterior, segmented at the main entrance; windows retain the solid corner piers.
wall(365,453,1167,453);wall(1167,453,1167,787,[(55,228)])
wall(1167,787,817,787,[(52,226)]);wall(817,787,817,1135,[(62,231)])
wall(817,1135,470,1135,[(50,226)]);wall(470,1135,470,1482,[(106,186)])
wall(470,1482,123,1482,[(49,227)]);wall(123,1482,123,1070)
wall(123,1070,99,1070);wall(99,1070,99,897);wall(99,897,294,897)
wall(294,897,294,758);wall(294,670,294,657);wall(294,600,294,510);wall(294,510,365,510);wall(365,510,365,453)
door(294,670,88,-math.pi/2,-math.pi/2,'Main entrance')
# Entry cupboard and refrigerator pocket.
wall(280,600,385,600);wall(280,600,280,657);wall(280,657,300,657);wall(362,657,465,657);wall(385,600,385,657);wall(465,600,465,657)
door(300,657,62,0,-math.pi/2,'Entry closet',initialOpen=False,keepFullHeight=True)
# Hall bath, second-bedroom closet and double bedroom doors.
wall(441,764,641,764);wall(441,764,441,843);wall(398,843,441,843)
wall(398,915,398,1135);wall(398,1058,529,1058);wall(529,764,529,1135)
wall(641,764,641,827);wall(763,764,817,764);wall(817,764,817,787)
door(398,843,72,-math.pi/2,math.pi/2,'Hall bathroom')
wall(763,764,763,827)
door(641,827,122,0,math.pi*5/12,'Bedroom double doors',leaves=2,keepFullHeight=True,glazed=True)
# Primary suite door; ensuite and walk-in closet retain their actual entry gaps.
wall(294,897,307,897);wall(307,897,307,952);wall(307,1016,307,1107);wall(307,1173,307,1200)
wall(123,1070,307,1070);wall(123,1200,307,1200)
door(307,1016,64,math.pi/2,math.pi/2,'Primary bathroom')
door(307,1173,66,math.pi/2,math.pi/2,'Walk-in closet',initialOpen=False,keepFullHeight=True)
door(398,926,77,math.pi,math.pi/2,'Primary suite')
# Small suite closet at the upper right of the primary bedroom.
wall(398,1135,470,1135);wall(398,1200,470,1200);wall(470,1135,470,1200)
door(398,1200,65,math.pi/2,math.pi/2,'Primary closet',initialOpen=False,keepFullHeight=True)
# Continuous floor, split only at boundaries and wet-room finish changes.
def inside(x,z):
 c=False
 for i,(a,b) in enumerate(outline):
  aa,bb=outline[i-1]
  if (b>z)!=(bb>z) and x<(aa-a)*(z-b)/(bb-b)+a:c=not c
 return c
xs=sorted(set([v[0] for v in outline]+[307,398,441,529]));zs=sorted(set([v[1] for v in outline]+[764,843,1058,1070]))
for a,b in zip(xs,xs[1:]):
 for c,d in zip(zs,zs[1:]):
  x=(a+b)/2;z=(c+d)/2
  if inside(x,z):
   p['floors'].append(P(a,c)+[L(b-a),L(d-c)])
   p['floorFinishes'].append('tile' if (99<x<307 and 897<z<1070) or (398<x<529 and 843<z<1058) or (441<x<529 and 764<z<843) else 'floor')
def fixture(t,x,z,w,d,h,r=0,**kw):p['fixtures'].append({'type':t,'x':P(x,z)[0],'z':P(x,z)[1],'width':w,'depth':d,'height':h,'rotation':r}|kw)
# Kitchen services: north counter, cooktop peninsula, refrigerator and laundry recess.
fixture('laundry',329,555,.68,.72,1.93,math.pi/2)
fixture('refrigerator',425,630,.78,.70,1.96,math.pi,freezer='bottom')
for t,x,w in [('cabinet',419,.85),('dishwasher',489,.60),('sink',552,.95),('cabinet',611,.50)]:fixture(t,x,482,w,.64,.90,upper=True)
fixture('cabinet',494,632,.53,.80,.90,math.pi,upper=False)
fixture('stove',550,632,.72,.80,.90,math.pi,cooktop='ceramic',island=True)
fixture('cabinet',606,632,.70,.80,.90,math.pi,upper=False)
fixture('microwave',610,478,.48,.40,.30,y=.94)
# Bathroom fixtures face their approach paths.
fixture('shower',485,804,.90,.91,.1)
fixture('vanity',423,988,1.28,.48,.86,math.pi/2)
fixture('toilet',499,1021,.40,.69,.81,math.pi)
fixture('shower',143,984,.88,1.88,.1)
fixture('toilet',243,932,.40,.72,.81)
fixture('vanity',245,1045,1.38,.48,.86,math.pi)
# Storage shelves are inside actual closet rooms; no duplicate door in the openings.
fixture('closet-interior',585,785,1.18,.38,2.3)
door(529,827,112,0,-math.pi/2,'Bedroom closet doors',leaves=2,initialOpen=False,keepFullHeight=True)
# Open shelving in WIC and cupboards; actual hinged room doors above.
for x,z,w,d,r in [(215,1093,1.9,.40,0),(434,1168,.6,.36,-math.pi/2),(332,620,.65,.28,0)]:fixture('closet-interior',x,z,w,d,2.2,r)
p['closetVolumes']=[{'name':name,'rect':P(x,z)+[L(w),L(d)],'side':side,'start':L(start),'opening':L(opening)} for name,x,z,w,d,side,start,opening in [
 ('Entry closet',280,600,105,57,'south',20,62),
 ('Bedroom closet',529,764,112,63,'south',0,112),
 ('Walk-in closet',123,1070,184,130,'east',37,66),
 ('Primary closet',398,1135,72,65,'west',0,65),
]]
# Tiled bathroom liners and kitchen backsplash, offset from structural walls.
def panel(x,z,xx,zz,h,finish,bottom=0):p['surfacePanels'].append({'line':P(x,z)+P(xx,zz),'height':h,'bottom':bottom,'finish':finish})
panel(103,902,103,1065,2.5,'tile');panel(104,901,301,901,2.5,'tile');panel(104,1066,302,1066,2.5,'tile')
panel(524,770,524,1053,2.5,'tile');panel(446,769,524,769,2.5,'tile');panel(402,1054,524,1054,2.5,'tile')
panel(372,458,634,458,.61,'backsplash',.94)
# Large structural piers shown in black on the source drawing.
for x,z,w,d in [(1142,478,48,48),(1142,762,48,48),(788,789,48,48),(790,1108,48,48),(501,1096,52,70),(445,1457,48,48),(148,1457,48,48)]:p['columns'].append(P(x-w/2,z-d/2)+[L(w),L(d)])
def furnishing(id,x,z,r=0):return {'id':id,'x':P(x,z)[0],'z':P(x,z)[1],'r':r}
# Two alternatives share the source architecture; furnishing positions are proposed.
common=[furnishing('bed',248,1300),furnishing('nightstand',157,1247),furnishing('nightstand',340,1247),furnishing('dresser',161,1365,math.pi/2),furnishing('floor-lamp',421,1370),furnishing('rug',302,1364),furnishing('bed',692,1005),furnishing('nightstand',600,925),furnishing('nightstand',785,925),furnishing('dresser',556,1032,math.pi/2),furnishing('bookshelf',795,1010,-math.pi/2)]
a=common+[furnishing('sofa',921,507),furnishing('rug',955,615,math.pi/2),furnishing('coffee-table',933,596),furnishing('armchair',1089,665,math.pi),furnishing('armchair',982,710,math.pi),furnishing('floor-lamp',1080,487),furnishing('bookshelf',691,477),furnishing('dining-table',742,605),furnishing('armchair',742,531),furnishing('armchair',742,679,math.pi),furnishing('armchair',815,605,-math.pi/2)]
b=common+[furnishing('morabo',1087,609,-math.pi/2),furnishing('rug',965,620),furnishing('coffee-table',1000,610,math.pi/2),furnishing('armchair',889,535),furnishing('armchair',889,697,math.pi),furnishing('floor-lamp',1081,487),furnishing('bookshelf',888,476),furnishing('dining-table',741,582),furnishing('armchair',741,506),furnishing('armchair',741,658,math.pi),furnishing('armchair',815,582,-math.pi/2)]
p['lights']=[P(x,z) for x,z in [(480,550),(660,700),(935,560),(692,1005),(350,810),(350,1070),(248,1300),(470,960),(230,985)]]
p['furniture']=a;p['layouts']=[{'id':'gather','name':'Gather','furniture':a},{'id':'retreat','name':'Retreat','furniture':b}]
p['rooms']=[{'name':n,'point':P(x,z)} for n,x,z in [('Foyer',351,800),('Kitchen',540,553),('Living room',1030,722),('Dining',681,571),('Second bedroom',588,977),('Hall bathroom',475,919),('Primary suite',376,1280),('Primary bathroom',259,989),('Walk-in closet',250,1150)]]
# Retracing architecture must preserve the independently curated room staging.
D.mkdir(parents=True,exist_ok=True)
plan_path=D/'plan.json'
if plan_path.exists():
 previous=json.loads(plan_path.read_text())
 for key in ['design','furniture','layouts']:
  if key in previous:p[key]=previous[key]
plan_path.write_text(json.dumps(p,indent=2)+'\n')
photos=json.loads((R/'public/listings/bush-4101/sources.json').read_text())
photo_ids=[4,11,12,18,13,15,16,17,20,2,6,21]
labels=['Living and dining room','Galley kitchen and quartz peninsula','Kitchen appliances','Refrigerator and stacked laundry','Second bedroom windows','Primary bedroom','Primary bedroom oak floors and windows','Marble-tiled bathroom','Glass shower enclosure','View from the living room','City view','Building entrance']
selected=[photos[i-1]|{'alt':label} for i,label in zip(photo_ids,labels)]
def sample(i,crop):return {'src':photos[i-1]['src'],'crop':crop}
listing={'source':'https://333bush4101.com/','photos':selected,'note':'Listing photographs of 333 Bush Street #4101. The furniture arrangements are proposed IKEA staging; dimensions and ceiling height are approximate.','finishes':{'floor':sample(11,[1580,1170,190,170]),'wall':sample(16,[1920,400,110,240]),'ceiling':sample(11,[1490,45,140,100]),'tile':sample(17,[1550,600,360,270]),'backsplash':sample(12,[180,695,135,65]),'stone':sample(11,[320,1075,260,130])}}
(D/'listing.json').write_text(json.dumps(listing,indent=2)+'\n')
print('Traced',len(p['walls']),'walls,',len(p['doors']),'doors,',len(a),'furniture pieces per layout;',round(sum(w*d for x,z,w,d in p['floors']),1),'m² outline')

# Cache the same crops for Blender; the browser samples these rectangles at runtime.
from PIL import Image
texture_dir=R/'public/listings/bush-4101/textures';texture_dir.mkdir(exist_ok=True)
for name,source in listing['finishes'].items():
 x,y,w,h=source['crop'];image=Image.open(R/'public'/source['src'].lstrip('/'))
 assert x+w<=image.width and y+h<=image.height
 image.crop((x,y,x+w,y+h)).resize((512,512)).save(texture_dir/(name+'.jpg'),quality=95)
