const X_COUNT = 10;
const Y_COUNT = 10;
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


class Cell {
    possibleTiles = [];
    collapsed = false;
    tile = null;
    constructor(x, y, possibleTiles) {
        this.x=x;
        this.y=y;
        this.possibleTiles = possibleTiles;
    }
    entropy = () => {
        return this.possibleTiles.length
    }

    update = (newTiles) => {
        const change = this.possibleTiles.length !== newTiles.length;
        this.possibleTiles = newTiles;
        this.collapsed = this.entropy() === 1;
        if(this.collapsed) {
            this.tile = new TILE_MAP[this.possibleTiles[0]];
        }
        return change;
    }

    observe = () => {
        this.possibleTiles = [randomChoice(this.possibleTiles)];
        this.tile = new TILE_MAP[this.possibleTiles[0]];
        this.collapsed = true;
    }

    getAbovePossibilities = () => {
        return Array.from(new Set(this.possibleTiles.reduce((acc, tileType) => {
            return [...acc, ...TILE_MAP[tileType].above];
        }, [])))
    }

    getRightPossibilities = () => {
        return Array.from(new Set(this.possibleTiles.reduce((acc, tileType) => {
            return [...acc, ...TILE_MAP[tileType].right];
        }, [])))
    }

    getBelowPossibilities = () => {
        return Array.from(new Set(this.possibleTiles.reduce((acc, tileType) => {
            return [...acc, ...TILE_MAP[tileType].below];
        }, [])))
    }

    getLeftPossibilities = () => {
        return Array.from(new Set(this.possibleTiles.reduce((acc, tileType) => {
            return [...acc, ...TILE_MAP[tileType].left];
        }, [])))
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

class BaseTile {
    tileType = TILE_TYPES.UNKNOWN;
    static above = Object.keys(VALID_TILE_TYPES);
    static right = Object.keys(VALID_TILE_TYPES);
    static below = Object.keys(VALID_TILE_TYPES);
    static left = Object.keys(VALID_TILE_TYPES);
    constructor(x,y) {
        if(!this.color) {
            this.colour = `rgba(0,${parseInt(x / X_COUNT * 256, 0)},${parseInt(y / Y_COUNT * 256.)},1)`;
        }
    }
}

class Forest extends BaseTile {
    tileType = TILE_TYPES.FOREST
    colour = '#009900';
    static above = [TILE_TYPES.FOREST, TILE_TYPES.PLAIN,TILE_TYPES.COAST];
    static right = [TILE_TYPES.FOREST, TILE_TYPES.PLAIN,TILE_TYPES.COAST];
    static below = [TILE_TYPES.FOREST, TILE_TYPES.PLAIN,TILE_TYPES.COAST];
    static left = [TILE_TYPES.FOREST, TILE_TYPES.PLAIN,TILE_TYPES.COAST];

}


class Plain extends BaseTile {
    tileType = TILE_TYPES.PLAIN;
    colour = '#00FF00';
    static above = [TILE_TYPES.FOREST, TILE_TYPES.PLAIN,TILE_TYPES.COAST];
    static right = [TILE_TYPES.FOREST, TILE_TYPES.PLAIN,TILE_TYPES.COAST];
    static below = [TILE_TYPES.COAST];
    static left = [TILE_TYPES.FOREST, TILE_TYPES.PLAIN,TILE_TYPES.COAST];
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
    static above = [TILE_TYPES.COAST,TILE_TYPES.PLAIN];
    static right = [TILE_TYPES.COAST, TILE_TYPES.SEA];
    static below = [TILE_TYPES.COAST,TILE_TYPES.SEA];
    static left = [TILE_TYPES.COAST, TILE_TYPES.SEA]
}

class Sea extends BaseTile {
    tileType = TILE_TYPES.SEA;
    colour = '#0000AA';
    static above = [TILE_TYPES.COAST, TILE_TYPES.SEA];
    static right = [TILE_TYPES.COAST, TILE_TYPES.SEA];
    static below = [TILE_TYPES.OCEAN, TILE_TYPES.SEA];
    static left = [TILE_TYPES.COAST, TILE_TYPES.SEA]
}

class Ocean extends BaseTile {
    tileType = TILE_TYPES.OCEAN;
    colour = '#000055'
    static above = [TILE_TYPES.OCEAN, TILE_TYPES.SEA];
    static right = [TILE_TYPES.OCEAN, TILE_TYPES.SEA];
    static below = [TILE_TYPES.OCEAN, TILE_TYPES.SEA];
    static left = [TILE_TYPES.OCEAN, TILE_TYPES.SEA]
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
                this.grid[i][j] = new Cell(i, j, Object.keys(TILE_MAP));
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
                    ctx.fillText(this.grid[i][j].possibleTiles.length, x + width/2, y+height/2);
                }
            }
        }
    }

    pick() {
        const sortedGrid = this.grid
            .flat()
            .filter(a => !a.collapsed && a.entropy() >= 1)
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
            for (let i = item.x-1; i < item.x+1; i++) {
                for (let j = item.y-1; j < item.y+1; j++) {

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
                    // get intersection of sets
                    const validSet = Array.from(new Set(possibleSets.reduce((a, b) => a.filter(c => b.includes(c)))));

                    if(this.grid[i][j].update(validSet)) {
                        stack.push(this.grid[i][j])
                    }

                }
            }
        }
        await sleep(100);
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

    window._world = world;

    const loop = () => {
        world.draw(ctx);
        window.requestAnimationFrame(loop)
    }
    loop();

    world.collapse();

}


init();

