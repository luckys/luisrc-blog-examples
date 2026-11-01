import json, unittest
from contract import parse_response, validate_response, evidence_errors, EntityExtraction, exact_counts, metrics

class ContractTests(unittest.TestCase):
    def test_parse_is_strict_and_never_repairs(self):
        for raw in ['```json\n{"entities": []}\n```', '{"entities":[],"entities":[]}', '{"entities":NaN}', '{"entities":[]} texto']:
            with self.subTest(raw=raw):
                self.assertEqual(validate_response(raw, 'Sin nombres')['stage'], 'parse')
    def test_schema_rejects_extra_fields_and_wrong_types(self):
        for value in [{'entities': [], 'secret': 1}, {'entities': 'none'}, {'entities': [{'type':'LOC','text':'a','quote':'a'}]}, {'entities':[{'type':'PER','text':3,'quote':'a'}]}]:
            self.assertEqual(validate_response(json.dumps(value), 'a')['stage'], 'schema')
    def test_valid_empty_and_grounded_entities(self):
        self.assertTrue(validate_response('{"entities":[]}', 'Sin nombres')['accepted'])
        raw=json.dumps({'entities':[{'type':'PER','text':'Zoé Pérez','quote':'👩‍💻 Zoé Pérez informó.'}]},ensure_ascii=False)
        self.assertTrue(validate_response(raw,'👩‍💻 Zoé Pérez informó.')['accepted'])
    def test_fabricated_quote_or_text_fails_anchoring(self):
        for entity,code in [({'type':'ORG','text':'Falsa','quote':'Falsa existe'},'quote_not_in_source'),({'type':'ORG','text':'Falsa','quote':'Ana trabaja.'},'text_not_in_quote')]:
            report=validate_response(json.dumps({'entities':[entity]}),'Ana trabaja.')
            self.assertEqual(report['stage'],'evidence');self.assertIn(code,[e['code'] for e in report['errors']])
    def test_duplicate_and_unicode_are_literal(self):
        e={'type':'PER','text':'Zoé','quote':'Zoé'}
        self.assertEqual(validate_response(json.dumps({'entities':[e,e]}),'Zoé')['stage'],'evidence')
        self.assertFalse(validate_response(json.dumps({'entities':[e]}),'Zoe\u0301')['accepted'])
    def test_anchor_does_not_prove_type_or_negation(self):
        raw=json.dumps({'entities':[{'type':'ORG','text':'Río Claro','quote':'«Río Claro» es un proyecto, no una empresa.'}]})
        self.assertTrue(validate_response(raw,'«Río Claro» es un proyecto, no una empresa.')['accepted'])
    def test_limits_are_explicit(self):
        self.assertEqual(validate_response(' '*32769,'a')['stage'],'parse')
        self.assertEqual(validate_response('{"entities":[]}', 'a'*1601)['stage'],'source')
    def test_metrics_separate_rejection_from_semantic_accuracy(self):
        self.assertEqual(exact_counts([], [{'type':'PER','text':'Ana'}]), {'tp':0,'fp':0,'fn':1})
        self.assertEqual(exact_counts([{'type':'ORG','text':'Ana'}], [{'type':'PER','text':'Ana'}]), {'tp':0,'fp':1,'fn':1})
        self.assertIsNone(metrics({'tp':0,'fp':0,'fn':0})['f1'])
    def test_model_schema_declares_closed_objects(self):
        schema=EntityExtraction.model_json_schema()
        self.assertFalse(schema['additionalProperties']);self.assertFalse(schema['$defs']['Entity']['additionalProperties'])

if __name__=='__main__':unittest.main()
