/** Pure allowlist: unconfirmed embeds stay ordinary links; never fetch remote media to validate them. */
export function externalVideo(type:'youtube'|'facebook',value:string,approved:boolean){
  let url:URL;try{url=new URL(value);}catch{return undefined;}
  if(url.protocol!=='https:')return undefined;
  let embed:string|undefined;
  if(type==='youtube'){
    const host=url.hostname.replace(/^www\./,'');
    const id=host==='youtu.be'?url.pathname.slice(1):['youtube.com','m.youtube.com'].includes(host)?(url.searchParams.get('v')??url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1]):undefined;
    if(!id||!/^[-\w]{11}$/.test(id))return undefined;
    if(approved)embed=`https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0`;
  }else{
    if(!['facebook.com','www.facebook.com','m.facebook.com','fb.watch'].includes(url.hostname))return undefined;
    if(approved&&/\/videos\/\d+\/?$/.test(url.pathname))embed='https://www.facebook.com/plugins/video.php?href='+encodeURIComponent(url.href)+'&show_text=false&autoplay=false';
  }
  return {url:url.href,embed};
}
