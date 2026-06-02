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

    this.platformWidth = 850;

    this.obstacles = [];

    this.matchStarted = false;

    this.lobbyCountdown = 3;

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

    this.load.start();

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

    this.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => {
        if (!this.matchStarted) return;
        if (this.isGameOver) return;

        const eventType = Phaser.Math.Between(1, 4);

        switch (eventType) {
          case 1:
            this.triggerChaosMode();
            break;

          case 2:
            this.triggerJumpParty();
            break;

          case 3:
            this.triggerMeteorRain();
            break;

          case 4:
            this.triggerSpeedPlatform();
            break;
        }
      },
    });

    this.createBotLobby();
    this.startLobbyCountdown();
    this.checkWinner();
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

  triggerChaosMode() {
    this.showEvent("🔥 CHAOS MODE 🔥");

    this.cameras.main.shake(800, 0.01);

    // hujan obstacle
    for (let i = 0; i < 15; i++) {
      this.time.delayedCall(i * 150, () => {
        this.spawnObstacle();
      });
    }

    // semua bot loncat
    this.players.forEach((player) => {
      if (!player.active) return;

      player.body.setVelocityY(Phaser.Math.Between(-700, -500));
    });
  }

  triggerJumpParty() {
    this.showEvent("🦘 JUMP PARTY");

    this.players.forEach((player) => {
      if (player.active) {
        player.body.setVelocityY(-800);
      }
    });
  }

  triggerMeteorRain() {
    this.showEvent("☄️ METEOR RAIN");

    for (let i = 0; i < 30; i++) {
      this.time.delayedCall(i * 100, () => {
        this.spawnObstacle();
      });
    }
  }

  triggerSpeedPlatform() {
    this.showEvent("⚡ SPEED PLATFORM");

    this.platformSpeed = 6;

    this.time.delayedCall(5000, () => {
      this.platformSpeed = 2;
    });
  }

  createBotLobby() {
    this.waitingPlayers = [];

    for (let i = 0; i < this.maxPlayers; i++) {
      let randomName =
        this.botNames[Phaser.Math.Between(0, this.botNames.length - 1)];

      const photo = `https://api.dicebear.com/7.x/adventurer/png?seed=${randomName}`;

      this.waitingPlayers.push({
        name: randomName,
        photo,
        isBot: true,
      });
    }
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

    this.lobbyText.setText(
      `BATTLE

PLAYERS: ${this.waitingPlayers.length}

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

  startLobbyCountdown() {
    this.lobbyCountdown = 3;

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

    this.players.forEach((player) => {
      player.label.destroy();
      player.destroy();
    });

    this.players = [];

    this.matchStarted = false;
    this.gameStarted = false;
    this.isGameOver = false;

    this.winnerText.setText("");

    this.platformWidth = 850;
    this.platformDirection = 1;
    this.platformSpeed = 2;

    this.platform.x = 540;
    this.platform.body.updateFromGameObject();

    this.updatePlatform();

    if (this.lobbyTimer) {
      this.lobbyTimer.remove();
      this.lobbyTimer = null;
    }

    this.lobbyCountdown = 3;

    // BOT BARU SETIAP ROUND
    this.createBotLobby();

    this.startLobbyCountdown();

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

      if (player.body.blocked.down && Math.random() < 0.02) {
        player.body.setVelocityY(-550);
      }

      if (player.y >= 1100) {
        this.killPlayer(player);
      }
    });
  }
}
