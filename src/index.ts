import {
  IndexSignatureParameterType,
  Primitive,
} from './types';

/**
 * 标识符
 * 所谓标识符，就是变量、函数、属性或函数参数的名称。标识符可以由一或多个下列字符组成：
 * 第一个字符必须是一个字母、下划线（_）或美元符号（$）；
 * 剩下的其他字符可以是字母、下划线、美元符号或数字。
 * 标识符中的字母可以是扩展ASCII（Extended ASCII）中的字母，也可以是Unicode的字母字符，如À和Æ（但不推荐使用）。
 */
const IDENTIFIER = /^[_a-zA-Z$][_a-zA-Z$\d]*$/;
/**
 * 转义符
 */
const ESCAPE_CHARACTER = new Map([
  [
    '0',
    '\0',
  ],
  [
    '\'',
    '\'',
  ],
  [
    '"',
    '"',
  ],
  [
    '\\',
    '\\',
  ],
  [
    'n',
    '\n',
  ],
  [
    'r',
    '\r',
  ],
  [
    'v',
    '\v',
  ],
  [
    't',
    '\t',
  ],
  [
    'b',
    '\b',
  ],
  [
    'f',
    '\f',
  ],
] as const);

const isEscapeCharacter = (v: string): v is typeof ESCAPE_CHARACTER extends Map<infer T, unknown> ? T : never => {
  return (ESCAPE_CHARACTER as Map<string, unknown>).has(v);
};
/**
 * 不可见字符
 */
const INVISIBLE_CHARACTER = new Set([
  ' ',
  '\f',
  '\n',
  '\r',
  '\t',
  '\v',
] as const);

const isInvisibleCharacter = (v: string): v is typeof INVISIBLE_CHARACTER extends Set<infer T> ? T : never => {
  return (INVISIBLE_CHARACTER as Set<string>).has(v);
};

const GUARD_CHARACTER = [
  [
    '{',
    '}',
  ],
  [
    '(',
    ')',
  ],
  [
    'Array<',
    '>',
  ],
  [
    '[',
    ']',
  ],
  [
    '"',
    '"',
  ],
  [
    '\'',
    '\'',
  ],
] as const;
/**
 * 确定有限自动机DFA
 * 自动机的每个状态都有对字母表中所有符号的转移
 */
class DeterministicFiniteAutomata<STATE extends string, INPUT> {
  /**
   * 当前状态
   */
  public state: STATE;
  /**
   * 有限状态集合
   */
  public readonly finiteStateSet: Set<STATE>;
  /**
   * 有限输入集合
   */
  public readonly finiteInputSet: Set<INPUT>;
  /**
   * 状态转移表
   */
  public readonly transfer: Map<STATE, Map<INPUT,
    STATE
    | { nextState: STATE; callback?: (payload: any) => void; }
    | ((payload: any) => STATE)
  >>;

  /**
   * @param initialState - 初始状态
   * @param transfer - 状态转移表
   */
  public constructor (initialState: STATE, transfer: DeterministicFiniteAutomata<STATE, INPUT>['transfer']) {
    this.finiteStateSet = new Set(transfer.keys());
    if (!this.finiteStateSet.has(initialState)) {
      throw new TypeError(`The ${initialState} does not exist in the finite state set`);
    }
    this.finiteInputSet = new Set(transfer.get(initialState)!.keys());

    for (const inputMap of transfer.values()) {
      if (inputMap.size !== this.finiteInputSet.size) {
        throw new TypeError('The transfer is illegal. There is a difference in length between input mappings.');
      }
      for (const input of inputMap.keys()) {
        if (!this.finiteInputSet.has(input)) {
          throw new TypeError('The transfer is illegal. There are differences between input mappings.');
        }
      }
    }
    this.state = initialState;
    this.transfer = transfer;
  }

  public next (input: DeterministicFiniteAutomata<STATE, INPUT>['finiteInputSet'] extends Set<infer T> ? T : never, payload?: any): void {
    if (!this.finiteInputSet.has(input)) {
      throw new TypeError(`The ${input} does not exist in the finite input set`);
    }
    const next = this.transfer.get(this.state)!.get(input)!;

    if (typeof next === 'string') {
      this.state = next;
    } else if (typeof next === 'function') {
      this.state = next(payload ?? null);
    } else {
      const callback = next.callback;
      this.state = next.nextState;
      if (typeof callback === 'function') {
        callback(payload ?? null);
      }
    }
  }

  public force (state: STATE): void {
    if (!this.finiteStateSet.has(state)) {
      throw new TypeError(`The ${state} does not exist in the finite state set`);
    }
    this.state = state;
  }
}

/**
 * 根据断点去分割字符串并且去除空格和换行符
 * 如果遇到{}、()、Array<>、[]将保护内部的信息不被切割
 * 如果传入字符串不能被正确切割将报一个TypeError类型的错误
 */
