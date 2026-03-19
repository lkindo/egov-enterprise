import { describe, it, expect } from 'vitest';
import { selectFields, selectFieldsList } from '../serialization';

describe('serialization utils', () => {
 const mockData = { id: 1, name: 'Test', secret: '1234', date: '2024' };

 it('selectFields should pick only specified fields', () => {
 const result = selectFields(mockData, ['id', 'name']);
 expect(result).toEqual({ id: 1, name: 'Test' });
 expect(result).not.toHaveProperty('secret');
 });

 it('selectFieldsList should pick fields for all items in array', () => {
 const dataList = [
 { id: 1, val: 'a', extra: 'x' },
 { id: 2, val: 'b', extra: 'y' }
 ];
 const result = selectFieldsList(dataList, ['id', 'val']);
 expect(result).toEqual([
 { id: 1, val: 'a' },
 { id: 2, val: 'b' }
 ]);
 });
});
