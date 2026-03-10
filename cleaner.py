with open("verify_stack.log", "rb") as input_file:
    content = input_file.read()
cleaned = content.replace(b'\r', b'')
with open("verify_clean.log", "wb") as output_file:
    output_file.write(cleaned)
