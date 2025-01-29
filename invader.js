const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1200;
canvas.height = 800;

let score = 0;
let gameOver = false;
let killedCount = 0;
let powerLevel = 0;
let stage = 1;

// UFO
const ufo = {
    x: -50,
    y: 20,
    width: 60,
    height: 30,
    speed: 3,
    active: false,
    lastSpawnTime: 0,
    spawnInterval: 15000,
    health: 3
};

// 防御壁
const barriers = [];
const BARRIER_COUNT = 4;
function createBarriers() {
    barriers.length = 0;
    const spacing = canvas.width / (BARRIER_COUNT + 1);
    for (let i = 0; i < BARRIER_COUNT; i++) {
        barriers.push({
            x: spacing * (i + 1) - 40,
            y: canvas.height - 150,
            width: 80,
            height: 60,
            health: 6
        });
    }
}

const player = {
    x: canvas.width / 2 - 40,
    y: canvas.height - 80,
    width: 80,
    height: 40,
    speed: 8,
    dx: 0,
    lives: 3
};

function getInvaderCounts(stage) {
    const baseCols = 15;
    const baseRows = 8;
    const maxCols = 20;
    const maxRows = 12;
    
    return {
        cols: Math.min(baseCols + Math.floor((stage - 1) / 2), maxCols),
        rows: Math.min(baseRows + Math.floor((stage - 1) / 3), maxRows)
    };
}

const invader = {
    x: 50,
    y: 50,
    width: 40,
    height: 40,
    numCols: 15,
    numRows: 8,
    direction: 1,
    speed: 1,
    moveInterval: 1000,
    lastMoveTime: 0,
    shootInterval: 300,
    lastShootTime: 0,
    invaders: []
};

const bullets = [];
const enemyBullets = [];
const BULLET_SPEED = 10;
const MAX_BULLETS = 3;

// 敵の種類
const ENEMY_TYPES = {
    NORMAL: { baseHealth: 1, points: 100, color: '#ff0000' },
    ARMORED: { baseHealth: 3, points: 300, color: '#00ffff' },
    BOSS: { baseHealth: 10, points: 1000, color: '#ff00ff' },
    SPLITTER: { baseHealth: 2, points: 200, color: '#ffff00' }
};

function getEnemyHealth(type, stage) {
    return ENEMY_TYPES[type].baseHealth + Math.floor((stage - 1) / 2);
}

function createBullet(angle = 0) {
    const width = Math.min(8 + powerLevel * 2, 40);
    return {
        x: player.x + player.width/2 - width/2,
        y: player.y,
        width: width,
        height: 20,
        speed: BULLET_SPEED + Math.min(powerLevel, 10),
        dx: Math.sin(angle) * (BULLET_SPEED + Math.min(powerLevel, 10)) * 0.5,
        damage: 1 + Math.floor(powerLevel / 5)
    };
}

function createEnemyBullet(x, y) {
    return {
        x: x + invader.width/2,
        y: y + invader.height,
        width: 6,
        height: 15,
        speed: 2 + Math.floor(stage/2)
    };
}

function createSplitEnemies(x, y) {
    const health = getEnemyHealth('NORMAL', stage);
    return [
        {
            x: x - 20,
            y: y,
            width: invader.width * 0.6,
            height: invader.height * 0.6,
            health: health,
            maxHealth: health,
            type: 'NORMAL',
            alive: true
        },
        {
            x: x + 20,
            y: y,
            width: invader.width * 0.6,
            height: invader.height * 0.6,
            health: health,
            maxHealth: health,
            type: 'NORMAL',
            alive: true
        }
    ];
}

function createInvaders() {
    invader.invaders = [];
    const counts = getInvaderCounts(stage);
    invader.numCols = counts.cols;
    invader.numRows = counts.rows;
    
    for (let row = 0; row < invader.numRows; row++) {
        for (let col = 0; col < invader.numCols; col++) {
            let type = 'NORMAL';
            if (row === 0) type = 'ARMORED';
            else if (row === invader.numRows - 1) type = 'SPLITTER';
            else if (row === Math.floor(invader.numRows/2) && 
                     col === Math.floor(invader.numCols/2)) type = 'BOSS';
            
            const health = getEnemyHealth(type, stage);
            invader.invaders.push({
                x: invader.x + col * (invader.width + 20),
                y: invader.y + row * (invader.height + 20),
                width: invader.width,
                height: invader.height,
                health: health,
                maxHealth: health,
                type: type,
                alive: true
            });
        }
    }
    invader.moveInterval = Math.max(1000 - (stage - 1) * 100, 400);
    invader.shootInterval = Math.max(800 - (stage - 1) * 30, 300);
}

