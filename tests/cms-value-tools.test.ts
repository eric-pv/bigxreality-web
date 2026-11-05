import assert from 'node:assert/strict';
import test from 'node:test';
import {mediaFormat, validateValue} from '../public/admin/value-tools.js';

test('CMS validation reports bilingual errors with the failing field path', () => {
  const cases: [unknown, object, string][] = [
    [true, {anyOf:[{type:'number'},{type:'string'}]}, 'allowed type'],
    ['other', {enum:['local']}, 'allowed list'],
    ['wrong', {const:'fixed'}, 'Value must be fixed'],
    [[], {type:'object'}, 'Must be an object'],
    [{}, {type:'object',required:['filename']}, 'Required'],
    [{extra:true}, {type:'object',additionalProperties:false}, 'Unknown field'],
    [{}, {type:'array'}, 'Must be an array'],
    ['1', {type:'number'}, 'Must be a number'],
    [1.5, {type:'integer'}, 'Must be an integer'],
    [Infinity, {type:'number'}, 'Must be a number'],
    [-1, {type:'number',minimum:0}, 'Number is too small'],
    [0, {type:'number',exclusiveMinimum:0}, 'Number is too small'],
    [2, {type:'number',maximum:1}, 'Number is too large'],
    [1, {type:'number',exclusiveMaximum:1}, 'Number is too large'],
    [1, {type:'string'}, 'Must be a string'],
    ['', {type:'string',minLength:1}, 'Text is too short'],
    ['bad', {type:'string',pattern:'^https://'}, 'required format'],
    ['false', {type:'boolean'}, 'Must be a boolean'],
    [false, {type:'null'}, 'Must be null'],
  ];
  for(const [value,schema,english] of cases){
    const error=validateValue(value,schema,'$.field');
    assert.ok(error.startsWith('$.field'),error);
    assert.match(error,/[\u3400-\u9fff]/);
    assert.ok(error.includes(english),error);
  }
  const nested=validateValue({gallery:[{approved:'yes'}]}, {type:'object',properties:{gallery:{type:'array',items:{type:'object',properties:{approved:{type:'boolean'}}}}}});
  assert.ok(nested.startsWith('$.gallery[0].approved:'));
});

test('CMS validation preserves valid types and media round trips, rejecting invalid media', () => {
  assert.equal(validateValue(0,{type:'number',minimum:0,maximum:0}),'');
  assert.equal(validateValue(0.5,{type:'number',exclusiveMinimum:0,exclusiveMaximum:1}),'');
  assert.equal(validateValue('[待提供]',{anyOf:[{type:'number'},{type:'string',const:'[待提供]'}]}),'');
  const media={example:{cover:{filename:'example.jpg',approved:false,alt:{tw:'中文',en:'English',jp:'日本語'}},gallery:[],videos:[],sourceLinks:[]}};
  assert.deepEqual(mediaFormat.fromFile(mediaFormat.toFile({body:media})),{body:media});
  assert.throws(()=>mediaFormat.toFile({body:[]}),/Media map must be a JSON object/);
  assert.throws(()=>mediaFormat.toFile({body:{example:{cover:{filename:'example.jpg',approved:'yes'}}}}),/\$\.example\.cover\.approved:.*Must be a boolean/);
});
