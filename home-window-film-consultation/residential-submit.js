(() => {
  'use strict';
  const form = document.querySelector('#consultation');
  if (!form || !['mock', 'live'].includes(form.dataset.delivery)) return;
  const simulated = form.dataset.delivery === 'mock';
  const status = form.querySelector('#message');
  const details = form.querySelector('#needs');
  const contact = form.querySelector('#contact');
  const priorityStep = form.querySelector('#priority-step');
  const first = form.querySelector('#first');
  const phone = form.querySelector('#phone');
  const submit = contact.querySelector('[type=submit]');
  const storageKey = 'obsidian_residential_request_v1';
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem(storageKey)); } catch {}
  let request = saved && uuid.test(saved.id) ? saved : {id: crypto.randomUUID()};
  function persist() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(request)); } catch {}
  }
  persist();
  let busy = false;
  let fieldsStarted = false;
  function emit(event, extra = {}) {
    try {
      window.obsidianLeadTracking?.trackEvent(event, {
        service: 'residential', form_kind: 'residential', landing_variant:'residential-guided-v2', quote_id: request.id, ...extra
      });
    } catch {}
  }

  function showReceipt() {
    contact.hidden = contact.disabled = true;
    details.hidden = details.disabled = true;
    priorityStep.hidden = priorityStep.disabled = true;
    status.replaceChildren(document.createTextNode(simulated
      ? 'Local simulation complete. No consultation was sent. '
      : 'Consultation requested. We’ll call to discuss your windows. '));
    const again = document.createElement('button');
    again.type = 'button';
    again.className = 'edit';
    again.textContent = 'Start another request';
    again.addEventListener('click', () => {
      request = {id: crypto.randomUUID()};
      persist();
      fieldsStarted = false;
      form.reset();
      status.replaceChildren();
      contact.disabled = contact.hidden = true;
      details.disabled = details.hidden = false;
      window.ObsidianResidentialReset?.();
      details.querySelector('input').focus();
    });
    status.append(again);
  }
  first.minLength = 2;
  first.maxLength = 254;
  phone.maxLength = 30;
  const checkPhone = () => phone.setCustomValidity(
    /^1?\d{10}$/.test(phone.value.replace(/\D/g, '')) ? '' : 'Enter a ten-digit phone number with an area code.'
  );
  phone.addEventListener('input', checkPhone);
  first.addEventListener('input', () => first.setCustomValidity(first.value.trim().length < 2 ? 'Enter your first name.' : ''));
  form.addEventListener('invalid', e => emit('residential_validation_error', {
    field_name: ({first: 'name', phone: 'phone', zip: 'zip', need: 'need', priority: 'priority'})[e.target.name] || 'unknown'
  }), true);
  document.addEventListener('residential:step', event => {
    const step = event.detail?.step;
    if (!['goal', 'priority', 'contact'].includes(step)) return;
    const codedAnswers = {
      'Heat & glare':'heat_glare', 'Privacy':'privacy', 'Something else':'other',
      'Keep daylight':'daylight', 'Reduce screen glare':'screen_glare',
      'Keep the view':'keep_view', 'Privacy after dark':'after_dark',
      'Compare samples':'sample_comparison', 'Check my glass':'glass_check'
    };
    const selected = step === 'priority' ? form.elements.need?.value
      : step === 'contact' ? form.elements.priority?.value : '';
    emit('residential_quiz_step', {
      quiz_step:step, ...(codedAnswers[selected] ? {lead_action:codedAnswers[selected]} : {})
    });
  });
  let contactVisible = !contact.hidden;
  new MutationObserver(() => {
    const visible = !contact.hidden && !request.saved;
    if (visible && !contactVisible) emit('residential_form_view', {quiz_step:'contact'});
    contactVisible = visible;
  }).observe(contact, {attributes:true, attributeFilter:['hidden']});
  contact.addEventListener('input', () => {
    if (!fieldsStarted) { fieldsStarted = true; emit('residential_form_started', {quiz_step:'contact'}); }
  });
  form.querySelector('#edit').addEventListener('click', () => emit('residential_step_edit', {quiz_step:'project'}));
  document.querySelectorAll('a[href="#consultation"]').forEach(link => link.addEventListener('click', () => emit('residential_consultation_click', {quiz_step:'project'})));
  document.addEventListener('click', event => {
    if ((!busy && !request.saved) || !event.target.closest?.('a[data-select]')) return;
    event.preventDefault();
    event.stopPropagation();
    form.scrollIntoView({block:'start'});
  }, true);
  window.ObsidianResidentialPhoneEnabled = !simulated;
  window.ObsidianResidentialSubmit = async () => {
    if (busy || request.saved || contact.hidden) return;
    checkPhone();
    first.setCustomValidity(first.value.trim().length < 2 ? 'Enter your first name.' : '');
    if (!form.reportValidity()) return;
    const payload = {
      id: request.id, lead_kind:'residential', first:first.value.trim(), phone:phone.value.trim(),
      zip:form.elements.zip.value, need:form.elements.need.value,
      priority:form.elements.priority.value, quiz_version:'residential-guided-v2', contact:'call',
      attribution:window.ObsidianJourney?.get() || {}, page_path:location.pathname,
      website:form.elements.website.value
    };
    busy = true;
    contact.disabled = true;
    submit.disabled = true;
    status.textContent = simulated ? 'Checking the local simulation…' : 'Sending your request…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let http = 0;
    try {
      emit('residential_submit_attempt');
      const response = await fetch('/api/automotive-quotes', {
        method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin',
        signal:controller.signal, body:JSON.stringify(payload)
      });
      http = response.status;
      if (!response.ok) throw new Error('response');
      const confirmed = await response.json();
      if (confirmed.ok !== true || confirmed.id !== request.id) throw new Error('confirmation');
      request.saved = true;
      persist();
      emit('residential_submit_success');
      if (!simulated && typeof window.gtag === 'function') {
        window.gtag('event', 'conversion', {
          send_to: 'AW-17846304809/uZ_6CNyY8tQcEKmA5L1C',
          transaction_id: request.id
        });
      }
      first.value = phone.value = '';
      showReceipt();
    } catch {
      emit('residential_submit_error', {http_status:http});
      status.textContent = http === 429 ? 'Please wait a minute and try again.'
        : http === 409 ? 'These details differ from an earlier request. Please call us to confirm.'
        : 'We couldn’t confirm your request. Your details are still here. Please try again.';
    } finally {
      clearTimeout(timeout);
      busy = false;
      if (!request.saved) contact.disabled = false;
      submit.disabled = false;
    }
  };
  if (request.saved) showReceipt();
})();
