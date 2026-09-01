export type FormulaId =
  | "promotionalBalance"
  | "excessBalance"
  | "simpleInterest"
  | "compoundInterest"
  | "updatedBalance"
  | "etfCurrentPrice"
  | "etfCapitalInvested"
  | "etfGain"
  | "etfReturnRate"
  | "etfAnnualDividendIncome"
  | "etfMonthlyDividendIncome";

export type FormulaConfig = Record<FormulaId, string>;
export type FormulaStore = Record<string, FormulaConfig>;

export const defaultFormulaConfig: FormulaConfig = {
  promotionalBalance: "min(availableBalance, promoCap)",
  excessBalance: "max(0, availableBalance - promoCap)",
  simpleInterest: "principal * annualRate / 100 * days / daysBase",
  compoundInterest: "principal * ((1 + annualRate / 100 / daysBase) ^ days - 1)",
  updatedBalance: "availableBalance + totalAccumulated",
  etfCurrentPrice: "currentValue / titles",
  etfCapitalInvested: "titles * purchasePrice",
  etfGain: "currentValue - capitalInvested",
  etfReturnRate: "gain / capitalInvested * 100",
  etfAnnualDividendIncome: "currentValue * dividendRate / 100",
  etfMonthlyDividendIncome: "annualDividendIncome / 12",
};

export const formulaKey = (institutionId: string, productId: string) =>
  `${institutionId}:${productId}`;

type Token = number | string;
const tokenize = (expression: string): Token[] => {
  const tokens: Token[] = [];
  const pattern = /\s*(\d+(?:\.\d+)?|[A-Za-z_]\w*|[()+\-*/,^])/g;
  let position = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(expression))) {
    if (match.index !== position) throw new Error("Caracter no permitido");
    const token = match[1];
    tokens.push(/^\d/.test(token) ? Number(token) : token);
    position = pattern.lastIndex;
  }
  if (position !== expression.length) throw new Error("Caracter no permitido");
  return tokens;
};

export const evaluateFormula = (
  expression: string,
  variables: Record<string, number>,
): number => {
  const tokens = tokenize(expression);
  let position = 0;
  const peek = () => tokens[position];
  const consume = () => tokens[position++];
  const parseExpression = (): number => {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const operator = consume();
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  const parseTerm = (): number => {
    let value = parseFactor();
    while (peek() === "*" || peek() === "/" || peek() === "^") {
      const operator = consume();
      const right = parseFactor();
      value = operator === "*" ? value * right : operator === "^" ? Math.pow(value, right) : right === 0 ? 0 : value / right;
    }
    return value;
  };
  const parseFactor = (): number => {
    const token = consume();
    if (token === "+") return parseFactor();
    if (token === "-") return -parseFactor();
    if (token === "(") {
      const value = parseExpression();
      if (consume() !== ")") throw new Error("Parentesis sin cerrar");
      return value;
    }
    if (typeof token === "number") return token;
    if (typeof token === "string") {
      if (peek() === "(") {
        consume();
        const values = [parseExpression()];
        while (peek() === ",") {
          consume();
          values.push(parseExpression());
        }
        if (consume() !== ")") throw new Error("Parentesis sin cerrar");
        if (token === "min") return Math.min(...values);
        if (token === "max") return Math.max(...values);
        if (token === "round") return Math.round(values[0] ?? 0);
        throw new Error("Funcion no permitida");
      }
      if (token in variables) return variables[token];
    }
    throw new Error("Variable no permitida");
  };
  const result = parseExpression();
  if (position !== tokens.length || !Number.isFinite(result)) throw new Error("Formula invalida");
  return result;
};