const splitAstriction = (rawAstriction: string, breakPoints: string[]): string[] => {
  if (breakPoints.length === 0) {
    throw new TypeError('');
  }

  const levels: number[] = new Array(GUARD_CHARACTER.length).fill(0);

  const ans: string[] = [];
  let path: string = '';

  const enum STATE {
    NORMAL = 'NORMAL',
    SPLIT = 'SPLIT',
    ERR = 'ERR',
  }

  type Handle = ((payload: { ch: string; index: number; }) => STATE)

  const handleNormalBreak: Handle = ({
    ch,
  }) => {
    if (levels.every(l => l === 0)) {
      ans.push(path);
      path = '';
      return STATE.SPLIT;
    } else if (levels.every(l => l >= 0)) {
      path += ch;
      return STATE.NORMAL;
    } else {
      return STATE.ERR;
    }
  };
  const handleNormalLeft: Handle = ({
    ch, index,
  }) => {
    if (levels.every(l => l >= 0)) {
      path += ch;
      levels[index]++;
      return STATE.NORMAL;
    } else {
      return STATE.ERR;
    }
  };
  const handleNormalRight: Handle = ({
    ch, index,
  }) => {
    if (levels.every(l => l >= 0) && levels[index] > 0) {
      path += ch;
      levels[index]--;
      return STATE.NORMAL;
    } else {
      return STATE.ERR;
    }
  };
  const handleNormalOther: Handle = ({
    ch,
  }) => {
    path += ch;
    return STATE.NORMAL;
  };

  const handleSplitBreak: Handle = () => {
    return STATE.ERR;
  };
  const handleSplitLeft: Handle = ({
    ch, index,
  }) => {
    path += ch;
    levels[index]++;
    return STATE.NORMAL;
  };
  const handleSplitRight: Handle = () => {
    return STATE.ERR;
  };
  const handleSplitOther: Handle = ({
    ch,
  }) => {
    path += ch;
    return STATE.NORMAL;
  };
  const handleError: Handle = () => {
    return STATE.ERR;
  };

  const inputs: string[] = new Array(2 + 2 * GUARD_CHARACTER.length).fill(null).map((e, index) => {
    return String(index);
  });
  const dfa = new DeterministicFiniteAutomata(
    STATE.SPLIT,
    new Map(
      [
        [
          STATE.NORMAL,
          new Map(
            inputs.map((input, index) => {
              if (index === 0) {
                return [
                  input,
                  handleNormalBreak,
                ];
              } else if (index === inputs.length - 1) {
                return [
                  input,
                  handleNormalOther,
                ];
              } else if (index % 2 !== 0) {
                return [
                  input,
                  handleNormalLeft,
                ];
              } else {
                return [
                  input,
                  handleNormalRight,
                ];
              }
            }),
          ),
        ],
        [
          STATE.SPLIT,
          new Map(
            inputs.map((input, index) => {
              if (index === 0) {
                return [
                  input,
                  handleSplitBreak,
                ];
              } else if (index === inputs.length - 1) {
                return [
                  input,
                  handleSplitOther,
                ];
              } else if (index % 2 !== 0) {
                return [
                  input,
                  handleSplitLeft,
                ];
              } else {
                return [
                  input,
                  handleSplitRight,
                ];
              }
            }),
          ),
        ],
        [
          STATE.ERR,
          new Map(
            inputs.map(input => {
              return [
                input,
                handleError,
              ];
            }),
          ),
        ],
      ],
    ));

  interface NqWrap {
    inputIndex: number;
    levelIndex: number;
  }
  interface EqWrap {
    inputLeftIndex: number;
    inputRightIndex: number;
    levelIndex: number;
  }

  const isNqWrap = (val: NqWrap | EqWrap): val is NqWrap => {
    const err: typeof guardMap extends Map<unknown, infer T> ? T : never = val;
    return err && Object.prototype.hasOwnProperty.call(val, 'inputIndex');
  };

  const isEqWrap = (val: NqWrap | EqWrap): val is EqWrap => {
    const err: typeof guardMap extends Map<unknown, infer T> ? T : never = val;
    return err && Object.prototype.hasOwnProperty.call(val, 'inputLeftIndex');
  };

  const guardMap = new Map<typeof GUARD_CHARACTER[number][0] | typeof GUARD_CHARACTER[number][1], NqWrap | EqWrap>();

  const isGuardMapKey = (v: string): v is typeof guardMap extends Map<infer T, unknown> ? T : string => {
    const map: Map<string, unknown> = guardMap;
    return map.has(v);
  };

  const breakPointMap: Map<string, NqWrap> = new Map();

  const isBreakPointMapKey = (v: string): boolean => {
    return breakPointMap.has(v);
  };

  for (const breakPoint of breakPoints) {
    breakPointMap.set(breakPoint, {
      inputIndex: 0,
      levelIndex: NaN,
    });
  }
  for (let index = 0; index < GUARD_CHARACTER.length; index++) {
    const [
      left,
      right,
    ] = GUARD_CHARACTER[index];
    if (left !== right) {
      guardMap.set(left, {
        inputIndex: 1 + index * 2,
        levelIndex: index,
      });
      guardMap.set(right, {
        inputIndex: 2 + index * 2,
        levelIndex: index,
      });
    } else {
      guardMap.set(right, {
        inputLeftIndex: 1 + index * 2,
        inputRightIndex: 2 + index * 2,
        levelIndex: index,
      });
    }
  }
  const str: string = rawAstriction + breakPoints[0];
  const nextKeyword = (ch: string, inputIndex: number, levelIndex: number): void => {
    dfa.next(inputs[inputIndex], {
      ch,
      index: levelIndex,
    });
  };
  const nextOther = (ch: string): void => {
    dfa.next(inputs[inputs.length - 1], {
      ch,
      index: NaN,
    });
  };
  const next = (ch: string): void => {
    if (isBreakPointMapKey(ch)) {
      const {
        inputIndex, levelIndex,
      } = breakPointMap.get(ch)!;
      nextKeyword(ch, inputIndex, levelIndex);
    } else if (isGuardMapKey(ch)) {
      if (
        (ch === '"' && levels[guardMap.get('\'')!.levelIndex] > 0) ||
        (ch === '\'' && levels[guardMap.get('"')!.levelIndex] > 0)
      ) {
        nextOther(ch);
        return;
      }
      const wrap = guardMap.get(ch)!;
      let inputIndex: number = NaN;
      let levelIndex = wrap.levelIndex;

      if (isNqWrap(wrap)) {
        inputIndex = wrap.inputIndex;
      } else if (isEqWrap(wrap)) {
        const {
          inputLeftIndex,
          inputRightIndex,
        } = wrap;
        const level = levels[levelIndex];
        if (level % 2 === 0) {
          inputIndex = inputLeftIndex;
        } else {
          inputIndex = inputRightIndex;
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const err: never = wrap;
        levelIndex = NaN;
      }
      nextKeyword(ch, inputIndex, levelIndex);
    } else {
      nextOther(ch);
    }
  };
  for (let index = 0; index < str.length; index++) {
    if (dfa.state === STATE.ERR) {
      break;
    }

    let ch = str[index];

    if (isInvisibleCharacter(ch)) {
      const singleWrap = guardMap.get('\'')! as EqWrap;
      const doubleWrap = guardMap.get('"')! as EqWrap;
      if (levels[singleWrap.levelIndex] === 0 && levels[doubleWrap.levelIndex] === 0) { continue; }
    } else if (ch === '\\') {
      if (index >= str.length - 1) {
        dfa.force(STATE.ERR);
        break;
      }
      nextOther(ch);
      index++;
      nextOther(str[index]);
      continue;
    } else if (str.slice(index, index + 6) === 'Array<') {
      ch = 'Array<';
      index += 5;
    }

    next(ch);
  }

  if (dfa.state === STATE.ERR || levels.some(l => l !== 0)) {
    throw new TypeError('');
  }
  return ans;
};

interface AstrictionOption {
  primitive: Set<Primitive>;
  checkVariableName: (v: string) => boolean;
}
interface CheckOption {
  isStructuralTyping: boolean;
}

interface PrimitiveAT {
  classification: 'primitive';
  type: Primitive;
}
interface ArrayAT<T> {
  classification: 'array';
  type: T;
}
interface ObjectAT<T> {
  classification: 'object';
  mappedTypes: Record<IndexSignatureParameterType, T | null>;
  type: Map<string|symbol, {
    type: T;
    isRequired: boolean;
  }>;
}
interface TupleAT<T> {
  classification: 'tuple';
  type: T[];
}
interface EnumerationAT {
  classification: 'enumeration';
  type: string | number | boolean;
}
/**
 * 抽象类型树
 */
export type AbstractTypeTree = (
  PrimitiveAT | ArrayAT<AbstractTypeTree> | ObjectAT<AbstractTypeTree> | TupleAT<AbstractTypeTree> | EnumerationAT
)[];

const isParenthesesAstriction = (v: string): boolean => {
  return /^\([\s\S]+\)$/.test(v);
};
const isPrimitiveAstriction = (v: string, primitive: Set<Primitive>): v is Primitive => {
  return primitive.has(v as any);
};
const isObjectAstriction = (v: string): boolean => {
  return /^{[\s\S]*}$/.test(v);
};
const isLiteralArrayAstriction = (v: string): boolean => {
  return /^[\s\S]+\[\]$/.test(v);
};
const isDeclarationArrayAstriction = (v: string): boolean => {
  return /^Array<[\s\S]+>$/.test(v);
};
const isArrayAstriction = (v: string): boolean => {
  return isLiteralArrayAstriction(v) || isDeclarationArrayAstriction(v);
};
const isTupleAstriction = (v: string): boolean => {
  return /^\[[\s\S]*\]$/.test(v);
};

const isSingleStringEnumeration = (v: string): boolean => {
  return /^'[\s\S]*'$/.test(v);
};
const isDoubleStringEnumeration = (v: string): boolean => {
  return /^"[\s\S]*"$/.test(v);
};
const isTrueEnumeration = (v: string): boolean => {
  return v === 'true';
};
const isFalseEnumeration = (v: string): boolean => {
  return v === 'false';
};
const isNumberEnumeration = (v: string): boolean => {
  return !isNaN(Number(v));
};
const isEnumerationAstriction = (v: string): boolean => {
  return isSingleStringEnumeration(v) || isDoubleStringEnumeration(v) || isTrueEnumeration(v) || isFalseEnumeration(v) || isNumberEnumeration(v);
};

const isPrimitiveAT = (v: AbstractTypeTree[number]): v is PrimitiveAT => {
  return v.classification === 'primitive';
};
const isArrayAT = (v: AbstractTypeTree[number]): v is ArrayAT<AbstractTypeTree> => {
  return v.classification === 'array';
};
const isObjectAT = (v: AbstractTypeTree[number]): v is ObjectAT<AbstractTypeTree> => {
  return v.classification === 'object';
};
const isTupleAT = (v: AbstractTypeTree[number]): v is TupleAT<AbstractTypeTree> => {
  return v.classification === 'tuple';
};
const isEnumerationAT = (v: AbstractTypeTree[number]): v is EnumerationAT => {
  return v.classification === 'enumeration';
};
// https://www.typescriptlang.org/docs/handbook/type-compatibility.html#any-unknown-object-void-undefined-null-and-never-assignability
/**
 * 可分配性
 * a可以分配给b
 * 即 const foo:b = bar as a 成立
 */
const assignabilityTo = (a:PrimitiveAT, b:PrimitiveAT):boolean => {
  const aType = a.type;
  const bType = b.type;
  const _ = (arg:Primitive):Record<Primitive, boolean> => {
    const ans = {
      any: true,
      unknown: true,
      object: false,
      void: false,
      never: false,
      string: false,
      number: false,
      bigint: false,
      boolean: false,
      undefined: false,
      null: false,
      symbol: false,
    };
    ans[arg] = true;
    return ans;
  };
  const map:Record<Primitive, Record<Primitive, boolean>> = {
    any: {
      any: true,
      unknown: true,
      object: true,
      void: true,
      never: false,
      string: true,
      number: true,
      bigint: true,
      boolean: true,
      undefined: true,
      null: true,
      symbol: true,
    },
    unknown: _('unknown'),
    object: _('object'),
    void: _('void'),
    never: {
      any: true,
      unknown: true,
      object: true,
      void: true,
      never: true,
      string: true,
      number: true,
      bigint: true,
      boolean: true,
      undefined: true,
      null: true,
      symbol: true,
    },
    string: _('string'),
    number: _('number'),
    bigint: _('bigint'),
    boolean: _('boolean'),
    undefined: _('undefined'),
    null: _('null'),
    symbol: _('symbol'),
  };
  return map[aType][bType];
};
/**
 * a是否包含b
 */
const includeTo = (a:AbstractTypeTree, b:AbstractTypeTree):boolean => {
  const aPrimitiveATList = a.filter(e => isPrimitiveAT(e)) as PrimitiveAT[];

  const aHasPrimitiveAT = (arg:Primitive[]):boolean => {
    return aPrimitiveATList.some(e => arg.includes(e.type));
  };
  for (const type of b) {
    if (isPrimitiveAT(type)) {
      const flag = aPrimitiveATList.some(e => assignabilityTo(type, e));
      if (!flag) return false;
    } else if (isArrayAT(type)) {
      const aArrayATList = a.filter(e => isArrayAT(e)) as ArrayAT<AbstractTypeTree>[];
      const flag = aHasPrimitiveAT([
        'any',
        'unknown',
        'object',
      ]) || aArrayATList.some(e => includeTo(e.type, type.type));
      if (!flag) return false;
    } else if (isObjectAT(type)) {
      const aObjectATList = a.filter(e => isObjectAT(e)) as ObjectAT<AbstractTypeTree>[];
      const flag = aHasPrimitiveAT([
        'any',
        'unknown',
        'object',
      ]) || aObjectATList.some((target) => {
        for (const [
          key,
          currentType,
        ] of type.type) {
          if (target.type.has(key)) {
            const targetType = target.type.get(key)!;
            if (targetType.isRequired && !currentType.isRequired) {
              return false;
            }

            if (!includeTo(targetType.type, currentType.type)) {
              return false;
            } else {
              continue;
            }
          } else {
            return false;
          }
        }
        return true;
      });
      if (!flag) return false;
    } else if (isTupleAT(type)) {
      const aTupleATList = a.filter(e => isTupleAT(e)) as TupleAT<AbstractTypeTree>[];
      const aArrayATList = a.filter(e => isArrayAT(e)) as ArrayAT<AbstractTypeTree>[];

      const flag = aTupleATList.some((targetType) => {
        if (targetType.type.length !== type.type.length) {
          return false;
        }
        for (let i = 0; i < type.type.length; i++) {
          if (!includeTo(targetType.type[i], type.type[i])) {
            return false;
          }
        }
        return true;
      }) || aArrayATList.some(e => includeTo([e], [{
        classification: 'array',
        type: type.type.flat().map(e => {
          if (isEnumerationAT(e)) {
            const target:PrimitiveAT = {
              classification: 'primitive',
              type: typeof e.type as 'string' | 'number' | 'boolean',
            };
            return target;
          } else {
            return e;
          }
        }),
      }]));
      if (!flag) return false;
    } else if (isEnumerationAT(type)) {
      const aEnumerationATList = a.filter(e => isEnumerationAT(e)) as EnumerationAT[];
      const p = typeof type.type as 'string' | 'number' | 'boolean';
      const flag = aHasPrimitiveAT([p]) || aEnumerationATList.some((target) => {
        return target.type === type.type;
      });
      if (!flag) return false;
    } else {
      const err: never = type;
      throw new TypeError(err);
    }
  }
  return true;
};
/**
 * 校验变量的值是否是特定的原始数据类型
 */
const checkPrimitiveAT = (val: any, {
  type,
}: PrimitiveAT): boolean => {
  if (type === 'any' || type === 'unknown') {
    return true;
  } else if (type === 'never') {
    return false;
  } else if (type === 'object') {
    return val instanceof Object;
  } else if (type === 'void') {
    return val === null || val === void (0);
  }
  const tag = Object.prototype.toString.call(val);
  switch (type) {
    case 'number': {
      return tag === '[object Number]';
    }
    case 'string': {
      return tag === '[object String]';
    }
    case 'boolean': {
      return tag === '[object Boolean]';
    }
    case 'undefined': {
      return tag === '[object Undefined]';
    }
    case 'null': {
      return tag === '[object Null]';
    }
    case 'symbol': {
      return tag === '[object Symbol]';
    }
    case 'bigint': {
      return tag === '[object BigInt]';
    }
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const err: 'object' = type;
      return false;
    }
  }
};
/**
 * 校验变量的值是否是符合条件的数组
 */