function drawHealthBar(x, y, width, health, maxHealth) {
    const barWidth = width;
    const barHeight = 4;
    const healthPercent = health / maxHealth;
    
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y - barHeight - 2, barWidth, barHeight);
    
    ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : 
                   healthPercent > 0.25 ? '#ffff00' : '#ff0000';
    ctx.fillRect(x, y - barHeight - 2, barWidth * healthPercent, barHeight);
}

function drawBarrier(barrier) {
    const healthPercent = barrier.health / 6;
    const color = healthPercent > 0.75 ? '#00ff00' :
                 healthPercent > 0.5 ? '#88ff00' :
                 healthPercent > 0.25 ? '#ffff00' :
                 '#ff8800';
    ctx.fillStyle = color;
    ctx.fillRect(barrier.x, barrier.y, barrier.width, barrier.height);
}

function drawUfo() {
    if (!ufo.active) return;
    
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.ellipse(ufo.x + ufo.width/2, ufo.y + ufo.height/2, 
                ufo.width/2, ufo.height/2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    drawHealthBar(ufo.x, ufo.y, ufo.width, ufo.health, 3);
}

function drawPlayer() {
    if (player.lives <= 0) return;
    
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(player.x, player.y + player.height - 15, player.width, 15);
    ctx.beginPath();
    ctx.moveTo(player.x + player.width/2, player.y);
    ctx.lineTo(player.x + player.width, player.y + player.height - 15);
    ctx.lineTo(player.x, player.y + player.height - 15);
    ctx.closePath();
    ctx.fill();
}

function drawInvaderSprite(inv) {
    ctx.fillStyle = ENEMY_TYPES[inv.type].color;
    
    if (inv.type === 'BOSS') {
        // ボス型の描画
        ctx.fillRect(inv.x + 10, inv.y + 10, inv.width - 20, inv.height - 20);
        ctx.fillRect(inv.x, inv.y + 10, 10, inv.height - 20);
        ctx.fillRect(inv.x + inv.width - 10, inv.y + 10, 10, inv.height - 20);
        ctx.fillRect(inv.x + 10, inv.y, inv.width - 20, 10);
        ctx.fillRect(inv.x + 10, inv.y + inv.height - 10, inv.width - 20, 10);
    } else {
        // 通常の敵の描画
        ctx.fillRect(inv.x + 8, inv.y + 8, 24, 24);
        ctx.fillRect(inv.x, inv.y + 8, 8, 8);
        ctx.fillRect(inv.x + 32, inv.y + 8, 8, 8);
        ctx.fillRect(inv.x + 8, inv.y, 8, 8);
        ctx.fillRect(inv.x + 24, inv.y, 8, 8);
        ctx.fillRect(inv.x + 8, inv.y + 32, 8, 8);
        ctx.fillRect(inv.x + 24, inv.y + 32, 8, 8);
    }
    
    if (inv.health < inv.maxHealth) {
        drawHealthBar(inv.x, inv.y, inv.width, inv.health, inv.maxHealth);
    }
}

function drawInvaders() {
    invader.invaders.forEach(inv => {
        if (inv.alive) {
            drawInvaderSprite(inv);
        }
    });
}

function drawBullets() {
    // プレイヤーの弾
    bullets.forEach(bullet => {
        const gradient = ctx.createLinearGradient(
            bullet.x, bullet.y, 
            bullet.x + bullet.width, bullet.y + bullet.height
        );
        gradient.addColorStop(0, '#ffff00');
        gradient.addColorStop(1, '#ff0000');
        ctx.fillStyle = gradient;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    // 敵の弾
    ctx.fillStyle = '#ff0000';
    enemyBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function drawScore() {
    ctx.fillStyle = '#00ff00';
    ctx.font = '24px monospace';
    ctx.fillText('SCORE: ' + score.toString().padStart(6, '0'), 10, 30);
    ctx.fillText('STAGE: ' + stage, 10, 60);
    ctx.fillText('LIVES: ' + '♥'.repeat(player.lives), 10, 90);
    ctx.fillText('POWER: ' + powerLevel + '/20', 10, 120);
}

function drawGameOver() {
    ctx.fillStyle = '#00ff00';
    ctx.font = '64px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
    ctx.font = '32px monospace';
    ctx.fillText('STAGE: ' + stage, canvas.width/2, canvas.height/2 + 50);
    ctx.fillText('SCORE: ' + score.toString().padStart(6, '0'), canvas.width/2, canvas.height/2 + 90);
    ctx.fillText('PRESS R TO RESTART', canvas.width/2, canvas.height/2 + 130);
    ctx.textAlign = 'left';
}

function moveUfo(currentTime) {
    if (!ufo.active) {
        if (!ufo.lastSpawnTime) ufo.lastSpawnTime = currentTime;
        if (currentTime - ufo.lastSpawnTime > ufo.spawnInterval) {
            ufo.active = true;
            ufo.x = -50;
            ufo.health = 3;
            ufo.lastSpawnTime = currentTime;
        }
        return;
    }
    
    ufo.x += ufo.speed;
    if (ufo.x > canvas.width + 50) {
        ufo.active = false;
    }
}

function movePlayer() {
    if (gameOver) return;
    
    player.x += player.dx;
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }
}

function moveInvaders(currentTime) {
    if (gameOver) return;
    
    if (!invader.lastMoveTime) {
        invader.lastMoveTime = currentTime;
    }

    const deltaTime = currentTime - invader.lastMoveTime;
    if (deltaTime > invader.moveInterval) {
        invader.lastMoveTime = currentTime;

        let edgeReached = false;
        let maxX = 0;
        let minX = canvas.width;

        invader.invaders.forEach(inv => {
            if (inv.alive) {
                maxX = Math.max(maxX, inv.x + inv.width);
                minX = Math.min(minX, inv.x);
            }
        });

        if (invader.direction === 1 && maxX + invader.speed > canvas.width - 20) {
            edgeReached = true;
        } else if (invader.direction === -1 && minX - invader.speed < 20) {
            edgeReached = true;
        }

        invader.invaders.forEach(inv => {
            if (inv.alive) {
                if (edgeReached) {
                    inv.y += invader.height/2;
                } else {
                    inv.x += invader.speed * invader.direction;
                }
            }
        });

        if (edgeReached) {
            invader.direction *= -1;
        }
    }
    
    // 攻撃処理
    if (!invader.lastShootTime) {
        invader.lastShootTime = currentTime;
    }
    
    if (currentTime - invader.lastShootTime > invader.shootInterval) {
        invader.lastShootTime = currentTime;
        
        const aliveInvaders = invader.invaders.filter(inv => inv.alive);
        if (aliveInvaders.length > 0) {
            const numShooters = Math.min(1 + Math.floor(stage/3), 4);
            for (let i = 0; i < numShooters; i++) {
                const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
                enemyBullets.push(createEnemyBullet(shooter.x, shooter.y));
            }
        }
    }
}

function moveBullets() {
    if (gameOver) return;
    
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        bullets[i].x += bullets[i].dx || 0;
        if (bullets[i].y < 0) {
            bullets.splice(i, 1);
        }
    }
    
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].y += enemyBullets[i].speed;
        if (enemyBullets[i].y > canvas.height) {
            enemyBullets.splice(i, 1);
        }
    }
}

