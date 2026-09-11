/**
 * VISION SCHOOL Client Portal Application Script v2.0
 * Pure Vanilla JS, fully responsive, connects to Backend API (port 4000).
 */

const API_BASE = '/api';

// ── Media & Branding Helpers ──
function resolveMediaUrl(url, version) {
  if (!url) return '';
  let fullUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
    const host = API_BASE.replace(/\/api\/?$/, '');
    fullUrl = `${host}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  if (version) {
    fullUrl += (fullUrl.includes('?') ? '&' : '?') + `v=${encodeURIComponent(version)}`;
  }
  return fullUrl;
}

function applyClientBranding(b) {
  if (!b) return;
  const brandName = b.siteName || b.platformName || 'ROEYA SCHOOL';
  const shortName = b.brandShortName || b.shortName || brandName;
  const logoUrl = b.clientLogoUrl || b.adminLogoUrl;
  const v = b.updatedAt ? new Date(b.updatedAt).getTime() : Date.now();
  const resolvedLogoUrl = resolveMediaUrl(logoUrl, v);

  // 1. Text Brand Name across navbar, headings, footers, etc.
  const brandNameEls = document.querySelectorAll('.client-brand-name, .client-footer-name, [data-brand-name]');
  brandNameEls.forEach(el => {
    el.textContent = brandName;
  });

  // Also replace text in footers or hero titles if containing older brand name
  document.querySelectorAll('.footer-brand-name, .footer-desc, .client-hero-title').forEach(el => {
    if (el.textContent.includes('VISION SCHOOL')) {
      el.textContent = el.textContent.replace(/VISION SCHOOL/g, brandName);
    }
  });

  // 2. Brand Logos & Icons
  const brandIconEls = document.querySelectorAll('.client-brand-icon, .auth-brand-icon');
  brandIconEls.forEach(iconEl => {
    if (logoUrl) {
      iconEl.innerHTML = `<img src="${resolvedLogoUrl}" alt="${brandName}" style="max-height:100%;max-width:100%;object-fit:contain;border-radius:inherit;display:block;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='inline-flex';" /><span class="material-symbols-outlined fallback-icon" style="display:none;">school</span>`;
    } else {
      iconEl.innerHTML = `<span class="material-symbols-outlined">school</span>`;
    }
  });

  // 3. Document Title
  if (document.title) {
    if (document.title.includes('VISION SCHOOL')) {
      document.title = document.title.replace(/VISION SCHOOL/g, brandName);
    } else if (!document.title.includes(brandName)) {
      document.title = `${document.title} | ${brandName}`;
    }
  }

  // 4. Favicon
  if (b.faviconUrl) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = resolveMediaUrl(b.faviconUrl);
  }

  // 5. Contact information in footer and page badges
  if (b.contactEmail) {
    document.querySelectorAll('.client-contact-email, #auth-contact-email').forEach(el => {
      el.textContent = b.contactEmail;
      if (el.tagName === 'A') el.href = `mailto:${b.contactEmail}`;
    });
  }
  if (b.contactPhone) {
    document.querySelectorAll('.client-contact-phone, #auth-contact-phone').forEach(el => {
      el.textContent = b.contactPhone;
      if (el.tagName === 'A') el.href = `tel:${b.contactPhone}`;
    });
  }
  if (b.contactAddress) {
    document.querySelectorAll('.client-contact-address').forEach(el => {
      el.textContent = b.contactAddress;
    });
  }

  // 6. Cache branding locally
  try {
    localStorage.setItem('vs_branding_cache', JSON.stringify(b));
  } catch (e) {}
}

async function loadBranding() {
  // Apply cached branding first to prevent flicker
  try {
    const cached = localStorage.getItem('vs_branding_cache');
    if (cached) {
      applyClientBranding(JSON.parse(cached));
    }
  } catch (err) {}

  // Fetch live public branding from API
  try {
    const res = await fetch(`${API_BASE}/public/branding?t=${Date.now()}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        applyClientBranding(json.data);
      }
    }
  } catch (err) {
    console.warn('[Branding] Could not load client branding:', err);
  }
}

// Live synchronization across browser tabs and from admin console
window.addEventListener('storage', (e) => {
  if (e.key === 'vs_branding_sync' && e.newValue) {
    try {
      applyClientBranding(JSON.parse(e.newValue));
    } catch (err) {}
  }
});

// ── State Helper for Multi-step Funnel ──
const State = {
  getDraft() {
    try {
      return JSON.parse(sessionStorage.getItem('vs_reg_draft') || '{}');
    } catch {
      return {};
    }
  },
  saveDraft(partial) {
    const current = State.getDraft();
    const updated = { ...current, ...partial };
    sessionStorage.setItem('vs_reg_draft', JSON.stringify(updated));
    return updated;
  },
  clearDraft() {
    sessionStorage.removeItem('vs_reg_draft');
  }
};

