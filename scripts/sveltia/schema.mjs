// Load the real Zod definitions without invoking Astro loaders, CMS APIs or image transforms.
// Imports are replaced only for schema inspection; field definitions stay in content.config.ts.
import ts from 'typescript';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { z } from 'astro/zod';
export const root = new URL('../../', import.meta.url);
function constant(file, name) {
 const text=readFileSync(new URL(file,root),'utf8');
 const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 for(const node of ast.statements) if(ts.isVariableStatement(node)) for(const d of node.declarationList.declarations)
  if(d.name.getText(ast)===name) {
   const expression=ts.transpileModule(`(${d.initializer.getText(ast)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
   return vm.runInNewContext(expression);
  }
 throw new Error(`Missing schema constant ${name}`);
}
export function loadSchemas() {
 const source=readFileSync(new URL('src/content.config.ts',root),'utf8');
 const ast=ts.createSourceFile('content.config.ts',source,ts.ScriptTarget.Latest,true);
 const withoutImports=ast.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getFullText(ast)).join('\n');
 const code=ts.transpileModule(withoutImports,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 vm.runInNewContext(code,{exports,z,defineCollection:v=>v,glob:()=>({}),existsSync:()=>false,contentSource:()=> 'markdown',resolveSlot:v=>v,PENDING:'[待提供]',
  DOMAINS:constant('src/lib/domains.ts','DOMAINS'),PRODUCT_DOMAINS:constant('src/lib/domains.ts','PRODUCT_DOMAINS'),
  TECHNOLOGY_IDS:constant('src/lib/technologies.ts','TECHNOLOGY_IDS'),INVESTOR_MODULES:constant('src/lib/company.ts','INVESTOR_MODULES'),PARTNER_CATEGORIES:constant('src/lib/company.ts','PARTNER_CATEGORIES')});
 const context={image:()=>z.string().describe('astro:image')};
 return Object.fromEntries(Object.entries(exports.collections).map(([k,v])=>[k,typeof v.schema==='function'?v.schema(context):v.schema]));
}
export function unwrap(schema) {
 let optional=false, defaultValue;
 while(true){
  const d=schema._def;
  if(d.type==='optional'||d.type==='default'){optional=true;if(d.type==='default')defaultValue=d.defaultValue;schema=d.innerType;}
  else if(d.type==='pipe') schema=d.in._def.type==='transform'?d.out:d.in;
  else break;
 }
 return {schema,optional,defaultValue};
}
