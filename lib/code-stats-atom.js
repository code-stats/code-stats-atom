'use babel';

import {Pulse} from './models.js';

const UPDATE_URL = 'http://localhost:5000/api/my/pulses/';

// Amount of milliseconds to wait after typing before sending update
const UPDATE_DELAY = 1000;

// Interval between sending multiple old pulses
const MULTIPLE_UPDATE_INTERVAL = 1000;

// Set on activation
let API_KEY = null;

let old_pulses = [];
let current_pulse = null;
let update_timeout = null;
let update_promise = null;
let update_waiting = false;
let status_bar_tile = null;

function updateStatusBar(text = null) {
  if (text === null) {
    text = 'C::S';
  }

  if (status_bar_tile !== null) {
    status_bar_tile.item.textContent = text;
  }
}

// Convert grammar to language name
function convertGrammar(grammar) {
  const name = grammar.name;

  if (name === 'Null Grammar') {
    return 'Plain text';
  }
  else {
    return name;
  }
}

function startUpdate() {
  // If an update is already in progress, schedule this call right
  // after it -- except if one startUpdate call is already waiting
  if (update_promise !== null && !update_waiting) {
    update_waiting = true;
    update_promise.then(() => {
      update_waiting = false;
      startUpdate();
    });
  }
  else {
    // If there is a current pulse, se its timestamp and move it to the old_pulses
    // list where it will be pushed from
    if (current_pulse !== null) {
      current_pulse.coded_at = new Date();
      old_pulses.push(current_pulse);
      current_pulse = null;
    }

    // If there are no old pulses to update, stop
    if (old_pulses.length === 0) {
      return;
    }

    const update_pulse = old_pulses.shift();
    const xps = Array.from(update_pulse.xps).reduce((acc, val) => {
      acc.push({
        language: convertGrammar(val[0]),
        xp: val[1]
      });
      return acc;
    }, []);

    const data = {
      coded_at: update_pulse.coded_at.toISOString(),
      xps: xps
    };

    console.log(data);

    update_promise = new Promise((resolve, reject) => {
      updateStatusBar('C::S …');

      fetch(UPDATE_URL, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'X-API-Token': API_KEY,
          'Content-Type': 'application/json'
        }
      })
        .then((response) => {
          if (response.status !== 201) {
            console.log('code-stats-atom update failed:', response);
            updateStatusBar(`C::S ${response.status}!`);
          }

          update_promise = null;
          resolve();
          updateStatusBar();
        }, () => { updateStatusBar('C::S X_X'); });
    });

    // If there are old pulses not sent, send them after a delay
    setTimeout(startUpdate, MULTIPLE_UPDATE_INTERVAL);
  }
}

function getOrCreatePulse() {
  if (current_pulse !== null) {
    return current_pulse;
  }
  else {
    current_pulse = new Pulse(new Date());
    return current_pulse;
  }
}

function addXP(language, xp) {
  let pulse = getOrCreatePulse();
  pulse.addXP(language, xp);
}

function changeEvent(e) {
  // If changes are empty, skip
  if (e.changes.length === 0) {
    return;
  }

  const grammar = atom.workspace.getActiveTextEditor().getGrammar();

  // Otherwise process all of them
  let xp = 0;
  for (let change of e.changes) {
    let length = change.newText.length;

    // If length is 0, try to approximate it from the
    // changed columns, because deleting chars results in
    // 0 length
    if (length === 0) {
      length = change.newExtent.column
             + change.newExtent.row
             + change.oldExtent.column
             + change.oldExtent.row;
    }

    xp += length;
  }

  if (xp === 0) {
    return;
  }

  addXP(grammar, xp);

  if (update_timeout !== null) {
    clearTimeout(update_timeout);
  }

  update_timeout = setTimeout(startUpdate, UPDATE_DELAY);
}

class CodeStatsAtom {
  constructor() {
  }

  activate(state) {
    API_KEY = atom.config.get('code-stats-atom.apiKey');
    console.log('code-stats-atom API key:', API_KEY);

    // Bind to change events in all text editors, current and future
    for (let editor of atom.workspace.getTextEditors()) {
      console.log('code-stats-atom listening to editor', editor);
      editor.onDidStopChanging(changeEvent);
    }
    atom.workspace.onDidAddTextEditor((e) => {
      console.log('code-stats-atom listening to new editor', e.textEditor);
      e.textEditor.onDidStopChanging(changeEvent);
    });
  }

  consumeStatusBar(status_bar) {
    status_bar_tile = status_bar.addRightTile({
      item: document.createElement('a'),
      priority: 1000
    });
    status_bar_tile.item.className = 'inline-block';
    updateStatusBar();
  }

  deactivate() {
    if (status_bar_tile !== null) {
      status_bar_tile.destroy();
      status_bar_tile = null;
    }
  }
}

export default new CodeStatsAtom();
