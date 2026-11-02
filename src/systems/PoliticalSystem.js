const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const pairKey = (a, b) => [a, b].sort().join(':');

export const POLITICAL_FACTIONS = [
  { id: 'residents', name: 'ASH QUARTER COMPACT', region: 'ASH QUARTER // LOWER CITY', government: 'Ward councils and shelter delegates', agenda: 'Local autonomy, clinic power, safe housing and civilian protection', leadership: 'Mara’s neighbourhood assembly', color: 'cyan' },
  { id: 'switchboard', name: 'SWITCHBOARD SYNDICATE', region: 'SERVICE SPINE // CITYWIDE', government: 'Federated courier cells under a rotating channel council', agenda: 'Open information, independent routes and control of repair infrastructure', leadership: 'Nix and the relay captains', color: 'amber' },
  { id: 'quietNet', name: 'QUIET-NET DIRECTORATE', region: 'ANTENNA ZERO // CENTRAL GRID', government: 'Centralised security directorate and district operators', agenda: 'Surveillance authority, network stability and control of civic infrastructure', leadership: 'The Directorate', color: 'red' },
  { id: 'rooks', name: 'ROOK SCAVENGER COMBINE', region: 'SHATTERBELT // OUTER FRINGE', government: 'Salvage crews governed by claim captains and charter votes', agenda: 'Mineral rights, salvage routes and protection from city authorities', leadership: 'The claim captains', color: 'orange' }
];

const FACTION_BY_ID = Object.fromEntries(POLITICAL_FACTIONS.map(faction => [faction.id, faction]));

const DEFAULT_STATE = {
  version: 1,
  influence: { residents: 24, switchboard: 22, quietNet: 39, rooks: 15 },
  relations: {
    [pairKey('residents', 'switchboard')]: 62,
    [pairKey('residents', 'quietNet')]: -72,
    [pairKey('residents', 'rooks')]: -24,
    [pairKey('switchboard', 'quietNet')]: -66,
    [pairKey('switchboard', 'rooks')]: -42,
    [pairKey('quietNet', 'rooks')]: 54
  },
  flags: {},
  actions: { diversions: 0, detections: 0, jammers: 0, cleanExtractions: 0 },
  events: []
};

