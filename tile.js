const X_COUNT = 100;
const Y_COUNT = 100;
const X_RES = 1000;
const Y_RES = 1000;
const SEED = 8;
const EMPTY_OBJ = {};
const MAX_PROPAGATE_DISTANCE = 1000;
const IMAGE_PATH = 'patterns/Skyline 2.png'
const TILE_SIZE = 2;

function mulberry32(a) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

const rnd = mulberry32(SEED);


function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(rnd() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

function randomChoice(array) {
    return array[Math.floor(rnd() * array.length)];
}


const selectKeyFromWeighted = (weights) => {
    // Calculate the sum of the weights
    let totalWeight = 0;
    for (let i = 0; i < weights.length; i++) {
        totalWeight += weights[i];
    }
    // Generate a random number between 0 and the total weight
    let randomNumber = rnd() * totalWeight;
    // Loop through the keys and their weights, subtracting the weight from the random number until it reaches 0
    for (let i = 0; i < weights.length; i++) {
        randomNumber -= weights[i];
        if (randomNumber <= 0) {
            return i;
        }
    }
    return null;
}

const selectRareKey = weights => {
    return selectKeyFromWeighted(weights.map(i => 1/i))
}

const sumCommon = (weightArray) => {
    const result = new Float32Array(weightArray[0].length);
    for(let i=0;i<weightArray[0].length;i++) {
        let sum = 0, include = true;
        for(let j=0;j<weightArray.length;j++) {
            if(!weightArray[j][i]) {
                include = false;
            }
            sum += weightArray[j][i];
        }
        if(include) {
            result[i] = sum;
        }
    }
    return result;
}

function setWeightAndZeroIfNeeded(primary, newArray) {
    for (let i=0;i<primary.length;i++) {
        if(primary[i] && newArray[i]) {
            primary[i] += newArray[i];
        }
        else {
            primary[i]=0;
        }
    }
    return primary;

}

const addWeights = (w1, w2) => {
    for (let i=0;i<w1.length;i++) {
        w1[i] += w2[i];
    }
    return w1;
}

const normalize = (w1) => {
    let sum =0;
    for(let i=0; i < w1.length; i++) {
        sum += w1[i]
    }
    if(sum === 0) {
        return false;
    }
    for(let i=0; i < w1.length; i++) {
        w1[i] = w1[i]/sum;
    }
    return w1;
}

function areWeightsDifferent(w1, w2) {
    for(let i=0; i < w1.length; i++) {
        if(w1[i] !== w2[i]) {
            return true;
        }
    }
    return false;
}


class Cell {
    possibleTiles = {};
    collapsed = false;
    tile = null;

    constructor(x, y, possibleTiles, queueDrawTile) {
        this.x = x;
        this.y = y;
        this.possibleTiles = possibleTiles;
        this._queueDrawTile = queueDrawTile;
    }

    entropy = () => {
        if (this._entropy) {
            return this._entropy;
        }
        const sum = this.possibleTiles.reduce((sum, k) => sum + k, 0);
        const probabilities = this.possibleTiles;
        let entropy = 0;
        for (let i = 0; i < probabilities.length; i++) {
            if (probabilities[i] !== 0) {
                entropy -= (probabilities[i] / sum) * Math.log2(probabilities[i] / sum);
            }
        }
        this._entropy = entropy;
        return entropy;
    }

    update = (newWeights) => {
        const change = areWeightsDifferent(this.possibleTiles, newWeights);
        this.possibleTiles = newWeights;
        this.collapsed = this.collapsed || this.possibleTiles.filter(x => x>0).length === 1;
        if (change && this.collapsed) {
            this.setTile(this.possibleTiles.findIndex(x => x > 0));
        }
        if (change) {
            this._entropy = null;
            this._queueDrawTile(this);
        }
        return change;
    }

    setTile = (id) => {
        this.possibleTiles = new Float32Array(this.possibleTiles.length);
        this.possibleTiles[id] = 1;
        this.id = id;
    }

    observe = (pickRare = false) => {
        const newTile = pickRare ? selectRareKey(this.possibleTiles) : selectKeyFromWeighted(this.possibleTiles);
        if (newTile !== null) {
            this.collapsed = true;
            this.setTile(newTile);
        } else {
            return false;
        }
        this._queueDrawTile(this);
        return true;
    }

}

class World {
    model = null;
    grid = [];
    tick = 0;
    constructor(model,ctx) {
        this.ctx = ctx;
        this.model = model;
        for (let i = 0; i < X_COUNT; i++) {
            for (let j = 0; j < Y_COUNT; j++) {
                if (!this.grid[i]) {
                    this.grid[i] = [];
                }
                this.grid[i][j] = new Cell(i, j, model.baseWeights, this.queueDrawTile);
            }
        }

    }

    draw(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        for (let i = 0; i < X_COUNT; i++) {
            for (let j = 0; j < Y_COUNT; j++) {
                if (this.grid[i][j].collapsed) {
                    const width = ctx.canvas.width / X_COUNT;
                    const x = width * i;
                    const height = ctx.canvas.height / Y_COUNT;
                    const y = width * j;
                    ctx.fillStyle = this.grid[i][j].colour;
                    // ctx.drawImage(this.model. x, y, width, height);
                    ctx.strokeStyle = "#ffffff";
                    ctx.strokeRect(x, y, width, height);
                } else {
                    const width = ctx.canvas.width / X_COUNT;
                    const x = width * i;
                    const height = ctx.canvas.height / Y_COUNT;
                    const y = width * j;
                    ctx.fillStyle = "#000000";
                    ctx.font = `${width / 2}px serif`;
                    ctx.fillText(Object.keys(this.grid[i][j].possibleTiles).length, x + width / 2, y + height / 2);
                }
            }
        }
    }

    queue = [];

    queueDrawTile = (cell) => {
        if(!this.queue.find(x => x === cell)) {
            this.queue.push(cell);
        }
    }

    delayedDraw() {
        this.queue.map( cell => this.drawTile(cell));
        this.queue = [];
    }

    async drawTile(cell) {
        const height = (this.ctx.canvas.height / Y_COUNT) | 0;
        const width = (this.ctx.canvas.width / X_COUNT) | 0;
        const x_coord = width * cell.x;
        const y_coord = height * cell.y;
        this.ctx.clearRect(x_coord, y_coord, width, height);
        if (cell.collapsed) {
            await this.ctx.drawImage(this.model.tileStore[cell.id], x_coord, y_coord, width, height);
        } else {
            const ratio = (cell.possibleTiles.filter(x=>x>0).length / cell.possibleTiles.length) * 255;
            this.ctx.fillStyle = `rgb(${ratio},${ratio},${ratio})`;
            //ctx.font = `${width/3}px serif`;
            //ctx.fillText(Object.keys(this.grid[i][j].possibleTiles).length, x + width/2, y+height/2);
            //ctx.strokeStyle = "#000000";
            this.ctx.fillRect(x_coord, y_coord, width, height);
        }
    }

    pick() {
        const sortedGrid = this.grid
            .flat()
            .filter(a => !a.collapsed)
            .sort((a, b) => a.entropy() - b.entropy());
        if (sortedGrid.length === 0) {
            return false;
        }
        const lowestEntropy = sortedGrid[0].entropy();
        const lowestEntropyGrid = sortedGrid.filter(s => s.entropy() === lowestEntropy);
        return lowestEntropyGrid[Math.floor(rnd() * lowestEntropyGrid.length)];
    }

    async collapse(pickRare) {
        const pick = this.pick();
        if (!pick) {
            return false;
        }
        // collapse our pick
        if (!pick.observe(pickRare)) {
            // must backtract
            return false;
        }
        const stack = [pick];
        while (stack.length) {
            const item = stack.shift();
            if (item !== pick && Math.sqrt(Math.pow(item.x - pick.x, 2) + Math.pow(item.y - pick.y, 2)) > MAX_PROPAGATE_DISTANCE) {
                continue;
            }
            // for every grid item around the pick
            for (let i of [item.x - 1, item.x + 1]) {
                await this.traverse(stack, i, item.y)
            }
            for (let j of [item.y - 1, item.y + 1]) {
                await this.traverse(stack, item.x, j)
            }

        }
        return true;
    }

    async traverseWorking(stack, i, j) {

        if (!this.grid[i]?.[j] || this.grid[i][j].collapsed) {
            return true;
        }
        const possibleSets = [this.grid[i][j].possibleTiles];
        for (let x of [-1, 1]) {
            let sums = new Float32Array(this.model.tileCount);
            if (!this.grid[i + x]?.[j]) {
                continue;
            }
            for (let possible=0;possible<this.grid[i + x][j].possibleTiles.length; possible++) {
                if(this.grid[i + x][j].possibleTiles[possible]) {
                    const weights = this.model.weights[possible][-x + this.model.windowRadius][1];
                    sums = addWeights(sums, weights);
                }

            }
            possibleSets.push(sums);
        }

        for (let y of [-1, 1]) {
            let sums = new Float32Array(this.model.tileCount);
            if (!this.grid[i]?.[j + y]) {
                continue;
            }
            for (let possible=0;possible<this.grid[i][j + y].possibleTiles.length;possible++) {
                if(this.grid[i][j + y].possibleTiles[possible]) {
                    const weights = this.model.weights[possible][1][-y + this.model.windowRadius];
                    sums = addWeights(sums, weights);
                }
            }
            possibleSets.push(sums);
        }
        const newProbabilities = normalize(sumCommon(possibleSets));
        if (this.grid[i][j].update(newProbabilities)) {
            //if (Object.keys(newProbabilities).length > 100) {
                // return false;
           // }
            if(stack.find(x => x === this.grid[i][j])) {
                return;
            }
            stack.push(this.grid[i][j]);
            this.tick++;
            if(this.tick % 1000 === 0) {
                await sleep(0);
            }
        }
    }

    async traverse(stack, i, j) {

        if (!this.grid[i]?.[j] || this.grid[i][j].collapsed) {
            return true;
        }

        let cleanSet = new Float32Array(this.grid[i][j].possibleTiles);

        for (let x of [-1, 1]) {
            let sums = new Float32Array(this.model.tileCount);
            if (!this.grid[i + x]?.[j]) {
                continue;
            }
            for (let possible=0;possible<this.grid[i + x][j].possibleTiles.length; possible++) {
                if(this.grid[i + x][j].possibleTiles[possible]) {
                    const weights = this.model.weights[possible][-x + this.model.windowRadius][1];
                    addWeights(sums, weights);

                }
            }
            setWeightAndZeroIfNeeded(cleanSet, sums);
        }

        for (let y of [-1, 1]) {
            let sums = new Float32Array(this.model.tileCount);
            if (!this.grid[i]?.[j + y]) {
                continue;
            }
            for (let possible=0;possible<this.grid[i][j + y].possibleTiles.length;possible++) {
                if(this.grid[i][j + y].possibleTiles[possible]) {
                    const weights = this.model.weights[possible][1][-y + this.model.windowRadius];
                    addWeights(sums, weights);
                }
            }
            setWeightAndZeroIfNeeded(cleanSet, sums);
        }
        const newProbabilities = normalize(cleanSet);
        if(!newProbabilities) {
            return;
        }
        if (this.grid[i][j].update(newProbabilities)) {
            if(stack.find(x => x === this.grid[i][j])) {
                return;
            }
            stack.push(this.grid[i][j]);
            this.tick++;
            if(this.tick % 1000 === 0) {
                await sleep(0);
            }
        }
    }
}


function createCanvas() {
    const canvas = document.createElement("canvas");
    const bound = Math.min(window.innerWidth, window.innerHeight);
    canvas.width = X_RES;
    canvas.height = Y_RES;
    canvas.style.width =`${bound}px`
    canvas.style.height = `${bound}px`
    window.document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    return ctx;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));


