/**
 * A simple TypeScript web library template
 */

export function hello(name: string): string {
    return `Hello, ${name}! Welcome to your TypeScript web library.`;
}

export function add(a: number, b: number): number {
    return a + b;
}

export function multiply(a: number, b: number): number {
    return a * b;
}

export class Calculator {
    private result: number = 0;

    public add(value: number): Calculator {
        this.result += value;
        return this;
    }

    public subtract(value: number): Calculator {
        this.result -= value;
        return this;
    }

    public multiply(value: number): Calculator {
        this.result *= value;
        return this;
    }

    public divide(value: number): Calculator {
        if (value === 0) {
            throw new Error('Cannot divide by zero');
        }
        this.result /= value;
        return this;
    }

    public getResult(): number {
        return this.result;
    }

    public reset(): Calculator {
        this.result = 0;
        return this;
    }
}

// Export everything as default for UMD builds
export default {
    hello,
    add,
    multiply,
    Calculator,
};