import {
  DEFAULT_PRIMITIVE,
  withCheck,
} from '../src/index';
import {
  Primitive,
} from '../src/types';

describe('Mapped Types', () => {
  test('an index signature parameter type must be \'string\', \'number\', \'symbol\', or a template literal type.', () => {
    const a: Primitive[] = [
      'string',
      'number',
      'symbol',
    ];
    for (const primitive of a) {
      expect(
        withCheck(`
          {
            [key:${primitive}]:number;
          }
        `),
      ).toBeFunction();
    }
    for (const primitive of [...DEFAULT_PRIMITIVE].filter(e => !a.includes(e))) {
      expect(() => {
        withCheck(`
          {
            [key:${primitive}]:number;
          }
        `);
      }).toThrow();
    }
  });
  test('\'number\' index must belong to \'string\' index.', () => {
    expect(
      withCheck(`
        {
          [key:string]: number | string;
          [key:number]: 1 | 2 | '3';
        }
      `),
    ).toBeFunction();
    expect(
      withCheck(`
        {
          [key:string]: boolean;
          [key:number]: true;
        }
      `))
      .toBeFunction();
    expect(
      withCheck(`
        {
          [key:string]: 1 | '1';
          [key:number]: '1';
        }
      `),
    ).toBeFunction();
    expect(
      withCheck(`
      {
        [key:string]: number[];
        [key:number]: [1,2];
      }
    `),
    ).toBeFunction();
    expect(
      withCheck(`
        {
          [key:string]: number[];
          [key:number]: [];
        }
      `),
    ).toBeFunction();
    expect(() => {
      withCheck(`
        {
          [key:string]: [];
          [key:number]: number[];
        }
      `);
    }).toThrow();
    expect(() => {
      withCheck(`
        {
          [key:string]: [1,2];
          [key:number]: [1];
        }
      `);
    }).toThrow();
    expect(() => {
      withCheck(`
        {
          [key:string]: [1,2];
          [key:number]: number[];
        }
      `);
    }).toThrow();
    expect(() => {
      withCheck(`
        {
          [key:string]: '2';
          [key:number]: '1' | string;
        }
      `);
    }).toThrow();
    expect(() => {
      withCheck(`
        {
          [key:string]: string;
          [key:number]: number;
        }
      `);
    }).toThrow();
  });
  test('\'number\' index priority is greater than \'string\' index.', () => {
    const check = withCheck(`
      {
        [key :string]:string | number;
        [key :number]:number;
      }
    `);
    expect(
      check({}),
    ).toBeTrue();
    expect(
      check({
        1: 0,
      }),
    ).toBeTrue();
    expect(
      check({
        1: '0',
      }),
    ).toBeFalse();
  });
  test('\'symbol\' index does not interfere with \'number\' index and \'string\' index', () => {
    expect(
      withCheck(`
      {
        [key:symbol]: boolean,
        [key:string]: number,
      }
    `),
    ).toBeFunction();
    expect(
      withCheck(`
      {
        [key:symbol]: boolean,
        [key:number]: number,
      }
    `),
    ).toBeFunction();
    expect(
      withCheck(`
      {
        [key:symbol]: boolean,
        [key:string]: number,
        [key:number]: number,
      }
    `),
    ).toBeFunction();
    const check = withCheck(`
      {
        [key : symbol]: boolean;
        [key : string]: number
      }
    `);
    expect(
      check({}),
    ).toBeTrue();
    expect(
      check({
        a: 1,
        [Symbol('')]: true,
      }),
    ).toBeTrue();
    expect(
      check({
        a: true,
        [Symbol('')]: true,
      }),
    ).toBeFalse();
    expect(
      check({
        a: 1,
        [Symbol('')]: 1,
      }),
    ).toBeFalse();
  });
  test('duplicate index signature', () => {
    expect(
      withCheck(`
      {
        [key:symbol]: number;
        [key:string]: number;
        [key:number]: number;
      }
    `),
    ).toBeFunction();
    expect(() => {
      withCheck(`
        {
          [key:symbol]: number,
          [key:symbol]: number,
        }
      `);
    }).toThrow();
    expect(() => {
      withCheck(`
        {
          [key:string]: number,
          [key:string]: number,
        }
      `);
    }).toThrow();
    expect(() => {
      withCheck(`
        {
          [key:number]: number,
          [key:number]: number,
        }
      `);
    }).toThrow();
  });
  test('\'symnol\' index signature', () => {
    const check = withCheck(`
      {
        [key : symbol]: number
      }
    `);
    expect(
      check({}),
    ).toBeTrue();
    expect(
      check({
        [Symbol('')]: 0,
      }),
    ).toBeTrue();
    expect(
      check({
        [Symbol('')]: '',
      }),
    ).toBeFalse();
    expect(
      check({
        [Symbol('')]: 0,
        [Symbol('')]: 0,
      }))
      .toBeTrue();
    expect(
      check({
        [Symbol('')]: 0,
        [Symbol('')]: '0',
      }),
    ).toBeFalse();
  });
  test('\'string\' index signature', () => {
    const check = withCheck(`
      {
        [key : string]: number
      }
    `);
    expect(
      check({}),
    ).toBeTrue();
    expect(
      check({
        k0: 0,
      }),
    ).toBeTrue();
    expect(
      check({
        k0: '',
      }),
    ).toBeFalse();
    expect(
      check({
        k0: 0,
        0: 0,
      }))
      .toBeTrue();
    expect(
      check({
        k0: 0,
        0: '0',
      }),
    ).toBeFalse();
  });
  test('\'number\' index signature', () => {
    const check = withCheck(`
      {
        [key : number]: number
      }
    `);
    expect(
      check({}),
    ).toBeTrue();
    expect(
      check({
        0: 0,
      }),
    ).toBeTrue();
    expect(
      check({
        0: '',
      }),
    ).toBeFalse();
    expect(
      check({
        0: 0,
      }))
      .toBeTrue();
    expect(
      check({
        0: 0,
        1: '0',
      }),
    ).toBeFalse();
  });
  test('support array', () => {
    const check = withCheck(`
      {
        [key : number]: number
      }
    `);
    expect(
      check({}),
    ).toBeTrue();
    expect(
      check({
        1: 0,
      }),
    ).toBeTrue();

    expect(
      check([]),
    ).toBeTrue();
    expect(
      check([1]),
    ).toBeTrue();
    expect(
      check([
        1,
        '1',
      ]),
    ).toBeFalse();
    expect(
      check(
        {
          a: 1,
        },
        {
          structural: false,
        },
      ),
    ).toBeFalse();
  });
  test('mapped types constrains the type of properties.', () => {
    expect(() => {
      withCheck(`
        {
          [key:string]:number;
          key : string;
        }
      `);
    }).toThrow();
    expect(() => {
      withCheck(`
        {
          [key:string]: 1 ;
          key : number;
        }
      `);
    }).toThrow();
    expect(() => {
      withCheck(`
        {
          [key:string]: [] ;
          key :any[];
        }
      `);
    }).toThrow();
    expect(
      withCheck(`
        {
          [key:string]:Array<any>;
          key : [1,2]
        }
      `),
    ).toBeFunction();
    expect(
      withCheck(`
        {
          [key:string]:number;
          key : 1
        }
      `),
    ).toBeFunction();
    expect(
      withCheck(`
        {
          [key:string]:number[];
          key : [1,2]
        }
      `),
    ).toBeFunction();
    expect(
      withCheck(`
        {
          [key:string]:number[];
          key : []
        }
      `),
    ).toBeFunction();
  });
  test('declare other properties', () => {
    const check = withCheck(`
      {
        [key:string]: string;
        key : string;
      }
    `);
    expect(
      check({
        key: '',
      }),
    ).toBeTrue();
    expect(
      check({
        key: '',
        foo: '',
      }),
    ).toBeTrue();

    expect(
      check({}),
    ).toBeFalse();
    expect(
      check({
        [Symbol('')]: '',
      }),
    ).toBeFalse();
    expect(
      check({
        k0: 0,
      }),
    ).toBeFalse();
    expect(
      check({
        key: '',
        k0: 0,
      }),
    ).toBeFalse();
    expect(
      check({
        key: '',
        k0: 0,
        k1: '',
      }),
    ).toBeFalse();
  });
});