const POLITICAL_EVENTS = {
  crewEvacuated: {
    once: true,
    title: 'THE ASH COMPACT OPENS ITS CHANNELS',
    text: 'The evacuation earns the Ash Quarter Compact new support. Switchboard couriers coordinate shelter routes, while Quiet-Net increases its scrutiny.',
    influence: { residents: 7, switchboard: 2, quietNet: -2 },
    relations: { 'residents:switchboard': 10, 'residents:quietNet': -7 }
  },
  rosterScrubbed: {
    once: true,
    title: 'THE ROSTER DISAPPEARS',
    text: 'The Switchboard gains leverage from the erased identities. The Compact questions the cost, and Quiet-Net loses part of its surveillance picture.',
    influence: { switchboard: 5, residents: -2, quietNet: -4 },
    relations: { 'residents:switchboard': 1, 'switchboard:quietNet': -6 }
  },
  clinicPowered: {
    once: true,
    title: 'THE CLINIC BECOMES A CIVIC POWER CENTRE',
    text: 'Residents rally around the clinic. The Compact gains leverage over district priorities and rejects another Quiet-Net power concession.',
    influence: { residents: 7, quietNet: -2 },
    relations: { 'residents:quietNet': -8, 'residents:switchboard': 2 }
  },
  towerUplink: {
    once: true,
    title: 'THE SWITCHBOARD SECURES THE SERVICE SPINE',
    text: 'The courier cells gain a valuable tower route. Their partnership with the Compact becomes more transactional after the clinic is left dark.',
    influence: { switchboard: 7, residents: -3, quietNet: -3 },
    relations: { 'residents:switchboard': -9, 'switchboard:quietNet': -3 }
  },
  archivePublished: {
    once: true,
    title: 'THE CROWN ARCHIVE BREAKS THE DIRECTORATE’S SEAL',
    text: 'The full archive increases support for the Compact and Switchboard. Quiet-Net loses public legitimacy, while the civilian names in the record remain exposed.',
    influence: { residents: 5, switchboard: 4, quietNet: -7 },
    relations: { 'residents:quietNet': -12, 'switchboard:quietNet': -10, 'residents:switchboard': 8 }
  },
  archiveRedacted: {
    once: true,
    title: 'THE CIVILIAN INDEX IS WITHHELD',
    text: 'Redaction strengthens the Compact’s protection mandate. The public record is incomplete, but Quiet-Net loses its location index.',
    influence: { residents: 4, switchboard: 2, quietNet: -4 },
    relations: { 'residents:quietNet': -5, 'residents:switchboard': 3 }
  },
  signalLens: {
    once: true,
    title: 'THE SWITCHBOARD GAINS A GLASSITE ADVANTAGE',
    text: 'Nix receives the Glassite signal lens. Switchboard technicians gain influence, and the Rooks see a valuable salvage claim leave the Shatterbelt.',
    influence: { switchboard: 5, rooks: -1 },
    relations: { 'switchboard:rooks': -7 }
  },
  echoSpool: {
    once: true,
    title: 'THE ASH QUARTER FUNDS ITS OWN SIGNAL NETWORK',
    text: 'Mara turns the Glassite into an echo spool. The Compact and Switchboard deepen their mutual-aid arrangement, while Rook claim captains object to the lost mineral.',
    influence: { residents: 5, switchboard: 1 },
    relations: { 'residents:rooks': -5, 'residents:switchboard': 4 }
  },
  keepCore: {
    once: true,
    title: 'A PRIVATE GLASSITE MARKET EMERGES',
    text: 'Ghost fences the final core through the Ash Quarter. Rook brokers lose a claim fee, but the mineral remains outside the civic gear network.',
    influence: { rooks: 3 },
    relations: { 'residents:rooks': -2 }
  },
  rookTruce: {
    once: true,
    title: 'THE SHATTERBELT TRUCE IS SIGNED',
    text: 'Ghost brokers a mineral-for-passage agreement. The Rooks open a channel to the Compact and Switchboard, loosening their dependence on Quiet-Net protection.',
    influence: { rooks: 4, residents: 2, switchboard: 2 },
    relations: { 'residents:rooks': 72, 'switchboard:rooks': 90, 'quietNet:rooks': -25 }
  },
  rookLedgerStolen: {
    once: true,
    title: 'THE ROOK–QUIET-NET CONTRACT IS EXPOSED',
    text: 'The survey ledger shows that Quiet-Net supplied patrol clearance codes in exchange for Shatterbelt tracking data. The private arrangement collapses; the Rooks now know their records were stolen.',
    influence: { residents: 3, switchboard: 4, quietNet: -4, rooks: -2 },
    relations: { 'quietNet:rooks': -96, 'residents:rooks': -18, 'switchboard:rooks': -18 },
    flags: { rookContractExposed: true }
  }
};

function mergeState(saved = {}) {
  return {
    ...DEFAULT_STATE,
    ...saved,
    influence: { ...DEFAULT_STATE.influence, ...(saved.influence || {}) },
    relations: { ...DEFAULT_STATE.relations, ...(saved.relations || {}) },
    flags: { ...(saved.flags || {}) },
    actions: { ...DEFAULT_STATE.actions, ...(saved.actions || {}) },
    events: Array.isArray(saved.events) ? saved.events.slice(-60) : []
  };
}

function clampState(state) {
  for (const id of Object.keys(state.influence)) {
    state.influence[id] = clamp(Number(state.influence[id]) || 0, 0, 100);
  }
  for (const key of Object.keys(state.relations)) {
    state.relations[key] = clamp(Number(state.relations[key]) || 0, -100, 100);
  }
}

