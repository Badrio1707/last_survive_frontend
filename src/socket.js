import { io } from "socket.io-client";

const socket = io("https://last-survive-backend.vercel.app/");

export default socket;
