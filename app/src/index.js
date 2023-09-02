/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import {blocks} from './blocks/custom';
import {forBlock} from './generators/javascript';
import {javascriptGenerator} from 'blockly/javascript';
import {save, load} from './serialization';
import {toolbox} from './toolbox';
import './index.css';

// Register the blocks and generator with Blockly
Blockly.common.defineBlocks(blocks);
Object.assign(javascriptGenerator.forBlock, forBlock);

// Set up UI elements and inject Blockly
const codeDiv = document.getElementById('generatedCode').firstChild;
const outputDiv = document.getElementById('output');
const runDiv = document.getElementById('runcode');
const saveButton = document.getElementById('savecode');
const blocklyDiv = document.getElementById('blocklyDiv');
const ws = Blockly.inject(blocklyDiv, {toolbox});

const baseUrl = 'https://bibliobus.local/api';
const uuid = 'YmlidXMtMDAwMy0wMzA0Nw==';

//get auth from API
const refreshToken = async (encodedId) => {
    const url = baseUrl + '/module/' + encodedId + '/';
    let response = await fetch(url);
    let res = await response.json();
    //console.log(res['token']);
    return res['token'];
};

//send ligthing request to server, relayed through mobile App
const setLedRequest = async(reqArray) => {
  let token = await refreshToken(uuid);
    console.log(token)
     
    fetch(baseUrl+'/request?token='+token+'&uuid='+uuid, {
      method: 'POST',
      headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(reqArray)
    })
   .then(response => response.json())
   .then(response => console.log(JSON.stringify(response)));
};

// This function resets the code and output divs, shows the
// generated code from the workspace, and evals the code.
// In a real application, you probably shouldn't use `eval`.
const showCode = () => {
  const code = javascriptGenerator.workspaceToCode(ws);
  codeDiv.innerText = code;

  outputDiv.innerHTML = '';
  return code;
};


const runCode = () => {
  runDiv.addEventListener("click", function() {
    eval(newCode);
    //console.log(newCode);
  });
};


const saveCode = () => {

    // build ouptut array and send request to api
    saveButton.addEventListener("click", function() {
      
      if (outputDiv.hasChildNodes()) 
      {
        let children = outputDiv.childNodes;

        //for (const [i, node] of children) {
        let i = 0;
        const reqArray = [];
        for (const node of children) {
          if(node.id == 'changeStrip')
            i = -1;
          else{
            //console.log(i, node.id, node.style.backgroundColor);
            //build json array for each led request
            i++;
            const row = node.id.split('_');
            const colorStr = node.style.backgroundColor.substr(3);
            var regExp = /\(([^)]+)\)/;
            var color = regExp.exec(colorStr);
            //console.log(color[1]);
            const request = {'action':'add',
                  'row':parseInt(row[1]), //strip_1
                  'led_column':i, //index
                  'interval':1,
                  'id_tag':null,
                  'color':color[1],
                  'id_node':null,
                  'client':'server'};
            //console.log(request);
            reqArray.push(request);
          }
        }
        //console.log(reqArray);

        //send request for ligthing leds
        setLedRequest(reqArray);

      }
      else {
        alert("Press RUN button before saving something");
      }
  });
};


// Load the initial state from storage and run the code.
load(ws);
var newCode = showCode();
runCode();
saveCode();

// Every time the workspace changes state, save the changes to storage.
ws.addChangeListener((e) => {
  // UI events are things like scrolling, zooming, etc.
  // No need to save after one of these.
  if (e.isUiEvent) return;
  save(ws);
});


// Whenever the workspace changes meaningfully, run the code again.
ws.addChangeListener((e) => {
  // Don't run the code when the workspace finishes loading; we're
  // already running it once when the application starts.
  // Don't run the code during drags; we might have invalid state.
  if (e.isUiEvent || e.type == Blockly.Events.FINISHED_LOADING ||
    ws.isDragging()) {
    return;
  }
  newCode = showCode();
});