const checkArrayAT = (val: any, node: ArrayAT<AbstractTypeTree>, option: CheckOption): boolean => {
  if (!Array.isArray(val)) {
    return false;
  }
  for (const item of val) {
    if (!typeChecker(item, node.type, option)) {
      return false;
    }
  }
  return true;
};
/**
 * 校验变量的值是否是符合条件的对象
 */
const checkObjectAT = (val: any, node: ObjectAT<AbstractTypeTree>, option: CheckOption): boolean => {
  if (!(val instanceof Object)) {
    return false;
  }
  const {
    isStructuralTyping,
  } = option;
  const {
    type: typeMap,
    mappedTypes,
  } = node;

  const getSymbolKeys = (v:object):symbol[] => {
    return Object.getOwnPropertySymbols(v).filter(key => {
      return Object.getOwnPropertyDescriptor(v, key)!.enumerable;
    });
  };
  const paths = new Map<string|symbol, boolean>();

  for (const key of Object.keys(val)) {
    paths.set(key, false);
  }
  for (const key of getSymbolKeys(val)) {
    paths.set(key, false);
  }

  if (isStructuralTyping) {
    for (const [
      key,
      {
        isRequired,
      },
    ] of typeMap) {
      if (isRequired && !paths.has(key)) {
        return false;
      }
    }
  } else {
    for (const [
      key,
      {
        isRequired,
      },
    ] of typeMap) {
      const isExist = paths.has(key);
      if (!isExist) {
        if (isRequired) {
          return false;
        } else {
          continue;
        }
      } else {
        paths.set(key, true);
      }
    }
    const missKeys = [...paths].filter(([
      , v,
    ]) => !v).map(([k]) => k);

    if (missKeys.length > 0) {
      let symbolCount = 0;
      let stringCount = 0;
      let numberCount = 0;
      for (const key of missKeys) {
        if (typeof key === 'string') {
          stringCount++;
          if (isKeyOfNumberIndexSignature(key)) {
            numberCount++;
          }
        } else {
          symbolCount++;
        }
      }
      if (mappedTypes.symbol) {
        symbolCount = 0;
      }

      if (mappedTypes.string) {
        stringCount = 0;
        numberCount = 0;
      } else if (mappedTypes.number) {
        stringCount -= numberCount;
        numberCount = 0;
      }

      if (symbolCount !== 0 ||
        stringCount !== 0 ||
        numberCount !== 0
      ) {
        return false;
      }
    }
  }

  for (const [key] of paths) {
    if (typeMap.has(key)) {
      if (!typeChecker(val[key], typeMap.get(key)!.type, option)) {
        return false;
      }
    } else if (typeof key === 'string' && (mappedTypes.string || mappedTypes.number)) {
      if (mappedTypes.number && isKeyOfNumberIndexSignature(key)) {
        if (!typeChecker(val[key], mappedTypes.number, option)) {
          return false;
        }
      } else if (mappedTypes.string) {
        if (!typeChecker(val[key], mappedTypes.string, option)) {
          return false;
        }
      }
    } else if (typeof key === 'symbol' && mappedTypes.symbol) {
      if (!typeChecker(val[key], mappedTypes.symbol, option)) {
        return false;
      }
    }
  }
  return true;
};
/**
 * 校验变量的值是否是符合条件的元组
 */
