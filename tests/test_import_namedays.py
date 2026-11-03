import importlib.util,datetime,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("importer",ROOT/"scripts/import_namedays.py")
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ImportTest(unittest.TestCase):
 def test_complete_and_separate(self):
  records={(datetime.date(2024,1,1)+datetime.timedelta(days=i)).strftime("%m-%d"):["Test"] for i in range(366)}
  entry={"nameday":"old","holidays":[{"name":"A separate event"}]}
  module.apply({"cz":{"2026-11-02":entry}},records,"https://example.test")
  self.assertEqual(entry["nameday"],"Test");self.assertEqual(entry["holidays"],[{"name":"A separate event"}])
 def test_incomplete_rejected(self):
  with self.assertRaises(ValueError):module.validate({"11-02":["Test"]})
 def test_invalid_rejected(self):
  records={(datetime.date(2024,1,1)+datetime.timedelta(days=i)).strftime("%m-%d"):[] for i in range(366)}
  records["11-02"]="not a list"
  with self.assertRaises(ValueError):module.validate(records)
if __name__=="__main__":unittest.main()
