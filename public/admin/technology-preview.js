// Use Sveltia's supported preview template API; this is an editorial preview, not a second App.
export function registerTechnologyPreviews(CMS){
 const h=CMS.React.createElement;
 function TechnologyPreview({entry,widgetFor,getAsset}){
  const d=entry.get('data')?.toJS?.()??{};
  const paragraphs=(items=[])=>items.map((text,index)=>h('p',{key:index},text));
  const src=d.heroImage?.src?getAsset(d.heroImage.src)?.url:undefined;
  return h('article',{style:{maxWidth:'800px',margin:'auto',padding:'24px',lineHeight:1.8}},
   h('p',null,d.eyebrow),h('h1',null,d.title),h('p',null,d.lead),...paragraphs(d.intro),
   src&&h('img',{src,alt:d.heroImage.alt,style:{maxWidth:'100%'}}),
   ...(d.sections??[]).map((section,index)=>h('section',{key:section.id??index},
    h('h2',null,section.title),...paragraphs(section.paragraphs),
    ...(section.items??[]).map((item,i)=>h('div',{key:i},h('h3',null,item.title),...paragraphs(item.paragraphs))),
    section.bullets?.length?h('ul',null,...section.bullets.map((text,i)=>h('li',{key:i},text))):null,
    widgetFor(`sections.${index}.body`),section.note&&h('p',null,section.note))),
   ...(d.technologies?Object.values(d.technologies).map((item,index)=>h('section',{key:index},h('h2',null,item.title),h('p',null,item.description))):[]),
   widgetFor('body'),d.relatedTitle&&h('h2',null,d.relatedTitle),...paragraphs(d.relationNotes),
   ...(d.faq??[]).map((item,index)=>h('section',{key:index},h('h3',null,item.question),h('p',null,item.answer))),
   d.closing&&h('section',null,h('h2',null,d.closing.title),h('p',null,d.closing.body),h('p',null,d.closing.cta)),
   h('aside',{style:{borderTop:'1px solid #bbb',marginTop:'32px'}},h('strong',null,'SEO'),h('p',null,d.seo?.title),h('p',null,d.seo?.description)));
 }
 for(const name of ['technologies','technology-overview',...['tw','en','jp'].flatMap(lang=>[`technologies-${lang}`,`technology-overview-${lang}`])])CMS.registerPreviewTemplate(name,TechnologyPreview);
}
