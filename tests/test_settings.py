import unittest
from pydantic import ValidationError
from eduvize_holidays.output_adapter import validate

PAYLOAD=dict(country='cz',monthFormat='text',days=3,tomorrow=True,holidays=True,significant=True,nameDetails=True)
class Settings(unittest.TestCase):
    def test_valid_settings(self):
        self.assertEqual(validate(PAYLOAD,{}),PAYLOAD)
        self.assertEqual(validate({**PAYLOAD,'country':'sk','days':0},{})['country'],'sk')
    def test_private_or_invalid_settings_rejected(self):
        for delta in [{'country':'xx'},{'days':True},{'days':7},{'previewDate':'2026-12-24'},{'profileId':'d'*32},{'token':'secret'},{'nameDetails':'1'}]:
            with self.subTest(delta=delta),self.assertRaises(ValidationError):validate({**PAYLOAD,**delta},{})
