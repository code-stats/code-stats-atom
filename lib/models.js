'use babel';

class Pulse {
  constructor() {
    this.coded_at = null;
    this.xps = new Map();
  }

  addXP(language, amount) {
    let xp = this.xps.get(language);

    if (xp === undefined) {
      xp = amount;
    }
    else {
      xp += amount;
    }

    this.xps.set(language, xp);
  }
}

export {Pulse};
