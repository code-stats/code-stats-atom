'use babel';

import {Pulse} from './models.js';

// Amount of milliseconds to wait after typing before sending update
const UPDATE_DELAY = 10000;

// Interval between sending multiple old pulses
const MULTIPLE_UPDATE_INTERVAL = 10000;

// Set on activation
let API_KEY = null;
let UPDATE_URL = null;

// Disposables set by the plugin, to be disposed of when it deactivates
//let did_match_binding = null;
//let did_partially_match_bindings = null;
let did_fail_to_match_binding = null;
let did_change_api_key = null;
let did_change_api_url = null;

let old_pulses = [];
let current_pulse = null;
let update_timeout = null;
let update_promise = null;
let update_waiting = false;
let status_bar_tile = null;

function updateStatusBar(text = null) {
  let status_text = 'C::S';

  if (text !== null) {
    status_text += ` ${text}`;
  }

  if (status_bar_tile !== null) {
    status_bar_tile.item.textContent = status_text;
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
  if (API_KEY === null || API_KEY === '' || UPDATE_URL === null || UPDATE_URL === '') return;

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
      updateStatusBar('…');

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
            updateStatusBar(`${response.status}!`);
          }

          update_promise = null;
          updateStatusBar();
          resolve();
        }, () => { updateStatusBar('X_X'); });
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
  // Only count keydown events
  if (e.eventType !== 'keyup') {
    return;
  }

  // Remove hat added by keyup
  const keystrokes = e.keystrokes.substr(1);

  // Only accept certain characters
  if (
    // Normal chars
    keystrokes.length === 1
    // CAPS
    || (keystrokes.startsWith('shift-') && keystrokes.length === 7)
    // Some other approved chars
    || keystrokes === 'space'
    || keystrokes === 'backspace'
    || keystrokes === 'enter'
    || keystrokes === 'tab'
    || keystrokes === 'delete'
  ) {
    const editor = atom.workspace.getActiveTextEditor();

    // In some situations, such as "Replace all", the editor is undefined. If that is the case,
    // abort
    if (editor == null) {
      return;
    }

    const grammar = editor.getGrammar();

    addXP(grammar, 1);

    // When typing, don't send updates until the typing has really stopped. This lessens load
    // on the server considerably.
    if (update_timeout !== null) {
      clearTimeout(update_timeout);
    }

    update_timeout = setTimeout(startUpdate, UPDATE_DELAY);
  }
}

class CodeStatsAtom {
  constructor() {
  }

  activate(state) {
    API_KEY = atom.config.get('code-stats-atom.apiKey');
    UPDATE_URL = atom.config.get('code-stats-atom.apiUrl');
    console.log('code-stats-atom initting with settings:', API_KEY, UPDATE_URL);

    did_change_api_key = atom.config.onDidChange('code-stats-atom.apiKey', {}, (e) => {
      API_KEY = e.newValue;
      console.log('code-stats-atom API key changed to:', API_KEY);
    });

    did_change_api_url = atom.config.onDidChange('code-stats-atom.apiUrl', {}, (e) => {
      UPDATE_URL = e.newValue;
      console.log('code-stats-atom API URL changed to:', UPDATE_URL);
    });

    //did_match_binding = atom.keymaps.onDidMatchBinding(changeEvent);
    //did_partially_match_bindings = atom.keymaps.onDidPartiallyMatchBindings(changeEvent);
    did_fail_to_match_binding = atom.keymaps.onDidFailToMatchBinding(changeEvent);
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
    console.log('code-stats-atom deactivating, unsubscribing from events.');

    if (status_bar_tile !== null) {
      status_bar_tile.destroy();
      status_bar_tile = null;
    }

    for (let disposable of [
      did_change_api_key,
      did_change_api_url,
      //did_match_binding,
      //did_partially_match_bindings,
      did_fail_to_match_binding
    ]) {
      disposable.dispose();
    }
  }
}

export default new CodeStatsAtom();
