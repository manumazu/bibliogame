const baseUrl = app_baseUrl
const uuid = app_uuid
let codeId = app_code_id

module.exports = {

   // get workspace from biblioapp API and load workspace
   getCustomCode: async function() {
     let state = ''
     if(codeId!==null) {
       //console.log(codeId)
       let token = await this.refreshToken(uuid);
       const url = `${baseUrl}/customcode/${codeId}?token=${token}&uuid=${uuid}`
       return fetch(url).then(async (response) => {
           if(response.status == 200) {
             return await response.json()
           }
           else {
             // force redirect to base page url when connection error
             //const urlOrigin = location.protocol + '//' + location.host + location.pathname
             //history.pushState({}, "", urlOrigin);
             console.error("Unable to find customcode for id " + codeId)
             codeId = null
           }
       })
     }
   },

   //get auth from API
   refreshToken: async function(encodedId) {
      const url = baseUrl + '/module/' + encodedId + '/';
      let response = await fetch(url);
      let res = await response.json();
      //console.log(res['token']);
      return res['token'];
   },

   //send reset request to server to delete lighting requests, relayed through mobile App
   resetRequest: async function(){

     let token = await this.refreshToken(uuid);
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
   },

   // export current workspace as string
   saveWorkspace: async function(state, ledsArray, workspaceTitle) {
       
      let title = prompt("Give a short title to your work", workspaceTitle);
      if(title == '') {
         alert("Give a short title to your work");
         return false
      }
      if(!title || title == null) {
         return false
      }
      workspaceTitle = title

      // export played scenario as string
      const reqArray = this.mapRequests(ledsArray);

      const data = {'title':title, 
         'description': 'blockly workspace',
         'published': 0,
         'customcode':JSON.stringify(state),
         'customvars':JSON.stringify(reqArray)
      }
       
      let token = await this.refreshToken(uuid);
      const urlParams = new URLSearchParams(window.location.search);
      //const codeId = urlParams.get('id_code');

      let url = ''
      if(codeId!==null) {
         url = `${baseUrl}/customcode/${codeId}?token=${token}&uuid=${uuid}`
      } 
      else {
         url = `${baseUrl}/customcodes?token=${token}&uuid=${uuid}`
      }

      fetch(url, {
         method: 'POST',
         headers: {
             'Accept': 'application/json',
             'Content-Type': 'application/json'
         },
         body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(response =>  {
         //console.log(JSON.stringify(response))
         // add new param for url without reload page
         let url = new URL(window.location);
         url += response.code_id;
         history.pushState({}, "", url);
         
         //update app codeId in template
         app_code_id = response.code_id
         codeId = app_code_id
         
         //update page title
         this.printPageTitle(response.title)
      })

      return [workspaceTitle, reqArray]
   },

   //send ligthing request to server, relayed through mobile App
   publishCode: async function(publish) {
      
      if(codeId===null) {
         console.log('Error : Missing codeId')
         return false
      }

      let token = await this.refreshToken(uuid);
      return fetch(`${baseUrl}/customcodepublish/${codeId}?token=${token}&uuid=${uuid}`, {
         method: 'POST',
         headers: {
             'Accept': 'application/json',
             'Content-Type': 'application/json'
         },
         body: JSON.stringify({'publish':publish})
       })
      .then(response => response.json())
      .then(response => {
         //console.log(JSON.stringify(response))
         return response
      })
   },

   //send ligthing request to server, relayed through mobile App
   sendRequest: async function(reqArray) {
     let token = await this.refreshToken(uuid);
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
   },

   // add title in page header and set button status
   printPageTitle: function(workspaceTitle = null, isPublished) {
      const titleDiv = document.getElementById('title')
      const publishButton = document.getElementById('publishcode')
      let msg = `${workspaceTitle} : Preview ${app_maxLedsStrip} Leds by Strip`
      if(workspaceTitle == null) {
         msg = `New code : Preview ${app_maxLedsStrip} Leds by Strip`
      }
      titleDiv.innerHTML = msg
      if(isPublished == 1) {
         publishButton.classList.remove('publish')
         publishButton.classList.add('draft')
         publishButton.innerText = 'Set as Draft'
      }
      // code is draft : set button to publish
      else if (isPublished == 0) {
         publishButton.classList.remove('draft')
         publishButton.classList.add('publish')
         publishButton.innerText = 'Publish'
      }
   },

   // parse leds array before sending requests
   buildRequest: function(requests) {

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
         'color':this.hex2rgb(color),
         'id_node':0,
         'client':'server'};
         requestArray.push(request)
       }

       console.log(requestArray);
       return requestArray;
   },

   // store scenario into an object to be saved as string
   mapRequests: function(ledsArray) {
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
               let blocks = this.build_block_position(delayNode[delay][strip])
               reqArray[iteration][delay].push(blocks);
             }
           }
         }
     }
     return reqArray
   },

   // used for converting color hexa to rgb format
   hex2rgb: function(hex) {
       const r = parseInt(hex.slice(1, 3), 16);
       const g = parseInt(hex.slice(3, 5), 16);
       const b = parseInt(hex.slice(5, 7), 16);

       return r + ',' + g + ',' + b;
   },

   // gather contiguous leds together to optimize message
   build_block_position: function(positions) {

     let cpt = 1  
     let block = {}
     let blocks = []
     let interval = 1

     //console.log(positions)
     //loop 1 : group nearby positions, and separate isolated postions
     for (let i in positions) { 

       let pos = positions[i]
       pos.rgb_color = this.hex2rgb(pos.color)

       // define first block
       if (typeof(positions[i-1]) == 'undefined') {
         block = {'row':pos.strip, 'start':pos.led_index, 'color':pos.rgb_color,  'interval':interval}
       }
       else {
         // check if current pos is following the previous pos //
         if(pos.led_index == positions[i-1].led_index + 1 && pos.color == positions[i-1].color && pos.strip == positions[i-1].strip) {

           interval = cpt+1
           block.interval = interval 

         }
         // for single position
         else {
           cpt = 0
           interval = 1        
           block = {'row':pos.strip, 'start':pos.led_index, 'color':pos.rgb_color, 'interval':interval}
         }
         cpt++
       }

       //update block position list
       if(!blocks.includes(block)){
         blocks.push(block)
       }

     }

     //console.log(JSON.stringify(blocks))
     return blocks
   },

   timer: function(ms) {
    return new Promise(res => setTimeout(res, ms));
   },   


   /*const sendCode = () => {

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
   };*/

}