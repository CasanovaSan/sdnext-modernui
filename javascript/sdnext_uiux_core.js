// Original credits: <https://github.com/anapnoe/stable-diffusion-webui-ux/blob/8307896c59032a9cdac1ab24c975102ff9a674d3/extensions-builtin/anapnoe-sd-uiux/javascript/anapnoe_sd_uiux_core.js>

const template_path = './file=extensions/sdnext-ui-ux/html/templates/';
const template_root = 'template-app-root.html';
const uiux_app_id = '#sdnext_app';
const uiux_tab_id = '#tab_sdnext_uiux_core';

let split_instances = [];
let portalTotal = 0;
let appUiUx;
let isBackendDiffusers;

//= ====================== READY STATES =======================
function functionWaitForFlag(checkFlag) {
  return async function () {
    return new Promise((resolve) => {
      const check = () => checkFlag() ? resolve() : setTimeout(check);
      check();
    });
  }
}

let uiFlagInitialized = false;
let uiFlagPortalInitialized = false;

waitForUiReady = functionWaitForFlag(() => uiFlagInitialized);
waitForUiPortal = functionWaitForFlag(() => uiFlagPortalInitialized);

//= ====================== UTILS =======================
function functionLogTime(func) {
  return async function() {
    const t0 = performance.now();
    const returnValue = func(...arguments);
    const t1 = performance.now();
    log(`UI ${func.name}`, Math.round(t1 - t0) / 1000);
    return returnValue;
  }
}

function logPrettyPrint() {
  let output = '';
  let arg;
  let i;
  output += `<div class="log-row"><span class="log-date">${new Date().toISOString().replace('T', ' ').replace('Z', '')}</span>`;

  for (i = 0; i < arguments.length; i++) {
    arg = arguments[i];
    if (arg === undefined) arg = 'undefined';
    if (arg === null) arg = 'null';
    const argstr = arg.toString().toLowerCase();
    let acolor = '';
    if (argstr.indexOf('error') !== -1) {
      acolor += ' log-remove';
    } else if (argstr.indexOf('loading') !== -1
      || argstr.indexOf('load') !== -1
      || argstr.indexOf('init') !== -1
      || argstr.indexOf('submit') !== -1
      || argstr.indexOf('success') !== -1) {
      acolor += ' log-load';
    } else if (argstr.indexOf('[') !== -1) {
      acolor += ' log-object';
    }
    if (arg.toString().indexOf('.css') !== -1 || arg.toString().indexOf('.html') !== -1) acolor += ' log-url';
    else if (arg.toString().indexOf('\n') !== -1) output += '<br />';
    output += `<span class="log-${(typeof arg)} ${acolor}">`;
    if (typeof arg === 'object') output += JSON.stringify(arg);
    else output += arg;
    output += ' </span>';
  }
  output += '</div>';
  return output;
}