export class PoliticalSystem {
  constructor(saveManager = null) {
    this.saveManager = saveManager;
    this.state = mergeState(saveManager?.load?.()?.politics);
    clampState(this.state);
  }

  persist() {
    if (!this.saveManager?.load || !this.saveManager?.save) return;
    const root = this.saveManager.load();
    root.politics = this.state;
    this.saveManager.save(root);
  }

  relationScore(a, b) {
    return this.state.relations[pairKey(a, b)] ?? 0;
  }

  relationStatus(score) {
    if (score >= 45) return 'ALLIANCE';
    if (score <= -35) return 'RIVALRY';
    if (score <= -12) return 'FRICTION';
    return 'PRAGMATIC';
  }

  relationship(a, b) {
    const score = this.relationScore(a, b);
    return { a, b, score, status: this.relationStatus(score) };
  }

  applyEvent(eventId) {
    const event = POLITICAL_EVENTS[eventId];
    if (!event || (event.once && this.state.flags[eventId])) return false;

    const before = {};
    for (const key of Object.keys(this.state.relations)) {
      before[key] = this.relationStatus(this.state.relations[key]);
    }
    for (const [id, amount] of Object.entries(event.influence || {})) {
      this.state.influence[id] = (this.state.influence[id] || 0) + amount;
    }
    for (const [key, amount] of Object.entries(event.relations || {})) {
      const normalized = key.split(':').sort().join(':');
      this.state.relations[normalized] = (this.state.relations[normalized] || 0) + amount;
    }
    Object.assign(this.state.flags, event.flags || {});
    if (event.once) this.state.flags[eventId] = true;
    clampState(this.state);

    this.state.events.push({ title: event.title, text: event.text, id: eventId });
    for (const key of Object.keys(this.state.relations)) {
      const [a, b] = key.split(':');
      const after = this.relationStatus(this.state.relations[key]);
      if (before[key] !== after) {
        const left = FACTION_BY_ID[a]?.name || a;
        const right = FACTION_BY_ID[b]?.name || b;
        const transition = after === 'ALLIANCE' ? 'ALLIANCE FORMED'
          : after === 'RIVALRY' ? 'RIVALRY DECLARED'
            : before[key] === 'ALLIANCE' ? 'ALLIANCE DISSOLVED'
              : before[key] === 'RIVALRY' ? 'RIVALRY EASED'
                : 'RELATIONSHIP SHIFTED';
        this.state.events.push({
          title: transition + ' // ' + left + ' ↔ ' + right,
          text: 'Political relationship shifted from ' + before[key] + ' to ' + after + '.',
          id: 'relation-' + key
        });
      }
    }
    this.state.events = this.state.events.slice(-60);
    this.persist();
    return true;
  }

  recordChoice(missionId, optionId) {
    const mapping = {
      1: { evacuate: 'crewEvacuated', scrub: 'rosterScrubbed' },
      2: { clinic: 'clinicPowered', uplink: 'towerUplink' },
      3: { publish: 'archivePublished', redact: 'archiveRedacted' }
    };
    const eventId = mapping[missionId]?.[optionId];
    return eventId ? this.applyEvent(eventId) : false;
  }

  recordSideQuestReward(rewardId) {
    const mapping = {
      'signal-lens': 'signalLens',
      'echo-spool': 'echoSpool',
      'keep-core': 'keepCore',
      'rook-truce': 'rookTruce'
    };
    const eventId = mapping[rewardId];
    return eventId ? this.applyEvent(eventId) : false;
  }

  recordAction(action, amount = 1) {
    if (!(action in this.state.actions) || !Number.isFinite(amount) || amount <= 0) return;
    this.state.actions[action] += amount;
    if (action === 'diversions') this.state.influence.switchboard += amount * 0.12;
    else if (action === 'detections') this.state.influence.quietNet += amount * 0.16;
    else if (action === 'jammers') {
      this.state.influence.quietNet -= amount * 0.08;
      this.state.influence.switchboard += amount * 0.06;
    } else if (action === 'cleanExtractions') this.state.influence.residents += amount * 0.8;
    clampState(this.state);
    this.persist();
  }

