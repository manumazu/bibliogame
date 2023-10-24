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
const stepButton = document.getElementById('stepcode');
const stopButton = document.getElementById('stopcode');
const sendButton = document.getElementById('sendcode');
const resetButton = document.getElementById('reset');
const saveButton = document.getElementById('savecode');
const blocklyDiv = document.getElementById('blocklyDiv');
const ws = Blockly.inject(blocklyDiv, {toolbox});
ws.scrollCenter();


let acorn = require('acorn');
let Interpreter = require('./interpreter');
Interpreter.nativeGlobal['acorn'] = acorn;

let myInterpreter = null;
let runnerPid = 0;
let runner;

//const baseUrl = 'https://127.0.0.1:5000/api';
const baseUrl = 'https://bibliobus.local/api';
//const baseUrl = 'https://bibliob.us/api';
//const uuid = 'YmlidXMtMDAwMy0wMzA0Nw=='; //module "bearstech"
const uuid = 'YmlidXMtMDAwMi0wMzA5Mg=='; //module de démo 

let ledsArray = [];// used for recording requests by leds iteration blocks (interpreter run code)
let stepArray = []; //use for recording single led request (interpreter step code)
let iteration = 'iteration_0';
let delay = 0;
ledsArray[iteration] = [delay];
ledsArray[iteration][delay]=[];

function initLedsArray() {

  // Reinit Leds Array when code changes 
  ledsArray = [];
  iteration = 'iteration_0';
  delay = 0;
  ledsArray[iteration] = [delay];
  ledsArray[iteration][delay]=[];

}

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

// manage explain flag for highlighting blocks whit "explain" button 

// use browser history to store explain flag value
const currentState = history.state;
let explain = false;
let runcodeDelay = 10; 
if(currentState != null && typeof(currentState.explain)!=='undefined') {
  explain = currentState.explain;
  //console.log('explain', explain);
  runCodeInterpreter();
}

if(explain) {
  javascriptGenerator.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
  javascriptGenerator.addReservedWords('highlightBlock');
  runcodeDelay = 20;
}


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
};

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
};

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
                    const requestArray = buildRequest(stepArray);
                    sendRequest(requestArray);
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

const sendCode = () => {

    sendButton.addEventListener("click", async function() {

      // build ouptut array and send request to api with timer
      if (outputDiv.hasChildNodes()) 
      {
        for (let iteration in ledsArray) {
          console.log(iteration);
          // pause during execution
          let delayNode = ledsArray[iteration];
          for (let delay in delayNode) {
            if (Number(delay) > 0) {
              console.log(delay);
              await timer(delay);
            }
            //send request
            if(Array.isArray(delayNode[delay])) {
              for (let strip in delayNode[delay]) {
                //console.log(JSON.stringify(delayNode[delay][strip]));
                const requestArray = buildRequest(delayNode[delay][strip]);
                sendRequest(requestArray);  
              }
            }
          }
        }
      }
      else {
        alert("Press RUN button before saving something");
      }
  });
};

// used for converting color hexa to rgb format
const hex2rgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return r + ',' + g + ',' + b;
}

// parse leds array before sending requests
function buildRequest(requests) {

    //console.log(JSON.stringify(requests));
    const requestArray = [];
    for (let node in requests) 
    {
      //console.log(delayNode[delay][node]['strip'], delayNode[delay][node]['color']);
      const row = requests[node]['strip'].split('_'); //strip_n
      const ledIndex = requests[node]['led_index'];
      const color = requests[node]['color'];

      const request = {'action':'add',
      'row':parseInt(row[1]),
      'led_column':ledIndex, //index
      'interval':1,
      'id_tag':null,
      'color':hex2rgb(color),
      'id_node':0,
      'client':'server'};
      requestArray.push(request)
    }

    console.log(requestArray);
    return requestArray;
}

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
   initLedsArray();
};

const resetRequest = () => {

    // build ouptut array and send request to api
    resetButton.addEventListener("click", function() {
      resetAllRequest();
    })
}

