const socket = io();

// For chat
const welcome = document.getElementById("welcome");
const nameForm = welcome.querySelector("#name");
const roomForm = welcome.querySelector("#roomname");
const room = document.getElementById("room");
const h3 = room.querySelector("h3");
const chat = document.getElementById("chat");
const chatForm = chat.querySelector("#msg");

// For video
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");
let myStream;
let muted = false;
let cameraOff = false;
let myPeerConnection;
let myDataChannel;

call.hidden = true;

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach((camera) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera.label === camera.label) {
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        });
    } catch (e) {
        console.log(e);
    }
}
async function getMedia(deviceId) {
    const initConstrains = {
        audio: true, 
        video: { facingMode: "user" },
    };
    const cameraConstrains = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
    };
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? cameraConstrains : initConstrains
        );
        myFace.srcObject = myStream;
        if(!deviceId) {
            await getCameras();
        }
    } catch(e) {
        console.log(e);
    }
}

muteBtn.addEventListener("click", () => {
    myStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
    });
    if (!muted) {
        muteBtn.innerText = "Unmute";
        muted = true;
    } else {
        muteBtn.innerText = "Mute";
        muted = false;
    }
});
cameraBtn.addEventListener("click", () => {
    myStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
    });
    if (!cameraOff) {
        cameraBtn.innerText = "Turn Camera On";
        cameraOff = true;
    } else {
        cameraBtn.innerText = "Turn Camera Off";
        cameraOff = false;
    }
});

 camerasSelect.addEventListener("input", async function () {
         await getMedia(camerasSelect.value);
         if (myPeerConnection) {
             const videoTrack = myStream.getVideoTracks()[0];
             const videoSender = myPeerConnection
                .getSenders()
                .find((sender) => sender.track.kind === "video");
            videoSender.replaceTrack(videoTrack);
         }
     });

room.hidden = true;
chat.hidden = true;

let roomName;
let nickname;

function refreshCount(countRoom) {
    h3.innerText = `Room ${roomName} (${countRoom})`;
}
function addMessage(message) {
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

function handleNicknameSubmit(event) {
    event.preventDefault();
    const input = welcome.querySelector("#name input");
    nickname = input.value;
    socket.emit("nickname", nickname);
    input.value = "";
}
function handleMessageSubmit(event) {
    event.preventDefault();
    const input = room.querySelector("#msg input");
    const value = input.value;
    socket.emit("new_message", roomName, value, () => {
        addMessage(`You: ${value}`);
    });
    input.value = "";
}

async function initCall() {
    call.hidden = false;
    await getMedia();
    makeConnection();
}
async function showRoom() {
    welcome.hidden = true;
    chat.hidden = false;
    h3.innerText = `Room ${roomName}`;
    const msgForm = room.querySelector("#msg");
    //const nameForm = room.querySelector("#name");
    msgForm.addEventListener("submit", handleMessageSubmit); 
    //nameForm.addEventListener("submit", handleNicknameSubmit);
}

async function handleRoomSubmit(event) { 
    event.preventDefault();
    const input = roomForm.querySelector("#roomname input");
    await initCall();
    socket.emit("enter_room", input.value, showRoom);
    roomName = input.value;
    input.value = "";
}

nameForm.addEventListener("submit", handleNicknameSubmit);
roomForm.addEventListener("submit", handleRoomSubmit);

// Socket Code

socket.on("welcome", async (user, countRoom) => {
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("message", (event) => {
        console.log(event.data);
        handleReceiveMessage(event.data);
    });
    console.log("made data channel");
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("sent the offer");
    socket.emit("offer", offer, roomName);
    refreshCount(countRoom);
    addMessage(`${user} arrived 👀`);
});

socket.on("offer", async (offer) => {
    myPeerConnection.addEventListener("datachannel", (event) => {
        myDataChannel = event.channel;
        myDataChannel.addEventListener("message", (event) => {
            console.log(event.data);
            handleReceiveMessage(event.data);
        });
    });
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
    console.log("sent the answer");
});

socket.on("answer", (answer) => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);
});

socket.on("bye", (user, countRoom) => {
    // h3.innerText = `Room ${roomName} (${countRoom})`;
    refreshCount(countRoom);
    addMessage(`${user} left 👋🏻`);
    myPeerConnection.close();
    
});

socket.on("new_message", addMessage);

socket.on("room_change", (rooms) => {
    const roomList = welcome.querySelector("ul");
    roomList.innerHTML = "";
    if (rooms.length === 0) {
        return;
    }
    rooms.forEach((room) => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.append(li);
    });
});

// RTC Code

function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ],
            },
        ],
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, myStream));
    //console.log(myStream.getTracks());
}

function handleIce(data) {
    console.log("sent candidate");
    socket.emit("ice", data.candidate, roomName);
    // console.log(data);
}

function handleAddStream(data) {
    console.log("got an event from my peer");
    console.log("Peer's Stream", data.stream);
    console.log("My stream", myStream);
    const peerFace = document.getElementById("peerFace");
    peerFace.srcObject = data.stream;
}

// Chat Form
chatForm.addEventListener("submit", handleChatSubmit);

function handleChatSubmit(event) {
    event.preventDefault();
    const input = chatForm.querySelector("input");
    const message = input.value;
    const ul = chat.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
    myDataChannel.send(`${nickname} : ${message}`);
    input.value = "";
}

function handleReceiveMessage(data) {
    console.log(data);
    const ul = chat.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = data;
    ul.appendChild(li);
}
