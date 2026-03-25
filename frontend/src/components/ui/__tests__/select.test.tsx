import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '../select';
import React from 'react';

describe('Select Component', () => {
 it('renders and allows selection', async () => {
 const onValueChange = vi.fn();
 render(
 <Select onValueChange={onValueChange}>
 <SelectTrigger aria-label="선택 ">
 <SelectValue placeholder="선택 " />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="opt1">옵션 1</SelectItem>
 <SelectItem value="opt2">Option 2</SelectItem>
 </SelectContent>
 </Select>
 );

 const trigger = screen.getByLabelText(/선택/);
 expect(trigger).toBeInTheDocument();

 // In JSDOM/Radix, we often need to click to open and find items
 fireEvent.click(trigger);
 const item = await screen.findByText('옵션 1');
 fireEvent.click(item);

 expect(onValueChange).toHaveBeenCalledWith('opt1');
 });
});
