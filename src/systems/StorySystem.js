const DEFAULT_STATE = {
  version: 1,
  factions: { residents: 0, switchboard: 0, quietNet: 0 },
  characters: { mara: 0, nix: 0 },
  stats: {
    decoysThrown: 0,
    diversions: 0,
    jammersUsed: 0,
    detections: 0,
    cleanExtracts: 0,
    missionsCompleted: 0,
    failures: 0,
    peakAlert: 0
  },
  flags: {},
  choices: {},
  history: [],
  missions: {}
};

const CHOICES = {
  1: {
    trigger: 'relay',
    kicker: 'DEAD CHANNEL // EMERGENCY FREQUENCY',
    title: 'SIX NAMES ON THE ROSTER',
    speaker: 'MARA — MAINTENANCE LEAD',
    context: 'The relay holds an evacuation channel. Broadcasting will get the trapped crew out, but the signal will expose your route. Scrubbing the roster hides their identities from Quiet-Net, but leaves them without a coordinated exit.',
    options: [
      {
        id: 'evacuate',
        title: 'BROADCAST THE EVACUATION',
        detail: 'Save the crew. The Market will be more alert to your arrival.',
        factions: { residents: 2, switchboard: 1, quietNet: 1 },
        characters: { mara: 2, nix: 1 },
        flags: { crewEvacuated: true },
        memory: 'Mara remembers that you chose to get the maintenance crew out in the open.',
        reaction: 'MARA // Six people made it out. The Market knows your signal now.'
      },
      {
        id: 'scrub',
        title: 'SCRUB THE ROSTER',
        detail: 'Erase the identities. Quiet-Net loses one camera feed in the Market, but Mara will remember the people left behind.',
        factions: { residents: -1, switchboard: 2, quietNet: -2 },
        characters: { mara: -1, nix: 2 },
        flags: { rosterScrubbed: true },
        memory: 'Nix remembers that you erased the crew roster and trusted the Switchboard to hide the survivors.',
        reaction: 'NIX // The names are gone. One Market camera is reading ghosts.'
      }
    ]
  },
  2: {
    trigger: 'relay',
    kicker: 'SILENT MARKET // POWER ROUTING',
    title: 'WHO GETS THE LAST CURRENT?',
    speaker: 'NIX — SWITCHBOARD COURIER',
    context: 'The second relay can feed the district clinic or the Switchboard uplink. The clinic helps people survive the blackout. The uplink gives Nix a service route into Antenna Zero, but the clinic stays dark.',
    options: [
      {
        id: 'clinic',
        title: 'POWER THE CLINIC',
        detail: 'Mara and the residents remember the help. The tower detects the power surge and starts at higher alert.',
        factions: { residents: 2, switchboard: 0, quietNet: 1 },
        characters: { mara: 2, nix: 0 },
        flags: { clinicPowered: true },
        memory: 'Mara remembers that you sent the Market power to the clinic instead of the uplink.',
        reaction: 'MARA // The clinic is lit. The tower saw the surge, but people are alive.'
      },
      {
        id: 'uplink',
        title: 'FEED THE SWITCHBOARD',
        detail: 'Nix maps a blind service route and gives you another jammer charge. The clinic loses power.',
        factions: { residents: -1, switchboard: 2, quietNet: -1 },
        characters: { mara: -1, nix: 2 },
        flags: { towerUplink: true },
        memory: 'Nix remembers that you gave the Switchboard the Market grid and left the clinic dark.',
        reaction: 'NIX // Service route copied. I owe you one. The clinic does not.'
      }
    ]
  },
  3: {
    trigger: 'archive',
    kicker: 'ANTENNA ZERO // THE LAST TRANSMISSION',
    title: 'WHO OWNS THE TRUTH?',
    speaker: 'MARA + NIX // OPEN CHANNEL',
    context: 'The final memory fragment unlocks the Crown of Whispers: an unaltered witness record of the Burning Archive and Lucien Blackthorn’s betrayal. Its archive also contains the identities and locations of people who resisted Quiet-Net. Publish the complete record and clear Kael’s name at the cost of exposing them, or redact civilian coordinates and protect those people while leaving part of the proof sealed.',
    options: [
      {
        id: 'publish',
        title: 'PUBLISH THE FULL ARCHIVE',
        detail: 'Expose Quiet-Net without redaction. The city gets the truth, and the network gets a record of everyone who helped you.',
        factions: { residents: 2, switchboard: 2, quietNet: 2 },
        characters: { mara: 1, nix: 1 },
        flags: { archivePublished: true },
        memory: 'Mara and Nix remember that you published the archive without hiding the names.',
        reaction: 'OPEN CHANNEL // The archive is public. Every name is in the signal.'
      },
      {
        id: 'redact',
        title: 'REDACT CIVILIAN COORDINATES',
        detail: 'Protect the people in the archive. The public receives an incomplete account, but Quiet-Net loses the location index.',
        factions: { residents: 1, switchboard: 1, quietNet: -2 },
        characters: { mara: 2, nix: 1 },
        flags: { archiveRedacted: true },
        memory: 'Mara and Nix remember that you protected the people in the archive, even though the public story remained incomplete.',
        reaction: 'OPEN CHANNEL // The coordinates are gone. The truth travels with gaps.'
      }
    ]
  }
};

