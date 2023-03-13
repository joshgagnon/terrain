const X_COUNT = 25;
const Y_COUNT = 25;
const X_RES = 1000;
const Y_RES = 1000;
const SEED = 0;

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
    return result;
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
        const sum = Object.keys(this.possibleTiles).reduce((sum, k) => sum + this.possibleTiles[k], 0);
        const probabilities = Object.values(this.possibleTiles);
        let entropy = 0;
        for (let i = 0; i < probabilities.length; i++) {
            if (probabilities[i] !== 0) {
                entropy -= (probabilities[i] / sum) * Math.log2(probabilities[i] / sum);
            }
        }
        return entropy;
    }

    update = (newWeights) => {
        const change = areWeightsDifferent(this.possibleTiles, newWeights);
        this.possibleTiles = newWeights;
        this.collapsed = this.entropy() === 1;
        if(this.collapsed) {
            this.tile = new TILE_MAP[Object.keys(this.possibleTiles)[0]];
        }
        return change;
    }

    observe = () => {
        const newTile = selectKeyFromWeighted(this.possibleTiles);
        this.tile = new TILE_MAP[newTile];
        this.possibleTiles = {[newTile]: 1};
        this.collapsed = true;
    }

    getPossibilities = (direction) => {
        const weights = Object.keys(this.possibleTiles).reduce((acc, tileType) => {
            return addWeights(acc, TILE_MAP[tileType][direction]);
        }, {});
        return weights;
    }

    getAbovePossibilities = () => {
        return this.getPossibilities('above');
    }

    getRightPossibilities = () => {
        return this.getPossibilities('right');
    }

    getBelowPossibilities = () => {
        return this.getPossibilities('below');
    }

    getLeftPossibilities = () => {
        return this.getPossibilities('left');
    }
}


const TILE_TYPES = {
    UNKNOWN: 'UNKNOWN',
    FOREST: 'FOREST',
    PLAIN: 'PLAIN',
    HILL: 'HILL',
    MOUNTAIN: 'MOUNTAIN',
    LAKE: 'LAKE',
    DESERT: 'DESERT',
    SWAMP: 'SWAMP',
    OCEAN: 'OCEAN',
    SEA: 'SEA',
    COAST: 'COAST',
    RIVER: 'RIVER',
  //  SAND: 'SAND',
}

const VALID_TILE_TYPES = {
    FOREST: 'FOREST',
    PLAIN: 'PLAIN',
    HILL: 'HILL',
    MOUNTAIN: 'MOUNTAIN',
    LAKE: 'LAKE',
    DESERT: 'DESERT',
    SWAMP: 'SWAMP',
    OCEAN: 'OCEAN',
    SEA: 'SEA',
    COAST: 'COAST',
    RIVER: 'RIVER',
    //  SAND: 'SAND',
}

const DEFAULT_WEIGHTS = Object.keys(VALID_TILE_TYPES).reduce((acc, key) => ({...acc, [key]: 1}),{});

class BaseTile {
    tileType = TILE_TYPES.UNKNOWN;
    static above = DEFAULT_WEIGHTS;
    static right = DEFAULT_WEIGHTS;
    static below = DEFAULT_WEIGHTS;
    static left = DEFAULT_WEIGHTS;
}

class Forest extends BaseTile {
    tileType = TILE_TYPES.FOREST
    colour = '#009900';
    static above = {[TILE_TYPES.FOREST]: 1, [TILE_TYPES.PLAIN] : 1, [TILE_TYPES.COAST]: 1};
    static right = {[TILE_TYPES.FOREST]: 1, [TILE_TYPES.PLAIN] : 1, [TILE_TYPES.COAST]: 1};
    static below = {[TILE_TYPES.FOREST]: 1, [TILE_TYPES.PLAIN] :10, [TILE_TYPES.COAST]: 1};
    static left = {[TILE_TYPES.FOREST]: 1, [TILE_TYPES.PLAIN] : 1, [TILE_TYPES.COAST]: 1};

}


class Plain extends BaseTile {
    tileType = TILE_TYPES.PLAIN;
    colour = '#00FF00';
    static above = {[TILE_TYPES.FOREST]: 1, [TILE_TYPES.PLAIN] : 1};
    static right = {[TILE_TYPES.FOREST]: 1, [TILE_TYPES.PLAIN] : 1, [TILE_TYPES.COAST]: 1};
    static below = {[TILE_TYPES.FOREST]: 1, [TILE_TYPES.PLAIN] : 1, [TILE_TYPES.COAST]: 10};
    static left = {[TILE_TYPES.FOREST]: 1, [TILE_TYPES.PLAIN] : 1, [TILE_TYPES.COAST]: 1};
}

class Hill extends BaseTile {
    tileType = TILE_TYPES.HILL;
    colour = '#006600'
}

class Mountain extends BaseTile {
    tileType = TILE_TYPES.MOUNTAIN;
    colour = '#AAAAAA'
}