async function getContributors(repoName, page = 1) {
  const request = await fetch(`https://api.github.com/repos/${repoName}/contributors?per_page=100&page=${page}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const contributorsList = await request.json();
  return contributorsList;
}

async function getAllContributors(repoName, page = 1, allContributors = []) {
  const list = await getContributors(repoName, page);
  allContributors = allContributors.concat(list);
  if (list.length === 100) return getAllContributors(repoName, page + 1, allContributors);
  return allContributors;
}

async function getContributorsMultiple(repoNames) {
  const results = await Promise.all(repoNames.map((repoName) => getAllContributors(repoName)));
  const mergedMap = new Map();
  for (const contributors of results) {
    for (const { login, contributions, ...otherAttributes } of contributors) {
      if (!mergedMap.has(login)) mergedMap.set(login, { login, contributions, ...otherAttributes });
      else mergedMap.get(login).contributions += contributions;
    }
  }
  const mergedArray = Array.from(mergedMap.values());
  mergedArray.sort((a, b) => b.contributions - a.contributions);
  return mergedArray;
}

async function showContributors() {
  const contributors_btn = document.querySelector('#contributors');
  const contributors_view = document.querySelector('#contributors_tabitem');
  const temp = document.createElement('div');
  temp.id = 'contributors_grid';
  temp.innerHTML = '<p>Kindly allow us a moment to retrieve the contributors. We\'re grateful for the many individuals who have generously put their time and effort to make this possible.</p>';
  temp.style.display = 'flex';
  temp.style.flexDirection = 'column';
  temp.style.justifyContent = 'center';
  temp.style.alignItems = 'center';
  temp.style.height = '100%';
  temp.style.whiteSpace = 'normal';
  contributors_view.append(temp);

  contributors_btn.addEventListener('click', (e) => {
    if (!contributors_btn.getAttribute('data-visited')) {
      contributors_btn.setAttribute('data-visited', 'true');
      const promise = getContributorsMultiple(['vladmandic/automatic', 'BinaryQuantumSoul/sdnext-ui-ux']);
      promise.then((result) => {
        temp.innerHTML = '';
        temp.style = '';
        for (let i = 0; i < result.length; i++) {
          const login = result[i].login;
          const html_url = result[i].html_url;
          const avatar_url = result[i].avatar_url;
          temp.innerHTML += `
            <a href="${html_url}" target="_blank" rel="noopener noreferrer nofollow" class="contributor-button flexbox col">
              <figure><img src="${avatar_url}" lazy="true"></figure>
              <div class="contributor-name">${login}</div>
            </a>`;
        }
      });
    }
  });
}

//= ====================== MOBILE =======================
function applyDefaultLayout(isMobile) {
  appUiUx.querySelectorAll('[mobile]').forEach((tabItem) => {
    if (isMobile) {
      if (tabItem.childElementCount === 0) {
        const mobile_target = appUiUx.querySelector(tabItem.getAttribute('mobile'));
        if (mobile_target) {
          const target_parent_id = mobile_target.parentElement.id;
          if (target_parent_id) tabItem.setAttribute('mobile-restore', `#${target_parent_id}`);
          else log('UI missing id for parent', mobile_target.id);
          tabItem.append(mobile_target);
        }
      }
    } else if (tabItem.childElementCount > 0) {
      const mobile_restore_target = appUiUx.querySelector(tabItem.getAttribute('mobile-restore'));
      if (mobile_restore_target) {
        tabItem.removeAttribute('mobile-restore');
        mobile_restore_target.append(tabItem.firstElementChild);
      }
    }
  });

  if (isMobile) {
    appUiUx.querySelector('.accordion-vertical.expand #mask-icon-acc-arrow')?.click();
    if (!appUiUx.querySelector('.accordion-vertical.expand #mask-icon-acc-arrow-control')) {
      appUiUx.querySelector('.accordion-vertical #mask-icon-acc-arrow-control').click();
    }
    appUiUx.classList.add('media-mobile');
    appUiUx.classList.remove('media-desktop');
  } else {
    appUiUx.classList.add('media-desktop');
    appUiUx.classList.remove('media-mobile');
  }
}

function switchMobile() {
  function detectMobile() {
    return (window.innerWidth <= 768);
  }

  const optslayout = window.opts.uiux_default_layout;
  if (optslayout === 'Auto') {
    window.addEventListener('resize', () => applyDefaultLayout(detectMobile()));
    applyDefaultLayout(detectMobile());
  } else if (optslayout === 'Mobile') {
    applyDefaultLayout(true);
  } else if (optslayout === 'Desktop') {
    applyDefaultLayout(false);
  }
}