const getSHA256Hash = async (input) => {
    const textAsBuffer = new TextEncoder().encode(input);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", textAsBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray
        .map((item) => item.toString(36).padStart(2, "0"))
        .join("");
    return hash;
};

const generateModel = async img => {
    const cvs = document.createElement("canvas");
    const ctx = cvs.getContext("2d");
    ctx.canvas.width = img.width;
    ctx.canvas.height = img.height;
    ctx.willReadFrequently = true;
    ctx.drawImage(img, 0, 0);
    const windowRadius = 1;
    const tileSize = TILE_SIZE;
    const tiles = [];
    const tileStore = [];
    const tileMap = {};
    const tileCounts = [];
    let tileCount = 0;
    for (let x = 0; x < img.width / tileSize; x++) {
        tiles[x] = [];
        for (let y = 0; y < img.height / tileSize; y++) {
            const imageData = ctx.getImageData(x * tileSize, y * tileSize, tileSize, tileSize);
            const hash = await getSHA256Hash(imageData.data);
            if (!tileMap[hash]) {
                tileMap[hash] = tileCount++;
            }
            tileStore[tileMap[hash]] = await createImageBitmap(imageData);
            tiles[x][y] = {id: tileMap[hash]}
            tileCounts[tileMap[hash]] = (tileCounts[tileMap[hash]] || 0) + 1
        }
    }
    const totalWeight = tileCounts.reduce((acc, x) => acc + x, 0);
    const baseWeights = new Float32Array(tileCount);

    for (const i in tileCounts) {
        baseWeights[i] = tileCounts[i] / totalWeight;
    }

    const weights = [];

    const getDefaultWeights = () =>
        (new Array(windowRadius * 2 + 1).fill(0))
            .map(_ => new Array(windowRadius * 2 + 1).fill(0)
                .map(_ =>  new Float32Array(tileCount)));

    for (let x = 0; x < tiles.length; x++) {
        for (let y = 0; y < tiles[x].length; y++) {
            for (let i of [-1, 0, 1]) {
                for (let j of [-1, 0, 1]) {
                    if (tiles[x + i]?.[y + j]) {
                        const thisId = tiles[x][y].id
                        const newId = tiles[x + i][y + j].id;
                        weights[thisId] = weights[thisId] || getDefaultWeights();
                        weights[thisId][i+windowRadius][j+windowRadius][newId] =
                            (weights[tiles[x][y].id][i+windowRadius][j+windowRadius][newId] || 0) + 1/totalWeight;
                    }
                }
            }
        }
    }

    return {tileStore, tileSize, weights, baseWeights, windowRadius, tileCount}
}

