"""Build trusted in-world image URLs from the public paid-photo snapshot."""
import io,json,re,time,urllib.request,urllib.parse,calendar
from datetime import datetime,timezone
from pathlib import Path
from PIL import Image,ImageOps,UnidentifiedImageError

ROOT=Path(__file__).resolve().parent
PUBLIC=ROOT/'public'
API='https://vsbash-vip.vsbash.workers.dev/api/softday-vip-photos.json'
MIRROR='https://smslksa.github.io/vsbash-leaderboard/softday-vip-photos.json'
ALLOWED={'i.imgur.com','i.ibb.co','i.postimg.cc','cdn.discordapp.com','media.discordapp.net','raw.githubusercontent.com','images.unsplash.com','images.patreonusercontent.com'}

def valid_url(url):
    try:
        u=urllib.parse.urlsplit(url)
        return len(url)<=2048 and u.scheme=='https' and not u.username and not u.password and not u.port and not u.fragment and (u.hostname in ALLOWED or re.fullmatch(r'[a-z0-9-]+\.github\.io',u.hostname or ''))
    except (ValueError,TypeError):return False

class Redirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        if not valid_url(newurl):raise ValueError('unsafe image redirect')
        return super().redirect_request(req,fp,code,msg,headers,newurl)

def download(url,image=False):
    if image and not valid_url(url):raise ValueError('unsupported image host')
    request=urllib.request.Request(url,headers={'User-Agent':'Soft-Day-Public-Photo-Display/1'})
    opener=urllib.request.build_opener(Redirect() if image else urllib.request.HTTPHandler())
    with opener.open(request,timeout=20) as response:
        data=response.read((8*1024*1024 if image else 262144)+1)
        if len(data)>(8*1024*1024 if image else 262144):raise ValueError('download too large')
        if image and not response.headers.get_content_type().startswith('image/'):raise ValueError('not an image')
        return data

def validate_snapshot(doc,now=None):
    now=int(time.time()) if now is None else now
    if not isinstance(doc,dict) or doc.get('schema')!=1 or doc.get('tier')!='SOFT_DAY_PHOTOS':raise ValueError('invalid photo snapshot')
    start,end=doc.get('generatedAt'),doc.get('validUntil')
    if type(start)!=int or type(end)!=int or start>now+60 or end<=now or end-start!=1800:raise ValueError('expired photo snapshot')
    entries=doc.get('photos')
    if not isinstance(entries,list) or len(entries)>256:raise ValueError('invalid photo list')
    seen=set()
    for item in entries:
        slot,name=item.get('slot'),item.get('name')
        if type(slot)!=int or not 0<=slot<256 or slot in seen or not isinstance(name,str) or not 0<len(name)<=64 or re.search(r'[<>\x00-\x1f\x7f]',name):raise ValueError('invalid photo identity')
        if 'source' in item and not valid_url(item['source']):raise ValueError('invalid photo source')
        seen.add(slot)
    return doc

def open_image(data):
    Image.MAX_IMAGE_PIXELS=20_000_000
    with Image.open(io.BytesIO(data)) as image:
        if image.format not in ('JPEG','PNG','WEBP'):raise ValueError('unsupported image format')
        image.load()
        return ImageOps.exif_transpose(image).convert('RGB')

def activated_displays(config,now=None):
    """Only the creator adds entries after confirming a one-time purchase."""
    now=int(time.time()) if now is None else now
    if config.get('schema')!=1 or not isinstance(config.get('displays'),list) or len(config['displays'])>256:raise ValueError('invalid display configuration')
    photos=[];names=[];seen=set()
    for item in config['displays']:
        slot,name=item.get('slot'),item.get('name')
        if type(slot)!=int or not 0<=slot<256 or slot in seen or not isinstance(name,str) or not 0<len(name)<=64 or re.search(r'[<>\x00-\x1f\x7f]',name):raise ValueError('invalid display identity')
        seen.add(slot)
        if not valid_url(item.get('source','')):raise ValueError('invalid display image')
        start=datetime.fromisoformat(item['activatedAt'].replace('Z','+00:00'))
        if start.tzinfo is None:raise ValueError('activation requires a timezone')
        start=start.astimezone(timezone.utc)
        photo_end=int(start.timestamp())+7*86400
        year=start.year+(start.month==12);month=start.month%12+1
        name_end=int(start.replace(year=year,month=month,day=min(start.day,calendar.monthrange(year,month)[1])).timestamp())
        if item.get('enabled',True) is not True or now<int(start.timestamp()):continue
        if now<name_end:names.append({'name':name,'expiresAt':name_end})
        if now<photo_end:photos.append({'slot':slot,'name':name,'source':item['source'],'expiresAt':photo_end})
    return photos,names

def poster():
    config=json.loads((ROOT/'softday-art.json').read_text('utf-8-sig'))
    artworks=config['artworks']
    if not isinstance(artworks,dict) or not 1<=len(artworks)<=24:raise ValueError('invalid artwork list')
    for key,source in artworks.items():
        if not re.fullmatch(r'[a-z0-9-]{1,40}',key):raise ValueError('invalid artwork key')
        data=download(source,True)
        image=open_image(data)
        destination=PUBLIC/f'softday-art-{key}.jpg'
        if data.startswith(b'\xff\xd8\xff') and image.width<=2048 and image.height<=2048:
            destination.write_bytes(data)
        else:
            image.thumbnail((2048,2048),Image.Resampling.LANCZOS)
            image.save(destination,quality=94,optimize=True)

def build():
    PUBLIC.mkdir(exist_ok=True)
    poster()
    now=int(time.time())
    photos,names=activated_displays(json.loads((ROOT/'softday-vip-displays.json').read_text('utf-8-sig')),now)
    document={'schema':1,'tier':'SOFT_DAY_PHOTOS','generatedAt':now,'validUntil':now+1800,'photos':photos}
    (PUBLIC/'softday-purchase-names.json').write_text(json.dumps({'schema':1,'generatedAt':now,'validUntil':now+1800,'supporters':names},ensure_ascii=False)+'\n',encoding='utf-8')
    (PUBLIC/'photos').mkdir(exist_ok=True)
    published=[]
    for item in document['photos']:
        try:
            url=item.get('source') or f"https://smslksa.github.io/vsbash-leaderboard/photos/{item['slot']:03d}.jpg"
            image=open_image(download(url,True))
            canvas=Image.new('RGB',(1024,1440),(22,30,36))
            photo=ImageOps.contain(image,canvas.size,Image.Resampling.LANCZOS)
            canvas.paste(photo,((canvas.width-photo.width)//2,(canvas.height-photo.height)//2))
            canvas.save(PUBLIC/'photos'/f"{item['slot']:03d}.jpg",quality=92,optimize=True)
            published.append({'slot':item['slot'],'name':item['name'],'expiresAt':item['expiresAt']})
        except Exception:
            print(f"Photo slot {item['slot']} unavailable; omitted from this display snapshot.")
    result={key:document[key] for key in ('schema','tier','generatedAt','validUntil')}
    result['photos']=published
    (PUBLIC/'softday-vip-photos.json').write_text(json.dumps(result,ensure_ascii=False)+'\n',encoding='utf-8')
    print(f"Published {len(published)} confirmed custom VIP photos.")

if __name__=='__main__':build()