// ── Toast Notification Helper ──
function showToast(message, type = 'info') {
  const existing = document.getElementById('vs-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'vs-toast';
  const bg = type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#0f1e3d';
  const icon = type === 'error' ? 'error' : type === 'success' ? 'check_circle' : 'info';

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${bg};
    color: #fff;
    padding: 12px 20px;
    border-radius: 12px;
    font-family: Inter, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 10px 25px rgba(15,30,61,0.25);
    z-index: 99999;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideUp 0.3s ease-out;
  `;
  toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;">${icon}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Registration Dynamic Form & Stepper Configuration ──
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let cachedFormConfig = null;

async function getFormStepConfig(schoolId, academicYearId, levelId) {
  try {
    const params = new URLSearchParams();
    if (schoolId) params.set('schoolId', schoolId);
    if (academicYearId) params.set('academicYearId', academicYearId);
    if (levelId) params.set('levelId', levelId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/public/registration-form${qs}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        cachedFormConfig = json.data;
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[FormConfig] Could not fetch dynamic form config:', err);
  }
  return cachedFormConfig || {
    documentStep: {
      isVisible: true,
      labelFr: 'Documents',
      labelAr: 'الوثائق',
      descriptionFr: 'Joignez les pièces justificatives requises.',
      displayOrder: 4
    }
  };
}

async function syncRegistrationStepper(activeStepIndex, draft) {
  const stepperEl = document.querySelector('.stepper');
  if (!stepperEl) return null;

  const d = draft || State.getDraft();
  const cfg = await getFormStepConfig(d.schoolId, d.academicYearId, d.levelId);
  const isStep4Visible = cfg?.documentStep ? (cfg.documentStep.isVisible !== false) : true;

  let steps = [
    { label: 'Établissement' },
    { label: 'Élève' },
    { label: 'Parent' },
  ];

  if (isStep4Visible) {
    steps.push({ label: cfg.documentStep?.labelFr || 'Documents' });
    steps.push({ label: 'Confirmation' });
  } else {
    steps.push({ label: 'Confirmation' });
  }

  let html = '';
  steps.forEach((st, idx) => {
    const isDone = idx < activeStepIndex || (idx === steps.length - 1 && activeStepIndex >= steps.length - 1);
    const isActive = idx === activeStepIndex && !isDone;
    const dotContent = isDone
      ? '<span class="material-symbols-outlined" style="font-size:15px;">check</span>'
      : (idx + 1);
    const stepClass = isDone ? 'stepper-step done' : (isActive ? 'stepper-step active' : 'stepper-step');
    html += `
      <div class="${stepClass}">
        <div class="stepper-dot">${dotContent}</div>
        <span class="stepper-label">${escapeHtml(st.label)}</span>
      </div>
    `;
    if (idx < steps.length - 1) {
      const lineClass = isDone ? 'stepper-line done' : 'stepper-line';
      html += `<div class="${lineClass}"></div>`;
    }
  });

  stepperEl.innerHTML = html;
  return cfg;
}

// ── Main Page Handler Router ──
document.addEventListener('DOMContentLoaded', () => {
  setupMobileNav();
  loadBranding();
  updateAuthStateNavbar();

  const path = window.location.pathname;

  if (path === '/connexion' || path === '/connexion/') {
    initConnexion();
  } else if (path === '/mon-espace' || path === '/mon-espace/') {
    initMonEspace();
  } else if (path === '/niveaux-admissions' || path === '/niveaux-admissions/') {
    initNiveauxAdmissions();
  } else if (path === '/inscription' || path === '/inscription/') {
    initStep1();
  } else if (path === '/inscription/eleve') {
    initStep2();
  } else if (path === '/inscription/parent') {
    initStep3();
  } else if (path === '/inscription/documents') {
    initStep4();
  } else if (path === '/inscription/confirmation') {
    initStep5();
  } else if (path === '/suivi') {
    initTracking();
  } else if (path === '/contact') {
    initContactPage();
  }
});

// ── Mobile Navigation Drawer ──
function setupMobileNav() {
  const btn = document.getElementById('mobile-menu-btn');
  if (!btn) return;

  // Create overlay
  let overlay = document.getElementById('mobile-nav-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mobile-nav-overlay';
    overlay.className = 'mobile-nav-overlay';
    document.body.appendChild(overlay);
  }

  // Create drawer
  let drawer = document.getElementById('mobile-nav-drawer');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'mobile-nav-drawer';
    drawer.className = 'mobile-nav-drawer';

    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    const links = [
      { href: '/', label: 'Accueil', icon: 'home' },
      { href: '/notre-ecole', label: 'Notre école', icon: 'apartment' },
      { href: '/niveaux-admissions', label: 'Niveaux & Admissions', icon: 'school' },
      { href: '/galerie', label: 'Galerie', icon: 'photo_library' },
      { href: '/inscription', label: 'Inscription en ligne', icon: 'edit_square' },
      { href: '/suivi', label: 'Suivi de dossier', icon: 'track_changes' },
      { href: '/contact', label: 'Contact', icon: 'mail' },
      { href: '/faq', label: 'FAQ', icon: 'help' },
    ];

    drawer.innerHTML = links.map(l => {
      const isActive = currentPath === l.href || (l.href !== '/' && currentPath.startsWith(l.href));
      return `<a href="${l.href}" class="mobile-nav-link${isActive ? ' active' : ''}">
        <span class="material-symbols-outlined">${l.icon}</span>${l.label}
      </a>`;
    }).join('') +
      '<div class="mobile-nav-divider"></div>' +
      '<a href="/inscription" class="mobile-nav-cta"><span class="material-symbols-outlined" style="font-size:18px;">edit_square</span>Inscrire mon enfant</a>';

    document.body.appendChild(drawer);
  }

  let isOpen = false;
  function toggleDrawer() {
    isOpen = !isOpen;
    drawer.classList.toggle('open', isOpen);
    overlay.classList.toggle('active', isOpen);
    btn.querySelector('.material-symbols-outlined').textContent = isOpen ? 'close' : 'menu';
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
  function closeDrawer() {
    if (!isOpen) return;
    isOpen = false;
    drawer.classList.remove('open');
    overlay.classList.remove('active');
    btn.querySelector('.material-symbols-outlined').textContent = 'menu';
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', toggleDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Close on link click
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  // Close on resize above breakpoint
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) closeDrawer();
  });
}

// ── STEP 1: School & Level Selection ──
async function initStep1() {
  const schoolSelect = document.getElementById('select-school');
  const levelsGrid = document.getElementById('levels-grid');
  const levelInput = document.getElementById('selected-level-id');
  const choiceContainer = document.getElementById('choice-container');
  const selectChoice = document.getElementById('select-choice');
  const subchoiceWrapper = document.getElementById('subchoice-wrapper');
  const selectSubchoice = document.getElementById('select-subchoice');
  const selectedChoiceInput = document.getElementById('selected-choice-id');
  const nextBtn = document.getElementById('btn-step1-next');
  const sumSchool = document.getElementById('summary-school');
  const sumLevel = document.getElementById('summary-level');
  const sumStatus = document.getElementById('summary-status');

  const draft = State.getDraft();
  const cfg = await syncRegistrationStepper(0, draft);

  const docsBox = document.getElementById('summary-docs-box');
  if (docsBox && cfg?.documentStep && cfg.documentStep.isVisible === false) {
    docsBox.innerHTML = `
      <div class="text-sm font-semibold" style="color:var(--success);margin-bottom:4px;">✅ Aucun document requis</div>
      <div style="font-size:12px;color:var(--text-muted);">Toutes les pièces justificatives sont facultatives ou non demandées pour cette inscription.</div>
    `;
  }

  // Check URL params or saved intended offering
  const urlParams = new URLSearchParams(window.location.search);
  const paramLevel = urlParams.get('level') || urlParams.get('levelId');
  const paramSchool = urlParams.get('school') || urlParams.get('schoolId');
  const paramChoice = urlParams.get('choice') || urlParams.get('choiceId');

  let intended = null;
  try {
    intended = JSON.parse(sessionStorage.getItem('vs_intended_offering') || 'null');
  } catch {}

  const targetLevelId = paramLevel || intended?.levelId || draft.levelId;
  const targetSchoolId = paramSchool || intended?.schoolId || draft.schoolId;
  const targetChoiceId = paramChoice || intended?.choiceId || draft.choiceId;

  if (targetLevelId) draft.levelId = targetLevelId;
  if (targetSchoolId) draft.schoolId = targetSchoolId;
  if (targetChoiceId) draft.choiceId = targetChoiceId;

  // 1. Fetch Schools
  try {
    const res = await fetch(`${API_BASE}/public/schools`);
    const data = await res.json();
    const schools = data.data || [];

    schoolSelect.innerHTML = '<option value="">-- Sélectionnez un campus --</option>';
    let autoSelectedSchool = null;

    schools.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.code || 'Campus'})`;
      if (draft.schoolId === s.id) {
        opt.selected = true;
        autoSelectedSchool = s;
      }
      schoolSelect.appendChild(opt);
    });

    // If a target level exists but no school is in draft, default to first school
    if (!draft.schoolId && schools.length > 0 && targetLevelId) {
      schoolSelect.value = schools[0].id;
      draft.schoolId = schools[0].id;
      draft.schoolName = schools[0].name;
      autoSelectedSchool = schools[0];
    }

    if (autoSelectedSchool && sumSchool) {
      sumSchool.textContent = autoSelectedSchool.name;
    }

    if (draft.schoolId) {
      loadLevelsForSchool(draft.schoolId, draft.levelId);
    }
  } catch (err) {
    console.error('Error loading schools:', err);
    schoolSelect.innerHTML = '<option value="s1">Campus Alger-Centre</option><option value="s2">Campus Ouest (Oran)</option>';
  }

  schoolSelect.addEventListener('change', () => {
    const schoolId = schoolSelect.value;
    const schoolName = schoolSelect.options[schoolSelect.selectedIndex]?.text || '—';
    if (sumSchool) sumSchool.textContent = schoolName;

    if (choiceContainer) choiceContainer.style.display = 'none';
    if (selectedChoiceInput) selectedChoiceInput.value = '';

    if (schoolId) {
      State.saveDraft({ schoolId, schoolName });
      loadLevelsForSchool(schoolId);
    } else {
      levelsGrid.innerHTML = '<div class="text-muted text-sm" style="padding:16px;text-align:center;">Sélectionnez d\'abord un établissement pour voir les niveaux disponibles.</div>';
      if (nextBtn) nextBtn.disabled = true;
    }
  });

  async function loadLevelsForSchool(schoolId, preselectLevelId = null) {
    levelsGrid.innerHTML = '<div class="text-sm text-muted" style="padding:16px;text-align:center;">Chargement des niveaux disponibles…</div>';
    
    try {
      const res = await fetch(`${API_BASE}/public/levels/${schoolId}`);
      const data = await res.json();
      const levels = (data.success && data.data && data.data.length > 0) ? data.data : [];

      if (levels.length === 0) {
        // Fallback to global active levels
        const globalRes = await fetch(`${API_BASE}/public/levels`);
        const globalData = await globalRes.json();
        levels.push(...(globalData.data || []));
      }

      levelsGrid.innerHTML = '';
      levels.forEach(lvl => {
        const lvlId = lvl.levelId || lvl.id;
        const lvlName = lvl.levelNameFr || lvl.name;
        const cycleName = lvl.cycleNameFr || lvl.cycleName || lvl.cycle || 'Cycle standard';
        const isOpen = lvl.operationalState !== 'CLOSED' && lvl.isRegistrationOpen !== false;
        const badgeClass = isOpen ? 'cap-badge-open' : 'cap-badge-full';
        const badgeText = isOpen ? 'Ouvert' : 'Complet';

        const card = document.createElement('div');
        card.className = 'level-card';
        card.setAttribute('data-id', lvlId);
        card.setAttribute('data-name', lvlName);

        card.innerHTML = `
          <div class="level-card-icon"><span class="material-symbols-outlined">school</span></div>
          <div style="flex:1;">
            <div class="level-card-name">${lvlName}</div>
            <div class="level-card-sub">${cycleName}</div>
          </div>
          <div class="level-card-status">
            <span class="${badgeClass}">${badgeText}</span>
          </div>
        `;

        card.addEventListener('click', async () => {
          document.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          levelInput.value = lvlId;
          if (sumLevel) sumLevel.textContent = lvlName;
          if (sumStatus) {
            sumStatus.className = badgeClass;
            sumStatus.textContent = badgeText;
          }

          // Check dynamic choices / filières attached to this level
          let levelChoices = lvl.choices;
          if (levelChoices === undefined) {
            try {
              const cRes = await fetch(`${API_BASE}/public/levels/${lvlId}/choices`);
              const cData = await cRes.json();
              levelChoices = (cData.success && cData.data) ? cData.data : [];
              lvl.choices = levelChoices;
            } catch (err) {
              levelChoices = [];
            }
          }
          levelChoices = levelChoices || [];

          if (choiceContainer && levelChoices.length > 0) {
            choiceContainer.style.display = 'block';
            selectChoice.innerHTML = '<option value="">-- Sélectionnez une filière / option --</option>' +
              levelChoices.map(c => `<option value="${c.id}">${c.nameFr}</option>`).join('');
            
            if (subchoiceWrapper) subchoiceWrapper.style.display = 'none';
            if (selectedChoiceInput) selectedChoiceInput.value = '';
            if (nextBtn) nextBtn.disabled = true;

            selectChoice.onchange = () => {
              const chosenId = selectChoice.value;
              const chosen = levelChoices.find(c => c.id === chosenId);

              if (chosen && chosen.children && chosen.children.length > 0) {
                if (subchoiceWrapper) {
                  subchoiceWrapper.style.display = 'block';
                  selectSubchoice.innerHTML = '<option value="">-- Sélectionnez une spécialité --</option>' +
                    chosen.children.map(sc => `<option value="${sc.id}">${sc.nameFr}</option>`).join('');
                }
                if (selectedChoiceInput) selectedChoiceInput.value = '';
                if (nextBtn) nextBtn.disabled = true;

                selectSubchoice.onchange = () => {
                  const subId = selectSubchoice.value;
                  const subChosen = chosen.children.find(sc => sc.id === subId);
                  if (subId && subChosen) {
                    if (selectedChoiceInput) selectedChoiceInput.value = subId;
                    if (sumLevel) sumLevel.textContent = `${lvlName} — ${subChosen.nameFr}`;
                    if (nextBtn) nextBtn.disabled = false;
                    State.saveDraft({
                      levelId: lvlId,
                      levelName: `${lvlName} — ${subChosen.nameFr}`,
                      choiceId: subId,
                      choiceName: subChosen.nameFr,
                      schoolYearLevelId: lvl.schoolYearLevelId || null
                    });
                  } else {
                    if (selectedChoiceInput) selectedChoiceInput.value = '';
                    if (nextBtn) nextBtn.disabled = true;
                  }
                };
              } else if (chosen) {
                if (subchoiceWrapper) subchoiceWrapper.style.display = 'none';
                if (selectedChoiceInput) selectedChoiceInput.value = chosen.id;
                if (sumLevel) sumLevel.textContent = `${lvlName} — ${chosen.nameFr}`;
                if (nextBtn) nextBtn.disabled = false;
                State.saveDraft({
                  levelId: lvlId,
                  levelName: `${lvlName} — ${chosen.nameFr}`,
                  choiceId: chosen.id,
                  choiceName: chosen.nameFr,
                  schoolYearLevelId: lvl.schoolYearLevelId || null
                });
              } else {
                if (subchoiceWrapper) subchoiceWrapper.style.display = 'none';
                if (selectedChoiceInput) selectedChoiceInput.value = '';
                if (nextBtn) nextBtn.disabled = true;
              }
            };
          } else {
            if (choiceContainer) choiceContainer.style.display = 'none';
            if (subchoiceWrapper) subchoiceWrapper.style.display = 'none';
            if (selectedChoiceInput) selectedChoiceInput.value = '';
            if (nextBtn) nextBtn.disabled = false;
            State.saveDraft({
              levelId: lvlId,
              levelName: lvlName,
              choiceId: null,
              choiceName: null,
              schoolYearLevelId: lvl.schoolYearLevelId || null
            });
          }
        });

        if (preselectLevelId === lvlId) {
          card.click();
        }

        levelsGrid.appendChild(card);
      });
    } catch (err) {
      console.error('Error loading levels:', err);
      levelsGrid.innerHTML = '<div class="text-muted text-sm" style="padding:16px;text-align:center;">Impossible de charger les niveaux. Veuillez réessayer.</div>';
    }
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const schoolId = schoolSelect.value;
      const levelId = levelInput.value;
      if (!schoolId || !levelId) {
        showToast('Veuillez sélectionner un établissement et un niveau.', 'error');
        return;
      }
      if (choiceContainer && choiceContainer.style.display !== 'none' && !selectedChoiceInput?.value) {
        showToast('Veuillez sélectionner une filière / spécialité pour continuer.', 'error');
        return;
      }
      window.location.href = '/inscription/eleve';
    });
  }
}

