"""Strict parsing, structural validation and lexical evidence are separate gates."""
import json
import hashlib
import sys
from pathlib import Path
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, ValidationError

ShortText = Annotated[str, Field(min_length=1, max_length=120, pattern=r'\S')]
Quote = Annotated[str, Field(min_length=1, max_length=500, pattern=r'\S')]

class Entity(BaseModel):
    model_config = ConfigDict(strict=True, extra='forbid')
    type: Literal['PER', 'ORG']
    text: ShortText
    quote: Quote

class EntityExtraction(BaseModel):
    model_config = ConfigDict(strict=True, extra='forbid')
    entities: Annotated[list[Entity], Field(max_length=8)]

def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate_json_key')
        result[key] = value
    return result

def reject_constant(_):
    raise ValueError('non_json_constant')

def parse_response(raw):
    if not isinstance(raw, str) or len(raw.encode('utf-8')) > 32768:
        raise ValueError('response_too_large')
    return json.loads(raw, object_pairs_hook=unique_object,
                      parse_constant=reject_constant)

def evidence_errors(extraction, source):
    errors = []
    seen = set()
    for index, entity in enumerate(extraction.entities):
        if entity.quote not in source:
            errors.append({'index': index, 'code': 'quote_not_in_source'})
        if entity.text not in entity.quote:
            errors.append({'index': index, 'code': 'text_not_in_quote'})
        identity = (entity.type, entity.text)
        if identity in seen:
            errors.append({'index': index, 'code': 'duplicate_entity'})
        seen.add(identity)
    return errors

def validate_response(raw, source):
    if not isinstance(source, str) or len(source) > 1600:
        return {'accepted': False, 'stage': 'source', 'errors': [{'code': 'source_limit'}]}
    try:
        value = parse_response(raw)
    except (ValueError, RecursionError, UnicodeError):
        return {'accepted': False, 'stage': 'parse', 'errors': [{'code': 'invalid_json'}]}
    try:
        extraction = EntityExtraction.model_validate(value)
    except ValidationError:
        return {'accepted': False, 'stage': 'schema', 'errors': [{'code': 'schema_violation'}]}
    errors = evidence_errors(extraction, source)
    if errors:
        return {'accepted': False, 'stage': 'evidence', 'errors': errors}
    return {'accepted': True, 'stage': 'accepted', 'errors': [],
            'data': extraction.model_dump()}

def exact_counts(predicted, expected):
    p = {(e['type'], e['text']) for e in predicted}
    gold = {(e['type'], e['text']) for e in expected}
    return {'tp': len(p & gold), 'fp': len(p - gold), 'fn': len(gold - p)}

def metrics(counts):
    tp, fp, fn = (counts[k] for k in ['tp', 'fp', 'fn'])
    return {**counts, 'precision': tp/(tp+fp) if tp+fp else None,
            'recall': tp/(tp+fn) if tp+fn else None,
            'f1': 2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else None}

if __name__ == '__main__':
    root = Path(__file__).parent
    if sys.argv[1] == 'schema':
        schema = EntityExtraction.model_json_schema()
        print(json.dumps({'$schema': 'https://json-schema.org/draft/2020-12/schema', **schema}, ensure_ascii=False, indent=2))
    elif sys.argv[1] == 'validate':
        capture = json.loads((root/'results/generations.json').read_text())
        docs = {d['id']: d for d in json.loads((root/'documents.json').read_text())}
        rows = []
        for run in capture['runs']:
            doc = docs[run['documentId']]
            result = validate_response(run['raw'], doc['source'])
            accepted = result.get('data', {}).get('entities', [])
            rows.append({'documentId': run['documentId'], 'variant': run['variant'], **result,
                         'counts': exact_counts(accepted, doc['expected'])})
        summaries = []
        for variant in capture['protocol']['variants']:
            subset = [row for row in rows if row['variant'] == variant]
            counts = {k: sum(row['counts'][k] for row in subset) for k in ['tp','fp','fn']}
            stages = {stage: sum(row['stage'] == stage for row in subset) for stage in ['parse','schema','evidence','accepted']}
            summaries.append({'variant': variant, 'documents': len(subset), 'stages': stages, **metrics(counts)})
        hashes = {f: hashlib.sha256((root/f).read_bytes()).hexdigest() for f in ['contract.py','run-python.mjs','runtime.json','documents.json','extraction.schema.json','results/generations.json']}
        print(json.dumps({'capture': capture['capturedAt'], 'sourceHashes': hashes, 'rows': rows, 'summaries': summaries}, ensure_ascii=False, indent=2))
    elif sys.argv[1] == 'fixtures':
        cases = json.loads((root/'fixtures.json').read_text())
        rows = [{**case, 'result': validate_response(case['raw'],case['source'])} for case in cases]
        hashes = {f: hashlib.sha256((root/f).read_bytes()).hexdigest() for f in ['contract.py','fixtures.json','runtime.json']}
        print(json.dumps({'sourceHashes': hashes,'rows': rows}, ensure_ascii=False, indent=2))
    else:
        raise SystemExit('Use schema, validate or fixtures')
