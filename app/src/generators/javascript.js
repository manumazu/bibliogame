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

forBlock['add_led'] = function (block, generator) {
  const color =
    generator.valueToCode(block, 'COLOR', Order.ATOMIC) || "'#ffffff'";

  const addLed = generator.provideFunction_(
      'addLed',
      `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(color) {

  // Add color div to the output area.
  const outputDiv = document.getElementById('output');
  const textEl = document.createElement('div');
  textEl.style.backgroundColor = color;
  textEl.style.padding = '20px';
  textEl.style.margin = '5px';
  textEl.style.width = '10px';
  textEl.style.display = 'inline-block';
  outputDiv.appendChild(textEl);
}`
  );
  // Generate the function call for this block.
  const code = `${addLed}(${color});\n`;
  return code;
};

forBlock['add_led_strip'] = function (block, generator) {
  const strip_num = "'"+block.inputList[1].fieldRow[1].selectedOption[1]+"'"; 
  //generator.valueToCode(block, 'STRIP_NAME', Order.MEMBER);
  console.log('input:',block.inputList[1].fieldRow[1].selectedOption[0]); 
  //const strip_num = block.getFieldValue('STRIP_NAME');
  const color =
    generator.valueToCode(block, 'COLOR', Order.MEMBER) || "'#ffffff'";
  console.log('color',color);

  const addLedStrip = generator.provideFunction_(
      'addLedStrip',
      `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(color, strip_num) {
  // Add color div to the output area.
  const outputDiv = document.getElementById('output');
  const textEl = document.createElement('div');
  textEl.style.backgroundColor = color;
  textEl.style.padding = '20px';
  textEl.style.margin = '5px';
  textEl.style.width = '10px';
  textEl.style.display = 'inline-block';
  textEl.setAttribute('id', strip_num);
  outputDiv.appendChild(textEl);
}`
  );
  // Generate the function call for this block.
  const code = `${addLedStrip}(${color},${strip_num});\n`;
  return code;
};


forBlock['change_strip'] = function (block, generator) {

  const nextStripLed = generator.provideFunction_(
      'nextStripLed',
      `function ${generator.FUNCTION_NAME_PLACEHOLDER_}() {

  // Add color div to the output area.
  const outputDiv = document.getElementById('output');
  const textEl = document.createElement('div');
  textEl.style.display = 'block';
  textEl.setAttribute('id', 'changeStrip');
  outputDiv.appendChild(textEl);
}`
  );
  // Generate the function call for this block.
  const code = `${nextStripLed}();\n`;
  return code;
};