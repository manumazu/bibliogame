/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Order} from 'blockly/javascript';

// Export all the code generators for our custom blocks,
// but don't register them with Blockly yet.
// This file has no side effects!
export const forBlock = Object.create(null);

forBlock['add_text'] = function (block, generator) {
  const text = generator.valueToCode(block, 'TEXT', Order.NONE) || "''";
  const color =
    generator.valueToCode(block, 'COLOR', Order.ATOMIC) || "'#ffffff'";

  const addText = generator.provideFunction_(
      'addText',
      `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(text, color) {

  // Add text to the output area.
  const outputDiv = document.getElementById('output');
  const textEl = document.createElement('p');
  textEl.innerText = text;
  textEl.style.color = color;
  outputDiv.appendChild(textEl);
}`
  );
  // Generate the function call for this block.
  const code = `${addText}(${text}, ${color});\n`;
  return code;
};


// generate custom functions used for Interpretor

forBlock['add_led'] = function(block, generator) {
  const color = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || "'#ffffff'";
  const code = 'addLed(' + color + ');\n';
  return code;
};

forBlock['add_led_strip'] = function(block, generator) {
  const strip_num = "'"+block.inputList[1].fieldRow[1].selectedOption[1]+"'"; 
  //generator.valueToCode(block, 'STRIP_NAME', Order.MEMBER);
  //console.log('input:',block.inputList[1].fieldRow[1].selectedOption[0]); 
  //const strip_num = block.getFieldValue('STRIP_NAME');  
  const color = generator.valueToCode(block, 'COLOR', Order.MEMBER) || "'#ffffff'";
  const code = 'addLedStrip(' + color + ', ' + strip_num + ');\n';
  return code;
};

forBlock['change_strip'] = function(block, generator) {
  const code = 'changeStripLed();\n';
  return code;
};

forBlock['wait_seconds'] = function(block, generator) {
  const seconds = Number(block.getFieldValue('SECONDS'));
  const code = 'waitForSeconds(' + seconds + ');\n';
  return code;
};