//= ====================== UIUX READY =======================
async function extraTweaks() {
  // System tab click second tab
  document.querySelectorAll('#system .tab-nav button')[1].click();

  // Control tab flex row
  async function adjustFlexDirection(flexContainer) {
    const childCount = flexContainer.childElementCount;
    const firstChildMinWidth = parseFloat(getComputedStyle(flexContainer.firstElementChild).minWidth);
    const gapWidth = parseFloat(getComputedStyle(flexContainer).gap);
    const minWidth = childCount * firstChildMinWidth + (childCount - 1) * gapWidth;
    const currentDirection = getComputedStyle(flexContainer).flexDirection;
    const currentWidth = flexContainer.clientWidth;
    if (currentWidth < minWidth && !flexContainer.classList.contains('flex-force-column')) flexContainer.classList.add('flex-force-column');
    else if (currentWidth >= minWidth && flexContainer.classList.contains('flex-force-column')) flexContainer.classList.remove('flex-force-column');
  }

  const controlColumns = document.getElementById('control-columns');
  adjustFlexDirection(controlColumns);
  new ResizeObserver(() => adjustFlexDirection(controlColumns)).observe(controlColumns);
}
extraTweaks = functionLogTime(extraTweaks);

async function uiuxOptionSettings() {
  // settings max output resolution
  function sdMaxOutputResolution(value) {
    gradioApp().querySelectorAll('[id$="2img_width"] input,[id$="2img_height"] input').forEach((elem) => { elem.max = value; });
  }
  gradioApp().querySelector('#setting_uiux_max_resolution_output').addEventListener('input', (e) => {
    let intvalue = parseInt(e.target.value);
    intvalue = Math.min(Math.max(intvalue, 512), 16384);
    sdMaxOutputResolution(intvalue);
  });
  sdMaxOutputResolution(window.opts.uiux_max_resolution_output);

  // settings input ranges
  function uiux_show_input_range_ticks(value, interactive) {
    if (value) {
      gradioApp().querySelectorAll("input[type='range']").forEach((elem) => {
        const spacing = (elem.step / (elem.max - elem.min)) * 100.0;
        const tsp = `max(3px, calc(${spacing}% - 1px))`;
        const fsp = `max(4px, calc(${spacing}% + 0px))`;
        const overlay = `repeating-linear-gradient(90deg, transparent, transparent ${tsp}, var(--sd-input-border-color) ${tsp}, var(--sd-input-border-color) ${fsp})`;
        elem.style.setProperty('--sd-slider-bg-overlay', overlay);
      });
    } else if (interactive) {
      gradioApp().querySelectorAll("input[type='range']").forEach((elem) => { elem.style.setProperty('--sd-slider-bg-overlay', 'transparent'); });
    }
  }
  gradioApp().querySelector('#setting_uiux_show_input_range_ticks input').addEventListener('click', (e) => {
    uiux_show_input_range_ticks(e.target.checked, true);
  });
  uiux_show_input_range_ticks(window.opts.uiux_show_input_range_ticks);

  // settings looks
  function setupUiUxSetting(settingId, className) {
    function updateUiUxClass(cn, value) {
      if (value) appUiUx.classList.add(cn);
      else appUiUx.classList.remove(cn);
    }
    gradioApp().querySelector(`#setting_${settingId} input`).addEventListener('click', (e) => updateUiUxClass(className, e.target.checked));
    updateUiUxClass(className, window.opts[settingId]);
  }

  setupUiUxSetting('uiux_no_slider_layout', 'option-no-slider-layout');
  setupUiUxSetting('uiux_show_labels_aside', 'option-aside-labels');
  setupUiUxSetting('uiux_show_labels_main', 'option-main-labels');
  setupUiUxSetting('uiux_show_labels_tabs', 'option-tab-labels');
  setupUiUxSetting('uiux_show_labels_control', 'option-control-labels');
  setupUiUxSetting('uiux_no_headers_params', 'option-hide-headers-params');
  setupUiUxSetting('uiux_show_outline_params', 'option-show-outline-params');

  // settings mobile scale
  function uiux_mobile_scale(value) {
    const viewport = document.head.querySelector('meta[name="viewport"]');
    viewport.setAttribute('content', `width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=${value}`);
  }
  gradioApp().querySelector('#setting_uiux_mobile_scale input[type=number]').addEventListener('change', (e) => uiux_mobile_scale(e.target.value));
  uiux_mobile_scale(window.opts.uiux_mobile_scale);
}

