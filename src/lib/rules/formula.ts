import type { EntryValues } from "../../types/kpi";

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" };

const operatorPrecedence: Record<"+" | "-" | "*" | "/", number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2
};

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < formula.length) {
    const char = formula[index];

    if (char === " ") {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let value = char;
      index += 1;
      while (index < formula.length && /[0-9.]/.test(formula[index])) {
        value += formula[index];
        index += 1;
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid formula number: ${value}`);
      }
      tokens.push({ type: "number", value: parsed });
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      let value = char;
      index += 1;
      while (index < formula.length && /[a-zA-Z0-9_]/.test(formula[index])) {
        value += formula[index];
        index += 1;
      }
      tokens.push({ type: "identifier", value });
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    throw new Error(`Unsupported formula token: ${char}`);
  }

  return tokens;
}

function toRpn(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const operators: Token[] = [];

  for (const token of tokens) {
    if (token.type === "number" || token.type === "identifier") {
      output.push(token);
      continue;
    }

    if (token.type === "operator") {
      while (operators.length > 0) {
        const last = operators[operators.length - 1];
        if (last.type !== "operator" || operatorPrecedence[last.value] < operatorPrecedence[token.value]) {
          break;
        }
        const popped = operators.pop();
        if (popped) {
          output.push(popped);
        }
      }
      operators.push(token);
      continue;
    }

    if (token.value === "(") {
      operators.push(token);
      continue;
    }

    while (operators.length > 0 && operators[operators.length - 1].type !== "paren") {
      const popped = operators.pop();
      if (popped) {
        output.push(popped);
      }
    }

    const openParen = operators.pop();
    if (!openParen || openParen.type !== "paren" || openParen.value !== "(") {
      throw new Error("Formula has mismatched parentheses.");
    }
  }

  while (operators.length > 0) {
    const popped = operators.pop();
    if (!popped || popped.type === "paren") {
      throw new Error("Formula has mismatched parentheses.");
    }
    output.push(popped);
  }

  return output;
}

function valueToNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function evaluateFormula(formula: string, values: EntryValues): number {
  const stack: number[] = [];

  for (const token of toRpn(tokenize(formula))) {
    if (token.type === "number") {
      stack.push(token.value);
      continue;
    }

    if (token.type === "identifier") {
      stack.push(valueToNumber(values[token.value]));
      continue;
    }

    if (token.type === "operator") {
      const right = stack.pop();
      const left = stack.pop();

      if (left === undefined || right === undefined) {
        throw new Error("Formula is missing an operand.");
      }

      switch (token.value) {
        case "+":
          stack.push(left + right);
          break;
        case "-":
          stack.push(left - right);
          break;
        case "*":
          stack.push(left * right);
          break;
        case "/":
          stack.push(right === 0 ? 0 : left / right);
          break;
      }
    }
  }

  if (stack.length !== 1) {
    throw new Error("Formula could not be reduced to a single value.");
  }

  return stack[0];
}