const checkTupleAT = (val: any, node: TupleAT<AbstractTypeTree>, option: CheckOption): boolean => {
  if (!Array.isArray(val)) {
    return false;
  }
  const {
    type,
  } = node;
  const length = type.length;
  if (val.length !== length) {
    return false;
  }

  for (let i = 0; i < length; i++) {
    if (!typeChecker(val[i], type[i], option)) {
      return false;
    }
  }
  return true;
};

/**
 * 校验变量的值是否是符合条件的枚举
 */
const checkEnumerationAT = (val: any, node: EnumerationAT): boolean => {
  return val === node.type;
};

export const getFlatAstrictionList = (rawAstriction: string): string[] => {
  return splitAstriction(rawAstriction, ['|']);
};
/**
 * 如果传入字符串不能解析为数组将报一个TypeError类型的错误
 */
export function parseArrayAT (formatAstriction: string, option: AstrictionOption): ArrayAT<AbstractTypeTree> {
  if (!isArrayAstriction(formatAstriction)) {
    throw new TypeError('');
  }
  const type: AbstractTypeTree = [];
  const at: ReturnType<typeof parseArrayAT> = {
    classification: 'array',
    type,
  };
  let astrictionBuffer: string = '';
  if (isLiteralArrayAstriction(formatAstriction)) {
    astrictionBuffer = formatAstriction.slice(0, -2);
  } else {
    astrictionBuffer = formatAstriction.slice(6, -1);
  }

  type.push(...parseFormatAstriction(astrictionBuffer, option));
  if (type.length === 0) {
    throw new TypeError('');
  }
  return at;
}
const isKeyOfNumberIndexSignature = (key:string):boolean => {
  return /^((-?[1-9]\d*)|0)$/.test(key);
};
/**
 * 如果传入字符串不能解析为对象将报一个TypeError类型的错误
 */