async function setupErrorObserver() {
  const console = appUiUx.querySelector('#logMonitorData');
  const consoleBtn = appUiUx.querySelector('#btn_console');
  if (console && consoleBtn) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          const secondTd = node.querySelector('td:nth-child(2)');
          if (secondTd && secondTd.textContent === 'ERROR') {
            const errorCountAttr = consoleBtn.getAttribute('error-count');
            const errorCount = errorCountAttr ? parseInt(errorCountAttr) : 0;
            consoleBtn.setAttribute('error-count', errorCount + 1);
          }
        });
      });
    });
    observer.observe(console, { childList: true });
    consoleBtn.addEventListener('click', () => consoleBtn.removeAttribute('error-count'));
  }
}

async function setupGenerateObservers() {
  const keys = ['#txt2img', '#img2img', '#extras', '#control'];
  keys.forEach((key) => {
    const tgb = document.querySelector(`${key}_generate`);
    const tib = document.querySelector(`${key}_interrupt`);
    const tsb = document.querySelector(`${key}_skip`);
    if (!tgb || !tib || !tsb) return;
    const tg = tgb.closest('.sd-button');
    const ti = tib.closest('.portal');
    const ts = tsb.closest('.portal');
    const loop = document.querySelector(`${key}_loop`);
    if (loop) tib.addEventListener('click', () => loop.classList.add('stop'));
    const gen_observer = new MutationObserver(() => {
      if (tgb.textContent && !tgb.querySelector('span')) {
        if (tgb.textContent === 'Generate') {
          ti.classList.add('disable');
          ts.classList.add('disable');
          tg.classList.remove('active');
          const icon = document.createElement('div');
          icon.classList.add('mask-icon', 'icon-generate');
          tgb.appendChild(icon);
        } else {
          ti.classList.remove('disable');
          ts.classList.remove('disable');
          tg.classList.add('active');
        }
        const span = document.createElement('span');
        span.textContent = tgb.textContent;
        tgb.appendChild(span);
      }
    });
    gen_observer.observe(tgb, { childList: true, subtree: true });
  });

  keys.forEach((key) => {
    const teb = document.querySelector(`${key}_enqueue`);
    if (!teb) return;
    const te = teb.closest('.sd-button');
    const gen_observer = new MutationObserver(() => {
      if (teb.textContent && !teb.querySelector('span')) {
        if (teb.textContent === 'Enqueue') {
          te.classList.remove('active');
          const icon = document.createElement('div');
          icon.classList.add('mask-icon', 'icon-arrow-up-circle-line');
          teb.appendChild(icon);
        } else {
          te.classList.add('active');
        }
        const span = document.createElement('span');
        span.textContent = teb.textContent;
        teb.appendChild(span);
      }
    });
    gen_observer.observe(teb, { childList: true, subtree: true });
  });
}

//= ====================== SETUP =======================
async function loadAllPortals() {
  appUiUx.querySelectorAll('.portal').forEach((elem, index, array) => {
    const onlyDiffusers = elem.classList.contains('only-diffusers');
    const onlyOriginal = elem.classList.contains('only-original');
    if ((onlyDiffusers && !isBackendDiffusers) || (onlyOriginal && isBackendDiffusers)) portalTotal += 1;
    else movePortal(elem, 1, index, array.length); // eslint-disable-line no-use-before-define
  });
}
loadAllPortals = functionLogTime(loadAllPortals);

