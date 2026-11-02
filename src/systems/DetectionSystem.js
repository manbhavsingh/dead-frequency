export class DetectionSystem {
  constructor() {
    this.alert = 0;
    this.lockdown = false;
  }

  add(amount) {
    if (this.lockdown) return;
    this.alert = Math.min(100, this.alert + amount);
    if (this.alert >= 100) this.lockdown = true;
  }

  // Compatibility alias used by close-range guard contact.
  addAlert(amount) {
    this.add(amount);
  }

  update(dt, guards) {
    const pressure = guards.reduce(
      (total, guard) => total + (
        guard.machine.state === 'CHASE' ? 1.2 : guard.suspicion > 50 ? 0.2 : 0
      ),
      0
    );
    this.alert = Math.max(0, this.alert - dt * (pressure ? 1.2 : 0.8));
    if (this.alert >= 100) this.lockdown = true;
  }

  get label() {
    return this.lockdown ? 'LOCKDOWN'
      : this.alert > 70 ? 'CRITICAL'
        : this.alert > 35 ? 'SUSPICIOUS'
          : 'QUIET';
  }
}
