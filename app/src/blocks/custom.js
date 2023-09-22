/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';

// Create a custom block called 'add_text' that adds
// text to the output div on the sample app.
// This is just an example and you should replace this with your
// own custom blocks.
const addText = {
  'type': 'add_text',
  'message0': 'Add text %1 with color %2',
  'args0': [
    {
      'type': 'input_value',
      'name': 'TEXT',
      'check': 'String',
    },
    {
      'type': 'input_value',
      'name': 'COLOR',
      'check': 'Colour',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 160,
  'tooltip': '',
  'helpUrl': '',
};


// Create a custom block called 'add_led' that adds
// block color to the output div on the sample app.
const addLed = {
  'type': 'add_led',
  'message0': 'Set LED color %1',
  'args0': [
    {
      'type': 'input_value',
      'name': 'COLOR',
      'check': 'Colour',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 20,
  'tooltip': '',
  'helpUrl': '',
};

// Create a custom block called 'add_led' that adds
// block color to the output div on the sample app.
const addLedStrip = {
  'type': 'add_led_strip',
  'message0': 'Set LED color %1 for strip %2',
  'args0': [
    {
      'type': 'input_value',
      'name': 'COLOR',
      'check': 'Colour',
    },
    {
      'type': 'input_value',
      'name': 'TEXT',
    },
  ],
  'previousStatement': null,
  'nextStatement': null,
  'colour': 20,
  'tooltip': '',
  'helpUrl': '',
};


const nextStripLed = {
  'type': 'change_strip',
  'message0': 'Change strip LEDs',
  'previousStatement': null,
  'nextStatement': null,
  'colour': 20,
  'tooltip': '',
  'helpUrl': '',
};

const waitSeconds = {
  'type': 'wait_seconds',
  'message0': ' wait %1 seconds',
  'args0': [{
    'type': 'field_number',
    'name': 'SECONDS',
    'min': 0,
    'max': 600,
    'value': 1,
  }],
  'previousStatement': null,
  'nextStatement': null,
  'colour': '%{BKY_LOOPS_HUE}',
};


// Create the block definitions for the JSON-only blocks.
// This does not register their definitions with Blockly.
// This file has no side effects!
export const blocks = Blockly.common.createBlockDefinitionsFromJsonArray([addText, addLed, addLedStrip, nextStripLed, waitSeconds]);