function movePortal(portalElem, tries, index, length) {
  const MAX_TRIES = 3;
  const sp = portalElem.getAttribute('data-parent-selector');
  const s = portalElem.getAttribute('data-selector');
  const targetElem = document.querySelector(`${sp} ${s}`); // (tries % 2 == 0) ? document.querySelector(`${sp} ${s}`) : appUiUx.querySelector(`${s}`);
  if (portalElem && targetElem) {
    if (window.opts.uiux_enable_console_log) log('UI register', index, sp, s, tries);
    portalElem.append(targetElem);
    portalTotal += 1;
    const droppable = portalElem.getAttribute('droppable');
    if (droppable) {
      Array.from(portalElem.children).forEach((child) => {
        if (child !== targetElem) {
          if (targetElem.className.indexOf('gradio-accordion') !== -1) targetElem.children[2].append(child);
          else targetElem.append(child);
        }
      });
    }
    const showButton = portalElem.getAttribute('show-button');
    if (showButton) document.querySelector(showButton)?.classList.remove('hidden');
  } else if (tries < MAX_TRIES) {
    const timeout = portalElem.getAttribute('data-timeout');
    const delay = timeout ? parseInt(timeout) : 500;
    setTimeout(() => movePortal(portalElem, tries + 1, index, length), delay);
  } else {
    log('UI error not found', index, sp, s);
    if (window.opts.uiux_enable_console_log) portalElem.style.backgroundColor = 'pink';
    portalTotal += 1;
  }
  if (portalTotal === length) uiFlagPortalInitialized = true;
}

function initSplitComponents() {
  appUiUx.querySelectorAll('div.split').forEach((elem) => {
    const id = elem.id;
    const nid = appUiUx.querySelector(`#${id}`);
    const direction = nid?.getAttribute('direction') === 'vertical' ? 'vertical' : 'horizontal';
    const gutterSize = nid?.getAttribute('gutterSize') || '8';
    const ids = [];
    const initSizes = [];
    const minSizes = [];
    const containers = appUiUx.querySelectorAll(`#${id} > div.split-container`);
    containers.forEach(((c) => {
      const ji = c.getAttribute('data-initSize');
      const jm = c.getAttribute('data-minSize');
      ids.push(`#${c.id}`);
      initSizes.push(ji ? parseInt(ji) : 100 / containers.length);
      minSizes.push(jm ? parseInt(jm) : Infinity);
    }));
    if (window.opts.uiux_enable_console_log) log('UI split component', ids, initSizes, minSizes, direction, gutterSize);
    split_instances[id] = Split(ids, { // eslint-disable-line no-undef
      sizes: initSizes,
      minSize: minSizes,
      direction,
      gutterSize: parseInt(gutterSize),
      snapOffset: 0,
      dragInterval: 1,
      elementStyle(dimension, size, gs) {
        return { 'flex-basis': `calc(${size}% - ${gs}px)` };
      },
      gutterStyle(dimension, gs) {
        return {
          'flex-basis': `${gs}px`,
          'min-width': `${gs}px`,
          'min-height': `${gs}px`,
        };
      },
    });
  });
}

function initAccordionComponents() {
  appUiUx.querySelectorAll('.accordion-bar').forEach((elem) => {
    const acc = elem.parentElement;
    const accSplit = acc.closest('.split-container');
    const accTrigger = appUiUx.querySelector(acc.getAttribute('iconTrigger'));
    if (accTrigger) elem.classList.add('pointer-events-none');
    if (acc.className.indexOf('accordion-vertical') !== -1 && accSplit.className.indexOf('split') !== -1) {
      acc.classList.add('expand');
      const splitInstance = split_instances[accSplit.parentElement.id];
      accSplit.setAttribute('data-sizes', JSON.stringify(splitInstance.getSizes()));
      accTrigger?.addEventListener('click', () => {
        acc.classList.toggle('expand');
        if (accSplit.className.indexOf('v-expand') !== -1) {
          accSplit.classList.remove('v-expand');
          accSplit.style.removeProperty('min-width');
          splitInstance.setSizes(JSON.parse(accSplit.getAttribute('data-sizes')));
        } else {
          accSplit.classList.add('v-expand');
          const sizes = splitInstance.getSizes();
          accSplit.setAttribute('data-sizes', JSON.stringify(sizes));
          if (acc.className.indexOf('left') !== -1) {
            sizes[sizes.length - 1] = 100;
            sizes[sizes.length - 2] = 0;
          } else {
            sizes[sizes.length - 1] = 0;
            sizes[sizes.length - 2] = 100;
          }
          const padding = parseFloat(window.getComputedStyle(elem, null).getPropertyValue('padding-left')) * 2;
          accSplit.style.minWidth = `${elem.offsetWidth + padding}px`;
          splitInstance.setSizes(sizes);
        }
      });
    } else {
      accTrigger?.addEventListener('click', () => { acc.classList.toggle('expand'); });
    }
  });
}

