'use babel';

import {Pulse} from './models.js';

// Max amount of XP granted per edit event. Some events like copypaste
// and find-replace cause huge changes, this limits the accumulation of
// XP to meaningful amounts.
const MAX_PER_EVENT = 200;

// Amount of milliseconds to wait after typing before sending update
const UPDATE_DELAY = 10000;

// Interval between sending multiple old pulses
const MULTIPLE_UPDATE_INTERVAL = 10000;

// Set on activation
let API_KEY = null;
let UPDATE_URL = null;

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
  // Don't do anything if API key or URL is not specified
  if (API_KEY === null || UPDATE_URL === null) return;

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

    update_promise = new Promise((resolve, reject) => {
      updateStatusBar('C::S…');

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

  const editor = atom.workspace.getActiveTextEditor();

  // In some situations, such as "Replace all", the editor is undefined. If that is the case,
  // abort
  if (editor == null) {
    return;
  }

  const grammar = editor.getGrammar();

  // Otherwise process all of them
  let xp = 0;
  for (let change of e.changes) {
    let length = change.newText.length;

    // If length is 0, the user used backspace or operated on multiple characters at once,
    // this grants 1 XP
    if (length === 0) {
      length = 1;
    }

    xp += length;
  }

  if (xp === 0) {
    return;
  }

  xp = Math.min(xp, MAX_PER_EVENT);

  addXP(grammar, xp);

  // When typing, don't send updates until the typing has really stopped. This lessens load
  // on the server considerably.
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
    UPDATE_URL = atom.config.get('code-stats-atom.apiUrl');
    console.log('code-stats-atom initting with settings:', API_KEY, UPDATE_URL);

    atom.config.onDidChange('code-stats-atom.apiKey', {}, (e) => {
      API_KEY = e.newValue;
      console.log('code-stats-atom API key changed to:', API_KEY);
    });

    atom.config.onDidChange('code-stats-atom.apiUrl', {}, (e) => {
      UPDATE_URL = e.newValue;
      console.log('code-stats-atom API URL changed to:', UPDATE_URL);
    });

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
