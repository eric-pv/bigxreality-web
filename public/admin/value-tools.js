// Small JSON-schema subset used for Astro's number|string and object|string unions.
// Reject unsupported validation keywords rather than silently changing the stored type.
export function validateValue(value, schema, path = '$') {
  if (schema.anyOf) {
    if (!schema.anyOf.some(option => !validateValue(value, option, path))) return `${path}: 不符合允許的資料型別或欄位結構 / Does not match an allowed type or field structure`;
    return '';
  }
  if (schema.enum && !schema.enum.includes(value)) return `${path}: 值不在允許清單 / Value is not in the allowed list`;
  if (schema.const !== undefined && value !== schema.const) return `${path}: 值必須為 ${schema.const} / Value must be ${schema.const}`;
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return `${path}: 必須為物件 / Must be an object`;
    for (const key of schema.required ?? []) if (value[key] === undefined) return `${path}.${key}: 必填 / Required`;
    for (const [key, item] of Object.entries(value)) {
      const rule = schema.properties?.[key] ?? schema.additionalProperties;
      if (rule === false) return `${path}.${key}: 未定義的欄位 / Unknown field`;
      if (rule && typeof rule === 'object') { const error = validateValue(item, rule, `${path}.${key}`); if (error) return error; }
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) return `${path}: 必須為陣列 / Must be an array`;
    for (let index=0; index<value.length; index++) { const error=validateValue(value[index], schema.items ?? {}, `${path}[${index}]`); if (error) return error; }
  } else if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof value !== 'number' || !Number.isFinite(value) || (schema.type === 'integer' && !Number.isInteger(value))) return `${path}: 必須為${schema.type === 'integer' ? '整數 / Must be an integer' : '數字 / Must be a number'}`;
    if (schema.minimum !== undefined && value < schema.minimum || schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) return `${path}: 數字太小 / Number is too small`;
    if (schema.maximum !== undefined && value > schema.maximum || schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) return `${path}: 數字太大 / Number is too large`;
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') return `${path}: 必須為字串 / Must be a string`;
    if (schema.minLength !== undefined && value.length < schema.minLength) return `${path}: 文字過短 / Text is too short`;
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return `${path}: 文字格式不符 / Text does not match the required format`;
  } else if (schema.type === 'boolean' && typeof value !== 'boolean') return `${path}: 必須為布林值 / Must be a boolean`;
  else if (schema.type === 'null' && value !== null) return `${path}: 必須為 null / Must be null`;
  return '';
}
export const mediaFormat = {
  fromFile: text => ({ body: JSON.parse(text) }),
  toFile: ({ body }) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('媒體對應表必須為 JSON 物件 / Media map must be a JSON object');
    const error=validateValue(body,mediaSchema); if(error) throw new Error(error);
    return JSON.stringify(body, null, 2) + '\n';
  },
};

const localized = { type:'object', properties:{tw:{type:'string'},en:{type:'string'},jp:{type:'string'}}, additionalProperties:false };
const photo = { type:'object', required:['filename','approved'], properties:{filename:{type:'string',pattern:'^[a-z0-9-]+\\.(jpg|jpeg|png)$'},approved:{type:'boolean'},alt:localized,caption:localized},additionalProperties:false };
export const mediaSchema = {type:'object',additionalProperties:{type:'object',properties:{
  publicationDate:{anyOf:[{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'},{type:'null'}]},
  cover:photo,gallery:{type:'array',items:photo},
  videos:{type:'array',items:{type:'object',required:['type','url'],properties:{type:{enum:['youtube','facebook','local']},url:{type:'string',pattern:'^(https://|/media/news/)'},embedApproved:{type:'boolean'},approved:{type:'boolean'},title:localized,poster:{type:'string'}},additionalProperties:false}},
  sourceLinks:{type:'array',items:{type:'string',pattern:'^https://'}},
},additionalProperties:false}};
