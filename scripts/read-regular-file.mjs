import fs from 'node:fs';

/** Read the verified descriptor, so a path replacement cannot change the file. */
export function readRegularFile(file, { maximumBytes = 64 * 1024 * 1024, encoding } = {}) {
  const flags = fs.constants.O_RDONLY | (process.platform === 'win32'
    ? 0 : fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  const descriptor = fs.openSync(file, flags);
  try {
    const opened = fs.fstatSync(descriptor);
    const named = fs.lstatSync(file);
    if (!opened.isFile() || named.isSymbolicLink() || !named.isFile()
        || opened.dev !== named.dev || opened.ino !== named.ino
        || opened.size > maximumBytes) throw new Error('Expected a bounded regular file');
    const bytes = Buffer.alloc(Math.min(opened.size + 1, maximumBytes + 1));
    let length = 0;
    while (length < bytes.length) {
      const count = fs.readSync(descriptor, bytes, length, bytes.length - length, length);
      if (count === 0) break;
      length += count;
    }
    const after = fs.fstatSync(descriptor);
    if (length !== opened.size || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs) {
      throw new Error('File changed during the read');
    }
    const result = bytes.subarray(0, length);
    return encoding ? result.toString(encoding) : result;
  } finally { fs.closeSync(descriptor); }
}
