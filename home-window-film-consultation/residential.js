const form = document.querySelector('#consultation');
const needs = document.querySelector('#needs');
const priorityStep = document.querySelector('#priority-step');
const contact = document.querySelector('#contact');
const message = document.querySelector('#message');
const phone = document.querySelector('#phone');
const goal = () => form.elements.need.value;
const assetBase = new URL('./assets/', document.currentScript.src);
const fields = [needs, priorityStep, contact];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let transitionPending = false;
const steps = ['goal', 'priority', 'contact'];
const choices = {
  'Heat & glare': {
    title: 'What matters most in this room?',
    prompt: 'Think about where you sit when the sun is strongest.',
    options: [
      ['Keep daylight', 'Cool down a bright room', 'garden-picture-window.webp', 'Lighter solar-control films', 'Compare a lighter solar film with the untreated glass. Look at the outdoor view and ask how much incoming solar heat each option reduces.'],
      ['Reduce screen glare', 'Make a screen easier to see', 'garden-room.webp', 'Glare-control films', 'Compare two light levels from your desk or sofa when glare is strongest. The stronger glare-control option will usually let less daylight through.']
    ]
  },
  'Privacy': {
    title: 'When do you need privacy?',
    prompt: 'The right sample depends on the light on each side of the glass.',
    options: [
      ['Keep the view', 'Daytime privacy with an outdoor view', 'covered-porch.webp', 'Daytime privacy films', 'Compare reflective samples from inside and outside. They offer the most privacy while the outdoors is brighter than the room.'],
      ['Privacy after dark', 'Screen a view into a lit room', 'pool-room.webp', 'Frosted and obscuring finishes', 'Compare frosted samples for coverage after dark. Frosting obscures the view both ways. If you want a clear daytime view, discuss film paired with nighttime shades.']
    ]
  },
  'Something else': {
    title: 'What would help you decide?',
    prompt: 'We can compare appearances or start by looking at the window itself.',
    options: [
      ['Compare samples', 'See different finishes in the room', 'pool-courtyard.webp', 'A range of film samples', 'Look through lighter and darker samples from your usual seat. Compare clarity, reflectivity and how much daylight reaches the room.'],
      ['Check my glass', 'Ask about a pane or coating', 'upstairs-window.webp', 'Options for your glass type', 'We’ll check the panes and coatings, then review manufacturer compatibility before proposing suitable film samples.']
    ]
  }
};
const intents = {
  heat: ['Keep the view.', 'Ease the heat.', 'Heat & glare'],
  glare: ['Less glare.', 'More room to work.', 'Heat & glare', 'Compare film samples from your desk or sofa. Find a balance between a comfortable screen and the daylight you want to keep.'],
  privacy: ['Open the blinds.', 'Keep your privacy.', 'Privacy', 'Compare daytime reflective film with frosted options for street-facing windows. See the finish and the view from both sides of your own glass.']
};
// The existing cost keyword arrives at this fragment. Present the pricing entry
// in the same document so click IDs, landing attribution and history stay intact.
const priceEntry = document.getElementById('pricing-entry');
if (priceEntry && location.hash === '#pricing') {
  document.querySelector('.hero').replaceWith(priceEntry.content.cloneNode(true));
  document.querySelector('.faq #pricing').removeAttribute('id');
  document.querySelector('header').id = 'pricing';
  document.title = 'Home Window Film Pricing | Obsidian Film Solutions';
  window.scrollTo({top: 0, behavior: 'instant'});
}
const topic = document.querySelector('.hero').dataset.topic;
const intentName = new URLSearchParams(location.search).get('intent');
const intent = topic === 'installation' && Object.hasOwn(intents, intentName) ? intents[intentName] : undefined;
const entryGoal = ({privacy: 'Privacy', solar: 'Heat & glare'})[topic] || intent?.[2];
const selectGoal = value => {
  const radio = Array.from(form.elements.need).find(option => option.value === value);
  if (radio) radio.checked = true;
};
if (intent) {
  document.querySelector('#headline').replaceChildren(intent[0], document.createElement('br'), Object.assign(document.createElement('em'), { textContent: intent[1] }));
  if (intent[3]) document.querySelector('#hero-description').textContent = intent[3];
}
function showStep(index, focus = true) {
  const changed = fields[index].hidden;
  fields.forEach((field, i) => { field.disabled = field.hidden = i !== index; });
  document.querySelector('#step-count').textContent = 'Step ' + (index + 1) + ' of 3';
  document.querySelectorAll('.progress i').forEach((bar, i) => bar.classList.toggle('filled', i <= index));
  message.textContent = '';
  if (focus) {
    const heading = fields[index].querySelector('legend');
    heading.focus({preventScroll:true});
    const bounds = heading.getBoundingClientRect();
    if (bounds.top < 8 || bounds.bottom > window.innerHeight * 0.62) {
      form.scrollIntoView({behavior:reducedMotion.matches ? 'instant' : 'smooth',block:'start'});
    }
  }
  if (changed) {
    if (!reducedMotion.matches && focus) fields[index].animate(
      [{opacity:0, transform:'translateY(6px)'}, {opacity:1, transform:'translateY(0)'}],
      {duration:190, easing:'ease-out'}
    );
    form.dispatchEvent(new CustomEvent('residential:step',{bubbles:true,detail:{step:steps[index]}}));
  }
}
let renderedGoal;
function showPriorities() {
  if (!form.reportValidity()) return;
  const current = goal();
  if (current !== renderedGoal) {
    const group = choices[current];
    document.querySelector('#priority-title').textContent = group.title;
    document.querySelector('#priority-prompt').textContent = group.prompt;
    const container = document.querySelector('#priority-options');
    container.replaceChildren();
    for (const [value, description, file] of group.options) {
      const label = needs.querySelector('.photo-choice').cloneNode(true);
      const radio = label.querySelector('input');
      radio.name = 'priority';
      radio.value = value;
      radio.removeAttribute('checked');
      radio.checked = false;
      label.querySelector('img').src = new URL(file, assetBase);
      label.querySelector('strong').textContent = value;
      label.querySelector('small').textContent = description;
      container.append(label);
    }
    renderedGoal = current;
  }
  showStep(1);
}
function showResult() {
  if (!form.reportValidity()) return;
  const priority = form.elements.priority.value;
  const answer = choices[goal()].options.find(option => option[0] === priority);
  document.querySelector('#result-photo').src = new URL(answer[2], assetBase);
  document.querySelector('#result-title').textContent = answer[3];
  document.querySelector('#result-description').textContent = answer[4];
  document.querySelector('#summary').textContent = [goal(), priority].join(' · ');
  showStep(2);
}
// Arrow keys explore the group. Space, Enter, and pointer taps confirm a choice.
function handleChoiceKey(event) {
  const radio = event.target;
  if (radio.type !== 'radio') return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (!event.repeat) radio.click();
    return;
  }
  const offsets = {ArrowLeft:-1, ArrowUp:-1, ArrowRight:1, ArrowDown:1};
  if (!(event.key in offsets)) return;
  event.preventDefault();
  const group = Array.from(form.elements[radio.name]);
  const next = group[(group.indexOf(radio) + offsets[event.key] + group.length) % group.length];
  next.checked = true;
  next.focus();
}
form.addEventListener('keydown', handleChoiceKey);
form.addEventListener('click', async event => {
  const radio = event.target;
  if (radio.type !== 'radio' || !radio.checked) return;
  if (transitionPending || event.detail > 1) { event.preventDefault(); return; }
  transitionPending = true;
  const field = radio.closest('fieldset');
  try {
    // Briefly retain the selection so a homeowner sees which card was chosen.
    if (!reducedMotion.matches) {
      await new Promise(resolve => setTimeout(resolve, 90));
      await field.animate([{opacity:1}, {opacity:.35}], {duration:85}).finished.catch(() => {});
    }
    if (!field.hidden && !field.disabled) {
      if (field === needs) showPriorities();
      else if (field === priorityStep) showResult();
    }
  } finally {
    transitionPending = false;
  }
});
// A consultation started from a specific service already has its first answer.
if (entryGoal) {
  document.querySelectorAll('a[href="#consultation"]:not([data-select])').forEach(link => {
    link.addEventListener('click', () => {
      if (!needs.hidden) {
        if (!goal()) selectGoal(entryGoal);
        showPriorities();
      }
    });
  });
}
document.querySelector('#go-back').addEventListener('click', () => showStep(0));
document.querySelector('#edit').addEventListener('click', () => showStep(0));
document.querySelectorAll('[data-select]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  selectGoal(link.dataset.select);
  showStep(0,false);
  showPriorities();
  history.replaceState(null,'','#consultation');
}));
window.ObsidianResidentialReset = () => {
  renderedGoal = undefined;
  document.querySelector('#priority-options').replaceChildren();
  if (entryGoal) selectGoal(entryGoal);
  showStep(0);
};
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!needs.hidden) return showPriorities();
  if (!priorityStep.hidden) return showResult();
  phone.setCustomValidity(phone.value.replace(/\D/g, '').length < 10 ? 'Enter a phone number with an area code.' : '');
  if (!form.reportValidity()) return;
  if (window.ObsidianResidentialSubmit) return window.ObsidianResidentialSubmit();
  message.textContent = 'The online request could not be sent. Please use the call button or try again.';
});
phone.addEventListener('input', () => phone.setCustomValidity(''));
function openPricingAnswer() {
  if (location.hash === '#pricing') document.querySelector('details#pricing')?.setAttribute('open', '');
}
openPricingAnswer();
window.addEventListener('hashchange', openPricingAnswer);
