import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
R, OUT = sys.argv[1], sys.argv[2]
NAVY=(0x16,0x20,0x2A); CREAM=(0xEF,0xE3,0xC6); GOLD=(0xC7,0x9A,0x3E); AGED=(0xD9,0xC8,0xA2); PAPER=(0xF8,0xF1,0xE0)
F=R+'/node_modules/@expo-google-fonts/'
osw=lambda s: ImageFont.truetype(F+'oswald/600SemiBold/Oswald_600SemiBold.ttf',s)
alfa=lambda s: ImageFont.truetype(F+'alfa-slab-one/400Regular/AlfaSlabOne_400Regular.ttf',s)
bar=lambda s: ImageFont.truetype(F+'barlow/500Medium/Barlow_500Medium.ttf',s)

# ---- 512 icon: the launcher icon, flattened on cream (Play wants no transparency)
ic=Image.open(R+'/assets/icon.png').convert('RGBA')
bg=Image.new('RGBA',ic.size,CREAM+(255,)); bg.alpha_composite(ic)
bg.convert('RGB').resize((512,512),Image.LANCZOS).save(OUT+'/play-icon-512.png')

# ---- 1024x500 feature graphic
W,H=1024,500
g=Image.new('RGBA',(W,H),NAVY+(255,))
# soft warm glow behind the cards
glow=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(glow)
d.ellipse((560,40,1060,520),fill=GOLD+(70,)); glow=glow.filter(ImageFilter.GaussianBlur(90)); g.alpha_composite(glow)

def card(path,size,angle):
    im=Image.open(path).convert('RGBA').resize((size,size),Image.LANCZOS)
    pad=10; c=Image.new('RGBA',(size+2*pad,size+2*pad),(0,0,0,0))
    ImageDraw.Draw(c).rounded_rectangle((0,0,size+2*pad-1,size+2*pad-1),18,fill=PAPER+(255,))
    m=Image.new('L',(size,size),0); ImageDraw.Draw(m).rounded_rectangle((0,0,size-1,size-1),10,fill=255)
    c.paste(im,(pad,pad),m)
    sh=Image.new('RGBA',(c.width+60,c.height+60),(0,0,0,0))
    ImageDraw.Draw(sh).rounded_rectangle((30,38,30+c.width,38+c.height),18,fill=(0,0,0,150))
    sh=sh.filter(ImageFilter.GaussianBlur(12)); sh.alpha_composite(c,(30,30))
    return sh.rotate(angle,resample=Image.BICUBIC,expand=True)
st=R+'/assets/images/styles/'
cards=[('travel-stamp.png',176,8,(585,48)),('evening-portrait.png',176,-6,(782,40)),
       ('adventure-sticker.png',176,-5,(575,256)),('travel-poster.png',180,6,(772,248))]
for f,s,a,(x,y) in cards:
    c=card(st+f,s,a); g.alpha_composite(c,(x-30,y-30))

d=ImageDraw.Draw(g)
paw=Image.open(R+'/assets/images/brand/paw-sunset-icon.webp').convert('RGBA').resize((92,92),Image.LANCZOS)
g.alpha_composite(paw,(64,70))
d.text((170,86),'GOODWOOKIE',font=osw(30),fill=GOLD)
d.text((170,124),'DESIGN YOUR PET',font=osw(22),fill=AGED)
d.text((64,190),'Your pet,',font=alfa(64),fill=CREAM)
d.text((64,270),'as art.',font=alfa(64),fill=CREAM)
d.text((66,368),'One photo. Four styles.',font=bar(28),fill=CREAM)
d.text((66,408),'On a tee, hoodie, sticker or poster.',font=bar(24),fill=AGED)
g.convert('RGB').save(OUT+'/play-feature-graphic-1024x500.png')
