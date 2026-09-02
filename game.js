(async () => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const svgIcon = (name, className = '') => `<svg class="ui-icon ${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const bootRoot = $('#start .start-shell');
  let THREE;

  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
  } catch (error) {
    bootRoot.innerHTML = `
      <section class="brief-card boot-error">
        <div class="status-chip danger"><span></span> Не удалось загрузить 3D-движок</div>
        <h1>Проверьте подключение<br><em>и обновите страницу</em></h1>
        <p class="lead">Для первой загрузки тура нужен доступ к CDN jsDelivr. После восстановления сети нажмите «Повторить».</p>
        <button type="button" onclick="location.reload()"><span>Повторить загрузку</span></button>
      </section>`;
    console.warn('ПрофТур 3D: библиотека Three.js недоступна.', error);
    return;
  }

  const ui = {
    start: $('#start'), startBtn: $('#startBtn'), hud: $('#hud'),
    progressFill: $('#progress-fill'), progressLabel: $('#progress-label'),
    zone: $('#zone-label'), task: $('#task-title'), details: $('#task-details'), distance: $('#objective-distance'),
    safety: $('#safety-value'), quality: $('#quality-value'), careers: $('#career-value'), line: $('#line-state'),
    prompt: $('#interaction-prompt'), promptKey: $('#interaction-key'), promptText: $('#interaction-text'), promptLabel: $('#interaction-label'),
    interact: $('#interact'), joystick: $('#joystick'), stick: $('#stick'), look: $('#lookZone'), run: $('#run'),
    mapBtn: $('#mapBtn'), hintBtn: $('#hintBtn'), soundBtn: $('#soundBtn'), toast: $('#toast'), pointerTip: $('#pointer-tip'),
    modal: $('#modal'), modalPanel: $('#modalPanel'), modalClose: $('#modalClose'), modalEyebrow: $('#modalEyebrow'),
    modalTitle: $('#modalTitle'), modalBody: $('#modalBody'), modalChoices: $('#modalChoices'),
    map: $('#mapOverlay'), mapClose: $('#mapClose'), mapObjective: $('#mapObjective'), playerDot: $('#playerDot'), targetDot: $('#targetDot'),
    final: $('#finalOverlay'), finalSummary: $('#finalSummary'), finalScores: $('#finalScores'),
    careerRecommendations: $('#careerRecommendations'), badgeCount: $('#badgeCount'), badgeGrid: $('#badgeGrid'),
    careerDetailsBtn: $('#careerDetailsBtn'), applyBtn: $('#applyBtn'), restartBtn: $('#restartBtn')
  };

  const TOTAL_STAGES = 12;
  const finePointer = matchMedia('(pointer:fine)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    started: false,
    stage: 0,
    safety: 100,
    quality: 100,
    efficiency: 100,
    lineStatus: 'stopped',
    careers: new Set(),
    scanned: new Set(),
    hazards: new Set(),
    measurements: new Set(),
    ppe: false,
    quizIndex: 0,
    lineSequence: 0,
    lotoSequence: 0,
    repairStep: 0,
    packagingStep: 0,
    sensorAttempts: 0,
    modalOpen: false,
    mapOpen: false,
    completed: false,
    sound: true,
    startedAt: 0,
    tracked: [],
    careerScores: { technologist: 1, safety: 0, operator: 0, mechatronics: 0, lab: 0, logistics: 0 }
  };

  const roles = {
    technologist: {
      icon: 'process', name: 'Инженер-технолог', color: '#7357d9',
      tagline: 'Превращает сырьё в стабильный технологический процесс.',
      duties: 'Задаёт режимы производства, анализирует показатели и улучшает работу линии.',
      skills: ['химия и математика', 'анализ данных', 'системное мышление'],
      study: 'СПО или вуз: химическая технология, процессы и аппараты, автоматизация.',
      start: 'Учебная практика, стажировка технолога или позиция техника-технолога.'
    },
    safety: {
      icon: 'shield', name: 'Специалист по охране труда', color: '#ff795f',
      tagline: 'Замечает риск раньше, чем он становится происшествием.',
      duties: 'Оценивает опасности, проводит инструктажи и контролирует безопасные методы работы.',
      skills: ['наблюдательность', 'нормативы', 'коммуникация'],
      study: 'СПО/вуз по техносферной безопасности или профпереподготовка по охране труда.',
      start: 'Практика в службе ОТ, участие в аудитах безопасности и производственных обходах.'
    },
    operator: {
      icon: 'monitor', name: 'Оператор автоматизированной линии', color: '#52a977',
      tagline: 'Управляет оборудованием и держит процесс в рабочем диапазоне.',
      duties: 'Запускает установку, следит за параметрами и первым реагирует на отклонения.',
      skills: ['внимательность', 'техническое мышление', 'работа с панелями'],
      study: 'СПО по автоматизации, эксплуатации оборудования или технологии производства.',
      start: 'Учебный полигон, производственная практика и стажировка оператором.'
    },
    mechatronics: {
      icon: 'tools', name: 'Мехатроник', color: '#5137af',
      tagline: 'Находит причину сбоя на стыке механики, электрики и автоматики.',
      duties: 'Диагностирует оборудование, заменяет узлы и возвращает линию в работу безопасно.',
      skills: ['физика', 'чтение схем', 'работа с инструментом'],
      study: 'СПО/вуз по мехатронике, робототехнике, электромеханике или автоматизации.',
      start: 'Лабораторный практикум, WorldSkills/«Профессионалы», стажировка ремонтной службы.'
    },
    lab: {
      icon: 'flask', name: 'Лаборант контроля качества', color: '#9a78e8',
      tagline: 'Подтверждает, что продукт соответствует требованиям.',
      duties: 'Отбирает пробы, выполняет измерения и принимает решение о выпуске партии.',
      skills: ['аккуратность', 'химия', 'документирование'],
      study: 'СПО/вуз по аналитическому контролю, химии или химической технологии.',
      start: 'Практика в учебной лаборатории и стажировка в отделе контроля качества.'
    },
    logistics: {
      icon: 'truck', name: 'Производственный логист', color: '#438da8',
      tagline: 'Соединяет сырьё, производство, склад и заказчика.',
      duties: 'Планирует движение материалов, маркировку, хранение и отгрузку продукции.',
      skills: ['системность', 'цифровые системы', 'планирование'],
      study: 'СПО/вуз по логистике, управлению цепями поставок или организации производства.',
      start: 'Практика на складе, работа с WMS/ERP и стажировка в логистическом отделе.'
    }
  };

  const taskDetails = {
    briefing: () => [
      { done: false, text: 'Найдите наставника Андрея Мельникова' },
      { done: false, text: 'Примите маршрут тестовой партии PT-042' }
    ],
    ppe: () => [
      { done: state.ppe, text: 'Каска и защитные очки' },
      { done: state.ppe, text: 'Сигнальный жилет и защита слуха' }
    ],
    safety: () => [0, 1, 2].map((index) => ({ done: index < state.quizIndex, text: ['Аварийный сигнал', 'Ремонт оборудования', 'Разлив в проходе'][index] })),
    receiving: () => [
      ...['pallet-a', 'pallet-b', 'pallet-c'].map((id, index) => ({ done: state.scanned.has(id), text: `Просканировать палету ${String.fromCharCode(65 + index)}` })),
      { done: state.scanned.has('approved'), text: 'Выбрать сырьё для партии PT-042' }
    ],
    line: () => ['Вентиляция', 'Насос подачи', 'Нагрев', 'Конвейер'].map((text, index) => ({ done: index < state.lineSequence, text })),
    hazards: () => [
      { done: state.hazards.has('spill'), text: 'Разлив в проходе' },
      { done: state.hazards.has('guard'), text: 'Открытое ограждение' },
      { done: state.hazards.has('aisle'), text: 'Загромождённый маршрут' }
    ],
    alarm: () => [
      { done: false, text: 'Не продолжать производство' },
      { done: state.lineStatus === 'stopped', text: 'Выполнить аварийную остановку' }
    ],
    loto: () => ['Остановить', 'Отключить питание', 'Установить блокиратор', 'Проверить отсутствие энергии'].map((text, index) => ({ done: index < state.lotoSequence, text })),
    repair: () => [
      { done: state.repairStep > 0, text: 'Определить неисправный датчик' },
      { done: state.repairStep > 1, text: 'Заменить и проверить датчик' }
    ],
    quality: () => [
      { done: state.measurements.has('temperature'), text: 'Температура' },
      { done: state.measurements.has('ph'), text: 'Кислотность pH' },
      { done: state.measurements.has('mass'), text: 'Контрольная масса' },
      { done: state.measurements.has('released'), text: 'Решение о выпуске' }
    ],
    packing: () => [
      { done: state.packagingStep > 0, text: 'Выбрать прослеживаемую этикетку' },
      { done: state.packagingStep > 1, text: 'Назначить маршрут отгрузки' }
    ],
    debrief: () => [
      { done: false, text: 'Передать цифровой отчёт о партии' },
      { done: false, text: 'Получить карьерный профиль' }
    ]
  };

  const stages = [
    { id: 'briefing', zone: 'ПРОХОДНАЯ', title: 'Встретьтесь с наставником', hint: 'Наставник ждёт у проходной. Следуйте к янтарному маяку.' },
    { id: 'ppe', zone: 'ОХРАНА ТРУДА', title: 'Подберите полный комплект СИЗ', hint: 'Шкаф СИЗ находится справа от проходной. В цех без защиты входить нельзя.' },
    { id: 'safety', zone: 'ОХРАНА ТРУДА', title: 'Пройдите ситуационный инструктаж', hint: 'Откройте учебный терминал с пиктограммой щита.' },
    { id: 'receiving', zone: 'ПРИЁМКА СЫРЬЯ', title: 'Проверьте входящую партию', hint: 'Сначала осмотрите три палеты, затем подтвердите выбор на терминале приёмки.' },
    { id: 'line', zone: 'ПРОИЗВОДСТВЕННЫЙ ЦЕХ', title: 'Запустите линию по регламенту', hint: 'Порядок запуска: сначала обеспечьте безопасную среду, затем подачу и обработку.' },
    { id: 'hazards', zone: 'ПРОИЗВОДСТВЕННЫЙ ЦЕХ', title: 'Проведите обход безопасности', hint: 'Ищите красные маркеры у конвейера и в транспортном проходе.' },
    { id: 'alarm', zone: 'ДИСПЕТЧЕРСКАЯ', title: 'Остановите линию при перегреве', hint: 'Вернитесь к главному пульту. Безопасность важнее скорости выпуска.' },
    { id: 'loto', zone: 'РЕМОНТНАЯ ЗОНА', title: 'Выполните блокировку энергии LOTO', hint: 'Красный ремонтный шкаф находится у насосного модуля.' },
    { id: 'repair', zone: 'РЕМОНТНАЯ ЗОНА', title: 'Найдите и замените неисправный датчик', hint: 'Сравните показания давления, температуры и вибрации.' },
    { id: 'quality', zone: 'ЛАБОРАТОРИЯ', title: 'Подтвердите качество продукта', hint: 'Измерьте все три параметра и сравните их с допусками.' },
    { id: 'packing', zone: 'УПАКОВКА И СКЛАД', title: 'Подготовьте партию к отгрузке', hint: 'Этикетка должна обеспечивать прослеживаемость, а маршрут — вести через контрольный склад.' },
    { id: 'debrief', zone: 'КАРЬЕРНЫЙ ТЕРМИНАЛ', title: 'Завершите смену и получите профиль', hint: 'Карьерный терминал расположен у северной стены, за производственной линией.' }
  ];

  function track(event, data = {}) {
    const item = { event, stage: stages[state.stage]?.id ?? 'complete', t: Math.round(performance.now()), ...data };
    state.tracked.push(item);
    window.profTourEvents = state.tracked;
    window.dispatchEvent(new CustomEvent('proftour:event', { detail: item }));
  }

  let toastTimer = 0;
  function showToast(message, tone = 'info', duration = 3600) {
    clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.dataset.tone = tone;
    ui.toast.hidden = false;
    requestAnimationFrame(() => ui.toast.classList.add('show'));
    toastTimer = setTimeout(() => {
      ui.toast.classList.remove('show');
      setTimeout(() => { ui.toast.hidden = true; }, 220);
    }, duration);
  }

  let audioContext = null;
  function ensureAudio() {
    if (!state.sound) return null;
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  }

  function playTone(frequency = 520, duration = 0.08, type = 'sine', volume = 0.035, delay = 0) {
    const context = ensureAudio();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(context.currentTime + delay);
    oscillator.stop(context.currentTime + delay + duration + 0.02);
  }

  function playSuccess() {
    playTone(540, 0.08, 'sine', 0.035);
    playTone(760, 0.11, 'sine', 0.035, 0.09);
  }

  function playAlarm() {
    playTone(180, 0.28, 'sawtooth', 0.055);
    playTone(180, 0.28, 'sawtooth', 0.055, 0.42);
  }

  let lastFocused = null;
  function resetControls() {
    pressedKeys.clear();
    keyDownAt?.clear?.();
    runPointers.clear();
    joy.x = 0; joy.y = 0; joy.pointerId = null;
    ui.stick.style.transform = 'translate(0,0)';
    ui.run.classList.remove('active');
    lookPointerId = null;
  }

  function releasePointer() {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }

  function openModal({ eyebrow = '', title, html = '', choices = [], wide = false }) {
    resetControls();
    releasePointer();
    lastFocused = document.activeElement;
    state.modalOpen = true;
    document.body.classList.add('overlay-open');
    ui.modalEyebrow.textContent = eyebrow;
    ui.modalTitle.textContent = title;
    ui.modalBody.innerHTML = html;
    ui.modalPanel.classList.toggle('wide', wide);
    ui.modalChoices.replaceChildren();
    for (const choice of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `choice ${choice.className || ''}`.trim();
      button.disabled = Boolean(choice.disabled);
      const main = document.createElement('span');
      main.textContent = choice.label;
      button.append(main);
      if (choice.note) {
        const note = document.createElement('small');
        note.textContent = choice.note;
        button.append(note);
      }
      button.addEventListener('click', () => {
        playTone(460, 0.045, 'sine', 0.025);
        choice.action?.();
      });
      ui.modalChoices.append(button);
    }
    ui.modal.hidden = false;
    requestAnimationFrame(() => (ui.modalChoices.querySelector('button:not(:disabled)') || ui.modalClose).focus());
  }

  function closeModal() {
    state.modalOpen = false;
    ui.modal.hidden = true;
    document.body.classList.remove('overlay-open');
    lastFocused?.focus?.();
    lastFocused = null;
    resetControls();
  }

  function trapFocus(event, root) {
    if (event.key !== 'Tab') return;
    const focusable = [...root.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
    else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
  }

  function penalize(metric, amount, message) {
    state[metric] = Math.max(0, state[metric] - amount);
    updateHUD();
    playTone(170, 0.18, 'square', 0.04);
    showToast(`−${amount} · ${message}`, 'danger', 4300);
    track('mistake', { metric, amount, message });
  }

  function awardCareer(id, points = 1) {
    state.careerScores[id] += points;
  }

  function discoverCareer(id) {
    const fresh = !state.careers.has(id);
    state.careers.add(id);
    updateHUD();
    if (fresh) {
      showToast(`Профессия открыта: ${roles[id].name}`, 'career');
      playSuccess();
      track('career_opened', { career: id });
    }
  }

  function roleCardHTML(id) {
    const role = roles[id];
    return `
      <div class="role-hero" style="--role:${role.color}">
        <span>${svgIcon(role.icon)}</span><div><small>ПРОФЕССИЯ НА ПРОИЗВОДСТВЕ</small><b>${role.tagline}</b></div>
      </div>
      <div class="role-facts">
        <article><small>ЧЕМ ЗАНИМАЕТСЯ</small><p>${role.duties}</p></article>
        <article><small>ЧТО НУЖНО УМЕТЬ</small><p>${role.skills.join(' · ')}</p></article>
        <article><small>ГДЕ УЧИТЬСЯ</small><p>${role.study}</p></article>
        <article><small>КАК НАЧАТЬ</small><p>${role.start}</p></article>
      </div>`;
  }

  function openCareer(id, employeeName) {
    discoverCareer(id);
    openModal({
      eyebrow: `КАРЬЕРНАЯ ТОЧКА · ${employeeName}`,
      title: roles[id].name,
      html: roleCardHTML(id),
      wide: true,
      choices: [{ label: 'Продолжить смену', className: 'primary', action: closeModal }]
    });
  }

  function currentStage() { return stages[state.stage] || null; }

  function currentTargetIds() {
    switch (currentStage()?.id) {
      case 'briefing': return ['mentor'];
      case 'ppe': return ['ppe'];
      case 'safety': return ['safety-kiosk'];
      case 'receiving': {
        const missing = ['pallet-a', 'pallet-b', 'pallet-c'].filter((id) => !state.scanned.has(id));
        return missing.length ? missing : ['intake-console'];
      }
      case 'line': return ['line-console'];
      case 'hazards': return [
        !state.hazards.has('spill') && 'hazard-spill',
        !state.hazards.has('guard') && 'hazard-guard',
        !state.hazards.has('aisle') && 'hazard-aisle'
      ].filter(Boolean);
      case 'alarm': return ['line-console'];
      case 'loto': return ['loto'];
      case 'repair': return ['sensor'];
      case 'quality': return ['lab-console'];
      case 'packing': return ['pack-console'];
      case 'debrief': return ['career-terminal'];
      default: return [];
    }
  }

  function updateHUD() {
    const stage = currentStage();
    const progress = Math.round(Math.min(state.stage / TOTAL_STAGES, 1) * 100);
    ui.progressFill.style.width = `${progress}%`;
    ui.progressLabel.textContent = `${progress}%`;
    ui.safety.textContent = state.safety;
    ui.quality.textContent = state.quality;
    ui.careers.textContent = state.careers.size;
    if (!stage) return;
    ui.zone.textContent = `${stage.zone} · ЭТАП ${state.stage + 1}/${TOTAL_STAGES}`;
    ui.task.textContent = stage.title;
    ui.mapObjective.textContent = stage.title;
    const details = taskDetails[stage.id]();
    ui.details.replaceChildren();
    for (const detail of details) {
      const row = document.createElement('div');
      row.className = detail.done ? 'done' : '';
      const mark = document.createElement('span');
      mark.innerHTML = svgIcon(detail.done ? 'check' : 'circle');
      const text = document.createElement('b');
      text.textContent = detail.text;
      row.append(mark, text);
      ui.details.append(row);
    }
  }

  function setLineStatus(status) {
    state.lineStatus = status;
    const labels = { stopped: 'Остановлена', running: 'Работает', alarm: 'Аварийный сигнал', ready: 'Готова к пуску' };
    ui.line.textContent = labels[status];
    ui.line.dataset.state = status;
    if (typeof alarmLight !== 'undefined' && alarmLight) alarmLight.visible = status === 'alarm';
  }

  function advanceStage(expectedId) {
    const stage = currentStage();
    if (!stage || stage.id !== expectedId) return;
    track('quest_complete', { quest: expectedId });
    state.stage += 1;
    playSuccess();
    updateHUD();
    updateStationMarkers();
    const next = currentStage();
    if (next?.id === 'alarm') {
      setLineStatus('alarm');
      showToast('ВНИМАНИЕ: перегрев участка T-04. Немедленно остановите линию.', 'alarm', 6500);
      playAlarm();
    } else if (next) {
      showToast(`Новая задача: ${next.title}`, 'objective', 4300);
    }
  }

  function showHint() {
    const stage = currentStage();
    if (!stage) return;
    showToast(stage.hint, 'hint', 5200);
    track('hint_used', { quest: stage.id });
    playTone(610, 0.08, 'sine', 0.025);
  }

  // ---------- Сцена и визуальный язык завода ----------

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd2f4);
  scene.fog = new THREE.FogExp2(0xb9dcef, 0.008);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.06, 130);
  camera.rotation.order = 'YXZ';

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    bootRoot.innerHTML = `<section class="brief-card boot-error"><h1>3D-графика недоступна</h1><p class="lead">Включите аппаратное ускорение WebGL в браузере и обновите страницу.</p></section>`;
    return;
  }

  const lowPower = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.hardwareConcurrency || 8) <= 4;
  let pixelRatio = Math.min(devicePixelRatio, lowPower ? 1.25 : 1.65);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.42;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.id = 'factory-canvas';
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Интерактивная 3D-сцена производственного завода');
  document.body.prepend(renderer.domElement);

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    showToast('3D-контекст потерян. Обновите страницу, чтобы продолжить смену.', 'danger', 10000);
  });

  const hemi = new THREE.HemisphereLight(0xfffdf8, 0x756f7d, 2.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff7e9, 3.2);
  sun.position.set(-12, 18, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowPower ? 1024 : 1536, lowPower ? 1024 : 1536);
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 24; sun.shadow.camera.bottom = -24;
  sun.shadow.bias = -0.0003;
  scene.add(sun);

  const materials = {
    concrete: new THREE.MeshStandardMaterial({ color: 0xaaa6a0, roughness: 0.94, metalness: 0.02 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xeee9e1, roughness: 0.86, metalness: 0.04 }),
    wallLight: new THREE.MeshStandardMaterial({ color: 0xd4cec4, roughness: 0.8, metalness: 0.08 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x242329, roughness: 0.84, metalness: 0.18, side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardMaterial({ color: 0x77717f, roughness: 0.5, metalness: 0.58 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x292531, roughness: 0.6, metalness: 0.5 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x7357d9, roughness: 0.46, metalness: 0.28 }),
    cyan: new THREE.MeshStandardMaterial({ color: 0x9be5ff, emissive: 0x397c93, emissiveIntensity: 0.28, roughness: 0.38 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xff795f, emissive: 0x873529, emissiveIntensity: 0.18, roughness: 0.48 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xdff46a, roughness: 0.64 }),
    red: new THREE.MeshStandardMaterial({ color: 0xef5b55, emissive: 0x87221f, emissiveIntensity: 0.62, roughness: 0.44 }),
    green: new THREE.MeshStandardMaterial({ color: 0x55b985, emissive: 0x255e44, emissiveIntensity: 0.25, roughness: 0.44 }),
    white: new THREE.MeshStandardMaterial({ color: 0xfffdf8, roughness: 0.74 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xbcaef3, transparent: true, opacity: 0.24, roughness: 0.18, metalness: 0.03, transmission: 0.16, depthWrite: false }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x211e27, roughness: 0.92 })
  };

  const textureLoader = new THREE.TextureLoader();
  function loadToonTexture(path, repeatX = 1, repeatY = 1) {
    const texture = textureLoader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  const lockerToonTexture = loadToonTexture('./assets/locker-toon.png');
  materials.lockerToon = new THREE.MeshStandardMaterial({
    map: lockerToonTexture,
    color: 0xffffff,
    roughness: 0.68,
    metalness: 0.08
  });
  const equipmentMaterial = (options, roughness = 0.62, metalness = 0.16) => new THREE.MeshStandardMaterial({
    map: makeEquipmentPanelTexture(options),
    color: 0xffffff,
    roughness,
    metalness
  });
  materials.safetyConsoleToon = equipmentMaterial({ base: '#d9d2c7', accent: '#e66f52', layout: 'safety', seed: 13 });
  materials.intakeConsoleToon = equipmentMaterial({ base: '#cbd7d8', accent: '#438da8', layout: 'scanner', seed: 29 });
  materials.lineConsoleToon = equipmentMaterial({ base: '#34383b', accent: '#55b985', layout: 'controls', seed: 41 }, 0.52, 0.24);
  materials.labConsoleToon = equipmentMaterial({ base: '#e8e5dc', accent: '#8f72cf', layout: 'lab', seed: 57 });
  materials.packConsoleToon = equipmentMaterial({ base: '#c8d2d2', accent: '#d9a62e', layout: 'packing', seed: 71 });
  materials.careerTerminalToon = equipmentMaterial({ base: '#d8d0c7', accent: '#7357d9', layout: 'terminal', seed: 83 });
  materials.sensorMachineToon = equipmentMaterial({ base: '#9eabb0', accent: '#e29b2d', layout: 'sensor', seed: 97 }, 0.48, 0.28);
  materials.tankAToon = equipmentMaterial({ base: '#aeb8ba', accent: '#e7832f', layout: 'tank', seed: 109 }, 0.46, 0.3);
  materials.tankBToon = equipmentMaterial({ base: '#a5b5b8', accent: '#438da8', layout: 'tank', seed: 127 }, 0.46, 0.3);
  materials.palletAToon = equipmentMaterial({ base: '#c9a36e', accent: '#55b985', layout: 'cargo', seed: 139 }, 0.82, 0.04);
  materials.palletBToon = equipmentMaterial({ base: '#b88f64', accent: '#e66f52', layout: 'cargo', seed: 151 }, 0.84, 0.03);
  materials.palletCToon = equipmentMaterial({ base: '#c1aa82', accent: '#7357d9', layout: 'cargo', seed: 163 }, 0.8, 0.04);
  materials.forkliftToon = equipmentMaterial({ base: '#d98c22', accent: '#34383b', layout: 'vehicle', seed: 179 }, 0.56, 0.18);
  materials.lotoToon = equipmentMaterial({ base: '#d9d2c7', accent: '#ef5b55', layout: 'safety', seed: 191 }, 0.66, 0.12);
  materials.conveyorToon = equipmentMaterial({ base: '#69777c', accent: '#55b985', layout: 'controls', seed: 211 }, 0.52, 0.3);
  materials.packLineToon = equipmentMaterial({ base: '#718086', accent: '#d9a62e', layout: 'packing', seed: 223 }, 0.54, 0.27);
  materials.dockDoorToon = equipmentMaterial({ base: '#aebabc', accent: '#438da8', layout: 'cargo', seed: 239 }, 0.64, 0.18);

  const colliders = [];
  const interactables = [];
  const animatedWorkers = [];
  const conveyorRollers = [];
  const statusLights = [];
  let alarmLight = null;

  function meshBox(w, h, d, x, y, z, material, { parent = scene, shadow = true, collide = false } = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    parent.add(mesh);
    if (collide && parent === scene) colliders.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
  }

  function meshCylinder(rt, rb, h, segments, x, y, z, material, { parent = scene, shadow = true, collide = false } = {}) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    parent.add(mesh);
    if (collide && parent === scene) colliders.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
  }

  function addManualCollider(x, z, w, d, yMax = 5) {
    colliders.push(new THREE.Box3(new THREE.Vector3(x - w / 2, 0, z - d / 2), new THREE.Vector3(x + w / 2, yMax, z + d / 2)));
  }

  function makeCanvasTexture(draw, width = 512, height = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    draw(context, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  function makeEquipmentPanelTexture({ base, accent, layout, seed }) {
    return makeCanvasTexture((context, w, h) => {
      let randomState = seed;
      const random = () => ((randomState = (randomState * 1664525 + 1013904223) >>> 0) / 4294967296);
      const roundedPath = (x, y, width, height, radius) => {
        context.beginPath();
        if (context.roundRect) context.roundRect(x, y, width, height, radius);
        else context.rect(x, y, width, height);
      };
      const panel = (x, y, width, height, fill = 'rgba(22,19,32,.09)', radius = 22) => {
        roundedPath(x, y, width, height, radius);
        context.fillStyle = fill; context.fill();
        context.strokeStyle = 'rgba(22,19,32,.7)'; context.lineWidth = 7; context.stroke();
        roundedPath(x + 10, y + 10, width - 20, height - 20, Math.max(5, radius - 8));
        context.strokeStyle = 'rgba(255,255,255,.18)'; context.lineWidth = 3; context.stroke();
      };
      const bolt = (x, y, radius = 8) => {
        context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = '#34383b'; context.fill();
        context.strokeStyle = 'rgba(255,255,255,.4)'; context.lineWidth = 2; context.stroke();
        context.beginPath(); context.moveTo(x - radius * 0.5, y); context.lineTo(x + radius * 0.5, y);
        context.strokeStyle = '#151719'; context.lineWidth = 2; context.stroke();
      };
      const panelBolts = (x, y, width, height) => {
        for (const [bx, by] of [[x, y], [x + width, y], [x, y + height], [x + width, y + height]]) bolt(bx, by);
      };
      const vents = (x, y, count, width = 170, spacing = 26) => {
        for (let index = 0; index < count; index += 1) {
          roundedPath(x, y + index * spacing, width, 11, 6);
          context.fillStyle = '#303338'; context.fill();
          context.strokeStyle = 'rgba(255,255,255,.2)'; context.lineWidth = 2; context.stroke();
        }
      };
      const indicators = (x, y, count, direction = 'vertical') => {
        for (let index = 0; index < count; index += 1) {
          const ix = x + (direction === 'horizontal' ? index * 34 : 0);
          const iy = y + (direction === 'vertical' ? index * 34 : 0);
          roundedPath(ix, iy, 19, 19, 5);
          context.fillStyle = index === count - 1 ? accent : '#dff46a'; context.fill();
          context.strokeStyle = '#34383b'; context.lineWidth = 4; context.stroke();
        }
      };

      context.fillStyle = base; context.fillRect(0, 0, w, h);
      const surface = context.createLinearGradient(0, 0, w, h);
      surface.addColorStop(0, 'rgba(255,255,255,.18)');
      surface.addColorStop(0.52, 'rgba(255,255,255,0)');
      surface.addColorStop(1, 'rgba(22,19,32,.13)');
      context.fillStyle = surface; context.fillRect(0, 0, w, h);

      context.strokeStyle = '#3a3c41'; context.lineWidth = 22; context.strokeRect(12, 12, w - 24, h - 24);
      context.strokeStyle = 'rgba(255,255,255,.32)'; context.lineWidth = 4; context.strokeRect(26, 26, w - 52, h - 52);
      for (const [x, y] of [[38, 38], [w - 38, 38], [38, h - 38], [w - 38, h - 38]]) bolt(x, y, 10);

      context.fillStyle = accent;
      for (const [x, y] of [[29, 29], [w - 79, 29], [29, h - 79], [w - 79, h - 79]]) {
        roundedPath(x, y, 50, 50, 9); context.fill();
      }

      if (layout === 'safety') {
        panel(78, 104, 650, 560, 'rgba(255,255,255,.13)', 28);
        panel(760, 104, 182, 560, 'rgba(22,19,32,.18)', 24);
        vents(130, 174, 4, 205, 30); indicators(822, 170, 4);
        context.lineWidth = 30;
        for (let x = 105; x < 700; x += 92) {
          context.strokeStyle = x % 184 ? '#34383b' : accent;
          context.beginPath(); context.moveTo(x, 735); context.lineTo(x + 62, 805); context.stroke();
        }
        panel(105, 850, 810, 90, 'rgba(22,19,32,.12)', 18); panelBolts(130, 875, 760, 40);
      } else if (layout === 'scanner') {
        panel(80, 105, 690, 700, 'rgba(255,255,255,.13)', 30);
        panel(805, 105, 140, 700, 'rgba(22,19,32,.14)', 22);
        vents(145, 170, 3, 240, 31); indicators(858, 172, 5);
        panel(145, 340, 560, 390, 'rgba(67,141,168,.13)', 22); panelBolts(172, 367, 506, 336);
        panel(145, 850, 800, 90, 'rgba(22,19,32,.11)', 18);
      } else if (layout === 'controls') {
        panel(78, 105, 868, 190, 'rgba(22,19,32,.28)', 24);
        vents(130, 160, 4, 330, 27); indicators(700, 169, 5, 'horizontal');
        panel(78, 338, 560, 500, 'rgba(255,255,255,.06)', 28); panelBolts(108, 368, 500, 440);
        panel(676, 338, 270, 500, 'rgba(22,19,32,.2)', 24);
        vents(726, 410, 5, 165, 30); indicators(738, 650, 4, 'horizontal');
        panel(78, 875, 868, 70, 'rgba(255,255,255,.05)', 15);
      } else if (layout === 'lab') {
        panel(78, 105, 868, 610, 'rgba(255,255,255,.2)', 30);
        panel(125, 155, 575, 500, 'rgba(143,114,207,.08)', 22); panelBolts(150, 180, 525, 450);
        vents(755, 170, 6, 130, 29); indicators(810, 405, 4);
        context.fillStyle = accent; context.fillRect(80, 760, 864, 30);
        panel(78, 835, 868, 110, 'rgba(22,19,32,.08)', 18);
      } else if (layout === 'packing') {
        panel(78, 105, 868, 220, 'rgba(255,255,255,.14)', 26);
        vents(128, 165, 4, 280, 29); indicators(680, 178, 5, 'horizontal');
        panel(78, 370, 410, 470, 'rgba(22,19,32,.1)', 24);
        panel(536, 370, 410, 470, 'rgba(22,19,32,.1)', 24);
        panelBolts(110, 402, 346, 406); panelBolts(568, 402, 346, 406);
        context.fillStyle = accent; context.fillRect(78, 880, 868, 54);
      } else if (layout === 'terminal') {
        panel(78, 105, 868, 700, 'rgba(255,255,255,.13)', 34);
        panel(130, 160, 764, 480, 'rgba(115,87,217,.11)', 26); panelBolts(160, 190, 704, 420);
        vents(150, 690, 4, 420, 29); indicators(700, 700, 5, 'horizontal');
        panel(78, 850, 868, 90, 'rgba(22,19,32,.1)', 16);
      } else if (layout === 'sensor') {
        panel(78, 105, 868, 205, 'rgba(22,19,32,.14)', 26);
        indicators(120, 168, 5, 'horizontal'); vents(560, 164, 4, 290, 29);
        panel(78, 355, 868, 480, 'rgba(255,255,255,.1)', 30);
        context.strokeStyle = accent; context.lineWidth = 24;
        context.beginPath(); context.arc(512, 590, 150, 0, Math.PI * 2); context.stroke();
        context.strokeStyle = '#34383b'; context.lineWidth = 10;
        context.beginPath(); context.arc(512, 590, 103, 0, Math.PI * 2); context.stroke();
        panel(78, 875, 868, 70, 'rgba(22,19,32,.12)', 15);
      } else if (layout === 'tank') {
        context.fillStyle = 'rgba(22,19,32,.18)'; context.fillRect(0, 126, w, 58); context.fillRect(0, 826, w, 58);
        for (const x of [256, 512, 768]) {
          context.fillStyle = 'rgba(22,19,32,.22)'; context.fillRect(x - 8, 184, 16, 642);
          for (const y of [220, 790]) bolt(x, y, 8);
        }
        panel(330, 300, 364, 390, 'rgba(255,255,255,.1)', 28); panelBolts(360, 330, 304, 330);
        vents(408, 430, 4, 208, 31); indicators(455, 610, 4, 'horizontal');
        context.fillStyle = accent; context.fillRect(0, 80, w, 35); context.fillRect(0, 895, w, 35);
      } else if (layout === 'cargo') {
        context.fillStyle = 'rgba(22,19,32,.12)'; context.fillRect(118, 24, 54, 976); context.fillRect(852, 24, 54, 976);
        panel(215, 100, 594, 704, 'rgba(255,255,255,.08)', 18); panelBolts(242, 127, 540, 650);
        vents(300, 200, 3, 230, 31); indicators(603, 206, 3);
        context.fillStyle = accent; context.fillRect(215, 850, 594, 48);
      } else if (layout === 'vehicle') {
        panel(78, 105, 868, 260, 'rgba(255,255,255,.1)', 40);
        panel(78, 410, 560, 425, 'rgba(22,19,32,.12)', 30); panelBolts(110, 442, 496, 361);
        panel(680, 410, 266, 425, 'rgba(22,19,32,.2)', 26);
        vents(735, 480, 5, 155, 30); indicators(748, 675, 4, 'horizontal');
        context.fillStyle = accent; context.fillRect(78, 880, 868, 55);
      }

      for (let index = 0; index < 75; index += 1) {
        const x = 45 + random() * (w - 90); const y = 45 + random() * (h - 90);
        const length = 2 + random() * 9;
        context.strokeStyle = `rgba(22,19,32,${0.025 + random() * 0.04})`;
        context.lineWidth = 1 + random(); context.beginPath(); context.moveTo(x, y); context.lineTo(x + length, y + random() * 2); context.stroke();
      }
    }, 1024, 1024);
  }

  const floorTexture = makeCanvasTexture((context, w, h) => {
    context.fillStyle = '#aaa6a0'; context.fillRect(0, 0, w, h);
    context.strokeStyle = 'rgba(22,19,32,.22)'; context.lineWidth = 3;
    for (let x = 0; x <= w; x += 64) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, h); context.stroke(); }
    for (let y = 0; y <= h; y += 64) { context.beginPath(); context.moveTo(0, y); context.lineTo(w, y); context.stroke(); }
    let seed = 19;
    const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 800; i += 1) {
      const alpha = 0.025 + random() * 0.05;
      context.fillStyle = `rgba(255,255,255,${alpha})`;
      context.fillRect(random() * w, random() * h, 1 + random() * 3, 1 + random() * 3);
    }
  });
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(10, 8);
  materials.concrete.map = floorTexture;

  const hazardTexture = makeCanvasTexture((context, w, h) => {
    context.fillStyle = '#f5bd32'; context.fillRect(0, 0, w, h);
    context.strokeStyle = '#171b1d'; context.lineWidth = 42;
    for (let x = -h; x < w + h; x += 96) { context.beginPath(); context.moveTo(x, h); context.lineTo(x + h, 0); context.stroke(); }
  }, 256, 128);
  hazardTexture.wrapS = hazardTexture.wrapT = THREE.RepeatWrapping;
  hazardTexture.repeat.set(5, 1);
  const hazardMaterial = new THREE.MeshStandardMaterial({ map: hazardTexture, roughness: 0.7 });

  const skylightGlass = new THREE.MeshBasicMaterial({
    color: 0xaee5ff,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const skyClouds = [];
  const cloudGeometry = new THREE.SphereGeometry(1, 18, 12);
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xfffdf8,
    emissive: 0xdceefa,
    emissiveIntensity: 0.22,
    roughness: 1,
    metalness: 0
  });

  function createCloud(x, y, z, scale = 1, speed = 0.35, driftZ = 0, seed = 1) {
    const group = new THREE.Group();
    let randomState = seed;
    const random = () => ((randomState = (randomState * 1664525 + 1013904223) >>> 0) / 4294967296);
    const puffCount = 12 + Math.floor(random() * 5);

    for (let index = 0; index < puffCount; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = index === 0 ? 0 : Math.sqrt(random());
      const bx = Math.cos(angle) * radius * (1.25 + random() * 0.75);
      const bz = Math.sin(angle) * radius * (0.9 + random() * 0.75);
      const by = -0.18 + (1 - radius) * 0.48 + (random() - 0.5) * 0.4;
      const puffScale = 0.58 + random() * 0.72;
      const puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
      puff.position.set(bx, by, bz);
      puff.scale.set(
        puffScale * (0.82 + random() * 0.48),
        puffScale * (0.62 + random() * 0.42),
        puffScale * (0.78 + random() * 0.5)
      );
      puff.rotation.set(random() * 0.35, random() * Math.PI, random() * 0.22);
      puff.castShadow = false;
      puff.receiveShadow = false;
      group.add(puff);
    }
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    group.rotation.y = random() * Math.PI;
    scene.add(group);
    skyClouds.push({ group, speed, driftZ, baseY: y, phase: random() * Math.PI * 2 });
  }

  function makeTextSprite(text, { color = '#7357d9', bg = 'rgba(255,253,248,.96)', width = 640, height = 128, font = 36, scale = 3.4 } = {}) {
    const texture = makeCanvasTexture((context, w, h) => {
      context.fillStyle = bg;
      context.beginPath();
      if (context.roundRect) context.roundRect(5, 5, w - 10, h - 10, 22);
      else context.rect(5, 5, w - 10, h - 10);
      context.fill();
      context.strokeStyle = color; context.lineWidth = 5; context.stroke();
      context.fillStyle = '#161320'; context.font = `800 ${font}px system-ui, sans-serif`;
      context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillText(text, w / 2, h / 2 + 1, w - 42);
    }, width, height);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false }));
    sprite.scale.set(scale, scale * height / width, 1);
    sprite.renderOrder = 40;
    return sprite;
  }

  function makeWorldLabel(title, {
    subtitle = '',
    color = '#7357d9',
    kind = 'task',
    scale = 1.72
  } = {}) {
    const width = 560;
    const height = subtitle ? 144 : 112;
    const texture = makeCanvasTexture((context, w, h) => {
      context.clearRect(0, 0, w, h);
      context.shadowColor = 'rgba(22,19,32,.2)';
      context.shadowBlur = 16;
      context.shadowOffsetY = 7;
      context.fillStyle = 'rgba(255,253,248,.97)';
      context.beginPath();
      if (context.roundRect) context.roundRect(16, 12, w - 32, h - 30, 24);
      else context.rect(16, 12, w - 32, h - 30);
      context.fill();
      context.shadowColor = 'transparent';
      context.strokeStyle = '#161320';
      context.lineWidth = 4;
      context.stroke();

      context.fillStyle = color;
      context.beginPath();
      if (context.roundRect) context.roundRect(17, 13, 18, h - 32, [22, 0, 0, 22]);
      else context.rect(17, 13, 18, h - 32);
      context.fill();

      context.fillStyle = color;
      context.beginPath();
      context.arc(66, h / 2 - 2, 21, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#161320';
      context.lineWidth = 3;
      context.stroke();
      context.fillStyle = '#fffdf8';
      context.font = '900 17px system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(kind === 'npc' ? 'NPC' : '!', 66, h / 2 - 1);

      context.textAlign = 'left';
      context.fillStyle = '#161320';
      context.font = `850 ${subtitle ? 27 : 29}px system-ui, sans-serif`;
      context.fillText(title, 104, subtitle ? 58 : h / 2 - 1, w - 136);
      if (subtitle) {
        context.fillStyle = '#6f697b';
        context.font = '650 18px system-ui, sans-serif';
        context.fillText(subtitle, 104, 91, w - 136);
      }
    }, width, height);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false
    }));
    sprite.scale.set(scale, scale * height / width, 1);
    sprite.renderOrder = 42;
    return sprite;
  }

  function addFloorZone(x, z, w, d, color, opacity = 0.16) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(x, 0.012, z);
    scene.add(plane);
    const borderMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.52 });
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, d)), borderMaterial);
    border.rotation.x = -Math.PI / 2;
    border.position.set(x, 0.02, z);
    scene.add(border);
  }

  function addZoneSign(text, x, z, color = '#7357d9') {
    const sprite = makeTextSprite(text, { color, scale: 2.85, font: 29 });
    sprite.position.set(x, 4.8, z);
    scene.add(sprite);
    return sprite;
  }

  function createConsole(x, z, rotation = 0, accent = materials.cyan, bodyMaterial = materials.intakeConsoleToon) {
    const group = new THREE.Group();
    meshBox(1.25, 1.15, 0.68, 0, 0.58, 0, bodyMaterial, { parent: group });
    const panel = meshBox(1.04, 0.56, 0.08, 0, 1.12, -0.22, materials.wall, { parent: group });
    panel.rotation.x = -0.28;
    for (let i = 0; i < 3; i += 1) {
      const led = meshCylinder(0.055, 0.055, 0.035, 10, -0.28 + i * 0.28, 1.18, -0.295, i === 0 ? accent : materials.green, { parent: group, shadow: false });
      led.rotation.x = Math.PI / 2 - 0.28;
    }
    group.position.set(x, 0, z); group.rotation.y = rotation; scene.add(group);
    addManualCollider(x, z, 1.45, 0.95, 1.7);
    return group;
  }

  function createStationMarker(color = 0xff795f) {
    const group = new THREE.Group();
    const markerMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.84, depthTest: true, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.055, 8, 36), markerMaterial);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.08; group.add(ring);
    group.userData = { ring };
    group.visible = false;
    scene.add(group);
    return group;
  }

  const objectiveBeacon = createStationMarker();

  function registerInteractable({ id, group, x, z, label, verb = 'Взаимодействовать', range = 3, career = false, action }) {
    const labelParts = label.split(' · ');
    const tag = makeWorldLabel(career ? labelParts[0] : verb, {
      subtitle: career ? labelParts.slice(1).join(' · ') : label,
      color: career ? '#7357d9' : '#ff795f',
      kind: career ? 'npc' : 'task',
      scale: career ? 1.82 : 1.68
    });
    const labelHeight = group.userData.labelHeight || 2.55;
    tag.position.set(0, labelHeight, 0);
    tag.userData.baseY = labelHeight;
    tag.userData.baseScale = tag.scale.clone();
    tag.visible = false;
    group.add(tag);
    const item = { id, group, position: new THREE.Vector3(x, 0, z), label, verb, range, career, action, tag };
    interactables.push(item);
    return item;
  }

  function updateStationMarkers() {
    const targets = new Set(currentTargetIds());
    for (const item of interactables) {
      item.group.userData.isTarget = targets.has(item.id);
      if (!item.career && !targets.has(item.id)) item.tag.visible = false;
    }
  }

  function createWorker({ id, roleId, name, x, z, rotation = 0, color = 0x1683a0, range = 3.15, action }) {
    const group = new THREE.Group();
    const uniform = new THREE.MeshStandardMaterial({ color, roughness: 0.74 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd7a27e, roughness: 0.88 });
    const boot = new THREE.MeshStandardMaterial({ color: 0x151c20, roughness: 0.86 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.58, 4, 9), uniform);
    torso.position.y = 1.37; torso.castShadow = true; group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), skin);
    head.position.y = 2.16; head.castShadow = true; group.add(head);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), materials.yellow);
    helmet.position.y = 2.23; helmet.castShadow = true; group.add(helmet);
    const brim = meshBox(0.7, 0.055, 0.22, 0, 2.25, 0.12, materials.yellow, { parent: group });
    const makeLimb = (px, py, length, radius, material) => {
      const pivot = new THREE.Group(); pivot.position.set(px, py, 0);
      const limb = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 3, 7), material);
      limb.position.y = -length * 0.47; limb.castShadow = true; pivot.add(limb); group.add(pivot); return pivot;
    };
    const armL = makeLimb(-0.39, 1.65, 0.47, 0.07, uniform);
    const armR = makeLimb(0.39, 1.65, 0.47, 0.07, uniform);
    const legL = makeLimb(-0.15, 0.92, 0.53, 0.085, boot);
    const legR = makeLimb(0.15, 0.92, 0.53, 0.085, boot);
    for (const ex of [-0.09, 0.09]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), materials.rubber);
      eye.position.set(ex, 2.18, 0.257); group.add(eye);
    }
    const groundOffset = -0.31;
    group.position.set(x, groundOffset, z); group.rotation.y = rotation;
    group.userData.labelHeight = 2.72;
    scene.add(group);
    const item = registerInteractable({
      id, group, x, z, label: `${name} · ${roles[roleId].name}`, verb: 'Поговорить', range, career: true,
      action: action || (() => openCareer(roleId, name))
    });
    const patrolRoutes = {
      mentor: { x: 1, z: 0.12, radius: 1.15 },
      'npc-safety': { x: 0.25, z: 1, radius: 1.7 },
      'npc-logistics': { x: 1, z: 0.18, radius: 2.15 },
      'npc-operator': { x: 0.2, z: 1, radius: 2.25 },
      'npc-mechatronics': { x: 1, z: 0.15, radius: 1.75 },
      'npc-lab': { x: 0.18, z: 1, radius: 1.45 }
    };
    const patrol = patrolRoutes[id] || { x: 1, z: 0, radius: 1.5 };
    animatedWorkers.push({
      group, item, armL, armR, legL, legR,
      phase: Math.random() * Math.PI * 2,
      patrolClock: Math.random() * Math.PI * 2,
      patrolSpeed: 0.34 + Math.random() * 0.07,
      patrolRadius: patrol.radius,
      patrolAxisX: patrol.x,
      patrolAxisZ: patrol.z,
      origin: new THREE.Vector3(x, groundOffset, z),
      baseY: groundOffset,
      homeRotation: rotation,
      motion: 0,
      watching: false
    });
    item.roleId = roleId;
    return item;
  }

  function buildFactory() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 38), materials.concrete);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    // Полностью остеклённая двускатная крыша с несущей рамой.
    const roofEaveY = 6.18;
    const roofRise = 5.1;
    const roofHalfSpan = 25;
    const roofAngle = Math.atan2(roofRise, roofHalfSpan);
    const roofLength = Math.hypot(roofHalfSpan, roofRise);
    const roofCos = Math.cos(roofAngle);
    const roofSin = Math.sin(roofAngle);
    const roofPoint = (side, distance) => ({
      x: side < 0 ? -roofHalfSpan + distance * roofCos : roofHalfSpan - distance * roofCos,
      y: roofEaveY + distance * roofSin
    });
    const addRoofSection = (side, start, length, depth, material, thickness = 0.26, z = 0) => {
      const point = roofPoint(side, start + length / 2);
      const section = meshBox(length, thickness, depth, point.x, point.y, z, material, { shadow: false });
      section.rotation.z = side < 0 ? roofAngle : -roofAngle;
      return section;
    };

    for (const side of [-1, 1]) {
      const glass = addRoofSection(side, 0, roofLength, 37.2, skylightGlass, 0.055);
      glass.renderOrder = 3;

      for (let distance = 4.5; distance < roofLength; distance += 4.5) {
        addRoofSection(side, distance - 0.1, 0.2, 37.8, materials.darkSteel, 0.2);
      }
      for (const z of [-15, -9, -3, 3, 9, 15]) {
        addRoofSection(side, 0, roofLength, 0.34, materials.darkSteel, 0.32, z);
      }
    }

    const gableMaterial = materials.wall.clone();
    gableMaterial.side = THREE.DoubleSide;
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-roofHalfSpan, 0);
    gableShape.lineTo(0, roofRise);
    gableShape.lineTo(roofHalfSpan, 0);
    gableShape.closePath();
    const gableGeometry = new THREE.ShapeGeometry(gableShape);
    for (const z of [-18.76, 18.76]) {
      const gable = new THREE.Mesh(gableGeometry, gableMaterial);
      gable.position.set(0, roofEaveY, z);
      gable.receiveShadow = true;
      scene.add(gable);
    }

    meshBox(0.9, 0.68, 38.2, 0, roofEaveY + roofRise, 0, materials.darkSteel, { shadow: false });
    meshBox(0.9, 0.95, 38.2, -24.82, 5.98, 0, materials.darkSteel, { shadow: false });
    meshBox(0.9, 0.95, 38.2, 24.82, 5.98, 0, materials.darkSteel, { shadow: false });
    meshBox(50, 0.46, 0.6, 0, 6.01, -18.72, materials.wall, { shadow: false });
    meshBox(50, 0.46, 0.6, 0, 6.01, 18.72, materials.wall, { shadow: false });

    // Облака распределены по всей площади неба на разной высоте и глубине.
    createCloud(-58, 31, -38, 4.3, 0.22, 0.045, 11);
    createCloud(-35, 38, -13, 5.2, 0.28, -0.03, 23);
    createCloud(-12, 29, 20, 3.8, 0.31, 0.055, 37);
    createCloud(12, 44, -28, 6, 0.2, 0.02, 41);
    createCloud(38, 33, 8, 4.6, 0.26, -0.04, 53);
    createCloud(61, 50, 34, 6.4, 0.18, -0.025, 67);
    createCloud(-49, 53, 30, 5.8, 0.16, 0.035, 79);
    createCloud(-18, 61, 3, 7, 0.14, -0.02, 83);
    createCloud(18, 56, 23, 5.4, 0.19, 0.03, 97);
    createCloud(52, 66, -18, 6.2, 0.15, -0.025, 101);
    createCloud(4, 34, -2, 4.4, 0.24, 0.01, 109);
    createCloud(-67, 46, -5, 5.1, 0.21, -0.04, 127);
    createCloud(30, 70, -42, 7.4, 0.12, 0.018, 139);
    createCloud(-28, 72, 43, 6.8, 0.13, -0.018, 149);

    addFloorZone(-19, -12, 9, 8, 0x7357d9, 0.18);
    addFloorZone(-11, -12, 6, 8, 0xff795f, 0.18);
    addFloorZone(-16, 8, 15, 15, 0x9be5ff, 0.16);
    addFloorZone(1.5, 1, 19, 17, 0xdff46a, 0.15);
    addFloorZone(9.5, -9, 9, 8, 0xff795f, 0.17);
    addFloorZone(18.5, -9, 9, 10, 0x9a78e8, 0.17);
    addFloorZone(18, 8, 10, 13, 0x9be5ff, 0.16);
    addFloorZone(-2.5, 13.5, 11, 7, 0x7357d9, 0.15);

    meshBox(50, 0.35, 0.6, 0, 0.18, -18.7, materials.wall, { collide: true });
    meshBox(50, 0.35, 0.6, 0, 0.18, 18.7, materials.wall, { collide: true });
    meshBox(0.6, 0.35, 38, -24.7, 0.18, 0, materials.wall, { collide: true });
    meshBox(0.6, 0.35, 38, 24.7, 0.18, 0, materials.wall, { collide: true });
    meshBox(50, 5.8, 0.55, 0, 2.9, -19, materials.wall, { collide: true });
    meshBox(50, 5.8, 0.55, 0, 2.9, 19, materials.wall, { collide: true });
    meshBox(0.55, 5.8, 38, -25, 2.9, 0, materials.wall, { collide: true });
    meshBox(0.55, 5.8, 38, 25, 2.9, 0, materials.wall, { collide: true });

    for (let x = -22; x <= 22; x += 4) meshBox(0.18, 0.025, 32, x, 0.035, 0, materials.yellow, { shadow: false });
    for (let z = -15; z <= 15; z += 6) meshBox(44, 0.02, 0.08, 0, 0.04, z, materials.wallLight, { shadow: false });

    for (let x = -22; x <= 22; x += 5.5) {
      meshBox(0.16, 5.4, 0.16, x, 2.7, -18.55, materials.steel);
      meshBox(0.16, 5.4, 0.16, x, 2.7, 18.55, materials.steel);
    }
    for (let z = -17; z <= 17; z += 5.6) {
      addRoofSection(-1, 0, roofLength, 0.2, materials.darkSteel, 0.18, z);
      addRoofSection(1, 0, roofLength, 0.2, materials.darkSteel, 0.18, z);
      if (Math.round((z + 17) / 5.6) % 2 === 0) {
        meshBox(0.055, 4.2, 0.055, 0, 8.42, z, materials.darkSteel, { shadow: false });
        const light = meshBox(3.8, 0.08, 0.46, 0, 6.3, z, new THREE.MeshStandardMaterial({ color: 0xfffdf8, emissive: 0xfff4dc, emissiveIntensity: 3.2, roughness: 0.2 }), { shadow: false });
        const point = new THREE.PointLight(0xfff4dc, 3.4, 18, 1.6); point.position.copy(light.position); point.position.y -= 0.35; scene.add(point);
      }
    }

    addZoneSign('01 · ПРОХОДНАЯ', -20, -17.7);
    addZoneSign('02 · ОХРАНА ТРУДА', -11.5, -17.7, '#ff795f');
    addZoneSign('03 · ПРИЁМКА СЫРЬЯ', -16, 16.9, '#438da8');
    addZoneSign('04 · ПРОИЗВОДСТВЕННЫЙ ЦЕХ', 1, 16.9, '#55b985');
    addZoneSign('05 · РЕМОНТ', 9.5, -17.7, '#ff795f');
    addZoneSign('06 · ЛАБОРАТОРИЯ', 19, -17.7, '#9a78e8');
    addZoneSign('07 · УПАКОВКА', 19, 16.9, '#438da8');
    addZoneSign('08 · КАРЬЕРНЫЙ ТЕРМИНАЛ', -2.5, 16.9, '#7357d9');

    // Проходная и зона охраны труда.
    meshBox(6.8, 0.12, 0.9, -20, 1.02, -14.6, materials.glass);
    for (const x of [-23, -20, -17]) meshBox(0.12, 2.1, 0.12, x, 1.05, -14.6, materials.steel);
    const gatePost = meshCylinder(0.11, 0.14, 1.35, 12, -22.2, 0.68, -11.1, materials.darkSteel);
    const gate = meshBox(0.12, 0.12, 1.55, -22.2, 0.92, -11.1, materials.cyan);
    gate.rotation.y = Math.PI / 2;

    const locker = new THREE.Group();
    meshBox(2.62, 2.6, 0.76, 0, 1.3, 0, materials.darkSteel, { parent: locker });
    meshBox(2.48, 2.46, 0.06, 0, 1.3, -0.415, materials.lockerToon, { parent: locker });
    meshBox(2.7, 0.11, 0.86, 0, 2.64, 0, materials.blue, { parent: locker });
    locker.position.set(-16.7, 0, -12.4); locker.userData.labelHeight = 3; scene.add(locker);
    addManualCollider(-16.7, -12.4, 2.7, 0.9, 3);

    const safetyConsole = createConsole(-11.8, -12.4, 0, materials.orange, materials.safetyConsoleToon);
    const shield = makeTextSprite('УЧЕБНЫЙ ТЕРМИНАЛ · ОТ', { color: '#ff795f', scale: 3.1, font: 29 });
    shield.position.set(0, 2.35, 0); safetyConsole.add(shield);

    // Складские стеллажи и три палеты.
    for (const rackX of [-21.5, -16, -10.5]) {
      for (const side of [-1.6, 1.6]) meshBox(0.16, 3.5, 0.16, rackX + side, 1.75, 11.7, materials.orange);
      for (const y of [0.55, 1.75, 2.95]) meshBox(3.5, 0.12, 1.25, rackX, y, 11.7, materials.steel);
    }

    const palletPositions = [
      { id: 'pallet-a', x: -20.5, z: 6.7, material: materials.palletAToon },
      { id: 'pallet-b', x: -16, z: 6.7, material: materials.palletBToon },
      { id: 'pallet-c', x: -11.5, z: 6.7, material: materials.palletCToon }
    ];
    for (const pallet of palletPositions) {
      const group = new THREE.Group();
      for (const px of [-0.9, 0, 0.9]) meshBox(0.72, 0.13, 1.5, px, 0.1, 0, materials.orange, { parent: group });
      for (const bx of [-0.6, 0.6]) for (const bz of [-0.42, 0.42]) meshBox(1.05, 0.82, 0.75, bx, 0.6, bz, pallet.material, { parent: group });
      const label = makeTextSprite(pallet.id.slice(-1).toUpperCase(), { color: '#7357d9', scale: 1.05, width: 180, height: 180, font: 88 });
      label.position.set(0, 1.55, 0); group.add(label);
      group.position.set(pallet.x, 0, pallet.z); group.userData.labelHeight = 2.45; scene.add(group);
      addManualCollider(pallet.x, pallet.z, 2.8, 1.8, 1.5);
      pallet.group = group;
    }
    const intakeConsole = createConsole(-16, 10.1, Math.PI, materials.blue, materials.intakeConsoleToon);

    // Производственная линия: ёмкости, трубопроводы и конвейер.
    for (const [x, z, radius, height, tankMaterial] of [[-4.5, -5.2, 1.55, 3.6, materials.tankAToon], [0, -5.2, 1.8, 4.2, materials.tankBToon]]) {
      meshCylinder(radius, radius, height, 24, x, height / 2, z, tankMaterial, { collide: true });
      meshCylinder(radius + 0.08, radius + 0.08, 0.18, 24, x, height - 0.2, z, materials.orange);
      for (const legX of [-radius * 0.55, radius * 0.55]) meshBox(0.18, 0.85, 0.18, x + legX, 0.43, z, materials.darkSteel);
    }
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x7357d9, roughness: 0.32, metalness: 0.56 });
    const pipe = meshCylinder(0.18, 0.18, 8.4, 14, -2.25, 3.2, -5.2, pipeMat);
    pipe.rotation.z = Math.PI / 2;
    const pipeDown = meshCylinder(0.18, 0.18, 5.4, 14, 1.95, 2.1, -2.55, pipeMat);
    pipeDown.rotation.x = Math.PI / 2;
    const valve = meshCylinder(0.38, 0.38, 0.09, 16, 1.95, 2.1, -2.4, materials.red);
    valve.rotation.x = Math.PI / 2;

    const conveyor = new THREE.Group();
    meshBox(14.2, 0.16, 2.15, 0, 0.86, 0, materials.conveyorToon, { parent: conveyor });
    meshBox(14.1, 0.08, 1.75, 0, 0.98, 0, materials.rubber, { parent: conveyor });
    for (let x = -6.6; x <= 6.6; x += 0.62) {
      const roller = meshCylinder(0.1, 0.1, 1.92, 10, x, 1.03, 0, materials.steel, { parent: conveyor, shadow: false });
      roller.rotation.x = Math.PI / 2;
      conveyorRollers.push(roller);
    }
    for (const x of [-6.4, -3, 0, 3, 6.4]) for (const z of [-0.86, 0.86]) meshBox(0.16, 0.86, 0.16, x, 0.43, z, materials.steel, { parent: conveyor });
    conveyor.position.set(4.2, 0, 1.2); scene.add(conveyor); addManualCollider(4.2, 1.2, 14.5, 2.35, 1.2);

    const lineConsole = createConsole(-6, -1.9, 0, materials.green, materials.lineConsoleToon);
    const lineSign = makeTextSprite('ПУЛЬТ ЛИНИИ · L-04', { color: '#55b985', scale: 2.9, font: 30 });
    lineSign.position.set(0, 2.35, 0); lineConsole.add(lineSign);

    for (const x of [0.5, 4.2, 7.9]) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), materials.green);
      light.position.set(x, 2.45, 0.05); scene.add(light); statusLights.push(light);
      meshBox(0.12, 2.7, 0.12, x, 1.35, 0.05, materials.darkSteel);
    }
    const beaconBase = meshCylinder(0.13, 0.15, 0.07, 16, 0.42, 1.2, -0.34, materials.darkSteel, { parent: lineConsole });
    beaconBase.rotation.x = Math.PI / 2 - 0.28;
    alarmLight = new THREE.PointLight(0xff2a20, 7, 14, 1.7);
    alarmLight.position.set(0.42, 1.22, -0.46); alarmLight.visible = false; lineConsole.add(alarmLight);
    const alarmDome = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 9), materials.red);
    alarmDome.scale.set(1, 0.72, 0.55);
    alarmDome.position.set(0.42, 1.22, -0.405); lineConsole.add(alarmDome);

    // Опасности для обхода.
    const spillGroup = new THREE.Group();
    const spill = new THREE.Mesh(new THREE.CircleGeometry(1.05, 28), new THREE.MeshStandardMaterial({ color: 0xd89818, transparent: true, opacity: 0.72, roughness: 0.28 }));
    spill.rotation.x = -Math.PI / 2; spill.position.y = 0.03; spillGroup.add(spill);
    for (let i = 0; i < 3; i += 1) { const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.62, 14), materials.orange); cone.position.set(-0.75 + i * 0.72, 0.32, 0.7); spillGroup.add(cone); }
    spillGroup.position.set(0.2, 0, 7.2); spillGroup.userData.labelHeight = 2.1; scene.add(spillGroup);

    const guardGroup = new THREE.Group();
    for (const x of [-1.0, 1.0]) meshBox(0.12, 1.65, 0.12, x, 0.83, 0, materials.yellow, { parent: guardGroup });
    meshBox(2.15, 0.12, 0.12, 0, 1.58, 0, materials.yellow, { parent: guardGroup });
    const openGate = meshBox(0.12, 1.2, 1.7, 0.95, 0.86, 0.85, materials.red, { parent: guardGroup });
    openGate.rotation.y = -0.7;
    guardGroup.position.set(6.5, 0, 3.25); guardGroup.userData.labelHeight = 2.35; scene.add(guardGroup);

    const aisleGroup = new THREE.Group();
    const aisleCargo = [[0, 0.45, 0, 1], [0.8, 0.35, 0.25, 0.75], [-0.65, 0.3, 0.15, 0.68]];
    const cargoMaterials = [materials.palletAToon, materials.palletBToon, materials.palletCToon];
    for (const [index, [x, y, z, s]] of aisleCargo.entries()) meshBox(s, s * 0.9, s, x, y, z, cargoMaterials[index], { parent: aisleGroup });
    aisleGroup.position.set(-1.3, 0, 10.8); aisleGroup.userData.labelHeight = 2.1; scene.add(aisleGroup); addManualCollider(-1.3, 10.8, 2.8, 2.2, 1.1);

    // Ремонтная зона.
    const loto = new THREE.Group();
    meshBox(1.4, 2.1, 0.55, 0, 1.05, 0, materials.lotoToon, { parent: loto });
    meshBox(0.92, 0.62, 0.05, 0, 1.38, -0.3, materials.white, { parent: loto });
    const lock = meshCylinder(0.14, 0.14, 0.18, 12, 0, 0.75, -0.36, materials.yellow, { parent: loto });
    lock.rotation.x = Math.PI / 2;
    loto.position.set(8.3, 0, -10.2); loto.userData.labelHeight = 2.75; scene.add(loto); addManualCollider(8.3, -10.2, 1.6, 0.8, 2.4);

    const sensorMachine = new THREE.Group();
    meshBox(3.6, 2.3, 2.1, 0, 1.15, 0, materials.sensorMachineToon, { parent: sensorMachine });
    meshCylinder(0.78, 0.78, 2.4, 18, 0, 2.68, 0, materials.steel, { parent: sensorMachine });
    for (const [x, color] of [[-1, materials.cyan], [0, materials.red], [1, materials.green]]) {
      const sensor = meshCylinder(0.13, 0.13, 0.42, 12, x, 1.55, -1.18, color, { parent: sensorMachine });
      sensor.rotation.x = Math.PI / 2;
    }
    sensorMachine.position.set(12, 0, -7.5); sensorMachine.userData.labelHeight = 4.4; scene.add(sensorMachine); addManualCollider(12, -7.5, 3.9, 2.45, 4.1);

    // Лаборатория с прозрачной перегородкой и приборами.
    meshBox(0.14, 3.2, 8.2, 14.3, 1.6, -10.4, materials.glass);
    meshBox(0.18, 3.3, 0.18, 14.3, 1.65, -14.1, materials.steel);
    meshBox(0.18, 3.3, 0.18, 14.3, 1.65, -6.7, materials.steel);
    const labBench = new THREE.Group();
    meshBox(5.2, 0.22, 1.65, 0, 0.95, 0, materials.white, { parent: labBench });
    for (const x of [-2.35, 2.35]) for (const z of [-0.62, 0.62]) meshBox(0.15, 0.9, 0.15, x, 0.45, z, materials.steel, { parent: labBench });
    for (const x of [-1.2, 0, 1.2]) {
      const flask = meshCylinder(0.17, 0.3, 0.55, 14, x, 1.34, 0, materials.glass, { parent: labBench });
      const liquid = meshCylinder(0.16, 0.27, 0.18, 14, x, 1.18, 0, x === 0 ? materials.orange : materials.cyan, { parent: labBench, shadow: false });
    }
    labBench.position.set(19, 0, -10.8); scene.add(labBench); addManualCollider(19, -10.8, 5.5, 1.95, 1.7);
    const labConsole = createConsole(19, -7.4, Math.PI, materials.white, materials.labConsoleToon);

    // Упаковка и отгрузка.
    const packLine = new THREE.Group();
    meshBox(7.2, 0.14, 1.7, 0, 0.86, 0, materials.packLineToon, { parent: packLine });
    meshBox(7.05, 0.07, 1.36, 0, 0.97, 0, materials.rubber, { parent: packLine });
    for (let x = -3.2; x <= 3.2; x += 0.64) {
      const roller = meshCylinder(0.09, 0.09, 1.48, 10, x, 1.01, 0, materials.steel, { parent: packLine, shadow: false });
      roller.rotation.x = Math.PI / 2; conveyorRollers.push(roller);
    }
    for (const x of [-2.6, 0, 2.6]) meshBox(0.16, 0.82, 0.16, x, 0.41, 0, materials.steel, { parent: packLine });
    for (const [index, x] of [-2.3, 0, 2.2].entries()) meshBox(1.05, 0.9, 1.05, x, 1.5, 0, cargoMaterials[index], { parent: packLine });
    packLine.position.set(18.5, 0, 7.5); scene.add(packLine); addManualCollider(18.5, 7.5, 7.5, 1.95, 2.1);
    const packConsole = createConsole(18.5, 11.6, Math.PI, materials.blue, materials.packConsoleToon);
    const dockDoor = meshBox(7.5, 4.8, 0.28, 19.5, 2.4, 18.45, materials.dockDoorToon);
    for (let y = 0.4; y < 4.6; y += 0.55) meshBox(7.2, 0.035, 0.05, 19.5, y, 18.25, materials.steel, { shadow: false });

    // Карьерный терминал и диспетчерская.
    const careerTerminal = new THREE.Group();
    meshBox(3.2, 1.5, 1.35, 0, 0.75, 0, materials.careerTerminalToon, { parent: careerTerminal });
    const screen = meshBox(2.6, 1.25, 0.09, 0, 1.65, -0.35, materials.cyan, { parent: careerTerminal });
    screen.rotation.x = -0.16;
    meshBox(4.2, 0.05, 2.2, 0, 0.04, 0, hazardMaterial, { parent: careerTerminal, shadow: false });
    careerTerminal.position.set(-2.7, 0, 13.1); careerTerminal.userData.labelHeight = 3.15; scene.add(careerTerminal); addManualCollider(-2.7, 13.1, 3.6, 1.75, 2.6);

    // Небольшой погрузчик для узнаваемого силуэта склада.
    const forklift = new THREE.Group();
    meshBox(2.3, 1.05, 1.45, 0, 0.72, 0, materials.forkliftToon, { parent: forklift });
    meshBox(0.15, 2.5, 0.15, 1.15, 1.25, -0.55, materials.darkSteel, { parent: forklift });
    meshBox(0.15, 2.5, 0.15, 1.15, 1.25, 0.55, materials.darkSteel, { parent: forklift });
    meshBox(2.2, 0.12, 0.14, 2.12, 0.18, -0.48, materials.steel, { parent: forklift });
    meshBox(2.2, 0.12, 0.14, 2.12, 0.18, 0.48, materials.steel, { parent: forklift });
    for (const x of [-0.78, 0.78]) for (const z of [-0.78, 0.78]) {
      const wheel = meshCylinder(0.34, 0.34, 0.19, 14, x, 0.35, z, materials.rubber, { parent: forklift }); wheel.rotation.x = Math.PI / 2;
    }
    forklift.position.set(-20.2, 0, 2.2); forklift.rotation.y = -0.24; scene.add(forklift); addManualCollider(-20.2, 2.2, 3.1, 2.2, 2.6);

    // Интерактивные точки заданий.
    registerInteractable({ id: 'ppe', group: locker, x: -16.7, z: -12.4, label: 'Шкаф средств защиты', verb: 'Подобрать СИЗ', action: openPPE });
    registerInteractable({ id: 'safety-kiosk', group: safetyConsole, x: -11.8, z: -12.4, label: 'Ситуационный инструктаж', verb: 'Начать инструктаж', action: openSafetyQuiz });
    for (const pallet of palletPositions) registerInteractable({ id: pallet.id, group: pallet.group, x: pallet.x, z: pallet.z, label: `Палета ${pallet.id.slice(-1).toUpperCase()}`, verb: 'Сканировать', action: () => scanPallet(pallet.id) });
    registerInteractable({ id: 'intake-console', group: intakeConsole, x: -16, z: 10.1, label: 'Терминал приёмки', verb: 'Подтвердить сырьё', action: openIntakeDecision });
    registerInteractable({ id: 'line-console', group: lineConsole, x: -6, z: -1.9, label: 'Главный пульт линии L-04', verb: 'Открыть пульт', action: openLineConsole });
    registerInteractable({ id: 'hazard-spill', group: spillGroup, x: 0.2, z: 7.2, label: 'Опасность · разлив', verb: 'Оценить риск', action: () => openHazard('spill') });
    registerInteractable({ id: 'hazard-guard', group: guardGroup, x: 6.5, z: 3.25, label: 'Опасность · ограждение', verb: 'Оценить риск', action: () => openHazard('guard') });
    registerInteractable({ id: 'hazard-aisle', group: aisleGroup, x: -1.3, z: 10.8, label: 'Опасность · проход', verb: 'Оценить риск', action: () => openHazard('aisle') });
    registerInteractable({ id: 'loto', group: loto, x: 8.3, z: -10.2, label: 'Шкаф блокировки LOTO', verb: 'Выполнить блокировку', action: openLoto });
    registerInteractable({ id: 'sensor', group: sensorMachine, x: 12, z: -7.5, label: 'Насосный модуль T-04', verb: 'Диагностика', action: openRepair });
    registerInteractable({ id: 'lab-console', group: labConsole, x: 19, z: -7.4, label: 'Лабораторный анализатор', verb: 'Исследовать пробу', action: openLab });
    registerInteractable({ id: 'pack-console', group: packConsole, x: 18.5, z: 11.6, label: 'Терминал упаковки', verb: 'Оформить партию', action: openPacking });
    registerInteractable({ id: 'career-terminal', group: careerTerminal, x: -2.7, z: 13.1, label: 'Карьерный терминал', verb: 'Завершить смену', action: openDebrief });

    // Сотрудники — короткие интервью доступны на всём маршруте.
    createWorker({
      id: 'mentor', roleId: 'technologist', name: 'Андрей Мельников', x: -20.6, z: -11.4, rotation: Math.PI * 0.82, color: 0x7357d9, range: 4.4,
      action: () => state.stage === 0 ? openBriefing() : openCareer('technologist', 'Андрей Мельников')
    });
    createWorker({ id: 'npc-safety', roleId: 'safety', name: 'Елена Юдина', x: -9.5, z: -10.6, rotation: -2.2, color: 0xff795f });
    createWorker({ id: 'npc-logistics', roleId: 'logistics', name: 'Денис Савин', x: -9.8, z: 9.8, rotation: -2.3, color: 0x438da8 });
    createWorker({ id: 'npc-operator', roleId: 'operator', name: 'Мария Ким', x: 7.6, z: 6.2, rotation: -2.8, color: 0x55b985 });
    createWorker({ id: 'npc-mechatronics', roleId: 'mechatronics', name: 'Илья Орлов', x: 8.1, z: -6.6, rotation: 2.4, color: 0x5137af });
    createWorker({ id: 'npc-lab', roleId: 'lab', name: 'Софья Волкова', x: 21.3, z: -7.3, rotation: -1.5, color: 0x9a78e8 });
  }

  buildFactory();

  const player = { position: new THREE.Vector3(-21.4, 1.68, -15), yaw: Math.PI + 0.24, pitch: -0.04, radius: 0.38, eyeHeight: 1.68, moving: false, bob: 0 };
  camera.position.copy(player.position);
  camera.rotation.y = player.yaw;

  updateHUD();
  updateStationMarkers();

  // ---------- Задания и образовательные сценарии ----------

  function openFirstSteps() {
    openModal({
      eyebrow: 'ПЕРВЫЕ 30 СЕКУНД · ЭТАП 1 ИЗ 12',
      title: 'Сначала подойдите к наставнику',
      html: `
        <p class="dialog-lead">Вы уже на проходной завода. Перед вами Андрей Мельников — он выдаст маршрут партии <b>PT-042</b>.</p>
        <div class="orientation-grid">
          <article><span>1</span>${svgIcon('walk')}<div><b>Подойдите</b><p>WASD или стрелки — движение, мышь — обзор.</p></div></article>
          <article><span>2</span>${svgIcon('target')}<div><b>Следуйте маяку</b><p>Коралловый указатель всегда отмечает текущую цель.</p></div></article>
          <article><span>3</span>${svgIcon('action')}<div><b>Поговорите</b><p>Рядом с объектом нажмите E или кнопку действия.</p></div></article>
        </div>
        <div class="orientation-objective">${svgIcon('target')}<div><small>ТЕКУЩАЯ ЦЕЛЬ</small><b>Андрей Мельников · прямо перед вами</b></div></div>`,
      choices: [
        {
          label: 'Понятно, начать смену', note: 'Закрыть инструкцию и подойти к наставнику', className: 'primary',
          action: () => {
            closeModal();
            showToast('Первая цель: подойдите к Андрею Мельникову и нажмите E', 'objective', 6500);
          }
        },
        {
          label: 'Сначала открыть карту', note: 'Посмотреть маршрут по восьми зонам',
          action: () => {
            closeModal();
            setTimeout(toggleMap, 40);
          }
        }
      ]
    });
  }

  function openBriefing() {
    openModal({
      eyebrow: 'НАСТАВНИК · АНДРЕЙ МЕЛЬНИКОВ',
      title: 'Добро пожаловать на ознакомительную смену',
      html: `
        <p class="dialog-lead">Сегодня вы проведёте тестовую партию <b>PT-042</b> от приёмки сырья до отгрузки. Ваша задача — не просто получить результат, а понять, как решения разных специалистов связаны между собой.</p>
        <blockquote>«Здесь безопасность всегда важнее скорости. При любом отклонении сначала остановите риск, затем разбирайтесь в причине».</blockquote>
        <div class="brief-route">
          <span>СИЗ</span><i>${svgIcon('arrow')}</i><span>Сырьё</span><i>${svgIcon('arrow')}</i><span>Линия</span><i>${svgIcon('arrow')}</i><span>Ремонт</span><i>${svgIcon('arrow')}</i><span>Качество</span><i>${svgIcon('arrow')}</i><span>Отгрузка</span>
        </div>
        <div class="micro-card role-preview">${svgIcon(roles.technologist.icon)}<div><b>${roles.technologist.name}</b><p>${roles.technologist.tagline}</p></div></div>`,
      choices: [{
        label: 'Принять маршрут смены', note: 'Получить цифровой пропуск PT-042', className: 'primary',
        action: () => {
          discoverCareer('technologist');
          awardCareer('technologist', 2);
          closeModal();
          advanceStage('briefing');
        }
      }]
    });
  }

  function openPPE() {
    openModal({
      eyebrow: 'ПУНКТ ОХРАНЫ ТРУДА · ДОПУСК В ЦЕХ',
      title: 'Выберите комплект средств защиты',
      html: `
        <p class="dialog-lead">В производственной зоне действуют шум, движущееся оборудование и риск попадания мелких частиц. Что нужно надеть перед входом?</p>
        <div class="equipment-grid">
          <span>${svgIcon('helmet')}<small>голова</small></span><span>${svgIcon('glasses')}<small>глаза</small></span><span>${svgIcon('vest')}<small>видимость</small></span><span>${svgIcon('hearing')}<small>слух</small></span>
        </div>`,
      choices: [
        {
          label: 'Каска, очки, сигнальный жилет и защита слуха', note: 'Полный комплект для этой зоны', className: 'primary',
          action: () => {
            state.ppe = true;
            awardCareer('safety', 2);
            closeModal();
            showToast('Допуск получен · полный комплект СИЗ надет', 'success');
            advanceStage('ppe');
          }
        },
        {
          label: 'Только каска и жилет', note: 'Так быстрее начать работу',
          action: () => {
            penalize('safety', 10, 'комплект не защищает глаза и слух');
            openPPE();
          }
        },
        {
          label: 'Обычная одежда, если не подходить к станкам',
          action: () => {
            penalize('safety', 10, 'СИЗ обязательны во всей производственной зоне');
            openPPE();
          }
        }
      ]
    });
  }

  const safetyQuestions = [
    {
      title: 'Ситуация 1/3 · сигнал отклонения',
      text: 'На пульте загорелся аварийный индикатор температуры. Производство ещё продолжается. Ваше первое действие?',
      answers: [
        { label: 'Остановить процесс по регламенту и сообщить ответственному', correct: true },
        { label: 'Подождать: возможно, показание вернётся в норму', feedback: 'Игнорировать аварийный сигнал нельзя: отклонение может быстро усилиться.' },
        { label: 'Увеличить скорость, чтобы быстрее закончить партию', feedback: 'Ускорение повышает риск повреждения оборудования и продукта.' }
      ]
    },
    {
      title: 'Ситуация 2/3 · ремонт',
      text: 'Конвейер остановлен кнопкой «Стоп». Можно ли сразу снимать защитный кожух?',
      answers: [
        { label: 'Нет. Сначала отключить, заблокировать и проверить энергию', correct: true },
        { label: 'Да, если двигатель больше не слышно', feedback: 'Тишина не подтверждает отсутствие электрической, пневматической или остаточной энергии.' },
        { label: 'Да, если рядом стоит второй сотрудник', feedback: 'Наблюдение коллеги не заменяет процедуру блокировки LOTO.' }
      ]
    },
    {
      title: 'Ситуация 3/3 · разлив',
      text: 'В проходе обнаружена жидкость неизвестного происхождения. Как действовать?',
      answers: [
        { label: 'Оградить участок, сообщить и применить регламент ликвидации', correct: true },
        { label: 'Быстро вытереть без обозначения зоны', feedback: 'Сначала нужно исключить доступ людей и определить вещество.' },
        { label: 'Обойти и продолжить маршрут', feedback: 'Необозначенный разлив остаётся риском для всей смены.' }
      ]
    }
  ];

  function openSafetyQuiz() {
    const question = safetyQuestions[state.quizIndex];
    if (!question) return;
    openModal({
      eyebrow: 'СИТУАЦИОННЫЙ ИНСТРУКТАЖ',
      title: question.title,
      html: `<p class="dialog-lead">${question.text}</p><div class="quiz-progress"><span style="width:${(state.quizIndex + 1) / safetyQuestions.length * 100}%"></span></div>`,
      choices: question.answers.map((answer) => ({
        label: answer.label,
        className: answer.correct ? 'recommended' : '',
        action: () => {
          if (answer.correct) {
            state.quizIndex += 1;
            awardCareer('safety', 1);
            playSuccess();
            if (state.quizIndex >= safetyQuestions.length) {
              closeModal();
              showToast('Инструктаж пройден · допуск в цех активирован', 'success');
              advanceStage('safety');
            } else {
              showToast('Верно · безопасность начинается с правильного первого действия', 'success');
              openSafetyQuiz();
              updateHUD();
            }
          } else {
            penalize('safety', 6, answer.feedback);
            openModal({
              eyebrow: 'РАЗБОР РЕШЕНИЯ',
              title: 'Это действие создаёт дополнительный риск',
              html: `<p class="dialog-lead">${answer.feedback}</p><div class="safety-callout">Опасный выбор не завершает симуляцию: разберите ошибку и попробуйте снова.</div>`,
              choices: [{ label: 'Вернуться к ситуации', className: 'primary', action: openSafetyQuiz }]
            });
          }
        }
      }))
    });
  }

  const palletData = {
    'pallet-a': { name: 'Палета A', code: 'RM-2241', status: 'Маркировка читается · упаковка цела · срок годности 18 месяцев', verdict: 'Соответствует входному контролю', tone: 'good' },
    'pallet-b': { name: 'Палета B', code: 'RM-2238', status: 'Нарушена внешняя упаковка · видны следы влаги', verdict: 'Требуется карантин и дополнительная проверка', tone: 'bad' },
    'pallet-c': { name: 'Палета C', code: '—', status: 'Транспортная тара цела · идентификационная этикетка отсутствует', verdict: 'Прослеживаемость не подтверждена', tone: 'bad' }
  };

  function markObjectComplete(id, text = 'ПРОВЕРЕНО') {
    const item = interactables.find((entry) => entry.id === id);
    if (!item || item.group.userData.completeTag) return;
    const tag = makeTextSprite(`ГОТОВО · ${text}`, { color: '#55b985', scale: 2.4, font: 28 });
    tag.position.set(0, item.group.userData.labelHeight ? item.group.userData.labelHeight - 0.45 : 2.05, 0);
    item.group.add(tag);
    item.group.userData.completeTag = tag;
  }

  function scanPallet(id) {
    const data = palletData[id];
    openModal({
      eyebrow: 'МОБИЛЬНЫЙ СКАНЕР · ВХОДНОЙ КОНТРОЛЬ',
      title: data.name,
      html: `
        <div class="scan-card ${data.tone}">
          <span class="scan-code">${data.code}</span>
          <p>${data.status}</p>
          <b>${data.verdict}</b>
        </div>
        <p class="dialog-note">На этом этапе ваша задача — собрать данные. Решение о партии принимается на терминале после осмотра всех палет.</p>`,
      choices: [{
        label: state.scanned.has(id) ? 'Данные уже сохранены' : 'Сохранить результат сканирования',
        className: 'primary',
        action: () => {
          state.scanned.add(id);
          awardCareer('logistics', 1);
          markObjectComplete(id);
          closeModal();
          updateHUD();
          updateStationMarkers();
          track('material_scanned', { pallet: id, result: data.tone });
          if (state.scanned.size === 3) showToast('Все палеты проверены · подтвердите сырьё на терминале', 'objective');
        }
      }]
    });
  }

  function openIntakeDecision() {
    openModal({
      eyebrow: 'ТЕРМИНАЛ ПРИЁМКИ · ПАРТИЯ PT-042',
      title: 'Какое сырьё можно передать на линию?',
      html: `
        <div class="compare-list">
          <span><b>A · RM-2241</b><small>цела, маркировка подтверждена</small></span>
          <span><b>B · RM-2238</b><small>повреждена, следы влаги</small></span>
          <span><b>C · без кода</b><small>нет прослеживаемости</small></span>
        </div>`,
      choices: [
        {
          label: 'Палета A · принять в производство', className: 'primary',
          action: () => {
            state.scanned.add('approved');
            awardCareer('logistics', 3);
            awardCareer('lab', 1);
            markObjectComplete('intake-console', 'ПРИНЯТО');
            closeModal();
            showToast('Сырьё RM-2241 передано в производство', 'success');
            advanceStage('receiving');
          }
        },
        {
          label: 'Палета B · повреждение не влияет на содержимое',
          action: () => { penalize('quality', 10, 'повреждённая упаковка нарушает входной контроль'); openIntakeDecision(); }
        },
        {
          label: 'Палета C · тара выглядит чистой',
          action: () => { penalize('quality', 10, 'без маркировки нельзя подтвердить происхождение сырья'); openIntakeDecision(); }
        }
      ]
    });
  }

  const lineSteps = [
    { label: 'Включить вентиляцию', note: 'Обеспечить безопасную воздушную среду' },
    { label: 'Запустить насос подачи', note: 'Подать сырьё в технологический контур' },
    { label: 'Активировать нагрев', note: 'Вывести участок на рабочий режим' },
    { label: 'Запустить конвейер', note: 'Начать движение продукта' }
  ];

  function openLineConsole() {
    if (currentStage()?.id === 'alarm') {
      openEmergencyStop();
      return;
    }
    const lamps = lineSteps.map((step, index) => `<span class="${index < state.lineSequence ? 'on' : ''}"><i>${index + 1}</i>${step.label}</span>`).join('');
    openModal({
      eyebrow: 'ГЛАВНЫЙ ПУЛЬТ · ЛИНИЯ L-04',
      title: 'Выполните последовательность запуска',
      html: `<div class="sequence-panel">${lamps}</div><p class="dialog-note">Неверный порядок сбрасывает автоматическую последовательность.</p>`,
      choices: lineSteps.map((step, index) => ({
        label: `${index + 1}. ${step.label}`,
        note: step.note,
        className: index === state.lineSequence ? 'recommended' : '',
        action: () => {
          if (index === state.lineSequence) {
            state.lineSequence += 1;
            playTone(440 + index * 90, 0.08, 'sine', 0.035);
            updateHUD();
            if (state.lineSequence === lineSteps.length) {
              awardCareer('operator', 4);
              awardCareer('technologist', 2);
              setLineStatus('running');
              markObjectComplete('line-console', 'ЛИНИЯ ЗАПУЩЕНА');
              closeModal();
              showToast('Линия L-04 работает в штатном режиме', 'success');
              advanceStage('line');
            } else openLineConsole();
          } else {
            state.lineSequence = 0;
            penalize('efficiency', 6, 'последовательность запуска сброшена');
            openLineConsole();
          }
        }
      }))
    });
  }

  const hazardData = {
    spill: {
      title: 'Разлив в транспортном проходе',
      text: 'Жидкость не идентифицирована, рядом движутся сотрудники и погрузчик.',
      correct: 'Оградить участок, сообщить и применить комплект ликвидации',
      wrong: ['Перешагнуть и продолжить обход', 'Вытереть ближайшей ветошью без ограждения']
    },
    guard: {
      title: 'Открыто защитное ограждение',
      text: 'Доступ к движущимся роликам конвейера не перекрыт.',
      correct: 'Остановить участок и восстановить ограждение до запуска',
      wrong: ['Предупредить коллег устно и оставить как есть', 'Закрыть ограждение на работающем конвейере']
    },
    aisle: {
      title: 'Загромождён эвакуационный маршрут',
      text: 'Транспортная тара перекрывает обозначенный проход.',
      correct: 'Переместить тару в выделенную зону хранения',
      wrong: ['Оставить: проходом редко пользуются', 'Перенести коробки ближе к оборудованию']
    }
  };

  function openHazard(id) {
    const hazard = hazardData[id];
    openModal({
      eyebrow: 'ОБХОД БЕЗОПАСНОСТИ · ОЦЕНКА РИСКА',
      title: hazard.title,
      html: `<p class="dialog-lead">${hazard.text}</p><div class="risk-level"><span></span><b>Требуется действие до продолжения работы</b></div>`,
      choices: [
        {
          label: hazard.correct, className: 'primary',
          action: () => {
            state.hazards.add(id);
            awardCareer('safety', 2);
            markObjectComplete(`hazard-${id}`, 'РИСК УСТРАНЁН');
            closeModal();
            showToast(`Риск устранён · ${state.hazards.size}/3`, 'success');
            updateHUD(); updateStationMarkers();
            track('hazard_resolved', { hazard: id });
            if (state.hazards.size === 3) advanceStage('hazards');
          }
        },
        ...hazard.wrong.map((label) => ({
          label,
          action: () => { penalize('safety', 8, 'выбран небезопасный способ устранения риска'); openHazard(id); }
        }))
      ]
    });
  }

  function openEmergencyStop() {
    openModal({
      eyebrow: 'АВАРИЙНЫЙ СИГНАЛ · ТЕМПЕРАТУРА T-04',
      title: 'Показание 91 °C при норме 70–74 °C',
      html: `
        <div class="alarm-readout"><span>91.0</span><small>°C</small><i>ПРЕДЕЛ 74.0</i></div>
        <p class="dialog-lead">Продолжение процесса может повредить продукт и насосный модуль. Выберите первое действие.</p>`,
      choices: [
        {
          label: 'Выполнить аварийную остановку линии', note: 'Зафиксировать событие и вызвать ремонтную службу', className: 'danger',
          action: () => {
            setLineStatus('stopped');
            awardCareer('operator', 2); awardCareer('safety', 2);
            closeModal();
            showToast('Линия остановлена безопасно · переходите к блокировке энергии', 'success');
            advanceStage('alarm');
          }
        },
        { label: 'Снизить скорость и наблюдать ещё минуту', action: () => { penalize('safety', 12, 'при превышении предела наблюдение недостаточно'); openEmergencyStop(); } },
        { label: 'Сбросить сигнал и продолжить выпуск', action: () => { penalize('safety', 15, 'сброс тревоги не устраняет причину перегрева'); openEmergencyStop(); } }
      ]
    });
  }

  const lotoSteps = [
    { label: 'Подтвердить остановку оборудования', note: 'Все движущиеся части остановлены' },
    { label: 'Отключить источники энергии', note: 'Электричество и давление изолированы' },
    { label: 'Установить персональный блокиратор', note: 'Повторный запуск физически исключён' },
    { label: 'Проверить отсутствие энергии', note: 'Контрольная попытка пуска и измерение' }
  ];

  function openLoto() {
    const rows = lotoSteps.map((step, index) => `<span class="${index < state.lotoSequence ? 'on' : ''}"><i>${index < state.lotoSequence ? svgIcon('check') : index + 1}</i>${step.label}</span>`).join('');
    openModal({
      eyebrow: 'LOTO · БЛОКИРОВКА И МАРКИРОВКА ЭНЕРГИИ',
      title: 'Подготовьте модуль T-04 к ремонту',
      html: `<div class="sequence-panel loto">${rows}</div><div class="safety-callout">Ремонт разрешён только после подтверждения нулевой энергии.</div>`,
      choices: lotoSteps.map((step, index) => ({
        label: `${index + 1}. ${step.label}`, note: step.note,
        className: index === state.lotoSequence ? 'recommended' : '',
        action: () => {
          if (index === state.lotoSequence) {
            state.lotoSequence += 1; updateHUD();
            if (state.lotoSequence === lotoSteps.length) {
              awardCareer('mechatronics', 3); awardCareer('safety', 3);
              markObjectComplete('loto', 'ЭНЕРГИЯ ЗАБЛОКИРОВАНА');
              closeModal();
              showToast('Нулевая энергия подтверждена · ремонт разрешён', 'success');
              advanceStage('loto');
            } else openLoto();
          } else {
            state.lotoSequence = 0;
            penalize('safety', 10, 'процедуру LOTO необходимо выполнять строго по порядку');
            openLoto();
          }
        }
      }))
    });
  }

  function openRepair() {
    if (state.repairStep === 0) {
      openModal({
        eyebrow: 'ДИАГНОСТИКА · НАСОСНЫЙ МОДУЛЬ T-04',
        title: 'Сопоставьте показания датчиков',
        html: `
          <div class="sensor-grid">
            <article><span class="cyan">P-14</span><b>4.2 bar</b><small>норма 4.0–4.5</small></article>
            <article><span class="red">T-04</span><b>91.0 °C</b><small>норма 70–74</small></article>
            <article><span class="green">V-08</span><b>1.8 mm/s</b><small>норма до 2.5</small></article>
          </div>
          <p class="dialog-lead">Какой датчик показывает аномалию и требует проверки?</p>`,
        choices: [
          {
            label: 'Датчик температуры T-04', className: 'primary',
            action: () => { state.repairStep = 1; awardCareer('mechatronics', 2); updateHUD(); openRepair(); }
          },
          { label: 'Датчик давления P-14', action: () => { state.sensorAttempts += 1; penalize('efficiency', 8, 'давление находится в рабочем диапазоне'); openRepair(); } },
          { label: 'Датчик вибрации V-08', action: () => { state.sensorAttempts += 1; penalize('efficiency', 8, 'вибрация находится в рабочем диапазоне'); openRepair(); } }
        ]
      });
      return;
    }

    openModal({
      eyebrow: 'РЕМОНТ · ДАТЧИК T-04 ИДЕНТИФИЦИРОВАН',
      title: 'Завершите замену и контрольный тест',
      html: `
        <div class="repair-steps">
          <span class="done">${svgIcon('check')} Энергия заблокирована</span>
          <span class="done">${svgIcon('check')} Неисправность локализована</span>
          <span>${svgIcon('circle')} Новый датчик установлен</span>
          <span>${svgIcon('circle')} Контрольный сигнал 72 °C</span>
        </div>
        <p class="dialog-note">Перед тестом убедитесь, что инструмент убран, кожух закрыт, а персонал вышел из опасной зоны.</p>`,
      choices: [{
        label: 'Установить датчик, закрыть кожух и выполнить тест', className: 'primary',
        action: () => {
          state.repairStep = 2;
          awardCareer('mechatronics', state.sensorAttempts === 0 ? 5 : 3);
          setLineStatus('ready');
          markObjectComplete('sensor', 'ДАТЧИК ИСПРАВЕН');
          closeModal();
          showToast('Контрольный сигнал: 72.0 °C · модуль исправен', 'success');
          advanceStage('repair');
        }
      }]
    });
  }

  const labTests = {
    temperature: { name: 'Измерить температуру', value: '72.1 °C', range: 'допуск 70–74 °C' },
    ph: { name: 'Измерить кислотность', value: 'pH 6.7', range: 'допуск 6.5–6.9' },
    mass: { name: 'Проверить массу', value: '1002 г', range: 'допуск 995–1005 г' }
  };

  function openLab() {
    const readings = Object.entries(labTests).map(([id, test]) => `
      <article class="${state.measurements.has(id) ? 'measured' : ''}">
        <small>${test.name}</small><b>${state.measurements.has(id) ? test.value : '—'}</b><span>${test.range}</span>
      </article>`).join('');
    const allMeasured = Object.keys(labTests).every((id) => state.measurements.has(id));
    const choices = allMeasured ? [
      {
        label: 'Выпустить партию · все параметры в допуске', className: 'primary',
        action: () => {
          state.measurements.add('released');
          awardCareer('lab', 5); awardCareer('technologist', 1);
          setLineStatus('running');
          markObjectComplete('lab-console', 'КАЧЕСТВО ПОДТВЕРЖДЕНО');
          closeModal();
          showToast('Партия PT-042 соответствует требованиям качества', 'success');
          advanceStage('quality');
        }
      },
      { label: 'Забраковать партию · значения недопустимы', action: () => { penalize('quality', 10, 'все три значения находятся внутри допусков'); openLab(); } }
    ] : Object.entries(labTests).filter(([id]) => !state.measurements.has(id)).map(([id, test]) => ({
      label: test.name, note: 'Выполнить измерение образца',
      action: () => {
        state.measurements.add(id); awardCareer('lab', 1); updateHUD();
        playTone(590 + state.measurements.size * 80, 0.08, 'sine', 0.03);
        openLab();
      }
    }));

    openModal({
      eyebrow: 'ЛАБОРАТОРИЯ КАЧЕСТВА · ПРОБА PT-042',
      title: allMeasured ? 'Примите решение о выпуске' : 'Выполните три контрольных измерения',
      html: `<div class="lab-readings">${readings}</div><p class="dialog-note">Результат считается соответствующим, только если каждое значение попадает в установленный диапазон.</p>`,
      choices
    });
  }

  function openPacking() {
    if (state.packagingStep === 0) {
      openModal({
        eyebrow: 'УПАКОВКА · МАРКИРОВКА ПРОДУКЦИИ',
        title: 'Выберите этикетку для партии PT-042',
        html: `<p class="dialog-lead">Этикетка должна позволять восстановить происхождение, дату выпуска и результат контроля качества.</p>`,
        choices: [
          {
            label: 'PT-042 · 02.09.2026 · RM-2241 · QR-протокол качества', className: 'primary',
            action: () => { state.packagingStep = 1; awardCareer('logistics', 2); updateHUD(); openPacking(); }
          },
          { label: 'Готовая продукция · без номера партии', action: () => { penalize('quality', 8, 'без номера партии теряется прослеживаемость'); openPacking(); } },
          { label: 'PT-041 · вчерашняя этикетка со склада', action: () => { penalize('quality', 10, 'этикетка относится к другой партии'); openPacking(); } }
        ]
      });
      return;
    }

    openModal({
      eyebrow: 'ОТГРУЗКА · МАРШРУТ ГОТОВОЙ ПРОДУКЦИИ',
      title: 'Назначьте следующий пункт партии',
      html: `
        <div class="route-options">
          <span><b>A</b> Прямо к воротам без складского сканирования</span>
          <span><b>B</b> Склад готовой продукции, контрольный скан, ворота 3</span>
          <span><b>C</b> Вернуть на приёмку сырья</span>
        </div>`,
      choices: [
        {
          label: 'Маршрут B · склад, скан, ворота 3', className: 'primary',
          action: () => {
            state.packagingStep = 2;
            awardCareer('logistics', 4);
            markObjectComplete('pack-console', 'ГОТОВО К ОТГРУЗКЕ');
            closeModal();
            showToast('Партия PT-042 поставлена в очередь на ворота 3', 'success');
            advanceStage('packing');
          }
        },
        { label: 'Маршрут A · сразу к воротам', action: () => { penalize('efficiency', 8, 'пропущен обязательный контрольный скан'); openPacking(); } },
        { label: 'Маршрут C · вернуть на приёмку', action: () => { penalize('efficiency', 6, 'приёмка работает с входящим сырьём, не с готовой продукцией'); openPacking(); } }
      ]
    });
  }

  function openDebrief() {
    const score = Math.round((state.safety + state.quality + state.efficiency) / 3);
    openModal({
      eyebrow: 'ЦИФРОВОЙ ОТЧЁТ · СМЕНА PT-042',
      title: 'Партия прошла полный производственный цикл',
      html: `
        <div class="debrief-line"><span>Сырьё</span><i>${svgIcon('check')}</i><span>Процесс</span><i>${svgIcon('check')}</i><span>Ремонт</span><i>${svgIcon('check')}</i><span>Качество</span><i>${svgIcon('check')}</i><span>Отгрузка</span></div>
        <div class="debrief-score"><small>ПРЕДВАРИТЕЛЬНЫЙ РЕЗУЛЬТАТ</small><b>${score}</b><span>/ 100</span></div>
        <p class="dialog-lead">Вы увидели, как оператор, технолог, мехатроник, лаборатория, логистика и охрана труда создают один результат.</p>
        <p class="dialog-note">Открыто карьерных карточек: ${state.careers.size}/6. Остальные можно изучить и после завершения.</p>`,
      choices: [{
        label: 'Завершить смену и получить карьерный профиль', className: 'primary',
        action: () => {
          closeModal();
          advanceStage('debrief');
          showFinal();
        }
      }]
    });
  }

  function showFinal() {
    state.completed = true;
    resetControls(); releasePointer();
    const duration = Math.max(1, Math.round((performance.now() - state.startedAt) / 60000));
    const score = Math.round((state.safety + state.quality + state.efficiency) / 3);
    const rankedRoles = Object.entries(state.careerScores).sort((a, b) => b[1] - a[1]);
    const recommendations = rankedRoles.slice(0, 2).map(([id]) => id);

    ui.finalSummary.textContent = `За ${duration} мин. вы безопасно восстановили линию, подтвердили качество и подготовили тестовую партию к отгрузке.`;
    ui.finalScores.innerHTML = `
      <article><small>ОБЩИЙ РЕЗУЛЬТАТ</small><b>${score}</b><span>/100</span></article>
      <article><small>БЕЗОПАСНОСТЬ</small><b>${state.safety}</b><span>/100</span></article>
      <article><small>КАЧЕСТВО</small><b>${state.quality}</b><span>/100</span></article>
      <article><small>ЭФФЕКТИВНОСТЬ</small><b>${state.efficiency}</b><span>/100</span></article>`;

    ui.careerRecommendations.innerHTML = recommendations.map((id, index) => {
      const role = roles[id];
      return `<article style="--role:${role.color}"><span>${svgIcon(role.icon)}</span><div><small>${index === 0 ? 'ОСНОВНАЯ РЕКОМЕНДАЦИЯ' : 'ТАКЖЕ ПОДХОДИТ'}</small><b>${role.name}</b><p>${role.tagline}</p><em>${role.skills.slice(0, 2).join(' · ')}</em></div></article>`;
    }).join('');

    const badges = [
      { icon: 'check', name: 'Смена завершена', text: 'Партия прошла весь маршрут', earned: true },
      { icon: 'shield', name: 'Безопасная смена', text: 'Без ошибок безопасности', earned: state.safety === 100 },
      { icon: 'tools', name: 'Точный диагност', text: 'Датчик найден с первой попытки', earned: state.sensorAttempts === 0 },
      { icon: 'flask', name: 'Знак качества', text: 'Все решения по качеству верны', earned: state.quality === 100 },
      { icon: 'career', name: 'Исследователь профессий', text: 'Открыты все 6 карточек', earned: state.careers.size === 6 }
    ];
    const earnedCount = badges.filter((badge) => badge.earned).length;
    ui.badgeCount.textContent = `${earnedCount} из ${badges.length} получено`;
    ui.badgeGrid.innerHTML = badges.map((badge) => `<article class="${badge.earned ? 'earned' : 'locked'}"><span>${svgIcon(badge.icon)}</span><div><b>${badge.name}</b><small>${badge.text}</small></div></article>`).join('');

    ui.final.hidden = false;
    ui.final.scrollTop = 0;
    track('tour_complete', { durationMinutes: duration, score, safety: state.safety, quality: state.quality, efficiency: state.efficiency, careers: state.careers.size, recommendations });
    requestAnimationFrame(() => ui.applyBtn.focus());
  }

  function showAllCareers() {
    const cards = Object.entries(roles).map(([id, role]) => `
      <article class="all-role ${state.careers.has(id) ? 'discovered' : ''}" style="--role:${role.color}">
        <span>${svgIcon(role.icon)}</span><div><small>${state.careers.has(id) ? 'ОТКРЫТО В ТУРЕ' : 'ДОСТУПНО ДЛЯ ИЗУЧЕНИЯ'}</small><b>${role.name}</b><p>${role.duties}</p><em>${role.study}</em></div>
      </article>`).join('');
    openModal({
      eyebrow: 'КАРЬЕРНЫЙ НАВИГАТОР · 6 НАПРАВЛЕНИЙ',
      title: 'Профессии современного производства',
      html: `<div class="all-roles">${cards}</div>`, wide: true,
      choices: [{ label: 'Вернуться к результатам', className: 'primary', action: closeModal }]
    });
  }

  function openApplication() {
    openModal({
      eyebrow: 'HR-КОНВЕРСИЯ · ДЕМОНСТРАЦИОННАЯ ФОРМА',
      title: 'Интерес к экскурсии или стажировке',
      html: `
        <p class="dialog-lead">В рабочей версии этот шаг связывает виртуальный тур с HR-процессом компании.</p>
        <div class="demo-form">
          <label>Имя или псевдоним<input id="demoName" type="text" maxlength="50" autocomplete="off" placeholder="Например, Алекс"></label>
          <label>Интересующее направление<select id="demoDirection">
            <option>Экскурсия на предприятие</option><option>Стажировка</option><option>Производственная практика</option><option>Подробнее о профессиях</option>
          </select></label>
          <label class="consent"><input id="demoConsent" type="checkbox"><span>Понимаю, что это демонстрация и данные никуда не отправляются</span></label>
        </div>`,
      choices: [{
        label: 'Зафиксировать интерес в деморежиме', className: 'primary',
        action: () => {
          const name = $('#demoName')?.value.trim();
          const consent = $('#demoConsent')?.checked;
          const direction = $('#demoDirection')?.value;
          if (!name || !consent) {
            showToast('Введите имя и подтвердите условия деморежима', 'danger');
            return;
          }
          track('hr_interest', { direction });
          openModal({
            eyebrow: 'ДЕМО-СОБЫТИЕ ЗАФИКСИРОВАНО',
            title: 'Спасибо за интерес к производству',
            html: `<div class="application-success"><span>${svgIcon('check')}</span><p>В реальном внедрении здесь появится подтверждение от HR или ссылка на форму компании. В этом прототипе данные не сохранялись и не отправлялись.</p></div>`,
            choices: [{ label: 'Вернуться к результатам', className: 'primary', action: closeModal }]
          });
        }
      }]
    });
  }

  // ---------- Навигация, ввод и основной цикл ----------

  const joy = { x: 0, y: 0, pointerId: null };
  const pressedKeys = new Set();
  const keyDownAt = new Map();
  const runPointers = new Set();
  let lookPointerId = null;
  let lastLookX = 0;
  let lastLookY = 0;
  let nearbyInteractable = null;

  function inputBlocked() {
    return !state.started || state.modalOpen || state.mapOpen || state.completed || document.hidden;
  }

  function openMap() {
    if (!state.started || state.completed || state.modalOpen) return;
    resetControls(); releasePointer();
    state.mapOpen = true;
    document.body.classList.add('overlay-open');
    updateMapDots();
    ui.map.hidden = false;
    requestAnimationFrame(() => ui.mapClose.focus());
    track('map_opened');
  }

  function closeMap() {
    state.mapOpen = false;
    ui.map.hidden = true;
    document.body.classList.remove('overlay-open');
    resetControls();
  }

  function toggleMap() {
    if (state.mapOpen) closeMap(); else openMap();
  }

  function mapCoordinates(position) {
    return {
      left: THREE.MathUtils.clamp((position.x + 25) / 50 * 100, 1.5, 98.5),
      top: THREE.MathUtils.clamp((19 - position.z) / 38 * 100, 1.5, 98.5)
    };
  }

  function objectiveTarget() {
    const targetIds = new Set(currentTargetIds());
    return interactables
      .filter((item) => targetIds.has(item.id))
      .sort((a, b) => player.position.distanceTo(a.position) - player.position.distanceTo(b.position))[0] || null;
  }

  function updateMapDots() {
    const playerMap = mapCoordinates(player.position);
    ui.playerDot.style.left = `${playerMap.left}%`;
    ui.playerDot.style.top = `${playerMap.top}%`;
    const target = objectiveTarget();
    if (target) {
      const targetMap = mapCoordinates(target.position);
      ui.targetDot.style.left = `${targetMap.left}%`;
      ui.targetDot.style.top = `${targetMap.top}%`;
      ui.targetDot.hidden = false;
    } else ui.targetDot.hidden = true;
  }

  function playerBlockedAt(x, z) {
    return colliders.some((collider) =>
      x + player.radius > collider.min.x && x - player.radius < collider.max.x &&
      z + player.radius > collider.min.z && z - player.radius < collider.max.z
    );
  }

  function movePlayer(dx, dz) {
    const distance = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(distance / 0.12));
    const sx = dx / steps; const sz = dz / steps;
    for (let index = 0; index < steps; index += 1) {
      const nx = player.position.x + sx;
      if (!playerBlockedAt(nx, player.position.z)) player.position.x = nx;
      const nz = player.position.z + sz;
      if (!playerBlockedAt(player.position.x, nz)) player.position.z = nz;
    }
  }

  function isItemAvailable(item) {
    if (item.career) return true;
    return currentTargetIds().includes(item.id);
  }

  function updateInteraction() {
    const forwardX = -Math.sin(player.yaw);
    const forwardZ = -Math.cos(player.yaw);
    let nearest = null;
    let bestScore = Infinity;
    const targetIds = new Set(currentTargetIds());

    if (!inputBlocked()) {
      for (const item of interactables) {
        if (!isItemAvailable(item)) continue;
        const dx = item.position.x - player.position.x;
        const dz = item.position.z - player.position.z;
        const distance = Math.hypot(dx, dz);
        if (distance > item.range) continue;
        const facing = distance > 0.01 ? (dx / distance) * forwardX + (dz / distance) * forwardZ : 1;
        if (distance > 1.15 && facing < -0.08) continue;
        const score = distance - (targetIds.has(item.id) ? 0.4 : 0) - facing * 0.16;
        if (score < bestScore) { nearest = item; bestScore = score; }
      }
    }

    nearbyInteractable = nearest;
    for (const item of interactables) {
      const distance = player.position.distanceTo(item.position);
      const targetVisible = item.group.userData.isTarget && distance < 11.5;
      const careerVisible = item.career && distance < 5.2;
      item.tag.visible = item === nearest || targetVisible || careerVisible;
      if (item.group.userData.completeTag && !item.career) item.tag.visible = false;
    }

    if (nearest) {
      ui.prompt.hidden = false;
      if (finePointer) ui.promptKey.textContent = 'E';
      else ui.promptKey.innerHTML = svgIcon('action');
      ui.promptText.textContent = nearest.verb;
      ui.promptLabel.textContent = nearest.label;
      ui.interact.hidden = false;
      ui.interact.querySelector('span').textContent = nearest.verb.toUpperCase();
      ui.interact.querySelector('small').textContent = nearest.label;
    } else {
      ui.prompt.hidden = true;
      ui.interact.hidden = true;
    }
  }

  function interact() {
    if (!nearbyInteractable || inputBlocked()) return;
    track('interaction', { target: nearbyInteractable.id });
    nearbyInteractable.action();
  }

  function updateObjective(time) {
    const target = objectiveTarget();
    if (!target || state.completed) {
      objectiveBeacon.visible = false;
      ui.distance.textContent = '';
      return;
    }
    objectiveBeacon.visible = true;
    objectiveBeacon.position.set(target.position.x, 0.02, target.position.z);
    const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 0.004) * 0.08;
    objectiveBeacon.userData.ring.scale.setScalar(pulse);
    objectiveBeacon.userData.ring.rotation.z = reducedMotion ? 0 : time * 0.0007;
    const distance = player.position.distanceTo(target.position);
    ui.distance.textContent = `${Math.round(distance)} м`;
    if (state.mapOpen) updateMapDots();
  }

  function updateJoystick(event) {
    const rect = ui.joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = Math.max(32, rect.width * 0.33);
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const length = Math.hypot(dx, dy) || 1;
    if (length > max) { dx *= max / length; dy *= max / length; }
    joy.x = dx / max; joy.y = dy / max;
    ui.stick.style.transform = `translate(${dx}px,${dy}px)`;
  }

  ui.joystick.addEventListener('pointerdown', (event) => {
    if (joy.pointerId !== null || inputBlocked()) return;
    joy.pointerId = event.pointerId;
    ui.joystick.setPointerCapture?.(event.pointerId);
    updateJoystick(event);
    event.preventDefault();
  });
  ui.joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId === joy.pointerId) { updateJoystick(event); event.preventDefault(); }
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    ui.joystick.addEventListener(type, (event) => {
      if (event.pointerId !== joy.pointerId) return;
      joy.pointerId = null; joy.x = 0; joy.y = 0;
      ui.stick.style.transform = 'translate(0,0)';
      event.preventDefault();
    });
  }

  ui.look.addEventListener('pointerdown', (event) => {
    if (inputBlocked()) return;
    if (finePointer && event.pointerType === 'mouse') {
      renderer.domElement.requestPointerLock?.();
      event.preventDefault();
      return;
    }
    if (lookPointerId !== null) return;
    lookPointerId = event.pointerId;
    lastLookX = event.clientX; lastLookY = event.clientY;
    ui.look.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (!finePointer || event.pointerType !== 'mouse' || event.button !== 0 || inputBlocked()) return;
    if (document.pointerLockElement === renderer.domElement) return;
    renderer.domElement.focus({ preventScroll: true });
    renderer.domElement.requestPointerLock?.();
    event.preventDefault();
  });
  ui.look.addEventListener('pointermove', (event) => {
    if (event.pointerId !== lookPointerId || inputBlocked()) return;
    const dx = event.clientX - lastLookX;
    const dy = event.clientY - lastLookY;
    lastLookX = event.clientX; lastLookY = event.clientY;
    player.yaw -= dx * 0.0047;
    player.pitch = THREE.MathUtils.clamp(player.pitch - dy * 0.0044, -1.22, 1.18);
    event.preventDefault();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    ui.look.addEventListener(type, (event) => {
      if (event.pointerId === lookPointerId) { lookPointerId = null; event.preventDefault(); }
    });
  }

  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement !== renderer.domElement || inputBlocked()) return;
    player.yaw -= event.movementX * 0.00225;
    player.pitch = THREE.MathUtils.clamp(player.pitch - event.movementY * 0.0021, -1.22, 1.18);
  });

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === renderer.domElement;
    ui.pointerTip.classList.toggle('hidden', locked || !state.started || !finePointer);
  });

  function bindHoldButton(element, pointers) {
    element.addEventListener('pointerdown', (event) => {
      if (inputBlocked()) return;
      pointers.add(event.pointerId); element.classList.add('active'); element.setPointerCapture?.(event.pointerId); event.preventDefault();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      element.addEventListener(type, (event) => {
        pointers.delete(event.pointerId); if (!pointers.size) element.classList.remove('active'); event.preventDefault();
      });
    }
  }
  bindHoldButton(ui.run, runPointers);

  ui.interact.addEventListener('click', interact);
  ui.mapBtn.addEventListener('click', toggleMap);
  ui.mapClose.addEventListener('click', closeMap);
  ui.hintBtn.addEventListener('click', showHint);
  ui.soundBtn.addEventListener('click', () => {
    state.sound = !state.sound;
    ui.soundBtn.innerHTML = svgIcon(state.sound ? 'volume' : 'volume-off');
    ui.soundBtn.setAttribute('aria-label', state.sound ? 'Выключить звук' : 'Включить звук');
    if (state.sound) playTone(540, 0.08, 'sine', 0.03);
  });
  ui.modalClose.addEventListener('click', closeModal);
  ui.modal.addEventListener('keydown', (event) => trapFocus(event, ui.modal));
  ui.map.addEventListener('keydown', (event) => trapFocus(event, ui.map));
  ui.careerDetailsBtn.addEventListener('click', showAllCareers);
  ui.applyBtn.addEventListener('click', openApplication);
  ui.restartBtn.addEventListener('click', () => location.reload());

  addEventListener('keydown', (event) => {
    const typing = /INPUT|SELECT|TEXTAREA/.test(event.target.tagName);
    if (event.code === 'Escape') {
      if (state.modalOpen) { closeModal(); event.preventDefault(); return; }
      if (state.mapOpen) { closeMap(); event.preventDefault(); return; }
    }
    if (state.modalOpen) return;
    if (event.code === 'Tab' && state.started && !state.completed) { toggleMap(); event.preventDefault(); return; }
    if (typing || inputBlocked()) return;
    if (event.code === 'KeyQ' || event.code === 'KeyR') {
      player.yaw += event.code === 'KeyQ' ? 0.18 : -0.18;
      event.preventDefault();
      return;
    }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      if (!pressedKeys.has(event.code)) keyDownAt.set(event.code, performance.now());
      pressedKeys.add(event.code); event.preventDefault();
    }
    if (event.code === 'KeyE') { interact(); event.preventDefault(); }
    if (event.code === 'KeyH') { showHint(); event.preventDefault(); }
  });
  addEventListener('keyup', (event) => {
    const began = keyDownAt.get(event.code);
    pressedKeys.delete(event.code);
    keyDownAt.delete(event.code);
    if (began === undefined || performance.now() - began > 90 || inputBlocked()) return;
    const step = 0.19;
    const fx = -Math.sin(player.yaw); const fz = -Math.cos(player.yaw);
    const rx = Math.cos(player.yaw); const rz = -Math.sin(player.yaw);
    if (event.code === 'KeyW' || event.code === 'ArrowUp') movePlayer(fx * step, fz * step);
    if (event.code === 'KeyS' || event.code === 'ArrowDown') movePlayer(-fx * step, -fz * step);
    if (event.code === 'KeyD' || event.code === 'ArrowRight') movePlayer(rx * step, rz * step);
    if (event.code === 'KeyA' || event.code === 'ArrowLeft') movePlayer(-rx * step, -rz * step);
  });
  addEventListener('blur', resetControls);
  document.addEventListener('visibilitychange', () => {
    resetControls();
    if (!document.hidden) clock.getDelta();
  });
  document.addEventListener('contextmenu', (event) => event.preventDefault());

  ui.startBtn.addEventListener('click', () => {
    state.started = true;
    state.startedAt = performance.now();
    state.careers.clear();
    ui.careers.textContent = '0';
    ui.start.classList.add('leaving');
    document.body.classList.add('game-started');
    ensureAudio(); playSuccess();
    setTimeout(() => { ui.start.hidden = true; ui.hud.hidden = false; }, reducedMotion ? 0 : 420);
    setTimeout(() => {
      openFirstSteps();
      if (finePointer) ui.pointerTip.classList.remove('hidden');
    }, reducedMotion ? 80 : 520);
    track('tour_started', { device: finePointer ? 'desktop' : 'touch' });
    clock.getDelta();
  });

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const movement = new THREE.Vector3();
  const clock = new THREE.Clock();
  let frameTime = 0;
  let frameCount = 0;
  let qualityChecked = false;

  function turnToward(current, target, speed, delta) {
    const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    return current + difference * Math.min(1, speed * delta);
  }

  function animateWorld(delta, time) {
    if (!reducedMotion) {
      for (const cloud of skyClouds) {
        cloud.group.position.x += delta * cloud.speed;
        cloud.group.position.z += delta * cloud.driftZ;
        if (cloud.group.position.x > 75) cloud.group.position.x = -75;
        if (cloud.group.position.z > 55) cloud.group.position.z = -55;
        if (cloud.group.position.z < -55) cloud.group.position.z = 55;
        cloud.group.position.y = cloud.baseY + Math.sin(time * 0.00022 + cloud.phase) * 0.28;
        cloud.group.rotation.y += delta * 0.0015;
      }
    }
    const running = state.lineStatus === 'running';
    for (const roller of conveyorRollers) {
      if (running && !reducedMotion) roller.rotation.z -= delta * 5.6;
    }
    for (const light of statusLights) {
      const pulse = state.lineStatus === 'alarm' ? 0.65 + Math.sin(time * 0.012) * 0.35 : 1;
      light.scale.setScalar(pulse);
    }
    if (alarmLight?.visible) alarmLight.intensity = 5.2 + Math.sin(time * 0.014) * 2.8;
    for (const item of interactables) {
      if (!item.tag.visible) continue;
      const emphasis = item.group.userData.isTarget ? 1 + Math.sin(time * 0.004) * 0.025 : 1;
      item.tag.position.y = item.tag.userData.baseY + (reducedMotion ? 0 : Math.sin(time * 0.0025 + item.position.x) * 0.025);
      item.tag.scale.copy(item.tag.userData.baseScale).multiplyScalar(emphasis);
    }
    for (const worker of animatedWorkers) {
      const dxToPlayer = player.position.x - worker.group.position.x;
      const dzToPlayer = player.position.z - worker.group.position.z;
      const playerDistance = Math.hypot(dxToPlayer, dzToPlayer);
      if (!state.started) worker.watching = false;
      else if (worker.watching && playerDistance > 6.25) worker.watching = false;
      else if (!worker.watching && playerDistance < 5.15) worker.watching = true;
      const watchingPlayer = worker.watching;
      let walking = false;

      if (!watchingPlayer && !reducedMotion) {
        worker.patrolClock += delta * worker.patrolSpeed;
        const routePosition = Math.sin(worker.patrolClock);
        const targetX = worker.origin.x + routePosition * worker.patrolRadius * worker.patrolAxisX;
        const targetZ = worker.origin.z + routePosition * worker.patrolRadius * worker.patrolAxisZ;
        const dx = targetX - worker.group.position.x;
        const dz = targetZ - worker.group.position.z;
        const travel = Math.hypot(dx, dz);
        if (travel > 0.001) {
          worker.group.position.x = THREE.MathUtils.damp(worker.group.position.x, targetX, 3.4, delta);
          worker.group.position.z = THREE.MathUtils.damp(worker.group.position.z, targetZ, 3.4, delta);
          worker.group.rotation.y = turnToward(worker.group.rotation.y, Math.atan2(dx, dz), 3.2, delta);
          walking = true;
        }
      } else if (watchingPlayer) {
        worker.group.rotation.y = turnToward(worker.group.rotation.y, Math.atan2(dxToPlayer, dzToPlayer), 4.8, delta);
      } else {
        worker.group.rotation.y = turnToward(worker.group.rotation.y, worker.homeRotation, 2.2, delta);
      }

      worker.motion = THREE.MathUtils.damp(worker.motion, walking ? 1 : 0, walking ? 4.2 : 6.5, delta);
      worker.phase += delta * (1.5 + worker.motion * 5.7);
      const stride = reducedMotion ? 0 : Math.sin(worker.phase) * 0.52 * worker.motion;
      const idleArms = reducedMotion ? 0 : Math.sin(worker.phase * 0.42) * 0.022 * (1 - worker.motion);
      worker.armL.rotation.x = stride + idleArms;
      worker.armR.rotation.x = -stride - idleArms;
      worker.legL.rotation.x = -stride * 0.72;
      worker.legR.rotation.x = stride * 0.72;
      worker.group.position.y = worker.baseY + (reducedMotion ? 0 : Math.abs(Math.sin(worker.phase)) * 0.014 * worker.motion);
      worker.item.position.set(worker.group.position.x, 0, worker.group.position.z);
    }
  }

  function updatePlayer(delta) {
    if (inputBlocked()) { player.moving = false; return; }
    const keyForward = (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp') ? 1 : 0) - (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown') ? 1 : 0);
    const keyRight = (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight') ? 1 : 0) - (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft') ? 1 : 0);
    const inputForward = THREE.MathUtils.clamp(-joy.y + keyForward, -1, 1);
    const inputRight = THREE.MathUtils.clamp(joy.x + keyRight, -1, 1);
    forward.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    movement.set(0, 0, 0).addScaledVector(forward, inputForward).addScaledVector(right, inputRight);
    if (movement.lengthSq() > 1) movement.normalize();
    player.moving = movement.lengthSq() > 0.002;
    const fast = runPointers.size > 0 || pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight');
    const speed = fast ? 5.25 : 3.35;
    movePlayer(movement.x * speed * delta, movement.z * speed * delta);
    if (player.moving && !reducedMotion) player.bob += delta * (fast ? 10.5 : 7.2);
    const bob = player.moving && !reducedMotion ? Math.sin(player.bob) * 0.025 : 0;
    camera.position.set(player.position.x, player.eyeHeight + bob, player.position.z);
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
  }

  function monitorPerformance(delta) {
    if (qualityChecked || state.modalOpen || state.mapOpen || !state.started) return;
    frameTime += delta; frameCount += 1;
    if (frameTime < 4.5) return;
    const fps = frameCount / frameTime;
    if (fps < 42 && pixelRatio > 1.01) {
      pixelRatio = Math.max(1, pixelRatio * 0.78);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(innerWidth, innerHeight, false);
      track('quality_adjusted', { fps: Math.round(fps), pixelRatio: Number(pixelRatio.toFixed(2)) });
    }
    qualityChecked = true;
  }

  function loop(time) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const delta = Math.min(clock.getDelta(), 0.08);
    if (!state.started) return;
    updatePlayer(delta);
    animateWorld(delta, time);
    updateInteraction();
    updateObjective(time);
    monitorPerformance(delta);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(innerWidth, innerHeight);
    updateMapDots();
  });
})();
