// Real Obsidian portfolio imagery, selected by the glass and setting discussed.
// These are visual examples, not evidence of a named-city job or a film specification.
const photo=(src,alt)=>({src,alt});
const home={
 garden:photo('/assets/site/home.webp','Residential windows overlooking a garden'),
 living:photo('/gallery/tintwiz-20261111/living-room-glass.webp','Living-room sliding glass door opening onto a patio'),
 patio:photo('/gallery/tintwiz-20261111/covered-patio-window.webp','Reflective residential window beneath a covered patio'),
 exterior:photo('/gallery/tintwiz-20261111/poolside-home-glass.webp','Home windows and sliding glass door beside a pool')
};
const commercial={
 lounge:photo('/gallery/tintwiz-20261111/office-lounge-windows.webp','Office lounge with full-height windows and seating'),
 daylight:photo('/gallery/tintwiz-20261111/daylight-office-glass.webp','Office windows overlooking trees'),
 storefront:photo('/assets/site/work-commercial.webp','Commercial glass entrance from the Obsidian portfolio'),
 waiting:photo('/assets/site/commercial.webp','Office seating beside windows overlooking greenery')
};
const cycle=(items,path)=>items[[...path].reduce((sum,char)=>sum+char.charCodeAt(0),0)%items.length];
export function withBuildingPhoto(page) {
 if(!['home','commercial'].includes(page.division))return page;
 if(page.image && page.imageKind!=='illustration')return {...page,...(['city','project'].includes(page.type)?{imageCaption:'From our work'}:{})};
 const path=page.path;
 let selected;
 if(page.division==='home'){
  if(page.type==='city')selected=cycle(Object.values(home),path);
  else if(/privacy|appearance|sample|decorative/.test(path))selected=home.patio;
  else if(/preparation|installation|double-pane|cost/.test(path))selected=home.exterior;
  else if(/living-room|fading|fade|glare/.test(path))selected=home.living;
  else selected=home.garden;
 }else{
  if(page.type==='city')selected=cycle(Object.values(commercial),path);
  else if(/storefront|security|landlord|survey|cost/.test(path))selected=commercial.storefront;
  else if(/privacy|frosted|decorative|conference/.test(path))selected=commercial.lounge;
  else if(/installation|scheduling/.test(path))selected=commercial.waiting;
  else selected=commercial.daylight;
 }
 return {...page,image:selected.src,imageAlt:selected.alt,imageKind:'photo',...(['city','project'].includes(page.type)?{imageCaption:'From our work'}:{})};
}