function mergeState(saved = {}) {
  return {
    ...DEFAULT_STATE,
    ...saved,
    factions: { ...DEFAULT_STATE.factions, ...(saved.factions || {}) },
    characters: { ...DEFAULT_STATE.characters, ...(saved.characters || {}) },
    stats: { ...DEFAULT_STATE.stats, ...(saved.stats || {}) },
    flags: { ...(saved.flags || {}) },
    choices: { ...(saved.choices || {}) },
    history: Array.isArray(saved.history) ? saved.history.slice(-80) : [],
    missions: { ...(saved.missions || {}) }
  };
}

export class StorySystem {
  constructor(saveManager = null) {
    this.saveManager = saveManager;
    this.state = mergeState(saveManager?.load?.()?.story);
  }

  persist() {
    if (!this.saveManager?.load || !this.saveManager?.save) return;
    const root = this.saveManager.load();
    root.story = this.state;
    this.saveManager.save(root);
  }

  recordAction(action, amount = 1) {
    if (!(action in this.state.stats)) return;
    this.state.stats[action] += amount;

    // Factions react to the player's habits, not only explicit dialogue picks.
    if (action === 'diversions') this.state.factions.switchboard += amount * 0.15;
    if (action === 'detections') this.state.factions.quietNet += amount * 0.25;
    if (action === 'jammersUsed') this.state.factions.quietNet += amount * 0.35;
    this.persist();
  }

  recordAlert(alert) {
    this.state.stats.peakAlert = Math.max(this.state.stats.peakAlert, alert);
  }

  recordMission(levelId, result) {
    const prior = this.state.missions[levelId] || { attempts: 0, clears: 0 };
    prior.attempts++;
    if (result.won) {
      prior.clears++;
      this.state.stats.missionsCompleted++;
      if (result.detections === 0) {
        this.state.stats.cleanExtracts++;
        this.state.factions.residents += 0.25;
      } else {
        this.state.factions.quietNet += result.detections * 0.1;
      }
    } else {
      this.state.stats.failures++;
    }
    this.state.missions[levelId] = prior;
    this.state.history.push({
      type: result.won ? 'extraction' : 'lockdown',
      mission: levelId,
      detections: result.detections || 0,
      alert: result.alert || 0,
      diversions: result.diversions || 0
    });
    this.persist();
  }

  getChoice(levelId, trigger) {
    const choice = CHOICES[levelId];
    if (!choice || choice.trigger !== trigger || this.state.choices[levelId]) return null;
    return {
      missionId: levelId,
      kicker: choice.kicker,
      title: choice.title,
      speaker: choice.speaker,
      context: choice.context,
      options: choice.options.map(({ id, title, detail }) => ({ id, title, detail }))
    };
  }

