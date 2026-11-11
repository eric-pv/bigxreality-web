import {test} from "node:test";
import assert from "node:assert/strict";
import {COUNTRY_CODES,countryOptions} from "../src/lib/countries.ts";

test("country dropdown uses one complete ISO list with localized labels and stable values",()=>{
  assert.equal(COUNTRY_CODES.length,249);
  assert.equal(new Set(COUNTRY_CODES).size,249);
  assert.ok(COUNTRY_CODES.every(code=>/^[A-Z]{2}$/.test(code)));
  for(const lang of ["tw","en","jp"] as const){
    const options=countryOptions(lang);
    assert.deepEqual(options.map(option=>option.code).sort(),[...COUNTRY_CODES].sort());
    assert.ok(options.every(option=>option.label.length>0 && option.label!==option.code));
    assert.ok(options.some(option=>option.code==="TW"));
    assert.ok(options.some(option=>option.code==="JP"));
    assert.ok(options.some(option=>option.code==="US"));
  }
  assert.notEqual(countryOptions("en").find(option=>option.code==="JP")!.label,countryOptions("jp").find(option=>option.code==="JP")!.label);
});
