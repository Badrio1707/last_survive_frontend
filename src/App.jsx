import Game from "./game/objects/Game";
import socket from "./socket";

function App() {
  const spawnPlayer = () => {
    socket.emit("spawn_test", {
      name: "Panz",
      photo: "https://api.dicebear.com/7.x/adventurer/png?seed=Panz",
    });
  };

  const chaos = () => {
    socket.emit("chaos_test");
  };

  const jump = () => {
    socket.emit("jump_test");
  };

  return (
    <>
      <div
        style={{
          position: "absolute",
          zIndex: 999,
          top: 20,
          left: 20,
          display: "flex",
          gap: 10,
        }}
      >
        <button onClick={spawnPlayer}>Spawn</button>

        <button onClick={chaos}>Chaos</button>

        <button onClick={jump}>Jump</button>
      </div>

      <Game />
    </>
  );
}

export default App;
