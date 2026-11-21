const DIRECTIONS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];

export function createSoakController(seed) {
    let state = seed >>> 0, move = [0, 0];
    const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    return tick => {
        if (tick % 30 === 0) move = [...DIRECTIONS[Math.floor(random() * DIRECTIONS.length)]];
        return { move, jump: random() < .05, dash: random() < .03, pulse: random() < .02, interact: random() < .1 };
    };
}
