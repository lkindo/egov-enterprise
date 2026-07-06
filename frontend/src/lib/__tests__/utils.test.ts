vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn utility', () => {
 it('should return empty string for no input', () => {
 expect(cn()).toBe('');
 });

 it('should return empty string for undefined input', () => {
 expect(cn(undefined)).toBe('');
 });

 it('should return empty string for null input', () => {
 expect(cn(null)).toBe('');
 });

 it('should return empty string for false input', () => {
 expect(cn(false)).toBe('');
 });

 it('should merge class strings', () => {
 expect(cn('class1', 'class2')).toBe('class1 class2');
 });

 it('should merge class strings with duplicates', () => {
 // Non-tailwind classes are not deduplicated by tailwind-merge by default
 expect(cn('class1', 'class1')).toBe('class1 class1');
 });

 it('should deduplicate tailwind classes', () => {
 expect(cn('p-4', 'p-4')).toBe('p-4');
 });

 it('should handle tailwind conflicts', () => {
 expect(cn('p-4', 'p-2')).toBe('p-2');
 expect(cn('px-4', 'px-2')).toBe('px-2');
 expect(cn('py-4', 'py-2')).toBe('py-2');
 expect(cn('m-4', 'm-2')).toBe('m-2');
 expect(cn('mx-4', 'mx-2')).toBe('mx-2');
 expect(cn('my-4', 'my-2')).toBe('my-2');
 expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
 expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
 });

 it('should handle conditional classes', () => {
 expect(cn('class1', true && 'class2')).toBe('class1 class2');
 expect(cn('class1', false && 'class2')).toBe('class1');
 });

 it('should handle arrays of classes', () => {
 expect(cn(['class1', 'class2'])).toBe('class1 class2');
 });

 it('should handle nested arrays of classes', () => {
 expect(cn(['class1', ['class2', 'class3']])).toBe('class1 class2 class3');
 });

 it('should handle objects with boolean values', () => {
 expect(cn({ class1: true, class2: false })).toBe('class1');
 });

 it('should handle mixed inputs', () => {
 expect(cn('class1', ['class2', { class3: true, class4: false }])).toBe('class1 class2 class3');
 });

 it('should handle complex tailwind conflict resolution', () => {
 // p-4 overrides px-2 and py-2? No, p-4 sets padding on all sides.
 // If p-4 comes after px-2, it overrides.
 expect(cn('px-2 py-2', 'p-4')).toBe('p-4');

 // If px-2 comes after p-4, it overrides horizontal padding.
 expect(cn('p-4', 'px-2')).toBe('p-4 px-2');
 });
});