function initTabComponents() {
  function callToAction(elem) {
    // Expand closest accordion
    const accBar = elem.closest('.accordion-bar');
    if (accBar) {
      const acc = accBar.parentElement;
      if (acc.className.indexOf('expand') === -1) {
        const accTrigger = appUiUx.querySelector(acc.getAttribute('iconTrigger'));
        if (accTrigger) accTrigger.click();
        else accBar.click();
      }
    }
  }

  function hideActive(tab) {
    tab.classList.remove('active');
    const tabItemId = tab.getAttribute('tabItemId');
    appUiUx.querySelectorAll(tabItemId).forEach((tabItem) => {
      tabItem.classList.remove('fade-in');
      tabItem.classList.add('fade-out');
    });
  }

  function showActive(tab) {
    tab.classList.add('active');
    const tabItemId = tab.getAttribute('tabItemId');
    appUiUx.querySelectorAll(tabItemId).forEach((tabItem) => {
      tabItem.classList.add('fade-in');
      tabItem.classList.remove('fade-out');
    });
  }

  appUiUx.querySelectorAll('.xtabs-tab').forEach((elem) => {
    elem.addEventListener('click', () => {
      const tabParent = elem.parentElement;
      const tabGroup = elem.getAttribute('tabGroup');

      if (tabGroup) {
        appUiUx.querySelectorAll(`[tabGroup="${tabGroup}"]`).forEach((tab) => {
          if (tab.className.indexOf('active') !== -1) hideActive(tab);
        });
      } else if (tabParent) {
        Array.from(tabParent.children).forEach((tab) => {
          if (tab.className.indexOf('active') !== -1) hideActive(tab);
        });
      }
      showActive(elem);
      callToAction(elem);
    });

    const active = elem.getAttribute('active');
    if (!active) hideActive(elem);
  });

  appUiUx.querySelectorAll('.xtabs-tab[active]').forEach((elem) => {
    showActive(elem);
    callToAction(elem);
  });

  function showHideAnchors(anchor, index) {
    Array.from(anchor.children).forEach((elem) => {
      if (elem.matches(`[anchor*="${index}"]`)) elem.style.display = 'flex';
      else elem.style.display = 'none';
    });
  }

  appUiUx.querySelectorAll('.xtabs-anchor').forEach((anchor) => {
    const tabNav = document.querySelector(anchor.getAttribute('anchorNav'));
    if (tabNav) {
      const observer = new MutationObserver(() => {
        const index = Array.from(tabNav.children).findIndex((btn) => btn.classList.contains('selected')) + 1;
        showHideAnchors(anchor, index);
      });
      observer.observe(tabNav, { attributes: true, attributeFilter: ['class'], childList: true });
    }
    showHideAnchors(anchor, 1);
  });
}

