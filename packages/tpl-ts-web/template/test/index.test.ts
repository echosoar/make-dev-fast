import { hello, add, multiply, Calculator } from '../src/index';

describe('Library Functions', () => {
    test('hello function should return greeting', () => {
        expect(hello('World')).toBe('Hello, World! Welcome to your TypeScript web library.');
    });

    test('add function should add two numbers', () => {
        expect(add(2, 3)).toBe(5);
        expect(add(-1, 1)).toBe(0);
        expect(add(0, 0)).toBe(0);
    });

    test('multiply function should multiply two numbers', () => {
        expect(multiply(2, 3)).toBe(6);
        expect(multiply(-2, 3)).toBe(-6);
        expect(multiply(0, 5)).toBe(0);
    });
});

describe('Calculator Class', () => {
    let calculator: Calculator;

    beforeEach(() => {
        calculator = new Calculator();
    });

    test('should start with result 0', () => {
        expect(calculator.getResult()).toBe(0);
    });

    test('should add numbers correctly', () => {
        calculator.add(5).add(3);
        expect(calculator.getResult()).toBe(8);
    });

    test('should subtract numbers correctly', () => {
        calculator.add(10).subtract(3);
        expect(calculator.getResult()).toBe(7);
    });

    test('should multiply numbers correctly', () => {
        calculator.add(5).multiply(3);
        expect(calculator.getResult()).toBe(15);
    });

    test('should divide numbers correctly', () => {
        calculator.add(10).divide(2);
        expect(calculator.getResult()).toBe(5);
    });

    test('should throw error when dividing by zero', () => {
        expect(() => calculator.divide(0)).toThrow('Cannot divide by zero');
    });

    test('should reset result to 0', () => {
        calculator.add(5).multiply(3).reset();
        expect(calculator.getResult()).toBe(0);
    });

    test('should chain operations', () => {
        const result = calculator.add(10).subtract(2).multiply(3).divide(4).getResult();
        expect(result).toBe(6);
    });
});