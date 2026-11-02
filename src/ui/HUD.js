const $ = id => document.getElementById(id);
const pad = n => String(Math.floor(n)).padStart(2, '0');

export class HUD {
  update(game) {
    const level = game.level;
    const player = game.player;
    const security = game.security;
    const relayTotal = (level.relays || []).length;
    const relayCount = game.disabledRelays ? game.disabledRelays.size : 0;

    $('mission-number').textContent = 'MISSION ' + pad(level.id);
    $('mission-name').textContent = level.name;
    const pacingStage = $('pacing-stage');
    if (pacingStage) {
      const stageText = game.pacingRestActive
        ? 'MAINTENANCE SILENCE · ' + game.pacingRestTimer.toFixed(1) + 's'
        : 'STAGE ' + game.pacingStage + ' / 6 · ' + (game.pacingStageLabel || 'INFILTRATE');
      pacingStage.textContent = stageText;
    }
    $('objective-text').textContent = player.memory
      ? 'REACH EXTRACTION'
      : relayCount < relayTotal
        ? 'DISABLE SECURITY RELAYS ' + relayCount + ' / ' + relayTotal
        : 'RECOVER THE MEMORY FRAGMENT';
    $('alert-fill').style.width = security.alert + '%';
    $('alert-fill').style.background = security.alert > 70 ? '#ff5f66' : security.alert > 35 ? '#f2b65d' : '#55e2dc';
    $('alert-label').textContent = game.lockdownGraceActive
      ? 'LAST CHANCE ' + Math.ceil(game.lockdownGraceTimer) + 's'
      : security.label;
    const echoFill = $('echo-fill');
    const echoValue = $('echo-value');
    if (echoFill) echoFill.style.width = Math.round(game.echoResonance || 0) + '%';
    if (echoValue) echoValue.textContent = pad(game.echoResonance || 0) + '%';
    $('decoy-count').textContent = pad(player.decoys);
    $('jammer-count').textContent = pad(player.jammers);
    $('relay-count').textContent = relayCount + ' / ' + relayTotal;
    $('memory-count').textContent = player.memory ? '1 / 1' : '0 / 1';
    $('timer').textContent = pad(game.elapsed / 60) + ':' + pad(game.elapsed % 60);
    $('status-line').textContent = game.status;
    $('nav-target').textContent = game.navLabel || 'OBJECTIVE';
    $('nav-direction').textContent = game.navDirection || '—';
    $('nav-distance').textContent = game.navDistance ? String(Math.round(game.navDistance)) : '—';
    $('interaction-hint').textContent = game.pacingRestActive
      ? 'SAFE WINDOW — REPOSITION / PLAN · ' + game.pacingRestTimer.toFixed(1) + 's'
      : game.interactionHint || 'FOLLOW THE SIGNAL TO YOUR OBJECTIVE';
    const storyFeed = $('story-feed');
    if (storyFeed) storyFeed.textContent = game.storyMessage || 'QUIET-NET // NO NEW TRANSMISSION';
    const progress = $('action-progress-fill');
    const restProgress = game.pacingRestActive && game.pacingRestDuration
      ? game.pacingRestTimer / game.pacingRestDuration
      : null;
    const progressValue = restProgress == null ? (game.actionProgress || 0) : restProgress;
    progress.style.width = Math.round(progressValue * 100) + '%';
    progress.style.opacity = progressValue > 0 ? '1' : '0.22';
  }

  showStoryChoice(choice, onChoose) {
    const panel = $('story-choice');
    const options = $('story-choice-options');
    if (!panel || !options) return;

    $('story-choice-kicker').textContent = choice.kicker;
    $('story-choice-title').textContent = choice.title;
    $('story-choice-speaker').textContent = choice.speaker;
    $('story-choice-context').textContent = choice.context;
    options.replaceChildren();

    for (const option of choice.options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'story-choice-option';
      const title = document.createElement('strong');
      title.textContent = option.title;
      const detail = document.createElement('span');
      detail.textContent = option.detail;
      button.append(title, detail);
      button.addEventListener('click', () => onChoose(option.id), { once: true });
      options.append(button);
    }

    panel.classList.remove('hidden');
    options.querySelector('button')?.focus();
  }

  hideStoryChoice() {
    $('story-choice')?.classList.add('hidden');
  }

  toast(text) {
    const element = $('toast');
    element.textContent = text;
    element.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => element.classList.add('hidden'), 2100);
  }
}