// store scenario into an object to be saved as string
function mapRequests() {
  const reqArray = {}
  let delay = 0
  for (let iteration in ledsArray) {
      // iteration should be an object
      reqArray[iteration] = {}
      // define array for storing elements in delay
      reqArray[iteration][delay] = []
      let delayNode = ledsArray[iteration];
      for (delay in delayNode) {
        if (Number(delay) > 0) {
          reqArray[iteration][delay] = []
        }
        // add elements
        if (Array.isArray(delayNode[delay])) {
          for (let strip in delayNode[delay]) {
            for (let element in delayNode[delay][strip]) {
              // use RGB color
              //delayNode[delay][strip][element].color = hex2rgb(delayNode[delay][strip][element].color)
            }
            optimize_blocks(delayNode[delay][strip])
            reqArray[iteration][delay].push(delayNode[delay][strip]);
          }
        }
      }
  }
  return reqArray
}


// gather contiguous leds together to optimize message
function optimize_blocks(positions) {

  let cpt = 0  
  let block = {}
  let blocks = []

  //console.log(positions)
  //loop 1 : group nearby positions, and separate isolated postions
  for (let i in positions) { 

    let pos = positions[i]

    let idx = pos.strip+'_'+pos.led_index+'_'+pos.color
    //console.log(pos)
    //if (cpt == 0) {
    if (typeof(positions[i-1]) == 'undefined') {
      block = {'row':pos.strip, 'start':pos.led_index, 'color':pos.color,}
    }
    // check if current pos is following the previous pos //
    else {

      if(pos.led_index == positions[i-1].led_index + 1 && pos.color == positions[i-1].color 
        && pos.strip == positions[i-1].strip) {

        // store node ids inside list
        block.interval = cpt+1
        if(!blocks.includes(block)){
          //console.log(block)
          blocks.push(block)
        }

      }
      else {
        cpt = 0
        block = {'row':pos.strip, 'index':i, 'start':pos.led_index, 'color':pos.color, 'interval':1}
        blocks.push(block)
        //console.log('alone1', uniqelem)
        //console.log(block)
      }
      cpt++
    }
  }

  //second loop
  /*for (let i in positions) { 

    let pos = positions[i]
    let idx = pos.strip+'_'+pos.led_index+'_'+pos.color
    //console.log('alone2', uniqelem)
    for (let j in uniqelem) {
      if (uniqelem[j] == idx) {
        blocks.push({'row':pos.strip, 'index':i, 'start':pos.led_index, 'color':pos.color, 'interval':1})
      }
    }
  }*/

  console.log(JSON.stringify(blocks))
}


//send save workspace request 
const saveWorkspace = () => {
  
  saveButton.addEventListener("click", async function() {
    // export current workspace as string
    const state = Blockly.serialization.workspaces.save(ws);
    // export played scenatio as string
    const reqArray = mapRequests();
    
    // object verification
    /*for (let iteration in reqArray) {
      for (let delay in reqArray[iteration]) {
        console.log(delay)
        for (let strip in reqArray[iteration][delay]) {
          console.log(JSON.stringify(reqArray[iteration][delay][strip]))
        }
      }
    }*/

    const data = [{'title':'test', 
      'published': 0,
      'customcode':JSON.stringify(state),
      'customvars':JSON.stringify(reqArray)
    }]
    //Blockly.serialization.workspaces.load(state, ws);
    
    /*let token = await refreshToken(uuid);
     
    fetch(baseUrl+'/customcodes?token='+token+'&uuid='+uuid, {
      method: 'POST',
      headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
   .then(response => response.json())
   .then(response => console.log(JSON.stringify(response)))*/
  })

}


function timer(ms) {
 return new Promise(res => setTimeout(res, ms));
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

function printTitle() {

  const pageTitle = document.getElementById('title')
  const element = document.createElement("div")
  element.style.display = 'inline-block'
  element.appendChild(
    document.createTextNode(`Preview ${app_maxLedsStrip} Leds by Strip`)
  )
  pageTitle.prepend(element)
  //pageTitle.insertAdjacentHTML('afterbegin', `Preview ${app_maxLedsStrip} Leds by Strip`)
}


// Load the initial state from storage and run the code.
load(ws);
var newCode = showCode();
const main = () => {
  printTitle();
  explainCode();
  stopCode();
  runCode();
  sendCode();
  resetRequest();
  saveWorkspace();
}
main()