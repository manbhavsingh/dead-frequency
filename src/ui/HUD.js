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
    $('objective-text').textContent = player.memory
      ? 'REACH EXTRACTION'
      : relayCount < relayTotal
        ? 'DISABLE SECURITY RELAYS ' + relayCount + ' / ' + relayTotal
        : 'RECOVER THE MEMORY FRAGMENT';
    $('alert-fill').style.width = security.alert + '%';
    $('alert-fill').style.background = security.alert > 70 ? '#ff5f66' : security.alert > 35 ? '#f2b65d' : '#55e2dc';
    $('alert-label').textContent = security.label;
    $('decoy-count').textContent = pad(player.decoys);
    $('jammer-count').textContent = pad(player.jammers);
    $('relay-count').textContent = relayCount + ' / ' + relayTotal;
    $('memory-count').textContent = player.memory ? '1 / 1' : '0 / 1';
    $('timer').textContent = pad(game.elapsed / 60) + ':' + pad(game.elapsed % 60);
    $('status-line').textContent = game.status;
    $('nav-target').textContent = game.navLabel || 'OBJECTIVE';
    $('nav-direction').textContent = game.navDirection || '—';
    $('nav-distance').textContent = game.navDistance ? String(Math.round(game.navDistance)) : '—';
    $('interaction-hint').textContent = game.interactionHint || 'FOLLOW THE SIGNAL TO YOUR OBJECTIVE';
    const progress = $('action-progress-fill');
    progress.style.width = Math.round((game.actionProgress || 0) * 100) + '%';
    progress.style.opacity = game.actionProgress > 0 ? '1' : '0.22';
  }

  toast(text) {
    const element = $('toast');
    element.textContent = text;
    element.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => element.classList.add('hidden'), 2100);
  }
}
