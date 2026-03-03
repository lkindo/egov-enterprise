import os

def parse_stack():
    with open('test-stack.txt', 'r', encoding='utf-8') as f:
        found = False
        count = 0
        for line in f:
            if 'FULL NAME GEN for PopupController' in line:
                found = True
                print("Found stack trace:")
                count = 0
            if found:
                print(line.strip())
                count += 1
                if count > 100:
                    found = False
                    print("-" * 20)

if __name__ == "__main__":
    parse_stack()
