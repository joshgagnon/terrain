const X_COUNT = 20;
const Y_COUNT = 20;
const X_RES = 1000;
const Y_RES = 1000;
const SEED = 1;

function mulberry32(a) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

const rnd = mulberry32(SEED);
function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
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


const selectKeyFromWeighted = (obj) => {
    let keys = Object.keys(obj);
    // Calculate the sum of the weights
    let totalWeight = 0;
    for (let i = 0; i < keys.length; i++) {
        totalWeight += obj[keys[i]];
    }
    // Generate a random number between 0 and the total weight
    let randomNumber = rnd() * totalWeight;
    // Loop through the keys and their weights, subtracting the weight from the random number until it reaches 0
    for (let i = 0; i < keys.length; i++) {
        randomNumber -= obj[keys[i]];
        if (randomNumber <= 0) {
            return keys[i];
        }
    }
    return null;
}

function sumCommonKeys(objs) {
    // Get an array of all the keys in the first object
    let keys = Object.keys(objs[0]);
    // Filter the keys to only include those that are present in every object
    for (let i = 1; i < objs.length; i++) {
        keys = keys.filter(key => objs[i][key]);
    }
    const result = {}
    for (let i = 0; i < objs.length; i++) {
        for (let j = 0; j < keys.length; j++) {
            if(objs[i][keys[j]]) {
                result[keys[j]] = (result[keys[j]] || 0) + objs[i][keys[j]];
            }
        }
    }

    const sum = Object.keys(result).reduce((sum, k) => sum + result[k], 0);
    for(const key in result) {
        result[key] = result[key] / sum;
    }

    return result;
}

const addWeights = (obj1, obj2) => {
    const results = {};
    for(const key in obj1) {
        results[key] = (results[key] || 0) + obj1[key];
    }
    for(const key in obj2) {
        results[key] = (results[key] || 0) + obj2[key];
    }
    return results;
}

function areWeightsDifferent(obj1, obj2) {
    // Check if the objects have a different number of properties
    if (Object.keys(obj1).length !== Object.keys(obj2).length) {
        return true;
    }
    // Loop through the properties of the first object and check if they differ in the second object
    for (let prop in obj1) {
        if (obj1[prop] !== obj2[prop]) {
            return true;
        }
    }
    // Loop through the properties of the second object and check if they differ in the first object
    for (let prop in obj2) {
        if (obj1[prop] !== obj2[prop]) {
            return true;
        }
    }
    return false
}

class Cell {
    possibleTiles = {};
    collapsed = false;
    tile = null;

    constructor(x, y, possibleTiles) {
        this.x=x;
        this.y=y;
        this.possibleTiles = possibleTiles;
    }

    entropy = () => {
        if(this._entropy) {
            return this._entropy;
        }
        const sum = Object.keys(this.possibleTiles).reduce((sum, k) => sum + this.possibleTiles[k], 0);
        const probabilities = Object.values(this.possibleTiles);
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
        this.collapsed = Object.keys(this.possibleTiles).length === 1;
        if(change && this.collapsed) {
            this.setTile(Object.keys(this.possibleTiles)[0]);
        }
        if(change) {
            this._entropy = null;
            window._world.queueDrawTile(window._ctx, this.id, this.x, this.y);
        }
        return change;
    }

    setTile = (name) => {
        this.possibleTiles = {[name]: 1};
        this.id = name;
    }

    observe = () => {
        const newTile = selectKeyFromWeighted(this.possibleTiles);
        if(newTile) {
            this.collapsed = true;
            this.setTile(newTile);
        }
        else {
            return false;
        }
        window._world.queueDrawTile(window._ctx, this.id, this.x, this.y)
        return true;
    }

}

class World {
    model = null;
    grid = [];
    constructor(model) {
        this.model = model;

        for(let i=0; i<X_COUNT; i++) {
            for(let j=0; j<Y_COUNT; j++) {
                if(!this.grid[i]) {
                    this.grid[i] = [];
                }
                this.grid[i][j] = new Cell(i, j, model.baseWeights);
            }
        }

    }
    draw(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        for(let i=0; i<X_COUNT; i++) {
            for(let j=0; j<Y_COUNT; j++) {
                if(this.grid[i][j].collapsed) {
                    const width = ctx.canvas.width / X_COUNT;
                    const x = width * i;
                    const height = ctx.canvas.height / Y_COUNT;
                    const y = width * j;
                    ctx.fillStyle = this.grid[i][j].colour;
                   // ctx.drawImage(this.model. x, y, width, height);
                    ctx.strokeStyle = "#ffffff";
                    ctx.strokeRect(x, y, width, height);
                }
                else {
                    const width = ctx.canvas.width / X_COUNT;
                    const x = width * i;
                    const height = ctx.canvas.height / Y_COUNT;
                    const y = width * j;
                    ctx.fillStyle = "#000000";
                    ctx.font = `${width/2}px serif`;
                    ctx.fillText(Object.keys(this.grid[i][j].possibleTiles).length, x + width/2, y+height/2);
                }
            }
        }
    }
    queue = [];
    queueDrawTile(...args) {
        this.queue.push(args);
    }
    delayedDraw() {
        this.queue.map(q => this.drawTile.apply(this, q));
        this.queue = [];
    }
    async drawTile(ctx, id, i, j) {
        const height = ctx.canvas.height / Y_COUNT;
        const width = ctx.canvas.width / X_COUNT;
        const x = width * i;
        const y = height * j;
        ctx.clearRect(x, y, width, height);
        if(this.grid[i][j].collapsed) {
            // now to render it bigger
            const bitmap = await createImageBitmap(this.model.tileStore[id]);
            const canvas = document.querySelector("canvas");
            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = false; // keep pixel perfect
            ctx.drawImage(bitmap, x, y, width, height);
           // ctx.putImageData(this.model.tileStore[id], x, y)
        }
        else {
            const ratio =  (Object.keys(this.grid[i][j].possibleTiles).length /Object.keys(this.model.baseWeights).length) * 255;
            ctx.fillStyle = `rgb(${ratio},${ratio},${ratio})`;
            //ctx.font = `${width/3}px serif`;
            //ctx.fillText(Object.keys(this.grid[i][j].possibleTiles).length, x + width/2, y+height/2);
            //ctx.strokeStyle = "#000000";
            ctx.fillRect(x, y, width, height);
        }
    }

