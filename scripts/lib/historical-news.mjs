/** Parses only the supplied local TXT; metadata/editorial notes never become article prose. */
export function parseHistoricalNews(text) {
  const records=[];
  for(const block of text.replaceAll('\r\n','\n').split(/^={16,}\s*$/m)) {
    const id=block.match(/^ARTICLE_ID: (.+)$/m)?.[1];
    if(!id||!/^\[TW\]$/m.test(block))continue;
    const field=name=>block.match(new RegExp('^'+name+': (.+)$','m'))?.[1];
    const languages={};
    for(const [lang,label,titlePrefix,bodyPrefix]of [['tw','TW','標題：','內文：'],['en','EN','Title: ','Body:'],['jp','JP','タイトル：','本文：']]) {
      const section=block.split('['+label+']\n')[1]?.split(/\n\[(?:TW|EN|JP)\]\n/)[0]?.trim();
      if(!section?.startsWith(titlePrefix))throw Error(id+' missing '+lang);
      const line=section.indexOf('\n'),title=section.slice(titlePrefix.length,line);
      const body=section.slice(line+1).replace(new RegExp('^'+bodyPrefix+'\\n'),'').trim();
      languages[lang]={title,body,summary:body.split('\n\n')[0]};
    }
    const rawDate=field('DATE'),editorialNote=[field('DATE_NOTE'),field('NOTE'),field('EDITORIAL_NOTE')].filter(Boolean).join(' ');
    // V2 explicitly resolves 03/06 to FB dates, but 07 remains disputed and 15's year is inferred.
    const unresolved=['news-07-indo-defence','news-15-media-visit-2026'].includes(id);
    const validDate=/^\d{4}-\d{2}-\d{2}$/.test(rawDate);
    const categoryText=field('CATEGORY');
    const category=categoryText.includes('Event')?'event':categoryText.includes('Company')?'company':categoryText.includes('Product')?'product':categoryText.includes('Insight')?'insight':'media';
    const urls=[...new Set((block.match(/https?:\/\/[^\s<>（），。；)]+/g)??[]).map(url=>url.replace(/[.,;]+$/,'')))];
    records.push({id,date:validDate&&!unresolved?rawDate:null,dateCandidate:validDate&&unresolved?rawDate:undefined,dateNote:unresolved?editorialNote:validDate?field('DATE_NOTE'):rawDate,dateSource:field('DATE_SOURCE'),category,sourceCategory:categoryText,imageSource:field('IMAGE_SOURCE')?.startsWith('https://')?field('IMAGE_SOURCE'):null,note:editorialNote||undefined,urls,mediaSource:field('MEDIA_SOURCE'),languages});
  }
  if(new Set(records.map(r=>r.id)).size!==records.length)throw Error('Duplicate ARTICLE_ID');
  if(records.length!==30)throw Error('Expected 30 independent articles, got '+records.length);
  return records;
}