function playerShoot() {
    if (gameOver || player.lives <= 0) return;
    
    if (bullets.length < MAX_BULLETS) {
        if (powerLevel >= 16) {
            // 8方向発射
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI / 4);
                bullets.push(createBullet(angle));
            }
        } else if (powerLevel >= 11) {
            // 5方向発射
            bullets.push(createBullet(0));
            bullets.push(createBullet(Math.PI / 6));
            bullets.push(createBullet(-Math.PI / 6));
            bullets.push(createBullet(Math.PI / 3));
            bullets.push(createBullet(-Math.PI / 3));
        } else if (powerLevel >= 6) {
            // 3方向発射
            bullets.push(createBullet(0));
            bullets.push(createBullet(Math.PI / 6));
            bullets.push(createBullet(-Math.PI / 6));
        } else {
            bullets.push(createBullet());
        }
    }
}

function checkCollision() {
    if (player.lives <= 0) return;
    
    // プレイヤーの弾とUFOの衝突
    if (ufo.active) {
        for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
            const bullet = bullets[bulletIndex];
            if (bullet.x < ufo.x + ufo.width &&
                bullet.x + bullet.width > ufo.x &&
                bullet.y < ufo.y + ufo.height &&
                bullet.y + bullet.height > ufo.y) {
                ufo.health--;
                bullets.splice(bulletIndex, 1);
                
                if (ufo.health <= 0) {
                    ufo.active = false;
                    player.lives = Math.min(player.lives + 1, 3);
                    score += 2000;
                }
            }
        }
    }
    
    // プレイヤーの弾とインベーダーの衝突
    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = bullets[bulletIndex];
        let hitInThisFrame = false;
        
        for (let inv of invader.invaders) {
            if (inv.alive) {
                if (bullet.x < inv.x + inv.width &&
                    bullet.x + bullet.width > inv.x &&
                    bullet.y < inv.y + inv.height &&
                    bullet.y + bullet.height > inv.y) {
                    inv.health -= bullet.damage;
                    hitInThisFrame = true;
                    
                    if (inv.health <= 0) {
                        inv.alive = false;
                        score += ENEMY_TYPES[inv.type].points * stage;
                        killedCount++;
                        
                        if (killedCount % 3 === 0) {
                            powerLevel = Math.min(powerLevel + 1, 20);
                        }
                        
                        // 分裂タイプの処理
                        if (inv.type === 'SPLITTER') {
                            const splitEnemies = createSplitEnemies(inv.x, inv.y);
                            invader.invaders.push(...splitEnemies);
                        }
                    }
                }
            }
        }
        
        if (hitInThisFrame && powerLevel < 6) {
            bullets.splice(bulletIndex, 1);
        }
    }
    
    // 弾と防御壁の衝突
    for (let barrier of barriers) {
        // プレイヤーの弾
        for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
            const bullet = bullets[bulletIndex];
            if (bullet.x < barrier.x + barrier.width &&
                bullet.x + bullet.width > barrier.x &&
                bullet.y < barrier.y + barrier.height &&
                bullet.y + bullet.height > barrier.y) {
                barrier.health--;
                bullets.splice(bulletIndex, 1);
            }
        }
        
        // 敵の弾
        for (let bulletIndex = enemyBullets.length - 1; bulletIndex >= 0; bulletIndex--) {
            const bullet = enemyBullets[bulletIndex];
            if (bullet.x < barrier.x + barrier.width &&
                bullet.x + bullet.width > barrier.x &&
                bullet.y < barrier.y + barrier.height &&
                bullet.y + bullet.height > barrier.y) {
                barrier.health--;
                enemyBullets.splice(bulletIndex, 1);
            }
        }
    }
    
    // 敵の弾とプレイヤーの衝突
    for (let bulletIndex = enemyBullets.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = enemyBullets[bulletIndex];
        
        if (bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y) {
            player.lives--;
            enemyBullets.splice(bulletIndex, 1);
            
            if (player.lives <= 0) {
                gameOver = true;
            }
        }
    }
    
    // 壊れた防御壁を削除
    for (let i = barriers.length - 1; i >= 0; i--) {
        if (barriers[i].health <= 0) {
            barriers.splice(i, 1);
        }
    }
}

