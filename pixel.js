const X_COUNT = 50;
const Y_COUNT = 50;
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
        this.collapsed = Object.keys(this.possibleTiles).length === 1;
        if(this.collapsed) {
            this.setTile(Object.keys(this.possibleTiles)[0]);
        }
        if(change) {
            window._world.drawTile(window._ctx, this.x, this.y);
        }
        return change;
    }

    setTile = (name) => {
        this.colour = name;
        this.possibleTiles = {[name]: 1};

    }

    observe = () => {
        const newTile = selectKeyFromWeighted(this.possibleTiles);
        if(newTile) {
            this.collapsed = true;
            this.setTile(newTile);
        }
        window._world.drawTile(window._ctx, this.x, this.y)
        return false;
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
                this.grid[i][j] = new Cell(i, j, model.totalWeights);
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

    drawTile(ctx, i, j) {
        const width = ctx.canvas.width / X_COUNT;
        const x = width * i;
        const y = width * j;
        const height = ctx.canvas.height / Y_COUNT;
        ctx.clearRect(0, 0, width, height);
        if(this.grid[i][j].collapsed) {
            ctx.fillStyle = this.grid[i][j].colour;
            ctx.fillRect(x, y, width, height);
            ctx.strokeStyle = "#ffffff";
            ctx.strokeRect(x, y, width, height);
        }
        else {
            ctx.fillStyle = "#000000";
            ctx.font = `${width/2}px serif`;
            ctx.fillText(Object.keys(this.grid[i][j].possibleTiles).length, x + width/2, y+height/2);
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
        if(!pick.observe()) {
            // must backtract
        }
        const stack = [pick];
        while(stack.length) {
            const item = stack.pop();
            // for every grid item around the pick
            for (let i = item.x-1; i <= item.x+1; i++) {
                for (let j = item.y-1; j <= item.y+1; j++) {
                    if(i===1 && j===0) {
                       // debugger;
                    }

                    if(!this.grid[i]?.[j] || this.grid[i][j].collapsed) {
                        continue;
                    }
                    const possibleSets = [];


                    for (let m = -this.model.windowRadius; m <= this.model.windowRadius; m++) {
                        if(this.grid[i+m]?.[j] && !(m === 0)) {
                            let sums = {}
                            for(const possible in this.grid[i+m][j].possibleTiles) {
                                const weights = this.model.weights[possible][this.model.windowRadius-m][this.model.windowRadius];
                                sums = addWeights(sums, weights);
                            }
                            possibleSets.push(sums);
                        }
                    }

                    for (let m = -this.model.windowRadius; m <= this.model.windowRadius; m++) {
                        if(this.grid[i]?.[j+m] && !(m === 0)) {
                            let sums = {}
                            for(const possible in this.grid[i][j+m].possibleTiles) {
                                const weights = this.model.weights[possible][this.model.windowRadius][this.model.windowRadius-m];
                                sums = addWeights(sums, weights);
                            }
                            possibleSets.push(sums);
                        }
                    }

                    const newProbabilities = sumCommonKeys(possibleSets);
                    if(this.grid[i][j].update(newProbabilities)) {
                        stack.push(this.grid[i][j]);
                    }
                }
            }
        }
        await sleep(1);
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

function componentToHex(c) {
    let hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

const windowArray = (windowRadius) => {
    const array = [];
    for(let i=0; i < windowRadius * 2 + 1; i++) {
        array[i] = [];
        for (let j = 0; j < windowRadius * 2 + 1; j++) {
            array[i][j] = {};
        }
    }
    return array;
}

const generateModel = pixelData => {
    const windowRadius =3;
    const weights = {};
    const hexArray = [];
    const totalWeights = {}
    for(let x=0; x<pixelData.width; x++) {
        hexArray[x] = [];
        for(let y=0;y<pixelData.height; y++) {
            const index = (y * pixelData.width + x) *  4;
            const value = rgbToHex(pixelData.data[index], pixelData.data[index+1], pixelData.data[index+2]);
            hexArray[x][y] = value;
            totalWeights[value] = (totalWeights[value] || 0) + 1;
        }
    }
    for(let x=0; x<hexArray.length; x++) {
        for(let y=0; y<hexArray[x].length; y++) {
            const thisColour = hexArray[x][y];
            weights[thisColour] = weights[thisColour] || windowArray(windowRadius);
            for(let i=-windowRadius; i <= windowRadius; i++) {
                for(let j=-windowRadius; j <= windowRadius; j++) {
                    if(!hexArray[x+i]?.[y+j]) {
                        continue;
                    }
                    const newColour =  hexArray[x+i][y+j];

                    weights[thisColour][i+windowRadius][j+windowRadius][newColour] = (
                        weights[thisColour][i+windowRadius][j+windowRadius][newColour] || 0) + 1;
                }
            }
        }
    }
    return {weights, windowRadius, totalWeights};
}

async function init() {
    const pixelData = await (async () => {
        const img = new Image();
        //img.src = "towlinesbox.png";
        img.src = "simplemaze.png";
        document.body.appendChild(img);
        await img.decode();
        const cvs = document.createElement("canvas");
        const ctx = cvs.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height);

    })();
    const model = generateModel(pixelData);
    const ctx = createCanvas();
    const world = new World(model);
    window._ctx =ctx;
    window._world = world;

    const loop = () => {
        world.draw(ctx);
        window.requestAnimationFrame(loop)
    }
    //loop();

    await world.collapse();

}


init();