export function parseObjectAT (formatAstriction: string, option: AstrictionOption): ObjectAT<AbstractTypeTree> {
  if (!isObjectAstriction(formatAstriction)) {
    throw new TypeError('');
  }
  const {
    checkVariableName,
  } = option;
  const type: ObjectAT<AbstractTypeTree>['type'] = new Map();
  const at: ReturnType<typeof parseObjectAT> = {
    mappedTypes: {
      symbol: null,
      string: null,
      number: null,
    },
    classification: 'object',
    type,
  };
  const breakPoints: string[] = [
    ',',
    ';',
  ];
  let astrictionBuffer: string = formatAstriction.slice(1, -1);
  const length: number = astrictionBuffer.length;
  // 如果 formatAstriction === '{}' 标识需要一个空对象结构
  if (length === 0) {
    return at;
  }
  if (breakPoints.includes(astrictionBuffer[length - 1])) {
    astrictionBuffer = astrictionBuffer.slice(0, -1);
  }
  for (const structure of splitAstriction(astrictionBuffer, breakPoints)) {
    const i: number = structure.indexOf(':');

    // Mapped Types
    if (/^\[([_a-zA-Z$][_a-zA-Z$\d]*):(symbol|string|number)\]:[^:]+$/.test(structure)) {
      const j:number = structure.indexOf(':', i + 1);
      const t = structure.slice(i + 1, j - 1) as 'symbol'|'string'|'number';
      if (at.mappedTypes[t] !== null) {
        throw new TypeError('');
      }
      at.mappedTypes[t] = parseFormatAstriction(structure.slice(j + 1), option);
      continue;
    }

    // 无法解析出变量名和类型
    if (i === -1) {
      throw new TypeError('');
    }
    const isRequired: boolean = structure[i - 1] !== '?';
    const variableName: string = structure.slice(0, isRequired ? i : i - 1);
    // 变量名不合法
    if (!checkVariableName(variableName)) {
      throw new TypeError('');
    }
    type.set(variableName, {
      isRequired,
      type: parseFormatAstriction(structure.slice(i + 1), option),
    });
  }
  // 验证AT是不是合规
  // 1.size
  // if (type.size === 0) {
  //   throw new TypeError('');
  // }
  // 2.Mapped Types
  // string 必须包含number
  if (at.mappedTypes.string && at.mappedTypes.number && !includeTo(at.mappedTypes.string, at.mappedTypes.number)) {
    throw new TypeError('');
  }
  // 如果存在mapped tyes 判断键是否合法
  for (const [
    k,
    v,
  ] of at.type) {
    if (typeof k === 'string') {
      if (isKeyOfNumberIndexSignature(k) && at.mappedTypes.number) {
        if (!includeTo(at.mappedTypes.number, v.type)) {
          throw new TypeError('');
        }
      } else if (at.mappedTypes.string) {
        if (!includeTo(at.mappedTypes.string, v.type)) {
          throw new TypeError('');
        }
      }
    } else {
      if (at.mappedTypes.symbol) {
        if (!includeTo(at.mappedTypes.symbol, v.type)) {
          throw new TypeError('');
        }
      }
    }
  }
  return at;
};

