export type Direction = "up" | "down" | "left" | "right";

export interface Point {
  x: number;
  y: number;
}

export interface SnakeState {
  boardSize: number;
  snake: Point[];
  food: Point;
  direction: Direction;
  score: number;
  isOver: boolean;
}

export const SNAKE_BOARD_SIZE = 12;
export const SNAKE_START: Point[] = [
  { x: 5, y: 6 },
  { x: 4, y: 6 },
];

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function nextHead(head: Point, direction: Direction): Point {
  if (direction === "up") return { x: head.x, y: head.y - 1 };
  if (direction === "down") return { x: head.x, y: head.y + 1 };
  if (direction === "left") return { x: head.x - 1, y: head.y };
  return { x: head.x + 1, y: head.y };
}

export function randomFood(
  snake: Point[],
  boardSize = SNAKE_BOARD_SIZE,
  random = Math.random,
): Point {
  while (true) {
    const point = {
      x: Math.floor(random() * boardSize),
      y: Math.floor(random() * boardSize),
    };
    if (!snake.some((part) => part.x === point.x && part.y === point.y)) {
      return point;
    }
  }
}

export function createInitialSnakeState(random = Math.random): SnakeState {
  return {
    boardSize: SNAKE_BOARD_SIZE,
    snake: [...SNAKE_START],
    food: randomFood(SNAKE_START, SNAKE_BOARD_SIZE, random),
    direction: "right",
    score: 0,
    isOver: false,
  };
}

export function queueDirection(current: Direction, next: Direction): Direction {
  if (OPPOSITE_DIRECTION[next] === current) {
    return current;
  }
  return next;
}

export function advanceSnake(state: SnakeState, random = Math.random): SnakeState {
  if (state.isOver) {
    return state;
  }

  const head = state.snake[0]!;
  const newHead = nextHead(head, state.direction);
  const hitsWall =
    newHead.x < 0 ||
    newHead.y < 0 ||
    newHead.x >= state.boardSize ||
    newHead.y >= state.boardSize;
  const hitsSelf = state.snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y);

  if (hitsWall || hitsSelf) {
    return { ...state, isOver: true };
  }

  const grew = newHead.x === state.food.x && newHead.y === state.food.y;
  const nextSnake = [newHead, ...state.snake];
  if (!grew) {
    nextSnake.pop();
  }

  return {
    ...state,
    snake: nextSnake,
    food: grew ? randomFood(nextSnake, state.boardSize, random) : state.food,
    score: grew ? state.score + 1 : state.score,
  };
}

export function getSnakeBaseReward(score: number): number {
  return Math.max(4, score * 3);
}
