// Engagement only. No contact data, query strings or external network requests.
document.querySelectorAll('video[data-project-video]').forEach(video=>{
 const id=video.dataset.projectVideo;if(!/^[a-z0-9-]+$/.test(id))return;
 const play=video.parentElement.querySelector('.project-video-play');
 if(play){play.hidden=false;play.addEventListener('click',()=>{video.play().catch(()=>{play.hidden=false})});video.addEventListener('play',()=>{play.hidden=true});video.addEventListener('pause',()=>{play.hidden=false});video.addEventListener('ended',()=>{play.hidden=false})}
 const report=event=>{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event,video_id:id,page_path:location.pathname})};
 video.addEventListener('play',()=>report('project_video_play'),{once:true});
 video.addEventListener('ended',()=>report('project_video_complete'),{once:true});
});
