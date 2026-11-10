// These are planning implications, not claims of completed work or city-wide restrictions.
const planning={
 'irvine':{
 auto:'For a vehicle at an Irvine Business Complex workplace, confirm which parking area the property allows us to use and how long the car can remain there. A home appointment should be described separately from an office address, even when both are in the same mixed-use development.',
 home:'In an Irvine Business Complex residence, separate your own windows from glazing controlled by the building. Photograph the view from inside and outside so a sample can be judged against nearby panes and the appearance of the elevation.',
 commercial:'An Irvine Business Complex address can be an office, industrial unit or mixed-use property. Identify the occupied unit, exterior or interior glass, and the person who can approve access; the street address alone does not describe the installation scope.',
 coating:'If your car is usually parked at an Irvine Business Complex workplace, consider whether that spot is also suitable for preparation and coating work. Send a photograph of the proposed sheltered area and your availability so the work plan is based on the space, not simply the office postcode.'},
 'newport-beach':{
 auto:'Give us the actual installation address rather than just the village name. A car in Balboa, Lido Marina Village or Corona del Mar may be at a home, shared property or business; show the proposed parking spot so we can discuss the work area before confirming the visit.',
 home:'When keeping a view is central to a Newport Beach home project, include a photograph from the seat where you enjoy it. Compare the sample there and from outside the window; village and building names do not tell us the existing glass specification.',
 commercial:'For a storefront or office in one of Newport Beach’s villages, label the customer entrance and each group of glass in the photos. Tell us which panes need solar control and which need clear sightlines, so the quote follows the way the business uses the frontage.',
 coating:'A Newport Beach vehicle’s daily parking place may differ from the best place to prepare its paint. Send the specific address and a wide view of the proposed work area, then describe the finish you want and where the car can remain while the agreed work is completed.'},
 'tustin':{
 auto:'An Old Town Tustin address and a Tustin Legacy address give us different location references, but neither guarantees a suitable work space. Include the exact entrance and a photo of where the vehicle will be parked; we can assess the actual spot instead of assuming street access.',
 home:'For an Old Town home, identify any known replacement panes or glazing differences before comparing film. For a Tustin Legacy property, send any owner or building requirements you already have. The recommendation follows the individual windows rather than the age of the neighborhood.',
 commercial:'Separate an Old Town storefront brief from a Tustin Legacy office or mixed-use unit brief. For the former, photograph the full frontage and its appearance; for the latter, identify the unit, shared access and approval contact. Do not assume a historic address automatically requires or exempts a particular approval.',
 coating:'Tell us whether the Tustin appointment is at a residence or a business, and send the exact proposed coating area. If the vehicle normally parks near Old Town or at a shared Legacy property, arrange the owner’s permission before treating that parking space as an installation location.'},
 'costa-mesa':{
 auto:'If you want tint installed while you are at a Costa Mesa shop or workplace, confirm that the parking location is available for the work. Visiting South Coast Plaza or SoBECA does not itself provide installation permission; send the actual work address and space photo.',
 home:'For a Costa Mesa home near a busy commercial area, describe the sightline you want to change rather than assuming one privacy film fits all windows. Include daytime and evening views of the particular room, along with the glass information available to you.',
 commercial:'A customer-facing SoBECA storefront and an office near the arts district can have very different glass needs. Identify display windows, entrance doors and staff areas separately, then describe whether the priority is preserving a view in, softening glare or screening an interior area.',
 coating:'A shopping or dining stop in Costa Mesa is not a substitute for a confirmed coating location. Choose the work address first, then share photos of the covered area and the vehicle’s paint condition so preparation and timing can be reviewed together.'},
 'laguna-beach':{
 auto:'Laguna Beach includes canyon, hillside and downtown addresses. If your proposed work area is sloped, exposed or reached through a constrained driveway, include that in the photographs. We can discuss an appropriate location instead of treating every parking spot as interchangeable.',
 home:'For a hillside or canyon-facing Laguna Beach home, photograph each affected elevation rather than sending only one window close-up. Include high panes and the route to reach them. The sample decision should account for the actual view, room and glass, not a generic coastal tint recommendation.',
 commercial:'For a Laguna Beach business, distinguish a downtown frontage from a hillside or canyon property in the brief. Show the entrance and the height of the affected glass, and identify the display or occupied areas where the film will change the view. Access is reviewed for the specific site.'},
 'aliso-viejo':{
 auto:'Aliso Viejo combines homes, offices and retail in its planned layout. Tell us which of those settings applies to your appointment and who controls the parking spot. A photo showing the vehicle and available clearance is more useful than a neighborhood name alone.',
 home:'For an Aliso Viejo residence, separate the room-by-room film decision from any exterior-appearance requirements supplied by the property owner or association. Bring those documents if they apply; we do not assume that every neighborhood has the same rules.',
 commercial:'For a Town Center, Commons or other Aliso Viejo business address, identify which glass belongs to your unit and which is shared. Include opening hours and the person responsible for property coordination so a film review can distinguish customer-facing frontage from office privacy.',
 coating:'A garage or other proposed Aliso Viejo work area should be photographed with the car in place. In a shared development, confirm permission to use the space before the appointment. The coating discussion can then focus on paint preparation and the agreed finish.'},
 'santa-ana':{
 auto:'For a downtown or live-work Santa Ana address, name the actual parking entrance as well as the street address. If the vehicle will be in a shared lot, establish permission and an available work space before confirming the appointment; do not assume curbside access is sufficient.',
 home:'Santa Ana’s downtown area includes residential and live-work buildings. Tell us whether the glass belongs to a private residence or a managed building, and photograph the view from the room where privacy or glare matters. Individual glazing details come before product selection.',
 commercial:'Downtown Santa Ana mixes shopping, offices and live-work uses. A useful brief labels public storefront panes separately from upstairs work space or interior partitions. Explain whether customers should still be able to see the display and who can approve the window appearance.'},
 'anaheim':{
 auto:'For an Anaheim appointment in or near the Platinum Triangle, send the building or lot entrance rather than relying on the district name. If a vehicle is parked at work or in a shared development, confirm the available space and access contact before selecting a time.',
 home:'For an Anaheim residence in a mixed-use setting such as the Platinum Triangle, identify which windows face the area where glare or visibility concerns occur. Include the inside viewpoint and any building-provided glass information; being in the same district does not mean two homes use the same glazing.',
 commercial:'The Platinum Triangle includes offices, restaurants and residences. Describe your business’s glass by function: public frontage, occupied work area, or internal privacy. Include delivery access and operating hours relevant to your own unit so the installation plan is not based only on a map location.'},
 'huntington-beach':{
 auto:'Near downtown Huntington Beach, distinguish the vehicle’s regular parking location from the confirmed installation space. If you propose a shared or public-facing lot, arrange permission and send a wide photograph. We assess shelter and clearance at the actual spot rather than assuming a beachside location works.',
 home:'A Huntington Beach home’s view and privacy needs should be assessed from the room itself. Send photographs toward the ocean, street or neighboring property only where those sightlines affect your decision, then compare film samples without assuming that all coastal glass needs the same treatment.',
 commercial:'For a Main Street, Waterfront or Pacific City area business, identify the pedestrian-facing glass and the occupied areas behind it. Customer visibility, display clarity and glare can point toward different options, so describe those priorities separately and provide the building approval contact.'},
 'orange':{
 auto:'For an appointment near Old Towne Orange, provide a specific vehicle location and confirm access to it. A convenient meeting point near Plaza Park or the station is not automatically a suitable installation area. Show the space where you actually want the work performed.',
 home:'Orange includes recognized historic districts, including Old Towne and Eichler neighborhoods. If your property has applicable appearance requirements or distinctive existing glazing, share that information before choosing a sample. Film selection does not by itself establish what approvals your property needs.',
 commercial:'For an Old Towne Orange storefront, photograph the full elevation as well as each pane. Include any property-provided requirements that govern exterior appearance. For interior office partitions, define the privacy height and sightlines separately from the historic frontage discussion.'},
 'mission-viejo':{
 auto:'Use the actual Mission Viejo work address, even when a lake or Oso Creek landmark is the easiest way to describe the area. Photograph the car in its proposed spot and identify any entry arrangements so the appointment is planned around a usable work location.',
 home:'If a Mission Viejo window frames a lake, landscape or outdoor view you want to preserve, include that view in the sample review. Compare the film from inside at the relevant time of day; the landscape itself does not tell us how the window is constructed.',
 commercial:'For a Mission Viejo retail-center unit, identify the center and the suite, then label entrance doors, display panes and staff areas. The center name helps with location, while the glass inventory and property contact establish the actual scope.',
 coating:'For a Mission Viejo coating appointment, send a wide view of the proposed work area and close-ups of the paint concerns. Include entry arrangements and the time the vehicle can remain available. A familiar local landmark helps locate you but does not replace checking the space.'},
 'lake-forest':{
 auto:'Include Foothill Ranch or Portola Hills in your location details when relevant, along with the exact Lake Forest address. State whether the vehicle is at a home or business park and provide the correct entrance so the work-area discussion begins with the right property.',
 home:'For a Lake Forest home in Foothill Ranch, Portola Hills or another neighborhood, send photos by room and elevation. Include high or difficult-to-reach panes in the inventory. The neighborhood name is useful for location, but recommendations follow the individual glass and access.',
 commercial:'Foothill Ranch combines business-park, commercial and residential uses. Identify the specific building and suite, distinguish exterior glass from internal partitions, and name the person who coordinates access. A shared address can contain more than one kind of film project.',
 coating:'A Foothill Ranch business-park appointment and a home appointment elsewhere in Lake Forest need their own work-area review. Send the specific location, permission contact if shared, and photographs of the space and paint before asking us to confirm preparation time.'},
 'dana-point':{
 auto:'Let us know whether your Dana Point appointment is at a home, business or other property, and provide the actual entrance. A harbor or Lantern District reference helps locate the address but does not confirm parking permission or suitable installation conditions.',
 home:'For a Dana Point room with a harbor or ocean-facing view, show the view you want to keep alongside the panes you want treated. Compare samples from the room and outside; we review the glass itself before recommending a product for a coastal address.',
 commercial:'Dana Point’s Town Center and harbor are distinct settings. For your business, identify public-facing doors, display glazing and staff areas rather than grouping all glass into one line item. Describe how views and privacy should work during your own operating hours.'},
 'san-clemente':{
 auto:'At a San Clemente address near the Downtown Core, North Beach or Pier Bowl, identify a confirmed private or permitted work location for the car. Include the entrance and a photo of the available space so the visit does not depend on finding a spot after arrival.',
 home:'San Clemente identifies architectural overlay areas in parts of the city. If your home has applicable appearance requirements, provide them alongside glass details and samples. A film review can address the proposed appearance, but it is not a determination of city or property approvals.',
 commercial:'For a San Clemente frontage in the Downtown Core, Pier Bowl or North Beach area, include a full-elevation photograph and any appearance requirements provided for your property. Distinguish exterior-facing film from internal privacy work so the review addresses the correct glass.'},
 'laguna-hills':{
 auto:'For a Laguna Hills appointment near the Urban Village area, confirm the exact property and parking access rather than using the former mall site as a general meeting point. Show the actual spot where the vehicle can remain for the work.',
 home:'The Laguna Hills Urban Village area includes residential uses alongside offices, medical facilities and retail. Identify the particular building and affected rooms, with any known glass details, so the recommendation follows your home rather than assumptions about neighboring properties.',
 commercial:'Laguna Hills’ Urban Village area includes medical, office and retail uses. A waiting-room privacy project should be scoped differently from display glazing or an office glare problem. Label those areas individually and identify the person responsible for access and approval.',
 coating:'For a Laguna Hills coating project, establish a specific sheltered work area before confirming a schedule. If the car is normally parked at an office or medical property near the Urban Village area, discuss an approved space rather than assuming the daily parking spot can host the work.'},
 'fountain-valley':{
 auto:'If you use Mile Square Park as the location reference, also provide the actual Fountain Valley installation address. The car needs a confirmed work area with appropriate access; the landmark helps locate the neighborhood but is not the proposed installation site.',
 commercial:'For a Fountain Valley commercial property, identify the building and suite rather than relying on a nearby park or major-road reference. Label the affected glass and operating areas so access, privacy and appearance can be reviewed for the property itself.'},
 'westminster':{
 auto:'For an appointment around Little Saigon, distinguish your confirmed work space from customer parking at a shopping destination. Send the exact entrance and permission contact if applicable, together with a photograph of where the car can stay during installation.',
 commercial:'Little Saigon’s Bolsa Avenue area includes customer-facing commercial properties. Show display glass and entrance doors separately, describe whether merchandise should remain visible from the walkway, and provide the unit’s access contact before deciding on a privacy or solar-control approach.'},
 'garden-grove':{
 auto:'Historic Main Street, OC Koreatown and Little Saigon are helpful Garden Grove location references, but we still need the specific installation address. For a workplace or shared lot, confirm who authorizes use of the spot and show the available clearance around the vehicle.',
 commercial:'A Historic Main Street frontage and a unit elsewhere in Garden Grove should each have a glass-by-glass brief. Include the full storefront view, interior sightlines and the property contact. Describe the business’s privacy and display needs without assuming a district name determines the film.'}
};
export function attachCityContext(pages,contexts) {
 const slug=city=>city.toLowerCase().replaceAll(' ','-');
 const contextFor=page=>contexts.find(c=>page.path.includes(c.slug));
 const kind=page=>page.path.startsWith('/ceramic-coating-')?'coating':page.division;
 for(const page of pages.filter(p=>p.type==='city')){
  const context=contextFor(page);if(!context)throw new Error('Missing city context for '+page.path);
  const local=planning[context.slug]?.[kind(page)];if(local===undefined)throw new Error('Missing planning for '+page.path);
  const otherServices=pages.filter(p=>p.type==='city'&&p.path!==page.path&&contextFor(p)?.slug===context.slug).map(p=>({title:p.title,path:p.path}));
  const nearby=pages.filter(p=>p.type==='city'&&p.path!==page.path&&kind(p)===kind(page)&&context.nearbyCities.map(slug).includes(contextFor(p)?.slug)).slice(0,3).map(p=>({title:p.title,path:p.path}));
  page.cityContext={city:context.city,facts:context.localFacts,planning:context.slug==='fountain-valley'||context.slug==='mission-viejo'&&['auto','coating'].includes(kind(page))?'':local,otherServices,nearby};
 }
 return pages;
}
