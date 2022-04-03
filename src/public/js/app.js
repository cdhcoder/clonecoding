const socket = io();

const welcome = document.getElementById("welcome");
const nameForm = welcome.querySelector("#name");
const roomForm = welcome.querySelector("#roomname");
const room = document.getElementById("room");
const h3 = room.querySelector("h3");

room.hidden =true;

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

function showRoom() {
    welcome.hidden = true;
    room.hidden = false;
    h3.innerText = `Room ${roomName}`;
    const msgForm = room.querySelector("#msg");
    //const nameForm = room.querySelector("#name");
    msgForm.addEventListener("submit", handleMessageSubmit); 
    //nameForm.addEventListener("submit", handleNicknameSubmit);
}

function handleRoomSubmit(event) { 
    event.preventDefault();
    const input = roomForm.querySelector("#roomname input");
    socket.emit("enter_room", input.value, showRoom);
    roomName = input.value;
    input.value = "";
}

nameForm.addEventListener("submit", handleNicknameSubmit);
roomForm.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (user, countRoom) => {
    // h3.innerText = `Room ${roomName} (${countRoom})`;
    refreshCount(countRoom);
    addMessage(`${user} arrived 👀`);
});

socket.on("bye", (user, countRoom) => {
    // h3.innerText = `Room ${roomName} (${countRoom})`;
    refreshCount(countRoom);
    addMessage(`${user} left 👋🏻`);
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