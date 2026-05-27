import Phaser from "phaser";
import socket from "../../socket";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create() {
    this.leaderboard = {};

    this.platformDirection = 1;

    this.platformSpeed = 1;

    this.waitingPlayers = [];

    this.platformWidth = 850;

    this.obstacles = [];

    this.matchStarted = false;

    this.lobbyCountdown = 10;

    this.maxPlayers = 15;

    this.isGameOver = false;

    this.players = [];

    this.matchStarted = false;

    this.gameStarted = false;

    this.botNames = [
      "Shadow",
      "Blaze",
      "Nova",
      "Ghost",
      "Rex",
      "Pixel",
      "Bolt",
      "Titan",
      "Zero",
      "Luna",
      "Drift",
      "Venom",
      "Storm",
      "Ace",
      "Vortex",
      "Milo",
      "Ninja",
      "Rocket",
      "Frost",
      "Echo",
    ];

    this.botSeedsUsed = new Set();

    this.load.setCORS("anonymous");

    this.add
      .text(540, 60, "LAST CHARACTER SURVIVE", {
        fontSize: "52px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.aliveText = this.add
      .text(540, 130, "", {
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.eventText = this.add
      .text(540, 200, "", {
        fontSize: "42px",
        color: "#ff4444",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.winnerText = this.add
      .text(540, 600, "", {
        fontSize: "80px",
        color: "#ffff00",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5);

    this.lobbyText = this.add
      .text(540, 300, "", {
        fontSize: "42px",
        color: "#00ff99",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5);

    this.leaderboardText = this.add
      .text(40, 420, "", {
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
        align: "left",
        lineSpacing: 10,
      })
      .setOrigin(0, 0);

    this.physics.world.setBounds(0, 0, 1080, 1300);

    // PLATFORM
    this.platform = this.add.rectangle(
      540,
      1000,
      this.platformWidth,
      40,
      0xffffff,
    );

    this.physics.add.existing(this.platform, true);

    // DEFAULT BOTS
    // for (let i = 0; i < 15; i++) {
    //   this.spawnPlayer(`BOT_${i + 1}`);
    // }

    // SHRINK ARENA
    this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => {
        if (!this.matchStarted) return;

        if (this.platformWidth > 220) {
          this.platformWidth -= 20;

          this.updatePlatform();
        }
      },
    });

    // RANDOM OBSTACLE
    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        this.spawnObstacle();
      },
    });

    // SOCKET EVENTS
    this.setupSocketEvents();

    this.checkWinner();
  }

  setupSocketEvents() {
    socket.off("spawn_player");
    socket.off("chaos_mode");
    socket.off("jump_all");

    socket.on("spawn_player", (data) => {
      this.addPlayerToQueue(data);
    });

    socket.on("chaos_mode", () => {
      this.showEvent("CHAOS MODE");

      for (let i = 0; i < 10; i++) {
        this.time.delayedCall(i * 200, () => {
          this.spawnObstacle();
        });
      }

      this.cameras.main.shake(500, 0.01);
    });

    socket.on("jump_all", () => {
      this.players.forEach((player) => {
        if (player.active) {
          player.body.setVelocityY(-700);
        }
      });

      this.showEvent("EVERYBODY JUMP!");
    });
  }

  showEvent(text) {
    this.eventText.setText(text);

    this.eventText.setScale(1);

    this.tweens.add({
      targets: this.eventText,
      scale: 1.2,
      duration: 300,
      yoyo: true,
    });

    this.time.delayedCall(2000, () => {
      this.eventText.setText("");
    });
  }

  addPlayerToQueue(data) {
    const { name, photo } = data;
    // SUDAH MAIN
    const alreadyPlaying = this.players.some((p) => p.username === name);

    // SUDAH DI QUEUE
    const alreadyQueued = this.waitingPlayers.some((p) => p.name === name);

    if (alreadyPlaying || alreadyQueued) {
      return;
    }

    this.waitingPlayers.push({
      name,
      photo,
    });

    this.showEvent(`${name} JOINED QUEUE`);

    // START COUNTDOWN
    if (
      this.waitingPlayers.length >= 2 &&
      !this.matchStarted &&
      !this.lobbyTimer
    ) {
      this.startLobbyCountdown();
    }

    // AUTO START FULL
    if (this.waitingPlayers.length >= this.maxPlayers) {
      this.startMatch();
    }

    this.updateLobbyText();
  }

  updatePlatform() {
    const x = this.platform.x;
    const y = 1000;

    this.platform.destroy();

    this.platform = this.add.rectangle(x, y, this.platformWidth, 40, 0xffffff);

    this.physics.add.existing(this.platform, true);

    this.players.forEach((player) => {
      this.physics.add.collider(player, this.platform);
    });
  }

  updateLobbyText() {
    if (this.matchStarted) {
      this.lobbyText.setText("");
      return;
    }

    if (this.waitingPlayers.length < 2) {
      this.lobbyText.setText(
        `WAITING FOR MORE PLAYERS

${this.waitingPlayers.length}/2 MINIMUM`,
      );

      return;
    }

    this.lobbyText.setText(
      `WAITING PLAYERS: ${this.waitingPlayers.length}/${this.maxPlayers}

STARTING IN ${this.lobbyCountdown}`,
    );
  }

  updateLeaderboard() {
    const sorted = Object.entries(this.leaderboard)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    let text = "TOP 5 LEADERBOARD\n\n";

    if (sorted.length === 0) {
      text += "NO WINNERS YET";
    } else {
      sorted.forEach(([name, score], index) => {
        text += `${index + 1}. ${name}: (${score})\n`;
      });
    }

    this.leaderboardText.setText(text);
  }

  fillWithBots() {
    const slotsNeeded = this.maxPlayers - this.waitingPlayers.length;

    if (slotsNeeded <= 0) return;

    for (let i = 0; i < slotsNeeded; i++) {
      // RANDOM NAME
      let randomName =
        this.botNames[Phaser.Math.Between(0, this.botNames.length - 1)];

      // BIAR TIDAK DUPLIKAT
      randomName += "_" + Phaser.Math.Between(100, 999);

      // RANDOM AVATAR
      const randomSeed = Phaser.Math.Between(1000, 999999);

      const photo = `https://api.dicebear.com/7.x/adventurer/png?seed=${randomSeed}`;

      this.waitingPlayers.push({
        name: randomName,
        photo,
        isBot: true,
      });
    }

    this.showEvent("BOTS JOINED");

    this.updateLobbyText();
  }

  startLobbyCountdown() {
    this.lobbyCountdown = 10;

    this.updateLobbyText();

    this.lobbyTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.lobbyCountdown--;

        this.updateLobbyText();

        // 3 DETIK TERAKHIR AUTO FILL BOT
        if (this.lobbyCountdown === 3) {
          if (this.waitingPlayers.length < this.maxPlayers) {
            this.fillWithBots();
          }
        }

        if (this.lobbyCountdown <= 0) {
          this.startMatch();
        }
      },
    });
  }

  startMatch() {
    if (this.matchStarted) return;

    this.matchStarted = true;

    this.isGameOver = false;

    this.gameStarted = true;

    this.showEvent("FIGHT!");

    if (this.lobbyTimer) {
      this.lobbyTimer.remove();
      this.lobbyTimer = null;
    }

    // SPAWN ALL QUEUED PLAYER
    this.waitingPlayers.forEach((playerData) => {
      this.spawnPlayer(playerData);
    });

    this.waitingPlayers = [];

    this.updateLobbyText();
  }

  spawnPlayer(data) {
    const { name, photo } = data;

    const x = Phaser.Math.Between(250, 830);

    const key = `avatar_${name}`;

    if (!this.textures.exists(key)) {
      this.load.image(key, photo);

      this.load.once("complete", () => {
        this.createPlayer(x, key, name);
      });

      this.load.once("loaderror", () => {
        console.log("FAILED LOAD IMAGE:", photo);
      });

      this.load.start();
    } else {
      this.createPlayer(x, key, name);
    }
  }

  spawnObstacle() {
    if (this.isGameOver) return;
    if (!this.gameStarted) return;

    const x = Phaser.Math.Between(100, 980);

    const obstacle = this.add.rectangle(x, -50, 60, 60, 0xff0000);

    this.physics.add.existing(obstacle);

    obstacle.body.setVelocityY(Phaser.Math.Between(500, 800));

    this.obstacles.push(obstacle);

    this.players.forEach((player) => {
      this.physics.add.collider(
        obstacle,
        player,
        () => {
          this.killPlayer(player);
        },
        null,
        this,
      );
    });

    this.time.delayedCall(7000, () => {
      this.obstacles = this.obstacles.filter((o) => o !== obstacle);

      obstacle.destroy();
    });
  }

  createPlayer(x, textureKey, name) {
    // CONTAINER
    const container = this.add.container(x, 250);

    // AVATAR
    const avatar = this.add.image(0, 0, textureKey);

    avatar.setDisplaySize(60, 60);

    // MASK BULAT
    const maskGraphics = this.make.graphics({}, false);

    maskGraphics.fillStyle(0xffffff);

    maskGraphics.fillCircle(30, 30, 30);

    const mask = maskGraphics.createGeometryMask();

    avatar.setMask(mask);

    // BORDER BULAT
    const border = this.add.circle(0, 0, 32);

    border.setStrokeStyle(4, 0xffffff);

    // USERNAME
    const label = this.add
      .text(0, -60, name, {
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: {
          x: 8,
          y: 4,
        },
      })
      .setOrigin(0.5);

    container.add([avatar, border, label]);

    // PHYSICS KE CONTAINER
    this.physics.world.enable(container);

    container.body.setCircle(30);

    // FIX FLOATING
    container.body.offset.x = -30;
    container.body.offset.y = -30;

    container.body.setBounce(0.2);

    container.body.setCollideWorldBounds(true);

    container.body.setVelocityX(Phaser.Math.Between(-250, 250));

    this.physics.add.collider(container, this.platform);

    container.label = label;

    container.username = name;

    this.players.push(container);
  }

  killPlayer(player) {
    if (!player.active) return;

    // EFFECT
    this.cameras.main.shake(150, 0.003);

    const effect = this.add.circle(player.x, player.y, 40, 0xff0000, 0.6);

    this.time.delayedCall(300, () => {
      effect.destroy();
    });

    player.label.destroy();
    player.destroy();

    this.players = this.players.filter((p) => p !== player);

    this.checkWinner();
  }

  checkWinner() {
    this.aliveText.setText(`ALIVE: ${this.players.length}`);

    // BELUM MULAI
    if (!this.matchStarted) return;

    if (this.players.length === 1 && !this.isGameOver) {
      this.isGameOver = true;

      const winner = this.players[0]?.username || "UNKNOWN";

      if (!this.leaderboard[winner]) {
        this.leaderboard[winner] = 0;
      }

      this.leaderboard[winner] += 1;

      this.updateLeaderboard();

      this.winnerText.setText(`${winner}\nWINS!`);

      this.tweens.add({
        targets: this.winnerText,
        scale: 1.2,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });

      this.time.delayedCall(5000, () => {
        // this.scene.restart();
        this.resetRound();
      });
    }
  }

  resetRound() {
    this.obstacles.forEach((obstacle) => {
      obstacle.destroy();
    });

    this.obstacles = [];

    // DESTROY PLAYER
    this.players.forEach((player) => {
      player.label.destroy();
      player.destroy();
    });

    this.players = [];

    // RESET STATE
    this.matchStarted = false;
    this.gameStarted = false;
    this.isGameOver = false;

    // RESET UI
    this.winnerText.setText("");

    // RESET PLATFORM
    this.platformWidth = 850;

    this.platformDirection = 1;

    this.platformSpeed = 2;

    this.platform.x = 540;

    this.platform.body.updateFromGameObject();

    this.updatePlatform();

    // RESET TIMER
    if (this.lobbyTimer) {
      this.lobbyTimer.remove();
      this.lobbyTimer = null;
    }

    // RESET COUNTDOWN
    this.lobbyCountdown = 10;

    // START NEXT LOBBY
    if (this.waitingPlayers.length >= 2) {
      this.startLobbyCountdown();
    }

    this.updateLobbyText();
  }

  update() {
    if (this.isGameOver) return;

    if (this.matchStarted) {
      this.platform.x += this.platformSpeed * this.platformDirection;

      // BATAS KIRI
      if (this.platform.x <= 300) {
        this.platformDirection = 1;
      }

      // BATAS KANAN
      if (this.platform.x >= 780) {
        this.platformDirection = -1;
      }

      this.platform.body.updateFromGameObject();
    }

    this.players.forEach((player) => {
      if (!player.active) return;

      // RANDOM JUMP
      if (player.body.blocked.down && Math.random() < 0.005) {
        player.body.setVelocityY(-500);
      }

      // RANDOM MOVE
      if (Math.random() < 0.01) {
        player.body.setVelocityX(Phaser.Math.Between(-120, 120));
      }

      // FALL DEATH
      if (player.y >= 1100) {
        this.killPlayer(player);
      }
    });
  }
}