function initButtonComponents() {
  appUiUx.querySelectorAll('.sd-button').forEach((elem) => {
    const toggle = elem.getAttribute('toggle');
    const active = elem.getAttribute('active');
    const input = elem.querySelector('input');

    if (input) {
      if (input.checked === true && !active) input.click();
      else if (input.checked === false && active) input.click();
    }
    if (active) elem.classList.add('active');
    else elem.classList.remove('active');
    if (toggle) {
      elem.addEventListener('click', (e) => {
        const inputEl = elem.querySelector('input');
        if (inputEl) {
          inputEl.click();
          if (inputEl.checked === true) {
            elem.classList.add('active');
          } else if (inputEl.checked === false) {
            elem.classList.remove('active');
          }
        } else {
          elem.classList.toggle('active');
        }
      });
    }

    // Useful to switch tab after button click
    const extraClicks = elem.getAttribute('data-click');
    if (extraClicks) {
      elem.addEventListener('click', () => {
        document.querySelectorAll(extraClicks).forEach((el) => el.click());
      });
    }
  });
}

async function setupAnimationEventListeners() {
  const notransition = window.opts.uiux_disable_transitions;
  document.addEventListener('animationstart', (e) => {
    if (e.animationName === 'fade-in') {
      e.target.classList.remove('hidden');
    }
    if (notransition && e.animationName === 'fade-out') {
      e.target.classList.add('notransition');
      e.target.classList.add('hidden');
    }
  });
  document.addEventListener('animationend', (e) => {
    if (e.animationName === 'fade-out') {
      e.target.classList.add('hidden');
    }
  });
}

async function checkBackend() {
  if (window.opts.sd_backend === 'original') {
    appUiUx.classList.add('backend-original');
    isBackendDiffusers = false;
  } else if (window.opts.sd_backend === 'diffusers') {
    appUiUx.classList.add('backend-diffusers');
    isBackendDiffusers = true;
  }
}

async function createButtonsForExtensions() {
  const other_extensions = document.querySelector('#other_extensions');
  const other_views = document.querySelector('#split-left');
  const no_button_tabs = ['tab_txt2img', 'tab_img2img', 'tab_process', 'tab_control', 'tab_interrogate', 'tab_train', 'tab_models', 'tab_extensions', 'tab_system', 'tab_gallery', 'tab_sdnext_uiux_core'];
  const snakeToCamel = (str) => str.replace(/(_\w)/g, (match) => match[1].toUpperCase());
  document.querySelectorAll('#tabs > .tabitem').forEach((c) => {
    const cid = c.id;
    const nid = cid.split('tab_')[1];
    if (!no_button_tabs.includes(cid)) {
      const temp = document.createElement('div');
      temp.innerHTML = `
        <button 
          tabItemId="#split-app, #${cid}_tabitem" 
          tabGroup="main_group" 
          data-click="#tabs" 
          onclick="mainTabs(this, '#${cid}')" 
          class="xtabs-tab"
        >
          <div class="icon-letters">${nid.slice(0, 2)}</div>
          <span>${snakeToCamel(nid)}</span>
        </button>
      `;
      other_extensions.append(temp.firstElementChild);
      temp.innerHTML = `
        <div id="${cid}_tabitem" class="xtabs-item other">
          <div data-parent-selector="gradio-app" data-selector="#${cid} > div" class="portal"></div>
        </div>
      `;
      other_views.append(temp.firstElementChild);
    }
  });
}

//= ====================== TEMPLATES =======================
async function replaceRootTemplate() {
  appUiUx = document.querySelector(uiux_app_id);
  gradioApp().insertAdjacentElement('afterbegin', appUiUx);
}

function getNestedTemplates(container) {
  const nestedData = [];
  container.querySelectorAll('.template:not([status])').forEach((el) => {
    const url = el.getAttribute('url');
    const key = el.getAttribute('key');
    const template = el.getAttribute('template');
    nestedData.push({
      url: url || template_path,
      key: key || undefined,
      template: template ? `${template}.html` : `${el.id}.html`,
      id: el.id,
    });
  });
  return nestedData;
}