  missionModifiers(missionId, isSideQuest = false) {
    const modifiers = { extraDecoys: 0, extraJammers: 0, startAlert: 0, scavengerAwareness: 1 };
    if (isSideQuest) {
      if (this.relationScore('quietNet', 'rooks') >= 45) modifiers.scavengerAwareness += 0.12;
      if (this.relationScore('residents', 'rooks') >= 45 ||
          this.relationScore('switchboard', 'rooks') >= 45) modifiers.scavengerAwareness -= 0.1;
      return modifiers;
    }
    if (missionId >= 2 && this.relationScore('residents', 'switchboard') >= 45) modifiers.extraDecoys += 1;
    if (missionId >= 2 && this.state.influence.quietNet >= 45) modifiers.startAlert += 4;
    if (missionId === 3 && this.state.influence.residents >= 35) modifiers.startAlert -= 2;
    modifiers.startAlert = Math.max(0, modifiers.startAlert);
    return modifiers;
  }

  getFieldBriefing(missionId, isSideQuest = false) {
    if (isSideQuest) {
      if (this.state.flags.rookContractExposed) return 'POLITICAL INTEL // The Rook–Quiet-Net contract is public. Both sides expect retaliation.';
      if (this.relationScore('quietNet', 'rooks') >= 45) return 'POLITICAL INTEL // Quiet-Net clearance codes support the Rook patrols. Expect coordinated lookouts.';
      if (this.relationScore('residents', 'rooks') >= 45) return 'MARA // The Compact negotiated a Rook truce. Do not break the claim agreement.';
      return 'POLITICAL INTEL // The Shatterbelt claim is disputed. No faction guarantees safe passage.';
    }
    if (missionId >= 2 && this.relationScore('residents', 'switchboard') >= 45) return 'ASH COMPACT // Mutual-aid couriers have opened a route for Ghost.';
    if (missionId >= 2 && this.relationScore('residents', 'switchboard') < 10) return 'NIX // The Compact and Switchboard are arguing over the next move. Your route is not guaranteed.';
    if (missionId >= 2 && this.state.influence.quietNet >= 45) return 'QUIET-NET // Directorate support has expanded. Patrol response is reinforced.';
    return 'POLITICAL INTEL // City agreements are holding—for now.';
  }

  snapshot() {
    const factions = POLITICAL_FACTIONS.map(faction => ({
      ...faction,
      influence: Math.round(this.state.influence[faction.id] || 0)
    })).sort((a, b) => b.influence - a.influence);

    const relationships = [];
    for (let i = 0; i < POLITICAL_FACTIONS.length; i++) {
      for (let j = i + 1; j < POLITICAL_FACTIONS.length; j++) {
        relationships.push(this.relationship(POLITICAL_FACTIONS[i].id, POLITICAL_FACTIONS[j].id));
      }
    }
    const leader = factions[0];
    const alliances = relationships
      .filter(item => item.status === 'ALLIANCE')
      .map(item => FACTION_BY_ID[item.a].name + ' ↔ ' + FACTION_BY_ID[item.b].name);
    const rivalries = relationships
      .filter(item => item.status === 'RIVALRY')
      .map(item => FACTION_BY_ID[item.a].name + ' ↔ ' + FACTION_BY_ID[item.b].name);
    return {
      factions, relationships, leader, alliances, rivalries,
      recentEvents: this.state.events.slice(-8).reverse(),
      actions: { ...this.state.actions }
    };
  }

  getPoliticalLegacy() {
    const network = this.snapshot();
    const allianceText = network.alliances.length ? network.alliances.join('; ') : 'no durable alliances';
    const rivalryText = network.rivalries.length ? network.rivalries.join('; ') : 'no declared rivalries';
    return 'POLITICAL LEGACY // ' + network.leader.name + ' holds the strongest influence. Alliances: ' +
      allianceText + '. Rivalries: ' + rivalryText + '.';
  }
}
