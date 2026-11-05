import { validateValue, mediaFormat } from './value-tools.js';
const CMS = window.CMS;
if (!CMS) throw new Error('Sveltia CMS 載入失敗，請檢查網路或 CDN 連線。 / Sveltia CMS failed to load. Check the network or CDN connection.');
const { createElement: h, forwardRef, useState, useEffect, useImperativeHandle } = CMS.React;
const ValueControl = forwardRef(function ValueControl({ value, onChange, field, forID, readonly }, ref) {
  const plain = value?.toJS ? value.toJS() : value;
  const [text, setText] = useState(plain === undefined ? '' : JSON.stringify(plain, null, 2));
  const [error, setError] = useState('');
  const schema = field.get('value_schema')?.toJS?.() ?? field.get('value_schema') ?? {};
  useEffect(() => { setText(plain === undefined ? '' : JSON.stringify(plain, null, 2)); }, [value]);
  const validate = textValue => {
    if (!textValue.trim() && !field.get('required')) return '';
    try { return validateValue(JSON.parse(textValue), schema); } catch { return '請輸入有效的 JSON / Enter valid JSON'; }
  };
  useImperativeHandle(ref, () => ({ isValid: () => {
    const message = validate(text); return message ? { error: { message } } : true;
  } }));
  return h('div', null,
    h('textarea', { id: forID, value: text, readOnly: readonly, rows: 10,
      style: {width:'100%',fontFamily:'monospace',padding:'12px',border:'1px solid #888',borderRadius:'4px'},
      'aria-labelledby': `${forID}-label`, 'aria-invalid': !!error, 'aria-describedby': error ? `${forID}-error` : undefined,
      onChange: event => {
        const next=event.target.value; setText(next); const message=validate(next); setError(message);
        if (!message) onChange(next.trim() ? JSON.parse(next) : undefined);
      },
    }),
    error && h('p', { id: `${forID}-error`, role:'alert' }, error),
  );
});
CMS.registerFieldType('bxr-value', ValueControl, undefined, { properties: { value_schema: { type:'object' } } });
CMS.registerCustomFormat('bxr-media-json', 'json', mediaFormat);
CMS.init();