async function loadCurrentTemplate(data) {
  const curr_data = data.shift();
  if (curr_data) {
    let target;
    if (curr_data.parent) target = curr_data.parent;
    else if (curr_data.id) target = document.querySelector(`#${curr_data.id}`);
    if (target) {
      if (window.opts.uiux_enable_console_log) log('UI template', curr_data.template);
      const response = await fetch(`${curr_data.url}${curr_data.template}`);
      if (!response.ok) {
        log('UI failed to load template', curr_data.template);
        target.setAttribute('status', 'error');
      } else {
        const text = await response.text();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = curr_data.key ? text.replace(/\s*\{\{.*?\}\}\s*/g, curr_data.key) : text;
        const nestedData = getNestedTemplates(tempDiv);
        data.push(...nestedData);
        target.setAttribute('status', 'true');
        target.append(tempDiv.firstElementChild);
      }
      return loadCurrentTemplate(data);
    }
  }
  return Promise.resolve();
}

async function loadAllTemplates() {
  const data = [
    {
      url: template_path,
      template: template_root,
      parent: document.querySelector(uiux_tab_id),
    },
  ];
  await loadCurrentTemplate(data);
  await replaceRootTemplate();
}
loadAllTemplates = functionLogTime(loadAllTemplates);

//= ====================== INITIALIZATION =======================
async function removeStyleAssets() {
  // Remove specific stylesheets
  let removedStylesheets = 0;
  document.querySelectorAll(`
    [rel="stylesheet"][href*="/assets/"], 
    [rel="stylesheet"][href*="theme.css"],
    [rel="stylesheet"][href*="base.css"],
    [rel="stylesheet"][href*="file=style.css"]
  `).forEach((stylesheet) => {
    stylesheet.remove();
    removedStylesheets++;
    if (window.opts.uiux_enable_console_log) log('UI removed stylesheet', stylesheet.getAttribute('href'));
  });
  log('UI removeStyleSheets', removedStylesheets);

  // Remove inline styles and svelte classes
  const stylers = document.querySelectorAll('.styler, [class*="svelte"]:not(input)');
  let count = 0;
  let removedCount = 0;

  stylers.forEach((element) => {
    if (element.style.display !== 'none' && element.style.display !== 'block') {
      element.removeAttribute('style');
      removedCount++;
    }

    [...element.classList].filter((className) => className.match(/^svelte.*/)).forEach((svelteClass) => {
      element.classList.remove(svelteClass);
    });
    count++;
  });
  log('UI removeElements', `${removedCount}/${count}`);
}

function logStartup() {
  log('userAgent', navigator.userAgent);
  const filteredOpts = Object.entries(window.opts).filter(([key, value]) => key.startsWith('uiux') && typeof value !== 'string');
  const uiOpts = {};
  for (const [key, value] of filteredOpts) uiOpts[key] = value;
  log('UI settings', uiOpts);
  if (navigator.userAgent.toLowerCase().includes('firefox')) {
    log('UI: Go to the Firefox about:config page, then search and toggle layout. css.has-selector. enabled');
  }
}

async function setupLogger() {
  const logMonitorJS = document.createElement('div');
  logMonitorJS.id = "logMonitorJS";
  document.body.append(logMonitorJS);
  window.logger = logMonitorJS;
}

//= ====================== MAIN ROUTINE =======================
async function mainUiUx() {
  logStartup();
  await removeStyleAssets();
  await loadAllTemplates();
  checkBackend();
  createButtonsForExtensions();
  setupAnimationEventListeners();
  initSplitComponents();
  initAccordionComponents();
  await loadAllPortals();
  initTabComponents();
  initButtonComponents();
  await waitForUiPortal();
  setupGenerateObservers();
  setupErrorObserver();
  uiuxOptionSettings();
  showContributors();
  switchMobile();
  extraTweaks();
  uiFlagInitialized = true;
}

mainUiUx = functionLogTime(mainUiUx);
onUiReady(mainUiUx);