export function parseTupleAT (formatAstriction: string, option: AstrictionOption): TupleAT<AbstractTypeTree> {
  if (!isTupleAstriction(formatAstriction)) {
    throw new TypeError('');
  }
  const at: ReturnType<typeof parseTupleAT> = {
    classification: 'tuple',
    type: formatAstriction === '[]' ? [] : splitAstriction(formatAstriction.slice(1, -1), [',']).map(e => parseFormatAstriction(e, option)),
  };
  return at;
}
export function parseEnumerationAT (formatAstriction: string): EnumerationAT {
  if (!isEnumerationAstriction(formatAstriction)) {
    throw new TypeError('');
  }
  let type: ReturnType<typeof parseEnumerationAT>['type'] = NaN;
  if (isSingleStringEnumeration(formatAstriction) || isDoubleStringEnumeration(formatAstriction)) {
    type = '';
    const length = formatAstriction.length - 1;
    for (let i = 1; i < length; i++) {
      let ch = formatAstriction[i];
      if (ch === '\\') {
        if (i === length - 1) {
          throw new TypeError('');
        }
        const nextCh = formatAstriction[i + 1];
        if (isEscapeCharacter(nextCh)) {
          ch = ESCAPE_CHARACTER.get(nextCh)!;
        } else {
          ch = nextCh;
        }
        i++;
      }
      type += ch;
    }
  } else if (isTrueEnumeration(formatAstriction)) {
    type = true;
  } else if (isFalseEnumeration(formatAstriction)) {
    type = false;
  } else if (isNumberEnumeration(formatAstriction)) {
    type = Number(formatAstriction);
  }
  return {
    classification: 'enumeration',
    type,
  };
}

