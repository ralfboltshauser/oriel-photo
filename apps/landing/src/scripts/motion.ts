const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

document.documentElement.classList.add('js');
document.documentElement.dataset.reducedMotion = String(reducedMotionQuery.matches);
document.documentElement.dataset.motionReady = 'true';

function initializeReveals(): void {
  const elements = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (reducedMotionQuery.matches || !('IntersectionObserver' in window)) {
    elements.forEach((element) => element.setAttribute('data-visible', 'true'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).setAttribute('data-visible', 'true');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );

  elements.forEach((element) => observer.observe(element));
}

function initializePageProgress(): void {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  const indicator = document.querySelector<HTMLElement>('[data-scroll-progress]');
  if (!header || !indicator) return;

  let scheduled = false;
  const update = (): void => {
    const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
    header.dataset.scrolled = String(window.scrollY > 24);
    indicator.style.transform = `scaleX(${progress.toFixed(4)})`;
    scheduled = false;
  };

  const requestUpdate = (): void => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
}

function initializePointerStage(): void {
  if (reducedMotionQuery.matches || !finePointerQuery.matches) return;

  const stage = document.querySelector<HTMLElement>('[data-pointer-stage]');
  const tilt = stage?.querySelector<HTMLElement>('[data-tilt]');
  if (!stage || !tilt) return;

  let targetX = 1.4;
  let targetY = -1.1;
  let currentX = targetX;
  let currentY = targetY;
  let frameId = 0;

  const animate = (): void => {
    currentX += (targetX - currentX) * 0.16;
    currentY += (targetY - currentY) * 0.16;
    tilt.style.setProperty('--tilt-x', `${currentX.toFixed(3)}deg`);
    tilt.style.setProperty('--tilt-y', `${currentY.toFixed(3)}deg`);

    if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.012) {
      frameId = window.requestAnimationFrame(animate);
    } else {
      frameId = 0;
    }
  };

  const requestAnimation = (): void => {
    if (frameId === 0) frameId = window.requestAnimationFrame(animate);
  };

  stage.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const bounds = stage.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1);
    stage.style.setProperty('--pointer-x', `${(x * 100).toFixed(2)}%`);
    stage.style.setProperty('--pointer-y', `${(y * 100).toFixed(2)}%`);
    targetX = (0.5 - y) * 2.2;
    targetY = (x - 0.5) * 2.8;
    requestAnimation();
  });

  stage.addEventListener('pointerleave', () => {
    targetX = 1.4;
    targetY = -1.1;
    stage.style.removeProperty('--pointer-x');
    stage.style.removeProperty('--pointer-y');
    requestAnimation();
  });
}

function initializeWorkflow(): void {
  const story = document.querySelector<HTMLElement>('[data-workflow-story]');
  if (!story) return;

  const steps = [...story.querySelectorAll<HTMLElement>('[data-workflow-step]')];
  const frames = [...story.querySelectorAll<HTMLElement>('[data-workflow-frame]')];
  const progress = story.querySelector<HTMLElement>('[data-workflow-progress]');

  const activate = (stage: string): void => {
    const index = steps.findIndex((step) => step.dataset.stage === stage);
    if (index < 0) return;

    steps.forEach((step) => {
      const active = step.dataset.stage === stage;
      step.dataset.active = String(active);
      if (active) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });

    frames.forEach((frame) => {
      const active = frame.dataset.stage === stage;
      frame.dataset.active = String(active);
      frame.setAttribute('aria-hidden', String(!active));
    });

    if (progress) progress.textContent = `${String(index + 1).padStart(2, '0')} / 04`;
  };

  if (reducedMotionQuery.matches || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const stage = (visible?.target as HTMLElement | undefined)?.dataset.stage;
      if (stage) activate(stage);
    },
    { rootMargin: '-34% 0px -44% 0px', threshold: [0, 0.15, 0.35, 0.65] },
  );

  steps.forEach((step) => observer.observe(step));
}

function initializeBeforeAfter(): void {
  const comparisons = [...document.querySelectorAll<HTMLElement>('[data-before-after]')];
  comparisons.forEach((comparison) => {
    const control = comparison.querySelector<HTMLInputElement>('[data-comparison-control]');
    if (!control) return;

    const update = (): void => {
      comparison.style.setProperty('--comparison', `${control.value}%`);
      control.setAttribute('aria-valuetext', `${control.value}% edited preview visible`);
    };

    update();
    control.addEventListener('input', update);
  });
}

initializeReveals();
initializePageProgress();
initializePointerStage();
initializeWorkflow();
initializeBeforeAfter();