// ── STEP 2: Student Information ──
async function initStep2() {
  const draft = State.getDraft();
  await syncRegistrationStepper(1, draft);

  // Populate summary
  const sumSchool = document.getElementById('summary-school');
  const sumLevel = document.getElementById('summary-level');
  if (sumSchool && draft.schoolName) sumSchool.textContent = draft.schoolName;
  if (sumLevel && draft.levelName) sumLevel.textContent = draft.levelName;

  // Pre-fill existing data
  if (draft.student) {
    const s = draft.student;
    if (document.getElementById('student-first-name') && s.firstNameFr) document.getElementById('student-first-name').value = s.firstNameFr;
    if (document.getElementById('student-last-name') && s.lastNameFr) document.getElementById('student-last-name').value = s.lastNameFr;
    if (document.getElementById('student-first-name-ar') && s.firstNameAr) document.getElementById('student-first-name-ar').value = s.firstNameAr;
    if (document.getElementById('student-last-name-ar') && s.lastNameAr) document.getElementById('student-last-name-ar').value = s.lastNameAr;
    if (document.getElementById('student-dob') && s.birthDate) document.getElementById('student-dob').value = s.birthDate;
    if (document.getElementById('student-birth-place') && s.birthPlace) document.getElementById('student-birth-place').value = s.birthPlace;
    if (document.getElementById('student-prev-school') && s.currentSchool) document.getElementById('student-prev-school').value = s.currentSchool;
    if (s.gender) selectGender(s.gender);
  }

  // Gender selection
  window.selectGender = function(g) {
    const maleCard = document.getElementById('gender-male');
    const femaleCard = document.getElementById('gender-female');
    const genderInput = document.getElementById('student-gender');
    if (!genderInput) return;

    genderInput.value = g;
    if (g === 'MALE') {
      maleCard?.classList.add('selected');
      femaleCard?.classList.remove('selected');
    } else {
      femaleCard?.classList.add('selected');
      maleCard?.classList.remove('selected');
    }
  };

  const nextBtn = document.getElementById('btn-step2-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const firstName = document.getElementById('student-first-name')?.value.trim();
      const lastName = document.getElementById('student-last-name')?.value.trim();
      const firstNameAr = document.getElementById('student-first-name-ar')?.value.trim() || '';
      const lastNameAr = document.getElementById('student-last-name-ar')?.value.trim() || '';
      const gender = document.getElementById('student-gender')?.value || 'MALE';
      const birthDate = document.getElementById('student-dob')?.value;
      const birthPlace = document.getElementById('student-birth-place')?.value.trim() || '';
      const currentSchool = document.getElementById('student-prev-school')?.value.trim() || '';

      if (!firstName || !lastName || !birthDate) {
        showToast('Veuillez remplir tous les champs obligatoires (nom, prénom, date de naissance).', 'error');
        return;
      }

      State.saveDraft({
        student: {
          firstNameFr: firstName,
          lastNameFr: lastName,
          firstNameAr,
          lastNameAr,
          gender,
          birthDate,
          birthPlace,
          currentSchool
        }
      });

      window.location.href = '/inscription/parent';
    });
  }
}

