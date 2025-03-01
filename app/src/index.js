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
const bibliobus = require('./bibliobus');

// Register the blocks and generator with Blockly
Blockly.common.defineBlocks(blocks);
Object.assign(javascriptGenerator.forBlock, forBlock);

// Set up UI elements and inject Blockly
const codeDiv = document.getElementById('generatedCode').firstChild;
const outputDiv = document.getElementById('output');
const runButton = document.getElementById('runcode');
const stepButton = document.getElementById('stepcode');
const stopButton = document.getElementById('stopcode');
const resetButton = document.getElementById('reset');
const saveButton = document.getElementById('savecode');
const publishButton = document.getElementById('publishcode');
const blocklyDiv = document.getElementById('blocklyDiv');
const ws = Blockly.inject(blocklyDiv, {toolbox});
ws.scrollCenter();


let acorn = require('acorn');
let Interpreter = require('./interpreter');
Interpreter.nativeGlobal['acorn'] = acorn;

let myInterpreter = null;
let runnerPid = 0;
let runner;

let workspaceTitle = '';
let ledsArray = [];// used for recording requests by leds iteration blocks (interpreter run code)
let stepArray = []; //use for recording single led request (interpreter step code)
let iteration = 'iteration_0';
let delay = 0;
ledsArray[iteration] = [delay];
ledsArray[iteration][delay]=[];
let isPublished = false;

function initLedsArray() {

  // Reinit Leds Array when code changes 
  ledsArray = [];
  iteration = 'iteration_0';
  delay = 0;
  ledsArray[iteration] = [delay];
  ledsArray[iteration][delay]=[];

}

// load wrappers for Interpretor
function initApi(interpreter, globalObject) {

  // Add an API function for the alert() block, generated for "text_print" blocks.
  const wrapperAlert = function alert(text) {
    text = arguments.length ? text : '';
    outputDiv.innerHTML += '\n' + text;
  };
  interpreter.setProperty(globalObject, 'alert', interpreter.createNativeFunction(wrapperAlert)); 

  // used for adding new led blocks in output
  const wrapperAddLed = interpreter.createNativeFunction( 
    function (color) {
      outputDiv.innerHTML += '<div class="ledBlock" style="background-color:'+color+'"></div>';
  });
  interpreter.setProperty(globalObject, 'addLed', wrapperAddLed);

  // used for addin led strip in output
  const wrapperChangeStripLed = interpreter.createNativeFunction(
    function () {
      outputDiv.innerHTML += '<div style="display:block" id="changeStrip"></div>';
  });
  interpreter.setProperty(globalObject, 'changeStripLed', wrapperChangeStripLed);

  // Add an API function for highlighting blocks.
  const wrapperHighlight = function(id) {
    id = String(id || '');
    return highlightBlock(id);
  };
  interpreter.setProperty(globalObject, 'highlightBlock',interpreter.createNativeFunction(wrapperHighlight));

  // Add an API for the wait block.  See javascript.js
  initInterpreterWaitForSeconds(interpreter, globalObject);
  initInterpreterWaitForSecondsForStrip(interpreter, globalObject);
  wrapperAddLedStrip(interpreter, globalObject);
}