  choose(levelId, optionId) {
    const choice = CHOICES[levelId];
    if (!choice || this.state.choices[levelId]) return null;
    const option = choice.options.find(item => item.id === optionId);
    if (!option) return null;

    this.state.choices[levelId] = optionId;
    for (const [faction, value] of Object.entries(option.factions || {})) {
      this.state.factions[faction] = (this.state.factions[faction] || 0) + value;
    }
    for (const [character, value] of Object.entries(option.characters || {})) {
      this.state.characters[character] = (this.state.characters[character] || 0) + value;
    }
    Object.assign(this.state.flags, option.flags || {});
    this.state.history.push({
      type: 'choice',
      mission: levelId,
      choice: optionId,
      memory: option.memory
    });
    this.state.history = this.state.history.slice(-80);
    this.persist();
    return option.reaction;
  }

  missionModifiers(levelId) {
    const modifiers = { extraDecoys: 0, extraJammers: 0, startAlert: 0, disabledCameras: [] };
    if (levelId === 2) {
      if (this.state.flags.crewEvacuated) {
        modifiers.extraDecoys += 1;
        modifiers.startAlert += 10;
      }
      if (this.state.flags.rosterScrubbed) modifiers.disabledCameras.push(0);
    }
    if (levelId === 3) {
      if (this.state.flags.clinicPowered) modifiers.startAlert += 12;
      if (this.state.flags.towerUplink) {
        modifiers.extraJammers += 1;
        modifiers.disabledCameras.push(3);
      }
    }
    return modifiers;
  }

  isCameraDisabledForMission(levelId, cameraIndex) {
    return this.missionModifiers(levelId).disabledCameras.includes(cameraIndex);
  }

  getBriefing(levelId) {
    const lines = [];
    if (levelId === 1) {
      lines.push('GHOST // Lucien left me in the Burning Archive. Three memory fragments lead to the Crown of Whispers.');
      lines.push('NIX // The network records movement. It cannot tell who you are trying to save.');
    } else if (levelId === 2) {
      if (this.state.flags.crewEvacuated) {
        lines.push('MARA // The crew made it out. I marked a route through the Market. Quiet-Net is watching it.');
      } else if (this.state.flags.rosterScrubbed) {
        lines.push('NIX // The roster is ash. One camera still thinks those faces exist.');
      }
    } else if (levelId === 3) {
      if (this.state.flags.clinicPowered) {
        lines.push('MARA // The clinic stayed lit. The tower registered the surge. I hope it was worth it.');
      } else if (this.state.flags.towerUplink) {
        lines.push('NIX // I mapped the service spine. The Warden will hear a false route before it hears you.');
      }
    }

    if (this.state.stats.diversions >= 3) {
      lines.push('QUIET-NET // Repeated false echoes detected. Your signal is becoming a story.');
    } else if (this.state.stats.detections >= 3) {
      lines.push('QUIET-NET // Visual profile retained. Response patterns have been updated.');
    }
    if (!lines.length) lines.push('QUIET-NET // No reliable identity. Continue scanning.');
    return lines.join('  |  ');
  }

  getEnvironmentText(levelId) {
    let line = 'ARCHIVE FIRE // KAEL VEYRIN / WANTED';
    if (levelId === 2) {
      line = this.state.flags.crewEvacuated
        ? 'MARKET WALL // SHELTER ROUTE OPEN'
        : this.state.flags.rosterScrubbed
          ? 'MARKET WALL // CAMERA LOOP: UNKNOWN FACES'
          : 'MARKET GRID // POWER ROUTING UNRESOLVED';
    } else if (levelId === 3) {
      line = this.state.flags.clinicPowered
        ? 'TOWER CONSOLE // CLINIC GRID: ONLINE'
        : this.state.flags.towerUplink
          ? 'TOWER CONSOLE // SWITCHBOARD ROUTE: MAPPED'
          : 'TOWER CONSOLE // ARCHIVE: SEALED';
    }
    if (this.state.stats.diversions >= 4) line += '  // THE ECHO WALKED HERE';
    else if (this.state.stats.detections >= 3) line += '  // QUIET-NET KNOWS YOUR SHAPE';
    return line;
  }