// ── STEP 3: Parent Information ──
async function initStep3() {
  const draft = State.getDraft();
  const cfg = await syncRegistrationStepper(2, draft);
  const isStep4Visible = cfg?.documentStep ? (cfg.documentStep.isVisible !== false) : true;

  // Populate summary
  const sumSchool = document.getElementById('summary-school');
  const sumLevel = document.getElementById('summary-level');
  if (sumSchool && draft.schoolName) sumSchool.textContent = draft.schoolName;
  if (sumLevel && draft.levelName) sumLevel.textContent = draft.levelName;

  // Dynamically sync label & configuration from published form builder
  fetch(`${API_BASE}/public/registration-form`)
    .then(r => r.json())
    .then(formData => {
      if (formData.success && formData.data && formData.data.sections) {
        const parentSec = formData.data.sections.find(s => s.key === 'parent_info');
        if (parentSec) {
          const profField = parentSec.fields.find(f => f.fieldKey === 'profession_tuteur' || f.fieldKey === 'parent_profession');
          if (profField) {
            const profLabel = document.querySelector('label[for="parent-profession"]');
            if (profLabel) profLabel.textContent = `${profField.labelFr} ${profField.isRequired ? '*' : '(facultatif)'}`;
            const profInput = document.getElementById('parent-profession');
            if (profInput && profField.placeholderFr) profInput.placeholder = profField.placeholderFr;
          }
        }
      }
    })
    .catch(() => {});

  // Pre-fill existing data from draft or logged-in parent account
  let clientUser = null;
  try {
    clientUser = JSON.parse(localStorage.getItem('vs_client_user') || 'null');
  } catch {}

  const p = draft.primaryParent || {};
  const fn = p.firstNameFr || clientUser?.firstName || '';
  const ln = p.lastNameFr || clientUser?.lastName || '';
  const ph = p.phonePrimary || clientUser?.phone || '';
  const em = p.email || clientUser?.email || '';
  const ad = p.address || clientUser?.address || '';

  if (document.getElementById('parent-first-name') && fn) document.getElementById('parent-first-name').value = fn;
  if (document.getElementById('parent-last-name') && ln) document.getElementById('parent-last-name').value = ln;
  if (document.getElementById('parent-relation') && p.relation) document.getElementById('parent-relation').value = p.relation;
  if (document.getElementById('parent-phone') && ph) document.getElementById('parent-phone').value = ph;
  if (document.getElementById('parent-phone2') && p.phoneSecondary) document.getElementById('parent-phone2').value = p.phoneSecondary;
  if (document.getElementById('parent-email') && em) document.getElementById('parent-email').value = em;
  if (document.getElementById('parent-address') && ad) document.getElementById('parent-address').value = ad;
  if (document.getElementById('parent-profession') && p.profession) document.getElementById('parent-profession').value = p.profession;

  const nextBtn = document.getElementById('btn-step3-next');
  if (nextBtn) {
    if (!isStep4Visible) {
      nextBtn.innerHTML = `
        Soumettre mon inscription
        <span class="material-symbols-outlined">send</span>
      `;
    }

    nextBtn.addEventListener('click', async () => {
      const firstName = document.getElementById('parent-first-name')?.value.trim();
      const lastName = document.getElementById('parent-last-name')?.value.trim();
      const relation = document.getElementById('parent-relation')?.value || 'FATHER';
      const phone = document.getElementById('parent-phone')?.value.trim();
      const phone2 = document.getElementById('parent-phone2')?.value.trim() || '';
      const email = document.getElementById('parent-email')?.value.trim();
      const address = document.getElementById('parent-address')?.value.trim() || '';
      const profession = document.getElementById('parent-profession')?.value.trim() || '';

      if (!firstName || !lastName || !phone || !email) {
        showToast('Veuillez renseigner le nom, prénom, téléphone et email du responsable.', 'error');
        return;
      }

      const updatedDraft = State.saveDraft({
        primaryParent: {
          firstNameFr: firstName,
          lastNameFr: lastName,
          relation,
          phonePrimary: phone,
          phoneSecondary: phone2,
          email,
          address,
          profession
        }
      });

      if (isStep4Visible) {
        window.location.href = '/inscription/documents';
        return;
      }

      // ── Step 4 is OFF: Direct submission from Step 3 ──
      const token = localStorage.getItem('vs_client_token');
      if (!token) {
        showToast('Un compte parent est obligatoire pour soumettre une inscription.', 'error');
        window.location.href = '/connexion?redirect=' + encodeURIComponent('/inscription/parent');
        return;
      }

      nextBtn.disabled = true;
      nextBtn.innerHTML = `
        <div style="width:18px;height:18px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px;"></div>
        Transmission en cours…
      `;

      try {
        const payload = {
          schoolId: updatedDraft.schoolId,
          levelId: updatedDraft.levelId,
          choiceId: updatedDraft.choiceId || undefined,
          previousLevelId: updatedDraft.previousLevelId || undefined,
          previousChoiceId: updatedDraft.previousChoiceId || undefined,
          academicYearId: updatedDraft.academicYearId || undefined,
          student: updatedDraft.student || {
            firstNameFr: 'Élève',
            lastNameFr: 'Candidat',
            gender: 'MALE',
            birthDate: '2019-01-01'
          },
          primaryParent: updatedDraft.primaryParent,
          documents: []
        };

        const res = await fetch(`${API_BASE}/public/registration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (res.status === 401) {
          showToast('Session expirée ou compte parent requis. Veuillez vous connecter.', 'error');
          localStorage.removeItem('vs_client_token');
          window.location.href = '/connexion?redirect=' + encodeURIComponent('/inscription/parent');
          return;
        }

        const data = await res.json();
        if (data.success && data.data) {
          const regCode = data.data.code || data.data.registrationCode;
          sessionStorage.setItem('vs_submitted_code', regCode);
          sessionStorage.setItem('vs_submitted_email', payload.primaryParent.email || '');
          State.clearDraft();
          window.location.href = '/inscription/confirmation';
        } else {
          showToast(data.error?.message || 'Erreur lors de la soumission du dossier.', 'error');
          nextBtn.disabled = false;
          nextBtn.innerHTML = `
            Soumettre mon inscription
            <span class="material-symbols-outlined">send</span>
          `;
        }
      } catch (err) {
        console.error('Submission error:', err);
        showToast('Erreur de communication avec le serveur d\'inscription. Veuillez réessayer.', 'error');
        nextBtn.disabled = false;
        nextBtn.innerHTML = `
          Soumettre mon inscription
          <span class="material-symbols-outlined">send</span>
        `;
      }
    });
  }
}

// ── STEP 4: Documents & Submission ──
async function initStep4() {
  const draft = State.getDraft();
  const cfg = await getFormStepConfig(draft.schoolId, draft.academicYearId, draft.levelId);
  const isStep4Visible = cfg?.documentStep ? (cfg.documentStep.isVisible !== false) : true;

  if (!isStep4Visible) {
    // If Step 4 is disabled by admin, skip directly
    window.location.replace('/inscription/parent');
    return;
  }

  await syncRegistrationStepper(3, draft);

  // Set custom labels & instructions from Form Builder
  const titleEl = document.getElementById('step4-title');
  const subtitleEl = document.getElementById('step4-subtitle');
  if (titleEl && cfg.documentStep?.labelFr) titleEl.textContent = cfg.documentStep.labelFr;
  if (subtitleEl && cfg.documentStep?.descriptionFr) subtitleEl.textContent = cfg.documentStep.descriptionFr;

  // Populate summary
  const sumSchool = document.getElementById('summary-school');
  const sumLevel = document.getElementById('summary-level');
  const sumChoiceRow = document.getElementById('summary-choice-row');
  const sumChoice = document.getElementById('summary-choice');
  const sumStudent = document.getElementById('summary-student');
  const sumParent = document.getElementById('summary-parent');
  const sumEmail = document.getElementById('summary-email');

  if (sumSchool && draft.schoolName) sumSchool.textContent = draft.schoolName;
  if (sumLevel && draft.levelName) sumLevel.textContent = draft.levelName;
  if (draft.choiceName) {
    if (sumChoiceRow && sumChoice) {
      sumChoiceRow.style.display = 'flex';
      sumChoice.textContent = draft.choiceName;
    }
  }
  if (sumStudent && draft.student) {
    sumStudent.textContent = `${draft.student.firstNameFr || ''} ${draft.student.lastNameFr || ''}`.trim() || '—';
  }
  if (sumParent && draft.primaryParent) {
    sumParent.textContent = `${draft.primaryParent.firstNameFr || ''} ${draft.primaryParent.lastNameFr || ''}`.trim() || '—';
  }
  if (sumEmail && draft.primaryParent?.email) {
    sumEmail.textContent = draft.primaryParent.email;
  }

  // Dynamically load requirements from Admin configuration
  const docsContainer = document.getElementById('step4-documents-container');
  let activeRequirements = [];

  if (docsContainer) {
    try {
      const qParams = new URLSearchParams();
      if (draft.schoolId) qParams.set('schoolId', draft.schoolId);
      if (draft.academicYearId) qParams.set('academicYearId', draft.academicYearId);
      if (draft.levelId) qParams.set('levelId', draft.levelId);
      if (draft.cycleId) qParams.set('cycleId', draft.cycleId);
      if (draft.choiceId) qParams.set('choiceId', draft.choiceId);

      const reqRes = await fetch(`${API_BASE}/public/documents/requirements?${qParams.toString()}`);
      const reqData = await reqRes.json();
      if (reqData.success && Array.isArray(reqData.data)) {
        activeRequirements = reqData.data.filter(r => r.showClient !== false && r.isActive !== false);
      }
    } catch (err) {
      console.warn('Error loading document requirements:', err);
    }

    if (activeRequirements.length === 0) {
      docsContainer.innerHTML = `
        <div class="card p-6 text-center text-muted" style="background:#fff;border-radius:var(--r-lg);border:1.5px dashed var(--border);">
          <span class="material-symbols-outlined mb-2" style="font-size:36px;color:var(--success);display:block;margin:0 auto 8px;">check_circle</span>
          <div class="font-semibold text-primary mb-1">Aucune pièce justificative obligatoire</div>
          <div class="text-xs text-muted">Aucun document n'est requis pour cette formation. Vous pouvez soumettre directement votre candidature.</div>
        </div>
      `;
    } else {
      docsContainer.innerHTML = activeRequirements.map((r, idx) => {
        const docName = r.nameFr || r.docTypeNameFr || r.documentTypeNameFr || 'Document requis';
        const docNameAr = r.nameAr || r.docTypeNameAr;
        const maxMo = Math.round((r.maxFileSizeBytes || 5242880) / (1024 * 1024));
        const fileRuleType = r.fileRuleType || 'PDF/Images';
        const docTypeId = r.documentTypeId || r.id;

        return `
          <div class="doc-item-card" style="border:1.5px solid var(--border);border-radius:var(--r-lg);padding:16px 20px;background:#fff;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span class="material-symbols-outlined" style="color:var(--indigo);">description</span>
                <div>
                  <div class="text-sm font-semibold">${escapeHtml(docName)} ${docNameAr ? `<span class="text-xs text-muted font-normal" dir="rtl">(${escapeHtml(docNameAr)})</span>` : ''}</div>
                  <div class="text-xs text-muted">${r.isRequired ? 'Obligatoire' : 'Facultatif'} • ${escapeHtml(fileRuleType)} • Max ${maxMo} Mo</div>
                </div>
              </div>
              <span class="badge ${r.isRequired ? 'badge-pending' : 'badge-inactive'}">${r.isRequired ? 'Requis' : 'Facultatif'}</span>
            </div>
            <div class="doc-upload-area" onclick="document.getElementById('file-doc-${idx}').click()" style="cursor:pointer;border:1.5px dashed var(--border);border-radius:var(--r-md);padding:14px;text-align:center;background:var(--surface-alt);">
              <span class="material-symbols-outlined" style="color:var(--text-muted);font-size:24px;">cloud_upload</span>
              <div style="font-size:13px;font-weight:500;color:var(--text-muted);margin-top:4px;">Cliquer ou glisser le fichier ici</div>
            </div>
            <input type="file" id="file-doc-${idx}" class="hidden dynamic-doc-input" 
                   data-doc-type-id="${docTypeId}" 
                   data-required="${r.isRequired ? 'true' : 'false'}"
                   data-block="${r.blockSubmissionIfMissing ? 'true' : 'false'}"
                   data-doc-name="${escapeHtml(docName)}"
                   accept=".pdf,.jpg,.jpeg,.png"/>
            <div id="file-doc-${idx}-name" class="text-xs text-muted mt-2 hidden"></div>
          </div>
        `;
      }).join('');

      activeRequirements.forEach((r, idx) => {
        const inp = document.getElementById(`file-doc-${idx}`);
        const lbl = document.getElementById(`file-doc-${idx}-name`);
        if (inp && lbl) {
          inp.addEventListener('change', () => {
            if (inp.files && inp.files[0]) {
              lbl.textContent = `✓ ${inp.files[0].name} (${Math.round(inp.files[0].size / 1024)} Ko)`;
              lbl.classList.remove('hidden');
              lbl.style.color = 'var(--success)';
              lbl.style.fontWeight = '500';
            }
          });
        }
      });
    }
  }

  const submitBtn = document.getElementById('btn-step4-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const termsAgree = document.getElementById('terms-agree');
      if (termsAgree && !termsAgree.checked) {
        showToast('Veuillez certifier les informations et accepter les conditions.', 'error');
        return;
      }

      const token = localStorage.getItem('vs_client_token');
      if (!token) {
        showToast('Un compte parent est obligatoire pour soumettre une inscription. Redirection...', 'error');
        window.location.href = '/connexion?redirect=' + encodeURIComponent('/inscription/documents');
        return;
      }

      // Check required visible documents
      const dynamicInputs = document.querySelectorAll('.dynamic-doc-input');
      for (const input of dynamicInputs) {
        if (input.dataset.required === 'true' && (!input.files || input.files.length === 0)) {
          showToast(`Veuillez joindre la pièce obligatoire : ${input.dataset.docName}`, 'error');
          return;
        }
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <div style="width:18px;height:18px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px;"></div>
        Transmission en cours…
      `;

      try {
        const fileToBase64 = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const documents = [];
        for (const input of dynamicInputs) {
          if (input.files && input.files[0]) {
            const file = input.files[0];
            documents.push({
              name: file.name,
              mimeType: file.type || 'application/pdf',
              sizeBytes: file.size,
              base64Data: await fileToBase64(file),
              documentTypeId: input.dataset.docTypeId
            });
          }
        }

        const payload = {
          schoolId: draft.schoolId,
          levelId: draft.levelId,
          choiceId: draft.choiceId || undefined,
          previousLevelId: draft.previousLevelId || undefined,
          previousChoiceId: draft.previousChoiceId || undefined,
          academicYearId: draft.academicYearId || undefined,
          student: draft.student || {
            firstNameFr: 'Élève',
            lastNameFr: 'Candidat',
            gender: 'MALE',
            birthDate: '2019-01-01'
          },
          primaryParent: draft.primaryParent || {
            firstNameFr: 'Parent',
            lastNameFr: 'Responsable',
            phonePrimary: '0550000000',
            email: 'parent@email.dz'
          },
          documents
        };

        const res = await fetch(`${API_BASE}/public/registration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (res.status === 401) {
          showToast('Session expirée ou compte parent requis. Veuillez vous connecter.', 'error');
          localStorage.removeItem('vs_client_token');
          window.location.href = '/connexion?redirect=' + encodeURIComponent('/inscription/documents');
          return;
        }

        const data = await res.json();

        if (data.success && data.data) {
          const regCode = data.data.code || data.data.registrationCode;
          sessionStorage.setItem('vs_submitted_code', regCode);
          sessionStorage.setItem('vs_submitted_email', payload.primaryParent.email || '');
          State.clearDraft();
          window.location.href = '/inscription/confirmation';
        } else {
          showToast(data.error?.message || 'Erreur lors de la soumission du dossier.', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span class="material-symbols-outlined">send</span> Soumettre le dossier';
        }
      } catch (err) {
        console.error('Submission error:', err);
        showToast('Erreur de communication avec le serveur d\'inscription. Veuillez réessayer.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="material-symbols-outlined">send</span> Soumettre le dossier';
      }
    });
  }
}

// ── STEP 5: Confirmation View ──
async function initStep5() {
  const cfg = await getFormStepConfig();
  const isStep4Visible = cfg?.documentStep ? (cfg.documentStep.isVisible !== false) : true;
  await syncRegistrationStepper(isStep4Visible ? 4 : 3);

  const code = sessionStorage.getItem('vs_submitted_code') || 'REG-2026-000001';
  const email = sessionStorage.getItem('vs_submitted_email') || 'votre adresse email';

  const codeEl = document.getElementById('confirmation-code');
  if (codeEl) codeEl.textContent = code;

  const emailEl = document.getElementById('confirm-email');
  if (emailEl) emailEl.textContent = email;

  // Track button direct link
  const trackBtn = document.querySelector('a[href="/suivi"]');
  if (trackBtn) {
    trackBtn.href = `/suivi?code=${code}`;
  }
}

// ── PUBLIC TRACKING ──
function initTracking() {
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('code');

  const codeInput = document.getElementById('track-code');
  const emailInput = document.getElementById('track-email');
  const btnTrack = document.getElementById('btn-track');
  const alertEl = document.getElementById('track-alert');
  const emptyState = document.getElementById('track-empty-state');
  const loadingEl = document.getElementById('track-loading');
  const resultCard = document.getElementById('track-result-card');

  if (codeParam && codeInput) {
    codeInput.value = codeParam;
    doTrack(codeParam, '');
  }

  if (btnTrack) {
    btnTrack.addEventListener('click', (e) => {
      e.preventDefault();
      const code = codeInput?.value?.trim();
      const email = emailInput?.value?.trim() || '';

      if (!code) {
        showAlert('Veuillez saisir votre numéro de dossier (ex: REG-2026-000001).', 'error');
        return;
      }
      doTrack(code, email);
    });
  }

  function showAlert(msg, type = 'error') {
    if (!alertEl) return;
    alertEl.className = `alert alert-${type}`;
    alertEl.textContent = msg;
    alertEl.classList.remove('hidden');
  }

  function hideAlert() {
    if (alertEl) alertEl.classList.add('hidden');
  }

  async function doTrack(code, emailOrPhone) {
    hideAlert();
    if (emptyState) emptyState.classList.add('hidden');
    if (resultCard) resultCard.classList.add('hidden');
    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
      const res = await fetch(`${API_BASE}/public/registration/track?code=${encodeURIComponent(code)}&phone=${encodeURIComponent(emailOrPhone)}`);
      const data = await res.json();

      if (loadingEl) loadingEl.classList.add('hidden');

      if (data.success && data.data) {
        renderTrackingResult(data.data);
      } else {
        showAlert(data.error?.message || 'Aucun dossier trouvé correspondant à ce numéro. Vérifiez votre référence.', 'error');
        if (emptyState) emptyState.classList.remove('hidden');
      }
    } catch (err) {
      if (loadingEl) loadingEl.classList.add('hidden');
      console.error('Tracking fetch error:', err);
      showAlert('Erreur de connexion au serveur de suivi. Veuillez réessayer ultérieurement.', 'error');
      if (emptyState) emptyState.classList.remove('hidden');
    }
  }

  function renderTrackingResult(dossier) {
    if (!resultCard) return;

    const resultCode = document.getElementById('result-code');
    const resultBadge = document.getElementById('result-status-badge');
    const resultIcon = document.getElementById('result-status-icon');
    const resultStudent = document.getElementById('result-student');
    const resultLevel = document.getElementById('result-level');
    const resultSchool = document.getElementById('result-school');
    const resultDate = document.getElementById('result-date');

    if (resultCode) resultCode.textContent = dossier.code;
    if (resultStudent) resultStudent.textContent = dossier.studentFullName || 'Élève';
    if (resultLevel) {
      resultLevel.textContent = dossier.levelName
        ? `${dossier.levelName}${dossier.choiceName ? ` — ${dossier.choiceName}` : ''}`
        : 'Primaire';
    }
    if (resultSchool) resultSchool.textContent = dossier.schoolName || 'Campus Alger';
    if (resultDate) {
      resultDate.textContent = dossier.submittedAt
        ? new Date(dossier.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'Récemment';
    }

    const statusMap = {
      NEW: { label: 'Reçu — En attente d\'examen', badge: 'badge-pending', icon: 'pending', color: 'var(--indigo)' },
      SUBMITTED: { label: 'Dossier Soumis', badge: 'badge-pending', icon: 'mark_email_read', color: 'var(--indigo)' },
      UNDER_REVIEW: { label: 'En cours d\'examen', badge: 'badge-warning', icon: 'hourglass_empty', color: 'var(--warning)' },
      ACCEPTED: { label: 'Inscription Acceptée ✅', badge: 'badge-success', icon: 'check_circle', color: 'var(--success)' },
      REFUSED: { label: 'Candidature non retenue', badge: 'badge-error', icon: 'cancel', color: 'var(--error)' },
      WAITLISTED: { label: 'Sur liste d\'attente', badge: 'badge-warning', icon: 'access_time', color: 'var(--gold)' }
    };

    const st = statusMap[dossier.status] || { label: dossier.status, badge: 'badge-neutral', icon: 'info', color: 'var(--text-muted)' };

    if (resultBadge) {
      resultBadge.className = `badge ${st.badge}`;
      resultBadge.textContent = st.label;
    }

    if (resultIcon) {
      resultIcon.innerHTML = `<span class="material-symbols-outlined" style="font-size:26px;color:${st.color};">${st.icon}</span>`;
    }

    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ── CONTACT FORM ──
function initContact() {
  const form = document.getElementById('public-contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('contact-name')?.value || '';
      showToast(`Merci ${name} ! Votre message a été transmis à la direction.`, 'success');
      form.reset();
    });
  }
}

// ── BRANDING & SETTINGS LOADER ──
async function loadBranding() {
  try {
    const res = await fetch(`${API_BASE}/public/settings`);
    if (!res.ok) return;
    const json = await res.json();
    const settings = json.data;
    if (!settings) return;

    // Platform / School Name
    if (settings.platformName) {
      document.querySelectorAll('.client-brand-name').forEach(el => {
        el.textContent = settings.platformName;
      });
      document.querySelectorAll('.client-footer-name').forEach(el => {
        el.textContent = settings.platformName;
      });
    }

    // Logo & Branding Consistency
    if (settings.clientLogoUrl || settings.platformName) {
      applyClientBranding(settings);
    }

    // Contact info in footer
    if (settings.contactPhone) {
      const phoneEls = document.querySelectorAll('.footer-contact-phone, .contact-phone-text');
      phoneEls.forEach(el => el.textContent = settings.contactPhone);
    }
    if (settings.contactEmail) {
      const emailEls = document.querySelectorAll('.footer-contact-email, .contact-email-text');
      emailEls.forEach(el => el.textContent = settings.contactEmail);
    }
    if (settings.contactAddress) {
      const addrEls = document.querySelectorAll('.footer-contact-address, .contact-address-text');
      addrEls.forEach(el => el.textContent = settings.contactAddress);
    }
  } catch (err) {
    // Non-critical, fail silently
  }
}

// ── AUTH STATE NAVBAR UPDATER ──
function updateAuthStateNavbar() {
  const token = localStorage.getItem('vs_client_token');
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('vs_client_user') || 'null');
  } catch {}

  const navActions = document.querySelector('.client-nav-actions');
  const drawer = document.getElementById('mobile-nav-drawer');

  // Update all CTA buttons to preserve account-first requirement
  document.querySelectorAll('.client-nav-cta').forEach(cta => {
    if (token) {
      cta.href = '/inscription';
    } else {
      cta.href = '/connexion?redirect=' + encodeURIComponent('/inscription');
    }
  });

  if (token && user) {
    // Logged in as parent
    if (navActions) {
      let espaceBtn = navActions.querySelector('.client-nav-espace');
      if (!espaceBtn) {
        espaceBtn = document.createElement('a');
        espaceBtn.href = '/mon-espace';
        espaceBtn.className = 'client-nav-track client-nav-espace';
        espaceBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:rgba(37,99,235,0.08);color:var(--indigo);border:1px solid rgba(37,99,235,0.25);';
        const firstName = user.firstName || 'Parent';
        espaceBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">account_circle</span> Mon Espace (${firstName})`;
        navActions.prepend(espaceBtn);
      }
      const loginBtn = navActions.querySelector('.client-nav-login');
      if (loginBtn) loginBtn.remove();
    }
    if (drawer) {
      if (!drawer.querySelector('.drawer-mon-espace')) {
        const link = document.createElement('a');
        link.href = '/mon-espace';
        link.className = 'client-nav-link drawer-mon-espace';
        link.style.cssText = 'padding:10px 0;font-size:15px;font-weight:600;border-bottom:1px solid var(--border);color:var(--indigo);';
        link.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;margin-right:6px;">account_circle</span>Mon Espace Parent';
        drawer.prepend(link);
      }
      const drawerLogin = drawer.querySelector('.drawer-connexion');
      if (drawerLogin) drawerLogin.remove();
    }
  } else {
    // Not logged in
    if (navActions) {
      const espaceBtn = navActions.querySelector('.client-nav-espace');
      if (espaceBtn) espaceBtn.remove();

      let loginBtn = navActions.querySelector('.client-nav-login');
      if (!loginBtn) {
        loginBtn = document.createElement('a');
        loginBtn.href = '/connexion';
        loginBtn.className = 'client-nav-track client-nav-login';
        loginBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;';
        loginBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">login</span> Connexion`;
        navActions.prepend(loginBtn);
      }
    }
    if (drawer) {
      const drawerEspace = drawer.querySelector('.drawer-mon-espace');
      if (drawerEspace) drawerEspace.remove();

      if (!drawer.querySelector('.drawer-connexion')) {
        const link = document.createElement('a');
        link.href = '/connexion';
        link.className = 'client-nav-link drawer-connexion';
        link.style.cssText = 'padding:10px 0;font-size:15px;font-weight:600;border-bottom:1px solid var(--border);color:var(--indigo);';
        link.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;margin-right:6px;">login</span>Connexion Parent';
        drawer.prepend(link);
      }
    }
  }
}

// ── CONNEXION (LOGIN & REGISTRATION) ──
function initConnexion() {
  const token = localStorage.getItem('vs_client_token');
  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get('redirect') || '/mon-espace';

  // Preserve intended offering if provided in query params
  const levelParam = params.get('level') || params.get('levelId');
  const schoolParam = params.get('school') || params.get('schoolId');
  const choiceParam = params.get('choice') || params.get('choiceId');
  if (levelParam || schoolParam || choiceParam) {
    try {
      sessionStorage.setItem('vs_intended_offering', JSON.stringify({
        levelId: levelParam,
        schoolId: schoolParam,
        choiceId: choiceParam
      }));
    } catch {}
  }

  // If already logged in, redirect directly
  if (token) {
    if (!document.cookie.includes('vs_client_session=')) {
      document.cookie = 'vs_client_session=' + encodeURIComponent(token) + '; path=/; max-age=28800; SameSite=Lax';
    }
    window.location.href = redirectUrl;
    return;
  }

  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const switchLogin = document.getElementById('auth-switch-login');
  const switchRegister = document.getElementById('auth-switch-register');
  const switchToRegister = document.getElementById('switch-to-register');
  const switchToLogin = document.getElementById('switch-to-login');
  const alertBox = document.getElementById('auth-alert');
  const alertMsg = document.getElementById('auth-alert-msg');
  const alertIcon = document.getElementById('auth-alert-icon');

  function showAlert(msg, type = 'error') {
    if (!alertBox) return;
    alertBox.className = `auth-alert ${type} visible`;
    if (alertIcon) alertIcon.textContent = type === 'error' ? 'error' : 'check_circle';
    if (alertMsg) alertMsg.textContent = msg;
  }

  function hideAlert() {
    if (alertBox) alertBox.className = 'auth-alert';
  }

  function activateTab(tab) {
    hideAlert();
    if (tab === 'register') {
      tabRegister?.classList.add('active');
      tabLogin?.classList.remove('active');
      formRegister?.classList.add('active');
      formLogin?.classList.remove('active');
      if (switchLogin) switchLogin.style.display = 'none';
      if (switchRegister) switchRegister.style.display = 'block';
    } else {
      tabLogin?.classList.add('active');
      tabRegister?.classList.remove('active');
      formLogin?.classList.add('active');
      formRegister?.classList.remove('active');
      if (switchLogin) switchLogin.style.display = 'block';
      if (switchRegister) switchRegister.style.display = 'none';
    }
  }

  tabLogin?.addEventListener('click', () => activateTab('login'));
  tabRegister?.addEventListener('click', () => activateTab('register'));
  switchToRegister?.addEventListener('click', () => activateTab('register'));
  switchToLogin?.addEventListener('click', () => activateTab('login'));

  if (params.get('tab') === 'register') {
    activateTab('register');
  }

  // Password visibility toggle buttons
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = isPassword ? 'visibility_off' : 'visibility';
    });
  });

  // Handle Login Form Submit
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    const btn = document.getElementById('btn-login');
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) {
      showAlert('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<div style="width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div> Connexion en cours…`;
    }

    try {
      const res = await fetch(`${API_BASE}/public/client/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.message || 'Identifiants de connexion invalides.');
      }

      localStorage.setItem('vs_client_token', data.data.token);
      localStorage.setItem('vs_client_user', JSON.stringify(data.data.user));
      document.cookie = 'vs_client_session=' + encodeURIComponent(data.data.token) + '; path=/; max-age=28800; SameSite=Lax';

      showToast(`Connexion réussie ! Bienvenue ${data.data.user.firstName || ''}`, 'success');

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 400);
    } catch (err) {
      showAlert(err.message || 'Une erreur est survenue lors de la connexion.');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined">login</span> Se connecter`;
      }
    }
  });

  // Handle Register Form Submit
  formRegister?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    const btn = document.getElementById('btn-register');
    const lastName = document.getElementById('reg-lastname')?.value.trim();
    const firstName = document.getElementById('reg-firstname')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const phone = document.getElementById('reg-phone')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const passwordConfirm = document.getElementById('reg-password-confirm')?.value;
    const address = document.getElementById('reg-address')?.value?.trim() || '';
    const wilaya = document.getElementById('reg-wilaya')?.value?.trim() || '';
    const commune = document.getElementById('reg-commune')?.value?.trim() || '';

    if (!lastName || !firstName || !email || !password) {
      showAlert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (password.length < 6) {
      showAlert('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (password !== passwordConfirm) {
      showAlert('Les mots de passe ne correspondent pas.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<div style="width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div> Création du compte…`;
    }

    try {
      const res = await fetch(`${API_BASE}/public/client/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName, phone, address, wilaya, commune })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.message || 'Impossible de créer le compte.');
      }

      localStorage.setItem('vs_client_token', data.data.token);
      localStorage.setItem('vs_client_user', JSON.stringify(data.data.user));
      document.cookie = 'vs_client_session=' + encodeURIComponent(data.data.token) + '; path=/; max-age=28800; SameSite=Lax';

      showToast('Votre compte parent a été créé avec succès !', 'success');

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
    } catch (err) {
      showAlert(err.message || 'Une erreur est survenue lors de l’inscription.');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined">person_add</span> Créer mon compte`;
      }
    }
  });
}

