import {
  DEFAULT_CHECK_VARIABLE_NAME,
  DEFAULT_PRIMITIVE,
  getFlatAstrictionList,
  parseArrayAT,
  parseRawAstriction,
  parseObjectAT,
  withCheck,
  checkAstriction,
  checkJSONAstriction,
  withCheckJSON,
} from '../src/index';
describe('内部函数测试', () => {
  test('转义测试', () => {
    expect(() => {
      getFlatAstrictionList('"a""');
    }).toThrow();
    expect(() => {
      getFlatAstrictionList('\t');
    }).toThrow();
    expect(getFlatAstrictionList('"abc"')).toEqual(
      ['"abc"'],
    );
    expect(getFlatAstrictionList('"a\'b c\'"')).toEqual(
      ['"a\'b c\'"'],
    );
    expect(getFlatAstrictionList('"\\""')).toEqual(
      ['"\\""'],
    );
    expect(getFlatAstrictionList('"abc|d"|number')).toEqual(
      [
        '"abc|d"',
        'number',
      ],
    );
    expect(getFlatAstrictionList('"abc""abc"|"abc"')).toEqual(
      [
        '"abc""abc"',
        '"abc"',
      ],
    );
    expect(getFlatAstrictionList('"abc\\"你好\\""')).toEqual(
      ['"abc\\"你好\\""'],
    );
    expect(getFlatAstrictionList(`
"
"|"\t"|"  "|"\v\\""`)).toEqual(
      [
        '"\n"',
        '"\t"',
        '"  "',
        '"\v\\""',
      ],
    );
  });
  test('getAstrictionList', () => {
    expect(() => {
      getFlatAstrictionList('');
    }).toThrow();
    expect(() => {
      getFlatAstrictionList('(number|string)(');
    }).toThrow();
    expect(() => {
      getFlatAstrictionList('(number|st)ring)(');
    }).toThrow();
    expect(getFlatAstrictionList('number')).toIncludeSameMembers(['number']);
    expect(getFlatAstrictionList('number|string')).toIncludeSameMembers([
      'number',
      'string',
    ]);
    expect(getFlatAstrictionList('number|string|null')).toIncludeSameMembers([
      'number',
      'string',
      'null',
    ]);
    expect(getFlatAstrictionList('number|{a:number|string;b:number}|null')).toIncludeSameMembers([
      'number',
      '{a:number|string;b:number}',
      'null',
    ]);
    expect(getFlatAstrictionList('number|{a:number|string;b:number;c:{d:null;e:null|string;}}|{f:number|string}|null')).toIncludeSameMembers([
      'number',
      '{a:number|string;b:number;c:{d:null;e:null|string;}}',
      '{f:number|string}',
      'null',
    ]);

    expect(() => {
      getFlatAstrictionList('|');
    }).toThrow();

    expect(() => {
      getFlatAstrictionList('|number|string');
    }).toThrow();

    expect(() => {
      getFlatAstrictionList('|number|string|');
    }).toThrow();

    expect(() => {
      getFlatAstrictionList('number|string|');
    }).toThrow();

    expect(() => {
      getFlatAstrictionList('{');
    }).toThrow();

    expect(() => {
      getFlatAstrictionList('}');
    }).toThrow();

    expect(() => {
      getFlatAstrictionList('{a:number}}');
    }).toThrow();

    expect(() => {
      getFlatAstrictionList('{{a:number}');
    }).toThrow();

    expect(getFlatAstrictionList('Array<number>')).toIncludeSameMembers(['Array<number>']);
    expect(getFlatAstrictionList('Array<number>|number|(null|string)[]')).toIncludeSameMembers([
      'Array<number>',
      'number',
      '(null|string)[]',
    ]);
    expect(getFlatAstrictionList('Array<number>|number|(null|string)[]')).toIncludeSameMembers([
      'Array<number>',
      'number',
      '(null|string)[]',
    ]);
    expect(getFlatAstrictionList('Ar(raynum)ber(string)c|a')).toIncludeSameMembers([
      'Ar(raynum)ber(string)c',
      'a',
    ]);
    expect(getFlatAstrictionList('ArArray<(number)|s>')).toIncludeSameMembers(['ArArray<(number)|s>']);
    expect(getFlatAstrictionList('(null|(string|number))[]')).toIncludeSameMembers(['(null|(string|number))[]']);
    expect(getFlatAstrictionList('Array<number|string>')).toIncludeSameMembers(['Array<number|string>']);
    expect(getFlatAstrictionList('Array<number|string>|{a:number|Array<number|string>;b:number;c:{d:null;e:null[]|string;}}|boolean|(string|null)[]')).toIncludeSameMembers([
      'Array<number|string>',
      '{a:number|Array<number|string>;b:number;c:{d:null;e:null[]|string;}}',
      'boolean',
      '(string|null)[]',
    ]);
  });
  test('parseArrayAT', () => {
    const _parseArrayAT = (v: string): ReturnType<typeof parseArrayAT> => {
      return parseArrayAT(v, {
        primitive: DEFAULT_PRIMITIVE,
        checkVariableName: DEFAULT_CHECK_VARIABLE_NAME,
      });
    };
    expect(() => {
      _parseArrayAT('[]');
    }).toThrow();
    expect(() => {
      _parseArrayAT('Array<>');
    }).toThrow();
    expect(() => {
      _parseArrayAT('n[]');
    }).toThrow();
    expect(() => {
      _parseArrayAT('Array<n>');
    }).toThrow();
    expect(() => {
      _parseArrayAT('(number|{a?:number|}|string)[]');
    }).toThrow();
    expect(() => {
      _parseArrayAT('Array<number|{a?:number|}|string>');
    }).toThrow();
    expect(_parseArrayAT('number[]')).toEqual({
      classification: 'array',
      type: [{
        classification: 'primitive',
        type: 'number',
      }],
    });

    expect(_parseArrayAT('Array<number>')).toEqual({
      classification: 'array',
      type: [{
        classification: 'primitive',
        type: 'number',
      }],
    });
    expect(_parseArrayAT('(number)[]')).toEqual({
      classification: 'array',
      type: [{
        classification: 'primitive',
        type: 'number',
      }],
    });
    expect(_parseArrayAT('Array<(number)>')).toEqual({
      classification: 'array',
      type: [{
        classification: 'primitive',
        type: 'number',
      }],
    });
    expect(_parseArrayAT('(number|string)[]')).toEqual({
      classification: 'array',
      type: [
        {
          classification: 'primitive',
          type: 'number',
        },
        {
          classification: 'primitive',
          type: 'string',
        },
      ],
    });
    expect(_parseArrayAT('Array<number|string>')).toEqual({
      classification: 'array',
      type: [
        {
          classification: 'primitive',
          type: 'number',
        },
        {
          classification: 'primitive',
          type: 'string',
        },
      ],
    });
    expect(_parseArrayAT('(number|{a:number|string}|string)[]')).toEqual(
      {
        classification: 'array',
        type: [
          {
            classification: 'primitive',
            type: 'number',
          },
          {
            classification: 'object',
            mappedTypes: {
              number: null,
              string: null,
              symbol: null,
            },
            type: new Map([[
              'a',
              {
                isRequired: true,
                type: [
                  {
                    classification: 'primitive',
                    type: 'number',
                  },
                  {
                    classification: 'primitive',
                    type: 'string',
                  },
                ],
              },
            ]]),
          },
          {
            classification: 'primitive',
            type: 'string',
          },
        ],
      },
    );
    expect(_parseArrayAT('Array<number|{a:number|string}|string>')).toEqual(
      {
        classification: 'array',
        type: [
          {
            classification: 'primitive',
            type: 'number',
          },
          {
            classification: 'object',
            mappedTypes: {
              number: null,
              string: null,
              symbol: null,
            },
            type: new Map([[
              'a',
              {
                isRequired: true,
                type: [
                  {
                    classification: 'primitive',
                    type: 'number',
                  },
                  {
                    classification: 'primitive',
                    type: 'string',
                  },
                ],
              },
            ]]),
          },
          {
            classification: 'primitive',
            type: 'string',
          },
        ],
      },
    );
    expect(_parseArrayAT('(number|{a:number|string;b?:null}|string)[]')).toEqual(
      {
        classification: 'array',
        type: [
          {
            classification: 'primitive',
            type: 'number',
          },
          {
            classification: 'object',
            mappedTypes: {
              number: null,
              string: null,
              symbol: null,
            },
            type: new Map([
              [
                'a',
                {
                  isRequired: true,
                  type: [
                    {
                      classification: 'primitive',
                      type: 'number',
                    },
                    {
                      classification: 'primitive',
                      type: 'string',
                    },
                  ],
                },
              ],
              [
                'b',
                {
                  isRequired: false,
                  type: [{
                    classification: 'primitive',
                    type: 'null',
                  }],
                },
              ],
            ]),
          },
          {
            classification: 'primitive',
            type: 'string',
          },
        ],
      },
    );
    expect(_parseArrayAT('Array<number|{a:number|string;b?:null}|string>')).toEqual(
      {
        classification: 'array',
        type: [
          {
            classification: 'primitive',
            type: 'number',
          },
          {
            classification: 'object',
            mappedTypes: {
              number: null,
              string: null,
              symbol: null,
            },
            type: new Map([
              [
                'a',
                {
                  isRequired: true,
                  type: [
                    {
                      classification: 'primitive',
                      type: 'number',
                    },
                    {
                      classification: 'primitive',
                      type: 'string',
                    },
                  ],
                },
              ],
              [
                'b',
                {
                  isRequired: false,
                  type: [{
                    classification: 'primitive',
                    type: 'null',
                  }],
                },
              ],
            ]),
          },
          {
            classification: 'primitive',
            type: 'string',
          },
        ],
      },
    );
  });
  test('parseObjectAT', () => {
    const _parseObjectAT = (v: string): ReturnType<typeof parseObjectAT> => {
      return parseObjectAT(v, {
        primitive: DEFAULT_PRIMITIVE,
        checkVariableName: DEFAULT_CHECK_VARIABLE_NAME,
      });
    };
    expect(() => {
      _parseObjectAT('{a:number;;}');
    }).toThrow();
    expect(() => {
      _parseObjectAT('{a:number,,}');
    }).toThrow();
    expect(() => {
      _parseObjectAT('{a}');
    }).toThrow();
    expect(() => {
      _parseObjectAT('{{}}');
    }).toThrow();
    expect(() => {
      _parseObjectAT('{}{}');
    }).toThrow();
    expect(_parseObjectAT('{}')).toEqual({
      classification: 'object',
      mappedTypes: {
        number: null,
        string: null,
        symbol: null,
      },
      type: new Map(),
    });
    expect(_parseObjectAT('{a:number}')).toEqual({
      classification: 'object',
      mappedTypes: {
        number: null,
        string: null,
        symbol: null,
      },
      type: new Map([[
        'a',
        {
          type: [{
            classification: 'primitive',
            type: 'number',
          }],
          isRequired: true,
        },
      ]]),
    });
    expect(_parseObjectAT('{a:number;}')).toEqual({
      classification: 'object',
      mappedTypes: {
        number: null,
        string: null,
        symbol: null,
      },
      type: new Map([[
        'a',
        {
          type: [{
            classification: 'primitive',
            type: 'number',
          }],
          isRequired: true,
        },
      ]]),
    });
    expect(_parseObjectAT('{a:number,}')).toEqual({
      classification: 'object',
      mappedTypes: {
        number: null,
        string: null,
        symbol: null,
      },
      type: new Map([[
        'a',
        {
          type: [{
            classification: 'primitive',
            type: 'number',
          }],
          isRequired: true,
        },
      ]]),
    });
    expect(_parseObjectAT('{a?:number}')).toEqual({
      classification: 'object',
      mappedTypes: {
        number: null,
        string: null,
        symbol: null,
      },
      type: new Map([[
        'a',
        {
          type: [{
            classification: 'primitive',
            type: 'number',
          }],
          isRequired: false,
        },
      ]]),
    });
    expect(_parseObjectAT('{a?:number|string;}')).toEqual({
      classification: 'object',
      mappedTypes: {
        number: null,
        string: null,
        symbol: null,
      },
      type: new Map([[
        'a',
        {
          type: [
            {
              classification: 'primitive',
              type: 'number',
            },
            {
              classification: 'primitive',
              type: 'string',
            },
          ],
          isRequired: false,
        },
      ]]),
    });
    expect(_parseObjectAT('{a:number|number}')).toEqual({
      classification: 'object',
      mappedTypes: {
        number: null,
        string: null,
        symbol: null,
      },
      type: new Map([[
        'a',
        {
          type: [
            {
              classification: 'primitive',
              type: 'number',
            },
            {
              classification: 'primitive',
              type: 'number',
            },
          ],
          isRequired: true,
        },
      ]]),
    });
    expect(_parseObjectAT('{a:number|string,b:string}')).toEqual({
      classification: 'object',
      mappedTypes: {
        number: null,
        string: null,
        symbol: null,
      },
      type: new Map([
        [
          'a',
          {
            type: [
              {
                classification: 'primitive',
                type: 'number',
              },
              {
                classification: 'primitive',
                type: 'string',
              },
            ],
            isRequired: true,
          },
        ],
        [
          'b',
          {
            type: [{
              classification: 'primitive',
              type: 'string',
            }],
            isRequired: true,
          },
        ],
      ]),
    });
    expect(_parseObjectAT('{a:number|string;b:{h:number|Array<number>|string,c?:{d:number}},e?:number|number[]|string}')).toEqual({
      classification: 'object',
      mappedTypes: {
        number: null,
        string: null,
        symbol: null,
      },
      type: new Map([
        [
          'a',
          {
            type: [
              {
                classification: 'primitive',
                type: 'number',
              },
              {
                classification: 'primitive',
                type: 'string',
              },
            ],
            isRequired: true,
          },
        ],
        [
          'b',
          {
            type: [{
              classification: 'object',
              mappedTypes: {
                number: null,
                string: null,
                symbol: null,
              },
              type: new Map([
                [
                  'h',
                  {
                    type: [
                      {
                        classification: 'primitive',
                        type: 'number',
                      },
                      {
                        classification: 'array',
                        type: [{
                          classification: 'primitive',
                          type: 'number',
                        }],
                      },
                      {
                        classification: 'primitive',
                        type: 'string',
                      },
                    ],
                    isRequired: true,
                  },
                ],
                [
                  'c',
                  {
                    type: [{
                      classification: 'object',
                      mappedTypes: {
                        number: null,
                        string: null,
                        symbol: null,
                      },
                      type: new Map(
                        [[
                          'd',
                          {
                            type: [{
                              classification: 'primitive',
                              type: 'number',
                            }],
                            isRequired: true,
                          },
                        ]],
                      ),
                    }],
                    isRequired: false,
                  },
                ],
              ]),
            }],
            isRequired: true,
          },
        ],
        [
          'e',
          {
            type: [
              {
                classification: 'primitive',
                type: 'number',
              },
              {
                classification: 'array',
                type: [{
                  classification: 'primitive',
                  type: 'number',
                }],
              },
              {
                classification: 'primitive',
                type: 'string',
              },
            ],
            isRequired: false,
          },
        ],
      ]),
    });
  });
});

