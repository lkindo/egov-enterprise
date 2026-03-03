import collections

with open('test-after-fix.txt', 'r', encoding='utf-8') as f:
    class_to_names = collections.defaultdict(list)
    for line in f:
        if 'DEBUG ALL BEAN:' in line:
            parts = line.split('BEAN: ')[1].split(' [')
            name = parts[0]
            clazz = parts[1].split('Class: ')[1].split(',')[0].strip()
            class_to_names[clazz].append(name)
    
    for clazz, names in class_to_names.items():
        if len(set(names)) > 1:
            print(f'DUPE: {clazz} -> {names}')
