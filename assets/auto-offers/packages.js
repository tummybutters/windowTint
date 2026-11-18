// Shared by the public quote builder and server-side normalization.
(function (root) {
  const packages = {
    'front-match': {name:'Factory Special', coverage:'Front two windows', prices:[200,200,220], benefit:'50% off a sun strip', description:'Match your two front windows to the factory privacy glass in back. Add a sun strip for $30.', image:'/assets/site/mercedes-amg-gt.webp'},
    'front-cabin': {name:'Front Cabin', coverage:'Windshield / other', prices:[420,420,470], benefit:'Free sun strip', description:'Two front windows and your windshield in ceramic film, with a sun strip included.', image:'/assets/site/auto.webp'},
    driveway: {name:'Driveway Package', coverage:'Sides + rear', prices:[500,600,700], benefit:'Choose your free upgrade', description:'Ceramic film on the side and rear windows. Choose a free sun strip or eligible small sunroof tint.', image:'/assets/site/porsche-driveway.webp'},
    complete: {name:'Complete Cabin Comfort', coverage:'Full car', prices:[820,820,950], benefit:'Free sun strip', description:'Tint the sides, rear and windshield in one visit. Choose a free sun strip or eligible small sunroof tint.', image:'/assets/site/mercedes-amg-gt.webp'}
  };
  const bodies = ['Coupe','Sedan','SUV / truck / crossover','Specialty / not sure'];
  function choices(slug,vehicle) {
    if (slug==='front-match') return ['Two fronts only','Add a sun strip (+$30)'];
    if (slug==='front-cabin'||/tesla|cybertruck|\bmodel\s*[3ysx]\b/i.test(vehicle)) return ['Free sun strip'];
    return ['Free sun strip','Free small single-panel sunroof tint','Free small dual-panel sunroof tint','Custom roof quote'];
  }
  function selection(slug,body,vehicle,upgrade,clear) {
    if (!Object.hasOwn(packages,slug)||!bodies.includes(body)||typeof vehicle!=='string'||typeof clear!=='boolean') throw Error('invalid_offer');
    const p=packages[slug];
    if (!choices(slug,vehicle).includes(upgrade)||clear&&!['front-cabin','complete'].includes(slug)) throw Error('invalid_offer');
    const custom=body===bodies[3]||/tesla|cybertruck|\bmodel\s*[3ysx]\b|ferrari|lamborghini|mclaren|audi\s*r8/i.test(vehicle)||upgrade==='Custom roof quote';
    const price=custom?null:p.prices[bodies.indexOf(body)]+(clear?50:0)+(upgrade==='Add a sun strip (+$30)'?30:0);
    return {offer_id:slug,package:p.name,body,upgrade,windshield:['front-cabin','complete'].includes(slug)?(clear?'Clear 3M ceramic windshield':'Standard ceramic windshield'):undefined,quoted_menu_price:price};
  }
  const catalog={packages,bodies,choices,selection};
  if(typeof module==='object'&&module.exports)module.exports=catalog;
  else root.AutoPackages=catalog;
})(typeof window==='object'?window:this);