test('parseFlatAstriction', () => {
  const _parseAstriction = (v: string): ReturnType<typeof parseRawAstriction> => {
    return parseRawAstriction(v, {
      primitive: DEFAULT_PRIMITIVE,
      checkVariableName: DEFAULT_CHECK_VARIABLE_NAME,
    });
  };
  expect(_parseAstriction('"7asd\\""')).toEqual([{
    classification: 'enumeration',
    type: '7asd"',
  }]);
  expect(_parseAstriction('"这|里有一堆双引号\\"\\""|"\thello"|"\'\'\'\'\'\'"|1.5|true|false')).toEqual([
    {
      classification: 'enumeration',
      type: '这|里有一堆双引号""',
    },
    {
      classification: 'enumeration',
      type: '\thello',
    },
    {
      classification: 'enumeration',
      type: '\'\'\'\'\'\'',
    },
    {
      classification: 'enumeration',
      type: 1.5,
    },
    {
      classification: 'enumeration',
      type: true,
    },
    {
      classification: 'enumeration',
      type: false,
    },
  ]);
  expect(_parseAstriction('\'ab\'|number|"c"|true|{a:number}|boolean')).toEqual([
    {
      classification: 'enumeration',
      type: 'ab',
    },
    {
      classification: 'primitive',
      type: 'number',
    },
    {
      classification: 'enumeration',
      type: 'c',
    },
    {
      classification: 'enumeration',
      type: true,
    },
    {
      classification: 'object',
      mappedTypes: {
        number: null,
        string: null,
        symbol: null,
      },
      type: new Map([[
        'a',
        {
          type: [{
            classification: 'primitive',
            type: 'number',
          }],
          isRequired: true,
        },
      ]]),
    },
    {
      classification: 'primitive',
      type: 'boolean',
    },
  ]);
});
describe('check', () => {
  test('isStructuralTyping参数验证', () => {
    expect(
      withCheck(' { a: number; }')({
        a: 1,
      }, {
        structural: false,
      }),
    ).toBeTrue();
    expect(
      withCheck(' { a: number; }')({
        a: 1,
        b: 1,
      }, {
        structural: false,
      }),
    ).toBeFalse();

    expect(
      withCheck(' { a: number; }')({
        a: 1,
      }, {
        structural: true,
      }),
    ).toBeTrue();
    expect(
      withCheck(' { a: number; }')({
        a: 1,
        b: 1,
      }, {
        structural: true,
      }),
    ).toBeTrue();

    expect(
      withCheck('{ a: number; b?: string; }')({
        a: 1,
      }, {
        structural: false,
      }),
    ).toBeTrue();
    expect(
      withCheck('{ a: number; b?: string; }')({
        a: 1,
        b: '1',
      }, {
        structural: false,
      }),
    ).toBeTrue();
    expect(
      withCheck('{ a: number; b?: string; }')({
        a: 1,
      }, {
        structural: true,
      }),
    ).toBeTrue();
    expect(
      withCheck('{ a: number; b?: string; }')({
        a: 1,
        b: '1',
      }, {
        structural: true,
      }),
    ).toBeTrue();
  });
  test('枚举验证', () => {
    expect(
      withCheck(' 1 | \'2\'')(1),
    ).toBeTrue();
    expect(withCheck(' 1 | \'2\'')(2)).toBeFalse();
    expect(withCheck('false')(true)).toBeFalse();
    expect(withCheck('false')(false)).toBeTrue();
    expect(
      withCheck(`{
      a: true | .1;
    }`)({
        a: true,
      }),
    ).toBeTrue();
    expect(
      withCheck(`{
      a: true | .1;
    }`)({
        a: 0.1,
      }),
    ).toBeTrue();
    expect(
      withCheck(`{
      a?: true | .1;
    }`)({
        a: false,
      }),
    ).toBeFalse();
  });
  test('定制属性的变量名', () => {
    expect(checkAstriction(`{
      1a:10
    }`)).toBeFalse();

    expect(checkAstriction(`{
      1a:10
    }`, {
      checkVariableName (v): boolean {
        return /^[_a-zA-Z\d][_a-zA-Z\d]*$/.test(v);
      },
    })).toBeTrue();

    expect(() => {
      withCheck(`{
        1a:10
      }`)({
        '1a': 10,
      });
    }).toThrow();
    expect(
      withCheck(`{
      1a:10
    }`, {
        checkVariableName (v): boolean {
          return /^[_a-zA-Z\d][_a-zA-Z\d]*$/.test(v);
        },
      })({
        '1a': 10,
      }),
    ).toBeTrue();
  });
  test('JSON定制', () => {
    expect(checkJSONAstriction(`{
      a: null
    }`)).toBeTrue();
    expect(checkJSONAstriction(`{
      a: undefined
    }`)).toBeFalse();
    expect(checkJSONAstriction(`{
      a: null|undefined
    }`)).toBeFalse();
  });
  test('额外', () => {
    expect(() => {
      withCheck('any,')(0);
    }).toThrow();

    expect(() => {
      withCheck('anyy')(0);
    }).toThrow();

    expect(() => {
      withCheck('{1a:number;}')({
        '1a': 1,
      });
    }).toThrow();

    expect(withCheck('any;')(new Date())).toBeTrue();
    expect(withCheck('object')(new Date())).toBeTrue();
    expect(withCheck('object')(() => { })).toBeTrue();
    expect(withCheck('any;')(0)).toBeTrue();
    expect(withCheck('any;;')(0)).toBeTrue();

    expect(withCheck('any')(0)).toBeTrue();
    expect(
      withCheck('object')({
        a: 1,
      }),
    ).toBeTrue();
    expect(withCheck('number')(NaN)).toBeTrue();
    expect(withCheck('string')('a')).toBeTrue();
    expect(withCheck('boolean')(true)).toBeTrue();
    expect(withCheck('undefined')(undefined)).toBeTrue();
    expect(withCheck('null')(null)).toBeTrue();
    expect(withCheck('symbol')(Symbol(''))).toBeTrue();
    expect(withCheck('bigint')(10n)).toBeTrue();

    expect(withCheck('any')(0)).toBeTrue();
    expect(withCheck('any')({
      a: 1,
    })).toBeTrue();
    expect(withCheck('any')(NaN)).toBeTrue();
    expect(withCheck('any')('a')).toBeTrue();
    expect(withCheck('any')(true)).toBeTrue();
    expect(withCheck('any')(undefined)).toBeTrue();
    expect(withCheck('any')(null)).toBeTrue();
    expect(withCheck('any')(Symbol(''))).toBeTrue();
    expect(withCheck('any')(10n)).toBeTrue();

    expect(
      withCheck('number')({
        a: 1,
      })).toBeFalse();
    expect(withCheck('number')(NaN)).toBeTrue();
    expect(withCheck('number')('a')).toBeFalse();
    expect(withCheck('number')(true)).toBeFalse();
    expect(withCheck('number')(undefined)).toBeFalse();
    expect(withCheck('number')(null)).toBeFalse();
    expect(withCheck('number')(Symbol(''))).toBeFalse();
    expect(withCheck('number')(10n)).toBeFalse();

    expect(withCheck('{a:number}')(null)).toBeFalse();
    expect(withCheck('{}')(null)).toBeFalse();
    expect(withCheck('undefined')(null)).toBeFalse();

    expect(withCheck('{}')({})).toBeTrue();
    expect(
      withCheck('{}')({
        a: 1,
      }),
    ).toBeTrue();
    expect(
      withCheck('{}')({
        a: 1,
      }, {
        structural: false,
      }),
    ).toBeFalse();
    expect(
      withCheck('{a:number|string}')({
        a: 1,
      }, {
        structural: false,
      }),
    ).toBeTrue();
    expect(
      withCheck('{a:number|string}')({
        a: 1,
        c: 2,
      }, {
        structural: false,
      }),
    ).toBeFalse();

    expect(
      withCheck('{a?:number|string}')({
        a: false,
      }),
    ).toBeFalse();

    expect(
      withCheck('Array<number|string>')([
        1,
        'a',
      ]),
    ).toBeTrue();

    expect(withCheck('null|string[]')(['a'])).toBeTrue();
    expect(withCheck('null|string[]')([])).toBeTrue();
    expect(withCheck('null|string[]')(null)).toBeTrue();
    expect(withCheck('null[]')([null])).toBeTrue();
    expect(withCheck('null[]|string[]')([null])).toBeTrue();
    expect(withCheck('null[]|string[]')([''])).toBeTrue();
    expect(withCheck('null[]|string[]')([
      '',
      null,
    ])).toBeFalse();
    expect(
      withCheck(`(null | string | {
      a?: string;
      b: boolean;
    })[]`)([
        'a',
        null,
        {
          a: 'a',
          b: true,
        },
        {
          a: 'a',
          b: true,
          c: 1,
        },
        {
          b: true,
          c: 1,
        },
      ]),
    ).toBeTrue();
    expect(withCheck('bigint[]')([1])).toBeFalse();
    expect(withCheck('bigint[]')([10n])).toBeTrue();

    expect(withCheck('[number]')([1])).toBeTrue();
    expect(
      withCheck('[number]')([
        1,
        2,
      ]),
    ).toBeFalse();

    expect(
      withCheck('[number,null  | boolean]')(
        [
          1,
          '2',
        ],
      ),
    ).toBeFalse();
    expect(withCheck('[number|string]')(['1'])).toBeTrue();
    expect(withCheck('[number|string]')([1])).toBeTrue();
    expect(withCheck('[number|string,number]')([
      1,
      1,
    ])).toBeTrue();
    expect(
      withCheck('[number|{a:string},number]')(
        [
          {
            a: '1',
          },
          1,
        ],
      ),
    ).toBeTrue();
    expect(withCheck('[number|{a:string},number]')(
      [
        {
          a: 1,
        },
        1,
      ],
    )).toBeFalse();

    expect(
      withCheck(`
    "小明说：'你好'， 小红说\\"再见\\"🔋√"
    `)('小明说：\'你好\'， 小红说"再见"🔋√'),
    ).toBeTrue();
    expect(
      withCheck(`"
正确"`)('\n正确'),
    ).toBeTrue();
    expect(
      withCheck(`{
  a:  "你好 再 见"
}`)({
        a: '你好 再 见',
      }),
    ).toBeTrue();

    expect(
      checkAstriction(`{
  a: "7asd\\"";
}`)).toBeTrue();
    expect(
      withCheck(`{
      a:{
        c: "7asd\\"" | 'asd\\'';
      }
}`)({
        a: {
          c: '7asd"',
        },
      }),
    ).toBeTrue();
  });

  expect(
    withCheck('\'asd\\\'\'')('asd\'')).toBeTrue();
  expect(
    checkAstriction('number{}')).toBeFalse();
  expect(
    checkAstriction('number{a}')).toBeFalse();
  expect(
    checkAstriction('"1"[]')).toBeTrue();
  expect(
    checkAstriction('"1\n"[]')).toBeTrue();
  expect(
    withCheck('"\n1"[]')([
      '\n1',
      '\n1',
    ]),
  ).toBeTrue();
  expect(
    checkAstriction('Array<"1\n"|"1">')).toBeTrue();
  expect(
    withCheck('Array<"1\n"|"1">')(
      [
        '1\n',
        '1',
      ],
    ),
  ).toBeTrue();
  expect(
    withCheck('Array<"1\n"|"1">')(
      [
        '\n1',
        '1',
      ],
    ),
  ).toBeFalse();
  expect(
    checkAstriction('("\n1"|"2")')).toBeTrue();
  expect(
    withCheck('("\n1"|"2")')('\n1'),
  ).toBeTrue();
  expect(
    withCheck('("\n1"|"2")')('2'),
  ).toBeTrue();
  expect(
    withCheck('("\n1"|"2")')('3'),
  ).toBeFalse();
  expect(
    checkAstriction('[("\n" | "1"),"2"]')).toBeTrue();

  expect(
    withCheck('[("\n" | "1"),"2"]')([
      '\n',
      '2',
    ]),
  ).toBeTrue();
  expect(
    withCheck('[("\n" | "1"),"2"]')([
      '1',
      '2',
    ]),
  ).toBeTrue();
  expect(
    withCheck('[("\n" | "1"),"2"]')([
      '1',
      '2',
      '2',
    ]),
  ).toBeFalse();
  expect(
    withCheck('[("\n" | "1"),"2"]')([
      '10',
      '2',
    ]),
  ).toBeFalse();
});