function wrapperAddLedStrip(interpreter, globalObject) {
  // used for adding new led blocks for strip id in output
  const wrapper = interpreter.createNativeFunction( 
    function (color, strip_id) {
      let stripDiv = document.getElementById(strip_id);
      let ledIndex = 0;
      let nbstrips = document.getElementsByClassName('strip').length;
      // prevent index not to big greater than current led strip (ie : demo module is 32 leds per strip)
      let maxLeds = app_maxLedsStrip; // must be dependant with biblioapp values 

      //preview Leds in HTML page
      const ledDiv = '<div class="ledBlock" style="background-color:' + color + '"></div>';
      //add color to strip div
      if(stripDiv !== null) 
      {
        ledIndex = stripDiv.getElementsByClassName('ledBlock').length;
        if(ledIndex%maxLeds == 0) { // clean strip div when max leds is reached
          stripDiv.innerHTML = '';
        }
        stripDiv.innerHTML += ledDiv;   
      }
      else { // create new strip with color
        outputDiv.innerHTML += '<div id="' + strip_id + '" class="strip">' + ledDiv + '</div>';
      }

      //console.log('strip:', strip_id, iteration, 'color:', color, 'modulo:', ledIndex%maxLeds);

      // record led request in global iteration array
      // store leds positions for sending requests 
      let ledRequest = {'strip':strip_id, 'led_index':ledIndex%maxLeds, 'color':color};
      // store requests by delay and strip (better performance) 
      if(typeof(ledsArray[iteration][delay][strip_id]) == 'undefined') {
          ledsArray[iteration][delay][strip_id] = []
      }
      ledsArray[iteration][delay][strip_id].push(ledRequest);
      // record led request for step by step preview
      stepArray.push(ledRequest);
  });
  interpreter.setProperty(globalObject, 'addLedStrip', wrapper);
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
        let id = 'iteration_'+(elems.length+1); //set uniq id for wait block
        
        //init leds Array with iteration ID
        iteration = id;
        delay = timeInSeconds * 1000;
        ledsArray[iteration] = [delay];
        if(typeof(ledsArray[iteration][delay]) == 'undefined') {
          ledsArray[iteration][delay] = []
        }         

        //new timer for output
        let inputTimer = '<input type="hidden" class="waitForSeconds" value="' + delay + '" id="' + id + '">';
        outputDiv.innerHTML += inputTimer;
        // Delay the call to the callback.
        setTimeout(callback, timeInSeconds * 1000);
      });
  interpreter.setProperty(globalObject, 'waitForSeconds', wrapper);
}


/**
 * Register the interpreter asynchronous function
 * <code>waitForSeconds()</code> inside strip led block.
 */
function initInterpreterWaitForSecondsForStrip(interpreter, globalObject) {
  // Ensure function name does not conflict with variable names.
  javascriptGenerator.addReservedWords('waitForSecondsForStrip');

  const wrapper = interpreter.createAsyncFunction(
      function(timeInSeconds, stripId, callback) {
        
        const elems = document.getElementsByClassName('waitForSeconds');
        let id = 'iteration_'+(elems.length+1); //set uniq id for wait block inside strip

        //init leds Array with iteration ID
        iteration = id;
        delay = timeInSeconds * 1000;
        ledsArray[iteration] = [delay]
        if(typeof(ledsArray[iteration][delay]) == 'undefined') {
          ledsArray[iteration][delay] = []
        }

        let stripDiv = document.getElementById(stripId);
        const inputTimer = '<input type="hidden" class="waitForSeconds" value="'+(timeInSeconds * 1000)+'" id="' + id + '">';
        outputDiv.innerHTML += inputTimer;
        //add timer to strip div
        /*if(stripDiv !== null) {
          stripDiv.innerHTML += inputTimer;
        }
        else { // create new strip with timer 
          outputDiv.innerHTML += '<div id="'+stripId+'">'+inputTimer+'</div>';
        }*/
        // Delay the call to the callback.
        setTimeout(callback, timeInSeconds * 1000);
      });
  interpreter.setProperty(globalObject, 'waitForSecondsForStrip', wrapper);
}

