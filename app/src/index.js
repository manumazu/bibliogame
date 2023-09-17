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
const runButton = document.getElementById('runcode');
const sendButton = document.getElementById('sendcode');
const resetButton = document.getElementById('reset');
const blocklyDiv = document.getElementById('blocklyDiv');
const ws = Blockly.inject(blocklyDiv, {toolbox});


let acorn = require('acorn');
let Interpreter = require('./interpreter');
Interpreter.nativeGlobal['acorn'] = acorn;

let myInterpreter = null;
let runnerPid = 0;

//for highlighting blocks
//javascriptGenerator.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
//javascriptGenerator.addReservedWords('highlightBlock');

//const baseUrl = 'https://bibliobus.local/api';
const baseUrl = 'https://bibliob.us/api';
//const uuid = 'YmlidXMtMDAwMy0wMzA0Nw=='; //module "bearstech"
const uuid = 'YmlidXMtMDAwMi0wMzA5Mg=='; //module de démo 


function initApi(interpreter, globalObject) {

  // Add an API function for the alert() block, generated for "text_print" blocks.
  const wrapperAlert = function alert(text) {
    text = arguments.length ? text : '';
    outputDiv.innerHTML += '\n' + text;
  };
  interpreter.setProperty(globalObject, 'alert', interpreter.createNativeFunction(wrapperAlert)); 

  // used for adding new led blocks in output
  const wrapperNewLed = function newLed(color) {
    outputDiv.innerHTML += '<div class="ledBlock" style="background-color:'+color+'"></div>';
  };
  interpreter.setProperty(globalObject, 'newLed', interpreter.createNativeFunction(wrapperNewLed));

  // used for adding new led blocks for strip id in output
  const wrapperNewLedStrip = function newLedForStrip(color, id) {
    outputDiv.innerHTML += '<div class="ledBlock" style="background-color:'+color+'" id="'+id+'"></div>';
  };
  interpreter.setProperty(globalObject, 'newLedForStrip', interpreter.createNativeFunction(wrapperNewLedStrip));

  // used for addin led strip in output
  const wrapperNewStrip = function newStrip() {
    outputDiv.innerHTML += '<div style="display:block" id="changeStrip"></div>';
  };
  interpreter.setProperty(globalObject, 'newStrip', interpreter.createNativeFunction(wrapperNewStrip));

  // Add an API function for highlighting blocks.
  const wrapper = function(id) {
    id = String(id || '');
    return highlightBlock(id);
  };
  interpreter.setProperty(globalObject, 'highlightBlock',interpreter.createNativeFunction(wrapper));

  // Add an API for the wait block.  See wait_block.js
  initInterpreterWaitForSeconds(interpreter, globalObject);
}

/**
 * Register the interpreter asynchronous function
 * <code>waitForSeconds()</code>.
 */
function initInterpreterWaitForSeconds(interpreter, globalObject) {
  // Ensure function name does not conflict with variable names.
  javascriptGenerator.addReservedWords('waitForSeconds');

  const wrapper = interpreter.createAsyncFunction(
      function(timeInSeconds, callback) {
        const elems = document.getElementsByClassName('waitForSeconds');
        let id = 'waitForSeconds_'+elems.length; //set uniq id for wait block
        outputDiv.innerHTML += '<input type="hidden" class="waitForSeconds" value="'+(timeInSeconds * 1000)+'" id="'+id+'">';
      // Delay the call to the callback.
        setTimeout(callback, timeInSeconds * 1000);
      });
  interpreter.setProperty(globalObject, 'waitForSeconds', wrapper);
}

function highlightBlock(id) {
  ws.highlightBlock(id);
}

function resetStepUi(clearOutput) {
  clearTimeout(runnerPid);
  ws.highlightBlock(null);
  runButton.disabled = '';

  if (clearOutput) {
    outputDiv.innerHTML = '';
  }
  myInterpreter = null;
}

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
  runButton.addEventListener("click", function() {
    //eval(newCode);
    //console.log(newCode);
    if (!myInterpreter) {
        //resetStepUi(true);
        // And then show generated code in an alert.
        // In a timeout to allow the outputArea.value to reset first.
        setTimeout(function() {
          // Begin execution
          myInterpreter = new Interpreter(newCode, initApi);
          function runner() {
            if (myInterpreter) {
              const hasMore = myInterpreter.run();
              if (hasMore) {
                // Execution is currently blocked by some async call.
                // Try again later.
                runnerPid = setTimeout(runner, 10);
              }
              else {
                // Program is complete.
                //outputDiv.innerHTML += '\n\n<< Program complete >>';
                resetStepUi(false);
              }
            }
          }
          runner();
        }, 1);
    }
  });
};

//get auth from API
const refreshToken = async (encodedId) => {
    const url = baseUrl + '/module/' + encodedId + '/';
    let response = await fetch(url);
    let res = await response.json();
    //console.log(res['token']);
    return res['token'];
};

//send ligthing request to server, relayed through mobile App
const sendRequest = async(reqArray) => {
  let token = await refreshToken(uuid);
    //console.log(token)
     
    fetch(baseUrl+'/request?token='+token+'&uuid='+uuid, {
      method: 'POST',
      headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(reqArray)
    })
   .then(response => response.json())
   .then(response => console.log(JSON.stringify(response)))
};

//send reset request to server to delete lighting requests, relayed through mobile App
const resetAllRequest = async() => {
    let token = await refreshToken(uuid);
    const resetRequest = [{'action':'reset'}]
    fetch(baseUrl+'/reset-game?token='+token+'&uuid='+uuid, {
      method: 'POST',
      headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(resetRequest)
    })
   .then(response => response.json())
   .then(response => console.log(JSON.stringify(response)))

   outputDiv.innerHTML = '';
};

const sendCode = () => {

    // build ouptut array and send request to api
    sendButton.addEventListener("click", function() {
      
      let reqArray = [];
      if (outputDiv.hasChildNodes()) 
      {
        let children = outputDiv.childNodes;

        //for (const [i, node] of children) {
        let i = 0;
        let delay = '0';
        reqArray[0] = [{'delay':0}];
        for (const node of children) {
          if(node.id == 'changeStrip'){
            i = 0;
          }
          else if(node.id.match('^waitForSeconds')) {
            delay = node.value;
            //await timer(delay);
            reqArray[node.id] = [{'delay':delay}]; 
            console.log(reqArray);      
          }
          else{
            //console.log(i, node.id, node.style.backgroundColor);
            //build json array for each led request
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
                  'id_node':0,
                  'client':'server'};
            i++;
            //console.log(delay);
            //console.log(request);
            //reqArray.push(request);
          }
        }

        //reqArray.forEach((index, elem) => console.log(index));
        /*for (let delay in reqArray) {
          console.log(delay, reqArray[delay])
        }*/
        //console.log(reqArray);
        //send request for ligthing leds
        //sendRequest(reqArray);

      }
      else {
        alert("Press RUN button before saving something");
      }
  });
};

function timer(ms) {
 return new Promise(res => setTimeout(res, ms));
}

const resetRequest = () => {

    // build ouptut array and send request to api
    resetButton.addEventListener("click", function() {
      resetAllRequest();
    })
}

// Load the initial state from storage and run the code.
load(ws);
var newCode = showCode();
runCode();
sendCode();
resetRequest();

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