  getMissionReflection(levelId) {
    const choice = this.state.choices[levelId];
    if (levelId === 1 && choice === 'evacuate') return 'Mara will carry the evacuation signal into the Market. Quiet-Net has it too.';
    if (levelId === 1 && choice === 'scrub') return 'The roster is gone. Nix can spoof the Market camera, but the crew is still out there.';
    if (levelId === 2 && choice === 'clinic') return 'The clinic has power. The tower has the surge signature.';
    if (levelId === 2 && choice === 'uplink') return 'The Switchboard has a route into the tower. The clinic has gone dark.';
    if (levelId === 3 && choice === 'publish') return 'The archive is public, including every civilian coordinate it contained.';
    if (levelId === 3 && choice === 'redact') return 'The people are harder to find now. The public story is incomplete.';
    return this.state.stats.detections === 0
      ? 'No visual contact was confirmed. Quiet-Net still recorded the sound of your passage.'
      : 'Quiet-Net recorded ' + this.state.stats.detections + ' confirmed visual detections across the operation.';
  }

  getEnding() {
    const { factions, characters, stats, flags } = this.state;
    const communityTrust = factions.residents + factions.switchboard + characters.mara + characters.nix;
    const heat = factions.quietNet + stats.detections * 2 + (stats.peakAlert >= 80 ? 2 : 0);

    let ending;
    if (flags.archivePublished && communityTrust >= 5 && stats.diversions >= 3 && stats.detections <= 3) {
      ending = {
        id: 'open-frequency',
        title: 'THE OPEN FREQUENCY',
        copy: 'The Crown of Whispers releases its unaltered witness record. The proof clears Kael Veyrin of the Burning Archive murders and exposes Lucien Blackthorn’s betrayal. The people you helped relay it through kitchens, clinics and abandoned maintenance lines. Every name is exposed, but no one can pretend the signal was never sent.'
      };
    } else if (flags.archiveRedacted && stats.detections <= 1 && stats.diversions >= 2 && factions.switchboard >= 1) {
      ending = {
        id: 'ghost-protocol',
        title: 'THE GHOST PROTOCOL',
        copy: 'The Crown’s witness record survives with civilian coordinates removed. Kael has enough proof to challenge the frame-up, but some evidence remains sealed. Nix turns your false echoes into a moving network of safe routes. Quiet-Net keeps searching for one Ghost; the city learns to move as many.'
      };
    } else if (stats.detections >= 5 || heat >= 8) {
      ending = {
        id: 'quiet-remembers',
        title: 'QUIET-NET REMEMBERS',
        copy: 'The Crown’s witness record escapes in fragments, but Quiet-Net has learned the people, routes and habits that carried you. Kael’s name is still hunted, and the next resistance inherits your unfinished war.'
      };
    } else if (stats.diversions >= 5 && factions.switchboard >= 2) {
      ending = {
        id: 'choir-of-echoes',
        title: 'THE CHOIR OF ECHOES',
        copy: 'The Switchboard turns the Crown’s raw memory signatures and every false signal into a message. Guards keep arriving at empty rooms while the city quietly changes hands. No single Ghost owns the story anymore.'
      };
    } else {
      ending = {
        id: 'city-in-static',
        title: 'A CITY IN STATIC',
        copy: 'The Crown’s testimony leaks into the city in fragments. Some believe Kael was framed; others still remember the wanted posters. Quiet-Net keeps a copy of every contradiction. Your choices leave a signal—but not a single answer.'
      };
    }

    const journey = [
      stats.diversions + ' completed diversions',
      stats.detections + ' visual detections',
      stats.cleanExtracts + ' clean extractions',
      'Mara trust ' + (characters.mara >= 2 ? 'earned' : characters.mara <= -1 ? 'lost' : 'uncertain'),
      'Switchboard trust ' + (characters.nix >= 2 ? 'earned' : characters.nix <= -1 ? 'lost' : 'uncertain')
    ].join(' · ');
    return { ...ending, journey, communityTrust, heat };
  }
}

export { CHOICES };
