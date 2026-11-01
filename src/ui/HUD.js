const $ = id => document.getElementById(id);
const pad = n => String(Math.floor(n)).padStart(2, '0');

export class HUD {
  update(game) {
    const l = game.level;
    const p = game.player;
    const s = game.security;
    $('mission-number').textContent = `MISSION ${pad(l.id)}`;
    $('mission-name').textContent = l.name;
    $('objective-text').textContent = p.memory ? 'REACH EXTRACTION' : 'RECOVER THE MEMORY FRAGMENT';
    $('alert-fill').style.width = `${s.alert}%`;
    $('alert-fill').style.background = s.alert > 70 ? '#ff5f66' : s.alert > 35 ? '#f2b65d' : '#55e2dc';
    $('alert-label').textContent = s.label;
    $('decoy-count').textContent = pad(p.decoys);
    $('jammer-count').textContent = pad(p.jammers);
    $('memory-count').textContent = p.memory ? '1 / 1' : '0 / 1';
    $('timer').textContent = `${pad(game.elapsed / 60)}:${pad(game.elapsed % 60)}`;
    $('status-line').textContent = game.status;
    $('nav-target').textContent = game.navLabel || 'OBJECTIVE';
    $('nav-direction').textContent = game.navDirection || '—';
    $('nav-distance').textContent = game.navDistance ? `${Math.round(game.navDistance)}M` : '—';
    $('interaction-hint').textContent = game.interactionHint || 'FOLLOW THE SIGNAL TO YOUR OBJECTIVE';
  }

  toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.add('hidden'), 1800);
  }
}
