// Public Sveltia editor-component API. The comment format is shared with the static renderer.
export const mediaPattern = /<!-- bxr-(image|video): (\{[^\n]*\}) -->/g;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function encodeMedia(kind, data) {
  if(!['image','video'].includes(kind))throw new Error('Unknown media block');
  return `<!-- bxr-${kind}: ${JSON.stringify(data).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')} -->`;
}
export function decodeMedia(match) { return JSON.parse(match[2]); }
const string = (name,label,required=true)=>({name,label,widget:'string',required});
const approved = {name:'approved',label:'核准公開 / Approved for Publication',widget:'boolean',default:false};
export function mediaComponentHtml(kind,data){return `<figure data-bxr-media="${kind}" data-bxr-value="${escape(JSON.stringify(data))}"><figcaption>${escape(data.caption||data.alt||data.title||'')}</figcaption></figure>`;}
export function mediaComponentFromHtml(element){try{const data=JSON.parse(element.getAttribute('data-bxr-value'));return data&&typeof data==='object'&&!Array.isArray(data)?data:undefined;}catch{return undefined;}}
export const imageComponent = {
 htmlSelector:'figure[data-bxr-media="image"]',fromBlockHTML:mediaComponentFromHtml,toBlockHTML:data=>mediaComponentHtml('image',data),
 id:'bxr-image',mode:'dialog',summary:'{{alt}}',label:'正文圖片 / Inline Image',pattern:/^<!-- bxr-image: (\{[^\n]*\}) -->$/m,
 fields:[{name:'src',label:'圖片檔案 / Image File',widget:'image',choose_url:false},string('alt','替代文字 / Alternative Text'),string('caption','圖說 / Caption',false),approved],
 fromBlock:match=>JSON.parse(match[1]),toBlock:data=>encodeMedia('image',data),
 toPreview:(data,getAsset)=>{
  const url=getAsset?.(data.src)?.url;
  return `<figure>${url?`<img src="${escape(url)}" alt="${escape(data.alt)}" style="max-width:100%">`:''}<figcaption>${escape(data.caption||data.alt)}${data.approved?'':' · 未核准，不會公開 / Not approved; hidden on the site'}</figcaption></figure>`;
 },
};
export const videoComponent = {
 htmlSelector:'figure[data-bxr-media="video"]',fromBlockHTML:mediaComponentFromHtml,toBlockHTML:data=>mediaComponentHtml('video',data),
 id:'bxr-video',mode:'dialog',summary:'{{title}}',label:'正文影片 / Inline Video',pattern:/^<!-- bxr-video: (\{[^\n]*\}) -->$/m,
 fields:[{name:'type',label:'影片來源 / Video Source',widget:'select',options:[{label:'YouTube',value:'youtube'},{label:'Facebook',value:'facebook'},{label:'本地影片 / Local Video',value:'local'}],default:'youtube'},string('url','外部影片連結 / External Video URL',false),{name:'file',label:'上傳本地影片 / Upload Local Video',widget:'file',required:false,media_folder:'/public/media/news',public_folder:'/media/news',hint:'本地影片請選擇上傳檔案；外部影片填上方連結。 / Select a file for local video; enter a URL above for external video.'},string('title','影片標題 / Video Title'),string('caption','圖說 / Caption',false),approved,{name:'embedApproved',label:'核准嵌入播放器 / Approved to Embed',widget:'boolean',default:false}],
 fromBlock:match=>JSON.parse(match[1]),toBlock:data=>encodeMedia('video',{...data,url:data.type==='local'?(data.file||data.url):data.url}),
 toPreview:data=>`<figure><strong>${escape(data.title)}</strong><p>${escape(data.type==='local'?(data.file||data.url):data.url)}</p><figcaption>${escape(data.caption)}${data.approved?'':' · 未核准，不會公開 / Not approved; hidden on the site'}</figcaption></figure>`,
};
export function registerMediaComponents(CMS){ CMS.registerEditorComponent(imageComponent);CMS.registerEditorComponent(videoComponent); }