function checkGameOver() {
    for (let inv of invader.invaders) {
        if (inv.alive && inv.y + inv.height >= player.y) {
            gameOver = true;
            return;
        }
    }
    
    let allDestroyed = true;
    for (let inv of invader.invaders) {
        if (inv.alive) {
            allDestroyed = false;
            break;
        }
    }
    
    if (allDestroyed) {
        score += stage * 1000;
        stage++;
        createInvaders();
        createBarriers();
    }
}

function updateGameArea() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameOver) {
        drawGameOver();
        return;
    }
    
    barriers.forEach(drawBarrier);
    drawUfo();
    drawPlayer();
    drawInvaders();
    drawBullets();
    drawScore();
    movePlayer();
    moveBullets();
    checkCollision();
    checkGameOver();
}

function gameLoop(timestamp) {
    moveUfo(timestamp);
    moveInvaders(timestamp);
    updateGameArea();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        player.dx = -player.speed;
    } else if (e.key === 'ArrowRight') {
        player.dx = player.speed;
    } else if (e.key === ' ') {
        playerShoot();
    } else if (e.key === 'r' && gameOver) {
        gameOver = false;
        score = 0;
        killedCount = 0;
        powerLevel = 0;
        stage = 1;
        player.lives = 3;
        bullets.length = 0;
        enemyBullets.length = 0;
        createInvaders();
        createBarriers();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        player.dx = 0;
    }
});

createInvaders();
createBarriers();
gameLoop();