// run the code using async Interpreter with step or not
function runCodeInterpreter() {
    if (!myInterpreter) {
      resetStepUi(true);
      // And then show generated code in an alert.
      // In a timeout to allow the outputArea.value to reset first.
      let hasMore = false;
      setTimeout(function() {
        // Begin execution           
        myInterpreter = new Interpreter(newCode, initApi);
        function runner() {
          if (myInterpreter) {   
            if(explain){
              // Send request to module step by step
              if(stepArray.length > 0) {
                  //console.log(stepArray);
                  const requestArray = bibliobus.buildRequest(stepArray);
                  bibliobus.sendRequest(requestArray);
              }
              stepArray = [];// clean led request
              hasMore = myInterpreter.step();
            }
            else {
              hasMore = myInterpreter.run();  
            }
            if (hasMore) {
              // Execution is currently blocked by some async call.
              // Try again later.              
              runnerPid = setTimeout(runner, runcodeDelay);  
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
}


// for highlighting blocks
function highlightBlock(id) {
  ws.highlightBlock(id);
}

function resetStepUi(clearOutput) {
  clearTimeout(runnerPid);
  ws.highlightBlock(null);
  runButton.disabled = '';

  if (clearOutput) {
    outputDiv.innerHTML = '';
    initLedsArray();
  }
  myInterpreter = null;
}

function resetInterpreter() {
  myInterpreter = null;
  if (runner) {
    clearTimeout(runner);
    runner = null;
  }
}

// use browser history to store explain flag value
const currentState = history.state;
let explain = false;
let runcodeDelay = 10; 
if(currentState != null && typeof(currentState.explain)!=='undefined') {
  explain = currentState.explain;
  //console.log('explain', explain);
  runCodeInterpreter();
}

// manage explain flag for highlighting blocks whit "explain" button 
if(explain) {
  javascriptGenerator.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
  javascriptGenerator.addReservedWords('highlightBlock');
  runcodeDelay = 20;
}


// This function resets the code and output divs, shows the
// generated code from the workspace, and evals the code.
// In a real application, you probably shouldn't use `eval`.
const showCode = () => {
  const code = javascriptGenerator.workspaceToCode(ws);
  codeDiv.innerText = code;

  outputDiv.innerHTML = '';
  initLedsArray();
  return code;
};

const explainCode = () => {
  // use flag to launch code step by step
  stepButton.addEventListener("click", function() {
    // set flag value or run the code step by step
    if(!explain) {
      history.pushState({ explain: true }, "", window.location.href);
      location.reload();
    } else {
      runCodeInterpreter();
    }
  })
}

const stopCode = () => {
  // use flag to launch code step by step
  stopButton.addEventListener("click", function() { resetInterpreter(); });
}

const runCode = () => {
  // set flag to launch code directly 
  runButton.addEventListener("click", function() {
    // set flag value or run the code
    if(explain) {
      history.pushState({ explain: false }, "", window.location.href);
      location.reload(); 
    } else {
      runCodeInterpreter();
    }  
  });
}

const resetRequest = () => {
  // interrupt code execution and send reset message
  resetButton.addEventListener("click", function() {
      resetInterpreter();
      initLedsArray();
      outputDiv.innerHTML = '';
      // send reset message to API
      bibliobus.resetRequest();
  })
}

//send save workspace and transform leds requests as array
const saveWorkspace = async() => {
  saveButton.addEventListener("click", async function() {
    const state = Blockly.serialization.workspaces.save(ws);
    if(!outputDiv.hasChildNodes()) {
        alert("Press RUN button before saving something")
        return
    }
    // map leds array, update workspace and page title
    const response = await bibliobus.saveWorkspace(state, ledsArray, workspaceTitle, isPublished);
    if(response) {
      workspaceTitle = response[0]
      
      // object verification
      const mapRequests = response[1]
      //console.log(mapRequests)
      for (let iteration in mapRequests) {
        for (let delay in mapRequests[iteration]) {
          console.log(delay)
          for (let strip in mapRequests[iteration][delay]) {
            console.log(JSON.stringify(mapRequests[iteration][delay][strip]))
          }
        }
      }
    }

  })
}

const publishCode = async() => {
  publishButton.addEventListener("click", async function() {
    
    // show button status depending publish status
    if(publishButton.classList.contains('publish')){
      isPublished = true
    }

    if(publishButton.classList.contains('draft')){
      isPublished = false 
    }

    const response = await bibliobus.publishCode(isPublished);
    //console.log('publish', isPublished, response)
    // coade is published : set button to draft
    if(response['published'] === true) {
      publishButton.classList.remove('publish')
      publishButton.classList.add('draft')
      publishButton.innerText = 'Set as Draft'
    }
    // coade is draft : set button to publish
    else if (response['published'] === false) {
      publishButton.classList.remove('draft')
      publishButton.classList.add('publish')
      publishButton.innerText = 'Publish'
    }

  })
}


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

// Load the initial state from storage and run the code.
load(ws);
var newCode = showCode();

const main = async () => {
  
  // retrieve last state of blockly workspace for api
  let state = await bibliobus.getCustomCode()
  if(!state) {
    bibliobus.printPageTitle();
  }
  else {
    workspaceTitle = state['title']
    isPublished = state['published']
    Blockly.serialization.workspaces.load(JSON.parse(state['customcode']), ws);
    // update page title
    bibliobus.printPageTitle(workspaceTitle, isPublished)
  }
  explainCode();
  stopCode();
  runCode();
  saveWorkspace();  
  resetRequest();
  publishCode();
}
main()