test('z', () => {
  // 基本类型
  expect(withCheck('any')(1)).toBeTrue();
  expect(withCheck('number')(1)).toBeTrue();
  expect(withCheck('object')({})).toBeTrue();

  // 数组
  expect(withCheck('number[]')([1])).toBeTrue();
  expect(withCheck('Array<number|string>')([
    1,
    'a',
  ])).toBeTrue();

  // 元组
  expect(
    withCheck('[number,null,string]')([
      1,
      null,
      'a',
    ]),
  ).toBeTrue();

  // 枚举
  expect(withCheck(`
  {
    foo: '1' | 2 | false
  }
  `,
  )({
    foo: '1',
  }),
  ).toBeTrue();

  // 支持转义符
  expect(withCheck(`
    {
      foo: '" a "' | "' b '";
      bar: "\\" a \\"" | '\\' b \\'',
      baz: "\n\t\\\\t"
    }
    `,
  )({
    foo: '" a "',
    bar: '\' b \'',
    baz: `
\t\\t`,
  }),
  ).toBeTrue();
  // 对象
  expect(withCheck(`
  {
    foo: string | number;
    bar: {
      baz?: null;
    };
  }
  `,
  )({
    foo: 'a',
    bar: {
      baz: null,
    },
  })).toBeTrue();
  // 结构判断
  expect(withCheck(`
  {
    foo: string | number;
    bar: {
      baz?: null;
    };
  }
  `,
  )({
    foo: 'a',
    bar: {
      baz: null,
    },
    other: 'pass',
  }, {
    structural: true,
  }),
  ).toBeTrue();
  expect(
    withCheck(`
  {
    foo: string | number;
    bar: {
      baz?: null;
    };
  }
  `,
    )({
      foo: 'a',
      bar: {
        baz: null,
      },
      other: 'error',
    }, {
      structural: false,
    }),
  ).toBeFalse();
});