class Lake extends BaseTile {
    tileType = TILE_TYPES.FOREST
    colour = '#0000CC'
}

class Coast extends BaseTile {
    tileType = TILE_TYPES.COAST;
    colour = '#ffed00'
    static above = {[TILE_TYPES.SEA]: 10, [TILE_TYPES.PLAIN]: 1, [TILE_TYPES.FOREST]: 1};
    static right = {[TILE_TYPES.SEA]: 10, [TILE_TYPES.COAST]: 1, [TILE_TYPES.PLAIN] : 1, [TILE_TYPES.FOREST]: 1};
    static below = {[TILE_TYPES.SEA]: 10, [TILE_TYPES.FOREST]: 1};
    static left = {[TILE_TYPES.COAST]: 1, [TILE_TYPES.SEA] : 10, [TILE_TYPES.PLAIN] : 1, [TILE_TYPES.FOREST]: 1};
}

class Sea extends BaseTile {
    tileType = TILE_TYPES.SEA;
    colour = '#0000AA';
    static above = {[TILE_TYPES.SEA]: 3, [TILE_TYPES.OCEAN]: 3, [TILE_TYPES.COAST]: 1};
    static right = {[TILE_TYPES.SEA]: 3, [TILE_TYPES.OCEAN]: 3, [TILE_TYPES.COAST]: 1};
    static below = {[TILE_TYPES.SEA]: 3, [TILE_TYPES.OCEAN]: 3, [TILE_TYPES.COAST]: 1};
    static left = {[TILE_TYPES.SEA]: 3, [TILE_TYPES.OCEAN]: 3, [TILE_TYPES.COAST]: 1};
}

class Ocean extends BaseTile {
    tileType = TILE_TYPES.OCEAN;
    colour = '#000055'
    static above = {[TILE_TYPES.SEA]: 3, [TILE_TYPES.OCEAN]: 16};
    static right = {[TILE_TYPES.SEA]: 3, [TILE_TYPES.OCEAN]: 16};
    static below ={[TILE_TYPES.SEA]: 3, [TILE_TYPES.OCEAN]: 16};
    static left = {[TILE_TYPES.SEA]: 3, [TILE_TYPES.OCEAN]: 16};
}

class Desert extends BaseTile {
    tileType = TILE_TYPES.DESERT;
    colour = '#ffed00'
}



class River extends BaseTile {
    tileType = TILE_TYPES.RIVER;
    colour = '#3300ff';
}

class Swamp extends BaseTile {
    tileType = TILE_TYPES.SWAMP;
    colour = '#33ff33';
}


const TILE_MAP  = {
    FOREST: Forest,
    PLAIN: Plain,
    HILL: Hill,
    MOUNTAIN: Mountain,
    LAKE: Lake,
    DESERT: Desert,
    SWAMP: Swamp,
    OCEAN: Ocean,
    SEA: Sea,
    COAST: Coast,
    RIVER: River
}

class World {
    grid = [];
    constructor() {
        for(let i=0; i<X_COUNT; i++) {
            for(let j=0; j<Y_COUNT; j++) {
                if(!this.grid[i]) {
                    this.grid[i] = [];
                }
                this.grid[i][j] = new Cell(i, j, Object.keys(VALID_TILE_TYPES)
                    .reduce((acc, key) => ({...acc, [key]: 1}), {}));
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
                    ctx.fillStyle = this.grid[i][j].tile.colour;
                    ctx.fillRect(x, y, width, height);
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
            return;
        }
        // collapse our pick
        pick.observe();
        const stack = [pick];

        while(stack.length) {
            const item = stack.pop();
            for (let i = item.x-1; i <= item.x+1; i++) {
                for (let j = item.y-1; j <= item.y+1; j++) {

                    if(!this.grid[i]?.[j] || this.grid[i][j].collapsed) {
                        continue;
                    }
                    const possibleSets = [];
                    if (j > 0) {
                        const above = this.grid[i][j - 1];
                        possibleSets.push(above.getBelowPossibilities())
                    }
                    if (i < X_COUNT - 1) {
                        const right = this.grid[i + 1][j];
                        possibleSets.push(right.getLeftPossibilities())
                    }
                    if (j < Y_COUNT - 1) {
                        const below = this.grid[i][j + 1];
                        possibleSets.push(below.getAbovePossibilities())
                    }
                    if (i > 0) {
                        const left = this.grid[i - 1][j];
                        possibleSets.push(left.getRightPossibilities())
                    }
                    const newProbabilities = sumCommonKeys(possibleSets);

                    if(this.grid[i][j].update(newProbabilities)) {
                        this.draw(window._ctx);
                        stack.push(this.grid[i][j]);
                    }
                }
            }
        }

        await sleep(3);

        return this.collapse();
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


async function init() {

    const ctx = createCanvas();
    const world = new World();
    window._ctx =ctx;
    window._world = world;

    const loop = () => {
        world.draw(ctx);
        window.requestAnimationFrame(loop)
    }
    loop();

    world.collapse();

}


init();