    pick() {
        const sortedGrid = this.grid
            .flat()
            .filter(a => !a.collapsed)
            .sort((a, b) => a.entropy() - b.entropy());

        if(sortedGrid.length === 0) {
            return false;
        }
        const lowestEntropy = sortedGrid[0].entropy();
        const lowestEntropyGrid = sortedGrid.filter(s => s.entropy() === lowestEntropy);
        return lowestEntropyGrid[Math.floor(rnd() * lowestEntropyGrid.length)];
    }

    async collapse() {
        const pick = this.pick();
        if(!pick) {
            return false;
        }
        // collapse our pick
        if(!pick.observe()) {
            // must backtract
            return false;
        }
        const stack = [pick];
        while(stack.length) {
            const item = stack.pop();
            // for every grid item around the pick
            for (let i of [item.x-1, item.x+1]) {
                await this.traverse(stack, item, i, item.y)
            }
            for (let j of [item.y-1,  item.y+1]) {
                await this.traverse(stack, item, item.x, j)
            }

        }
        await sleep(0);
        return true;
    }

    async traverse(stack, item, i, j) {
        if(!this.grid[i]?.[j] || this.grid[i][j].collapsed) {
            return true;
        }
        const possibleSets = [];
        for(let x of [-1,1]) {
            let sums = {}
            if(!this.grid[i+x]?.[j]) {
                continue;
            }
            for(const possible in this.grid[i+x][j].possibleTiles) {
                const weights = this.model.weights[possible][-x][0];
                sums = addWeights(sums, weights);
            }
            possibleSets.push(sums);
        }

        for(let y of [-1, 1]) {
            let sums = {}
            if(!this.grid[i]?.[j+y]) {
                continue;
            }
            for(const possible in this.grid[i][j+y].possibleTiles) {
                const weights = this.model.weights[possible][0][-y];
                sums = addWeights(sums, weights);
            }
            possibleSets.push(sums);
        }
        const newProbabilities = sumCommonKeys(possibleSets);

        if(!Object.keys(newProbabilities).length) {
            return false;
        }
        if(this.grid[i][j].update(newProbabilities)) {
            stack.push(this.grid[i][j]);
            await sleep(0);
        }
    }
}



function createCanvas() {
    const canvas = document.createElement("canvas");
    const bound = Math.min(window.innerWidth, window.innerHeight);
    canvas.width = X_RES;
    canvas.height = Y_RES;
    canvas.style.width = bound;
    canvas.style.height =  bound;
    window.document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
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
    ctx.canvas.width=img.width;
    ctx.canvas.height=img.height;
    ctx.drawImage(img, 0,0);

    const tileSize = 16;
    const tiles = [];
    const baseWeights = {};
    const tileStore = {};
    for(let x = 0; x < img.width / tileSize; x++) {
        tiles[x] = [];
        for(let y = 0; y < img.height / tileSize; y++) {
            //ctx.drawImage(img, x * tileSize, y * tileSize, tileSize, tileSize, 0, 0, tileSize, tileSize);
            const imageData = ctx.getImageData(x *tileSize,y*tileSize, tileSize, tileSize);
            const id = await getSHA256Hash(imageData.data);
            tileStore[id] = imageData;
            tiles[x][y] = {id}
            baseWeights[id] = (baseWeights[id] || 0) + 1
        }
    }
    const totalWeight = Object.keys(baseWeights).reduce((acc, x) => acc + baseWeights[x], 0);
    for(const k in baseWeights) {
        baseWeights[k] = baseWeights[k] / totalWeight;
    }
    const weights = {};

    const getDefaultWeights = () => ({
        '-1': {'-1': {}, '0': {}, '1': {}},
        '0': {'-1': {},'0': {}, '1': {}},
        '1': {'-1': {},'0': {}, '1': {}},
    });

    for(let x = 0; x < tiles.length; x++) {
        for(let y =0; y < tiles[x].length; y++) {
            for(let i of [-1, 0, 1]) {
                for(let j of [-1, 0, 1]) {
                    if(tiles[x+i]?.[y+j]) {
                        const newId = tiles[x+i][y+j].id;
                        weights[tiles[x][y].id] = weights[tiles[x][y].id] || getDefaultWeights();
                        weights[tiles[x][y].id][i][j][newId] = (weights[tiles[x][y].id][i][j][newId] || 0) + 1;
                    }
                }
            }
        }
    }
    return {tiles, tileStore, tileSize, weights, baseWeights }
}

async function init() {
    const img = await (async () => {
        const img = new Image();
        img.src = "platform.png";
        document.body.appendChild(img);
        await img.decode();
        return img;
    })();
    const model = await generateModel(img);
    const ctx = createCanvas();
    const world = new World(model);
    window._ctx =ctx;
    window._world = world;

    const loop = () => {
        world.delayedDraw();
        window.requestAnimationFrame(loop)
    }
    loop();
    while(true) {
        if(!await world.collapse()) {
            return;
        }
    }

}


init();