// ── MON ESPACE (PARENT DASHBOARD & PROFILE) ──
async function initMonEspace() {
  const token = localStorage.getItem('vs_client_token');
  if (!token) {
    window.location.href = '/connexion?redirect=' + encodeURIComponent(window.location.pathname);
    return;
  }

  // Ensure cookie is synced
  if (!document.cookie.includes('vs_client_session=')) {
    document.cookie = 'vs_client_session=' + encodeURIComponent(token) + '; path=/; max-age=28800; SameSite=Lax';
  }

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('vs_client_user') || 'null');
  } catch {}

  const header = document.getElementById('dashboard-header');
  const greeting = document.getElementById('dashboard-greeting');
  const avatar = document.getElementById('dashboard-avatar');
  const btnLogout = document.getElementById('btn-logout');
  const loading = document.getElementById('dashboard-loading');
  const statsContainer = document.getElementById('dashboard-stats');
  const regContainer = document.getElementById('dashboard-registrations');
  const regList = document.getElementById('reg-list');
  const emptyContainer = document.getElementById('dashboard-empty');
  const tabInscriptions = document.getElementById('tab-btn-inscriptions');
  const tabProfil = document.getElementById('tab-btn-profil');
  const secInscriptions = document.getElementById('section-inscriptions');
  const secProfil = document.getElementById('section-profil');
  const tabCount = document.getElementById('tab-count-inscriptions');

  if (header) header.style.display = 'block';

  function updateHeaderUser(u) {
    if (!u) return;
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Parent';
    if (greeting) greeting.textContent = `Bonjour, ${fullName}`;
    if (avatar) avatar.textContent = (u.firstName || u.email || 'P').charAt(0).toUpperCase();
  }
  updateHeaderUser(user);

  // Tab switching
  tabInscriptions?.addEventListener('click', () => {
    tabInscriptions.classList.add('active');
    tabProfil?.classList.remove('active');
    if (secInscriptions) secInscriptions.style.display = 'block';
    if (secProfil) secProfil.style.display = 'none';
  });

  tabProfil?.addEventListener('click', () => {
    tabProfil.classList.add('active');
    tabInscriptions?.classList.remove('active');
    if (secProfil) secProfil.style.display = 'block';
    if (secInscriptions) secInscriptions.style.display = 'none';
  });

  // Modal elements
  const modal = document.getElementById('dossier-modal');
  const modalClose = document.getElementById('modal-btn-close');
  function closeModal() {
    modal?.classList.remove('open');
  }
  modalClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) closeModal();
  });

  // Logout Handler
  btnLogout?.addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE}/public/client/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch {}
    localStorage.removeItem('vs_client_token');
    localStorage.removeItem('vs_client_user');
    document.cookie = 'vs_client_session=; path=/; max-age=0';
    showToast('Déconnexion réussie.', 'info');
    setTimeout(() => {
      window.location.href = '/connexion';
    }, 400);
  });

  // Load Parent Profile & sync inputs
  async function loadParentProfile() {
    try {
      const res = await fetch(`${API_BASE}/public/client/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          user = json.data;
          localStorage.setItem('vs_client_user', JSON.stringify(user));
          updateHeaderUser(user);

          const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
          };
          setVal('prof-firstname', user.firstName);
          setVal('prof-lastname', user.lastName);
          setVal('prof-email', user.email);
          setVal('prof-phone', user.phone);
          setVal('prof-address', user.address);
          setVal('prof-wilaya', user.wilaya);
          setVal('prof-commune', user.commune);
        }
      }
    } catch (err) {
      console.warn('Could not load parent profile:', err);
    }
  }
  loadParentProfile();

  // Profile Form Submission
  const formProfile = document.getElementById('form-profile');
  formProfile?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-profile');
    if (btn) btn.disabled = true;

    const payload = {
      firstName: document.getElementById('prof-firstname')?.value.trim(),
      lastName: document.getElementById('prof-lastname')?.value.trim(),
      phone: document.getElementById('prof-phone')?.value.trim(),
      address: document.getElementById('prof-address')?.value.trim(),
      wilaya: document.getElementById('prof-wilaya')?.value.trim(),
      commune: document.getElementById('prof-commune')?.value.trim(),
    };

    try {
      const res = await fetch(`${API_BASE}/public/client/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        user = { ...user, ...data.data };
        localStorage.setItem('vs_client_user', JSON.stringify(user));
        updateHeaderUser(user);
        showToast('Vos coordonnées ont été mises à jour avec succès !', 'success');
      } else {
        showToast(data.error?.message || 'Erreur lors de la mise à jour.', 'error');
      }
    } catch (err) {
      showToast('Erreur de connexion avec le serveur.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Password Change Form Submission
  const formPassword = document.getElementById('form-change-password');
  formPassword?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('pwd-current')?.value;
    const newPassword = document.getElementById('pwd-new')?.value;
    const confirmPassword = document.getElementById('pwd-confirm')?.value;

    if (newPassword !== confirmPassword) {
      showToast('Les nouveaux mots de passe ne correspondent pas.', 'error');
      return;
    }

    const btn = document.getElementById('btn-change-pwd');
    if (btn) btn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/public/client/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Mot de passe mis à jour avec succès !', 'success');
        formPassword.reset();
      } else {
        showToast(data.error?.message || 'Erreur lors du changement de mot de passe.', 'error');
      }
    } catch (err) {
      showToast('Erreur de communication avec le serveur.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Status mapping
  const statusConfig = {
    NEW: { label: 'Reçue', badgeClass: 'status-new', icon: 'mark_email_read' },
    SUBMITTED: { label: 'Reçue', badgeClass: 'status-new', icon: 'mark_email_read' },
    UNDER_REVIEW: { label: 'En cours d\'étude', badgeClass: 'status-review', icon: 'hourglass_empty' },
    PENDING: { label: 'En attente d\'évaluation', badgeClass: 'status-pending', icon: 'pending' },
    ACCEPTED: { label: 'Acceptée', badgeClass: 'status-accepted', icon: 'check_circle' },
    REFUSED: { label: 'Non retenue', badgeClass: 'status-refused', icon: 'cancel' },
    WAITLISTED: { label: 'Liste d\'attente', badgeClass: 'status-waitlist', icon: 'access_time' },
    CANCELLED: { label: 'Annulée', badgeClass: 'status-cancelled', icon: 'block' }
  };

  // Open Dossier Detail Modal
  async function openDossierModal(dossierId) {
    if (!modal) return;
    modal.classList.add('open');

    const modalCode = document.getElementById('modal-dossier-code');
    const modalStudent = document.getElementById('modal-student-name');
    const modalStatusCard = document.getElementById('modal-status-card');
    const modalStatusIcon = document.getElementById('modal-status-icon');
    const modalStatusTitle = document.getElementById('modal-status-title');
    const modalStatusDesc = document.getElementById('modal-status-desc');
    const modalDob = document.getElementById('modal-student-dob');
    const modalGender = document.getElementById('modal-student-gender');
    const modalPlace = document.getElementById('modal-student-place');
    const modalPrev = document.getElementById('modal-student-prev');
    const modalSchool = document.getElementById('modal-school-name');
    const modalLevel = document.getElementById('modal-level-name');
    const modalChoice = document.getElementById('modal-choice-name');
    const modalYear = document.getElementById('modal-year-name');
    const modalDocs = document.getElementById('modal-docs-list');

    if (modalStatusTitle) modalStatusTitle.textContent = 'Chargement du dossier…';
    if (modalStatusDesc) modalStatusDesc.textContent = 'Veuillez patienter…';
    if (modalDocs) modalDocs.innerHTML = '<div class="text-xs text-muted" style="padding:10px;">Chargement des pièces justificatives…</div>';

    try {
      const res = await fetch(`${API_BASE}/public/client/registrations/${dossierId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message || 'Dossier introuvable.');
      }

      const d = json.data;
      const s = d.student || {};
      const st = d.status || 'NEW';

      if (modalCode) modalCode.textContent = d.registrationCode || 'N/A';
      if (modalStudent) modalStudent.textContent = `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Élève';
      if (modalDob) modalDob.textContent = s.birthDate ? new Date(s.birthDate).toLocaleDateString('fr-FR') : '—';
      if (modalGender) modalGender.textContent = s.gender === 'FEMALE' ? 'Féminin' : 'Masculin';
      if (modalPlace) modalPlace.textContent = s.birthPlace || '—';
      if (modalPrev) modalPrev.textContent = s.currentSchool || '—';
      if (modalSchool) modalSchool.textContent = d.school?.name || '—';
      if (modalLevel) modalLevel.textContent = d.level?.nameFr || d.level?.name || '—';
      if (modalChoice) modalChoice.textContent = d.choice?.nameFr || d.choice?.name || 'Standard';
      if (modalYear) modalYear.textContent = d.academicYear?.name || '2026-2027';

      // Explanatory Status Card
      if (modalStatusCard) {
        modalStatusCard.className = 'status-explainer';
        if (st === 'ACCEPTED') {
          modalStatusCard.classList.add('accepted');
          if (modalStatusIcon) modalStatusIcon.innerHTML = '<span class="material-symbols-outlined">check_circle</span>';
          if (modalStatusTitle) modalStatusTitle.textContent = '🎉 Félicitations ! Inscription Acceptée';
          if (modalStatusDesc) modalStatusDesc.textContent = 'Votre enfant a été admis(e) avec succès à VISION SCHOOL. Veuillez vous rapprocher de l\'administration ou effectuer le règlement des droits d\'inscription pour confirmer définitivement sa place.';
        } else if (st === 'REFUSED') {
          modalStatusCard.classList.add('refused');
          if (modalStatusIcon) modalStatusIcon.innerHTML = '<span class="material-symbols-outlined">cancel</span>';
          if (modalStatusTitle) modalStatusTitle.textContent = 'Candidature non retenue';
          if (modalStatusDesc) modalStatusDesc.textContent = 'Nous regrettons de vous informer que la candidature n\'a pas été retenue pour cette session en raison du nombre limité de places disponibles. L\'équipe des admissions reste à votre disposition pour tout échange.';
        } else if (st === 'WAITLISTED') {
          modalStatusCard.classList.add('waitlist');
          if (modalStatusIcon) modalStatusIcon.innerHTML = '<span class="material-symbols-outlined">access_time</span>';
          if (modalStatusTitle) modalStatusTitle.textContent = 'Dossier placé sur Liste d\'attente';
          if (modalStatusDesc) modalStatusDesc.textContent = 'La capacité d\'accueil de ce niveau est actuellement atteinte. Votre dossier est placé en liste d\'attente prioritaire. Vous serez contacté immédiatement dès qu\'un désistement ou une nouvelle place se libère.';
        } else if (st === 'UNDER_REVIEW') {
          modalStatusCard.classList.add('review');
          if (modalStatusIcon) modalStatusIcon.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span>';
          if (modalStatusTitle) modalStatusTitle.textContent = 'Examen en cours';
          if (modalStatusDesc) modalStatusDesc.textContent = 'La commission des admissions étudie actuellement le dossier scolaire de votre enfant. Une décision vous sera communiquée dans un délai de 3 à 5 jours ouvrables.';
        } else {
          modalStatusCard.classList.add('new');
          if (modalStatusIcon) modalStatusIcon.innerHTML = '<span class="material-symbols-outlined">mark_email_read</span>';
          if (modalStatusTitle) modalStatusTitle.textContent = 'Dossier reçu avec succès';
          if (modalStatusDesc) modalStatusDesc.textContent = 'Votre demande est enregistrée dans notre système sous le numéro ' + (d.registrationCode || '') + '. Notre équipe prendra en charge l\'examen de votre candidature sous peu.';
        }
      }

      // Render Documents
      const docs = d.documents || [];
      if (modalDocs) {
        if (docs.length === 0) {
          modalDocs.innerHTML = '<div class="text-xs text-muted" style="padding:10px;">Aucune pièce justificative requise ou transmise.</div>';
        } else {
          modalDocs.innerHTML = docs.map(doc => {
            const isRejected = doc.verificationStatus === 'REJECTED' || doc.status === 'REJECTED';
            const isValidated = doc.verificationStatus === 'VALIDATED' || doc.status === 'VALIDATED' || doc.verificationStatus === 'VERIFIED';
            const badgeClass = isValidated ? 'badge-success' : isRejected ? 'badge-error' : 'badge-pending';
            const badgeLabel = isValidated ? 'Validé' : isRejected ? 'Rejeté' : 'En attente';
            const docTypeName = doc.documentType?.nameFr || doc.name || doc.documentType?.name || 'Document';

            return `
              <div class="doc-item">
                <div class="doc-info">
                  <span class="material-symbols-outlined" style="color:${isValidated ? 'var(--success)' : isRejected ? 'var(--error)' : 'var(--indigo)'};">description</span>
                  <div>
                    <div style="font-size:13.5px;font-weight:600;color:var(--navy);">${docTypeName}</div>
                    <div style="font-size:11.5px;color:var(--text-muted);">${doc.originalName || doc.name || 'Fichier'}</div>
                    ${doc.rejectionReason ? `<div style="font-size:11.5px;color:var(--error);font-weight:500;margin-top:2px;">Motif : ${doc.rejectionReason}</div>` : ''}
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span class="badge ${badgeClass}" style="font-size:11px;padding:3px 8px;">${badgeLabel}</span>
                  ${isRejected ? `
                    <label class="doc-upload-btn">
                      <span class="material-symbols-outlined" style="font-size:15px;">upload_file</span>
                      Remplacer
                      <input type="file" class="hidden doc-replace-input" data-reg-id="${d.id}" data-doc-type="${doc.documentTypeId || doc.id}" accept=".pdf,.jpg,.jpeg,.png"/>
                    </label>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('');

          // Wire replacement file inputs
          modalDocs.querySelectorAll('.doc-replace-input').forEach(input => {
            input.addEventListener('change', async () => {
              if (!input.files || !input.files[0]) return;
              const file = input.files[0];
              const regId = input.getAttribute('data-reg-id');
              const docTypeId = input.getAttribute('data-doc-type');

              const reader = new FileReader();
              reader.onload = async () => {
                const base64Data = reader.result;
                try {
                  showToast('Téléversement du nouveau document…', 'info');
                  const upRes = await fetch(`${API_BASE}/public/client/registrations/${regId}/documents/${docTypeId}`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      name: file.name,
                      mimeType: file.type || 'application/pdf',
                      sizeBytes: file.size,
                      base64Data
                    })
                  });
                  const upData = await upRes.json();
                  if (upRes.ok && upData.success) {
                    showToast('Document remplacé avec succès !', 'success');
                    openDossierModal(regId); // refresh
                  } else {
                    showToast(upData.error?.message || 'Erreur lors du remplacement du document.', 'error');
                  }
                } catch (e) {
                  showToast('Erreur de connexion.', 'error');
                }
              };
              reader.readAsDataURL(file);
            });
          });
        }
      }

    } catch (err) {
      if (modalStatusTitle) modalStatusTitle.textContent = 'Erreur';
      if (modalStatusDesc) modalStatusDesc.textContent = err.message || 'Impossible de charger le dossier.';
    }
  }

  // Fetch Parent Registrations
  try {
    const res = await fetch(`${API_BASE}/public/client/registrations`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      localStorage.removeItem('vs_client_token');
      localStorage.removeItem('vs_client_user');
      document.cookie = 'vs_client_session=; path=/; max-age=0';
      window.location.href = '/connexion?redirect=/mon-espace';
      return;
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || 'Erreur lors du chargement des dossiers.');
    }

    const dossiers = data.data || [];
    if (loading) loading.style.display = 'none';

    if (tabCount) tabCount.textContent = dossiers.length;

    // Compute Stats
    const total = dossiers.length;
    const accepted = dossiers.filter(d => d.status === 'ACCEPTED').length;
    const pending = dossiers.filter(d => ['NEW', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(d.status)).length;
    const waitlisted = dossiers.filter(d => d.status === 'WAITLISTED').length;

    // Render Stats Cards
    if (statsContainer) {
      statsContainer.style.display = 'grid';
      statsContainer.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon total"><span class="material-symbols-outlined">folder</span></div>
          <div>
            <div class="stat-value">${total}</div>
            <div class="stat-label">Total candidatures</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon pending"><span class="material-symbols-outlined">hourglass_empty</span></div>
          <div>
            <div class="stat-value">${pending}</div>
            <div class="stat-label">En cours d'étude</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon accepted"><span class="material-symbols-outlined">check_circle</span></div>
          <div>
            <div class="stat-value">${accepted}</div>
            <div class="stat-label">Admissions acceptées</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon waitlisted"><span class="material-symbols-outlined">schedule</span></div>
          <div>
            <div class="stat-value">${waitlisted}</div>
            <div class="stat-label">Liste d'attente</div>
          </div>
        </div>
      `;
    }

    if (dossiers.length === 0) {
      if (emptyContainer) emptyContainer.style.display = 'block';
      if (regContainer) regContainer.style.display = 'none';
      if (statsContainer) statsContainer.style.display = 'none';
      return;
    }

    // Render Dossiers List
    if (regContainer) regContainer.style.display = 'block';
    if (emptyContainer) emptyContainer.style.display = 'none';

    if (regList) {
      regList.innerHTML = dossiers.map(d => {
        const conf = statusConfig[d.status] || { label: d.status, badgeClass: 'status-new', icon: 'info' };
        const studentName = d.student ? `${d.student.firstName} ${d.student.lastName}` : 'Élève';
        const levelName = d.level?.nameFr || d.level?.name || 'Niveau standard';
        const schoolName = d.school?.name || 'Campus Principal';
        const yearName = d.academicYear?.name || '2026-2027';
        const dateStr = d.createdAt
          ? new Date(d.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Récemment';

        return `
          <div class="reg-card">
            <div class="reg-card-inner">
              <div class="reg-card-info">
                <div class="reg-card-top">
                  <span class="reg-code">${d.registrationCode || 'VS-000000'}</span>
                  <span class="status-badge ${conf.badgeClass}">
                    <span class="material-symbols-outlined" style="font-size:14px;">${conf.icon}</span>
                    ${conf.label}
                  </span>
                </div>
                <div class="reg-student">${studentName}</div>
                <div class="reg-meta">
                  <span class="reg-meta-item">
                    <span class="material-symbols-outlined">location_on</span>
                    ${schoolName}
                  </span>
                  <span class="reg-meta-item">
                    <span class="material-symbols-outlined">school</span>
                    ${levelName}
                  </span>
                  <span class="reg-meta-item">
                    <span class="material-symbols-outlined">event</span>
                    ${yearName}
                  </span>
                </div>
              </div>
              <div class="reg-card-right">
                <div class="reg-date">Déposé le ${dateStr}</div>
                <button class="btn btn-navy btn-sm btn-open-dossier" data-id="${d.id}" style="font-size:13px;padding:8px 16px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                  <span class="material-symbols-outlined" style="font-size:16px;">visibility</span>
                  Voir le dossier
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Wire open dossier buttons
      regList.querySelectorAll('.btn-open-dossier').forEach(btn => {
        btn.addEventListener('click', () => {
          const did = btn.getAttribute('data-id');
          if (did) openDossierModal(did);
        });
      });
    }

  } catch (err) {
    if (loading) {
      loading.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:32px;color:var(--error);">error</span>
        <span style="color:var(--error);">${err.message || 'Erreur lors du chargement des dossiers.'}</span>
        <button class="btn btn-navy" onclick="location.reload()" style="font-size:13px;padding:8px 16px;margin-top:8px;">Réessayer</button>
      `;
    }
  }
}

// ── NIVEAUX & ADMISSIONS (DYNAMIC OFFERINGS) ──
async function initNiveauxAdmissions() {
  const container = document.getElementById('levels-container');
  if (!container) return;

  const cycleButtons = document.querySelectorAll('.cycle-btn');

  function normalizeCycle(cycleCode) {
    if (!cycleCode) return 'primaire';
    const c = cycleCode.toUpperCase();
    if (c.includes('MATERN') || c.includes('PREP') || c.includes('EVEIL')) return 'preparatoire';
    if (c.includes('PRIM')) return 'primaire';
    if (c.includes('MOYEN') || c.includes('COLLEGE')) return 'moyen';
    if (c.includes('SECOND') || c.includes('LYCEE')) return 'secondaire';
    return 'primaire';
  }

  function formatTariff(tariffs) {
    if (!tariffs || tariffs.length === 0) return 'Sur demande';
    const active = tariffs[0];
    if (active.messageFr && !active.amount) return active.messageFr;
    if (active.amount) {
      const num = Number(active.amount).toLocaleString('fr-DZ');
      return `${num} ${active.currency || 'DZD'} <span style="font-size:11px;font-weight:normal;color:var(--text-muted);">/ an</span>`;
    }
    return 'Sur demande';
  }

  function renderRequirementsList(reqs) {
    if (!reqs || reqs.length === 0) {
      return `
        <div style="padding-top:10px;border-top:1px solid var(--border);">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">Pièces à fournir :</div>
          <div style="font-size:12.5px;color:var(--text-muted);font-style:italic;">Dossier standard (bulletins, état civil)</div>
        </div>
      `;
    }
    const items = reqs.slice(0, 3).map(r => `<li>${r.nameFr}</li>`).join('');
    return `
      <div style="padding-top:10px;border-top:1px solid var(--border);">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">Pièces à fournir :</div>
        <ul style="font-size:12.5px;color:var(--text-muted);padding-left:18px;margin:0;line-height:1.6;">
          ${items}
        </ul>
      </div>
    `;
  }

  try {
    const res = await fetch(`${API_BASE}/public/admission-offerings`);
    if (!res.ok) throw new Error('Impossible de charger les niveaux');
    const json = await res.json();
    const offerings = json.data || [];

    if (offerings.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:48px 24px;background:var(--surface);border:1px dashed var(--border);border-radius:var(--r-xl);">
          <span class="material-symbols-outlined" style="font-size:36px;color:var(--text-subtle);margin-bottom:12px;">school</span>
          <div style="font-size:16px;font-weight:700;color:var(--navy);margin-bottom:6px;">Aucune offre disponible pour le moment</div>
          <p style="font-size:14px;color:var(--text-muted);">Les campagnes d'admission ouvriront prochainement. N'hésitez pas à nous contacter.</p>
        </div>
      `;
      return;
    }

    const token = localStorage.getItem('vs_client_token');

    container.innerHTML = offerings.map(o => {
      const cycleKey = normalizeCycle(o.cycleCode);
      const isOpen = o.capacity?.isRegistrationOpen !== false && o.capacity?.operationalState !== 'CLOSED';
      const statusClass = isOpen ? 'status-open' : 'status-limited';
      const badgeClass = o.capacity?.operationalState === 'OPEN'
        ? 'badge-success'
        : o.capacity?.operationalState === 'FULL_WAITLIST'
        ? 'badge-warning'
        : 'badge-error';
      const statusText = o.capacity?.statusLabel || (isOpen ? 'Admissions ouvertes' : 'Complet');

      const remainingText = o.capacity?.remainingPlaces != null
        ? `${o.capacity.remainingPlaces} places restantes`
        : (isOpen ? 'Places disponibles' : 'Liste d’attente');

      const campusText = o.schoolName ? `${o.schoolName}` : 'Campus Alger';

      const targetUrl = token
        ? `/inscription?level=${encodeURIComponent(o.levelId)}&schoolId=${encodeURIComponent(o.schoolId || '')}`
        : `/connexion?redirect=${encodeURIComponent('/inscription?level=' + o.levelId + '&schoolId=' + (o.schoolId || ''))}`;

      return `
        <article class="level-card-item ${statusClass}" data-cycle="${cycleKey}">
          <div class="level-card-header">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span class="badge ${badgeClass}">${statusText}</span>
              <span style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:4px;">
                <span class="material-symbols-outlined" style="font-size:14px;">location_on</span> ${campusText}
              </span>
            </div>
            <h2 style="font-size:20px;font-weight:800;color:var(--navy);margin-bottom:4px;">${o.levelNameFr} (${o.levelCode})</h2>
            <div style="font-size:13px;color:var(--indigo);font-weight:600;">Cycle : ${o.cycleNameFr || o.cycleCode}</div>
          </div>
          <div class="level-card-body">
            <div style="display:flex;justify-content:space-between;font-size:14px;">
              <span style="color:var(--text-muted);">Scolarité annuelle :</span>
              <strong style="color:var(--navy);font-size:15px;">${formatTariff(o.tariffs)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:14px;">
              <span style="color:var(--text-muted);">Disponibilité :</span>
              <strong style="color:${isOpen ? 'var(--success)' : 'var(--warning)'};">${remainingText}</strong>
            </div>
            ${renderRequirementsList(o.requirements)}
          </div>
          <div class="level-card-footer">
            <a href="${targetUrl}" class="btn btn-navy w-full" style="padding:10px;font-size:14px;text-align:center;display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;">
              <span class="material-symbols-outlined">edit</span>
              Inscrire pour ce niveau
            </a>
          </div>
        </article>
      `;
    }).join('');

    // Setup interactive cycle chips
    const cards = container.querySelectorAll('.level-card-item');
    cycleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        cycleButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const selectedCycle = btn.getAttribute('data-cycle');
        cards.forEach(card => {
          const cardCycle = card.getAttribute('data-cycle');
          if (selectedCycle === 'all' || cardCycle === selectedCycle) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

  } catch (err) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px 24px;">
        <span class="material-symbols-outlined" style="font-size:36px;color:var(--error);margin-bottom:12px;">error</span>
        <div style="font-size:15px;color:var(--error);margin-bottom:8px;">Erreur lors du chargement des niveaux d'admission.</div>
        <button class="btn btn-navy" onclick="location.reload()" style="font-size:13px;padding:8px 16px;">Réessayer</button>
      </div>
    `;
  }
}

// ── DYNAMIC CONTACT PAGE INITIALIZATION ──
async function initContactPage() {
  const phoneLink = document.getElementById('contact-channel-phone-link');
  const waLink = document.getElementById('contact-channel-whatsapp-link');
  const waCard = document.getElementById('card-channel-whatsapp');
  const emailLink = document.getElementById('contact-channel-email-link');
  const campusesContainer = document.getElementById('campuses-container');
  const campusSelect = document.getElementById('contact-campus');
  const form = document.getElementById('public-contact-form');
  const alertBanner = document.getElementById('contact-form-alert');
  const submitBtn = document.getElementById('btn-submit-contact');

  let settings = {};
  let schools = [];

  try {
    const [bRes, sRes] = await Promise.all([
      fetch(`${API_BASE}/public/branding?t=${Date.now()}`),
      fetch(`${API_BASE}/public/schools?t=${Date.now()}`)
    ]);

    if (bRes.ok) {
      const bData = await bRes.json();
      if (bData.success && bData.data) settings = bData.data;
    }

    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData.success && Array.isArray(sData.data)) schools = sData.data;
    }
  } catch (err) {
    console.warn('[ContactPage] Error loading public contact data:', err);
  }

  // 1. Update Direct Channel Cards
  const primaryPhone = settings.contactPhone || (schools.find(s => s.phonePrimary)?.phonePrimary);
  if (phoneLink) {
    if (primaryPhone) {
      phoneLink.textContent = primaryPhone;
      phoneLink.href = `tel:${primaryPhone.replace(/\s+/g, '')}`;
    } else {
      phoneLink.textContent = 'Non configuré';
      phoneLink.removeAttribute('href');
    }
  }

  const primaryWhatsapp = (schools.find(s => s.whatsapp)?.whatsapp) || settings.contactPhone;
  if (waLink) {
    if (primaryWhatsapp) {
      const cleanWa = primaryWhatsapp.replace(/[^0-9]/g, '');
      waLink.href = `https://wa.me/${cleanWa}`;
      waLink.textContent = 'Écrire sur WhatsApp';
    } else if (waCard) {
      waCard.style.opacity = '0.6';
      waLink.textContent = 'Non configuré';
      waLink.removeAttribute('href');
    }
  }

  const primaryEmail = settings.contactEmail || (schools.find(s => s.emailPrimary)?.emailPrimary);
  if (emailLink) {
    if (primaryEmail) {
      emailLink.textContent = primaryEmail;
      emailLink.href = `mailto:${primaryEmail}`;
    } else {
      emailLink.textContent = 'Non configuré';
      emailLink.removeAttribute('href');
    }
  }

  // 2. Render Campuses & Real Maps
  if (campusesContainer) {
    const listToRender = schools.length > 0 ? schools : [{
      id: 'default',
      name: settings.siteName || 'Campus Principal',
      address: settings.contactAddress || 'Alger, Algérie',
      wilaya: settings.contactWilaya || 'Alger',
      commune: settings.contactCommune || '',
      phonePrimary: settings.contactPhone || null,
      emailPrimary: settings.contactEmail || null,
      latitude: settings.contactLatitude || null,
      longitude: settings.contactLongitude || null,
      googleMapsUrl: settings.contactGoogleMapsUrl || null
    }];

    campusesContainer.innerHTML = listToRender.map(s => {
      let query = '';
      if (s.latitude && s.longitude) {
        query = `${s.latitude},${s.longitude}`;
      } else if (s.address) {
        query = encodeURIComponent(`${s.address}${s.wilaya ? ', ' + s.wilaya : ''}`);
      } else if (settings.contactLatitude && settings.contactLongitude) {
        query = `${settings.contactLatitude},${settings.contactLongitude}`;
      } else if (settings.contactAddress) {
        query = encodeURIComponent(`${settings.contactAddress}${settings.contactWilaya ? ', ' + settings.contactWilaya : ''}`);
      } else {
        query = encodeURIComponent('Alger, Algerie');
      }

      let directionsUrl = s.googleMapsUrl && s.googleMapsUrl.startsWith('http') ? s.googleMapsUrl : null;
      if (!directionsUrl && s.latitude && s.longitude) {
        directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`;
      } else if (!directionsUrl && s.address) {
        directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address + (s.wilaya ? ', ' + s.wilaya : ''))}`;
      } else if (!directionsUrl && settings.contactGoogleMapsUrl) {
        directionsUrl = settings.contactGoogleMapsUrl;
      } else if (!directionsUrl) {
        directionsUrl = 'https://maps.google.com';
      }

      const displayAddress = s.address || settings.contactAddress || 'Adresse disponible sur demande';
      const locality = [s.commune, s.wilaya].filter(Boolean).join(', ');

      return `
        <div class="campus-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
            <div>
              <div style="font-size:18px;font-weight:700;color:var(--navy);">${s.name}</div>
              <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${locality || 'Établissement Scolaire'}</div>
            </div>
            <span class="badge badge-success">Ouvert</span>
          </div>

          <div style="height:240px;border-radius:var(--r-lg);overflow:hidden;border:1px solid var(--border);margin-bottom:16px;background:var(--navy-50);">
            <iframe width="100%" height="240" style="border:0;display:block;" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${query}&hl=fr&z=15&output=embed"></iframe>
          </div>

          <div style="font-size:14px;color:var(--text-secondary);display:flex;flex-direction:column;gap:8px;line-height:1.5;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="material-symbols-outlined" style="font-size:18px;color:var(--indigo);">location_on</span>
              <span>${displayAddress}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="material-symbols-outlined" style="font-size:18px;color:var(--indigo);">schedule</span>
              <span>Dimanche – Jeudi : 08h00 – 16h30</span>
            </div>
            ${s.phonePrimary ? `
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="material-symbols-outlined" style="font-size:18px;color:var(--indigo);">call</span>
              <a href="tel:${s.phonePrimary.replace(/\s+/g, '')}" style="color:inherit;text-decoration:none;font-weight:600;">${s.phonePrimary}</a>
            </div>` : ''}
            ${s.emailPrimary ? `
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="material-symbols-outlined" style="font-size:18px;color:var(--indigo);">mail</span>
              <a href="mailto:${s.emailPrimary}" style="color:inherit;text-decoration:none;">${s.emailPrimary}</a>
            </div>` : ''}
          </div>

          <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;">
            <a href="${directionsUrl}" target="_blank" class="btn btn-outline btn-sm" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;">
              <span class="material-symbols-outlined" style="font-size:16px;">directions</span>
              <span>Itinéraire Google Maps</span>
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  // 3. Populate Campus Select in Form
  if (campusSelect && schools.length > 0) {
    campusSelect.innerHTML = '<option value="">Sélectionner un campus (optionnel)</option>' +
      schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  }

  // 4. Contact Form Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('contact-name')?.value.trim();
      const phone = document.getElementById('contact-phone')?.value.trim();
      const email = document.getElementById('contact-email')?.value.trim();
      const schoolId = document.getElementById('contact-campus')?.value || undefined;
      const subject = document.getElementById('contact-subject')?.value || 'OTHER';
      const message = document.getElementById('contact-message')?.value.trim();

      if (!fullName || !phone || !message) {
        if (alertBanner) {
          alertBanner.className = 'alert alert-danger';
          alertBanner.textContent = 'Veuillez renseigner votre nom, votre numéro de téléphone et votre message.';
          alertBanner.classList.remove('hidden');
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span><span>Envoi en cours…</span>';
      }

      try {
        const res = await fetch(`${API_BASE}/public/content/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, phone, email: email || undefined, schoolId, subject, message })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (alertBanner) {
            alertBanner.className = 'alert alert-success';
            alertBanner.innerHTML = `<strong>Merci ${fullName} !</strong> Votre message a bien été transmis à l’établissement. Nous vous répondrons sous 24h ouvrées.`;
            alertBanner.classList.remove('hidden');
          }
          form.reset();
        } else {
          throw new Error(data.error?.message || 'Erreur lors de l’envoi de votre message.');
        }
      } catch (err) {
        if (alertBanner) {
          alertBanner.className = 'alert alert-danger';
          alertBanner.textContent = err.message || 'Impossible d’envoyer le message. Veuillez vérifier votre connexion.';
          alertBanner.classList.remove('hidden');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span class="material-symbols-outlined">send</span><span>Envoyer mon message</span>';
        }
      }
    });
  }
}

