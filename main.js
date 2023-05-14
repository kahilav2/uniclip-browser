import utils from "./utils/utils.js"
import StreamrMessageController from "./message_controller.js"

export default {
    template: `
    <div class="app-container">
      <div v-if="state === 'dashboard'" class="hamburger-menu" @click="isSideMenuOpen = !isSideMenuOpen"/>
      <transition name="slide">
        <div
          v-if="isSideMenuOpen"
          class="side-menu">
          <div class="container">
            <h1 class="title mb-3">Uniclip Web (Apr23.0)</h1>
            <div class="mb-2"><b>Public Address:</b> {{ publicAddress }}</div>
            <div class="mb-2"><b>Stream Address:</b> {{ streamUrl }}</div>
            <button class="mb-2" @click="changeAccount">Change Account</button>
            <div class="mb-2"><b>QR Code containing private key:</b> </div>
            <div id="qrcode" class="mb-2"></div>
          </div>
        </div>
      </transition>
      <canvas ref="canvas" hidden></canvas>
      <video ref="video" hidden></video>
      <div ref="topSection" class="top-section">

        <div v-if="errorMessages.length > 0" class="error-messages">
          <li v-for="errorMessage in errorMessages">
            {{ errorMessage }}
          </li>
        </div>
        <div v-if="state === 'start'">
          <div class="intro-title centered centered-vertically">
            <img src="../assets/icon-192x192.png" />
            <div>Uniclip Web</div>
          </div>
          <button class="button centered" @click="state = 'setup'">Set up</button>
        </div>

        <div v-else-if="state === 'setup' && state !== 'camera'">
          <div class="setup-container centered">
            <div class="center-div">
              <button class="button mb-2" @click="scanQrCode">Scan QR Code</button>
            </div>
            <div class="center-div">
              <div class="mb-2">Or</div>
            </div>
            <div v-if="!showManualPrivateKeyInput" class="center-div">
              <button class="button mb-2" @click="showManualPrivateKeyInput=true">Input private key manually</button>
            </div>
            <template v-if="showManualPrivateKeyInput">
              <label>Private Key:</label>
              <input type="text" v-model="privateKey"/>
              <label>Stream Address:</label>
              <input type="text" class="mb-1" v-model="streamUrl"/>
              <div class="center-div">
                <button class="mb-2" @click="submitConfigForm" >Submit</button>
              </div>
            </template>
          </div>
        </div>
        <div v-else-if="state === 'connect'">
          <div class="text-centered centered-vertically">Connecting to the network...</div>
        </div>

        <div v-else-if="state === 'dashboard'" class="dashboard-container">
          <div id="receivedMessages">
            <template v-if="receivedMessages.length === 0">
              <div class="no-received-messages">Your clipboard items will appear here</div>
            </template>
            <template v-for="(msg, key ) in receivedMessages" :key="key">
              <template v-if="msg.type === 'image'">
                <div class="card mb-1">
                  <div class="card-header"></div>
                  <div class="card-body">
                    <img :src="msg.body" />
                  </div>
                  <div class="card-footer">
                    <button @click="saveImage(msg.body, key)">Save</button>
                    <button @click="copyImage(msg.body, key)">Copy</button>
                  </div>
                </div>
                
              </template>
              
              <template v-if="msg.type === 'text'">
                <div class="card mb-1" @click="copy(msg, key)">
                  <div class="card-header"></div>

                  <div class="card-body">
                    <pre>{{ msg.body }}</pre>
                    <div class="card-action-icon" :class="showMessageElementText[key] ? 'copied' : 'click'"/>
                  </div>
                 
                </div>
              </template>

              <template v-if="msg.type === 'file'">
                <div class="card mb-1">
                  <div class="card-header"> File: {{ msg.fileName }}</div>
                  <div class="card-body">
                    <button @click="saveFile(msg.body, msg.fileName)">Save</button>
                  </div>
                </div>
              </template>
              
            </template>
          </div>
        </div>
      </div>
      <div v-if="state === 'dashboard'" class="bottom-section">
        <div class="loaded-files">
          <div class="file" v-for="file in loadedFiles">
            <div class="progress-bar" :style="{ width: file.progress + '%' }">
              {{ file.progress }}%
            </div>
          </div>
        </div>
        <div class="text-input-container">
          <input class="message-input mr-1 mb-1" type="text" v-model="messageInput" :disabled="disabled.messageInput" @keyup.enter="sendMessage" placeholder="Share something..." />
        </div>
        <div class="button-input-row-container">
          <div class="button-container">
            <button class="take-space adjust-font" @click="sendMessage">Send</button>
          </div>
          <div class="button-container">
            <button class="take-space adjust-font" @click="paste" >Paste & Send</button> 
          </div>
          <div class="button-container">
            <button @click="$refs.fileUpload.click()" class="take-space adjust-font">
              <i class="fa fa-cloud-upload"></i> Upload file
              <input hidden ref="fileUpload" @change="uploadFile" type="file" />
            </button>
          </div>
        </div>
      </div>
    </div>`,
    
    data() {
      return {
        messageController: null,
        messageInput: '',
        privateKey: '',
        streamUrl: '',
        publicAddress: '',
        receivedMessages: [],
        isSideMenuOpen: false,
        state: '',
        networkConnected: false,
        showManualPrivateKeyInput: false,
        streamrCli: null,
        error: null,
        maxMessages: 10,
        isConnected: false,
        errorMessages: [],
        loadedFiles: [],
        showMessageElementText: [null, null, null, null, null],
        disabled: { messageInput: false },
        deviceId: "",
      }
    },
    created() {
      this.state = "start"

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js');
      }
      let config = localStorage.getItem('config');
      if (!config) {
          console.log("config has not been set")
          return
      }
      try {
        config = JSON.parse(config)
      } catch(err) {
        this.errorMessages = [err.toString()]
      }
      this.privateKey = config.privateKey
      this.streamId = config.streamId
      this.deviceId = config.deviceId
      try {
      } catch(err) {
        console.log(err)
      }
      this.connect()
    },
    mounted() {
      this.preloadImage('../assets/copied_icon.png');
    },
    watch: {
      isSideMenuOpen(newVal, oldVal) {
        setTimeout(() => {
          if (newVal === true) {
            var qrCode = new QRCode("qrcode");
            qrCode.makeCode(JSON.stringify({ k: this.privateKey, id: this.streamId }));  
          }
        }, 0)
      },
    },
    methods: {
      preloadImage(url) {
        const img = new Image();
        img.src = url;
      },
      async changeAccount() {
        localStorage.removeItem('config')
        this.state = 'start'
        this.isSideMenuOpen = false;
        this.receivedMessages = [];
        this.loadedFiles = [];
        await this.streamrCli.destroy();
        await this.streamrChunker.destroy();
      },
      copyImage(base64Img, key) {
        const blob = this.convertBase64ToBlob(base64Img)
        try {
          navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
          ]);
          this.showMessageElementText[key] = "Copied!"
          setTimeout(()=>this.showMessageElementText[key] = null, 1000)
        } catch (error) {
            console.error(error);
        }
      },
      saveImage(base64Img) {
        const blob = this.convertBase64ToBlob(base64Img);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'image.png'; // Replace this with your desired file name
        link.click();
        URL.revokeObjectURL(url);
      },
      saveFile(base64file, fileName) {
        const blob = this.convertBase64ToBlobNoPrefix(base64file, "text/plain")
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName; // Replace this with your desired file name
        link.click();
        URL.revokeObjectURL(url);
      },
      convertBase64ToBlob(base64String) {
        const parts = base64String.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], { type: contentType });
      },
      convertBase64ToBlobNoPrefix(base64String, contentType) {
        const raw = window.atob(base64String);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], { type: contentType });
      },
      async submitConfigForm() {
        const streamUrlSplitted = this.streamUrl.split("/", 2)
        const isValid = this.privateKey !== '' && this.streamUrl !== '' && streamUrlSplitted.length === 2
        if (!isValid) {
          this.errorMessages = ["Provide both private key and stream address"]
          return 
        }
        this.errorMessages = []
        this.streamId = streamUrlSplitted[1] 
        this.saveConfig()
        this.connect()
      },
      async sendMessage() {
        const text = this.messageInput.trim()
        if (!text) {
          return
        }
        this.messageInput = "";
        this.disabled.messageInput = true
        try {
          await this.messageController.upload({
            type: "text",
            body: text
          })
        } catch (error) {
          console.error(error)
          this.errorMessages = [error.toString()]
        }
        this.disabled.messageInput = false
      },
      async copy(msg, key) {
        navigator.clipboard.writeText(msg.body);
        this.showMessageElementText[key] = "Copied!"
        setTimeout(()=>this.showMessageElementText[key] = null, 1000)
      },
      async uploadFile(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64String = reader.result.substring(reader.result.indexOf(',') + 1);
          console.log(base64String);
          await this.messageController.upload({
            type: "file",
            contentType: file.type,
            fileName: file.name,
            body: base64String
          })
          // Perform operations on the Base64 string
        };
      },
      async paste() {
        const clipboardContents = await navigator.clipboard.read();
        let blob
        for (const item of clipboardContents) {
          if (!item.types.includes("image/png")) {
            console.log("not an image")
            continue // throw new Error("Clipboard contains non-image data.");
          }
          blob = await item.getType("image/png");
          break
          // destinationImage.src = URL.createObjectURL(blob); <------ this may be useful
        }

        if (!blob) {
          // clipboard had text
          const message = await navigator.clipboard.readText()
          this.messageInput = message

          this.sendMessage()
          return 
        }
        //clipboard had image
        var reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          var base64String = reader.result;
          this.messageInput = "Sending image ... "
          try {
            await this.messageController.upload({
              type: "image",
              body: base64String
            });
          } catch (error) {
            console.error(error)
            this.errorMessages = [error.toString()]
          }
          this.messageInput = ""
        }
      },

      async tick() {
        const { video } = this.$refs
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
          return
        }
        
        const { canvas } = this.$refs
        const canvasCtx = this.$refs.canvas.getContext("2d")
        canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (!code) {
          requestAnimationFrame(this.tick);
          return 
        }
        // Scan complete, stop video stream
        const config = JSON.parse(code.data)
        if (video.srcObject) {
          const tracks = video.srcObject.getTracks();
          tracks.forEach(function(track) {
              track.stop();
          });
        }
        canvas.hidden = true
        this.privateKey = config.k
        this.streamId = config.id
        this.errorMessages = []
        this.saveConfig()
        this.connect()
      },
      saveConfig() {
        if (!this.deviceId) {
          this.deviceId = utils.generateUniqueId()
        }
        localStorage.setItem('config', JSON.stringify({ privateKey: this.privateKey, streamId: this.streamId, deviceId: this.deviceId }));
      },
      
      async connect() {
        this.state = 'connect'
        this.messageController = new StreamrMessageController({
          deviceId: this.deviceId,
        })
        await this.messageController.init()
        this.streamrChunker = new StreamrChunker.StreamrChunker()
          .withDeviceId(this.deviceId)
          .withIgnoreOwnMessages()
          .withMaxMessageSize(15000)
          .withTimeBetweenPublishedChunks(1)
        this.streamrChunker.on("publish", async (msg) => { 
          try {
            console.log("publishing a msg" )
            await this.streamrCli.publish(this.streamUrl, msg)
          } catch(err) {
            console.log(err)
            this.errorMessages = [err.toString()]
          }})
        this.streamrChunker.on("message", (msg) => {
            try {
              console.log("streamrChunker -> messageController")
              this.messageController.receiveHandler(msg) 
            } catch(err) {
              console.log(err)
            }
        })
        this.streamrChunker.on("chunk-update", (chunkStatuses) => {
          console.log(chunkStatuses)
          this.loadedFiles = chunkStatuses
        })
        try {
          this.streamrCli = new StreamrClient({
            auth: {
              privateKey: this.privateKey
            },
            network: {
              webrtcMaxMessageSize: 16000, // 1000000// 1048576
              webrtcSendBufferMaxMessageCount: 2000,
            }
            // encryption: {
            //   litProtocolEnabled: true,
            // }
          })
          this.messageController.on("publish", (msg)=> {
            try {
              this.streamrChunker.publish(msg)
            } catch(err) {
              console.log(err)
            } 
          })
          this.messageController.on("message", (msg)=> {
            try {
              this.messageHandler(msg)
            } catch(err) {
              console.log(err)
            } 
          })
          this.publicAddress = await this.streamrCli.getAddress()
          this.streamUrl = this.publicAddress + "/" + this.streamId
          const isStoredStream = await this.streamrCli.isStoredStream(this.streamUrl, StreamrClient.STREAMR_STORAGE_NODE_GERMANY )
          console.log("isStoredStream", isStoredStream)
          await this.streamrCli.subscribe({ 
            id: this.streamUrl,
            ...(isStoredStream ? { resend: { last: 10 }} : {})
          }, (msg) => {
            console.log("received msg")
            try {
              this.streamrChunker.receiveHandler(msg)
            } catch(err) {
              console.log(err)
            }
          })
          this.isConnected = true
          this.state = 'dashboard'
        } catch (error) {
          this.errorMessages = [error.toString()]
          this.state = 'start'
        }
      },
      messageHandler(msg) {
        console.log("message came", msg)
        if (this.receivedMessages.length >= this.maxMessages) {
          this.receivedMessages.shift()
        }
        this.receivedMessages.push(msg);
        setTimeout(()=>{this.$refs.topSection.scrollTo(0, this.$refs.topSection.scrollHeight)},0)
      },
      stopVideoRecording() {
        if (stream) {
          const tracks = stream.getTracks();
          tracks.forEach(function(track) {
              track.stop();
          });
        }
      },
      async scanQrCode() {
        this.state = 'camera'
        const { video, canvas } = this.$refs
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        video.srcObject = stream
        video.setAttribute("playsinline", true) // required to tell iOS safari we don't want fullscreen
        video.play();
        video.addEventListener("loadedmetadata", () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.hidden = false;
          this.tick();
        });
      }
    }
  }