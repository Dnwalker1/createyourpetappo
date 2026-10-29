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
glow=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(glow).ellipse((2050,300,3250,1350),fill=GOLD+(60,))
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
# Apple overlays buttons in the top corners and crops top and bottom on some
# devices (iPad landscape), so everything sits in a middle band, y 440-1230,
# x 620-3220.
S=330
for f,a,(x,y) in [('travel-stamp.png',6,(2260,450)),('evening-portrait.png',-5,(2690,430)),
                  ('adventure-sticker.png',-4,(2240,850)),('travel-poster.png',5,(2680,840))]:
    c=card(st+f,S,a); g.alpha_composite(c,(x-70,y-70))
d=ImageDraw.Draw(g)
paw=Image.open(R+'/assets/images/brand/paw-sunset-icon.webp').convert('RGBA').resize((120,120),Image.LANCZOS)
X=640
g.alpha_composite(paw,(X,470))
d.text((X+140,478),'GOODWOOKIE',font=osw(52),fill=GOLD)
d.text((X+140,540),'DESIGN YOUR PET',font=osw(38),fill=AGED)
d.text((X,640),'Your pet,',font=alfa(128),fill=CREAM)
d.text((X,800),'as art.',font=alfa(128),fill=CREAM)
d.text((X+4,1000),'One photo. Four styles.',font=bar(60),fill=CREAM)
d.text((X+4,1085),'On a tee, hoodie, sticker or poster.',font=bar(50),fill=AGED)
g.convert('RGB').save(OUT)
