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