async function drawTiles(model) {
    const canvas = document.createElement("canvas");
    const tileSize = 16 // model.tileSize;
    canvas.width = model.tileCount * tileSize * 2;
    canvas.height = tileSize * 2 * 2;
    canvas.style.width = tileSize * model.tileCount * 2;
    canvas.style.height = tileSize* 2 * 2;
    window.document.body.prepend(canvas);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false; // keep pixel perfect
    ctx.font = `12px serif`;
    ctx.fillStyle = '#000000';
    for(let i=0;i<model.tileStore.length; i++) {
        await ctx.fillText(`${i}`, i * tileSize * 2, tileSize * 1.5);
        const img = model.tileStore[i];
        const bitmap = await createImageBitmap(img);
        await ctx.drawImage(bitmap, i * tileSize * 2, tileSize * 2, tileSize*2,tileSize*2);
    }

}


async function init() {
    const img = await (async () => {
        const img = new Image();
        img.src = IMAGE_PATH;
        document.body.appendChild(img);
        await img.decode();
        return img;
    })();
    const model = await generateModel(img);
    await drawTiles(model)
    const ctx = createCanvas();
    const world = new World(model, ctx);
    window._ctx = ctx;
    window._world = world;

    const loop = () => {
        world.delayedDraw();
        window.requestAnimationFrame(loop)
    }
    loop();

    await world.collapse(true)
    while (true) {
        if (!await world.collapse()) {
            return;
        }
    }

}


init();

