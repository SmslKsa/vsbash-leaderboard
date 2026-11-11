import importlib.util,unittest
from datetime import datetime
from pathlib import Path
spec=importlib.util.spec_from_file_location('gallery',Path(__file__).with_name('softday-gallery.py'))
gallery=importlib.util.module_from_spec(spec);spec.loader.exec_module(gallery)
class Tests(unittest.TestCase):
 def test_hosts(self):
  self.assertTrue(gallery.valid_url('https://i.imgur.com/photo.png'))
  for url in ['https://127.0.0.1/p.png','https://i.imgur.com.evil.test/p.png','https://x:y@i.imgur.com/p.png','http://i.imgur.com/p.png']:
   self.assertFalse(gallery.valid_url(url))
 def test_fresh_snapshot(self):
  doc={'schema':1,'tier':'SOFT_DAY_PHOTOS','generatedAt':100,'validUntil':1900,'photos':[{'slot':0,'name':'A','source':'https://i.imgur.com/a.png'}]}
  self.assertIs(gallery.validate_snapshot(doc,101),doc)
  with self.assertRaises(ValueError):gallery.validate_snapshot(doc,1901)
  doc['photos'].append({'slot':0,'name':'B'})
  with self.assertRaises(ValueError):gallery.validate_snapshot(doc,101)
 def test_markup_rejected(self):
  with self.assertRaises(ValueError):gallery.validate_snapshot({'schema':1,'tier':'SOFT_DAY_PHOTOS','generatedAt':100,'validUntil':1900,'photos':[{'slot':1,'name':'<b>bad</b>'}]},101)
 def test_weekly_photo_monthly_name(self):
  start=int(datetime.fromisoformat('2026-01-31T12:00:00+00:00').timestamp())
  config={'schema':1,'displays':[{'slot':0,'name':'Test','source':'https://i.imgur.com/a.png','activatedAt':'2026-01-31T12:00:00Z'}]}
  photos,names=gallery.activated_displays(config,start)
  self.assertEqual(photos[0]['expiresAt'],start+604800)
  self.assertEqual(names[0]['expiresAt'],int(datetime.fromisoformat('2026-02-28T12:00:00+00:00').timestamp()))
  self.assertEqual(gallery.activated_displays(config,start+604800)[0],[])
  self.assertEqual(len(gallery.activated_displays(config,start+604800)[1]),1)
  self.assertEqual(gallery.activated_displays(config,names[0]['expiresAt']),( [],[]))
  self.assertEqual(gallery.activated_displays(config,start-1),([],[]))
 def test_owner_can_disable_and_duplicates_rejected(self):
  item={'slot':1,'name':'Test','source':'https://i.imgur.com/a.png','activatedAt':'2026-01-01T00:00:00Z','enabled':False}
  self.assertEqual(gallery.activated_displays({'schema':1,'displays':[item]},1767225600),([],[]))
  with self.assertRaises(ValueError):gallery.activated_displays({'schema':1,'displays':[item,item]},1767225600)
if __name__=='__main__':unittest.main()
