import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
R, OUT = sys.argv[1], sys.argv[2]
NAVY=(0x16,0x20,0x2A); CREAM=(0xEF,0xE3,0xC6); GOLD=(0xC7,0x9A,0x3E); AGED=(0xD9,0xC8,0xA2); PAPER=(0xF8,0xF1,0xE0)
F=R+'/node_modules/@expo-google-fonts/'
osw=lambda s: ImageFont.truetype(F+'oswald/600SemiBold/Oswald_600SemiBold.ttf',s)
alfa=lambda s: ImageFont.truetype(F+'alfa-slab-one/400Regular/AlfaSlabOne_400Regular.ttf',s)
bar=lambda s: ImageFont.truetype(F+'barlow/500Medium/Barlow_500Medium.ttf',s)
W,H=3840,1646
g=Image.new('RGBA',(W,H),NAVY+(255,))
glow=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(glow).ellipse((1950,150,3350,1550),fill=GOLD+(60,))
g.alpha_composite(glow.filter(ImageFilter.GaussianBlur(220)))
def card(path,size,angle):
    im=Image.open(path).convert('RGBA').resize((size,size),Image.LANCZOS).filter(ImageFilter.UnsharpMask(2,60,2))
    pad=22; c=Image.new('RGBA',(size+2*pad,size+2*pad),(0,0,0,0))
    ImageDraw.Draw(c).rounded_rectangle((0,0,c.width-1,c.height-1),40,fill=PAPER+(255,))
    m=Image.new('L',(size,size),0); ImageDraw.Draw(m).rounded_rectangle((0,0,size-1,size-1),22,fill=255)
    c.paste(im,(pad,pad),m)
    sh=Image.new('RGBA',(c.width+140,c.height+140),(0,0,0,0))
    ImageDraw.Draw(sh).rounded_rectangle((70,90,70+c.width,90+c.height),40,fill=(0,0,0,150))
    sh=sh.filter(ImageFilter.GaussianBlur(28)); sh.alpha_composite(c,(70,70))
    return sh.rotate(angle,resample=Image.BICUBIC,expand=True)
st=R+'/assets/images/styles/'
S=540
for f,a,(x,y) in [('travel-stamp.png',7,(2060,200)),('evening-portrait.png',-6,(2700,170)),
                  ('adventure-sticker.png',-5,(2030,850)),('travel-poster.png',6,(2680,830))]:
    c=card(st+f,S,a); g.alpha_composite(c,(x-70,y-70))
d=ImageDraw.Draw(g)
paw=Image.open(R+'/assets/images/brand/paw-sunset-icon.webp').convert('RGBA').resize((250,250),Image.LANCZOS)
X=520
g.alpha_composite(paw,(X,300))
d.text((X+290,330),'GOODWOOKIE',font=osw(84),fill=GOLD)
d.text((X+290,440),'DESIGN YOUR PET',font=osw(62),fill=AGED)
d.text((X,640),'Your pet,',font=alfa(170),fill=CREAM)
d.text((X,850),'as art.',font=alfa(170),fill=CREAM)
d.text((X+6,1110),'One photo. Four styles.',font=bar(78),fill=CREAM)
d.text((X+6,1220),'On a tee, hoodie, sticker or poster.',font=bar(66),fill=AGED)
g.convert('RGB').save(OUT)
