from collections import deque
import sys

def process_log(f):
    last_20 = deque(maxlen=20)
    # queue of active Block objects
    active_blocks = deque()
    # Buffer for the final output lines
    output_lines = []
    found_exception = False

    class Block:
        def __init__(self, index, header):
            self.index = index
            self.header = header
            self.context = []
            self.remaining = 5

        def add_context(self, line):
            if self.remaining > 0:
                self.context.append(line)
                self.remaining -= 1

        def is_complete(self):
            return self.remaining == 0

        def to_lines(self):
            lines = [f"Line {self.index}: {self.header.strip()}"]
            for ctx in self.context:
                lines.append(f"    {ctx.strip()}")
            return lines

    # Iterate line by line
    # The iteration itself might raise UnicodeDecodeError if encoding is wrong
    for i, line in enumerate(f):
        last_20.append(line)

        # Update existing blocks with context
        for block in active_blocks:
            block.add_context(line)

        # Check if current line starts a new exception block
        if "Exception" in line or "Caused by" in line:
            found_exception = True
            new_block = Block(i, line)
            active_blocks.append(new_block)

        # Move completed blocks to output
        # Since blocks are added in order, we only need to check the head
        while active_blocks and active_blocks[0].is_complete():
            block = active_blocks.popleft()
            output_lines.extend(block.to_lines())

    # Flush any remaining incomplete blocks (EOF reached)
    while active_blocks:
        block = active_blocks.popleft()
        output_lines.extend(block.to_lines())

    if not found_exception:
        output_lines.append("No Exception or Caused by found.")
        output_lines.append("Last 20 lines:")
        for line in last_20:
            output_lines.append(line.strip())

    return output_lines

try:
    with open('startup.txt', 'r', encoding='utf-16') as f:
        output = process_log(f)
except UnicodeError:
    try:
        with open('startup.txt', 'r', encoding='utf-8') as f:
            output = process_log(f)
    except UnicodeError:
        with open('startup.txt', 'r', encoding='cp949') as f:
            output = process_log(f)

for line in output:
    print(line)