test('typeCher', () => {
  expect(
    withCheck('{a:number;}')({
      a: 1,
      b: 1,
    }),
  ).toBeTrue();
  expect(
    withCheck('{a:number;}')(
      {
        a: 1,
        b: 1,
      },
      {
        structural: true,
      },
    ),
  ).toBeTrue();
  expect(
    withCheck('{a:number;}')(
      {
        a: 1,
        b: 1,
      },
      {
        structural: false,
      },
    ),
  ).toBeFalse();

  expect(() => {
    withCheck('{a:number;}', {
      checkVariableName (v) {
        if (v === 'a') { return false; }
        return true;
      },
    })({
      a: 1,
      b: 1,
    });
  }).toThrow();

  expect(
    withCheck('{a:number;}', {
      checkVariableName: undefined,
    })({
      a: 1,
      b: 1,
    }),
  ).toBeTrue();

  expect(checkAstriction('{a:number;}')).toBeTrue();
  expect(checkAstriction('{a:number;}', {
    checkVariableName (v) {
      if (v === 'a') { return false; }
      return true;
    },
  })).toBeFalse();
  // JSON
  expect(
    withCheck('{a:undefined;}')({
      a: undefined,
    }),
  ).toBeTrue();

  expect(() => {
    withCheckJSON('{a:undefined;}')({
      a: undefined,
    });
  }).toThrow();

  expect(
    withCheckJSON('{a:null;}')({
      a: null,
    }),
  ).toBeTrue();

  expect(
    withCheckJSON('{a:null;}')(
      {
        a: null,
        b: 1,
      },
      {
        structural: true,
      },
    ),
  ).toBeTrue();
  expect(
    withCheckJSON('{a:null;}')(
      {
        a: null,
        b: 1,
      },
      {
        structural: false,
      },
    ),
  ).toBeFalse();

  expect(
    withCheckJSON('{a:null;}', {
      checkVariableName: undefined,
    })({
      a: null,
    }),
  ).toBeTrue();

  expect(() => {
    withCheckJSON('{a:null;}', {
      checkVariableName: (v) => {
        return v !== 'a';
      },
    })({
      a: null,
    });
  }).toThrow();
  expect(
    withCheckJSON('{a:null;}', {
      checkVariableName: () => true,
    })({
      a: null,
    }),
  ).toBeTrue();

  expect(
    withCheck(`
      {
        a: "单引号'";
        b: '单引号\\'';
        c: "双引号\\"";
        d: '双引号"';
        e: "\n\t";
        f: "\\\\t";
      }
    `)({
      a: '单引号\'',
      b: '单引号\'',
      c: '双引号"',
      d: '双引号"',
      e: `
\t`,
      f: '\\t',
    }),
  ).toBeTrue();
});

test('json any', () => {
  expect(withCheckJSON('any[]')([undefined])).toBeTrue();
  expect(withCheckJSON('any')(undefined)).toBeTrue();
  expect(withCheckJSON('{a?:any}')({
    a: undefined,
  })).toBeTrue();
});
test('never', () => {
  expect(withCheck('never[]')([])).toBeTrue();
  expect(withCheck('never[]')([null])).toBeFalse();
  expect(withCheck('never')(0)).toBeFalse();
  expect(withCheck('never')(0n)).toBeFalse();
  expect(withCheck('never')(false)).toBeFalse();
  expect(withCheck('never')(null)).toBeFalse();
  expect(withCheck('never')(undefined)).toBeFalse();
});
test('other', () => {
  expect(withCheck('number|(string|boolean[]) ')([])).toBeTrue();
  expect(withCheck('number|(string|boolean[]) ')([false])).toBeTrue();
  expect(withCheck('number|(string|boolean[]) ')('1')).toBeTrue();
  expect(withCheck('number|(string|boolean[]) ')(1)).toBeTrue();
  expect(withCheck('number|(string|boolean[]) ')([1])).toBeFalse();
  expect(withCheck('number|(string|boolean[]) ')(['1'])).toBeFalse();
});