const parseFormatAstriction = (formatAstriction: string, option: AstrictionOption): AbstractTypeTree => {
  const att: AbstractTypeTree = [];
  for (const astriction of getFlatAstrictionList(formatAstriction)) {
    if (isParenthesesAstriction(astriction)) {
      att.push(...parseFormatAstriction(astriction.slice(1, -1), option));
    } else if (isPrimitiveAstriction(astriction, option.primitive)) {
      att.push({
        classification: 'primitive',
        type: astriction,
      });
    } else if (isObjectAstriction(astriction)) {
      att.push(parseObjectAT(astriction, option));
    } else if (isArrayAstriction(astriction)) {
      att.push(parseArrayAT(astriction, option));
    } else if (isTupleAstriction(astriction)) {
      att.push(parseTupleAT(astriction, option));
    } else if (isEnumerationAstriction(astriction)) {
      att.push(parseEnumerationAT(astriction));
    } else {
      throw new TypeError('');
    }
  }
  if (att.length === 0) {
    throw new TypeError('');
  }
  return att;
};
export const parseRawAstriction = (rawAstriction: string, option: AstrictionOption): AbstractTypeTree => {
  const stringBuffer: string = rawAstriction;
  let i: number = stringBuffer.length;
  while (stringBuffer[i - 1] === ';' && i > 0) {
    i--;
  }

  return parseFormatAstriction(stringBuffer.slice(0, i), option);
};

const typeChecker = (val: any, att: AbstractTypeTree, option: CheckOption): boolean => {
  for (const node of att) {
    if (isPrimitiveAT(node)) {
      if (checkPrimitiveAT(val, node)) {
        return true;
      }
    } else if (isArrayAT(node)) {
      if (checkArrayAT(val, node, option)) {
        return true;
      }
    } else if (isObjectAT(node)) {
      if (checkObjectAT(val, node, option)) {
        return true;
      }
    } else if (isTupleAT(node)) {
      if (checkTupleAT(val, node, option)) {
        return true;
      }
    } else if (isEnumerationAT(node)) {
      if (checkEnumerationAT(val, node)) {
        return true;
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const err: never = node;
      throw new TypeError('');
    }
  }
  return false;
};
const DEFAULT_IS_STRUCTURAL: boolean = true;

export const DEFAULT_PRIMITIVE: Set<Primitive> = new Set([
  'any',
  'never',
  'object',
  'number',
  'string',
  'boolean',
  'undefined',
  'null',
  'symbol',
  'bigint',
]);

export const JSON_PRIMITIVE: Set<Primitive> = new Set([
  'any',
  'never',
  'object',
  'number',
  'string',
  'boolean',
  'null',
]);
export const DEFAULT_CHECK_VARIABLE_NAME: AstrictionOption['checkVariableName'] = (v: string) => {
  return IDENTIFIER.test(v);
};

interface CheckAstrictionOption {
  checkVariableName?: AstrictionOption['checkVariableName'];
}
interface CheckValueOption {
  structural?: boolean;
}
type CheckFunc = (val: any, option?: CheckValueOption) => boolean;
type CreateCheckFunc = (astriction: string, option?: CheckAstrictionOption) => CheckFunc
type CheckAstrictionFunc = (astriction: string, option?: CheckAstrictionOption) => boolean

const checkAstrictionString = (primitive: Set<Primitive>, astriction: string, option?: CheckAstrictionOption): boolean => {
  const {
    checkVariableName = DEFAULT_CHECK_VARIABLE_NAME,
  } = option ?? {};

  let att: AbstractTypeTree;
  try {
    att = parseRawAstriction(astriction, {
      primitive,
      checkVariableName,
    },
    );
  } catch (e) {
    att = [];
  }
  return att.length > 0;
};

/**
 * 此函数不会抛出错误
 */
const createCheck = (att: AbstractTypeTree): CheckFunc => {
  /**
   * @summary 校验类型
   * @param {boolean} [option.structural=true] - 是否根据"{@link https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html#structural-type-system 形状}"来检查值的类型，默认为`true`
   * @returns {boolean}
   */
  return function check (val, option) {
    const {
      structural = DEFAULT_IS_STRUCTURAL,
    } = option ?? {};
    return typeChecker(val, att, {
      isStructuralTyping: Boolean(structural),
    });
  };
};
/**
 * @summary 根据约束字符串创建一个类型检查函数
 * @param {string} astriction - 约束字符串
 * @param {function} [option.checkVariableName] - 该函数将用于判断对象的属性名是否合法。默认规则为/^[_a-zA-Z$][_a-zA-Z$\d]*$/
 * @returns {function}
 * @throws 如果输入参数不合法，函数将抛出一个TypeError错误
 */
export const withCheck: CreateCheckFunc = (astriction, option) => {
  if (typeof astriction === 'undefined') {
    throw new TypeError('Failed to execute \'withCheck\': 2 argument required, but only 1 present.');
  } else if (typeof astriction !== 'string') {
    throw new TypeError('Failed to execute \'withCheck\': The second parameter must be a string type.');
  }

  const {
    checkVariableName = DEFAULT_CHECK_VARIABLE_NAME,
  } = option ?? {};

  if (typeof checkVariableName !== 'function') {
    throw new TypeError('Failed to execute \'withCheck\': The checkVariableName must be a function.');
  }
  let att: AbstractTypeTree;
  try {
    att = parseRawAstriction(astriction, {
      primitive: DEFAULT_PRIMITIVE,
      checkVariableName,
    });
  } catch (e) {
    throw new TypeError(`Failed to execute 'withCheck': '${astriction}' is not a valid astriction.`);
  }
  return createCheck(att);
};
/**
 * @summary 检查约束字符串是否合法
 * @param {string} astriction - 约束字符串
 * @param {function} [option.checkVariableName] - 该函数将用于判断对象的属性名是否合法。默认规则为/^[_a-zA-Z$][_a-zA-Z$\d]*$/
 * @returns {boolean}
 */
export const checkAstriction: CheckAstrictionFunc = (astriction, option) => {
  return checkAstrictionString(DEFAULT_PRIMITIVE, astriction, option);
};
/**
 * 使用此方法将更严格地校验约束字符串。
 * 例如: "{a: undefined}" 会抛出一个错误。因为JSON.parse的返回值中不可能有undefined类型。
 * @summary 根据约束字符串创建一个检查JSON.parse的返回值的类型的函数
 * @param {string} astriction - 约束字符串
 * @param {function} [option.checkVariableName] - 该函数将用于判断对象的属性名是否合法。默认规则为/^[_a-zA-Z$][_a-zA-Z$\d]*$/
 * @returns {function}
 * @throws 如果输入参数不合法，函数将抛出一个TypeError错误
 */
export const withCheckJSON: CreateCheckFunc = (astriction, option) => {
  if (typeof astriction === 'undefined') {
    throw new TypeError('Failed to execute \'withCheckJSON\': 2 argument required, but only 1 present.');
  } else if (typeof astriction !== 'string') {
    throw new TypeError('Failed to execute \'withCheckJSON\': The second parameter must be a string type.');
  }

  const {
    checkVariableName = DEFAULT_CHECK_VARIABLE_NAME,
  } = option ?? {};

  if (typeof checkVariableName !== 'function') {
    throw new TypeError('Failed to execute \'withCheckJSON\': The checkVariableName must be a function.');
  }

  let att: AbstractTypeTree;
  try {
    att = parseRawAstriction(astriction, {
      primitive: JSON_PRIMITIVE,
      checkVariableName,
    });
  } catch (e) {
    throw new TypeError(`Failed to execute 'withCheckJSON': '${astriction}' is not a valid astriction.`);
  }

  return createCheck(att);
};
/**
 * 使用此方法将更严格地校验约束字符串。
 * 例如: "{a: undefined}" 将返回flase。因为JSON中不可能有undefined类型的值。
 * @summary 检查用于校验JSON.parse返回值的约束字符串是否合法
 * @param {string} astriction - 约束字符串
 * @param {function} [option.checkVariableName] - 该函数将用于判断对象的属性名是否合法。默认规则为/^[_a-zA-Z$][_a-zA-Z$\d]*$/
 * @returns {boolean}
 */
export const checkJSONAstriction: CheckAstrictionFunc = (astriction, option) => {
  return checkAstrictionString(JSON_PRIMITIVE, astriction, option);
};
