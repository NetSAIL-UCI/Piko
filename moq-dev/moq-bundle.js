var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// ../../../../tmp/moq-dev/js/lite/src/path.ts
var exports_path = {};
__export(exports_path, {
  stripPrefix: () => stripPrefix,
  join: () => join,
  hasPrefix: () => hasPrefix,
  from: () => from,
  empty: () => empty
});
function from(...paths) {
  const joined = paths.join("/");
  return joined.replace(/\/+/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}
function hasPrefix(prefix, path) {
  if (prefix === "") {
    return true;
  }
  if (!path.startsWith(prefix)) {
    return false;
  }
  if (path.length === prefix.length) {
    return true;
  }
  return path[prefix.length] === "/";
}
function stripPrefix(prefix, path) {
  if (!hasPrefix(prefix, path)) {
    return null;
  }
  if (prefix === "") {
    return path;
  }
  if (path.length === prefix.length) {
    return "";
  }
  return path.slice(prefix.length + 1);
}
function join(path, other) {
  if (path === "") {
    return other;
  } else if (other === "") {
    return path;
  } else {
    return `${path}/${other}`;
  }
}
function empty() {
  return "";
}

// ../../../../tmp/moq-dev/js/lite/src/ietf/version.ts
function versionName(v) {
  return VERSION_NAMES[v] ?? `unknown(0x${v.toString(16)})`;
}
var Version, ALPN, VERSION_NAMES;
var init_version = __esm(() => {
  Version = {
    DRAFT_07: 4278190087,
    DRAFT_14: 4278190094,
    DRAFT_15: 4278190095,
    DRAFT_16: 4278190096,
    DRAFT_17: 4278190097
  };
  ALPN = {
    DRAFT_14: "moq-00",
    DRAFT_15: "moqt-15",
    DRAFT_16: "moqt-16",
    DRAFT_17: "moqt-17"
  };
  VERSION_NAMES = {
    [Version.DRAFT_07]: "moq-transport-07",
    [Version.DRAFT_14]: "moq-transport-14",
    [Version.DRAFT_15]: "moq-transport-15",
    [Version.DRAFT_16]: "moq-transport-16",
    [Version.DRAFT_17]: "moq-transport-17"
  };
});

// ../../../../tmp/moq-dev/js/lite/src/varint.ts
var exports_varint = {};
__export(exports_varint, {
  sizeLeadingOnes: () => sizeLeadingOnes,
  size: () => size,
  encodeTo: () => encodeTo,
  encodeLeadingOnesTo: () => encodeLeadingOnesTo,
  encodeLeadingOnes: () => encodeLeadingOnes,
  encode: () => encode,
  decodeLeadingOnes: () => decodeLeadingOnes,
  decode: () => decode,
  MAX_U6: () => MAX_U6,
  MAX_U53: () => MAX_U53,
  MAX_U30: () => MAX_U30,
  MAX_U14: () => MAX_U14
});
function sizeLeadingOnes(v) {
  const b = BigInt(v);
  if (b < 0n)
    throw new RangeError(`value is negative: ${v}`);
  if (b > MAX_U64)
    throw new RangeError(`value exceeds 64 bits: ${v}`);
  if (b < 1n << 7n)
    return 1;
  if (b < 1n << 14n)
    return 2;
  if (b < 1n << 21n)
    return 3;
  if (b < 1n << 28n)
    return 4;
  if (b < 1n << 35n)
    return 5;
  if (b < 1n << 42n)
    return 6;
  if (b < 1n << 56n)
    return 8;
  return 9;
}
function encodeLeadingOnesTo(dst, v) {
  const x = BigInt(v);
  if (x < 0n)
    throw new RangeError(`underflow, value is negative: ${v}`);
  if (x > MAX_U64)
    throw new RangeError(`value exceeds 64 bits: ${v}`);
  const view = new DataView(dst);
  if (x < 1n << 7n) {
    view.setUint8(0, Number(x));
    return new Uint8Array(dst, 0, 1);
  }
  if (x < 1n << 14n) {
    view.setUint8(0, 128 | Number(x >> 8n));
    view.setUint8(1, Number(x & 0xffn));
    return new Uint8Array(dst, 0, 2);
  }
  if (x < 1n << 21n) {
    view.setUint8(0, 192 | Number(x >> 16n));
    view.setUint16(1, Number(x & 0xffffn));
    return new Uint8Array(dst, 0, 3);
  }
  if (x < 1n << 28n) {
    view.setUint8(0, 224 | Number(x >> 24n));
    view.setUint8(1, Number(x >> 16n & 0xffn));
    view.setUint16(2, Number(x & 0xffffn));
    return new Uint8Array(dst, 0, 4);
  }
  if (x < 1n << 35n) {
    view.setUint8(0, 240 | Number(x >> 32n));
    view.setUint32(1, Number(x & 0xffffffffn));
    return new Uint8Array(dst, 0, 5);
  }
  if (x < 1n << 42n) {
    view.setUint8(0, 248 | Number(x >> 40n));
    view.setUint8(1, Number(x >> 32n & 0xffn));
    view.setUint32(2, Number(x & 0xffffffffn));
    return new Uint8Array(dst, 0, 6);
  }
  if (x < 1n << 56n) {
    view.setUint8(0, 254);
    view.setUint8(1, Number(x >> 48n & 0xffn));
    view.setUint16(2, Number(x >> 32n & 0xffffn));
    view.setUint32(4, Number(x & 0xffffffffn));
    return new Uint8Array(dst, 0, 8);
  }
  view.setUint8(0, 255);
  view.setBigUint64(1, x);
  return new Uint8Array(dst, 0, 9);
}
function encodeLeadingOnes(v) {
  return encodeLeadingOnesTo(new ArrayBuffer(9), v);
}
function decodeLeadingOnes(buf) {
  if (buf.length === 0)
    throw new Error("buffer is empty");
  const b = buf[0];
  let ones = 0;
  for (let bit = 7;bit >= 0; bit--) {
    if (b & 1 << bit)
      ones++;
    else
      break;
  }
  if (ones === 6)
    throw new Error("invalid leading-ones varint: 1111110x prefix is reserved");
  let totalSize;
  if (ones <= 5)
    totalSize = ones + 1;
  else if (ones === 7)
    totalSize = 8;
  else
    totalSize = 9;
  if (buf.length < totalSize) {
    throw new Error(`buffer too short: need ${totalSize} bytes, have ${buf.length}`);
  }
  const view = new DataView(buf.buffer, buf.byteOffset, totalSize);
  const remain = buf.subarray(totalSize);
  let value;
  switch (ones) {
    case 0:
      value = BigInt(b);
      break;
    case 1:
      value = BigInt(b & 63) << 8n | BigInt(buf[1]);
      break;
    case 2:
      value = BigInt(b & 31) << 16n | BigInt(view.getUint16(1));
      break;
    case 3:
      value = BigInt(b & 15) << 24n | BigInt(buf[1]) << 16n | BigInt(buf[2]) << 8n | BigInt(buf[3]);
      break;
    case 4:
      value = BigInt(b & 7) << 32n | BigInt(view.getUint32(1));
      break;
    case 5:
      value = BigInt(b & 3) << 40n | BigInt(buf[1]) << 32n | BigInt(buf[2]) << 24n | BigInt(buf[3]) << 16n | BigInt(buf[4]) << 8n | BigInt(buf[5]);
      break;
    case 7: {
      const hi = new Uint8Array(8);
      hi[0] = 0;
      hi.set(buf.subarray(1, 8), 1);
      value = new DataView(hi.buffer).getBigUint64(0);
      break;
    }
    case 8: {
      value = new DataView(buf.buffer, buf.byteOffset + 1, 8).getBigUint64(0);
      break;
    }
    default:
      throw new Error("impossible");
  }
  return [value, remain];
}
function size(v) {
  if (v <= MAX_U6)
    return 1;
  if (v <= MAX_U14)
    return 2;
  if (v <= MAX_U30)
    return 4;
  if (v <= MAX_U53)
    return 8;
  throw new Error(`overflow, value larger than 53-bits: ${v}`);
}
function setUint8(dst, v) {
  const buffer = new Uint8Array(dst, 0, 1);
  buffer[0] = v;
  return buffer;
}
function setUint16(dst, v) {
  const view = new DataView(dst, 0, 2);
  view.setUint16(0, v);
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
function setUint32(dst, v) {
  const view = new DataView(dst, 0, 4);
  view.setUint32(0, v);
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
function setUint64(dst, v) {
  const view = new DataView(dst, 0, 8);
  view.setBigUint64(0, v);
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
function encodeTo(dst, v) {
  const b = BigInt(v);
  if (b < 0n) {
    throw new Error(`underflow, value is negative: ${v}`);
  }
  if (b > MAX_U62) {
    throw new Error(`overflow, value larger than 62-bits: ${v}`);
  }
  const n = Number(b);
  if (n <= MAX_U6) {
    return setUint8(dst, n);
  }
  if (n <= MAX_U14) {
    return setUint16(dst, n | 16384);
  }
  if (n <= MAX_U30) {
    return setUint32(dst, n | 2147483648);
  }
  return setUint64(dst, b | 0xc000000000000000n);
}
function encode(v) {
  return encodeTo(new ArrayBuffer(8), v);
}
function decode(buf) {
  if (buf.length === 0) {
    throw new Error("buffer is empty");
  }
  const size2 = 1 << ((buf[0] & 192) >> 6);
  if (buf.length < size2) {
    throw new Error(`buffer too short: need ${size2} bytes, have ${buf.length}`);
  }
  const view = new DataView(buf.buffer, buf.byteOffset, size2);
  const remain = buf.subarray(size2);
  let v;
  if (size2 === 1) {
    v = buf[0] & 63;
  } else if (size2 === 2) {
    v = view.getUint16(0) & 16383;
  } else if (size2 === 4) {
    v = view.getUint32(0) & 1073741823;
  } else if (size2 === 8) {
    v = Number(view.getBigUint64(0) & 0x3fffffffffffffffn);
  } else {
    throw new Error("impossible");
  }
  return [v, remain];
}
var MAX_U6, MAX_U14, MAX_U30, MAX_U53, MAX_U64, MAX_U62;
var init_varint = __esm(() => {
  MAX_U6 = 2 ** 6 - 1;
  MAX_U14 = 2 ** 14 - 1;
  MAX_U30 = 2 ** 30 - 1;
  MAX_U53 = Number.MAX_SAFE_INTEGER;
  MAX_U64 = (1n << 64n) - 1n;
  MAX_U62 = 2n ** 62n - 1n;
});

// ../../../../tmp/moq-dev/js/lite/src/stream.ts
function isLeadingOnes(version) {
  return version !== undefined && version !== Version.DRAFT_14 && version !== Version.DRAFT_15 && version !== Version.DRAFT_16;
}

class Stream {
  reader;
  writer;
  constructor(props) {
    this.writer = props.writer ?? new Writer(props.writable, props.version);
    this.reader = props.reader ?? new Reader(props.readable, undefined, props.version);
  }
  static async accept(quic, version) {
    for (;; ) {
      const reader = quic.incomingBidirectionalStreams.getReader();
      const next = await reader.read();
      reader.releaseLock();
      if (next.done)
        return;
      const { readable, writable } = next.value;
      return new Stream({ readable, writable, version });
    }
  }
  static async open(quic, version, priority) {
    const { readable, writable } = await quic.createBidirectionalStream({ sendOrder: priority });
    return new Stream({ readable, writable, version });
  }
  close() {
    this.writer.close();
    this.reader.stop(new Error("cancel"));
  }
  abort(reason) {
    this.writer.reset(reason);
    this.reader.stop(reason);
  }
}

class Reader {
  #buffer;
  #stream;
  #reader;
  version;
  constructor(stream, buffer, version) {
    this.#buffer = buffer ?? new Uint8Array;
    this.#stream = stream;
    this.#reader = this.#stream?.getReader();
    this.version = version;
  }
  async#fill() {
    if (!this.#reader) {
      return false;
    }
    const result = await this.#reader.read();
    if (result.done) {
      return false;
    }
    if (result.value.byteLength === 0) {
      throw new Error("unexpected empty chunk");
    }
    const buffer = new Uint8Array(result.value);
    if (this.#buffer.byteLength === 0) {
      this.#buffer = buffer;
    } else {
      const temp = new Uint8Array(this.#buffer.byteLength + buffer.byteLength);
      temp.set(this.#buffer);
      temp.set(buffer, this.#buffer.byteLength);
      this.#buffer = temp;
    }
    return true;
  }
  async#fillTo(size2) {
    if (size2 > MAX_READ_SIZE) {
      throw new Error(`read size ${size2} exceeds max size ${MAX_READ_SIZE}`);
    }
    while (this.#buffer.byteLength < size2) {
      if (!await this.#fill()) {
        throw new Error("unexpected end of stream");
      }
    }
  }
  #slice(size2) {
    const result = new Uint8Array(this.#buffer.buffer, this.#buffer.byteOffset, size2);
    this.#buffer = new Uint8Array(this.#buffer.buffer, this.#buffer.byteOffset + size2, this.#buffer.byteLength - size2);
    return result;
  }
  async read(size2) {
    if (size2 === 0)
      return new Uint8Array;
    await this.#fillTo(size2);
    return this.#slice(size2);
  }
  async readAll() {
    while (await this.#fill()) {}
    return this.#slice(this.#buffer.byteLength);
  }
  async string() {
    const length = await this.u53();
    const buffer = await this.read(length);
    return new TextDecoder().decode(buffer);
  }
  async bool() {
    const v = await this.u8();
    if (v === 0)
      return false;
    if (v === 1)
      return true;
    throw new Error("invalid bool value");
  }
  async u8() {
    await this.#fillTo(1);
    return this.#slice(1)[0];
  }
  async u16() {
    await this.#fillTo(2);
    const view = new DataView(this.#buffer.buffer, this.#buffer.byteOffset, 2);
    const result = view.getUint16(0);
    this.#slice(2);
    return result;
  }
  async u53() {
    const v = await this.u62();
    if (v > MAX_U53) {
      throw new Error("value larger than 53-bits; use v62 instead");
    }
    return Number(v);
  }
  async u62() {
    if (isLeadingOnes(this.version)) {
      return this.#readLeadingOnes();
    }
    return this.#readQuicVarint();
  }
  async#readQuicVarint() {
    await this.#fillTo(1);
    const size2 = (this.#buffer[0] & 192) >> 6;
    if (size2 === 0) {
      const first = this.#slice(1)[0];
      return BigInt(first) & 0x3fn;
    }
    if (size2 === 1) {
      await this.#fillTo(2);
      const slice2 = this.#slice(2);
      const view2 = new DataView(slice2.buffer, slice2.byteOffset, slice2.byteLength);
      return BigInt(view2.getUint16(0)) & 0x3fffn;
    }
    if (size2 === 2) {
      await this.#fillTo(4);
      const slice2 = this.#slice(4);
      const view2 = new DataView(slice2.buffer, slice2.byteOffset, slice2.byteLength);
      return BigInt(view2.getUint32(0)) & 0x3fffffffn;
    }
    await this.#fillTo(8);
    const slice = this.#slice(8);
    const view = new DataView(slice.buffer, slice.byteOffset, slice.byteLength);
    return view.getBigUint64(0) & 0x3fffffffffffffffn;
  }
  async#readLeadingOnes() {
    await this.#fillTo(1);
    const b = this.#buffer[0];
    let ones = 0;
    for (let bit = 7;bit >= 0; bit--) {
      if (b & 1 << bit)
        ones++;
      else
        break;
    }
    if (ones === 6)
      throw new Error("invalid leading-ones varint: 1111110x prefix is reserved");
    let totalSize;
    if (ones <= 5)
      totalSize = ones + 1;
    else if (ones === 7)
      totalSize = 8;
    else
      totalSize = 9;
    await this.#fillTo(totalSize);
    const slice = this.#slice(totalSize);
    const [value] = decodeLeadingOnes(slice);
    return value;
  }
  async done() {
    if (this.#buffer.byteLength > 0)
      return false;
    return !await this.#fill();
  }
  stop(reason) {
    this.#reader?.cancel(reason).catch(() => {
      return;
    });
  }
  get closed() {
    return this.#reader?.closed ?? Promise.resolve();
  }
}

class Writer {
  #writer;
  #stream;
  #scratch;
  version;
  constructor(stream, version) {
    this.#stream = stream;
    this.#scratch = new ArrayBuffer(9);
    this.#writer = this.#stream.getWriter();
    this.version = version;
  }
  async bool(v) {
    await this.write(setUint82(this.#scratch, v ? 1 : 0));
  }
  async u8(v) {
    await this.write(setUint82(this.#scratch, v));
  }
  async u16(v) {
    await this.write(setUint162(this.#scratch, v));
  }
  async i32(v) {
    if (Math.abs(v) > MAX_U31) {
      throw new Error(`overflow, value larger than 32-bits: ${v.toString()}`);
    }
    await this.write(setInt32(this.#scratch, v));
  }
  async u53(v) {
    if (v > MAX_U53) {
      throw new Error(`overflow, value larger than 53-bits: ${v.toString()}`);
    }
    if (isLeadingOnes(this.version)) {
      await this.write(encodeLeadingOnesTo(this.#scratch, v));
    } else {
      await this.write(encodeTo(this.#scratch, v));
    }
  }
  async u62(v) {
    if (isLeadingOnes(this.version)) {
      await this.write(encodeLeadingOnesTo(this.#scratch, v));
    } else {
      await this.write(encodeTo(this.#scratch, v));
    }
  }
  async write(v) {
    await this.#writer.write(v);
  }
  async string(str) {
    const data = new TextEncoder().encode(str);
    await this.u53(data.byteLength);
    await this.write(data);
  }
  close() {
    this.#writer.close().catch(() => {
      return;
    });
  }
  get closed() {
    return this.#writer.closed;
  }
  reset(reason) {
    this.#writer.abort(reason).catch(() => {
      return;
    });
  }
  static async open(quic, version) {
    const writable = await quic.createUnidirectionalStream();
    return new Writer(writable, version);
  }
}
function setUint82(dst, v) {
  const buffer = new Uint8Array(dst, 0, 1);
  buffer[0] = v;
  return buffer;
}
function setUint162(dst, v) {
  const view = new DataView(dst, 0, 2);
  view.setUint16(0, v);
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
function setInt32(dst, v) {
  const view = new DataView(dst, 0, 4);
  view.setInt32(0, v);
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

class Readers {
  #reader;
  #version;
  constructor(quic, version) {
    this.#reader = quic.incomingUnidirectionalStreams.getReader();
    this.#version = version;
  }
  async next() {
    const next = await this.#reader.read();
    if (next.done)
      return;
    return new Reader(next.value, undefined, this.#version);
  }
  close() {
    this.#reader.cancel();
  }
}
var MAX_U31, MAX_READ_SIZE;
var init_stream = __esm(() => {
  init_version();
  init_varint();
  MAX_U31 = 2 ** 31 - 1;
  MAX_READ_SIZE = 1024 * 1024 * 64;
});

// ../../../../tmp/moq-dev/js/lite/src/ietf/namespace.ts
async function encode2(w, namespace) {
  if (namespace === "") {
    await w.u53(0);
    return;
  }
  const parts = namespace.split("/");
  await w.u53(parts.length);
  for (const part of parts) {
    await w.string(part);
  }
}
async function decode2(r) {
  const parts = [];
  const count = await r.u53();
  for (let i = 0;i < count; i++) {
    parts.push(await r.string());
  }
  return from(...parts);
}
var init_namespace = () => {};

// ../../../../tmp/moq-dev/js/lite/src/ietf/message.ts
async function encode3(writer, f) {
  let scratch = new Uint8Array;
  const temp = new Writer(new WritableStream({
    write(chunk) {
      const needed = scratch.byteLength + chunk.byteLength;
      if (needed > scratch.buffer.byteLength) {
        const capacity = Math.max(needed, scratch.buffer.byteLength * 2);
        const newBuffer = new ArrayBuffer(capacity);
        const newScratch = new Uint8Array(newBuffer, 0, needed);
        newScratch.set(scratch);
        newScratch.set(chunk, scratch.byteLength);
        scratch = newScratch;
      } else {
        scratch = new Uint8Array(scratch.buffer, 0, needed);
        scratch.set(chunk, needed - chunk.byteLength);
      }
    }
  }), writer.version);
  try {
    await f(temp);
  } finally {
    temp.close();
  }
  await temp.closed;
  if (scratch.byteLength > 65535) {
    throw new Error(`Message too large: ${scratch.byteLength} bytes (max 65535)`);
  }
  await writer.u16(scratch.byteLength);
  await writer.write(scratch);
}
async function decode3(reader, f) {
  const size2 = await reader.u16();
  const data = await reader.read(size2);
  const limit = new Reader(undefined, data, reader.version);
  const msg = await f(limit);
  if (!await limit.done()) {
    throw new Error("Message decoding consumed too few bytes");
  }
  return msg;
}
var init_message = __esm(() => {
  init_stream();
});

// ../../../../tmp/moq-dev/js/lite/src/ietf/parameters.ts
class SetupOptions {
  vars;
  bytes;
  constructor() {
    this.vars = new Map;
    this.bytes = new Map;
  }
  get size() {
    return this.vars.size + this.bytes.size;
  }
  setBytes(id, value) {
    if (id % 2n !== 1n) {
      throw new Error(`invalid parameter id: ${id.toString()}, must be odd`);
    }
    this.bytes.set(id, value);
  }
  setVarint(id, value) {
    if (id % 2n !== 0n) {
      throw new Error(`invalid parameter id: ${id.toString()}, must be even`);
    }
    this.vars.set(id, value);
  }
  getBytes(id) {
    if (id % 2n !== 1n) {
      throw new Error(`invalid parameter id: ${id.toString()}, must be odd`);
    }
    return this.bytes.get(id);
  }
  getVarint(id) {
    if (id % 2n !== 0n) {
      throw new Error(`invalid parameter id: ${id.toString()}, must be even`);
    }
    return this.vars.get(id);
  }
  removeBytes(id) {
    if (id % 2n !== 1n) {
      throw new Error(`invalid parameter id: ${id.toString()}, must be odd`);
    }
    return this.bytes.delete(id);
  }
  removeVarint(id) {
    if (id % 2n !== 0n) {
      throw new Error(`invalid parameter id: ${id.toString()}, must be even`);
    }
    return this.vars.delete(id);
  }
  async encode(w, version) {
    if (version === Version.DRAFT_16 || version === Version.DRAFT_17) {
      if (version !== Version.DRAFT_17) {
        await w.u53(this.vars.size + this.bytes.size);
      }
      const all = [];
      for (const id of this.vars.keys())
        all.push({ key: id, isVar: true });
      for (const id of this.bytes.keys())
        all.push({ key: id, isVar: false });
      all.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
      let prevId = 0n;
      for (let i = 0;i < all.length; i++) {
        const { key, isVar } = all[i];
        const delta = i === 0 ? key : key - prevId;
        prevId = key;
        await w.u62(delta);
        if (isVar) {
          await w.u62(this.vars.get(key));
        } else {
          const value = this.bytes.get(key);
          await w.u53(value.length);
          await w.write(value);
        }
      }
    } else {
      await w.u53(this.vars.size + this.bytes.size);
      for (const [id, value] of this.vars) {
        await w.u62(id);
        await w.u62(value);
      }
      for (const [id, value] of this.bytes) {
        await w.u62(id);
        await w.u53(value.length);
        await w.write(value);
      }
    }
  }
  static async decode(r, version) {
    const params = new SetupOptions;
    if (version === Version.DRAFT_17) {
      let prevType = 0n;
      let i = 0;
      while (!await r.done()) {
        const delta = await r.u62();
        const id = i === 0 ? delta : prevType + delta;
        prevType = id;
        i++;
        if (id % 2n === 0n) {
          if (params.vars.has(id)) {
            throw new Error(`duplicate parameter id: ${id.toString()}`);
          }
          const varint = await r.u62();
          params.setVarint(id, varint);
        } else {
          if (params.bytes.has(id)) {
            throw new Error(`duplicate parameter id: ${id.toString()}`);
          }
          const size2 = await r.u53();
          const bytes = await r.read(size2);
          params.setBytes(id, bytes);
        }
      }
    } else {
      const count = await r.u53();
      let prevType = 0n;
      for (let i = 0;i < count; i++) {
        let id;
        if (version === Version.DRAFT_16) {
          const delta = await r.u62();
          id = i === 0 ? delta : prevType + delta;
          prevType = id;
        } else {
          id = await r.u62();
        }
        if (id % 2n === 0n) {
          if (params.vars.has(id)) {
            throw new Error(`duplicate parameter id: ${id.toString()}`);
          }
          const varint = await r.u62();
          params.setVarint(id, varint);
        } else {
          if (params.bytes.has(id)) {
            throw new Error(`duplicate parameter id: ${id.toString()}`);
          }
          const size2 = await r.u53();
          const bytes = await r.read(size2);
          params.setBytes(id, bytes);
        }
      }
    }
    return params;
  }
}

class Parameters {
  vars;
  bytes;
  constructor() {
    this.vars = new Map;
    this.bytes = new Map;
  }
  get subscriberPriority() {
    const v = this.vars.get(MSG_PARAM_SUBSCRIBER_PRIORITY);
    return v !== undefined ? Number(v) : undefined;
  }
  set subscriberPriority(v) {
    this.vars.set(MSG_PARAM_SUBSCRIBER_PRIORITY, BigInt(v));
  }
  get groupOrder() {
    const v = this.vars.get(MSG_PARAM_GROUP_ORDER);
    return v !== undefined ? Number(v) : undefined;
  }
  set groupOrder(v) {
    this.vars.set(MSG_PARAM_GROUP_ORDER, BigInt(v));
  }
  get forward() {
    const v = this.vars.get(MSG_PARAM_FORWARD);
    return v !== undefined ? v !== 0n : undefined;
  }
  set forward(v) {
    this.vars.set(MSG_PARAM_FORWARD, v ? 1n : 0n);
  }
  get publisherPriority() {
    const v = this.vars.get(MSG_PARAM_PUBLISHER_PRIORITY);
    return v !== undefined ? Number(v) : undefined;
  }
  set publisherPriority(v) {
    this.vars.set(MSG_PARAM_PUBLISHER_PRIORITY, BigInt(v));
  }
  get expires() {
    return this.vars.get(MSG_PARAM_EXPIRES);
  }
  set expires(v) {
    this.vars.set(MSG_PARAM_EXPIRES, v);
  }
  get deliveryTimeout() {
    return this.vars.get(MSG_PARAM_DELIVERY_TIMEOUT);
  }
  set deliveryTimeout(v) {
    this.vars.set(MSG_PARAM_DELIVERY_TIMEOUT, v);
  }
  get maxCacheDuration() {
    return this.vars.get(MSG_PARAM_MAX_CACHE_DURATION);
  }
  set maxCacheDuration(v) {
    this.vars.set(MSG_PARAM_MAX_CACHE_DURATION, v);
  }
  get largest() {
    const data = this.bytes.get(MSG_PARAM_LARGEST_OBJECT);
    if (!data || data.length === 0)
      return;
    const [groupId, rest] = decode(data);
    const [objectId] = decode(rest);
    return { groupId: BigInt(groupId), objectId: BigInt(objectId) };
  }
  set largest(v) {
    const buf1 = encode(Number(v.groupId));
    const buf2 = encode(Number(v.objectId));
    const combined = new Uint8Array(buf1.length + buf2.length);
    combined.set(buf1, 0);
    combined.set(buf2, buf1.length);
    this.bytes.set(MSG_PARAM_LARGEST_OBJECT, combined);
  }
  get subscriptionFilter() {
    const data = this.bytes.get(MSG_PARAM_SUBSCRIPTION_FILTER);
    if (!data || data.length === 0)
      return;
    return data[0];
  }
  set subscriptionFilter(v) {
    this.bytes.set(MSG_PARAM_SUBSCRIPTION_FILTER, new Uint8Array([v]));
  }
  async encode(w, version) {
    await w.u53(this.vars.size + this.bytes.size);
    if (version === Version.DRAFT_14 || version === Version.DRAFT_15) {
      for (const [id, value] of this.vars) {
        await w.u62(id);
        await w.u62(value);
      }
      for (const [id, value] of this.bytes) {
        await w.u62(id);
        await w.u53(value.length);
        await w.write(value);
      }
    } else {
      const all = [];
      for (const id of this.vars.keys())
        all.push({ key: id, isVar: true });
      for (const id of this.bytes.keys())
        all.push({ key: id, isVar: false });
      all.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
      let prevId = 0n;
      for (let i = 0;i < all.length; i++) {
        const { key, isVar } = all[i];
        const delta = i === 0 ? key : key - prevId;
        prevId = key;
        await w.u62(delta);
        if (isVar) {
          await w.u62(this.vars.get(key));
        } else {
          const value = this.bytes.get(key);
          await w.u53(value.length);
          await w.write(value);
        }
      }
    }
  }
  static async decode(r, version) {
    const count = await r.u53();
    const params = new Parameters;
    let prevType = 0n;
    for (let i = 0;i < count; i++) {
      let id;
      if (version === Version.DRAFT_14 || version === Version.DRAFT_15) {
        id = await r.u62();
      } else {
        const delta = await r.u62();
        id = i === 0 ? delta : prevType + delta;
        prevType = id;
      }
      if (id % 2n === 0n) {
        if (params.vars.has(id)) {
          throw new Error(`duplicate message parameter id: ${id.toString()}`);
        }
        const varint = await r.u62();
        params.vars.set(id, varint);
      } else {
        if (params.bytes.has(id)) {
          throw new Error(`duplicate message parameter id: ${id.toString()}`);
        }
        const size2 = await r.u53();
        const bytes = await r.read(size2);
        params.bytes.set(id, bytes);
      }
    }
    return params;
  }
}
var SetupOption, MSG_PARAM_DELIVERY_TIMEOUT = 0x02n, MSG_PARAM_MAX_CACHE_DURATION = 0x04n, MSG_PARAM_EXPIRES = 0x08n, MSG_PARAM_PUBLISHER_PRIORITY = 0x0en, MSG_PARAM_FORWARD = 0x10n, MSG_PARAM_SUBSCRIBER_PRIORITY = 0x20n, MSG_PARAM_GROUP_ORDER = 0x22n, MSG_PARAM_LARGEST_OBJECT = 0x09n, MSG_PARAM_SUBSCRIPTION_FILTER = 0x21n;
var init_parameters = __esm(() => {
  init_varint();
  init_version();
  SetupOption = {
    Path: 1n,
    MaxRequestId: 2n,
    AuthorizationToken: 3n,
    MaxAuthTokenCacheSize: 4n,
    Authority: 5n,
    Implementation: 7n
  };
});

// ../../../../tmp/moq-dev/js/lite/src/ietf/properties.ts
async function skip(r, version) {
  if (version === Version.DRAFT_14 || version === Version.DRAFT_15 || version === Version.DRAFT_16) {
    return;
  }
  let prevType = 0n;
  let i = 0;
  while (!await r.done()) {
    const delta = await r.u62();
    const abs = i === 0 ? delta : prevType + delta;
    prevType = abs;
    i++;
    if (abs % 2n === 0n) {
      await r.u62();
    } else {
      const len = await r.u53();
      await r.read(len);
    }
  }
}
var init_properties = __esm(() => {
  init_version();
});

// ../../../../tmp/moq-dev/js/lite/src/ietf/publish_namespace.ts
var exports_publish_namespace = {};
__export(exports_publish_namespace, {
  PublishNamespaceOk: () => PublishNamespaceOk,
  PublishNamespaceError: () => PublishNamespaceError,
  PublishNamespaceDone: () => PublishNamespaceDone,
  PublishNamespaceCancel: () => PublishNamespaceCancel,
  PublishNamespace: () => PublishNamespace
});

class PublishNamespace {
  static id = 6;
  requestId;
  trackNamespace;
  constructor({ requestId, trackNamespace }) {
    this.requestId = requestId;
    this.trackNamespace = trackNamespace;
  }
  async#encode(w, version) {
    await w.u62(this.requestId);
    if (version === Version.DRAFT_17) {
      await w.u62(0n);
    }
    await encode2(w, this.trackNamespace);
    await new Parameters().encode(w, version);
  }
  async encode(w, version) {
    return encode3(w, (wr) => this.#encode(wr, version));
  }
  static async decode(r, version) {
    return decode3(r, (rd) => PublishNamespace.#decode(rd, version));
  }
  static async#decode(r, version) {
    const requestId = await r.u62();
    if (version === Version.DRAFT_17) {
      await r.u62();
    }
    const trackNamespace = await decode2(r);
    await Parameters.decode(r, version);
    return new PublishNamespace({ requestId, trackNamespace });
  }
}

class PublishNamespaceOk {
  static id = 7;
  requestId;
  constructor({ requestId }) {
    this.requestId = requestId;
  }
  async#encode(w) {
    await w.u62(this.requestId);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode3(r, PublishNamespaceOk.#decode);
  }
  static async#decode(r) {
    const requestId = await r.u62();
    return new PublishNamespaceOk({ requestId });
  }
}

class PublishNamespaceError {
  static id = 8;
  requestId;
  errorCode;
  reasonPhrase;
  constructor({
    requestId,
    errorCode,
    reasonPhrase
  }) {
    this.requestId = requestId;
    this.errorCode = errorCode;
    this.reasonPhrase = reasonPhrase;
  }
  async#encode(w) {
    await w.u62(this.requestId);
    await w.u62(BigInt(this.errorCode));
    await w.string(this.reasonPhrase);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode3(r, PublishNamespaceError.#decode);
  }
  static async#decode(r) {
    const requestId = await r.u62();
    const errorCode = Number(await r.u62());
    const reasonPhrase = await r.string();
    return new PublishNamespaceError({ requestId, errorCode, reasonPhrase });
  }
}

class PublishNamespaceCancel {
  static id = 12;
  trackNamespace;
  requestId;
  errorCode;
  reasonPhrase;
  constructor({
    trackNamespace = "",
    errorCode = 0,
    reasonPhrase = "",
    requestId = 0n
  } = {}) {
    this.trackNamespace = trackNamespace;
    this.requestId = requestId;
    this.errorCode = errorCode;
    this.reasonPhrase = reasonPhrase;
  }
  async#encode(w, version) {
    if (version === Version.DRAFT_17) {
      throw new Error("PublishNamespaceCancel removed in draft-17");
    }
    if (version === Version.DRAFT_16) {
      await w.u62(this.requestId);
    } else {
      await encode2(w, this.trackNamespace);
    }
    await w.u62(BigInt(this.errorCode));
    await w.string(this.reasonPhrase);
  }
  async encode(w, version) {
    return encode3(w, (wr) => this.#encode(wr, version));
  }
  static async decode(r, version) {
    return decode3(r, (rd) => PublishNamespaceCancel.#decode(rd, version));
  }
  static async#decode(r, version) {
    if (version === Version.DRAFT_17) {
      throw new Error("PublishNamespaceCancel removed in draft-17");
    }
    let trackNamespace = "";
    let requestId = 0n;
    if (version === Version.DRAFT_16) {
      requestId = await r.u62();
    } else {
      trackNamespace = await decode2(r);
    }
    const errorCode = Number(await r.u62());
    const reasonPhrase = await r.string();
    return new PublishNamespaceCancel({ trackNamespace, errorCode, reasonPhrase, requestId });
  }
}

class PublishNamespaceDone {
  static id = 9;
  trackNamespace;
  requestId;
  constructor({
    trackNamespace = "",
    requestId = 0n
  } = {}) {
    this.trackNamespace = trackNamespace;
    this.requestId = requestId;
  }
  async#encode(w, version) {
    if (version === Version.DRAFT_17) {
      throw new Error("PublishNamespaceDone removed in draft-17");
    }
    if (version === Version.DRAFT_16) {
      await w.u62(this.requestId);
    } else {
      await encode2(w, this.trackNamespace);
    }
  }
  async encode(w, version) {
    return encode3(w, (wr) => this.#encode(wr, version));
  }
  static async decode(r, version) {
    return decode3(r, (rd) => PublishNamespaceDone.#decode(rd, version));
  }
  static async#decode(r, version) {
    if (version === Version.DRAFT_17) {
      throw new Error("PublishNamespaceDone removed in draft-17");
    }
    if (version === Version.DRAFT_16) {
      const requestId = await r.u62();
      return new PublishNamespaceDone({ requestId });
    }
    const trackNamespace = await decode2(r);
    return new PublishNamespaceDone({ trackNamespace });
  }
}
var init_publish_namespace = __esm(() => {
  init_message();
  init_namespace();
  init_parameters();
  init_version();
});

// ../../../../tmp/moq-dev/js/lite/src/ietf/subscribe.ts
var exports_subscribe = {};
__export(exports_subscribe, {
  Unsubscribe: () => Unsubscribe,
  SubscribeUpdate: () => SubscribeUpdate,
  SubscribeOk: () => SubscribeOk,
  SubscribeError: () => SubscribeError,
  Subscribe: () => Subscribe
});

class Subscribe {
  static id = 3;
  requestId;
  trackNamespace;
  trackName;
  subscriberPriority;
  constructor({
    requestId,
    trackNamespace,
    trackName,
    subscriberPriority
  }) {
    this.requestId = requestId;
    this.trackNamespace = trackNamespace;
    this.trackName = trackName;
    this.subscriberPriority = subscriberPriority;
  }
  async#encode(w, version) {
    await w.u62(this.requestId);
    if (version === Version.DRAFT_17) {
      await w.u62(0n);
    }
    await encode2(w, this.trackNamespace);
    await w.string(this.trackName);
    if (version === Version.DRAFT_14) {
      await w.u8(this.subscriberPriority);
      await w.u8(GROUP_ORDER);
      await w.bool(true);
      await w.u53(2);
      await w.u53(0);
    } else {
      const params = new Parameters;
      params.subscriberPriority = this.subscriberPriority;
      params.groupOrder = GROUP_ORDER;
      params.forward = true;
      params.subscriptionFilter = 2;
      await params.encode(w, version);
    }
  }
  async encode(w, version) {
    return encode3(w, (mw) => this.#encode(mw, version));
  }
  static async decode(r, version) {
    return decode3(r, (mr) => Subscribe.#decode(mr, version));
  }
  static async#decode(r, version) {
    const requestId = await r.u62();
    if (version === Version.DRAFT_17) {
      await r.u62();
    }
    const trackNamespace = await decode2(r);
    const trackName = await r.string();
    if (version === Version.DRAFT_14) {
      const subscriberPriority2 = await r.u8();
      let groupOrder2 = await r.u8();
      if (groupOrder2 > 2) {
        throw new Error(`unknown group order: ${groupOrder2}`);
      }
      if (groupOrder2 === 0) {
        groupOrder2 = GROUP_ORDER;
      }
      const forward2 = await r.bool();
      if (!forward2) {
        throw new Error(`unsupported forward value: ${forward2}`);
      }
      const filterType2 = await r.u53();
      if (filterType2 !== 1 && filterType2 !== 2) {
        throw new Error(`unsupported filter type: ${filterType2}`);
      }
      await Parameters.decode(r, version);
      return new Subscribe({ requestId, trackNamespace, trackName, subscriberPriority: subscriberPriority2 });
    }
    const params = await Parameters.decode(r, version);
    const subscriberPriority = params.subscriberPriority ?? 128;
    let groupOrder = params.groupOrder ?? GROUP_ORDER;
    if (groupOrder > 2) {
      throw new Error(`unknown group order: ${groupOrder}`);
    }
    if (groupOrder === 0) {
      groupOrder = GROUP_ORDER;
    }
    const forward = params.forward ?? true;
    if (!forward) {
      throw new Error(`unsupported forward value: ${forward}`);
    }
    const filterType = params.subscriptionFilter ?? 2;
    if (filterType !== 1 && filterType !== 2) {
      throw new Error(`unsupported filter type: ${filterType}`);
    }
    return new Subscribe({ requestId, trackNamespace, trackName, subscriberPriority });
  }
}

class SubscribeOk {
  static id = 4;
  requestId;
  trackAlias;
  constructor({ requestId, trackAlias }) {
    this.requestId = requestId;
    this.trackAlias = trackAlias;
  }
  async#encode(w, version) {
    if (version !== Version.DRAFT_17) {
      if (this.requestId === undefined)
        throw new Error("requestId required for draft14-16");
      await w.u62(this.requestId);
    }
    await w.u62(this.trackAlias);
    if (version === Version.DRAFT_14) {
      await w.u62(0n);
      await w.u8(GROUP_ORDER);
      await w.bool(false);
      await w.u53(0);
    } else {
      const params = new Parameters;
      params.groupOrder = GROUP_ORDER;
      await params.encode(w, version);
    }
  }
  async encode(w, version) {
    return encode3(w, (mw) => this.#encode(mw, version));
  }
  static async decode(r, version) {
    return decode3(r, (mr) => SubscribeOk.#decode(mr, version));
  }
  static async#decode(r, version) {
    const requestId = version === Version.DRAFT_17 ? undefined : await r.u62();
    const trackAlias = await r.u62();
    if (version === Version.DRAFT_14) {
      const expires = await r.u62();
      if (expires !== BigInt(0)) {
        throw new Error(`unsupported expires: ${expires}`);
      }
      await r.u8();
      const contentExists = await r.bool();
      if (contentExists) {
        await r.u62();
        await r.u62();
      }
      await Parameters.decode(r, version);
    } else {
      await Parameters.decode(r, version);
      await skip(r, version);
    }
    return new SubscribeOk({ requestId, trackAlias });
  }
}

class SubscribeError {
  static id = 5;
  requestId;
  errorCode;
  reasonPhrase;
  constructor({
    requestId,
    errorCode,
    reasonPhrase
  }) {
    this.requestId = requestId;
    this.errorCode = errorCode;
    this.reasonPhrase = reasonPhrase;
  }
  async#encode(w) {
    await w.u62(this.requestId);
    await w.u62(BigInt(this.errorCode));
    await w.string(this.reasonPhrase);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode3(r, SubscribeError.#decode);
  }
  static async#decode(r) {
    const requestId = await r.u62();
    const errorCode = Number(await r.u62());
    const reasonPhrase = await r.string();
    return new SubscribeError({ requestId, errorCode, reasonPhrase });
  }
}

class SubscribeUpdate {
  static id = 2;
  requestId;
  constructor({ requestId }) {
    this.requestId = requestId;
  }
  async#encode(w, version) {
    if (version === Version.DRAFT_14) {
      await w.u62(this.requestId);
      await w.u62(0n);
      await w.u62(0n);
      await w.u62(0n);
      await w.u62(0n);
      await w.u8(128);
      await w.bool(true);
      await w.u53(0);
    } else if (version === Version.DRAFT_15 || version === Version.DRAFT_16) {
      await w.u62(this.requestId);
      await w.u62(0n);
      const params = new Parameters;
      await params.encode(w, version);
    } else {
      await w.u62(this.requestId);
      await w.u62(0n);
      const params = new Parameters;
      await params.encode(w, version);
    }
  }
  async encode(w, version) {
    return encode3(w, (mw) => this.#encode(mw, version));
  }
  static async decode(r, version) {
    return decode3(r, (mr) => SubscribeUpdate.#decode(mr, version));
  }
  static async#decode(r, version) {
    if (version === Version.DRAFT_14) {
      const requestId = await r.u62();
      await r.u62();
      await r.u62();
      await r.u62();
      await r.u62();
      await r.u8();
      await r.bool();
      await Parameters.decode(r, version);
      return new SubscribeUpdate({ requestId });
    } else if (version === Version.DRAFT_15 || version === Version.DRAFT_16) {
      const requestId = await r.u62();
      await r.u62();
      await Parameters.decode(r, version);
      return new SubscribeUpdate({ requestId });
    } else {
      const requestId = await r.u62();
      await r.u62();
      await Parameters.decode(r, version);
      return new SubscribeUpdate({ requestId });
    }
  }
}

class Unsubscribe {
  static id = 10;
  requestId;
  constructor({ requestId }) {
    this.requestId = requestId;
  }
  async#encode(w) {
    await w.u62(this.requestId);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode3(r, Unsubscribe.#decode);
  }
  static async#decode(r) {
    const requestId = await r.u62();
    return new Unsubscribe({ requestId });
  }
}
var GROUP_ORDER = 2;
var init_subscribe = __esm(() => {
  init_message();
  init_namespace();
  init_parameters();
  init_properties();
  init_version();
});

// ../../../../tmp/moq-dev/js/hang/src/index.ts
var exports_src3 = {};
__export(exports_src3, {
  Signals: () => exports_src,
  Moq: () => exports_src2,
  Container: () => exports_container,
  Catalog: () => exports_catalog
});

// ../../../../tmp/moq-dev/js/lite/src/index.ts
var exports_src2 = {};
__export(exports_src2, {
  createBandwidth: () => createBandwidth,
  Varint: () => exports_varint,
  TrackState: () => TrackState,
  Track: () => Track,
  Time: () => exports_time,
  Signals: () => exports_src,
  Path: () => exports_path,
  GroupState: () => GroupState,
  Group: () => Group,
  Connection: () => exports_connection,
  BroadcastState: () => BroadcastState,
  Broadcast: () => Broadcast,
  AnnouncedState: () => AnnouncedState,
  Announced: () => Announced
});

// ../../../../tmp/moq-dev/js/signals/src/index.ts
var exports_src = {};
__export(exports_src, {
  Signal: () => Signal,
  Effect: () => Effect
});
var DEV = typeof import.meta.env !== "undefined" && import.meta.env?.MODE !== "production";
var SIGNAL_BRAND = Symbol.for("@moq/signals");

class Signal {
  #value;
  #subscribers = new Set;
  #changed = new Set;
  #pending = false;
  #oldValue;
  #hasCapturedOldValue = false;
  #forceNotify = false;
  [SIGNAL_BRAND] = true;
  constructor(value) {
    this.#value = value;
  }
  static from(value) {
    if (typeof value === "object" && value !== null && SIGNAL_BRAND in value) {
      return value;
    }
    return new Signal(value);
  }
  get() {
    return this.#value;
  }
  peek() {
    return this.#value;
  }
  set(value, notify) {
    if (!this.#hasCapturedOldValue) {
      this.#oldValue = this.#value;
      this.#hasCapturedOldValue = true;
    }
    this.#value = value;
    if (notify === false)
      return;
    if (notify === true)
      this.#forceNotify = true;
    if (this.#subscribers.size === 0 && this.#changed.size === 0) {
      this.#hasCapturedOldValue = false;
      this.#oldValue = undefined;
      this.#forceNotify = false;
      return;
    }
    if (this.#pending)
      return;
    this.#pending = true;
    queueMicrotask(() => this.#flush());
  }
  #flush() {
    this.#pending = false;
    this.#hasCapturedOldValue = false;
    const old = this.#oldValue;
    this.#oldValue = undefined;
    const force = this.#forceNotify;
    this.#forceNotify = false;
    if (!force && isEqual(old, this.#value))
      return;
    const value = this.#value;
    const changed = this.#changed;
    this.#changed = new Set;
    for (const fn of this.#subscribers) {
      try {
        fn(value);
      } catch (error) {
        console.error("signal subscriber error", error);
      }
    }
    for (const fn of changed) {
      try {
        fn(value);
      } catch (error) {
        console.error("signal changed error", error);
      }
    }
  }
  update(fn, notify = true) {
    const value = fn(this.#value);
    this.set(value, notify);
  }
  mutate(fn, notify = true) {
    const r = fn(this.#value);
    this.set(this.#value, notify);
    return r;
  }
  subscribe(fn) {
    this.#subscribers.add(fn);
    if (DEV && this.#subscribers.size >= 100 && Number.isInteger(Math.log10(this.#subscribers.size))) {
      throw new Error("signal has too many subscribers; may be leaking");
    }
    return () => this.#subscribers.delete(fn);
  }
  changed(fn) {
    this.#changed.add(fn);
    return () => this.#changed.delete(fn);
  }
  watch(fn) {
    const dispose = this.subscribe(fn);
    queueMicrotask(() => fn(this.#value));
    return dispose;
  }
  static async race(...sigs) {
    const dispose = [];
    const result = await new Promise((resolve) => {
      for (const sig of sigs) {
        dispose.push(sig.changed(resolve));
      }
    });
    for (const fn of dispose)
      fn();
    return result;
  }
}

class Effect {
  static #finalizer = new FinalizationRegistry((debugInfo) => {
    console.warn(`Signals was garbage collected without being closed:
${debugInfo}`);
  });
  #fn;
  #dispose = [];
  #unwatch = [];
  #async = [];
  #stack;
  #scheduled = false;
  #stopped;
  #closed;
  #abort = new AbortController;
  constructor(fn) {
    if (DEV) {
      const debug = new Error("created here:").stack ?? "No stack";
      Effect.#finalizer.register(this, debug, this);
    }
    this.#fn = fn;
    if (DEV) {
      this.#stack = new Error().stack;
    }
    this.#stopped = Promise.withResolvers();
    this.#closed = Promise.withResolvers();
    if (fn) {
      this.#schedule();
    }
  }
  #schedule() {
    if (this.#scheduled)
      return;
    this.#scheduled = true;
    queueMicrotask(() => this.#run().catch((error) => {
      console.error("effect error", error, this.#stack);
    }));
  }
  async#run() {
    if (this.#dispose === undefined)
      return;
    this.#stopped.resolve();
    this.#abort.abort();
    this.#abort = new AbortController;
    this.#stopped = Promise.withResolvers();
    for (const unwatch of this.#unwatch)
      unwatch();
    this.#unwatch.length = 0;
    for (const fn of this.#dispose)
      fn();
    this.#dispose.length = 0;
    if (this.#async.length > 0) {
      try {
        let warn;
        const timeout = new Promise((resolve) => {
          warn = setTimeout(() => {
            if (DEV) {
              console.warn("spawn is still running after 5s; continuing anyway", this.#stack);
            }
            resolve();
          }, 5000);
        });
        await Promise.race([Promise.all(this.#async), timeout]);
        if (warn)
          clearTimeout(warn);
        this.#async.length = 0;
      } catch (error) {
        console.error("async effect error", error);
        if (this.#stack)
          console.error("stack", this.#stack);
      }
    }
    if (this.#dispose === undefined)
      return;
    this.#scheduled = false;
    if (this.#fn) {
      this.#fn(this);
      if (DEV && this.#dispose !== undefined && this.#unwatch.length === 0 && this.#dispose.length === 0 && this.#async.length === 0) {
        console.warn("Effect did not subscribe to any signals; it will never rerun.", this.#stack);
      }
    }
  }
  get(signal) {
    if (this.#dispose === undefined) {
      if (DEV) {
        console.warn("Effect.get called when closed, returning current value");
      }
      return signal.peek();
    }
    const value = signal.peek();
    const dispose = signal.changed(() => this.#schedule());
    this.#unwatch.push(dispose);
    return value;
  }
  set(signal, value, ...args) {
    if (this.#dispose === undefined) {
      if (DEV) {
        console.warn("Effect.set called when closed, ignoring");
      }
      return;
    }
    signal.set(value);
    const cleanup = args[0];
    const cleanupValue = cleanup === undefined ? undefined : cleanup;
    this.cleanup(() => signal.set(cleanupValue));
  }
  spawn(fn) {
    const promise = fn().catch((error) => {
      console.error("spawn error", error);
    });
    if (this.#dispose === undefined) {
      if (DEV) {
        console.warn("Effect.spawn called when closed");
      }
      return;
    }
    this.#async.push(promise);
  }
  timer(fn, ms) {
    if (this.#dispose === undefined) {
      if (DEV) {
        console.warn("Effect.timer called when closed, ignoring");
      }
      return;
    }
    let timeout;
    timeout = setTimeout(() => {
      timeout = undefined;
      fn();
    }, ms);
    this.cleanup(() => timeout && clearTimeout(timeout));
  }
  timeout(fn, ms) {
    if (this.#dispose === undefined) {
      if (DEV) {
        console.warn("Effect.timeout called when closed, ignoring");
      }
      return;
    }
    const effect = new Effect(fn);
    let timeout = setTimeout(() => {
      effect.close();
      timeout = undefined;
    }, ms);
    this.#dispose.push(() => {
      if (timeout) {
        clearTimeout(timeout);
        effect.close();
      }
    });
  }
  animate(fn) {
    if (this.#dispose === undefined) {
      if (DEV) {
        console.warn("Effect.animate called when closed, ignoring");
      }
      return;
    }
    let animate = requestAnimationFrame((now) => {
      fn(now);
      animate = undefined;
    });
    this.cleanup(() => {
      if (animate)
        cancelAnimationFrame(animate);
    });
  }
  interval(fn, ms) {
    if (this.#dispose === undefined) {
      if (DEV) {
        console.warn("Effect.interval called when closed, ignoring");
      }
      return;
    }
    const interval = setInterval(() => {
      fn();
    }, ms);
    this.cleanup(() => clearInterval(interval));
  }
  run(fn) {
    if (this.#dispose === undefined) {
      if (DEV) {
        console.warn("Effect.nested called when closed, ignoring");
      }
      return;
    }
    const effect = new Effect(fn);
    this.#dispose.push(() => effect.close());
  }
  effect(fn) {
    return this.run(fn);
  }
  getAll(signals) {
    const values = [];
    for (const signal of signals) {
      const value = this.get(signal);
      if (!value)
        return;
      values.push(value);
    }
    return values;
  }
  subscribe(signal, fn) {
    if (this.#dispose === undefined) {
      if (DEV) {
        console.warn("Effect.subscribe called when closed, running once");
      }
      fn(signal.peek());
      return;
    }
    this.run((effect) => {
      const value = effect.get(signal);
      fn(value);
    });
  }
  event(target, type, listener, options) {
    if (this.#dispose === undefined) {
      if (DEV) {
        console.warn("Effect.eventListener called when closed, ignoring");
      }
      return;
    }
    const signal = typeof options !== "boolean" && options?.signal ? AbortSignal.any([this.#abort.signal, options.signal]) : this.#abort.signal;
    const merged = typeof options === "boolean" ? { capture: options, signal } : { ...options, signal };
    target.addEventListener(type, listener, merged);
  }
  cleanup(fn) {
    if (this.#dispose === undefined) {
      if (DEV) {
        console.warn("Effect.cleanup called when closed, running immediately");
      }
      fn();
      return;
    }
    this.#dispose.push(fn);
  }
  close() {
    if (this.#dispose === undefined) {
      return;
    }
    this.#closed.resolve();
    this.#stopped.resolve();
    this.#abort.abort();
    for (const fn of this.#dispose)
      fn();
    this.#dispose = undefined;
    for (const signal of this.#unwatch)
      signal();
    this.#unwatch.length = 0;
    this.#async.length = 0;
    if (DEV) {
      Effect.#finalizer.unregister(this);
    }
  }
  get closed() {
    return this.#closed.promise;
  }
  get cancel() {
    return this.#stopped.promise;
  }
  get abort() {
    return this.#abort.signal;
  }
  proxy(dst, src) {
    this.subscribe(src, (value) => dst.update(() => value));
  }
}
function isEqual(a, b) {
  if (a === b)
    return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object")
    return false;
  const protoA = Object.getPrototypeOf(a);
  const protoB = Object.getPrototypeOf(b);
  if (protoA !== protoB)
    return false;
  if (protoA !== Object.prototype && protoA !== Array.prototype)
    return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length)
    return false;
  for (const key of keysA) {
    if (!isEqual(a[key], b[key]))
      return false;
  }
  return true;
}
// ../../../../tmp/moq-dev/js/lite/src/announced.ts
class AnnouncedState {
  queue = new Signal([]);
  closed = new Signal(false);
}

class Announced {
  state = new AnnouncedState;
  prefix;
  closed;
  constructor(prefix = empty()) {
    this.prefix = prefix;
    this.closed = new Promise((resolve) => {
      const dispose = this.state.closed.subscribe((closed) => {
        if (!closed)
          return;
        resolve(closed instanceof Error ? closed : undefined);
        dispose();
      });
    });
  }
  append(announcement) {
    if (this.state.closed.peek())
      throw new Error("announced is closed");
    this.state.queue.mutate((queue) => {
      queue.push(announcement);
    });
  }
  close(abort) {
    this.state.closed.set(abort ?? true);
    this.state.queue.mutate((queue) => {
      queue.length = 0;
    });
  }
  async next() {
    for (;; ) {
      const announce = this.state.queue.peek().shift();
      if (announce)
        return announce;
      const closed = this.state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed)
        return;
      await Signal.race(this.state.queue, this.state.closed);
    }
  }
}
// ../../../../tmp/moq-dev/js/lite/src/bandwidth.ts
function createBandwidth() {
  return new Signal(undefined);
}
// ../../../../tmp/moq-dev/js/lite/src/group.ts
class GroupState {
  frames = new Signal([]);
  closed = new Signal(false);
  total = new Signal(0);
}

class Group {
  sequence;
  state = new GroupState;
  closed;
  constructor(sequence) {
    this.sequence = sequence;
    this.closed = new Promise((resolve) => {
      const dispose = this.state.closed.subscribe((closed) => {
        if (!closed)
          return;
        resolve(closed instanceof Error ? closed : undefined);
        dispose();
      });
    });
  }
  writeFrame(frame) {
    if (this.state.closed.peek())
      throw new Error("group is closed");
    this.state.frames.mutate((frames) => {
      frames.push(frame);
    });
    this.state.total.update((total) => total + 1);
  }
  writeString(str) {
    this.writeFrame(new TextEncoder().encode(str));
  }
  writeJson(json) {
    this.writeString(JSON.stringify(json));
  }
  writeBool(bool) {
    this.writeFrame(new Uint8Array([bool ? 1 : 0]));
  }
  async readFrame() {
    for (;; ) {
      const frames = this.state.frames.peek();
      const frame = frames.shift();
      if (frame)
        return frame;
      const closed = this.state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed)
        return;
      await Signal.race(this.state.frames, this.state.closed);
    }
  }
  async readFrameSequence() {
    for (;; ) {
      const frames = this.state.frames.peek();
      const frame = frames.shift();
      if (frame)
        return { sequence: this.state.total.peek() - frames.length - 1, data: frame };
      const closed = this.state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed)
        return;
      await Signal.race(this.state.frames, this.state.closed);
    }
  }
  async readString() {
    const frame = await this.readFrame();
    return frame ? new TextDecoder().decode(frame) : undefined;
  }
  async readJson() {
    const frame = await this.readString();
    return frame ? JSON.parse(frame) : undefined;
  }
  async readBool() {
    const frame = await this.readFrame();
    return frame ? frame[0] === 1 : undefined;
  }
  close(abort) {
    this.state.closed.set(abort ?? true);
  }
}

// ../../../../tmp/moq-dev/js/lite/src/track.ts
class TrackState {
  groups = new Signal([]);
  closed = new Signal(false);
}

class Track {
  name;
  state = new TrackState;
  #next;
  #nextSequence = 0;
  closed;
  constructor(name) {
    this.name = name;
    this.closed = new Promise((resolve) => {
      const dispose = this.state.closed.subscribe((closed) => {
        if (!closed)
          return;
        resolve(closed instanceof Error ? closed : undefined);
        dispose();
      });
    });
  }
  appendGroup() {
    if (this.state.closed.peek())
      throw new Error("track is closed");
    const group = new Group(this.#next ?? 0);
    this.#next = group.sequence + 1;
    this.state.groups.mutate((groups) => {
      groups.push(group);
      groups.sort((a, b) => a.sequence - b.sequence);
    });
    return group;
  }
  writeGroup(group) {
    if (this.state.closed.peek())
      throw new Error("track is closed");
    if (group.sequence >= (this.#next ?? 0)) {
      this.#next = group.sequence + 1;
    }
    this.state.groups.mutate((groups) => {
      groups.push(group);
      groups.sort((a, b) => a.sequence - b.sequence);
    });
  }
  writeFrame(frame) {
    const group = this.appendGroup();
    group.writeFrame(frame);
    group.close();
  }
  writeString(str) {
    const group = this.appendGroup();
    group.writeString(str);
    group.close();
  }
  writeJson(json) {
    const group = this.appendGroup();
    group.writeJson(json);
    group.close();
  }
  writeBool(bool) {
    const group = this.appendGroup();
    group.writeBool(bool);
    group.close();
  }
  async recvGroup() {
    for (;; ) {
      const groups = this.state.groups.peek();
      if (groups.length > 0) {
        return groups.shift();
      }
      const closed = this.state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed)
        return;
      await Signal.race(this.state.groups, this.state.closed);
    }
  }
  async nextGroup() {
    return this.recvGroup();
  }
  async nextGroupOrdered() {
    for (;; ) {
      const group = await this.recvGroup();
      if (!group)
        return;
      if (group.sequence < this.#nextSequence) {
        group.close();
        continue;
      }
      this.#nextSequence = group.sequence + 1;
      return group;
    }
  }
  async readFrame() {
    return (await this.readFrameSequence())?.data;
  }
  async readFrameSequence() {
    for (;; ) {
      const groups = this.state.groups.peek();
      while (groups.length > 1) {
        const frames2 = groups[0].state.frames.peek();
        const next2 = frames2.shift();
        if (next2) {
          const frame = groups[0].state.total.peek() - frames2.length - 1;
          return { group: groups[0].sequence, frame, data: next2 };
        }
        groups.shift()?.close();
      }
      if (groups.length === 0) {
        const closed2 = this.state.closed.peek();
        if (closed2 instanceof Error)
          throw closed2;
        if (closed2)
          return;
        await Signal.race(this.state.groups, this.state.closed);
        continue;
      }
      const group = groups[0];
      const frames = group.state.frames.peek();
      const next = frames.shift();
      if (next) {
        const frame = group.state.total.peek() - frames.length - 1;
        return { group: group.sequence, frame, data: next };
      }
      const closed = this.state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed)
        return;
      await Signal.race(this.state.groups, this.state.closed, group.state.frames);
    }
  }
  async readString() {
    const next = await this.readFrame();
    if (!next)
      return;
    return new TextDecoder().decode(next);
  }
  async readJson() {
    const next = await this.readString();
    if (!next)
      return;
    return JSON.parse(next);
  }
  async readBool() {
    const next = await this.readFrame();
    if (!next)
      return;
    if (next.byteLength !== 1 || !(next[0] === 0 || next[0] === 1))
      throw new Error("invalid bool frame");
    return next[0] === 1;
  }
  close(abort) {
    this.state.closed.set(abort ?? true);
    for (const group of this.state.groups.peek()) {
      group.close(abort);
    }
  }
}

// ../../../../tmp/moq-dev/js/lite/src/broadcast.ts
class BroadcastState {
  requested = new Signal([]);
  closed = new Signal(false);
}

class Broadcast {
  state = new BroadcastState;
  closed;
  constructor() {
    this.closed = new Promise((resolve) => {
      const dispose = this.state.closed.subscribe((closed) => {
        if (!closed)
          return;
        resolve(closed instanceof Error ? closed : undefined);
        dispose();
      });
    });
  }
  async requested() {
    for (;; ) {
      const track = this.state.requested.peek().pop();
      if (track)
        return track;
      const closed = this.state.closed.peek();
      if (closed instanceof Error)
        throw closed;
      if (closed)
        return;
      await Signal.race(this.state.requested, this.state.closed);
    }
  }
  subscribe(name, priority) {
    const track = new Track(name);
    if (this.state.closed.peek()) {
      throw new Error(`broadcast is closed: ${this.state.closed.peek()}`);
    }
    this.state.requested.mutate((requested) => {
      requested.push({ track, priority });
      requested.sort((a, b) => a.priority - b.priority);
    });
    return track;
  }
  close(abort) {
    this.state.closed.set(abort ?? true);
    for (const { track } of this.state.requested.peek()) {
      track.close(abort);
    }
    this.state.requested.mutate((requested) => {
      requested.length = 0;
    });
  }
}
// ../../../../tmp/moq-dev/js/lite/src/connection/index.ts
var exports_connection = {};
__export(exports_connection, {
  connect: () => connect,
  accept: () => accept,
  Reload: () => Reload
});

// ../../../../tmp/moq-dev/node_modules/.bun/async-mutex@0.5.0/node_modules/async-mutex/index.mjs
var E_TIMEOUT = new Error("timeout while waiting for mutex to become available");
var E_ALREADY_LOCKED = new Error("mutex already locked");
var E_CANCELED = new Error("request for lock canceled");
var __awaiter$2 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

class Semaphore {
  constructor(_value, _cancelError = E_CANCELED) {
    this._value = _value;
    this._cancelError = _cancelError;
    this._queue = [];
    this._weightedWaiters = [];
  }
  acquire(weight = 1, priority = 0) {
    if (weight <= 0)
      throw new Error(`invalid weight ${weight}: must be positive`);
    return new Promise((resolve, reject) => {
      const task = { resolve, reject, weight, priority };
      const i = findIndexFromEnd(this._queue, (other) => priority <= other.priority);
      if (i === -1 && weight <= this._value) {
        this._dispatchItem(task);
      } else {
        this._queue.splice(i + 1, 0, task);
      }
    });
  }
  runExclusive(callback_1) {
    return __awaiter$2(this, arguments, undefined, function* (callback, weight = 1, priority = 0) {
      const [value, release] = yield this.acquire(weight, priority);
      try {
        return yield callback(value);
      } finally {
        release();
      }
    });
  }
  waitForUnlock(weight = 1, priority = 0) {
    if (weight <= 0)
      throw new Error(`invalid weight ${weight}: must be positive`);
    if (this._couldLockImmediately(weight, priority)) {
      return Promise.resolve();
    } else {
      return new Promise((resolve) => {
        if (!this._weightedWaiters[weight - 1])
          this._weightedWaiters[weight - 1] = [];
        insertSorted(this._weightedWaiters[weight - 1], { resolve, priority });
      });
    }
  }
  isLocked() {
    return this._value <= 0;
  }
  getValue() {
    return this._value;
  }
  setValue(value) {
    this._value = value;
    this._dispatchQueue();
  }
  release(weight = 1) {
    if (weight <= 0)
      throw new Error(`invalid weight ${weight}: must be positive`);
    this._value += weight;
    this._dispatchQueue();
  }
  cancel() {
    this._queue.forEach((entry) => entry.reject(this._cancelError));
    this._queue = [];
  }
  _dispatchQueue() {
    this._drainUnlockWaiters();
    while (this._queue.length > 0 && this._queue[0].weight <= this._value) {
      this._dispatchItem(this._queue.shift());
      this._drainUnlockWaiters();
    }
  }
  _dispatchItem(item) {
    const previousValue = this._value;
    this._value -= item.weight;
    item.resolve([previousValue, this._newReleaser(item.weight)]);
  }
  _newReleaser(weight) {
    let called = false;
    return () => {
      if (called)
        return;
      called = true;
      this.release(weight);
    };
  }
  _drainUnlockWaiters() {
    if (this._queue.length === 0) {
      for (let weight = this._value;weight > 0; weight--) {
        const waiters = this._weightedWaiters[weight - 1];
        if (!waiters)
          continue;
        waiters.forEach((waiter) => waiter.resolve());
        this._weightedWaiters[weight - 1] = [];
      }
    } else {
      const queuedPriority = this._queue[0].priority;
      for (let weight = this._value;weight > 0; weight--) {
        const waiters = this._weightedWaiters[weight - 1];
        if (!waiters)
          continue;
        const i = waiters.findIndex((waiter) => waiter.priority <= queuedPriority);
        (i === -1 ? waiters : waiters.splice(0, i)).forEach((waiter) => waiter.resolve());
      }
    }
  }
  _couldLockImmediately(weight, priority) {
    return (this._queue.length === 0 || this._queue[0].priority < priority) && weight <= this._value;
  }
}
function insertSorted(a, v) {
  const i = findIndexFromEnd(a, (other) => v.priority <= other.priority);
  a.splice(i + 1, 0, v);
}
function findIndexFromEnd(a, predicate) {
  for (let i = a.length - 1;i >= 0; i--) {
    if (predicate(a[i])) {
      return i;
    }
  }
  return -1;
}
var __awaiter$1 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

class Mutex {
  constructor(cancelError) {
    this._semaphore = new Semaphore(1, cancelError);
  }
  acquire() {
    return __awaiter$1(this, arguments, undefined, function* (priority = 0) {
      const [, releaser] = yield this._semaphore.acquire(1, priority);
      return releaser;
    });
  }
  runExclusive(callback, priority = 0) {
    return this._semaphore.runExclusive(() => callback(), 1, priority);
  }
  isLocked() {
    return this._semaphore.isLocked();
  }
  waitForUnlock(priority = 0) {
    return this._semaphore.waitForUnlock(1, priority);
  }
  release() {
    if (this._semaphore.isLocked())
      this._semaphore.release();
  }
  cancel() {
    return this._semaphore.cancel();
  }
}

// ../../../../tmp/moq-dev/js/lite/src/ietf/adapter.ts
init_stream();
init_varint();
init_namespace();
init_version();

class NativeSession {
  #quic;
  #requestId = 0n;
  version;
  constructor(quic, version) {
    this.#quic = quic;
    this.version = version;
  }
  async openBi() {
    return Stream.open(this.#quic, this.version);
  }
  async acceptBi() {
    return Stream.accept(this.#quic, this.version);
  }
  async nextRequestId() {
    const id = this.#requestId;
    this.#requestId += 2n;
    return id;
  }
}
var Route = {
  NewRequest: 0,
  Response: 1,
  ErrorResponse: 2,
  CloseStream: 3,
  FollowUp: 4,
  MaxRequestId: 5,
  Ignore: 6,
  GoAway: 7
};

class ControlStreamAdapter {
  #quic;
  #reader;
  #writer;
  #writeMutex = new Mutex;
  version;
  #streams = new Map;
  #namespaces = new Map;
  #namespacesByRequestId = new Map;
  #subscribeNamespaces = new Set;
  #incomingQueue = [];
  #incomingWaiters = [];
  #requestId = 0n;
  #maxRequestId;
  #maxRequestIdResolves = [];
  #closed = false;
  constructor(quic, controlStream, version, maxRequestId) {
    this.#quic = quic;
    this.#reader = controlStream.reader;
    this.#reader.version = version;
    this.#writer = controlStream.writer;
    this.#writer.version = version;
    this.version = version;
    this.#maxRequestId = maxRequestId;
  }
  async acceptBi() {
    if (this.#closed)
      return;
    const queued = this.#incomingQueue.shift();
    if (queued)
      return queued;
    return new Promise((resolve) => {
      this.#incomingWaiters.push(resolve);
    });
  }
  openBi() {
    let controller;
    let registeredRequestId;
    const readable = new ReadableStream({
      start(c) {
        controller = c;
      },
      cancel: () => {
        if (registeredRequestId !== undefined) {
          this.#streams.delete(registeredRequestId);
        }
      }
    });
    let buffer = new Uint8Array(0);
    let registered = false;
    const sendWritable = new WritableStream({
      write: async (chunk) => {
        const newBuf = new Uint8Array(buffer.length + chunk.length);
        newBuf.set(buffer);
        newBuf.set(chunk, buffer.length);
        buffer = newBuf;
        for (;; ) {
          const boundary = this.#messageSize(buffer);
          if (boundary === undefined)
            break;
          const toFlush = buffer.subarray(0, boundary);
          buffer = buffer.subarray(boundary);
          if (!registered) {
            const parsed = this.#tryParseOutgoing(toFlush);
            if (parsed) {
              registeredRequestId = parsed.requestId;
              this.#streams.set(parsed.requestId, { controller });
              registered = true;
            }
          }
          await this.#writeMutex.runExclusive(() => this.#writer.write(toFlush));
        }
      }
    });
    const stream = new Stream({ readable, writable: sendWritable });
    stream.reader.version = this.version;
    stream.writer.version = this.version;
    return stream;
  }
  async openNativeBi() {
    return Stream.open(this.#quic, this.version);
  }
  async nextRequestId() {
    for (;; ) {
      if (this.#closed)
        return;
      const id = this.#requestId;
      if (id < this.#maxRequestId) {
        this.#requestId += 2n;
        return id;
      }
      await new Promise((resolve) => {
        this.#maxRequestIdResolves.push(resolve);
      });
    }
  }
  async run() {
    try {
      if (this.version === Version.DRAFT_16) {
        this.#acceptNativeBidis();
      }
      for (;; ) {
        const done = await this.#reader.done();
        if (done)
          break;
        const typeId = await this.#reader.u53();
        const size2 = await this.#reader.u16();
        const body = await this.#reader.read(size2);
        const classified = await this.#classify(typeId, body);
        if (classified.route === Route.GoAway) {
          console.warn("received GOAWAY on control stream");
          return;
        }
        const { route, requestId } = classified;
        switch (route) {
          case Route.NewRequest:
            this.#newRequest(typeId, size2, body, requestId);
            break;
          case Route.Response:
            this.#pushMessage(requestId, typeId, size2, body);
            break;
          case Route.ErrorResponse:
            this.#pushMessage(requestId, typeId, size2, body);
            this.#closeStream(requestId);
            break;
          case Route.CloseStream:
            this.#closeStream(requestId);
            break;
          case Route.FollowUp:
            this.#pushMessage(requestId, typeId, size2, body);
            break;
          case Route.MaxRequestId:
            this.#maxRequestId = requestId;
            for (const resolve of this.#maxRequestIdResolves)
              resolve();
            this.#maxRequestIdResolves = [];
            break;
        }
      }
    } finally {
      this.close();
    }
  }
  async#acceptNativeBidis() {
    try {
      for (;; ) {
        const stream = await Stream.accept(this.#quic, this.version);
        if (!stream)
          break;
        const waiter = this.#incomingWaiters.shift();
        if (waiter) {
          waiter(stream);
        } else {
          this.#incomingQueue.push(stream);
        }
      }
    } catch {}
  }
  #newRequest(typeId, size2, body, requestId) {
    let controller;
    const readable = new ReadableStream({
      start(c) {
        controller = c;
      },
      cancel: () => {
        this.#streams.delete(requestId);
      }
    });
    const sendWritable = this.#createSendWritable();
    const stream = new Stream({ readable, writable: sendWritable });
    stream.reader.version = this.version;
    stream.writer.version = this.version;
    this.#streams.set(requestId, { controller });
    controller.enqueue(this.#encodeRaw(typeId, size2, body));
    const waiter = this.#incomingWaiters.shift();
    if (waiter) {
      waiter(stream);
    } else {
      this.#incomingQueue.push(stream);
    }
  }
  #pushMessage(requestId, typeId, size2, body) {
    const entry = this.#streams.get(requestId);
    if (!entry) {
      console.warn(`adapter: no stream for requestId=${requestId} typeId=0x${typeId.toString(16)}`);
      return;
    }
    try {
      entry.controller.enqueue(this.#encodeRaw(typeId, size2, body));
    } catch {}
  }
  #closeStream(requestId) {
    const entry = this.#streams.get(requestId);
    if (!entry)
      return;
    console.debug(`adapter: closing stream requestId=${requestId}`);
    this.#streams.delete(requestId);
    this.#subscribeNamespaces.delete(requestId);
    const namespace = this.#namespacesByRequestId.get(requestId);
    if (namespace !== undefined) {
      this.#namespaces.delete(namespace);
      this.#namespacesByRequestId.delete(requestId);
    }
    try {
      entry.controller.close();
    } catch {}
  }
  #messageSize(buffer) {
    if (buffer.length === 0)
      return;
    const typeSize = 1 << ((buffer[0] & 192) >> 6);
    if (buffer.length < typeSize)
      return;
    const [, afterType] = decode(buffer);
    if (afterType.length < 2)
      return;
    const size2 = afterType[0] << 8 | afterType[1];
    const totalSize = buffer.length - afterType.length + 2 + size2;
    if (buffer.length < totalSize)
      return;
    return totalSize;
  }
  #tryParseOutgoing(buffer) {
    if (buffer.length === 0)
      return;
    const typeSize = 1 << ((buffer[0] & 192) >> 6);
    if (buffer.length < typeSize)
      return;
    const [typeId, afterType] = decode(buffer);
    if (afterType.length < 2)
      return;
    const size2 = afterType[0] << 8 | afterType[1];
    const bodyStart = afterType.subarray(2);
    if (bodyStart.length < size2)
      return;
    const body = bodyStart.subarray(0, size2);
    const [reqId] = decode(body);
    const requestId = BigInt(reqId);
    if (typeId === 6) {
      try {
        const [, afterReqId] = decode(body);
        this.#parseAndRegisterNamespace(afterReqId, requestId);
      } catch {}
    }
    if (typeId === 17) {
      this.#subscribeNamespaces.add(requestId);
    }
    return { requestId };
  }
  #parseAndRegisterNamespace(buf, requestId) {
    const decoder = new TextDecoder;
    const [partCount, afterCount] = decode(buf);
    let cursor = afterCount;
    const parts = [];
    for (let i = 0;i < partCount; i++) {
      const [len, afterLen] = decode(cursor);
      parts.push(decoder.decode(afterLen.subarray(0, len)));
      cursor = afterLen.subarray(len);
    }
    const namespace = parts.join("/");
    this.#namespaces.set(namespace, requestId);
    this.#namespacesByRequestId.set(requestId, namespace);
  }
  #createSendWritable() {
    let buffer = new Uint8Array(0);
    return new WritableStream({
      write: async (chunk) => {
        const newBuf = new Uint8Array(buffer.length + chunk.length);
        newBuf.set(buffer);
        newBuf.set(chunk, buffer.length);
        buffer = newBuf;
        for (;; ) {
          const boundary = this.#messageSize(buffer);
          if (boundary === undefined)
            break;
          const toFlush = buffer.subarray(0, boundary);
          buffer = buffer.subarray(boundary);
          await this.#writeMutex.runExclusive(() => this.#writer.write(toFlush));
        }
      }
    });
  }
  #encodeRaw(typeId, size2, body) {
    const typeIdBytes = encodeTo(new ArrayBuffer(9), typeId);
    const result = new Uint8Array(typeIdBytes.byteLength + 2 + body.byteLength);
    result.set(typeIdBytes, 0);
    const sizeView = new DataView(result.buffer, typeIdBytes.byteLength, 2);
    sizeView.setUint16(0, size2);
    result.set(body, typeIdBytes.byteLength + 2);
    return result;
  }
  async#classify(typeId, body) {
    const readRequestId = async () => {
      const r = new Reader(undefined, body, this.version);
      return await r.u62();
    };
    const readNamespaceRequestId = async () => {
      const r = new Reader(undefined, body, this.version);
      const namespace = await decode2(r);
      const requestId = this.#namespaces.get(namespace);
      if (requestId === undefined)
        throw new Error(`unknown namespace: ${namespace}`);
      this.#namespaces.delete(namespace);
      return requestId;
    };
    switch (typeId) {
      case 2: {
        const requestId = await readRequestId();
        return { route: Route.FollowUp, requestId };
      }
      case 3:
      case 22:
      case 29:
      case 13: {
        const requestId = await readRequestId();
        return { route: Route.NewRequest, requestId };
      }
      case 6: {
        const r = new Reader(undefined, body, this.version);
        const requestId = await r.u62();
        const namespace = await decode2(r);
        this.#namespaces.set(namespace, requestId);
        this.#namespacesByRequestId.set(requestId, namespace);
        return { route: Route.NewRequest, requestId };
      }
      case 17: {
        if (this.version !== Version.DRAFT_14 && this.version !== Version.DRAFT_15) {
          throw new Error("unexpected SubscribeNamespace on control stream");
        }
        const requestId = await readRequestId();
        return { route: Route.NewRequest, requestId };
      }
      case 4: {
        const requestId = await readRequestId();
        return { route: Route.Response, requestId };
      }
      case 24: {
        const requestId = await readRequestId();
        return { route: Route.Response, requestId };
      }
      case 30: {
        const requestId = await readRequestId();
        return { route: Route.Response, requestId };
      }
      case 7: {
        const requestId = await readRequestId();
        return { route: Route.Response, requestId };
      }
      case 18: {
        if (this.version !== Version.DRAFT_14)
          throw new Error("unexpected SubscribeNamespaceOk");
        const requestId = await readRequestId();
        return { route: Route.Response, requestId };
      }
      case 5: {
        const requestId = await readRequestId();
        return { route: Route.ErrorResponse, requestId };
      }
      case 25: {
        if (this.version !== Version.DRAFT_14)
          throw new Error("unexpected FetchError");
        const requestId = await readRequestId();
        return { route: Route.ErrorResponse, requestId };
      }
      case 31: {
        if (this.version !== Version.DRAFT_14)
          throw new Error("unexpected PublishError");
        const requestId = await readRequestId();
        return { route: Route.ErrorResponse, requestId };
      }
      case 8: {
        if (this.version === Version.DRAFT_14) {
          const requestId = await readRequestId();
          return { route: Route.ErrorResponse, requestId };
        }
        const subNs08 = this.#subscribeNamespaces.values().next().value;
        if (subNs08 === undefined)
          throw new Error("unexpected message 0x08: no SubscribeNamespace stream");
        return { route: Route.FollowUp, requestId: subNs08 };
      }
      case 14: {
        const subNs0e = this.#subscribeNamespaces.values().next().value;
        if (subNs0e === undefined)
          throw new Error("unexpected message 0x0e: no SubscribeNamespace stream");
        return { route: Route.FollowUp, requestId: subNs0e };
      }
      case 19: {
        if (this.version !== Version.DRAFT_14)
          throw new Error("unexpected SubscribeNamespaceError");
        const requestId = await readRequestId();
        return { route: Route.ErrorResponse, requestId };
      }
      case 10: {
        const requestId = await readRequestId();
        return { route: Route.CloseStream, requestId };
      }
      case 11: {
        const requestId = await readRequestId();
        return { route: Route.CloseStream, requestId };
      }
      case 23: {
        const requestId = await readRequestId();
        return { route: Route.CloseStream, requestId };
      }
      case 9: {
        if (this.version === Version.DRAFT_16) {
          const requestId2 = await readRequestId();
          return { route: Route.CloseStream, requestId: requestId2 };
        }
        const requestId = await readNamespaceRequestId();
        return { route: Route.CloseStream, requestId };
      }
      case 12: {
        if (this.version === Version.DRAFT_16) {
          const requestId2 = await readRequestId();
          return { route: Route.CloseStream, requestId: requestId2 };
        }
        const requestId = await readNamespaceRequestId();
        return { route: Route.CloseStream, requestId };
      }
      case 20: {
        if (this.version !== Version.DRAFT_14 && this.version !== Version.DRAFT_15) {
          throw new Error("unexpected UnsubscribeNamespace");
        }
        const requestId = await readRequestId();
        return { route: Route.CloseStream, requestId };
      }
      case 21: {
        const requestId = await readRequestId();
        return { route: Route.MaxRequestId, requestId };
      }
      case 26: {
        await readRequestId();
        return { route: Route.Ignore, requestId: 0n };
      }
      case 16:
        return { route: Route.GoAway };
      default:
        throw new Error(`unknown control message type: 0x${typeId.toString(16)}`);
    }
  }
  close() {
    if (this.#closed)
      return;
    this.#closed = true;
    console.debug("adapter: close() called");
    for (const entry of this.#streams.values()) {
      try {
        entry.controller.close();
      } catch {}
    }
    this.#streams.clear();
    for (const waiter of this.#incomingWaiters) {
      waiter(undefined);
    }
    this.#incomingWaiters = [];
    this.#namespaces.clear();
    this.#namespacesByRequestId.clear();
    this.#subscribeNamespaces.clear();
    for (const resolve of this.#maxRequestIdResolves)
      resolve();
    this.#maxRequestIdResolves = [];
  }
}

// ../../../../tmp/moq-dev/js/lite/src/ietf/connection.ts
init_stream();

// ../../../../tmp/moq-dev/js/lite/src/ietf/goaway.ts
init_message();
init_version();

class GoAway {
  static id = 16;
  newSessionUri;
  timeout;
  constructor({ newSessionUri, timeout = 0n }) {
    this.newSessionUri = newSessionUri;
    this.timeout = timeout;
  }
  async#encode(w, version) {
    await w.string(this.newSessionUri);
    if (version === Version.DRAFT_17) {
      await w.u62(this.timeout);
    }
  }
  async encode(w, version) {
    return encode3(w, (mw) => this.#encode(mw, version));
  }
  static async decode(r, version) {
    return decode3(r, (mr) => GoAway.#decode(mr, version));
  }
  static async#decode(r, version) {
    const newSessionUri = await r.string();
    const timeout = version === Version.DRAFT_17 ? await r.u62() : 0n;
    return new GoAway({ newSessionUri, timeout });
  }
}

// ../../../../tmp/moq-dev/js/lite/src/ietf/object.ts
var GROUP_END = 3;

class Group2 {
  flags;
  trackAlias;
  groupId;
  subGroupId;
  publisherPriority;
  constructor({
    trackAlias,
    groupId,
    subGroupId,
    publisherPriority,
    flags
  }) {
    this.flags = flags;
    this.trackAlias = trackAlias;
    this.groupId = groupId;
    this.subGroupId = subGroupId;
    this.publisherPriority = publisherPriority;
  }
  async encode(w) {
    if (!this.flags.hasSubgroup && this.subGroupId !== 0) {
      throw new Error(`Subgroup ID must be 0 if hasSubgroup is false: ${this.subGroupId}`);
    }
    const base = this.flags.hasPriority ? 16 : 48;
    let id = base;
    if (this.flags.hasExtensions) {
      id |= 1;
    }
    if (this.flags.hasSubgroupObject) {
      id |= 2;
    }
    if (this.flags.hasSubgroup) {
      id |= 4;
    }
    if (this.flags.hasEnd) {
      id |= 8;
    }
    await w.u53(id);
    await w.u62(this.trackAlias);
    await w.u53(this.groupId);
    if (this.flags.hasSubgroup) {
      await w.u53(this.subGroupId);
    }
    if (this.flags.hasPriority) {
      await w.u8(this.publisherPriority);
    }
  }
  static async decode(r) {
    const id = await r.u53();
    let hasPriority;
    let baseId;
    if (id >= 16 && id <= 31) {
      hasPriority = true;
      baseId = id;
    } else if (id >= 48 && id <= 63) {
      hasPriority = false;
      baseId = id - (48 - 16);
    } else {
      throw new Error(`Unsupported group type: ${id}`);
    }
    const flags = {
      hasExtensions: (baseId & 1) !== 0,
      hasSubgroupObject: (baseId & 2) !== 0,
      hasSubgroup: (baseId & 4) !== 0,
      hasEnd: (baseId & 8) !== 0,
      hasPriority
    };
    const trackAlias = await r.u62();
    const groupId = await r.u53();
    const subGroupId = flags.hasSubgroup ? await r.u53() : 0;
    const publisherPriority = hasPriority ? await r.u8() : 128;
    return new Group2({ trackAlias, groupId, subGroupId, publisherPriority, flags });
  }
}

class Frame {
  payload;
  constructor({ payload } = {}) {
    this.payload = payload;
  }
  async encode(w, flags) {
    await w.u53(0);
    if (flags.hasExtensions) {
      await w.u53(0);
    }
    if (this.payload !== undefined) {
      await w.u53(this.payload.byteLength);
      if (this.payload.byteLength === 0) {
        await w.u53(0);
      } else {
        await w.write(this.payload);
      }
    } else {
      await w.u53(0);
      await w.u53(GROUP_END);
    }
  }
  static async decode(r, flags) {
    const delta = await r.u53();
    if (delta !== 0) {
      throw new Error(`object ID delta is not supported: ${delta}`);
    }
    if (flags.hasExtensions) {
      const extensionsLength = await r.u53();
      await r.read(extensionsLength);
    }
    const payloadLength = await r.u53();
    if (payloadLength > 0) {
      const payload = await r.read(payloadLength);
      return new Frame({ payload });
    }
    const status = await r.u53();
    if (flags.hasEnd) {
      if (status === 0)
        return new Frame({ payload: new Uint8Array(0) });
    } else if (status === 0 || status === GROUP_END) {
      return new Frame;
    }
    throw new Error(`Unsupported object status: ${status}`);
  }
}

// ../../../../tmp/moq-dev/js/lite/src/ietf/publish.ts
init_message();
init_namespace();
init_parameters();
init_properties();
init_version();

class Publish {
  static id = 29;
  requestId;
  trackNamespace;
  trackName;
  trackAlias;
  groupOrder;
  contentExists;
  largest;
  forward;
  constructor({
    requestId,
    trackNamespace,
    trackName,
    trackAlias,
    groupOrder,
    contentExists,
    largest,
    forward
  }) {
    this.requestId = requestId;
    this.trackNamespace = trackNamespace;
    this.trackName = trackName;
    this.trackAlias = trackAlias;
    this.groupOrder = groupOrder;
    this.contentExists = contentExists;
    this.largest = largest;
    this.forward = forward;
  }
  async#encode(w, version) {
    await w.u62(this.requestId);
    if (version === Version.DRAFT_17) {
      await w.u62(0n);
    }
    await encode2(w, this.trackNamespace);
    await w.string(this.trackName);
    await w.u62(this.trackAlias);
    if (version === Version.DRAFT_14) {
      await w.u8(this.groupOrder);
      await w.bool(this.contentExists);
      if (this.contentExists !== !!this.largest) {
        throw new Error("contentExists and largest must both be true or false");
      }
      if (this.largest) {
        await w.u62(this.largest.groupId);
        await w.u62(this.largest.objectId);
      }
      await w.bool(this.forward);
      await w.u53(0);
    } else {
      if (this.contentExists !== !!this.largest) {
        throw new Error("contentExists and largest must both be true or false");
      }
      const params = new Parameters;
      params.groupOrder = this.groupOrder;
      params.forward = this.forward;
      if (this.largest) {
        params.largest = this.largest;
      }
      await params.encode(w, version);
    }
  }
  async encode(w, version) {
    return encode3(w, (mw) => this.#encode(mw, version));
  }
  static async decode(r, version) {
    return decode3(r, (mr) => Publish.#decode(mr, version));
  }
  static async#decode(r, version) {
    const requestId = await r.u62();
    if (version === Version.DRAFT_17) {
      await r.u62();
    }
    const trackNamespace = await decode2(r);
    const trackName = await r.string();
    const trackAlias = await r.u62();
    if (version === Version.DRAFT_14) {
      const groupOrder2 = await r.u8();
      const contentExists = await r.bool();
      const largest2 = contentExists ? { groupId: await r.u62(), objectId: await r.u62() } : undefined;
      const forward2 = await r.bool();
      await Parameters.decode(r, version);
      return new Publish({
        requestId,
        trackNamespace,
        trackName,
        trackAlias,
        groupOrder: groupOrder2,
        contentExists,
        largest: largest2,
        forward: forward2
      });
    }
    const params = await Parameters.decode(r, version);
    await skip(r, version);
    const groupOrder = params.groupOrder ?? 2;
    const forward = params.forward ?? true;
    const largest = params.largest;
    return new Publish({
      requestId,
      trackNamespace,
      trackName,
      trackAlias,
      groupOrder,
      contentExists: !!largest,
      largest,
      forward
    });
  }
}

class PublishOk {
  static id = 30;
  async#encode(_w) {
    throw new Error("PUBLISH_OK messages are not supported");
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode3(r, PublishOk.#decode);
  }
  static async#decode(_r) {
    throw new Error("PUBLISH_OK messages are not supported");
  }
}

class PublishError {
  static id = 31;
  requestId;
  errorCode;
  reasonPhrase;
  constructor({
    requestId,
    errorCode,
    reasonPhrase
  }) {
    this.requestId = requestId;
    this.errorCode = errorCode;
    this.reasonPhrase = reasonPhrase;
  }
  async#encode(w) {
    await w.u62(this.requestId);
    await w.u62(BigInt(this.errorCode));
    await w.string(this.reasonPhrase);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode3(r, PublishError.#decode);
  }
  static async#decode(r) {
    const requestId = await r.u62();
    const errorCode = Number(await r.u62());
    const reasonPhrase = await r.string();
    return new PublishError({ requestId, errorCode, reasonPhrase });
  }
}

class PublishDone {
  static id = 11;
  requestId;
  statusCode;
  reasonPhrase;
  constructor({
    requestId,
    statusCode,
    reasonPhrase
  }) {
    this.requestId = requestId;
    this.statusCode = statusCode;
    this.reasonPhrase = reasonPhrase;
  }
  async#encode(w, version) {
    if (version !== Version.DRAFT_17) {
      if (this.requestId === undefined)
        throw new Error("requestId required for draft14-16");
      await w.u62(this.requestId);
    }
    await w.u62(BigInt(this.statusCode));
    await w.u62(BigInt(0));
    await w.string(this.reasonPhrase);
  }
  async encode(w, version) {
    return encode3(w, (mw) => this.#encode(mw, version));
  }
  static async decode(r, version) {
    return decode3(r, (mr) => PublishDone.#decode(mr, version));
  }
  static async#decode(r, version) {
    const requestId = version === Version.DRAFT_17 ? undefined : await r.u62();
    const statusCode = Number(await r.u62());
    await r.u62();
    const reasonPhrase = await r.string();
    return new PublishDone({ requestId, statusCode, reasonPhrase });
  }
}

// ../../../../tmp/moq-dev/js/lite/src/ietf/connection.ts
init_publish_namespace();

// ../../../../tmp/moq-dev/js/lite/src/ietf/publisher.ts
init_stream();

// ../../../../tmp/moq-dev/js/lite/src/util/error.ts
function error(err) {
  return err instanceof Error ? err : new Error(String(err));
}

// ../../../../tmp/moq-dev/js/lite/src/ietf/publisher.ts
init_publish_namespace();

// ../../../../tmp/moq-dev/js/lite/src/ietf/request.ts
init_message();
init_parameters();
init_properties();
init_version();

class MaxRequestId {
  static id = 21;
  requestId;
  constructor({ requestId }) {
    this.requestId = requestId;
  }
  async#encode(w) {
    await w.u62(this.requestId);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async#decode(r) {
    return new MaxRequestId({ requestId: await r.u62() });
  }
  static async decode(r, _version) {
    return decode3(r, MaxRequestId.#decode);
  }
}

class RequestsBlocked {
  static id = 26;
  requestId;
  constructor({ requestId }) {
    this.requestId = requestId;
  }
  async#encode(w) {
    await w.u62(this.requestId);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async#decode(r) {
    return new RequestsBlocked({ requestId: await r.u62() });
  }
  static async decode(r, _version) {
    return decode3(r, RequestsBlocked.#decode);
  }
}

class RequestOk {
  static id = 7;
  requestId;
  parameters;
  constructor({ requestId, parameters = new Parameters }) {
    this.requestId = requestId;
    this.parameters = parameters;
  }
  async#encode(w, version) {
    if (version !== Version.DRAFT_17) {
      if (this.requestId === undefined)
        throw new Error("requestId required for draft14-16");
      await w.u62(this.requestId);
    }
    await this.parameters.encode(w, version);
  }
  async encode(w, version) {
    return encode3(w, (wr) => this.#encode(wr, version));
  }
  static async#decode(r, version) {
    const requestId = version === Version.DRAFT_17 ? undefined : await r.u62();
    const parameters = await Parameters.decode(r, version);
    await skip(r, version);
    return new RequestOk({ requestId, parameters });
  }
  static async decode(r, version) {
    return decode3(r, (rd) => RequestOk.#decode(rd, version));
  }
}

class RequestError {
  static id = 5;
  requestId;
  errorCode;
  reasonPhrase;
  retryInterval;
  constructor({
    requestId,
    errorCode,
    reasonPhrase,
    retryInterval = 0n
  }) {
    this.requestId = requestId;
    this.errorCode = errorCode;
    this.reasonPhrase = reasonPhrase;
    this.retryInterval = retryInterval;
  }
  async#encode(w, version) {
    if (version !== Version.DRAFT_17) {
      if (this.requestId === undefined)
        throw new Error("requestId required for draft14-16");
      await w.u62(this.requestId);
    }
    await w.u62(BigInt(this.errorCode));
    if (version === Version.DRAFT_16 || version === Version.DRAFT_17) {
      await w.u62(this.retryInterval);
    }
    await w.string(this.reasonPhrase);
  }
  async encode(w, version) {
    return encode3(w, (wr) => this.#encode(wr, version));
  }
  static async#decode(r, version) {
    const requestId = version === Version.DRAFT_17 ? undefined : await r.u62();
    const errorCode = Number(await r.u62());
    const retryInterval = version === Version.DRAFT_16 || version === Version.DRAFT_17 ? await r.u62() : 0n;
    const reasonPhrase = await r.string();
    return new RequestError({ requestId, errorCode, reasonPhrase, retryInterval });
  }
  static async decode(r, version) {
    return decode3(r, (rd) => RequestError.#decode(rd, version));
  }
}

// ../../../../tmp/moq-dev/js/lite/src/ietf/publisher.ts
init_subscribe();

// ../../../../tmp/moq-dev/js/lite/src/ietf/subscribe_namespace.ts
init_message();
init_namespace();
init_parameters();
init_version();

class SubscribeNamespace {
  static id = 17;
  namespace;
  requestId;
  subscribeOptions;
  constructor({
    namespace,
    requestId,
    subscribeOptions = 1
  }) {
    this.namespace = namespace;
    this.requestId = requestId;
    this.subscribeOptions = subscribeOptions;
  }
  async#encode(w, version) {
    await w.u62(this.requestId);
    if (version === Version.DRAFT_17) {
      await w.u62(0n);
    }
    await encode2(w, this.namespace);
    if (version === Version.DRAFT_16 || version === Version.DRAFT_17) {
      await w.u53(this.subscribeOptions);
    }
    await new Parameters().encode(w, version);
  }
  async encode(w, version) {
    return encode3(w, (wr) => this.#encode(wr, version));
  }
  static async decode(r, version) {
    return decode3(r, (rd) => SubscribeNamespace.#decode(rd, version));
  }
  static async#decode(r, version) {
    const requestId = await r.u62();
    if (version === Version.DRAFT_17) {
      await r.u62();
    }
    const namespace = await decode2(r);
    let subscribeOptions = 1;
    if (version === Version.DRAFT_16 || version === Version.DRAFT_17) {
      subscribeOptions = await r.u53();
    }
    await Parameters.decode(r, version);
    return new SubscribeNamespace({ namespace, requestId, subscribeOptions });
  }
}

class SubscribeNamespaceOk {
  static id = 18;
  requestId;
  constructor({ requestId }) {
    this.requestId = requestId;
  }
  async#encode(w) {
    await w.u62(this.requestId);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode3(r, SubscribeNamespaceOk.#decode);
  }
  static async#decode(r) {
    const requestId = await r.u62();
    return new SubscribeNamespaceOk({ requestId });
  }
}

class SubscribeNamespaceError {
  static id = 19;
  requestId;
  errorCode;
  reasonPhrase;
  constructor({
    requestId,
    errorCode,
    reasonPhrase
  }) {
    this.requestId = requestId;
    this.errorCode = errorCode;
    this.reasonPhrase = reasonPhrase;
  }
  async#encode(w) {
    await w.u62(this.requestId);
    await w.u62(BigInt(this.errorCode));
    await w.string(this.reasonPhrase);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode3(r, SubscribeNamespaceError.#decode);
  }
  static async#decode(r) {
    const requestId = await r.u62();
    const errorCode = Number(await r.u62());
    const reasonPhrase = await r.string();
    return new SubscribeNamespaceError({ requestId, errorCode, reasonPhrase });
  }
}

class UnsubscribeNamespace {
  static id = 20;
  requestId;
  constructor({ requestId }) {
    this.requestId = requestId;
  }
  async#encode(w) {
    await w.u62(this.requestId);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode3(r, UnsubscribeNamespace.#decode);
  }
  static async#decode(r) {
    const requestId = await r.u62();
    return new UnsubscribeNamespace({ requestId });
  }
}

class SubscribeNamespaceEntry {
  static id = 8;
  suffix;
  constructor({ suffix }) {
    this.suffix = suffix;
  }
  async#encode(w) {
    await encode2(w, this.suffix);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode3(r, SubscribeNamespaceEntry.#decode);
  }
  static async#decode(r) {
    const suffix = await decode2(r);
    return new SubscribeNamespaceEntry({ suffix });
  }
}

class SubscribeNamespaceEntryDone {
  static id = 14;
  suffix;
  constructor({ suffix }) {
    this.suffix = suffix;
  }
  async#encode(w) {
    await encode2(w, this.suffix);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode3(r, SubscribeNamespaceEntryDone.#decode);
  }
  static async#decode(r) {
    const suffix = await decode2(r);
    return new SubscribeNamespaceEntryDone({ suffix });
  }
}

class PublishBlocked {
  static id = 15;
  suffix;
  trackName;
  constructor({ suffix, trackName }) {
    this.suffix = suffix;
    this.trackName = trackName;
  }
  async#encode(w) {
    await encode2(w, this.suffix);
    await w.string(this.trackName);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode3(r, PublishBlocked.#decode);
  }
  static async#decode(r) {
    const suffix = await decode2(r);
    const trackName = await r.string();
    return new PublishBlocked({ suffix, trackName });
  }
}

// ../../../../tmp/moq-dev/js/lite/src/ietf/track.ts
init_message();
init_namespace();
init_parameters();
init_version();
var GROUP_ORDER2 = 2;

class TrackStatusRequest {
  static id = 13;
  requestId;
  trackNamespace;
  trackName;
  constructor({
    requestId,
    trackNamespace,
    trackName
  }) {
    this.requestId = requestId;
    this.trackNamespace = trackNamespace;
    this.trackName = trackName;
  }
  async#encode(w, version) {
    await w.u62(this.requestId);
    if (version === Version.DRAFT_17) {
      await w.u62(0n);
    }
    await encode2(w, this.trackNamespace);
    await w.string(this.trackName);
    if (version === Version.DRAFT_14) {
      await w.u8(0);
      await w.u8(GROUP_ORDER2);
      await w.bool(false);
      await w.u53(2);
      await w.u53(0);
    } else {
      const params = new Parameters;
      await params.encode(w, version);
    }
  }
  async encode(w, version) {
    return encode3(w, (mw) => this.#encode(mw, version));
  }
  static async decode(r, version) {
    return decode3(r, (mr) => TrackStatusRequest.#decode(mr, version));
  }
  static async#decode(r, version) {
    const requestId = await r.u62();
    if (version === Version.DRAFT_17) {
      await r.u62();
    }
    const trackNamespace = await decode2(r);
    const trackName = await r.string();
    if (version === Version.DRAFT_14) {
      await r.u8();
      await r.u8();
      await r.bool();
      await r.u53();
      await Parameters.decode(r, version);
    } else {
      await Parameters.decode(r, version);
    }
    return new TrackStatusRequest({ requestId, trackNamespace, trackName });
  }
}

class TrackStatus {
  static id = 14;
  trackNamespace;
  trackName;
  statusCode;
  lastGroupId;
  lastObjectId;
  constructor({
    trackNamespace,
    trackName,
    statusCode,
    lastGroupId,
    lastObjectId
  }) {
    this.trackNamespace = trackNamespace;
    this.trackName = trackName;
    this.statusCode = statusCode;
    this.lastGroupId = lastGroupId;
    this.lastObjectId = lastObjectId;
  }
  async#encode(w) {
    await encode2(w, this.trackNamespace);
    await w.string(this.trackName);
    await w.u62(BigInt(this.statusCode));
    await w.u62(this.lastGroupId);
    await w.u62(this.lastObjectId);
  }
  async encode(w, _version) {
    return encode3(w, this.#encode.bind(this));
  }
  static async decode(r, _version) {
    return decode3(r, TrackStatus.#decode);
  }
  static async#decode(r) {
    const trackNamespace = await decode2(r);
    const trackName = await r.string();
    const statusCode = Number(await r.u62());
    const lastGroupId = await r.u62();
    const lastObjectId = await r.u62();
    return new TrackStatus({ trackNamespace, trackName, statusCode, lastGroupId, lastObjectId });
  }
  static STATUS_IN_PROGRESS = 0;
  static STATUS_NOT_FOUND = 1;
  static STATUS_NOT_AUTHORIZED = 2;
  static STATUS_ENDED = 3;
}

// ../../../../tmp/moq-dev/js/lite/src/ietf/publisher.ts
init_version();

class Publisher {
  #quic;
  #session;
  #broadcasts = new Map;
  #announcedConsumers = new Set;
  constructor(quic, session) {
    this.#quic = quic;
    this.#session = session;
  }
  publish(path, broadcast) {
    this.#broadcasts.set(path, broadcast);
    this.#notifyConsumers(path, true);
    this.#runPublish(path, broadcast);
  }
  async#runPublish(path, broadcast) {
    try {
      const requestId = await this.#session.nextRequestId();
      if (requestId === undefined)
        return;
      const stream = await this.#session.openBi();
      try {
        await stream.writer.u53(PublishNamespace.id);
        const msg = new PublishNamespace({ requestId, trackNamespace: path });
        await msg.encode(stream.writer, this.#session.version);
        const respTypeId = await stream.reader.u53();
        if (respTypeId === RequestOk.id) {
          if (this.#session.version === Version.DRAFT_14) {
            await PublishNamespaceOk.decode(stream.reader, this.#session.version);
          } else {
            await RequestOk.decode(stream.reader, this.#session.version);
          }
        } else {
          throw new Error(`PublishNamespace rejected: typeId=0x${respTypeId.toString(16)}`);
        }
        await Promise.race([broadcast.closed, stream.reader.closed]);
        if (this.#session.version !== Version.DRAFT_17) {
          try {
            await stream.writer.u53(PublishNamespaceDone.id);
            const done = new PublishNamespaceDone({ trackNamespace: path, requestId });
            await done.encode(stream.writer, this.#session.version);
          } catch {}
        }
        stream.close();
      } catch (err) {
        stream.abort(error(err));
        throw err;
      }
    } catch (err) {
      const e = error(err);
      console.warn(`announce failed: broadcast=${path} error=${e.message}`);
    } finally {
      broadcast.close();
      this.#broadcasts.delete(path);
      this.#notifyConsumers(path, false);
    }
  }
  async runSubscribe(msg, stream) {
    const version = this.#session.version;
    const name = msg.trackNamespace;
    const broadcast = this.#broadcasts.get(name);
    if (!broadcast) {
      if (version === Version.DRAFT_14) {
        await stream.writer.u53(SubscribeError.id);
        const err = new SubscribeError({
          requestId: msg.requestId,
          errorCode: 404,
          reasonPhrase: "Broadcast not found"
        });
        await err.encode(stream.writer, version);
      } else {
        await stream.writer.u53(RequestError.id);
        const err = new RequestError({
          requestId: version === Version.DRAFT_17 ? undefined : msg.requestId,
          errorCode: 404,
          reasonPhrase: "Broadcast not found"
        });
        await err.encode(stream.writer, version);
      }
      stream.close();
      return;
    }
    const track = broadcast.subscribe(msg.trackName, msg.subscriberPriority);
    try {
      await stream.writer.u53(SubscribeOk.id);
      const ok = new SubscribeOk({
        requestId: version === Version.DRAFT_17 ? undefined : msg.requestId,
        trackAlias: msg.requestId
      });
      await ok.encode(stream.writer, version);
      console.debug(`publish ok: broadcast=${name} track=${track.name}`);
      const serving = (async () => {
        for (;; ) {
          const group = await track.recvGroup();
          if (!group)
            return;
          this.#runGroup(msg.requestId, group);
        }
      })();
      await Promise.race([serving, stream.reader.closed]);
      console.debug(`publish done: broadcast=${name} track=${track.name}`);
      if (version !== Version.DRAFT_17) {
        try {
          await stream.writer.u53(PublishDone.id);
          const done = new PublishDone({
            requestId: msg.requestId,
            statusCode: 200,
            reasonPhrase: "OK"
          });
          await done.encode(stream.writer, version);
        } catch {}
      }
      stream.close();
    } catch (err) {
      const e = error(err);
      console.warn(`publish error: broadcast=${name} track=${track.name} error=${e.message}`);
      stream.abort(e);
    } finally {
      track.close();
    }
  }
  async#runGroup(requestId, group) {
    try {
      const stream = await Writer.open(this.#quic, this.#session.version);
      const header = new Group2({
        trackAlias: requestId,
        groupId: group.sequence,
        subGroupId: 0,
        publisherPriority: 0,
        flags: {
          hasExtensions: false,
          hasSubgroup: false,
          hasSubgroupObject: false,
          hasEnd: true,
          hasPriority: true
        }
      });
      await header.encode(stream);
      try {
        for (;; ) {
          const frame = await Promise.race([group.readFrame(), stream.closed]);
          if (!frame)
            break;
          const obj = new Frame({ payload: frame });
          await obj.encode(stream, header.flags);
        }
        stream.close();
      } catch (err) {
        stream.reset(error(err));
      }
    } finally {
      group.close();
    }
  }
  async runSubscribeNamespace(msg, stream) {
    const version = this.#session.version;
    const prefix = msg.namespace;
    try {
      if (version === Version.DRAFT_14) {
        await stream.writer.u53(SubscribeNamespaceOk.id);
        const ok = new SubscribeNamespaceOk({ requestId: msg.requestId });
        await ok.encode(stream.writer, version);
      } else {
        await stream.writer.u53(RequestOk.id);
        const ok = new RequestOk({ requestId: version === Version.DRAFT_17 ? undefined : msg.requestId });
        await ok.encode(stream.writer, version);
      }
      const announced = new Announced(prefix);
      for (const name of this.#broadcasts.keys()) {
        const suffix = stripPrefix(prefix, name);
        if (suffix === null)
          continue;
        announced.append({ path: suffix, active: true });
      }
      this.#announcedConsumers.add(announced);
      stream.reader.closed.then(() => announced.close(), () => announced.close());
      try {
        for (;; ) {
          const entry = await announced.next();
          if (!entry)
            break;
          if (entry.active) {
            await stream.writer.u53(SubscribeNamespaceEntry.id);
            const e = new SubscribeNamespaceEntry({ suffix: entry.path });
            await e.encode(stream.writer, version);
          } else {
            await stream.writer.u53(SubscribeNamespaceEntryDone.id);
            const e = new SubscribeNamespaceEntryDone({ suffix: entry.path });
            await e.encode(stream.writer, version);
          }
        }
      } finally {
        announced.close();
        this.#announcedConsumers.delete(announced);
      }
      stream.close();
    } catch (err) {
      const e = error(err);
      console.debug(`subscribe_namespace stream error: ${e.message}`);
      stream.abort(e);
    }
  }
  async runTrackStatusRequest(msg, stream) {
    const version = this.#session.version;
    if (version === Version.DRAFT_14) {
      await stream.writer.u53(TrackStatus.id);
      const status = new TrackStatus({
        trackNamespace: msg.trackNamespace,
        trackName: msg.trackName,
        statusCode: TrackStatus.STATUS_NOT_FOUND,
        lastGroupId: 0n,
        lastObjectId: 0n
      });
      await status.encode(stream.writer, version);
    } else {
      await stream.writer.u53(RequestOk.id);
      const ok = new RequestOk({ requestId: version === Version.DRAFT_17 ? undefined : msg.requestId });
      await ok.encode(stream.writer, version);
    }
    stream.close();
  }
  #notifyConsumers(path, active) {
    for (const consumer of this.#announcedConsumers) {
      const suffix = stripPrefix(consumer.prefix, path);
      if (suffix === null)
        continue;
      try {
        consumer.append({ path: suffix, active });
      } catch {}
    }
  }
}

// ../../../../tmp/moq-dev/js/lite/src/ietf/connection.ts
init_subscribe();
// ../../../../tmp/moq-dev/js/lite/src/ietf/subscriber.ts
init_subscribe();
init_version();

class Subscriber {
  #session;
  #subscribes = new Map;
  #announced = new Set;
  #announcedConsumers = new Set;
  constructor(session) {
    this.#session = session;
  }
  announced(prefix = empty()) {
    const announced = new Announced(prefix);
    for (const active of this.#announced) {
      if (!hasPrefix(prefix, active))
        continue;
      announced.append({ path: active, active: true });
    }
    this.#announcedConsumers.add(announced);
    this.#runAnnounced(announced, prefix).finally(() => {
      this.#announcedConsumers.delete(announced);
      announced.close();
    });
    return announced;
  }
  async#runAnnounced(announced, prefix) {
    const version = this.#session.version;
    const requestId = await this.#session.nextRequestId();
    if (requestId === undefined)
      return;
    try {
      const stream = version === Version.DRAFT_16 && this.#session.openNativeBi ? await this.#session.openNativeBi() : await this.#session.openBi();
      try {
        await stream.writer.u53(SubscribeNamespace.id);
        const msg = new SubscribeNamespace({ namespace: prefix, requestId });
        await msg.encode(stream.writer, version);
        console.debug(`subscribe_namespace written: requestId=${requestId}`);
        const respTypeId = await stream.reader.u53();
        if (respTypeId === RequestOk.id) {
          await RequestOk.decode(stream.reader, version);
        } else if (respTypeId === SubscribeNamespaceOk.id) {
          const size2 = await stream.reader.u16();
          await stream.reader.read(size2);
        } else {
          throw new Error(`SubscribeNamespace rejected: typeId=0x${respTypeId.toString(16)}`);
        }
        const readLoop = (async () => {
          for (;; ) {
            const done = await stream.reader.done();
            if (done)
              break;
            const msgType = await stream.reader.u53();
            if (msgType === SubscribeNamespaceEntry.id) {
              const entry = await SubscribeNamespaceEntry.decode(stream.reader, version);
              const path = join(prefix, entry.suffix);
              console.debug(`announced: broadcast=${path} active=true`);
              this.#announced.add(path);
              for (const consumer of this.#announcedConsumers) {
                if (!hasPrefix(consumer.prefix, path))
                  continue;
                consumer.append({ path, active: true });
              }
            } else if (msgType === SubscribeNamespaceEntryDone.id) {
              const entry = await SubscribeNamespaceEntryDone.decode(stream.reader, version);
              const path = join(prefix, entry.suffix);
              console.debug(`announced: broadcast=${path} active=false`);
              this.#announced.delete(path);
              for (const consumer of this.#announcedConsumers) {
                if (!hasPrefix(consumer.prefix, path))
                  continue;
                consumer.append({ path, active: false });
              }
            } else if (msgType === PublishBlocked.id && version === Version.DRAFT_17) {
              const blocked = await PublishBlocked.decode(stream.reader, version);
              console.debug(`publish_blocked: suffix=${blocked.suffix} track=${blocked.trackName}`);
            } else {
              throw new Error(`unexpected message on subscribe_namespace stream: 0x${msgType.toString(16)}`);
            }
          }
        })();
        await Promise.race([readLoop, announced.closed]);
        if (version === Version.DRAFT_14 || version === Version.DRAFT_15) {
          try {
            await stream.writer.u53(UnsubscribeNamespace.id);
            const unsub = new UnsubscribeNamespace({ requestId });
            await unsub.encode(stream.writer, version);
          } catch {}
        }
        stream.close();
      } catch (err) {
        stream.abort(error(err));
        throw err;
      }
    } catch (err) {
      const e = error(err);
      console.warn(`subscribe_namespace error: ${e.message}`);
    }
  }
  consume(path) {
    const broadcast = new Broadcast;
    (async () => {
      for (;; ) {
        const request = await broadcast.requested();
        if (!request)
          break;
        this.#runSubscribe(path, request);
      }
    })();
    return broadcast;
  }
  async#runSubscribe(broadcast, request) {
    const version = this.#session.version;
    const requestId = await this.#session.nextRequestId();
    if (requestId === undefined) {
      request.track.close(new Error("session closed"));
      return;
    }
    console.debug(`subscribe start: id=${requestId} broadcast=${broadcast} track=${request.track.name}`);
    try {
      const stream = await this.#session.openBi();
      try {
        await stream.writer.u53(Subscribe.id);
        const msg = new Subscribe({
          requestId,
          trackNamespace: broadcast,
          trackName: request.track.name,
          subscriberPriority: request.priority
        });
        await msg.encode(stream.writer, version);
        console.debug(`subscribe written: id=${requestId} broadcast=${broadcast} track=${request.track.name}`);
        this.#subscribes.set(requestId, request.track);
        const respTypeId = await stream.reader.u53();
        if (respTypeId === SubscribeOk.id) {
          const ok = await SubscribeOk.decode(stream.reader, version);
          if (ok.trackAlias !== requestId) {
            this.#subscribes.delete(requestId);
            this.#subscribes.set(ok.trackAlias, request.track);
          }
          console.debug(`subscribe ok: id=${requestId} broadcast=${broadcast} track=${request.track.name}`);
          try {
            await Promise.race([stream.reader.closed, request.track.closed]);
            if (version !== Version.DRAFT_17) {
              try {
                await stream.writer.u53(Unsubscribe.id);
                const unsub = new Unsubscribe({ requestId });
                await unsub.encode(stream.writer, version);
              } catch {}
            }
            request.track.close();
            stream.close();
            console.debug(`subscribe close: id=${requestId} broadcast=${broadcast} track=${request.track.name}`);
          } finally {
            this.#subscribes.delete(ok.trackAlias);
          }
        } else {
          this.#subscribes.delete(requestId);
          let reasonPhrase = "unknown error";
          try {
            if (respTypeId === RequestError.id) {
              const err = version === Version.DRAFT_14 ? await (await Promise.resolve().then(() => (init_subscribe(), exports_subscribe))).SubscribeError.decode(stream.reader, version) : await RequestError.decode(stream.reader, version);
              reasonPhrase = `code=${err.errorCode} reason=${err.reasonPhrase}`;
            }
          } catch {}
          throw new Error(`SUBSCRIBE error: ${reasonPhrase}`);
        }
      } catch (err) {
        this.#subscribes.delete(requestId);
        stream.abort(error(err));
        throw err;
      }
    } catch (err) {
      const e = error(err);
      request.track.close(e);
      console.warn(`subscribe error: id=${requestId} broadcast=${broadcast} track=${request.track.name} error=${e.message}`);
    }
  }
  async runPublishNamespace(msg, stream) {
    const version = this.#session.version;
    const path = msg.trackNamespace;
    if (this.#announced.has(path)) {
      console.warn("duplicate PublishNamespace");
      if (version === Version.DRAFT_14) {
        const { PublishNamespaceError: PublishNamespaceError2 } = await Promise.resolve().then(() => (init_publish_namespace(), exports_publish_namespace));
        await stream.writer.u53(PublishNamespaceError2.id);
        const err = new PublishNamespaceError2({
          requestId: msg.requestId,
          errorCode: 409,
          reasonPhrase: "duplicate namespace"
        });
        await err.encode(stream.writer, version);
      } else {
        await stream.writer.u53(RequestError.id);
        const err = new RequestError({
          requestId: version === Version.DRAFT_17 ? undefined : msg.requestId,
          errorCode: 409,
          reasonPhrase: "duplicate namespace"
        });
        await err.encode(stream.writer, version);
      }
      stream.close();
      return;
    }
    this.#announced.add(path);
    try {
      if (version === Version.DRAFT_14) {
        const { PublishNamespaceOk: PublishNamespaceOk2 } = await Promise.resolve().then(() => (init_publish_namespace(), exports_publish_namespace));
        await stream.writer.u53(PublishNamespaceOk2.id);
        const ok = new PublishNamespaceOk2({ requestId: msg.requestId });
        await ok.encode(stream.writer, version);
      } else {
        await stream.writer.u53(RequestOk.id);
        const ok = new RequestOk({ requestId: version === Version.DRAFT_17 ? undefined : msg.requestId });
        await ok.encode(stream.writer, version);
      }
      console.debug(`announced: broadcast=${path} active=true`);
      for (const consumer of this.#announcedConsumers) {
        const suffix = stripPrefix(consumer.prefix, path);
        if (suffix === null)
          continue;
        consumer.append({ path, active: true });
      }
      console.debug(`runPublishNamespace: awaiting stream.reader.closed for ${path}`);
      await stream.reader.closed;
      console.debug(`runPublishNamespace: stream.reader.closed resolved for ${path}`);
    } finally {
      this.#announced.delete(path);
      console.debug(`announced: broadcast=${path} active=false`);
      for (const consumer of this.#announcedConsumers) {
        const suffix = stripPrefix(consumer.prefix, path);
        if (suffix === null)
          continue;
        try {
          consumer.append({ path, active: false });
        } catch {}
      }
    }
  }
  async runPublish(msg, stream) {
    const version = this.#session.version;
    if (version === Version.DRAFT_14) {
      await stream.writer.u53(PublishError.id);
      const err = new PublishError({
        requestId: msg.requestId,
        errorCode: 500,
        reasonPhrase: "publish not supported"
      });
      await err.encode(stream.writer, version);
    } else {
      await stream.writer.u53(RequestError.id);
      const err = new RequestError({
        requestId: version === Version.DRAFT_17 ? undefined : msg.requestId,
        errorCode: 500,
        reasonPhrase: "publish not supported"
      });
      await err.encode(stream.writer, version);
    }
    stream.close();
  }
  async handleGroup(group, stream) {
    const producer = new Group(group.groupId);
    if (group.subGroupId !== 0) {
      throw new Error("subgroups are not supported");
    }
    try {
      const track = this.#subscribes.get(group.trackAlias);
      if (!track) {
        throw new Error(`unknown track: trackAlias=${group.trackAlias}`);
      }
      track.writeGroup(producer);
      for (;; ) {
        const done = await Promise.race([stream.done(), producer.closed, track.closed]);
        if (done !== false)
          break;
        const frame = await Frame.decode(stream, group.flags);
        if (frame.payload === undefined)
          break;
        producer.writeFrame(frame.payload);
      }
      producer.close();
    } catch (err) {
      const e = error(err);
      producer.close(e);
      stream.stop(e);
    }
  }
}

// ../../../../tmp/moq-dev/js/lite/src/ietf/connection.ts
init_version();

class Connection {
  url;
  version;
  #quic;
  #session;
  #publisher;
  #subscriber;
  #closed = false;
  constructor({
    url,
    quic,
    control,
    maxRequestId,
    version
  }) {
    this.url = url;
    this.version = versionName(version);
    this.#quic = quic;
    if (version === Version.DRAFT_17) {
      this.#session = new NativeSession(quic, version);
      this.#runGoAway(control);
    } else {
      const adapter = new ControlStreamAdapter(quic, control, version, maxRequestId);
      this.#session = adapter;
      adapter.run().catch((err) => {
        if (!this.#closed)
          console.error("adapter error", err);
        this.close();
      });
    }
    this.#publisher = new Publisher(this.#quic, this.#session);
    this.#subscriber = new Subscriber(this.#session);
    this.#run();
  }
  close() {
    if (this.#closed)
      return;
    this.#closed = true;
    this.#session.close?.();
    try {
      this.#quic.close();
    } catch {}
  }
  async#run() {
    try {
      await Promise.all([this.#runBidis(), this.#runUnis()]);
    } catch (err) {
      if (!this.#closed) {
        console.error("fatal error running connection", err);
      }
    } finally {
      this.close();
    }
  }
  publish(path, broadcast) {
    this.#publisher.publish(path, broadcast);
  }
  announced(prefix = empty()) {
    return this.#subscriber.announced(prefix);
  }
  consume(broadcast) {
    return this.#subscriber.consume(broadcast);
  }
  async#runBidis() {
    for (;; ) {
      const stream = await this.#session.acceptBi();
      if (!stream)
        break;
      this.#runBidi(stream).catch((err) => {
        console.error("error processing bidi stream", err);
        stream.abort(new Error("bidi stream error"));
      });
    }
  }
  async#runBidi(stream) {
    const typeId = await stream.reader.u53();
    switch (typeId) {
      case SubscribeUpdate.id: {
        stream.abort(new Error("unexpected REQUEST_UPDATE as initial message"));
        break;
      }
      case Subscribe.id: {
        const msg = await Subscribe.decode(stream.reader, this.#session.version);
        await this.#publisher.runSubscribe(msg, stream);
        break;
      }
      case SubscribeNamespace.id: {
        const msg = await SubscribeNamespace.decode(stream.reader, this.#session.version);
        await this.#publisher.runSubscribeNamespace(msg, stream);
        break;
      }
      case TrackStatusRequest.id: {
        const msg = await TrackStatusRequest.decode(stream.reader, this.#session.version);
        await this.#publisher.runTrackStatusRequest(msg, stream);
        break;
      }
      case PublishNamespace.id: {
        const msg = await PublishNamespace.decode(stream.reader, this.#session.version);
        await this.#subscriber.runPublishNamespace(msg, stream);
        break;
      }
      case Publish.id: {
        const msg = await Publish.decode(stream.reader, this.#session.version);
        await this.#subscriber.runPublish(msg, stream);
        break;
      }
      default:
        console.warn(`unexpected bidi stream type: 0x${typeId.toString(16)}`);
        stream.abort(new Error("unexpected stream type"));
    }
  }
  async#runUnis() {
    const readers = new Readers(this.#quic, this.#session.version);
    for (;; ) {
      const stream = await readers.next();
      if (!stream)
        break;
      this.#runUni(stream).then(() => {
        stream.stop(new Error("cancel"));
      }).catch((err) => {
        console.error("error processing object stream", err);
        stream.stop(err);
      });
    }
  }
  async#runUni(stream) {
    const header = await Group2.decode(stream);
    await this.#subscriber.handleGroup(header, stream);
  }
  async#runGoAway(controlStream) {
    try {
      const done = await controlStream.reader.done();
      if (done)
        return;
      const typeId = await controlStream.reader.u53();
      if (typeId === GoAway.id) {
        const msg = await GoAway.decode(controlStream.reader, Version.DRAFT_17);
        console.warn(`received GOAWAY with redirect URI: ${msg.newSessionUri}`);
      } else {
        console.warn(`unexpected message on setup stream: 0x${typeId.toString(16)}`);
      }
    } catch (err) {
      if (!this.#closed) {
        console.error("error reading setup stream", err);
      }
    } finally {
      this.close();
    }
  }
  get closed() {
    return this.#quic.closed.then(() => {
      return;
    });
  }
}

// ../../../../tmp/moq-dev/js/lite/src/ietf/setup.ts
init_message();
init_parameters();
init_version();

class Setup {
  static id = 12032;
  parameters;
  constructor({ parameters = new SetupOptions } = {}) {
    this.parameters = parameters;
  }
  async#encode(w, version) {
    await this.parameters.encode(w, version);
  }
  async encode(w, version) {
    return encode3(w, (mw) => this.#encode(mw, version));
  }
  static async#decode(r, version) {
    const parameters = await SetupOptions.decode(r, version);
    return new Setup({ parameters });
  }
  static async decode(r, version) {
    return decode3(r, (mr) => Setup.#decode(mr, version));
  }
}
var MAX_VERSIONS = 128;

class ClientSetup {
  static id = 32;
  versions;
  parameters;
  constructor({ versions, parameters = new SetupOptions }) {
    this.versions = versions;
    this.parameters = parameters;
  }
  async#encode(w, version) {
    if (version === Version.DRAFT_15 || version === Version.DRAFT_16) {
      await this.parameters.encode(w, version);
    } else if (version === Version.DRAFT_14) {
      await w.u53(this.versions.length);
      for (const v of this.versions) {
        await w.u53(v);
      }
      await this.parameters.encode(w, version);
    } else {
      throw new Error("ClientSetup not used for this version");
    }
  }
  async encode(w, version) {
    return encode3(w, (mw) => this.#encode(mw, version));
  }
  static async#decode(r, version) {
    if (version === Version.DRAFT_15 || version === Version.DRAFT_16) {
      const parameters = await SetupOptions.decode(r, version);
      return new ClientSetup({ versions: [version], parameters });
    } else if (version === Version.DRAFT_14) {
      const numVersions = await r.u53();
      if (numVersions > MAX_VERSIONS) {
        throw new Error(`too many versions: ${numVersions}`);
      }
      const supportedVersions = [];
      for (let i = 0;i < numVersions; i++) {
        const v = await r.u53();
        supportedVersions.push(v);
      }
      const parameters = await SetupOptions.decode(r, version);
      return new ClientSetup({ versions: supportedVersions, parameters });
    } else {
      throw new Error("ClientSetup not used for this version");
    }
  }
  static async decode(r, version) {
    return decode3(r, (mr) => ClientSetup.#decode(mr, version));
  }
}

class ServerSetup {
  static id = 33;
  version;
  parameters;
  constructor({ version, parameters = new SetupOptions }) {
    this.version = version;
    this.parameters = parameters;
  }
  async#encode(w, version) {
    if (version === Version.DRAFT_15 || version === Version.DRAFT_16) {
      await this.parameters.encode(w, version);
    } else if (version === Version.DRAFT_14) {
      await w.u53(this.version);
      await this.parameters.encode(w, version);
    } else {
      throw new Error("ServerSetup not used for this version");
    }
  }
  async encode(w, version) {
    return encode3(w, (mw) => this.#encode(mw, version));
  }
  static async#decode(r, version) {
    if (version === Version.DRAFT_15 || version === Version.DRAFT_16) {
      const parameters = await SetupOptions.decode(r, version);
      return new ServerSetup({ version, parameters });
    } else if (version === Version.DRAFT_14) {
      const selectedVersion = await r.u53();
      const parameters = await SetupOptions.decode(r, version);
      return new ServerSetup({ version: selectedVersion, parameters });
    } else {
      throw new Error("ServerSetup not used for this version");
    }
  }
  static async decode(r, version) {
    return decode3(r, (mr) => ServerSetup.#decode(mr, version));
  }
}
// ../../../../tmp/moq-dev/js/lite/src/lite/message.ts
init_stream();
async function encode4(writer, f) {
  let scratch = new Uint8Array;
  const temp = new Writer(new WritableStream({
    write(chunk) {
      const needed = scratch.byteLength + chunk.byteLength;
      if (needed > scratch.buffer.byteLength) {
        const capacity = Math.max(needed, scratch.buffer.byteLength * 2);
        const newBuffer = new ArrayBuffer(capacity);
        const newScratch = new Uint8Array(newBuffer, 0, needed);
        newScratch.set(scratch);
        newScratch.set(chunk, scratch.byteLength);
        scratch = newScratch;
      } else {
        scratch = new Uint8Array(scratch.buffer, 0, needed);
        scratch.set(chunk, needed - chunk.byteLength);
      }
    }
  }));
  await f(temp);
  temp.close();
  await temp.closed;
  await writer.u53(scratch.byteLength);
  if (scratch.byteLength > 0) {
    await writer.write(scratch);
  }
}
async function decode4(reader, f) {
  const size2 = await reader.u53();
  const data = await reader.read(size2);
  const limit = new Reader(undefined, data);
  const msg = await f(limit);
  if (!await limit.done()) {
    throw new Error("Message decoding consumed too few bytes");
  }
  return msg;
}
async function decodeMaybe(reader, f) {
  if (await reader.done())
    return;
  return await decode4(reader, f);
}

// ../../../../tmp/moq-dev/node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/core.js
var NEVER = Object.freeze({
  status: "aborted"
});
function $constructor(name, initializer, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _,
          traits: new Set
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer(inst, def);
    const proto = _.prototype;
    const keys = Object.keys(proto);
    for (let i = 0;i < keys.length; i++) {
      const k = keys[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;

  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a;
    const inst = params?.Parent ? new Definition : this;
    init(inst, def);
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
var $brand = Symbol("zod_brand");

class $ZodAsyncError extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
}

class $ZodEncodeError extends Error {
  constructor(name) {
    super(`Encountered unidirectional transform during encode: ${name}`);
    this.name = "ZodEncodeError";
  }
}
var globalConfig = {};
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}

// ../../../../tmp/moq-dev/node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/util.js
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set = false;
  return {
    get value() {
      if (!set) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
var EVALUATING = Symbol("evaluating");
function defineLazy(object, key, getter) {
  let value = undefined;
  Object.defineProperty(object, key, {
    get() {
      if (value === EVALUATING) {
        return;
      }
      if (value === undefined) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object, key, {
        value: v
      });
    },
    configurable: true
  });
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
var allowsEval = cached(() => {
  if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch (_) {
    return false;
  }
});
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === undefined)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  return o;
}
var propertyKeyTypes = new Set(["string", "number", "symbol"]);
var primitiveTypes = new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== undefined) {
    if (params?.error !== undefined)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
var NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-340282346638528860000000000000000000000, 340282346638528860000000000000000000000],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex;i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a;
    (_a = iss).path ?? (_a.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const full = { ...iss, path: iss.path ?? [] };
  if (!iss.message) {
    const message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
    full.message = message;
  }
  delete full.inst;
  delete full.continue;
  if (!ctx?.reportInput) {
    delete full.input;
  }
  return full;
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}

// ../../../../tmp/moq-dev/node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/errors.js
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });

// ../../../../tmp/moq-dev/node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
};
var parse = /* @__PURE__ */ _parse($ZodRealError);
var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
};
var parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
var _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);

// ../../../../tmp/moq-dev/node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/regexes.js
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
var string = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
var bigint = /^-?\d+n?$/;
var integer = /^-?\d+$/;
var number = /^-?\d+(?:\.\d+)?$/;
var boolean = /^(?:true|false)$/i;

// ../../../../tmp/moq-dev/node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/checks.js
var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a = inst._zod).onattach ?? (_a.onattach = []);
});
var numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
var $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = def.format?.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});

// ../../../../tmp/moq-dev/node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 3,
  patch: 6
};

// ../../../../tmp/moq-dev/node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/schemas.js
var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError;
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError;
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError;
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  defineLazy(inst, "~standard", () => ({
    validate: (value) => {
      try {
        const r = safeParse(inst, value);
        return r.success ? { value: r.data } : { issues: r.error?.issues };
      } catch (_) {
        return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  }));
});
var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {}
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {}
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : undefined : undefined;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
var $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_) {}
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodBigInt = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = bigint;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = BigInt(payload.value);
      } catch (_) {}
    if (typeof payload.value === "bigint")
      return payload;
    payload.issues.push({
      expected: "bigint",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0;i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key, input, isOptionalOut) {
  if (result.issues.length) {
    if (isOptionalOut && !(key in input)) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (result.value === undefined) {
    if (key in input) {
      final.value[key] = undefined;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const isOptionalOut = _catchall.optout === "optional";
  for (const key in input) {
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalOut)));
    } else {
      handlePropertyResult(r, payload, key, input, isOptionalOut);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  if (!desc?.get) {
    const sh = def.shape;
    Object.defineProperty(def, "shape", {
      get: () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", {
          value: newSh
        });
        return newSh;
      }
    });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazy(inst._zod, "propValues", () => {
    const shape = def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        propValues[key] ?? (propValues[key] = new Set);
        for (const v of field.values)
          propValues[key].add(v);
      }
    }
    return propValues;
  });
  const isObject2 = isObject;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = {};
    const proms = [];
    const shape = value.shape;
    for (const key of value.keys) {
      const el = shape[key];
      const isOptionalOut = el._zod.optout === "optional";
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalOut)));
      } else {
        handlePropertyResult(r, payload, key, input, isOptionalOut);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : undefined);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return;
  });
  const single = def.options.length === 1;
  const first = def.options[0]._zod.run;
  inst._zod.parse = (payload, ctx) => {
    if (single) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
var $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
  def.inclusive = false;
  $ZodUnion.init(inst, def);
  const _super = inst._zod.parse;
  defineLazy(inst._zod, "propValues", () => {
    const propValues = {};
    for (const option of def.options) {
      const pv = option._zod.propValues;
      if (!pv || Object.keys(pv).length === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
      for (const [k, v] of Object.entries(pv)) {
        if (!propValues[k])
          propValues[k] = new Set;
        for (const val of v) {
          propValues[k].add(val);
        }
      }
    }
    return propValues;
  });
  const disc = cached(() => {
    const opts = def.options;
    const map = new Map;
    for (const o of opts) {
      const values = o._zod.propValues?.[def.discriminator];
      if (!values || values.size === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
      for (const v of values) {
        if (map.has(v)) {
          throw new Error(`Duplicate discriminator value "${String(v)}"`);
        }
        map.set(v, o);
      }
    }
    return map;
  });
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isObject(input)) {
      payload.issues.push({
        code: "invalid_type",
        expected: "object",
        input,
        inst
      });
      return payload;
    }
    const opt = disc.value.get(input?.[def.discriminator]);
    if (opt) {
      return opt._zod.run(payload, ctx);
    }
    if (def.unionFallback) {
      return _super(payload, ctx);
    }
    payload.issues.push({
      code: "invalid_union",
      errors: [],
      note: "No matching discriminator",
      discriminator: def.discriminator,
      input,
      path: [def.discriminator],
      inst
    });
    return payload;
  };
});
var $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isPlainObject(input)) {
      payload.issues.push({
        expected: "record",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    const values = def.keyType._zod.values;
    if (values) {
      payload.value = {};
      const recordKeys = new Set;
      for (const key of values) {
        if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
          recordKeys.add(typeof key === "number" ? key.toString() : key);
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[key] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[key] = result.value;
          }
        }
      }
      let unrecognized;
      for (const key in input) {
        if (!recordKeys.has(key)) {
          unrecognized = unrecognized ?? [];
          unrecognized.push(key);
        }
      }
      if (unrecognized && unrecognized.length > 0) {
        payload.issues.push({
          code: "unrecognized_keys",
          input,
          inst,
          keys: unrecognized
        });
      }
    } else {
      payload.value = {};
      for (const key of Reflect.ownKeys(input)) {
        if (key === "__proto__")
          continue;
        let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
        if (keyResult instanceof Promise) {
          throw new Error("Async schemas not supported in object keys currently");
        }
        const checkNumericKey = typeof key === "string" && number.test(key) && keyResult.issues.length;
        if (checkNumericKey) {
          const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
          if (retryResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (retryResult.issues.length === 0) {
            keyResult = retryResult;
          }
        }
        if (keyResult.issues.length) {
          if (def.mode === "loose") {
            payload.value[key] = input[key];
          } else {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key,
              path: [key],
              inst
            });
          }
          continue;
        }
        const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => {
            if (result2.issues.length) {
              payload.issues.push(...prefixIssues(key, result2.issues));
            }
            payload.value[keyResult.value] = result2.value;
          }));
        } else {
          if (result.issues.length) {
            payload.issues.push(...prefixIssues(key, result.issues));
          }
          payload.value[keyResult.value] = result.value;
        }
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
var $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  if (def.values.length === 0) {
    throw new Error("Cannot create literal schema with no valid values");
  }
  const values = new Set(def.values);
  inst._zod.values = values;
  inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (values.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: def.values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    const _out = def.transform(payload.value, payload);
    if (ctx.async) {
      const output = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError;
    }
    payload.value = _out;
    return payload;
  };
});
function handleOptionalResult(result, input) {
  if (result.issues.length && input === undefined) {
    return { issues: [], value: undefined };
  }
  return result;
}
var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? new Set([...def.innerType._zod.values, undefined]) : undefined;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, payload.value));
      return handleOptionalResult(result, payload.value);
    }
    if (payload.value === undefined) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === undefined) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === undefined) {
    payload.value = def.defaultValue;
  }
  return payload;
}
var $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handlePipeResult(right2, def.in, ctx));
      }
      return handlePipeResult(right, def.in, ctx);
    }
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left2) => handlePipeResult(left2, def.out, ctx));
    }
    return handlePipeResult(left, def.out, ctx);
  };
});
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues }, ctx);
}
var $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      path: [...inst._zod.def.path ?? []],
      continue: !inst._zod.def.abort
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}

// ../../../../tmp/moq-dev/node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/api.js
function _string(Class, params) {
  return new Class({
    type: "string",
    ...normalizeParams(params)
  });
}
function _number(Class, params) {
  return new Class({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
function _int(Class, params) {
  return new Class({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
function _boolean(Class, params) {
  return new Class({
    type: "boolean",
    ...normalizeParams(params)
  });
}
function _bigint(Class, params) {
  return new Class({
    type: "bigint",
    ...normalizeParams(params)
  });
}
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _nonnegative(params) {
  return _gte(0, params);
}
function _refine(Class, fn, _params) {
  const schema = new Class({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
// ../../../../tmp/moq-dev/node_modules/.bun/zod@4.3.6/node_modules/zod/v4/mini/schemas.js
var ZodMiniType = /* @__PURE__ */ $constructor("ZodMiniType", (inst, def) => {
  if (!inst._zod)
    throw new Error("Uninitialized schema in ZodMiniType.");
  $ZodType.init(inst, def);
  inst.def = def;
  inst.type = def.type;
  inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
  inst.check = (...checks) => {
    return inst.clone({
      ...def,
      checks: [
        ...def.checks ?? [],
        ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
      ]
    }, { parent: true });
  };
  inst.with = inst.check;
  inst.clone = (_def, params) => clone(inst, _def, params);
  inst.brand = () => inst;
  inst.register = (reg, meta2) => {
    reg.add(inst, meta2);
    return inst;
  };
  inst.apply = (fn) => fn(inst);
});
var ZodMiniString = /* @__PURE__ */ $constructor("ZodMiniString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodMiniType.init(inst, def);
});
function string2(params) {
  return _string(ZodMiniString, params);
}
var ZodMiniNumber = /* @__PURE__ */ $constructor("ZodMiniNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodMiniType.init(inst, def);
});
function number2(params) {
  return _number(ZodMiniNumber, params);
}
var ZodMiniNumberFormat = /* @__PURE__ */ $constructor("ZodMiniNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodMiniNumber.init(inst, def);
});
function int(params) {
  return _int(ZodMiniNumberFormat, params);
}
var ZodMiniBoolean = /* @__PURE__ */ $constructor("ZodMiniBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodMiniType.init(inst, def);
});
function boolean2(params) {
  return _boolean(ZodMiniBoolean, params);
}
var ZodMiniBigInt = /* @__PURE__ */ $constructor("ZodMiniBigInt", (inst, def) => {
  $ZodBigInt.init(inst, def);
  ZodMiniType.init(inst, def);
});
function bigint2(params) {
  return _bigint(ZodMiniBigInt, params);
}
var ZodMiniArray = /* @__PURE__ */ $constructor("ZodMiniArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodMiniType.init(inst, def);
});
function array(element, params) {
  return new ZodMiniArray({
    type: "array",
    element,
    ...normalizeParams(params)
  });
}
var ZodMiniObject = /* @__PURE__ */ $constructor("ZodMiniObject", (inst, def) => {
  $ZodObject.init(inst, def);
  ZodMiniType.init(inst, def);
  defineLazy(inst, "shape", () => def.shape);
});
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...normalizeParams(params)
  };
  return new ZodMiniObject(def);
}
var ZodMiniUnion = /* @__PURE__ */ $constructor("ZodMiniUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodMiniType.init(inst, def);
});
function union(options, params) {
  return new ZodMiniUnion({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
var ZodMiniDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodMiniDiscriminatedUnion", (inst, def) => {
  $ZodDiscriminatedUnion.init(inst, def);
  ZodMiniType.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
  return new ZodMiniDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...normalizeParams(params)
  });
}
var ZodMiniRecord = /* @__PURE__ */ $constructor("ZodMiniRecord", (inst, def) => {
  $ZodRecord.init(inst, def);
  ZodMiniType.init(inst, def);
});
function record(keyType, valueType, params) {
  return new ZodMiniRecord({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
var ZodMiniLiteral = /* @__PURE__ */ $constructor("ZodMiniLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodMiniType.init(inst, def);
});
function literal(value, params) {
  return new ZodMiniLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
var ZodMiniTransform = /* @__PURE__ */ $constructor("ZodMiniTransform", (inst, def) => {
  $ZodTransform.init(inst, def);
  ZodMiniType.init(inst, def);
});
function transform(fn) {
  return new ZodMiniTransform({
    type: "transform",
    transform: fn
  });
}
var ZodMiniOptional = /* @__PURE__ */ $constructor("ZodMiniOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodMiniType.init(inst, def);
});
function optional(innerType) {
  return new ZodMiniOptional({
    type: "optional",
    innerType
  });
}
var ZodMiniDefault = /* @__PURE__ */ $constructor("ZodMiniDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodMiniType.init(inst, def);
});
function _default(innerType, defaultValue) {
  return new ZodMiniDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
var ZodMiniPipe = /* @__PURE__ */ $constructor("ZodMiniPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodMiniType.init(inst, def);
});
function pipe(in_, out) {
  return new ZodMiniPipe({
    type: "pipe",
    in: in_,
    out
  });
}
var ZodMiniCustom = /* @__PURE__ */ $constructor("ZodMiniCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodMiniType.init(inst, def);
});
function refine(fn, _params = {}) {
  return _refine(ZodMiniCustom, fn, _params);
}
// ../../../../tmp/moq-dev/js/lite/src/lite/origin.ts
var OriginSchema = bigint2().check(refine((value) => value >= 0n && value < 1n << 62n, "Origin must be a non-negative 62-bit integer")).brand("Origin");
function randomOrigin() {
  const buf = new BigUint64Array(1);
  crypto.getRandomValues(buf);
  const raw = buf[0] & 0x3fff_ffff_ffff_ffffn;
  return OriginSchema.parse(raw === 0n ? 1n : raw);
}

// ../../../../tmp/moq-dev/js/lite/src/lite/version.ts
var Version2 = {
  DRAFT_01: 4279086337,
  DRAFT_02: 4279086338,
  DRAFT_03: 4279086339,
  DRAFT_04: 4279086340
};
var ALPN2 = "moql";
var ALPN_03 = "moq-lite-03";
var ALPN_04 = "moq-lite-04";
var VERSION_NAMES2 = {
  [Version2.DRAFT_01]: "moq-lite-01",
  [Version2.DRAFT_02]: "moq-lite-02",
  [Version2.DRAFT_03]: "moq-lite-03",
  [Version2.DRAFT_04]: "moq-lite-04"
};
function versionName2(v) {
  return VERSION_NAMES2[v] ?? `unknown(0x${v.toString(16)})`;
}

// ../../../../tmp/moq-dev/js/lite/src/lite/announce.ts
var MAX_HOPS = 32;

class Announce {
  suffix;
  active;
  hops;
  constructor(props) {
    this.suffix = props.suffix;
    this.active = props.active;
    this.hops = props.hops ?? [];
    if (this.hops.length > MAX_HOPS) {
      throw new Error(`hop count ${this.hops.length} exceeds maximum ${MAX_HOPS}`);
    }
  }
  async#encode(w, version2) {
    await w.bool(this.active);
    await w.string(this.suffix);
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        break;
      case Version2.DRAFT_03:
        await w.u53(this.hops.length);
        break;
      default:
        await w.u53(this.hops.length);
        for (const origin of this.hops) {
          await w.u62(origin);
        }
        break;
    }
  }
  static async#decode(r, version2) {
    const active = await r.bool();
    const suffix = from(await r.string());
    let hops = [];
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        break;
      case Version2.DRAFT_03: {
        const count = await r.u53();
        if (count > MAX_HOPS)
          throw new Error(`hop count ${count} exceeds maximum ${MAX_HOPS}`);
        const placeholder = OriginSchema.parse(0n);
        hops = new Array(count).fill(placeholder);
        break;
      }
      default: {
        const count = await r.u53();
        if (count > MAX_HOPS)
          throw new Error(`hop count ${count} exceeds maximum ${MAX_HOPS}`);
        hops = [];
        for (let i = 0;i < count; i++) {
          hops.push(OriginSchema.parse(await r.u62()));
        }
        break;
      }
    }
    return new Announce({ suffix, active, hops });
  }
  async encode(w, version2) {
    return encode4(w, (w2) => this.#encode(w2, version2));
  }
  static async decode(r, version2) {
    return decode4(r, (r2) => Announce.#decode(r2, version2));
  }
  static async decodeMaybe(r, version2) {
    return decodeMaybe(r, (r2) => Announce.#decode(r2, version2));
  }
}

class AnnounceInterest {
  prefix;
  excludeHop;
  constructor(prefix, excludeHop = 0) {
    this.prefix = prefix;
    this.excludeHop = excludeHop;
  }
  async#encode(w, version2) {
    await w.string(this.prefix);
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
      case Version2.DRAFT_03:
        break;
      default:
        await w.u53(this.excludeHop);
        break;
    }
  }
  static async#decode(r, version2) {
    const prefix = from(await r.string());
    let excludeHop = 0;
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
      case Version2.DRAFT_03:
        break;
      default:
        excludeHop = await r.u53();
        break;
    }
    return new AnnounceInterest(prefix, excludeHop);
  }
  async encode(w, version2) {
    return encode4(w, (w2) => this.#encode(w2, version2));
  }
  static async decode(r, version2) {
    return decode4(r, (r2) => AnnounceInterest.#decode(r2, version2));
  }
}

class AnnounceInit {
  suffixes;
  constructor(paths) {
    this.suffixes = paths;
  }
  static #guard(version2) {
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        break;
      default:
        throw new Error("announce init not supported for this version");
    }
  }
  async#encode(w) {
    await w.u53(this.suffixes.length);
    for (const path of this.suffixes) {
      await w.string(path);
    }
  }
  static async#decode(r) {
    const count = await r.u53();
    const suffixes = [];
    for (let i = 0;i < count; i++) {
      suffixes.push(from(await r.string()));
    }
    return new AnnounceInit(suffixes);
  }
  async encode(w, version2) {
    AnnounceInit.#guard(version2);
    return encode4(w, this.#encode.bind(this));
  }
  static async decode(r, version2) {
    AnnounceInit.#guard(version2);
    return decode4(r, AnnounceInit.#decode);
  }
}

// ../../../../tmp/moq-dev/js/lite/src/lite/connection.ts
init_stream();

// ../../../../tmp/moq-dev/js/lite/src/lite/goaway.ts
function guardGoaway(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
    case Version2.DRAFT_03:
      throw new Error("goaway not supported for this version");
    default:
      break;
  }
}

class Goaway {
  uri;
  constructor(uri) {
    this.uri = uri;
  }
  async#encode(w) {
    await w.string(this.uri);
  }
  static async#decode(r) {
    return new Goaway(await r.string());
  }
  async encode(w, version2) {
    guardGoaway(version2);
    return encode4(w, this.#encode.bind(this));
  }
  static async decode(r, version2) {
    guardGoaway(version2);
    return decode4(r, Goaway.#decode);
  }
}

// ../../../../tmp/moq-dev/js/lite/src/lite/group.ts
class Group3 {
  subscribe;
  sequence;
  constructor(subscribe, sequence) {
    this.subscribe = subscribe;
    this.sequence = sequence;
  }
  async#encode(w) {
    await w.u62(this.subscribe);
    await w.u53(this.sequence);
  }
  static async#decode(r) {
    return new Group3(await r.u62(), await r.u53());
  }
  async encode(w) {
    return encode4(w, this.#encode.bind(this));
  }
  static async decode(r) {
    return decode4(r, Group3.#decode);
  }
  static async decodeMaybe(r) {
    return decodeMaybe(r, Group3.#decode);
  }
}

class Frame2 {
  payload;
  constructor(payload) {
    this.payload = payload;
  }
  async#encode(w) {
    await w.write(this.payload);
  }
  static async#decode(r) {
    const payload = await r.readAll();
    return new Frame2(payload);
  }
  async encode(w) {
    return encode4(w, this.#encode.bind(this));
  }
  static async decode(r) {
    return decode4(r, Frame2.#decode);
  }
}

// ../../../../tmp/moq-dev/js/lite/src/lite/publisher.ts
init_stream();

// ../../../../tmp/moq-dev/js/lite/src/lite/probe.ts
function guardProbe(version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
      throw new Error("probe not supported for this version");
    default:
      break;
  }
}

class Probe {
  bitrate;
  rtt;
  constructor(bitrate, rtt) {
    this.bitrate = bitrate;
    this.rtt = rtt;
  }
  async#encode(w, version2) {
    await w.u53(this.bitrate);
    switch (version2) {
      case Version2.DRAFT_03:
        break;
      default: {
        const wire = this.rtt !== undefined ? Math.max(this.rtt, 1) : 0;
        await w.u53(wire);
        break;
      }
    }
  }
  static async#decode(r, version2) {
    const bitrate = await r.u53();
    let rtt;
    switch (version2) {
      case Version2.DRAFT_03:
        break;
      default: {
        const wire = await r.u53();
        rtt = wire === 0 ? undefined : wire;
        break;
      }
    }
    return new Probe(bitrate, rtt);
  }
  async encode(w, version2) {
    guardProbe(version2);
    return encode4(w, (w2) => this.#encode(w2, version2));
  }
  static async decode(r, version2) {
    guardProbe(version2);
    return decode4(r, (r2) => Probe.#decode(r2, version2));
  }
  static async decodeMaybe(r, version2) {
    guardProbe(version2);
    return decodeMaybe(r, (r2) => Probe.#decode(r2, version2));
  }
}
// ../../../../tmp/moq-dev/js/lite/src/lite/subscribe.ts
class SubscribeUpdate2 {
  priority;
  ordered;
  maxLatency;
  startGroup;
  endGroup;
  constructor(props) {
    this.priority = props.priority;
    this.ordered = props.ordered ?? true;
    this.maxLatency = props.maxLatency ?? 0;
    this.startGroup = props.startGroup;
    this.endGroup = props.endGroup;
  }
  async#encode(w, version2) {
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        await w.u8(this.priority);
        break;
      default:
        await w.u8(this.priority);
        await w.bool(this.ordered);
        await w.u53(this.maxLatency);
        await w.u53(this.startGroup !== undefined ? this.startGroup + 1 : 0);
        await w.u53(this.endGroup !== undefined ? this.endGroup + 1 : 0);
        break;
    }
  }
  static async#decode(r, version2) {
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        return new SubscribeUpdate2({ priority: await r.u8() });
      default: {
        const priority = await r.u8();
        const ordered = await r.bool();
        const maxLatency = await r.u53();
        const startGroup = await r.u53();
        const endGroup = await r.u53();
        return new SubscribeUpdate2({
          priority,
          ordered,
          maxLatency,
          startGroup: startGroup > 0 ? startGroup - 1 : undefined,
          endGroup: endGroup > 0 ? endGroup - 1 : undefined
        });
      }
    }
  }
  async encode(w, version2) {
    return encode4(w, (w2) => this.#encode(w2, version2));
  }
  static async decode(r, version2) {
    return decode4(r, (r2) => SubscribeUpdate2.#decode(r2, version2));
  }
  static async decodeMaybe(r, version2) {
    return decodeMaybe(r, (r2) => SubscribeUpdate2.#decode(r2, version2));
  }
}

class Subscribe2 {
  id;
  broadcast;
  track;
  priority;
  ordered;
  maxLatency;
  startGroup;
  endGroup;
  constructor(props) {
    this.id = props.id;
    this.broadcast = props.broadcast;
    this.track = props.track;
    this.priority = props.priority;
    this.ordered = props.ordered ?? false;
    this.maxLatency = props.maxLatency ?? 0;
    this.startGroup = props.startGroup;
    this.endGroup = props.endGroup;
  }
  async#encode(w, version2) {
    await w.u62(this.id);
    await w.string(this.broadcast);
    await w.string(this.track);
    await w.u8(this.priority);
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        break;
      default:
        await w.bool(this.ordered);
        await w.u53(this.maxLatency);
        await w.u53(this.startGroup !== undefined ? this.startGroup + 1 : 0);
        await w.u53(this.endGroup !== undefined ? this.endGroup + 1 : 0);
        break;
    }
  }
  static async#decode(r, version2) {
    const id = await r.u62();
    const broadcast = from(await r.string());
    const track = await r.string();
    const priority = await r.u8();
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        return new Subscribe2({ id, broadcast, track, priority });
      default: {
        const ordered = await r.bool();
        const maxLatency = await r.u53();
        const startGroup = await r.u53();
        const endGroup = await r.u53();
        return new Subscribe2({
          id,
          broadcast,
          track,
          priority,
          ordered,
          maxLatency,
          startGroup: startGroup > 0 ? startGroup - 1 : undefined,
          endGroup: endGroup > 0 ? endGroup - 1 : undefined
        });
      }
    }
  }
  async encode(w, version2) {
    return encode4(w, (w2) => this.#encode(w2, version2));
  }
  static async decode(r, version2) {
    return decode4(r, (r2) => Subscribe2.#decode(r2, version2));
  }
}

class SubscribeOk2 {
  priority;
  ordered;
  maxLatency;
  startGroup;
  endGroup;
  constructor({
    priority = 0,
    ordered = true,
    maxLatency = 0,
    startGroup = undefined,
    endGroup = undefined
  }) {
    this.priority = priority;
    this.ordered = ordered;
    this.maxLatency = maxLatency;
    this.startGroup = startGroup;
    this.endGroup = endGroup;
  }
  async#encode(w, version2) {
    switch (version2) {
      case Version2.DRAFT_02:
        break;
      case Version2.DRAFT_01:
        await w.u8(this.priority ?? 0);
        break;
      default:
        await w.u8(this.priority);
        await w.bool(this.ordered);
        await w.u53(this.maxLatency);
        await w.u53(this.startGroup !== undefined ? this.startGroup + 1 : 0);
        await w.u53(this.endGroup !== undefined ? this.endGroup + 1 : 0);
        break;
    }
  }
  static async#decode(version2, r) {
    let priority;
    let ordered;
    let maxLatency;
    let startGroup;
    let endGroup;
    switch (version2) {
      case Version2.DRAFT_02:
        break;
      case Version2.DRAFT_01:
        priority = await r.u8();
        break;
      default:
        priority = await r.u8();
        ordered = await r.bool();
        maxLatency = await r.u53();
        startGroup = await r.u53();
        endGroup = await r.u53();
        break;
    }
    return new SubscribeOk2({
      priority,
      ordered,
      maxLatency,
      startGroup: startGroup !== undefined && startGroup > 0 ? startGroup - 1 : undefined,
      endGroup: endGroup !== undefined && endGroup > 0 ? endGroup - 1 : undefined
    });
  }
  async encode(w, version2) {
    return encode4(w, (w2) => this.#encode(w2, version2));
  }
  static async decode(r, version2) {
    return decode4(r, SubscribeOk2.#decode.bind(SubscribeOk2, version2));
  }
}

class SubscribeDrop {
  start;
  end;
  error;
  constructor(props) {
    this.start = props.start;
    this.end = props.end;
    this.error = props.error;
  }
  async#encode(w) {
    await w.u53(this.start);
    await w.u53(this.end);
    await w.u53(this.error);
  }
  static async#decode(r) {
    return new SubscribeDrop({ start: await r.u53(), end: await r.u53(), error: await r.u53() });
  }
  async encode(w) {
    return encode4(w, this.#encode.bind(this));
  }
  static async decode(r) {
    return decode4(r, SubscribeDrop.#decode);
  }
}
async function encodeSubscribeResponse(w, resp, version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
      if ("ok" in resp) {
        await resp.ok.encode(w, version2);
      } else {
        throw new Error("subscribe drop not supported for this version");
      }
      break;
    default:
      if ("ok" in resp) {
        await w.u53(0);
        await resp.ok.encode(w, version2);
      } else {
        await w.u53(1);
        await resp.drop.encode(w);
      }
      break;
  }
}
async function decodeSubscribeResponse(r, version2) {
  switch (version2) {
    case Version2.DRAFT_01:
    case Version2.DRAFT_02:
      return { ok: await SubscribeOk2.decode(r, version2) };
    default: {
      const typ = await r.u53();
      switch (typ) {
        case 0:
          return { ok: await SubscribeOk2.decode(r, version2) };
        case 1:
          return { drop: await SubscribeDrop.decode(r) };
        default:
          throw new Error(`unknown subscribe response type: ${typ}`);
      }
    }
  }
}

// ../../../../tmp/moq-dev/js/lite/src/lite/publisher.ts
var PROBE_INTERVAL = 100;
var PROBE_MAX_AGE = 1e4;
var PROBE_MAX_DELTA = 0.25;

class Publisher2 {
  version;
  origin;
  #quic;
  #broadcasts = new Signal(new Map);
  constructor(quic, version2, origin) {
    this.#quic = quic;
    this.version = version2;
    this.origin = origin;
  }
  publish(path, broadcast) {
    this.#broadcasts.mutate((broadcasts) => {
      if (!broadcasts)
        throw new Error("closed");
      broadcasts.set(path, broadcast);
    });
    broadcast.closed.finally(() => {
      this.#broadcasts.mutate((broadcasts) => {
        broadcasts?.delete(path);
      });
    });
  }
  async runAnnounce(msg, stream) {
    console.debug(`announce: prefix=${msg.prefix}`);
    let active = new Set;
    const broadcasts = this.#broadcasts.peek();
    if (!broadcasts)
      return;
    for (const name of broadcasts.keys()) {
      const suffix = stripPrefix(msg.prefix, name);
      if (suffix === null)
        continue;
      console.debug(`announce: broadcast=${name} active=true`);
      active.add(suffix);
    }
    switch (this.version) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02: {
        const init = new AnnounceInit([...active]);
        await init.encode(stream.writer, this.version);
        break;
      }
      default:
        for (const suffix of active) {
          const wire = new Announce({ suffix, active: true, hops: [this.origin] });
          await wire.encode(stream.writer, this.version);
        }
        break;
    }
    for (;; ) {
      let dispose;
      const changed = new Promise((resolve) => {
        dispose = this.#broadcasts.changed(resolve);
      });
      const broadcasts2 = await Promise.race([changed, stream.reader.closed]);
      dispose();
      if (!broadcasts2)
        break;
      const newActive = new Set;
      for (const name of broadcasts2.keys()) {
        const suffix = stripPrefix(msg.prefix, name);
        if (suffix === null)
          continue;
        newActive.add(suffix);
      }
      for (const added of newActive.difference(active)) {
        console.debug(`announce: broadcast=${added} active=true`);
        const wire = new Announce({ suffix: added, active: true, hops: [this.origin] });
        await wire.encode(stream.writer, this.version);
      }
      for (const removed of active.difference(newActive)) {
        console.debug(`announce: broadcast=${removed} active=false`);
        const wire = new Announce({ suffix: removed, active: false });
        await wire.encode(stream.writer, this.version);
      }
      active = newActive;
    }
  }
  async runSubscribe(msg, stream) {
    const broadcast = this.#broadcasts.peek()?.get(msg.broadcast);
    if (!broadcast) {
      console.debug(`publish unknown: broadcast=${msg.broadcast}`);
      stream.writer.reset(new Error("not found"));
      return;
    }
    const track = broadcast.subscribe(msg.track, msg.priority);
    try {
      const info = new SubscribeOk2({ priority: msg.priority });
      await encodeSubscribeResponse(stream.writer, { ok: info }, this.version);
      console.debug(`publish ok: broadcast=${msg.broadcast} track=${track.name}`);
      const serving = this.#runTrack(msg.id, msg.broadcast, track, stream.writer);
      for (;; ) {
        const decode6 = SubscribeUpdate2.decodeMaybe(stream.reader, this.version);
        const result = await Promise.any([serving, decode6]);
        if (!result)
          break;
        if (result instanceof SubscribeUpdate2) {
          console.warn("subscribe update not supported", result);
        }
      }
      console.debug(`publish done: broadcast=${msg.broadcast} track=${track.name}`);
      stream.close();
      track.close();
    } catch (err) {
      const e = error(err);
      console.warn(`publish error: broadcast=${msg.broadcast} track=${track.name} error=${e.message}`);
      track.close(e);
      stream.abort(e);
    }
  }
  async#runTrack(sub, broadcast, track, stream) {
    try {
      for (;; ) {
        const next = track.recvGroup();
        const group = await Promise.race([next, stream.closed]);
        if (!group) {
          next.then((group2) => group2?.close()).catch(() => {});
          break;
        }
        this.#runGroup(sub, group);
      }
      console.debug(`publish close: broadcast=${broadcast} track=${track.name}`);
      track.close();
      stream.close();
    } catch (err) {
      const e = error(err);
      console.warn(`publish error: broadcast=${broadcast} track=${track.name} error=${e.message}`);
      track.close(e);
      stream.reset(e);
    }
  }
  async#runGroup(sub, group) {
    const msg = new Group3(sub, group.sequence);
    try {
      const stream = await Writer.open(this.#quic);
      await stream.u8(0);
      await msg.encode(stream);
      try {
        for (;; ) {
          const frame = await Promise.race([group.readFrame(), stream.closed]);
          if (!frame)
            break;
          await stream.u53(frame.byteLength);
          await stream.write(frame);
        }
        stream.close();
        group.close();
      } catch (err) {
        const e = error(err);
        stream.reset(e);
        group.close(e);
      }
    } catch (err) {
      const e = error(err);
      group.close(e);
    }
  }
  async runProbe(stream) {
    const quic = this.#quic;
    if (!quic.getStats) {
      stream.close();
      return;
    }
    let lastSentBitrate;
    let lastSentTime;
    try {
      for (;; ) {
        const timeout = new Promise((resolve) => setTimeout(() => resolve("timeout"), PROBE_INTERVAL));
        const result = await Promise.race([timeout, stream.reader.closed]);
        if (result !== "timeout")
          break;
        const stats = await quic.getStats();
        const bitrate = stats.estimatedSendRate;
        if (bitrate == null)
          continue;
        let shouldSend;
        if (lastSentBitrate === undefined || lastSentTime === undefined) {
          shouldSend = true;
        } else if (lastSentBitrate === 0) {
          shouldSend = bitrate > 0;
        } else {
          const elapsed = performance.now() - lastSentTime;
          const t = Math.max(PROBE_INTERVAL, Math.min(PROBE_MAX_AGE, elapsed));
          const range = PROBE_MAX_AGE - PROBE_INTERVAL;
          const threshold = PROBE_MAX_DELTA * (PROBE_MAX_AGE - t) / range;
          const change = Math.abs(bitrate - lastSentBitrate) / lastSentBitrate;
          shouldSend = change >= threshold;
        }
        if (shouldSend) {
          await new Probe(bitrate).encode(stream.writer, this.version);
          lastSentBitrate = bitrate;
          lastSentTime = performance.now();
        }
      }
    } catch (err) {
      const e = error(err);
      console.warn(`probe error: ${e.message}`);
      stream.abort(e);
    }
  }
  close() {
    this.#broadcasts.update((broadcasts) => {
      for (const broadcast of broadcasts?.values() ?? []) {
        broadcast.close();
      }
      return;
    });
  }
}

// ../../../../tmp/moq-dev/js/lite/src/lite/session.ts
class Extensions {
  entries;
  constructor() {
    this.entries = new Map;
  }
  set(id, value) {
    this.entries.set(id, value);
  }
  get(id) {
    return this.entries.get(id);
  }
  remove(id) {
    const value = this.entries.get(id);
    this.entries.delete(id);
    return value;
  }
  async encode(w) {
    await w.u53(this.entries.size);
    for (const [id, value] of this.entries) {
      await w.u62(id);
      await w.u53(value.length);
      await w.write(value);
    }
  }
  static async decode(r) {
    const count = await r.u53();
    const params = new Extensions;
    for (let i = 0;i < count; i++) {
      const id = await r.u62();
      const size2 = await r.u53();
      const value = await r.read(size2);
      if (params.entries.has(id)) {
        throw new Error(`duplicate parameter id: ${id.toString()}`);
      }
      params.entries.set(id, value);
    }
    return params;
  }
}

class SessionClient {
  versions;
  extensions;
  constructor(versions, extensions = new Extensions) {
    this.versions = versions;
    this.extensions = extensions;
  }
  async#encode(w) {
    await w.u53(this.versions.length);
    for (const v of this.versions) {
      await w.u53(v);
    }
    await this.extensions.encode(w);
  }
  static async#decode(r) {
    const versions = [];
    const count = await r.u53();
    for (let i = 0;i < count; i++) {
      versions.push(await r.u53());
    }
    const extensions = await Extensions.decode(r);
    return new SessionClient(versions, extensions);
  }
  async encode(w) {
    return encode4(w, this.#encode.bind(this));
  }
  static async decode(r) {
    return decode4(r, SessionClient.#decode);
  }
}

class SessionServer {
  version;
  extensions;
  constructor(version2, extensions = new Extensions) {
    this.version = version2;
    this.extensions = extensions;
  }
  async#encode(w) {
    await w.u53(this.version);
    await this.extensions.encode(w);
  }
  static async#decode(r) {
    const version2 = await r.u53();
    const extensions = await Extensions.decode(r);
    return new SessionServer(version2, extensions);
  }
  async encode(w) {
    return encode4(w, this.#encode.bind(this));
  }
  static async decode(r) {
    return decode4(r, SessionServer.#decode);
  }
}

class SessionInfo {
  bitrate;
  constructor(bitrate) {
    this.bitrate = bitrate;
  }
  static #guard(version2) {
    switch (version2) {
      case Version2.DRAFT_01:
      case Version2.DRAFT_02:
        break;
      default:
        throw new Error("session info not supported for this version");
    }
  }
  async#encode(w) {
    await w.u53(this.bitrate);
  }
  static async#decode(r) {
    const bitrate = await r.u53();
    return new SessionInfo(bitrate);
  }
  async encode(w, version2) {
    SessionInfo.#guard(version2);
    return encode4(w, this.#encode.bind(this));
  }
  static async decode(r, version2) {
    SessionInfo.#guard(version2);
    return decode4(r, SessionInfo.#decode);
  }
  static async decodeMaybe(r, version2) {
    SessionInfo.#guard(version2);
    return decodeMaybe(r, SessionInfo.#decode);
  }
}

// ../../../../tmp/moq-dev/js/lite/src/lite/stream.ts
var StreamId = {
  Session: 0,
  Announce: 1,
  Subscribe: 2,
  Fetch: 3,
  Probe: 4,
  Goaway: 5,
  ClientCompat: 32,
  ServerCompat: 33
};

// ../../../../tmp/moq-dev/js/lite/src/lite/subscriber.ts
init_stream();
class Subscriber2 {
  #quic;
  version;
  origin;
  #subscribes = new Map;
  #subscribeNext = 0n;
  #recvBandwidth;
  #rtt;
  constructor(quic, version2, origin, recvBandwidth, rtt) {
    this.#quic = quic;
    this.version = version2;
    this.origin = origin;
    this.#recvBandwidth = recvBandwidth;
    this.#rtt = rtt;
  }
  announced(prefix = empty(), options = {}) {
    const announced = new Announced;
    this.#runAnnounced(announced, prefix, options);
    return announced;
  }
  async#runAnnounced(announced, prefix, options) {
    console.debug(`announced: prefix=${prefix}`);
    const msg = new AnnounceInterest(prefix);
    try {
      const stream = await Stream.open(this.#quic);
      await stream.writer.u53(StreamId.Announce);
      await msg.encode(stream.writer, this.version);
      switch (this.version) {
        case Version2.DRAFT_01:
        case Version2.DRAFT_02: {
          const init = await AnnounceInit.decode(stream.reader, this.version);
          for (const suffix of init.suffixes) {
            const path = join(prefix, suffix);
            console.debug(`announced: broadcast=${path} active=true`);
            announced.append({ path, active: true });
          }
          break;
        }
        default:
          break;
      }
      for (;; ) {
        const announce = await Promise.race([
          Announce.decodeMaybe(stream.reader, this.version),
          announced.closed
        ]);
        if (!announce)
          break;
        if (announce instanceof Error)
          throw announce;
        if (options.ignoreSelf && announce.hops.includes(this.origin)) {
          continue;
        }
        const path = join(prefix, announce.suffix);
        console.debug(`announced: broadcast=${path} active=${announce.active}`);
        announced.append({ path, active: announce.active });
      }
      announced.close();
    } catch (err) {
      announced.close(error(err));
    }
  }
  consume(path) {
    const broadcast = new Broadcast;
    (async () => {
      for (;; ) {
        const request = await broadcast.requested();
        if (!request)
          break;
        this.#runSubscribe(path, request);
      }
    })();
    return broadcast;
  }
  async#runSubscribe(broadcast, request) {
    const id = this.#subscribeNext++;
    this.#subscribes.set(id, request.track);
    console.debug(`subscribe start: id=${id} broadcast=${broadcast} track=${request.track.name}`);
    const msg = new Subscribe2({ id, broadcast, track: request.track.name, priority: request.priority });
    const stream = await Stream.open(this.#quic);
    await stream.writer.u53(StreamId.Subscribe);
    await msg.encode(stream.writer, this.version);
    try {
      const resp = await decodeSubscribeResponse(stream.reader, this.version);
      if (!("ok" in resp)) {
        throw new Error("first subscribe response must be SUBSCRIBE_OK");
      }
      console.debug(`subscribe ok: id=${id} broadcast=${broadcast} track=${request.track.name}`);
      await Promise.race([stream.reader.closed, request.track.closed]);
      request.track.close();
      stream.close();
      console.debug(`subscribe close: id=${id} broadcast=${broadcast} track=${request.track.name}`);
    } catch (err) {
      const e = error(err);
      request.track.close(e);
      console.warn(`subscribe error: id=${id} broadcast=${broadcast} track=${request.track.name} error=${e.message}`);
      stream.abort(e);
    } finally {
      this.#subscribes.delete(id);
    }
  }
  async runGroup(group, stream) {
    const subscribe = this.#subscribes.get(group.subscribe);
    if (!subscribe) {
      if (group.subscribe >= this.#subscribeNext) {
        throw new Error(`unknown subscription: id=${group.subscribe}`);
      }
      return;
    }
    const producer = new Group(group.sequence);
    subscribe.writeGroup(producer);
    try {
      for (;; ) {
        const done = await Promise.race([stream.done(), subscribe.closed, producer.closed]);
        if (done !== false)
          break;
        const size2 = await stream.u53();
        const payload = await stream.read(size2);
        if (!payload)
          break;
        producer.writeFrame(payload);
      }
      producer.close();
      stream.stop(new Error("cancel"));
    } catch (err) {
      const e = error(err);
      producer.close(e);
      stream.stop(e);
    }
  }
  async runProbe() {
    if (!this.#recvBandwidth)
      return;
    if (this.version === Version2.DRAFT_01 || this.version === Version2.DRAFT_02)
      return;
    const stream = await Stream.open(this.#quic);
    await stream.writer.u53(StreamId.Probe);
    for (;; ) {
      const probe = await Probe.decodeMaybe(stream.reader, this.version);
      if (!probe)
        break;
      this.#recvBandwidth.set(probe.bitrate || undefined);
      if (this.#rtt && probe.rtt !== undefined) {
        this.#rtt.set(probe.rtt);
      }
    }
  }
  close() {
    for (const track of this.#subscribes.values()) {
      track.close();
    }
    this.#subscribes.clear();
  }
}

// ../../../../tmp/moq-dev/js/lite/src/lite/connection.ts
var SEND_BW_POLL_INTERVAL = 100;

class Connection2 {
  url;
  version;
  #version;
  #quic;
  #session;
  #publisher;
  #subscriber;
  sendBandwidth;
  recvBandwidth;
  rtt;
  origin;
  constructor(url, quic, version2, session) {
    this.url = url;
    this.#quic = quic;
    this.#session = session;
    this.version = versionName2(version2);
    this.#version = version2;
    const hasGetStats = typeof quic.getStats === "function";
    if (hasGetStats) {
      this.sendBandwidth = createBandwidth();
    }
    if (version2 !== Version2.DRAFT_01 && version2 !== Version2.DRAFT_02) {
      this.recvBandwidth = createBandwidth();
    }
    this.rtt = new Signal(undefined);
    this.origin = randomOrigin();
    this.#publisher = new Publisher2(this.#quic, this.#version, this.origin);
    this.#subscriber = new Subscriber2(this.#quic, this.#version, this.origin, this.recvBandwidth, this.rtt);
    this.#run();
  }
  close() {
    this.#publisher.close();
    this.#subscriber.close();
    try {
      this.#quic.close();
    } catch {}
  }
  async#run() {
    const tasks = [this.#runSession(), this.#runBidis(), this.#runUnis()];
    if (this.sendBandwidth) {
      tasks.push(this.#runSendBandwidth(this.sendBandwidth));
    }
    if (this.recvBandwidth) {
      tasks.push(this.#subscriber.runProbe());
    }
    try {
      await Promise.all(tasks);
    } catch (err) {
      console.error("fatal error running connection", err);
    } finally {
      this.close();
    }
  }
  publish(path, broadcast) {
    this.#publisher.publish(path, broadcast);
  }
  announced(prefix = empty()) {
    return this.#subscriber.announced(prefix);
  }
  consume(broadcast) {
    return this.#subscriber.consume(broadcast);
  }
  async#runSession() {
    if (!this.#session) {
      return;
    }
    try {
      for (;; ) {
        const msg = await SessionInfo.decodeMaybe(this.#session.reader, this.#version);
        if (!msg)
          break;
      }
    } finally {
      console.debug("session stream closed");
    }
  }
  async#runBidis() {
    for (;; ) {
      const stream = await Stream.accept(this.#quic);
      if (!stream)
        break;
      this.#runBidi(stream).catch((err) => {
        stream.writer.reset(err);
      }).finally(() => {
        stream.writer.close();
      });
    }
  }
  async#runBidi(stream) {
    const typ = await stream.reader.u53();
    if (typ === StreamId.Session) {
      throw new Error("duplicate session stream");
    } else if (typ === StreamId.Announce) {
      const msg = await AnnounceInterest.decode(stream.reader, this.#version);
      await this.#publisher.runAnnounce(msg, stream);
    } else if (typ === StreamId.Subscribe) {
      const msg = await Subscribe2.decode(stream.reader, this.#version);
      await this.#publisher.runSubscribe(msg, stream);
    } else if (typ === StreamId.Probe) {
      await this.#publisher.runProbe(stream);
    } else if (typ === StreamId.Goaway) {
      const msg = await Goaway.decode(stream.reader, this.#version);
      console.info("received goaway:", msg.uri);
    } else {
      throw new Error(`unknown stream type: ${typ.toString()}`);
    }
  }
  async#runUnis() {
    const readers = new Readers(this.#quic);
    for (;; ) {
      const stream = await readers.next();
      if (!stream)
        break;
      this.#runUni(stream).then(() => {
        stream.stop(new Error("cancel"));
      }).catch((err) => {
        stream.stop(err);
      });
    }
  }
  async#runUni(stream) {
    const typ = await stream.u8();
    if (typ === 0) {
      const msg = await Group3.decode(stream);
      await this.#subscriber.runGroup(msg, stream);
    } else {
      throw new Error(`unknown stream type: ${typ.toString()}`);
    }
  }
  async#runSendBandwidth(bandwidth) {
    const quic = this.#quic;
    return new Promise((resolve) => {
      const id = setInterval(async () => {
        try {
          const stats = await quic.getStats();
          bandwidth.set(stats.estimatedSendRate ?? undefined);
        } catch {
          clearInterval(id);
          resolve();
        }
      }, SEND_BW_POLL_INTERVAL);
      this.closed.then(() => {
        clearInterval(id);
        resolve();
      });
    });
  }
  get closed() {
    return this.#quic.closed.then(() => {
      return;
    });
  }
}

// ../../../../tmp/moq-dev/js/lite/src/connection/accept.ts
init_stream();
async function accept(transport, url, props) {
  const protocol = transport.protocol;
  if (protocol === ALPN.DRAFT_17) {
    return acceptDraft17(transport, url);
  } else if (protocol === ALPN.DRAFT_16) {
    return acceptAlpnVersion(transport, url, Version.DRAFT_16);
  } else if (protocol === ALPN.DRAFT_15) {
    return acceptAlpnVersion(transport, url, Version.DRAFT_15);
  } else if (protocol === ALPN_04) {
    return new Connection2(url, transport, Version2.DRAFT_04, undefined);
  } else if (protocol === ALPN_03) {
    return new Connection2(url, transport, Version2.DRAFT_03, undefined);
  } else if (protocol === ALPN2 || protocol === "" || protocol === undefined) {
    return acceptNegotiated(transport, url, props);
  } else {
    throw new Error(`unsupported WebTransport protocol: ${protocol}`);
  }
}
async function acceptDraft17(transport, url) {
  const encoder = new TextEncoder;
  const params = new SetupOptions;
  params.setBytes(SetupOption.Implementation, encoder.encode("moq-lite-js"));
  const setupMsg = new Setup({ parameters: params });
  const [recvReadable, sendWritable] = await Promise.all([
    (async () => {
      const uniReader = transport.incomingUnidirectionalStreams.getReader();
      const next = await uniReader.read();
      uniReader.releaseLock();
      if (next.done)
        throw new Error("no incoming uni stream for SETUP");
      return next.value;
    })(),
    transport.createUnidirectionalStream()
  ]);
  const controlStream = new Stream({ writable: sendWritable, readable: recvReadable });
  controlStream.writer.version = Version.DRAFT_17;
  controlStream.reader.version = Version.DRAFT_17;
  await Promise.all([
    (async () => {
      const streamType = await controlStream.reader.u53();
      if (streamType !== Setup.id) {
        throw new Error(`unexpected stream type on setup uni: 0x${streamType.toString(16)}`);
      }
      await Setup.decode(controlStream.reader, Version.DRAFT_17);
    })(),
    (async () => {
      await controlStream.writer.u53(Setup.id);
      await setupMsg.encode(controlStream.writer, Version.DRAFT_17);
    })()
  ]);
  return new Connection({
    url,
    quic: transport,
    control: controlStream,
    maxRequestId: 0n,
    version: Version.DRAFT_17
  });
}
async function acceptAlpnVersion(transport, url, version2) {
  const stream = await Stream.accept(transport);
  if (!stream)
    throw new Error("no incoming bidi stream for SETUP");
  const clientCompat = await stream.reader.u53();
  if (clientCompat !== StreamId.ClientCompat) {
    throw new Error(`unexpected client message type: 0x${clientCompat.toString(16)}`);
  }
  await ClientSetup.decode(stream.reader, version2);
  await stream.writer.u53(StreamId.ServerCompat);
  const encoder = new TextEncoder;
  const params = new SetupOptions;
  params.setVarint(SetupOption.MaxRequestId, 42069n);
  params.setBytes(SetupOption.Implementation, encoder.encode("moq-lite-js"));
  const server = new ServerSetup({ version: version2, parameters: params });
  await server.encode(stream.writer, version2);
  const maxRequestId = 42069n;
  return new Connection({
    url,
    quic: transport,
    control: stream,
    maxRequestId,
    version: version2
  });
}
async function acceptNegotiated(transport, url, props) {
  const setupVersion = Version.DRAFT_14;
  const stream = await Stream.accept(transport);
  if (!stream)
    throw new Error("no incoming bidi stream for SETUP");
  const clientCompat = await stream.reader.u53();
  if (clientCompat !== StreamId.ClientCompat) {
    throw new Error(`unexpected client message type: 0x${clientCompat.toString(16)}`);
  }
  const client = await ClientSetup.decode(stream.reader, setupVersion);
  const allVersions = [...Object.values(Version2), ...Object.values(Version)];
  let selectedVersion;
  if (props?.version !== undefined) {
    selectedVersion = props.version;
  } else {
    const match = client.versions.find((v) => allVersions.includes(v));
    if (match === undefined) {
      throw new Error(`no common version found; client offered: ${client.versions.map((v) => v.toString(16)).join(", ")}`);
    }
    selectedVersion = match;
  }
  await stream.writer.u53(StreamId.ServerCompat);
  const encoder = new TextEncoder;
  const params = new SetupOptions;
  params.setVarint(SetupOption.MaxRequestId, 42069n);
  params.setBytes(SetupOption.Implementation, encoder.encode("moq-lite-js"));
  const server = new ServerSetup({ version: selectedVersion, parameters: params });
  await server.encode(stream.writer, setupVersion);
  if (Object.values(Version2).includes(selectedVersion)) {
    return new Connection2(url, transport, selectedVersion, stream);
  } else if (Object.values(Version).includes(selectedVersion)) {
    const maxRequestId = client.parameters.getVarint(SetupOption.MaxRequestId) ?? 0n;
    return new Connection({
      url,
      quic: transport,
      control: stream,
      maxRequestId,
      version: selectedVersion
    });
  } else {
    throw new Error(`unsupported version: ${selectedVersion.toString(16)}`);
  }
}
// ../../../../tmp/moq-dev/node_modules/.bun/@moq+qmux@0.0.6/node_modules/@moq/qmux/credit.js
class Credit {
  #used;
  #max;
  #released = 0n;
  #closed = false;
  #waiters = [];
  constructor(max) {
    this.#used = 0n;
    this.#max = max;
  }
  tryClaim(limit) {
    if (limit === 0n)
      return 0n;
    const available = this.#max - this.#used;
    if (available <= 0n)
      return 0n;
    const claimed = limit < available ? limit : available;
    this.#used += claimed;
    return claimed;
  }
  async claim(limit) {
    if (limit === 0n)
      return 0n;
    while (true) {
      if (this.#closed)
        throw new Error("closed");
      const claimed = this.tryClaim(limit);
      if (claimed > 0n)
        return claimed;
      await new Promise((resolve, reject) => {
        this.#waiters.push({ resolve, reject });
      });
    }
  }
  release(amount) {
    this.#used = this.#used > amount ? this.#used - amount : 0n;
    this.#wake();
  }
  increaseMax(newMax) {
    if (newMax < this.#max)
      return false;
    if (newMax === this.#max)
      return true;
    this.#max = newMax;
    this.#wake();
    return true;
  }
  close() {
    this.#closed = true;
    const waiters = this.#waiters;
    this.#waiters = [];
    const err = new Error("closed");
    for (const { reject } of waiters)
      reject(err);
  }
  receiveUpTo(value) {
    if (value > this.#max)
      return false;
    if (value > this.#used)
      this.#used = value;
    return true;
  }
  consume(len) {
    this.#released += len;
    if (this.#used + 2n * this.#released > this.#max) {
      const newMax = this.#max + this.#released;
      this.#max = newMax;
      this.#released = 0n;
      this.#wake();
      return newMax;
    }
    return null;
  }
  get available() {
    const avail = this.#max - this.#used;
    return avail > 0n ? avail : 0n;
  }
  get max() {
    return this.#max;
  }
  get used() {
    return this.#used;
  }
  #wake() {
    const waiters = this.#waiters;
    this.#waiters = [];
    for (const { resolve } of waiters)
      resolve();
  }
}

// ../../../../tmp/moq-dev/node_modules/.bun/@moq+qmux@0.0.6/node_modules/@moq/qmux/varint.js
class VarInt {
  static MAX = (1n << 62n) - 1n;
  static MAX_SIZE = 8;
  value;
  constructor(value) {
    if (value < 0n || value > VarInt.MAX) {
      throw new Error(`VarInt value out of range: ${value}`);
    }
    this.value = value;
  }
  static from(value) {
    return new VarInt(BigInt(value));
  }
  size() {
    const x = this.value;
    if (x < 2n ** 6n)
      return 1;
    if (x < 2n ** 14n)
      return 2;
    if (x < 2n ** 30n)
      return 4;
    if (x < 2n ** 62n)
      return 8;
    throw new Error("VarInt value too large");
  }
  encode(dst) {
    const x = this.value;
    const size2 = this.size();
    if (dst.byteOffset + dst.byteLength + size2 > dst.buffer.byteLength) {
      throw new Error("destination buffer too small");
    }
    const view = new DataView(dst.buffer, dst.byteOffset + dst.byteLength, size2);
    if (size2 === 1) {
      view.setUint8(0, Number(x));
    } else if (size2 === 2) {
      view.setUint16(0, 1 << 14 | Number(x), false);
    } else if (size2 === 4) {
      view.setUint32(0, 2 << 30 | Number(x), false);
    } else if (size2 === 8) {
      view.setBigUint64(0, 3n << 62n | x, false);
    } else {
      throw new Error("VarInt value too large");
    }
    return new Uint8Array(dst.buffer, dst.byteOffset, dst.byteLength + size2);
  }
  static decode(buffer) {
    if (buffer.byteLength < 1) {
      throw new Error("Unexpected end of buffer");
    }
    const view = new DataView(buffer.buffer, buffer.byteOffset);
    const firstByte = view.getUint8(0);
    const tag = firstByte >> 6;
    let value;
    let bytesRead;
    switch (tag) {
      case 0:
        value = BigInt(firstByte & 63);
        bytesRead = 1;
        break;
      case 1:
        if (2 > buffer.length) {
          throw new Error("Unexpected end of buffer");
        }
        value = BigInt(view.getUint16(0, false) & 16383);
        bytesRead = 2;
        break;
      case 2:
        if (4 > buffer.length) {
          throw new Error("Unexpected end of buffer");
        }
        value = BigInt(view.getUint32(0, false) & 1073741823);
        bytesRead = 4;
        break;
      case 3:
        if (8 > buffer.length) {
          throw new Error("Unexpected end of buffer");
        }
        value = view.getBigUint64(0, false) & 0x3fffffffffffffffn;
        bytesRead = 8;
        break;
      default:
        throw new Error("Invalid VarInt tag");
    }
    const remaining = new Uint8Array(buffer.buffer, buffer.byteOffset + bytesRead, buffer.byteLength - bytesRead);
    return [new VarInt(value), remaining];
  }
}

// ../../../../tmp/moq-dev/node_modules/.bun/@moq+qmux@0.0.6/node_modules/@moq/qmux/stream.js
var Dir = {
  Bi: 0,
  Uni: 1
};

class Id {
  value;
  constructor(value) {
    this.value = value;
  }
  static create(id, dir, isServer) {
    let streamId = id << 2n;
    if (dir === Dir.Uni) {
      streamId |= 0x02n;
    }
    if (isServer) {
      streamId |= 0x01n;
    }
    return new Id(VarInt.from(streamId));
  }
  get dir() {
    return (this.value.value & 0x02n) !== 0n ? Dir.Uni : Dir.Bi;
  }
  get serverInitiated() {
    return (this.value.value & 0x01n) !== 0n;
  }
  get index() {
    return this.value.value >> 2n;
  }
  canRecv(isServer) {
    if (this.dir === Dir.Uni) {
      return this.serverInitiated !== isServer;
    }
    return true;
  }
  canSend(isServer) {
    if (this.dir === Dir.Uni) {
      return this.serverInitiated === isServer;
    }
    return true;
  }
}

// ../../../../tmp/moq-dev/node_modules/.bun/@moq+qmux@0.0.6/node_modules/@moq/qmux/frame.js
var MAX_FRAME_SIZE = 16384;
var MAX_FRAME_PAYLOAD = MAX_FRAME_SIZE - 24;
var DEFAULT_TRANSPORT_PARAMS = {
  initialMaxData: 0n,
  initialMaxStreamDataBidiLocal: 0n,
  initialMaxStreamDataBidiRemote: 0n,
  initialMaxStreamDataUni: 0n,
  initialMaxStreamsBidi: 0n,
  initialMaxStreamsUni: 0n
};
function encode6(frame, version2 = "webtransport") {
  if (version2 === "webtransport") {
    return encodeWebTransport(frame);
  }
  return encodeQMux(frame);
}
function encodeWebTransport(frame) {
  switch (frame.type) {
    case "stream": {
      let buffer = new Uint8Array(new ArrayBuffer(1 + 8 + frame.data.length), 0, 1);
      buffer[0] = frame.fin ? 9 : 8;
      buffer = frame.id.value.encode(buffer);
      buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength + frame.data.length);
      buffer.set(frame.data, buffer.byteLength - frame.data.length);
      return buffer;
    }
    case "reset_stream": {
      let buffer = new Uint8Array(new ArrayBuffer(1 + 8 + 8), 0, 1);
      buffer[0] = 4;
      buffer = frame.id.value.encode(buffer);
      buffer = frame.code.encode(buffer);
      return buffer;
    }
    case "stop_sending": {
      let buffer = new Uint8Array(new ArrayBuffer(1 + 8 + 8), 0, 1);
      buffer[0] = 5;
      buffer = frame.id.value.encode(buffer);
      buffer = frame.code.encode(buffer);
      return buffer;
    }
    case "connection_close": {
      const body = new TextEncoder().encode(frame.reason);
      let buffer = new Uint8Array(new ArrayBuffer(1 + 8 + body.length), 0, 1);
      buffer[0] = 29;
      buffer = frame.code.encode(buffer);
      buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength + body.length);
      buffer.set(body, buffer.byteLength - body.length);
      return buffer;
    }
    default:
      throw new Error("flow control frames are not supported in WebTransport version");
  }
}
function encodeQMux(frame) {
  switch (frame.type) {
    case "stream": {
      const frameType = VarInt.from(10 | (frame.fin ? 1 : 0));
      const lengthVi = VarInt.from(frame.data.length);
      const maxSize = 8 + 8 + 8 + frame.data.length;
      let buffer = new Uint8Array(new ArrayBuffer(maxSize), 0, 0);
      buffer = frameType.encode(buffer);
      buffer = frame.id.value.encode(buffer);
      buffer = lengthVi.encode(buffer);
      buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength + frame.data.length);
      buffer.set(frame.data, buffer.byteLength - frame.data.length);
      return buffer;
    }
    case "reset_stream": {
      const frameType = VarInt.from(4);
      const finalSize = VarInt.from(0);
      let buffer = new Uint8Array(new ArrayBuffer(8 + 8 + 8 + 8), 0, 0);
      buffer = frameType.encode(buffer);
      buffer = frame.id.value.encode(buffer);
      buffer = frame.code.encode(buffer);
      buffer = finalSize.encode(buffer);
      return buffer;
    }
    case "stop_sending": {
      const frameType = VarInt.from(5);
      let buffer = new Uint8Array(new ArrayBuffer(8 + 8 + 8), 0, 0);
      buffer = frameType.encode(buffer);
      buffer = frame.id.value.encode(buffer);
      buffer = frame.code.encode(buffer);
      return buffer;
    }
    case "connection_close": {
      const frameType = VarInt.from(29);
      const causingFrameType = VarInt.from(0);
      const body = new TextEncoder().encode(frame.reason);
      const reasonLength = VarInt.from(body.length);
      let buffer = new Uint8Array(new ArrayBuffer(8 + 8 + 8 + 8 + body.length), 0, 0);
      buffer = frameType.encode(buffer);
      buffer = frame.code.encode(buffer);
      buffer = causingFrameType.encode(buffer);
      buffer = reasonLength.encode(buffer);
      buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength + body.length);
      buffer.set(body, buffer.byteLength - body.length);
      return buffer;
    }
    case "max_data": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(16).encode(buffer);
      buffer = VarInt.from(frame.max).encode(buffer);
      return buffer;
    }
    case "max_stream_data": {
      let buffer = new Uint8Array(new ArrayBuffer(24), 0, 0);
      buffer = VarInt.from(17).encode(buffer);
      buffer = frame.id.value.encode(buffer);
      buffer = VarInt.from(frame.max).encode(buffer);
      return buffer;
    }
    case "max_streams_bidi": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(18).encode(buffer);
      buffer = VarInt.from(frame.max).encode(buffer);
      return buffer;
    }
    case "max_streams_uni": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(19).encode(buffer);
      buffer = VarInt.from(frame.max).encode(buffer);
      return buffer;
    }
    case "data_blocked": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(20).encode(buffer);
      buffer = VarInt.from(frame.limit).encode(buffer);
      return buffer;
    }
    case "stream_data_blocked": {
      let buffer = new Uint8Array(new ArrayBuffer(24), 0, 0);
      buffer = VarInt.from(21).encode(buffer);
      buffer = frame.id.value.encode(buffer);
      buffer = VarInt.from(frame.limit).encode(buffer);
      return buffer;
    }
    case "streams_blocked_bidi": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(22).encode(buffer);
      buffer = VarInt.from(frame.limit).encode(buffer);
      return buffer;
    }
    case "streams_blocked_uni": {
      let buffer = new Uint8Array(new ArrayBuffer(16), 0, 0);
      buffer = VarInt.from(23).encode(buffer);
      buffer = VarInt.from(frame.limit).encode(buffer);
      return buffer;
    }
    case "transport_parameters": {
      const payload = encodeTransportParams(frame.params);
      let buffer = new Uint8Array(new ArrayBuffer(8 + 8 + payload.byteLength), 0, 0);
      buffer = VarInt.from(0x3f5153300d0a0d0an).encode(buffer);
      buffer = VarInt.from(payload.byteLength).encode(buffer);
      buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength + payload.byteLength);
      buffer.set(payload, buffer.byteLength - payload.byteLength);
      return buffer;
    }
  }
}
function encodeTransportParams(params) {
  let buffer = new Uint8Array(new ArrayBuffer(144), 0, 0);
  function writeParam(buf, id, value) {
    if (value === 0n)
      return buf;
    const valVi = VarInt.from(value);
    buf = VarInt.from(id).encode(buf);
    buf = VarInt.from(valVi.size()).encode(buf);
    buf = valVi.encode(buf);
    return buf;
  }
  buffer = writeParam(buffer, 4, params.initialMaxData);
  buffer = writeParam(buffer, 5, params.initialMaxStreamDataBidiLocal);
  buffer = writeParam(buffer, 6, params.initialMaxStreamDataBidiRemote);
  buffer = writeParam(buffer, 7, params.initialMaxStreamDataUni);
  buffer = writeParam(buffer, 8, params.initialMaxStreamsBidi);
  buffer = writeParam(buffer, 9, params.initialMaxStreamsUni);
  return buffer;
}
function decodeTransportParams(buffer) {
  const params = { ...DEFAULT_TRANSPORT_PARAMS };
  let v;
  while (buffer.byteLength > 0) {
    [v, buffer] = VarInt.decode(buffer);
    const id = v.value;
    [v, buffer] = VarInt.decode(buffer);
    const len = Number(v.value);
    if (buffer.byteLength < len) {
      throw new Error("transport parameter truncated");
    }
    const paramData = buffer.slice(0, len);
    buffer = buffer.slice(len);
    if (paramData.byteLength < 1) {
      continue;
    }
    let paramValue;
    [v] = VarInt.decode(paramData);
    paramValue = v.value;
    switch (id) {
      case 0x04n:
        params.initialMaxData = paramValue;
        break;
      case 0x05n:
        params.initialMaxStreamDataBidiLocal = paramValue;
        break;
      case 0x06n:
        params.initialMaxStreamDataBidiRemote = paramValue;
        break;
      case 0x07n:
        params.initialMaxStreamDataUni = paramValue;
        break;
      case 0x08n:
        params.initialMaxStreamsBidi = paramValue;
        break;
      case 0x09n:
        params.initialMaxStreamsUni = paramValue;
        break;
    }
  }
  return params;
}
function decode6(buffer, version2 = "webtransport") {
  if (buffer.length === 0) {
    throw new Error("Invalid frame: empty buffer");
  }
  if (version2 === "webtransport") {
    return decodeWebTransport(buffer);
  }
  return decodeQMux(buffer);
}
function decodeWebTransport(buffer) {
  const frameType = buffer[0];
  buffer = buffer.slice(1);
  let v;
  if (frameType === 4) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    return { type: "reset_stream", id, code };
  }
  if (frameType === 5) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    return { type: "stop_sending", id, code };
  }
  if (frameType === 29) {
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    const reason = new TextDecoder().decode(buffer);
    return { type: "connection_close", code, reason };
  }
  if (frameType === 8 || frameType === 9) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    return {
      type: "stream",
      id,
      data: buffer,
      fin: frameType === 9
    };
  }
  throw new Error(`Invalid frame type: ${frameType}`);
}
function decodeQMux(buffer) {
  let v;
  [v, buffer] = VarInt.decode(buffer);
  const frameType = v.value;
  if (frameType >= 0x08n && frameType <= 0x0fn) {
    const hasOff = (frameType & 0x04n) !== 0n;
    const hasLen = (frameType & 0x02n) !== 0n;
    const hasFin = (frameType & 0x01n) !== 0n;
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    if (hasOff) {
      [v, buffer] = VarInt.decode(buffer);
    }
    let data;
    if (hasLen) {
      [v, buffer] = VarInt.decode(buffer);
      const len = Number(v.value);
      data = buffer.slice(0, len);
      buffer = buffer.slice(len);
    } else {
      data = buffer;
    }
    return { type: "stream", id, data, fin: hasFin };
  }
  if (frameType === 0x04n) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    [v, buffer] = VarInt.decode(buffer);
    return { type: "reset_stream", id, code };
  }
  if (frameType === 0x05n) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    return { type: "stop_sending", id, code };
  }
  if (frameType === 0x1cn || frameType === 0x1dn) {
    [v, buffer] = VarInt.decode(buffer);
    const code = v;
    [v, buffer] = VarInt.decode(buffer);
    [v, buffer] = VarInt.decode(buffer);
    const reasonLen = Number(v.value);
    const reason = new TextDecoder().decode(buffer.slice(0, reasonLen));
    return { type: "connection_close", code, reason };
  }
  if (frameType === 0x10n) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "max_data", max: v.value };
  }
  if (frameType === 0x11n) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    return { type: "max_stream_data", id, max: v.value };
  }
  if (frameType === 0x12n) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "max_streams_bidi", max: v.value };
  }
  if (frameType === 0x13n) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "max_streams_uni", max: v.value };
  }
  if (frameType === 0x14n) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "data_blocked", limit: v.value };
  }
  if (frameType === 0x15n) {
    [v, buffer] = VarInt.decode(buffer);
    const id = new Id(v);
    [v, buffer] = VarInt.decode(buffer);
    return { type: "stream_data_blocked", id, limit: v.value };
  }
  if (frameType === 0x16n) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "streams_blocked_bidi", limit: v.value };
  }
  if (frameType === 0x17n) {
    [v, buffer] = VarInt.decode(buffer);
    return { type: "streams_blocked_uni", limit: v.value };
  }
  if (frameType === 0x3f5153300d0a0d0an) {
    [v, buffer] = VarInt.decode(buffer);
    const len = Number(v.value);
    if (buffer.byteLength < len) {
      throw new Error("transport parameters frame truncated");
    }
    const payload = buffer.slice(0, len);
    const params = decodeTransportParams(payload);
    return { type: "transport_parameters", params };
  }
  if (frameType === 0x30n) {
    return null;
  }
  if (frameType === 0x31n) {
    [v, buffer] = VarInt.decode(buffer);
    return null;
  }
  return null;
}

// ../../../../tmp/moq-dev/node_modules/.bun/@moq+qmux@0.0.6/node_modules/@moq/qmux/session.js
var DEFAULT_CONFIG = {
  maxStreamsBidi: 100n,
  maxStreamsUni: 100n,
  maxData: 1048576n,
  maxStreamDataBidiLocal: 262144n,
  maxStreamDataBidiRemote: 262144n,
  maxStreamDataUni: 262144n
};
function configToTransportParams(config2) {
  return {
    initialMaxData: config2.maxData,
    initialMaxStreamDataBidiLocal: config2.maxStreamDataBidiLocal,
    initialMaxStreamDataBidiRemote: config2.maxStreamDataBidiRemote,
    initialMaxStreamDataUni: config2.maxStreamDataUni,
    initialMaxStreamsBidi: config2.maxStreamsBidi,
    initialMaxStreamsUni: config2.maxStreamsUni
  };
}

class Datagrams {
  incomingHighWaterMark;
  incomingMaxAge;
  maxDatagramSize;
  outgoingHighWaterMark;
  outgoingMaxAge;
  readable;
  writable;
  constructor() {
    this.incomingHighWaterMark = 1024;
    this.incomingMaxAge = null;
    this.maxDatagramSize = 1200;
    this.outgoingHighWaterMark = 1024;
    this.outgoingMaxAge = null;
    this.readable = new ReadableStream({});
    this.writable = new WritableStream({});
  }
}
var PREFIX_WEBTRANSPORT = "webtransport.";
var PREFIX_QMUX = "qmux-00.";

class Session {
  #ws;
  #isServer = false;
  #closed;
  #closeReason;
  #sendStreams = new Map;
  #recvStreams = new Map;
  #nextUniStreamId = 0n;
  #nextBiStreamId = 0n;
  #version = "webtransport";
  #protocol = "";
  get protocol() {
    return this.#protocol;
  }
  ready;
  #readyResolve;
  closed;
  #closedResolve;
  incomingBidirectionalStreams;
  #incomingBidirectionalStreams;
  incomingUnidirectionalStreams;
  #incomingUnidirectionalStreams;
  datagrams = new Datagrams;
  #config;
  #ourParams;
  #peerParams = { ...DEFAULT_TRANSPORT_PARAMS };
  #paramsReceived = false;
  #connCredit;
  #recvDataOffset = 0n;
  #recvDataMax = 0n;
  #recvDataConsumed = 0n;
  #streamFlow = new Map;
  #bidiStreamCredit;
  #uniStreamCredit;
  #recvBiCredit;
  #recvUniCredit;
  constructor(url, options) {
    if (options?.requireUnreliable) {
      throw new Error("not allowed to use WebSocket; requireUnreliable is true");
    }
    if (options?.serverCertificateHashes) {
      console.warn("serverCertificateHashes is not supported; trying anyway");
    }
    url = Session.#convertToWebSocketUrl(url);
    this.#config = { ...DEFAULT_CONFIG, ...options?.config };
    this.#ourParams = configToTransportParams(this.#config);
    const appProtocols = options?.protocols ?? [];
    const prefixed = new Set(["qmux-00", "webtransport"]);
    for (const p of appProtocols) {
      const stripped = p.startsWith(PREFIX_WEBTRANSPORT) ? p.slice(PREFIX_WEBTRANSPORT.length) : p.startsWith(PREFIX_QMUX) ? p.slice(PREFIX_QMUX.length) : p;
      prefixed.add(`${PREFIX_QMUX}${stripped}`);
      prefixed.add(`${PREFIX_WEBTRANSPORT}${stripped}`);
    }
    this.#ws = new WebSocket(url, [...prefixed]);
    this.#connCredit = new Credit(0n);
    this.#bidiStreamCredit = new Credit(0n);
    this.#uniStreamCredit = new Credit(0n);
    this.#recvBiCredit = new Credit(this.#config.maxStreamsBidi);
    this.#recvUniCredit = new Credit(this.#config.maxStreamsUni);
    const ready = Promise.withResolvers();
    this.ready = ready.promise;
    this.#readyResolve = ready.resolve;
    const closed = Promise.withResolvers();
    this.closed = closed.promise;
    this.#closedResolve = closed.resolve;
    this.#ws.binaryType = "arraybuffer";
    this.#ws.onopen = () => {
      const raw = this.#ws.protocol;
      if (raw.startsWith(PREFIX_QMUX)) {
        this.#version = "qmux-00";
        this.#protocol = raw.slice(PREFIX_QMUX.length);
      } else if (raw.startsWith(PREFIX_WEBTRANSPORT)) {
        this.#version = "webtransport";
        this.#protocol = raw.slice(PREFIX_WEBTRANSPORT.length);
      } else if (raw === "qmux-00") {
        this.#version = "qmux-00";
        this.#protocol = "";
      } else {
        this.#version = "webtransport";
        this.#protocol = "";
      }
      if (this.#version === "qmux-00") {
        this.#recvDataMax = this.#ourParams.initialMaxData;
        this.#sendTransportParameters();
      } else {
        this.#connCredit = new Credit(BigInt(Number.MAX_SAFE_INTEGER));
        this.#bidiStreamCredit = new Credit(BigInt(Number.MAX_SAFE_INTEGER));
        this.#uniStreamCredit = new Credit(BigInt(Number.MAX_SAFE_INTEGER));
      }
      this.#readyResolve();
    };
    this.#ws.onmessage = (event) => this.#handleMessage(event);
    this.#ws.onerror = (event) => this.#handleError(event);
    this.#ws.onclose = (event) => this.#handleClose(event);
    this.incomingBidirectionalStreams = new ReadableStream({
      start: (controller) => {
        this.#incomingBidirectionalStreams = controller;
      }
    });
    this.incomingUnidirectionalStreams = new ReadableStream({
      start: (controller) => {
        this.#incomingUnidirectionalStreams = controller;
      }
    });
    if (!this.#incomingBidirectionalStreams || !this.#incomingUnidirectionalStreams) {
      throw new Error("ReadableStream didn't call start");
    }
  }
  static #convertToWebSocketUrl(url) {
    const urlObj = typeof url === "string" ? new URL(url) : url;
    let protocol = urlObj.protocol;
    if (protocol === "https:") {
      protocol = "wss:";
    } else if (protocol === "http:") {
      protocol = "ws:";
    } else if (protocol !== "ws:" && protocol !== "wss:") {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }
    return `${protocol}//${urlObj.host}${urlObj.pathname}${urlObj.search}`;
  }
  #handleMessage(event) {
    if (!(event.data instanceof ArrayBuffer))
      return;
    const data = new Uint8Array(event.data);
    try {
      const frame = decode6(data, this.#version);
      if (frame !== null) {
        this.#recvFrame(frame);
      }
    } catch (error2) {
      console.error("Failed to decode frame:", error2);
      this.close({ closeCode: 1002, reason: "Protocol violation" });
    }
  }
  #handleError(event) {
    if (this.#closed)
      return;
    this.#closed = new Error(`WebSocket error: ${event.type}`);
    this.#close(1006, "WebSocket error");
  }
  #handleClose(event) {
    if (this.#closed)
      return;
    this.#closed = new Error(`Connection closed: ${event.code} ${event.reason}`);
    this.#close(event.code, event.reason);
  }
  #recvFrame(frame) {
    if (frame.type === "stream") {
      this.#handleStreamFrame(frame);
    } else if (frame.type === "reset_stream") {
      this.#handleResetStream(frame);
    } else if (frame.type === "stop_sending") {
      this.#handleStopSending(frame);
    } else if (frame.type === "connection_close") {
      this.#closeReason = new Error(`Connection closed: ${frame.code.value}: ${frame.reason}`);
      this.#ws.close();
    } else if (frame.type === "transport_parameters") {
      this.#handleTransportParameters(frame.params);
    } else if (frame.type === "max_data") {
      this.#connCredit.increaseMax(frame.max);
    } else if (frame.type === "max_stream_data") {
      const flow = this.#streamFlow.get(frame.id.value.value);
      if (flow)
        flow.sendCredit.increaseMax(frame.max);
    } else if (frame.type === "max_streams_bidi") {
      this.#bidiStreamCredit.increaseMax(frame.max);
    } else if (frame.type === "max_streams_uni") {
      this.#uniStreamCredit.increaseMax(frame.max);
    } else if (frame.type === "data_blocked" || frame.type === "stream_data_blocked" || frame.type === "streams_blocked_bidi" || frame.type === "streams_blocked_uni") {}
  }
  #handleTransportParameters(params) {
    if (this.#paramsReceived)
      return;
    this.#paramsReceived = true;
    this.#peerParams = params;
    this.#connCredit.increaseMax(params.initialMaxData);
    this.#bidiStreamCredit.increaseMax(params.initialMaxStreamsBidi);
    this.#uniStreamCredit.increaseMax(params.initialMaxStreamsUni);
    for (const [streamIdVal, flow] of this.#streamFlow) {
      const id = new Id(VarInt.from(streamIdVal));
      const sendLimit = id.dir === Dir.Bi ? params.initialMaxStreamDataBidiRemote : params.initialMaxStreamDataUni;
      flow.sendCredit.increaseMax(sendLimit);
    }
  }
  async#claimSendCredit(streamId, desired) {
    const flow = this.#streamFlow.get(streamId);
    if (!flow)
      return desired;
    while (true) {
      const streamClaimed = flow.sendCredit.tryClaim(desired);
      if (streamClaimed === 0n) {
        if (this.#closed)
          throw this.#closeReason || new Error("Connection closed");
        const claimed = await flow.sendCredit.claim(desired);
        flow.sendCredit.release(claimed);
        continue;
      }
      const connClaimed = this.#connCredit.tryClaim(streamClaimed);
      if (connClaimed === 0n) {
        flow.sendCredit.release(streamClaimed);
        if (this.#closed)
          throw this.#closeReason || new Error("Connection closed");
        const claimed = await this.#connCredit.claim(1n);
        this.#connCredit.release(claimed);
        continue;
      }
      if (connClaimed < streamClaimed) {
        flow.sendCredit.release(streamClaimed - connClaimed);
      }
      return connClaimed;
    }
  }
  #accountRecv(streamId, bytes) {
    if (this.#version !== "qmux-00" || bytes === 0)
      return true;
    const bytesN = BigInt(bytes);
    if (this.#recvDataOffset + bytesN > this.#recvDataMax) {
      return false;
    }
    this.#recvDataOffset += bytesN;
    const flow = this.#streamFlow.get(streamId);
    if (flow) {
      if (flow.recvOffset + bytesN > flow.recvMax) {
        return false;
      }
      flow.recvOffset += bytesN;
    }
    return true;
  }
  #accountConsumed(streamId, bytes) {
    if (this.#version !== "qmux-00" || bytes === 0)
      return;
    this.#recvDataConsumed += BigInt(bytes);
    const flow = this.#streamFlow.get(streamId);
    if (flow) {
      flow.recvConsumed += BigInt(bytes);
      this.#maybeSendMaxStreamData(streamId, flow);
    }
    this.#maybeSendMaxData();
  }
  #maybeSendMaxData() {
    const window = this.#ourParams.initialMaxData;
    if (window === 0n)
      return;
    const threshold = window / 2n;
    if (this.#recvDataConsumed >= threshold) {
      const newMax = this.#recvDataOffset + window;
      if (newMax > this.#recvDataMax) {
        this.#recvDataMax = newMax;
        this.#recvDataConsumed = 0n;
        this.#sendPriorityFrame({ type: "max_data", max: newMax });
      }
    }
  }
  #maybeSendMaxStreamData(streamId, flow) {
    const id = new Id(VarInt.from(streamId));
    let initialWindow;
    if (id.dir === Dir.Bi) {
      initialWindow = id.serverInitiated === this.#isServer ? this.#ourParams.initialMaxStreamDataBidiLocal : this.#ourParams.initialMaxStreamDataBidiRemote;
    } else {
      initialWindow = this.#ourParams.initialMaxStreamDataUni;
    }
    if (initialWindow === 0n)
      return;
    const threshold = initialWindow / 2n;
    if (flow.recvConsumed >= threshold) {
      const newMax = flow.recvOffset + initialWindow;
      if (newMax > flow.recvMax) {
        flow.recvMax = newMax;
        flow.recvConsumed = 0n;
        this.#sendPriorityFrame({ type: "max_stream_data", id, max: newMax });
      }
    }
  }
  #replenishStreamCredit(dir) {
    if (this.#version !== "qmux-00")
      return;
    const credit = dir === Dir.Bi ? this.#recvBiCredit : this.#recvUniCredit;
    const newMax = credit.consume(1n);
    if (newMax !== null) {
      if (dir === Dir.Bi) {
        this.#sendPriorityFrame({ type: "max_streams_bidi", max: newMax });
      } else {
        this.#sendPriorityFrame({ type: "max_streams_uni", max: newMax });
      }
    }
  }
  #maybeDeleteStreamFlow(streamId) {
    if (!this.#sendStreams.has(streamId) && !this.#recvStreams.has(streamId)) {
      const flow = this.#streamFlow.get(streamId);
      if (flow) {
        flow.sendCredit.close();
        this.#streamFlow.delete(streamId);
      }
    }
  }
  async#handleStreamFrame(frame) {
    if (frame.data.byteLength > MAX_FRAME_PAYLOAD) {
      this.close({ closeCode: 1002, reason: "frame too large" });
      return;
    }
    const streamId = frame.id.value.value;
    if (!frame.id.canRecv(this.#isServer)) {
      throw new Error("Invalid stream ID direction");
    }
    let stream = this.#recvStreams.get(streamId);
    if (!stream) {
      if (frame.id.serverInitiated === this.#isServer) {
        return;
      }
      if (!frame.id.canRecv(this.#isServer)) {
        throw new Error("received write-only stream");
      }
      if (this.#version === "qmux-00") {
        const credit = frame.id.dir === Dir.Bi ? this.#recvBiCredit : this.#recvUniCredit;
        if (!credit.receiveUpTo(frame.id.index + 1n)) {
          this.close({ closeCode: 1002, reason: "stream limit exceeded" });
          return;
        }
      }
      if (this.#version === "qmux-00") {
        const recvMax = frame.id.dir === Dir.Bi ? this.#ourParams.initialMaxStreamDataBidiRemote : this.#ourParams.initialMaxStreamDataUni;
        const sendMax = frame.id.dir === Dir.Bi ? this.#peerParams.initialMaxStreamDataBidiLocal : 0n;
        this.#streamFlow.set(streamId, {
          sendCredit: new Credit(sendMax),
          recvMax,
          recvOffset: 0n,
          recvConsumed: 0n
        });
      }
      if (!this.#accountRecv(streamId, frame.data.byteLength)) {
        this.close({ closeCode: 1002, reason: "flow control error" });
        return;
      }
      const reader = new ReadableStream({
        start: (controller) => {
          stream = controller;
          this.#recvStreams.set(streamId, controller);
        },
        cancel: () => {
          this.#sendPriorityFrame({
            type: "stop_sending",
            id: frame.id,
            code: VarInt.from(0)
          });
          this.#recvStreams.delete(streamId);
          this.#replenishStreamCredit(frame.id.dir);
          this.#maybeDeleteStreamFlow(streamId);
        }
      });
      if (!stream) {
        throw new Error("ReadableStream didn't call start");
      }
      if (frame.id.dir === Dir.Bi) {
        const writer = new WritableStream({
          start: (controller) => {
            this.#sendStreams.set(streamId, controller);
          },
          write: async (chunk) => {
            await Promise.race([this.#sendStreamData(frame.id, chunk), this.closed]);
          },
          abort: (e) => {
            console.warn("abort", e);
            this.#sendPriorityFrame({
              type: "reset_stream",
              id: frame.id,
              code: VarInt.from(0)
            });
            this.#sendStreams.delete(streamId);
            this.#maybeDeleteStreamFlow(streamId);
          },
          close: async () => {
            await Promise.race([
              this.#sendFrame({
                type: "stream",
                id: frame.id,
                data: new Uint8Array,
                fin: true
              }),
              this.closed
            ]);
            this.#sendStreams.delete(streamId);
            this.#maybeDeleteStreamFlow(streamId);
          }
        });
        this.#incomingBidirectionalStreams.enqueue({ readable: reader, writable: writer });
      } else {
        this.#incomingUnidirectionalStreams.enqueue(reader);
      }
    } else {
      if (!this.#accountRecv(streamId, frame.data.byteLength)) {
        this.close({ closeCode: 1002, reason: "flow control error" });
        return;
      }
    }
    if (frame.data.byteLength > 0) {
      stream.enqueue(frame.data);
      this.#accountConsumed(streamId, frame.data.byteLength);
    }
    if (frame.fin) {
      stream.close();
      this.#recvStreams.delete(streamId);
      if (frame.id.serverInitiated !== this.#isServer) {
        this.#replenishStreamCredit(frame.id.dir);
      }
      this.#maybeDeleteStreamFlow(streamId);
    }
  }
  #handleResetStream(frame) {
    const streamId = frame.id.value.value;
    const stream = this.#recvStreams.get(streamId);
    if (!stream)
      return;
    stream.error(new Error(`RESET_STREAM: ${frame.code.value}`));
    this.#recvStreams.delete(streamId);
    if (frame.id.serverInitiated !== this.#isServer) {
      this.#replenishStreamCredit(frame.id.dir);
    }
    this.#maybeDeleteStreamFlow(streamId);
  }
  #handleStopSending(frame) {
    const streamId = frame.id.value.value;
    const stream = this.#sendStreams.get(streamId);
    if (!stream)
      return;
    stream.error(new Error(`STOP_SENDING: ${frame.code.value}`));
    this.#sendStreams.delete(streamId);
    this.#sendPriorityFrame({
      type: "reset_stream",
      id: frame.id,
      code: frame.code
    });
    this.#maybeDeleteStreamFlow(streamId);
  }
  #sendTransportParameters() {
    const frame = {
      type: "transport_parameters",
      params: this.#ourParams
    };
    const encoded = encode6(frame, this.#version);
    this.#ws.send(encoded);
  }
  async#sendStreamDataWithFlowControl(id, streamId, data) {
    for (let offset = 0;offset < data.byteLength; ) {
      const remaining = data.byteLength - offset;
      const chunkMax = Math.min(remaining, MAX_FRAME_PAYLOAD);
      const allowed = await this.#claimSendCredit(streamId, BigInt(chunkMax));
      const sendable = Number(allowed);
      const chunk = data.subarray(offset, offset + sendable);
      try {
        await this.#sendFrame({
          type: "stream",
          id,
          data: chunk,
          fin: false
        });
      } catch (e) {
        if (sendable > 0) {
          const flow = this.#streamFlow.get(streamId);
          if (flow)
            flow.sendCredit.release(BigInt(sendable));
          this.#connCredit.release(BigInt(sendable));
        }
        throw e;
      }
      offset += sendable;
    }
  }
  async#sendStreamData(id, data) {
    const streamId = id.value.value;
    if (this.#version === "qmux-00") {
      await this.#sendStreamDataWithFlowControl(id, streamId, data);
    } else {
      for (let offset = 0;offset < data.byteLength; offset += MAX_FRAME_PAYLOAD) {
        const end = Math.min(offset + MAX_FRAME_PAYLOAD, data.byteLength);
        const chunk = data.subarray(offset, end);
        await this.#sendFrame({
          type: "stream",
          id,
          data: chunk,
          fin: false
        });
      }
    }
  }
  async#sendFrame(frame) {
    while (this.#ws.bufferedAmount > 64 * 1024) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const chunk = encode6(frame, this.#version);
    this.#ws.send(chunk);
  }
  #sendPriorityFrame(frame) {
    const chunk = encode6(frame, this.#version);
    this.#ws.send(chunk);
  }
  async createBidirectionalStream() {
    await this.ready;
    if (this.#closed) {
      throw this.#closeReason || new Error("Connection closed");
    }
    await this.#bidiStreamCredit.claim(1n);
    const streamId = Id.create(this.#nextBiStreamId++, Dir.Bi, this.#isServer);
    const streamIdVal = streamId.value.value;
    if (this.#version === "qmux-00") {
      this.#streamFlow.set(streamIdVal, {
        sendCredit: new Credit(this.#peerParams.initialMaxStreamDataBidiRemote),
        recvMax: this.#ourParams.initialMaxStreamDataBidiLocal,
        recvOffset: 0n,
        recvConsumed: 0n
      });
    }
    const writer = new WritableStream({
      start: (controller) => {
        this.#sendStreams.set(streamIdVal, controller);
      },
      write: async (chunk) => {
        await Promise.race([this.#sendStreamData(streamId, chunk), this.closed]);
      },
      abort: (e) => {
        console.warn("abort", e);
        this.#sendPriorityFrame({
          type: "reset_stream",
          id: streamId,
          code: VarInt.from(0)
        });
        this.#sendStreams.delete(streamIdVal);
        this.#maybeDeleteStreamFlow(streamIdVal);
      },
      close: async () => {
        await Promise.race([
          this.#sendFrame({
            type: "stream",
            id: streamId,
            data: new Uint8Array,
            fin: true
          }),
          this.closed
        ]);
        this.#sendStreams.delete(streamIdVal);
        this.#maybeDeleteStreamFlow(streamIdVal);
      }
    });
    const reader = new ReadableStream({
      start: (controller) => {
        this.#recvStreams.set(streamIdVal, controller);
      },
      cancel: async () => {
        this.#sendPriorityFrame({
          type: "stop_sending",
          id: streamId,
          code: VarInt.from(0)
        });
        this.#recvStreams.delete(streamIdVal);
        this.#maybeDeleteStreamFlow(streamIdVal);
      }
    });
    return { readable: reader, writable: writer };
  }
  async createUnidirectionalStream() {
    await this.ready;
    if (this.#closed) {
      throw this.#closed;
    }
    await this.#uniStreamCredit.claim(1n);
    const streamId = Id.create(this.#nextUniStreamId++, Dir.Uni, this.#isServer);
    const streamIdVal = streamId.value.value;
    if (this.#version === "qmux-00") {
      this.#streamFlow.set(streamIdVal, {
        sendCredit: new Credit(this.#peerParams.initialMaxStreamDataUni),
        recvMax: 0n,
        recvOffset: 0n,
        recvConsumed: 0n
      });
    }
    const session = this;
    const writer = new WritableStream({
      start: (controller) => {
        session.#sendStreams.set(streamIdVal, controller);
      },
      async write(chunk) {
        await Promise.race([session.#sendStreamData(streamId, chunk), session.closed]);
      },
      abort(e) {
        console.warn("abort", e);
        session.#sendPriorityFrame({
          type: "reset_stream",
          id: streamId,
          code: VarInt.from(0)
        });
        session.#sendStreams.delete(streamIdVal);
        session.#maybeDeleteStreamFlow(streamIdVal);
      },
      async close() {
        await Promise.race([
          session.#sendFrame({
            type: "stream",
            id: streamId,
            data: new Uint8Array,
            fin: true
          }),
          session.closed
        ]);
        session.#sendStreams.delete(streamIdVal);
        session.#maybeDeleteStreamFlow(streamIdVal);
      }
    });
    return writer;
  }
  #close(code, reason) {
    this.#closedResolve({
      closeCode: code,
      reason
    });
    try {
      this.#incomingBidirectionalStreams.close();
    } catch {}
    try {
      this.#incomingUnidirectionalStreams.close();
    } catch {}
    for (const c of this.#sendStreams.values()) {
      try {
        c.error(this.#closed);
      } catch {}
    }
    for (const c of this.#recvStreams.values()) {
      try {
        c.error(this.#closed);
      } catch {}
    }
    this.#sendStreams.clear();
    this.#recvStreams.clear();
    for (const flow of this.#streamFlow.values()) {
      flow.sendCredit.close();
    }
    this.#streamFlow.clear();
    this.#connCredit.close();
    this.#bidiStreamCredit.close();
    this.#uniStreamCredit.close();
    this.#recvBiCredit.close();
    this.#recvUniCredit.close();
  }
  close(info) {
    if (this.#closed)
      return;
    const code = info?.closeCode ?? 0;
    const reason = info?.reason ?? "";
    this.#sendPriorityFrame({
      type: "connection_close",
      code: VarInt.from(code),
      reason
    });
    setTimeout(() => {
      this.#ws.close();
    }, 100);
    this.#close(code, reason);
  }
  get congestionControl() {
    return "default";
  }
}

// ../../../../tmp/moq-dev/node_modules/.bun/@moq+qmux@0.0.6/node_modules/@moq/qmux/index.js
var qmux_default = Session;

// ../../../../tmp/moq-dev/js/lite/src/connection/connect.ts
init_stream();

// ../../../../tmp/moq-dev/js/lite/src/util/hex.ts
function toBytes(hex) {
  hex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (hex.length % 2) {
    throw new Error("invalid hex string length");
  }
  const matches = hex.match(/.{2}/g);
  if (!matches) {
    throw new Error("invalid hex string format");
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

// ../../../../tmp/moq-dev/js/lite/src/connection/connect.ts
var DEFAULT_WEBSOCKET_DELAY_MS = 500;
var websocketWon = new Set;
var isFirefox = typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("firefox");
async function connect(url, props) {
  if (props?.transport) {
    return connectTransport(url, props.transport);
  }
  const { promise: cancel, resolve: done } = Promise.withResolvers();
  const webtransport = globalThis.WebTransport && !isFirefox ? connectWebTransport(url, cancel, props?.webtransport) : undefined;
  const headstart = !webtransport || websocketWon.has(url.toString()) ? 0 : props?.websocket?.delay ?? DEFAULT_WEBSOCKET_DELAY_MS;
  const websocket = props?.websocket?.enabled !== false ? connectWebSocket(props?.websocket?.url ?? url, headstart, cancel) : undefined;
  if (!websocket && !webtransport) {
    throw new Error("no transport available; WebTransport not supported and WebSocket is disabled");
  }
  const session = await Promise.any(webtransport ? websocket ? [websocket, webtransport] : [webtransport] : [websocket]);
  done();
  if (!session)
    throw new Error("no transport available");
  if (session instanceof qmux_default) {
    console.warn(url.toString(), "connected via WebSocket");
    websocketWon.add(url.toString());
  } else {
    console.log(url.toString(), "connected via WebTransport");
  }
  const protocol = session instanceof qmux_default ? session.protocol || undefined : session.protocol;
  console.debug(url.toString(), "negotiated ALPN:", protocol ?? "(none)");
  let setupVersion;
  if (protocol === ALPN.DRAFT_17) {
    const encoder2 = new TextEncoder;
    const params2 = new SetupOptions;
    params2.setBytes(SetupOption.Implementation, encoder2.encode("moq-lite-js"));
    const setupMsg = new Setup({ parameters: params2 });
    const [sendWriter, recvReader] = await Promise.all([
      (async () => {
        const writable = await session.createUnidirectionalStream();
        const writer = new Writer(writable, Version.DRAFT_17);
        await writer.u53(Setup.id);
        await setupMsg.encode(writer, Version.DRAFT_17);
        return { writable, writer };
      })(),
      (async () => {
        const uniReader = session.incomingUnidirectionalStreams.getReader();
        const next = await uniReader.read();
        uniReader.releaseLock();
        if (next.done)
          throw new Error("no incoming uni stream for SETUP");
        const readable = next.value;
        const reader = new Reader(readable, undefined, Version.DRAFT_17);
        const streamType = await reader.u53();
        if (streamType !== Setup.id) {
          throw new Error(`unexpected stream type on setup uni: 0x${streamType.toString(16)}`);
        }
        const serverSetup = await Setup.decode(reader, Version.DRAFT_17);
        console.debug(url.toString(), "received server setup (d17)", serverSetup);
        return { readable, reader };
      })()
    ]);
    const controlStream = new Stream({
      writable: sendWriter.writable,
      readable: recvReader.readable,
      writer: sendWriter.writer,
      reader: recvReader.reader
    });
    return new Connection({
      url,
      quic: session,
      control: controlStream,
      maxRequestId: 0n,
      version: Version.DRAFT_17
    });
  } else if (protocol === ALPN.DRAFT_16) {
    setupVersion = Version.DRAFT_16;
  } else if (protocol === ALPN.DRAFT_15) {
    setupVersion = Version.DRAFT_15;
  } else if (protocol === ALPN_04) {
    return new Connection2(url, session, Version2.DRAFT_04, undefined);
  } else if (protocol === ALPN_03) {
    return new Connection2(url, session, Version2.DRAFT_03, undefined);
  } else if (protocol === ALPN2 || protocol === "" || protocol === undefined) {
    setupVersion = Version.DRAFT_14;
  } else {
    throw new Error(`unsupported WebTransport protocol: ${protocol}`);
  }
  const stream = await Stream.open(session);
  await stream.writer.u53(StreamId.ClientCompat);
  const encoder = new TextEncoder;
  const params = new SetupOptions;
  params.setVarint(SetupOption.MaxRequestId, 42069n);
  params.setBytes(SetupOption.Implementation, encoder.encode("moq-lite-js"));
  const client = new ClientSetup({
    versions: setupVersion === Version.DRAFT_16 ? [Version.DRAFT_16] : setupVersion === Version.DRAFT_15 ? [Version.DRAFT_15] : [Version2.DRAFT_02, Version2.DRAFT_01, Version.DRAFT_14],
    parameters: params
  });
  console.debug(url.toString(), "sending client setup", client);
  await client.encode(stream.writer, setupVersion);
  const serverCompat = await stream.reader.u53();
  if (serverCompat !== StreamId.ServerCompat) {
    throw new Error(`unsupported server message type: ${serverCompat.toString()}`);
  }
  const server = await ServerSetup.decode(stream.reader, setupVersion);
  console.debug(url.toString(), "received server setup", server);
  if (Object.values(Version2).includes(server.version)) {
    return new Connection2(url, session, server.version, stream);
  } else if (Object.values(Version).includes(server.version)) {
    const maxRequestId = server.parameters.getVarint(SetupOption.MaxRequestId) ?? 0n;
    return new Connection({
      url,
      quic: session,
      control: stream,
      maxRequestId,
      version: server.version
    });
  } else {
    throw new Error(`unsupported server version: ${server.version.toString()}`);
  }
}
async function connectTransport(url, session) {
  const protocol = session.protocol;
  let setupVersion;
  if (protocol === ALPN.DRAFT_17) {
    const encoder2 = new TextEncoder;
    const params2 = new SetupOptions;
    params2.setBytes(SetupOption.Implementation, encoder2.encode("moq-lite-js"));
    const setupMsg = new Setup({ parameters: params2 });
    const [sendWritable, recvReadable] = await Promise.all([
      session.createUnidirectionalStream(),
      (async () => {
        const uniReader = session.incomingUnidirectionalStreams.getReader();
        const next = await uniReader.read();
        uniReader.releaseLock();
        if (next.done)
          throw new Error("no incoming uni stream for SETUP");
        return next.value;
      })()
    ]);
    const controlStream = new Stream({ writable: sendWritable, readable: recvReadable });
    controlStream.writer.version = Version.DRAFT_17;
    controlStream.reader.version = Version.DRAFT_17;
    await Promise.all([
      (async () => {
        await controlStream.writer.u53(Setup.id);
        await setupMsg.encode(controlStream.writer, Version.DRAFT_17);
      })(),
      (async () => {
        const streamType = await controlStream.reader.u53();
        if (streamType !== Setup.id) {
          throw new Error(`unexpected stream type on setup uni: 0x${streamType.toString(16)}`);
        }
        await Setup.decode(controlStream.reader, Version.DRAFT_17);
      })()
    ]);
    return new Connection({
      url,
      quic: session,
      control: controlStream,
      maxRequestId: 0n,
      version: Version.DRAFT_17
    });
  } else if (protocol === ALPN.DRAFT_16) {
    setupVersion = Version.DRAFT_16;
  } else if (protocol === ALPN.DRAFT_15) {
    setupVersion = Version.DRAFT_15;
  } else if (protocol === ALPN_04) {
    return new Connection2(url, session, Version2.DRAFT_04, undefined);
  } else if (protocol === ALPN_03) {
    return new Connection2(url, session, Version2.DRAFT_03, undefined);
  } else if (protocol === ALPN2 || protocol === "" || protocol === undefined) {
    setupVersion = Version.DRAFT_14;
  } else {
    throw new Error(`unsupported WebTransport protocol: ${protocol}`);
  }
  const stream = await Stream.open(session);
  await stream.writer.u53(StreamId.ClientCompat);
  const encoder = new TextEncoder;
  const params = new SetupOptions;
  params.setVarint(SetupOption.MaxRequestId, 42069n);
  params.setBytes(SetupOption.Implementation, encoder.encode("moq-lite-js"));
  const client = new ClientSetup({
    versions: setupVersion === Version.DRAFT_16 ? [Version.DRAFT_16] : setupVersion === Version.DRAFT_15 ? [Version.DRAFT_15] : [Version2.DRAFT_02, Version2.DRAFT_01, Version.DRAFT_14],
    parameters: params
  });
  await client.encode(stream.writer, setupVersion);
  const serverCompat = await stream.reader.u53();
  if (serverCompat !== StreamId.ServerCompat) {
    throw new Error(`unsupported server message type: ${serverCompat.toString()}`);
  }
  const server = await ServerSetup.decode(stream.reader, setupVersion);
  if (Object.values(Version2).includes(server.version)) {
    return new Connection2(url, session, server.version, stream);
  } else if (Object.values(Version).includes(server.version)) {
    const maxRequestId = server.parameters.getVarint(SetupOption.MaxRequestId) ?? 0n;
    return new Connection({
      url,
      quic: session,
      control: stream,
      maxRequestId,
      version: server.version
    });
  } else {
    throw new Error(`unsupported server version: ${server.version.toString()}`);
  }
}
async function connectWebTransport(url, cancel, options) {
  let finalUrl = url;
  const finalOptions = {
    allowPooling: false,
    congestionControl: "low-latency",
    protocols: [ALPN_04, ALPN_03, ALPN2, ALPN.DRAFT_17, ALPN.DRAFT_16, ALPN.DRAFT_15],
    ...options
  };
  if (url.protocol === "http:") {
    const fingerprintUrl = new URL(url);
    fingerprintUrl.pathname = "/certificate.sha256";
    fingerprintUrl.search = "";
    console.warn(fingerprintUrl.toString(), "performing an insecure fingerprint fetch; use https:// in production");
    const fingerprint = await Promise.race([fetch(fingerprintUrl), cancel]);
    if (!fingerprint)
      return;
    const fingerprintText = await Promise.race([fingerprint.text(), cancel]);
    if (fingerprintText === undefined)
      return;
    finalOptions.serverCertificateHashes = (finalOptions.serverCertificateHashes || []).concat([
      {
        algorithm: "sha-256",
        value: toBytes(fingerprintText)
      }
    ]);
    finalUrl = new URL(url);
    finalUrl.protocol = "https:";
  }
  const quic = new WebTransport(finalUrl, finalOptions);
  quic.closed.catch(() => {});
  const loaded = await Promise.race([quic.ready.then(() => true), cancel]);
  if (!loaded) {
    quic.close();
    return;
  }
  return quic;
}
async function connectWebSocket(url, delay, cancel) {
  const timer = new Promise((resolve) => setTimeout(resolve, delay));
  const active = await Promise.race([cancel, timer.then(() => true)]);
  if (!active)
    return;
  const quic = new qmux_default(url);
  const loaded = await Promise.race([quic.ready.then(() => true), cancel]);
  if (!loaded) {
    quic.close();
    return;
  }
  return quic;
}
// ../../../../tmp/moq-dev/js/lite/src/connection/reload.ts
class Reload {
  url;
  enabled;
  status = new Signal("disconnected");
  established = new Signal(undefined);
  #announced = new Signal(new Set);
  announced = this.#announced;
  webtransport;
  websocket;
  delay;
  signals = new Effect;
  closed;
  #closedResolve;
  #closedReject;
  #delay;
  #retryStart;
  #tick = new Signal(0);
  constructor(props) {
    this.url = Signal.from(props?.url);
    this.enabled = Signal.from(props?.enabled ?? false);
    this.delay = props?.delay ?? { initial: 1000, multiplier: 2, max: 30000 };
    this.webtransport = props?.webtransport;
    this.websocket = props?.websocket;
    this.#delay = this.delay.initial;
    this.closed = new Promise((resolve, reject) => {
      this.#closedResolve = resolve;
      this.#closedReject = reject;
    });
    this.signals.run(this.#connect.bind(this));
    this.signals.run(this.#runAnnounced.bind(this));
  }
  #connect(effect) {
    effect.get(this.#tick);
    const enabled = effect.get(this.enabled);
    if (!enabled)
      return;
    const url = effect.get(this.url);
    if (!url)
      return;
    effect.set(this.status, "connecting", "disconnected");
    effect.spawn(async () => {
      try {
        const pending = connect(url, { websocket: this.websocket, webtransport: this.webtransport });
        const connection = await Promise.race([effect.cancel, pending]);
        if (!connection) {
          pending.then((conn) => conn.close()).catch(() => {});
          return;
        }
        effect.set(this.established, connection);
        effect.cleanup(() => connection.close());
        effect.set(this.status, "connected", "disconnected");
        this.#delay = this.delay.initial;
        this.#retryStart = undefined;
        await Promise.race([effect.cancel, connection.closed]);
      } catch (err) {
        console.warn("connection error:", err);
        this.#retryStart ??= performance.now();
        if (this.delay.timeout !== undefined) {
          const elapsed = performance.now() - this.#retryStart;
          if (elapsed >= this.delay.timeout) {
            console.warn("reconnect timed out");
            this.#closedReject(new Error("reconnect timed out"));
            return;
          }
        }
        const tick = this.#tick.peek() + 1;
        effect.timer(() => this.#tick.update((prev) => Math.max(prev, tick)), this.#delay);
        this.#delay = Math.min(this.#delay * this.delay.multiplier, this.delay.max);
      }
    });
  }
  #runAnnounced(effect) {
    this.#announced.set(new Set);
    const conn = effect.get(this.established);
    if (!conn)
      return;
    effect.cleanup(() => this.#announced.set(new Set));
    if (conn.url.hostname.endsWith("mediaoverquic.com")) {
      return;
    }
    const announced = conn.announced(empty());
    effect.cleanup(() => announced.close());
    effect.spawn(async () => {
      try {
        for (;; ) {
          const entry = await Promise.race([effect.cancel, announced.next()]);
          if (!entry)
            break;
          this.#announced.mutate((active) => {
            if (entry.active) {
              active.add(entry.path);
            } else {
              active.delete(entry.path);
            }
          });
        }
      } catch (err) {
        this.#announced.set(new Set);
        throw err;
      }
    });
  }
  close() {
    this.signals.close();
    this.#closedResolve();
  }
}
// ../../../../tmp/moq-dev/js/lite/src/time.ts
var exports_time = {};
__export(exports_time, {
  Second: () => Second,
  Nano: () => Nano,
  Milli: () => Milli,
  Micro: () => Micro
});
var Nano = {
  zero: 0,
  fromMicro: (us) => us * 1000,
  fromMilli: (ms) => ms * 1e6,
  fromSecond: (s) => s * 1e9,
  toMicro: (ns) => ns / 1000,
  toMilli: (ns) => ns / 1e6,
  toSecond: (ns) => ns / 1e9,
  now: () => performance.now() * 1e6,
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
  max: (a, b) => Math.max(a, b),
  min: (a, b) => Math.min(a, b)
};
var Micro = {
  zero: 0,
  fromNano: (ns) => ns / 1000,
  fromMilli: (ms) => ms * 1000,
  fromSecond: (s) => s * 1e6,
  toNano: (us) => us * 1000,
  toMilli: (us) => us / 1000,
  toSecond: (us) => us / 1e6,
  now: () => performance.now() * 1000,
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
  max: (a, b) => Math.max(a, b),
  min: (a, b) => Math.min(a, b)
};
var Milli = {
  zero: 0,
  fromNano: (ns) => ns / 1e6,
  fromMicro: (us) => us / 1000,
  fromSecond: (s) => s * 1000,
  toNano: (ms) => ms * 1e6,
  toMicro: (ms) => ms * 1000,
  toSecond: (ms) => ms / 1000,
  now: () => performance.now(),
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
  max: (a, b) => Math.max(a, b),
  min: (a, b) => Math.min(a, b)
};
var Second = {
  zero: 0,
  fromNano: (ns) => ns / 1e9,
  fromMicro: (us) => us / 1e6,
  fromMilli: (ms) => ms / 1000,
  toNano: (s) => s * 1e9,
  toMicro: (s) => s * 1e6,
  toMilli: (s) => s * 1000,
  now: () => performance.now() / 1000,
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
  max: (a, b) => Math.max(a, b),
  min: (a, b) => Math.min(a, b)
};

// ../../../../tmp/moq-dev/js/lite/src/index.ts
init_varint();
// ../../../../tmp/moq-dev/js/hang/src/catalog/index.ts
var exports_catalog = {};
__export(exports_catalog, {
  u8Schema: () => u8Schema,
  u8: () => u8,
  u53Schema: () => u53Schema,
  u53: () => u53,
  fetch: () => fetch2,
  encode: () => encode7,
  decode: () => decode7,
  VideoSchema: () => VideoSchema,
  VideoConfigSchema: () => VideoConfigSchema,
  VideoCapabilitiesSchema: () => VideoCapabilitiesSchema,
  UserSchema: () => UserSchema,
  TrackSchema: () => TrackSchema2,
  RootSchema: () => RootSchema,
  PreviewSchema: () => PreviewSchema,
  PositionSchema: () => PositionSchema,
  PeersSchema: () => PeersSchema,
  PRIORITY: () => PRIORITY,
  LocationSchema: () => LocationSchema,
  ContainerSchema: () => ContainerSchema,
  ChatSchema: () => ChatSchema,
  CapabilitiesSchema: () => CapabilitiesSchema,
  AudioSchema: () => AudioSchema,
  AudioConfigSchema: () => AudioConfigSchema,
  AudioCapabilitiesSchema: () => AudioCapabilitiesSchema
});

// ../../../../tmp/moq-dev/js/hang/src/catalog/integers.ts
var u8Schema = number2().check(int(), _nonnegative(), _lte(255)).brand("u8");
var u53Schema = number2().check(int(), _nonnegative(), _lte(Number.MAX_SAFE_INTEGER)).brand("u53");
function u8(value) {
  return u8Schema.parse(value);
}
function u53(value) {
  return u53Schema.parse(value);
}

// ../../../../tmp/moq-dev/js/hang/src/catalog/container.ts
var ContainerSchema = _default(discriminatedUnion("kind", [
  object({ kind: literal("legacy") }),
  object({
    kind: literal("cmaf"),
    timescale: u53Schema,
    trackId: u53Schema
  })
]), { kind: "legacy" });

// ../../../../tmp/moq-dev/js/hang/src/catalog/audio.ts
var TrackSchema = object({
  name: string2()
});
var AudioConfigSchema = object({
  codec: string2(),
  container: ContainerSchema,
  description: optional(string2()),
  sampleRate: u53Schema,
  numberOfChannels: u53Schema,
  bitrate: optional(u53Schema),
  jitter: optional(u53Schema)
});
var AudioSchema = union([
  object({
    renditions: record(string2(), AudioConfigSchema)
  }),
  pipe(object({
    track: TrackSchema,
    config: AudioConfigSchema
  }), transform((old) => ({
    renditions: { [old.track.name]: old.config }
  })))
]);
// ../../../../tmp/moq-dev/js/hang/src/catalog/capabilities.ts
var VideoCapabilitiesSchema = object({
  hardware: optional(array(string2())),
  software: optional(array(string2())),
  unsupported: optional(array(string2()))
});
var AudioCapabilitiesSchema = object({
  hardware: optional(array(string2())),
  software: optional(array(string2())),
  unsupported: optional(array(string2()))
});
var CapabilitiesSchema = object({
  video: optional(VideoCapabilitiesSchema),
  audio: optional(AudioCapabilitiesSchema)
});
// ../../../../tmp/moq-dev/js/hang/src/catalog/track.ts
var TrackSchema2 = object({
  name: string2()
});

// ../../../../tmp/moq-dev/js/hang/src/catalog/chat.ts
var ChatSchema = object({
  message: optional(TrackSchema2),
  typing: optional(TrackSchema2)
});
// ../../../../tmp/moq-dev/js/hang/src/catalog/location.ts
var PositionSchema = object({
  x: optional(number2()),
  y: optional(number2()),
  z: optional(number2()),
  s: optional(number2())
});
var LocationSchema = object({
  initial: optional(PositionSchema),
  track: optional(TrackSchema2),
  handle: optional(string2()),
  peers: optional(TrackSchema2)
});
var PeersSchema = record(string2(), PositionSchema);
// ../../../../tmp/moq-dev/js/hang/src/catalog/preview.ts
var PreviewSchema = object({
  name: optional(string2()),
  avatar: optional(string2()),
  audio: optional(boolean2()),
  video: optional(boolean2()),
  typing: optional(boolean2()),
  chat: optional(boolean2()),
  screen: optional(boolean2())
});
// ../../../../tmp/moq-dev/js/hang/src/catalog/priority.ts
var PRIORITY = {
  catalog: 100,
  chat: 90,
  audio: 80,
  video: 60,
  typing: 40,
  location: 20,
  preview: 10
};
// ../../../../tmp/moq-dev/js/hang/src/catalog/user.ts
var UserSchema = object({
  id: optional(string2()),
  name: optional(string2()),
  avatar: optional(string2()),
  color: optional(string2())
});

// ../../../../tmp/moq-dev/js/hang/src/catalog/video.ts
var TrackSchema3 = object({
  name: string2()
});
var VideoConfigSchema = object({
  codec: string2(),
  container: ContainerSchema,
  description: optional(string2()),
  codedWidth: optional(u53Schema),
  codedHeight: optional(u53Schema),
  displayAspectWidth: optional(u53Schema),
  displayAspectHeight: optional(u53Schema),
  framerate: optional(number2()),
  bitrate: optional(u53Schema),
  optimizeForLatency: optional(boolean2()),
  jitter: optional(u53Schema)
});
var VideoSchema = union([
  object({
    renditions: record(string2(), VideoConfigSchema),
    display: optional(object({
      width: u53Schema,
      height: u53Schema
    })),
    rotation: optional(number2()),
    flip: optional(boolean2())
  }),
  pipe(array(object({
    track: TrackSchema3,
    config: VideoConfigSchema
  })), transform((arr) => {
    const config2 = arr[0]?.config;
    return {
      renditions: Object.fromEntries(arr.map((item) => [item.track.name, item.config])),
      display: config2?.displayAspectWidth !== undefined && config2?.displayAspectHeight !== undefined ? { width: config2.displayAspectWidth, height: config2.displayAspectHeight } : undefined,
      rotation: undefined,
      flip: undefined
    };
  }))
]);

// ../../../../tmp/moq-dev/js/hang/src/catalog/root.ts
var RootSchema = object({
  video: optional(VideoSchema),
  audio: optional(AudioSchema),
  location: optional(LocationSchema),
  user: optional(UserSchema),
  chat: optional(ChatSchema),
  capabilities: optional(CapabilitiesSchema),
  preview: optional(TrackSchema2)
});
function encode7(root) {
  const encoder = new TextEncoder;
  return encoder.encode(JSON.stringify(root));
}
function decode7(raw) {
  const decoder = new TextDecoder;
  const str = decoder.decode(raw);
  try {
    const json = JSON.parse(str);
    return RootSchema.parse(json);
  } catch (error2) {
    console.warn("invalid catalog", str);
    throw error2;
  }
}
async function fetch2(track2) {
  const frame = await track2.readFrame();
  if (!frame)
    return;
  return decode7(frame);
}
// ../../../../tmp/moq-dev/js/hang/src/container/index.ts
var exports_container = {};
__export(exports_container, {
  Legacy: () => exports_legacy,
  Cmaf: () => exports_cmaf
});

// ../../../../tmp/moq-dev/js/hang/src/container/cmaf/index.ts
var exports_cmaf = {};
__export(exports_cmaf, {
  encodeDataSegment: () => encodeDataSegment,
  decodeTimestamp: () => decodeTimestamp,
  decodeInitSegment: () => decodeInitSegment,
  decodeDataSegment: () => decodeDataSegment,
  createVideoInitSegment: () => createVideoInitSegment,
  createAudioInitSegment: () => createAudioInitSegment
});

// ../../../../tmp/moq-dev/node_modules/.bun/@svta+cml-utils@1.4.0/node_modules/@svta/cml-utils/dist/index.js
function isArrayBufferLike(value) {
  return value instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer;
}
var UTF_16 = "utf-16";
var UTF_16_BE = "utf-16be";
var UTF_16_LE = "utf-16le";
var UTF_8 = "utf-8";
function decodeText(data, options = {}) {
  let view;
  if (isArrayBufferLike(data))
    view = new DataView(data);
  else
    view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let byteOffset = 0;
  let { encoding } = options;
  if (!encoding) {
    const first = view.getUint8(0);
    const second = view.getUint8(1);
    if (first == 239 && second == 187 && view.getUint8(2) == 191) {
      encoding = UTF_8;
      byteOffset = 3;
    } else if (first == 254 && second == 255) {
      encoding = UTF_16_BE;
      byteOffset = 2;
    } else if (first == 255 && second == 254) {
      encoding = UTF_16_LE;
      byteOffset = 2;
    } else
      encoding = UTF_8;
  }
  if (typeof TextDecoder !== "undefined")
    return new TextDecoder(encoding).decode(view);
  const { byteLength } = view;
  const endian = encoding !== UTF_16_BE;
  let str = "";
  let char;
  while (byteOffset < byteLength) {
    switch (encoding) {
      case UTF_8:
        char = view.getUint8(byteOffset);
        if (char < 128)
          byteOffset++;
        else if (char >= 194 && char <= 223)
          if (byteOffset + 1 < byteLength) {
            const byte2 = view.getUint8(byteOffset + 1);
            if (byte2 >= 128 && byte2 <= 191) {
              char = (char & 31) << 6 | byte2 & 63;
              byteOffset += 2;
            } else
              byteOffset++;
          } else
            byteOffset++;
        else if (char >= 224 && char <= 239)
          if (byteOffset + 2 <= byteLength - 1) {
            const byte2 = view.getUint8(byteOffset + 1);
            const byte3 = view.getUint8(byteOffset + 2);
            if (byte2 >= 128 && byte2 <= 191 && byte3 >= 128 && byte3 <= 191) {
              char = (char & 15) << 12 | (byte2 & 63) << 6 | byte3 & 63;
              byteOffset += 3;
            } else
              byteOffset++;
          } else
            byteOffset++;
        else if (char >= 240 && char <= 244)
          if (byteOffset + 3 <= byteLength - 1) {
            const byte2 = view.getUint8(byteOffset + 1);
            const byte3 = view.getUint8(byteOffset + 2);
            const byte4 = view.getUint8(byteOffset + 3);
            if (byte2 >= 128 && byte2 <= 191 && byte3 >= 128 && byte3 <= 191 && byte4 >= 128 && byte4 <= 191) {
              char = (char & 7) << 18 | (byte2 & 63) << 12 | (byte3 & 63) << 6 | byte4 & 63;
              byteOffset += 4;
            } else
              byteOffset++;
          } else
            byteOffset++;
        else
          byteOffset++;
        break;
      case UTF_16_BE:
      case UTF_16:
      case UTF_16_LE:
        char = view.getUint16(byteOffset, endian);
        byteOffset += 2;
        break;
    }
    str += String.fromCodePoint(char);
  }
  return str;
}
function encodeText(data) {
  return new TextEncoder().encode(data);
}

// ../../../../tmp/moq-dev/node_modules/.bun/@svta+cml-iso-bmff@1.0.1+9bd1190050efe538/node_modules/@svta/cml-iso-bmff/dist/index.js
function createWriterConfig(config2) {
  return { writers: config2?.writers ?? {} };
}
var CONTAINERS = [
  "dinf",
  "edts",
  "grpl",
  "mdia",
  "meco",
  "mfra",
  "minf",
  "moof",
  "moov",
  "mvex",
  "schi",
  "sinf",
  "stbl",
  "strk",
  "traf",
  "trak",
  "tref",
  "udta",
  "vttc"
];
function isContainer(box) {
  return "boxes" in box || CONTAINERS.includes(box.type);
}
var UTF8 = "utf8";
var UINT = "uint";
var TEMPLATE = "template";
var STRING = "string";
var INT = "int";
var DATA = "data";
var IsoBoxWriteView = class {
  constructor(type, size2) {
    this.writeUint = (value, size$1) => {
      const { dataView, cursor } = this;
      switch (size$1) {
        case 1:
          dataView.setUint8(cursor, value);
          break;
        case 2:
          dataView.setUint16(cursor, value);
          break;
        case 3: {
          const s1 = (value & 16776960) >> 8;
          const s2 = value & 255;
          dataView.setUint16(cursor, s1);
          dataView.setUint8(cursor + 2, s2);
          break;
        }
        case 4:
          dataView.setUint32(cursor, value);
          break;
        case 8: {
          const s1 = Math.floor(value / Math.pow(2, 32));
          const s2 = value - s1 * Math.pow(2, 32);
          dataView.setUint32(cursor, s1);
          dataView.setUint32(cursor + 4, s2);
          break;
        }
      }
      this.cursor += size$1;
    };
    this.writeInt = (value, size$1) => {
      const { dataView, cursor } = this;
      switch (size$1) {
        case 1:
          dataView.setInt8(cursor, value);
          break;
        case 2:
          dataView.setInt16(cursor, value);
          break;
        case 4:
          dataView.setInt32(cursor, value);
          break;
        case 8:
          const s1 = Math.floor(value / Math.pow(2, 32));
          const s2 = value - s1 * Math.pow(2, 32);
          dataView.setUint32(cursor, s1);
          dataView.setUint32(cursor + 4, s2);
          break;
      }
      this.cursor += size$1;
    };
    this.writeString = (value) => {
      for (let c = 0, len = value.length;c < len; c++)
        this.writeUint(value.charCodeAt(c), 1);
    };
    this.writeTerminatedString = (value) => {
      if (value.length === 0)
        return;
      for (let c = 0, len = value.length;c < len; c++)
        this.writeUint(value.charCodeAt(c), 1);
      this.writeUint(0, 1);
    };
    this.writeUtf8TerminatedString = (value) => {
      const bytes = encodeText(value);
      new Uint8Array(this.dataView.buffer).set(bytes, this.cursor);
      this.cursor += bytes.length;
      this.writeUint(0, 1);
    };
    this.writeBytes = (data) => {
      if (!Array.isArray(data))
        data = [data];
      for (const bytes of data) {
        new Uint8Array(this.dataView.buffer).set(bytes, this.cursor);
        this.cursor += bytes.length;
      }
    };
    this.writeArray = (data, type$1, size$1, length) => {
      const write = type$1 === UINT ? this.writeUint : type$1 === TEMPLATE ? this.writeTemplate : this.writeInt;
      for (let i = 0;i < length; i++)
        write(data[i] ?? 0, size$1);
    };
    this.writeTemplate = (value, size$1) => {
      const shift = size$1 === 4 ? 16 : 8;
      const fixedPoint = Math.round(value * Math.pow(2, shift));
      this.writeUint(fixedPoint, size$1);
    };
    this.writeBoxHeader = (type$1, size$1) => {
      if (size$1 > 4294967295) {
        this.writeUint(1, 4);
        this.writeString(type$1);
        this.writeUint(size$1, 8);
      } else {
        this.writeUint(size$1, 4);
        this.writeString(type$1);
      }
    };
    this.dataView = new DataView(new ArrayBuffer(size2));
    this.cursor = 0;
    this.writeBoxHeader(type, size2);
  }
  get buffer() {
    return this.dataView.buffer;
  }
  get byteLength() {
    return this.dataView.byteLength;
  }
  get byteOffset() {
    return this.dataView.byteOffset;
  }
  writeFullBox(version2, flags) {
    this.writeUint(version2, 1);
    this.writeUint(flags, 3);
  }
};
function writeBoxes(boxes, config2) {
  return Array.from(boxes, (box) => writeBox(box, config2));
}
function writeChildBoxes(boxes, config2) {
  const bytes = writeBoxes(boxes, config2);
  return {
    bytes,
    size: bytes.reduce((size2, byte) => size2 + byte.byteLength, 0)
  };
}
function writeContainerBox(box, config2) {
  const headerSize = 8;
  const { bytes, size: size2 } = writeChildBoxes(box.boxes, config2);
  const totalSize = headerSize + size2;
  const writer = new IsoBoxWriteView(box.type, totalSize);
  writer.writeBytes(bytes);
  return writer;
}
function writeBox(box, config2) {
  let view = null;
  if ("type" in box) {
    const { type } = box;
    const writer = config2.writers?.[type];
    if (writer)
      view = writer(box, config2);
    else if (isContainer(box))
      view = writeContainerBox(box, config2);
    else if ("view" in box)
      view = box.view;
    if (!view)
      throw new Error(`No writer found for box type: ${type}`);
  }
  if ("buffer" in box)
    view = box;
  if (!view)
    throw new Error("Invalid box");
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
function readData(dataView, offset, size2) {
  const length = size2 > 0 ? size2 : dataView.byteLength - (offset - dataView.byteOffset);
  return new Uint8Array(dataView.buffer, offset, Math.max(length, 0));
}
function readInt(dataView, offset, size2) {
  let result = NaN;
  const cursor = offset - dataView.byteOffset;
  switch (size2) {
    case 1:
      result = dataView.getInt8(cursor);
      break;
    case 2:
      result = dataView.getInt16(cursor);
      break;
    case 4:
      result = dataView.getInt32(cursor);
      break;
    case 8:
      const s1 = dataView.getInt32(cursor);
      const s2 = dataView.getInt32(cursor + 4);
      result = s1 * Math.pow(2, 32) + s2;
      break;
  }
  return result;
}
function readUint(dataView, offset, size2) {
  const cursor = offset - dataView.byteOffset;
  let value = NaN;
  let s1;
  let s2;
  switch (size2) {
    case 1:
      value = dataView.getUint8(cursor);
      break;
    case 2:
      value = dataView.getUint16(cursor);
      break;
    case 3:
      s1 = dataView.getUint16(cursor);
      s2 = dataView.getUint8(cursor + 2);
      value = (s1 << 8) + s2;
      break;
    case 4:
      value = dataView.getUint32(cursor);
      break;
    case 8:
      s1 = dataView.getUint32(cursor);
      s2 = dataView.getUint32(cursor + 4);
      value = s1 * Math.pow(2, 32) + s2;
      break;
  }
  return value;
}
function readString(dataView, offset, length) {
  let str = "";
  for (let c = 0;c < length; c++) {
    const char = readUint(dataView, offset + c, 1);
    str += String.fromCharCode(char);
  }
  return str;
}
function readTemplate(dataView, offset, size2) {
  const half = size2 / 2;
  return readUint(dataView, offset, half) + readUint(dataView, offset + half, half) / Math.pow(2, half);
}
function readTerminatedString(dataView, offset) {
  let str = "";
  let cursor = offset;
  while (cursor - dataView.byteOffset < dataView.byteLength) {
    const char = readUint(dataView, cursor, 1);
    if (char === 0)
      break;
    str += String.fromCharCode(char);
    cursor++;
  }
  return str;
}
function readUtf8String(dataView, offset) {
  const length = dataView.byteLength - (offset - dataView.byteOffset);
  return length > 0 ? decodeText(new DataView(dataView.buffer, offset, length), { encoding: UTF_8 }) : "";
}
function readUtf8TerminatedString(dataView, offset) {
  const length = dataView.byteLength - (offset - dataView.byteOffset);
  let data = "";
  if (length > 0) {
    const view = new DataView(dataView.buffer, offset, length);
    let l = 0;
    for (;l < length; l++)
      if (view.getUint8(l) === 0)
        break;
    data = decodeText(new DataView(dataView.buffer, offset, l), { encoding: UTF_8 });
  }
  return data;
}
var IsoBoxReadView = class IsoBoxReadView2 {
  constructor(raw, config2) {
    this.truncated = false;
    this.slice = (offset, size2) => {
      const isoView = new IsoBoxReadView2(new DataView(this.dataView.buffer, offset, size2), this.config);
      const headerSize = this.offset - offset;
      const bodySize = size2 - headerSize;
      this.offset += bodySize;
      isoView.jump(headerSize);
      return isoView;
    };
    this.read = (type, size2 = 0) => {
      const { dataView, offset } = this;
      let result;
      let cursor = size2;
      switch (type) {
        case UINT:
          result = readUint(dataView, offset, size2);
          break;
        case INT:
          result = readInt(dataView, offset, size2);
          break;
        case TEMPLATE:
          result = readTemplate(dataView, offset, size2);
          break;
        case STRING:
          if (size2 === -1) {
            result = readTerminatedString(dataView, offset);
            cursor = result.length + 1;
          } else
            result = readString(dataView, offset, size2);
          break;
        case DATA:
          result = readData(dataView, offset, size2);
          cursor = result.length;
          break;
        case UTF8:
          if (size2 === -1) {
            result = readUtf8TerminatedString(dataView, offset);
            cursor = result.length + 1;
          } else
            result = readUtf8String(dataView, offset);
          break;
        default:
          result = -1;
      }
      this.offset += cursor;
      return result;
    };
    this.readUint = (size2) => {
      return this.read(UINT, size2);
    };
    this.readInt = (size2) => {
      return this.read(INT, size2);
    };
    this.readString = (size2) => {
      return this.read(STRING, size2);
    };
    this.readTemplate = (size2) => {
      return this.read(TEMPLATE, size2);
    };
    this.readData = (size2) => {
      return this.read(DATA, size2);
    };
    this.readUtf8 = (size2) => {
      return this.read(UTF8, size2);
    };
    this.readFullBox = () => {
      return {
        version: this.readUint(1),
        flags: this.readUint(3)
      };
    };
    this.readArray = (type, size2, length) => {
      const value = [];
      for (let i = 0;i < length; i++)
        value.push(this.read(type, size2));
      return value;
    };
    this.jump = (size2) => {
      this.offset += size2;
    };
    this.readBox = () => {
      const { dataView, offset } = this;
      let cursor = 0;
      const size2 = readUint(dataView, offset, 4);
      const type = readString(dataView, offset + 4, 4);
      const box = {
        size: size2,
        type
      };
      cursor += 8;
      if (box.size === 1) {
        box.largesize = readUint(dataView, offset + cursor, 8);
        cursor += 8;
      }
      const actualSize = box.size === 0 ? this.bytesRemaining : box.largesize ?? box.size;
      if (this.cursor + actualSize > dataView.byteLength) {
        this.truncated = true;
        throw new Error("Truncated box");
      }
      this.jump(cursor);
      if (type === "uuid")
        box.usertype = this.readArray("uint", 1, 16);
      box.view = this.slice(offset, actualSize);
      return box;
    };
    this.readBoxes = (length = -1) => {
      const result = [];
      for (const box of this) {
        result.push(box);
        if (length > 0 && result.length >= length)
          break;
      }
      return result;
    };
    this.readEntries = (length, map) => {
      const result = [];
      for (let i = 0;i < length; i++)
        result.push(map());
      return result;
    };
    this.dataView = isArrayBufferLike(raw) ? new DataView(raw) : raw instanceof DataView ? raw : new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    this.offset = this.dataView.byteOffset;
    this.config = config2 || {};
  }
  get buffer() {
    return this.dataView.buffer;
  }
  get byteOffset() {
    return this.dataView.byteOffset;
  }
  get byteLength() {
    return this.dataView.byteLength;
  }
  get cursor() {
    return this.offset - this.dataView.byteOffset;
  }
  get done() {
    return this.cursor >= this.dataView.byteLength || this.truncated;
  }
  get bytesRemaining() {
    return this.dataView.byteLength - this.cursor;
  }
  *[Symbol.iterator]() {
    const { readers = {} } = this.config;
    while (!this.done)
      try {
        const box = this.readBox();
        const { type, view } = box;
        const parser = readers[type] || readers[type.trim()];
        if (parser)
          Object.assign(box, parser(view, type));
        if (isContainer(box) && !box.boxes) {
          const boxes = [];
          for (const child of view)
            boxes.push(child);
          box.boxes = boxes;
        }
        yield box;
      } catch (error2) {
        if (error2 instanceof Error && error2.message === "Truncated box")
          break;
        throw error2;
      }
  }
};
function readIsoBoxes(raw, config2) {
  const boxes = [];
  for (const box of new IsoBoxReadView(raw, config2))
    boxes.push(box);
  return boxes;
}
function writeIsoBoxes(boxes, config2) {
  return writeBoxes(boxes, createWriterConfig(config2));
}
function readAudioSampleEntryBox(type, view) {
  const { readArray, readUint: readUint$1, readTemplate: readTemplate$1, readBoxes } = view;
  return {
    type,
    reserved1: readArray(UINT, 1, 6),
    dataReferenceIndex: readUint$1(2),
    reserved2: readArray(UINT, 4, 2),
    channelcount: readUint$1(2),
    samplesize: readUint$1(2),
    preDefined: readUint$1(2),
    reserved3: readUint$1(2),
    samplerate: readTemplate$1(4),
    boxes: readBoxes()
  };
}
function readVisualSampleEntryBox(type, view) {
  const { readArray, readUint: readUint$1, readInt: readInt$1, readTemplate: readTemplate$1, readBoxes } = view;
  return {
    type,
    reserved1: readArray(UINT, 1, 6),
    dataReferenceIndex: readUint$1(2),
    preDefined1: readUint$1(2),
    reserved2: readUint$1(2),
    preDefined2: readArray(UINT, 4, 3),
    width: readUint$1(2),
    height: readUint$1(2),
    horizresolution: readTemplate$1(4),
    vertresolution: readTemplate$1(4),
    reserved3: readUint$1(4),
    frameCount: readUint$1(2),
    compressorName: readArray(UINT, 1, 32),
    depth: readUint$1(2),
    preDefined3: readInt$1(2),
    boxes: readBoxes()
  };
}
function readAvc1(view) {
  return readVisualSampleEntryBox("avc1", view);
}
function readHev1(view) {
  return readVisualSampleEntryBox("hev1", view);
}
function readHvc1(view) {
  return readVisualSampleEntryBox("hvc1", view);
}
function readMdat(view) {
  return {
    type: "mdat",
    data: view.readData(-1)
  };
}
function readMdhd(view) {
  const { version: version2, flags } = view.readFullBox();
  const creationTime = view.readUint(version2 == 1 ? 8 : 4);
  const modificationTime = view.readUint(version2 == 1 ? 8 : 4);
  const timescale = view.readUint(4);
  const duration2 = view.readUint(version2 == 1 ? 8 : 4);
  const lang = view.readUint(2);
  return {
    type: "mdhd",
    version: version2,
    flags,
    creationTime,
    modificationTime,
    timescale,
    duration: duration2,
    language: String.fromCharCode((lang >> 10 & 31) + 96, (lang >> 5 & 31) + 96, (lang & 31) + 96),
    preDefined: view.readUint(2)
  };
}
function readMfhd(view) {
  return {
    type: "mfhd",
    ...view.readFullBox(),
    sequenceNumber: view.readUint(4)
  };
}
function readMp4a(view) {
  return readAudioSampleEntryBox("mp4a", view);
}
function readStsd(view) {
  const { version: version2, flags } = view.readFullBox();
  const entryCount = view.readUint(4);
  return {
    type: "stsd",
    version: version2,
    flags,
    entryCount,
    entries: view.readBoxes(entryCount)
  };
}
function readTfdt(view) {
  const { version: version2, flags } = view.readFullBox();
  return {
    type: "tfdt",
    version: version2,
    flags,
    baseMediaDecodeTime: view.readUint(version2 == 1 ? 8 : 4)
  };
}
function readTfhd(view) {
  const { version: version2, flags } = view.readFullBox();
  return {
    type: "tfhd",
    version: version2,
    flags,
    trackId: view.readUint(4),
    baseDataOffset: flags & 1 ? view.readUint(8) : undefined,
    sampleDescriptionIndex: flags & 2 ? view.readUint(4) : undefined,
    defaultSampleDuration: flags & 8 ? view.readUint(4) : undefined,
    defaultSampleSize: flags & 16 ? view.readUint(4) : undefined,
    defaultSampleFlags: flags & 32 ? view.readUint(4) : undefined
  };
}
function readTkhd(view) {
  const { version: version2, flags } = view.readFullBox();
  const size2 = version2 === 1 ? 8 : 4;
  return {
    type: "tkhd",
    version: version2,
    flags,
    creationTime: view.readUint(size2),
    modificationTime: view.readUint(size2),
    trackId: view.readUint(4),
    reserved1: view.readUint(4),
    duration: view.readUint(size2),
    reserved2: view.readArray(UINT, 4, 2),
    layer: view.readUint(2),
    alternateGroup: view.readUint(2),
    volume: view.readTemplate(2),
    reserved3: view.readUint(2),
    matrix: view.readArray(TEMPLATE, 4, 9),
    width: view.readTemplate(4),
    height: view.readTemplate(4)
  };
}
function readTrun(view) {
  const { version: version2, flags } = view.readFullBox();
  const sampleCount = view.readUint(4);
  let dataOffset;
  let firstSampleFlags;
  if (flags & 1)
    dataOffset = view.readInt(4);
  if (flags & 4)
    firstSampleFlags = view.readUint(4);
  const samples = view.readEntries(sampleCount, () => {
    const sample = {};
    if (flags & 256)
      sample.sampleDuration = view.readUint(4);
    if (flags & 512)
      sample.sampleSize = view.readUint(4);
    if (flags & 1024)
      sample.sampleFlags = view.readUint(4);
    if (flags & 2048)
      sample.sampleCompositionTimeOffset = version2 === 1 ? view.readInt(4) : view.readUint(4);
    return sample;
  });
  return {
    type: "trun",
    version: version2,
    flags,
    sampleCount,
    dataOffset,
    firstSampleFlags,
    samples
  };
}
function writeDref(box, config2) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const entryCountSize = 4;
  const entryCount = box.entries.length;
  const { bytes, size: size2 } = writeChildBoxes(box.entries, config2);
  const writer = new IsoBoxWriteView("dref", headerSize + fullBoxSize + entryCountSize + size2);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(entryCount, 4);
  writer.writeBytes(bytes);
  return writer;
}
function writeFtyp(box) {
  const headerSize = 8;
  const majorBrandSize = 4;
  const minorVersionSize = 4;
  const compatibleBrandsSize = box.compatibleBrands.length * 4;
  const writer = new IsoBoxWriteView("ftyp", headerSize + majorBrandSize + minorVersionSize + compatibleBrandsSize);
  writer.writeString(box.majorBrand);
  writer.writeUint(box.minorVersion, 4);
  for (const brand of box.compatibleBrands)
    writer.writeString(brand);
  return writer;
}
function writeHdlr(box) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const preDefinedSize = 4;
  const handlerTypeSize = 4;
  const reservedSize = 12;
  const nameSize = box.name.length + 1;
  const writer = new IsoBoxWriteView("hdlr", headerSize + fullBoxSize + preDefinedSize + handlerTypeSize + reservedSize + nameSize);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.preDefined, 4);
  writer.writeString(box.handlerType);
  writer.writeArray(box.reserved, UINT, 4, 3);
  writer.writeTerminatedString(box.name);
  return writer;
}
function writeMdat(box) {
  const writer = new IsoBoxWriteView("mdat", 8 + box.data.length);
  writer.writeBytes(box.data);
  return writer;
}
function writeMdhd(box) {
  const size2 = box.version === 1 ? 8 : 4;
  const headerSize = 8;
  const fullBoxSize = 4;
  const timesSize = size2 * 3;
  const writer = new IsoBoxWriteView("mdhd", headerSize + fullBoxSize + timesSize + 4 + 2 + 2);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.creationTime, size2);
  writer.writeUint(box.modificationTime, size2);
  writer.writeUint(box.timescale, 4);
  writer.writeUint(box.duration, size2);
  const lang = box.language.length >= 3 ? (box.language.charCodeAt(0) - 96 & 31) << 10 | (box.language.charCodeAt(1) - 96 & 31) << 5 | box.language.charCodeAt(2) - 96 & 31 : 0;
  writer.writeUint(lang, 2);
  writer.writeUint(box.preDefined, 2);
  return writer;
}
function writeMfhd(box) {
  const writer = new IsoBoxWriteView("mfhd", 16);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.sequenceNumber, 4);
  return writer;
}
function writeMvhd(box) {
  const size2 = box.version === 1 ? 8 : 4;
  const headerSize = 8;
  const fullBoxSize = 4;
  const timesSize = size2 * 3;
  const writer = new IsoBoxWriteView("mvhd", headerSize + fullBoxSize + timesSize + 4 + 4 + 2 + 2 + 8 + 36 + 24 + 4);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.creationTime, size2);
  writer.writeUint(box.modificationTime, size2);
  writer.writeUint(box.timescale, 4);
  writer.writeUint(box.duration, size2);
  writer.writeTemplate(box.rate, 4);
  writer.writeTemplate(box.volume, 2);
  writer.writeUint(box.reserved1, 2);
  writer.writeArray(box.reserved2, UINT, 4, 2);
  writer.writeArray(box.matrix, TEMPLATE, 4, 9);
  writer.writeArray(box.preDefined, UINT, 4, 6);
  writer.writeUint(box.nextTrackId, 4);
  return writer;
}
function writeSmhd(box) {
  const writer = new IsoBoxWriteView("smhd", 16);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.balance, 2);
  writer.writeUint(box.reserved, 2);
  return writer;
}
function writeStsd(box, config2) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const entryCountSize = 4;
  const entryCount = box.entries.length;
  const { bytes, size: size2 } = writeChildBoxes(box.entries, config2);
  const writer = new IsoBoxWriteView("stsd", headerSize + fullBoxSize + entryCountSize + size2);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(entryCount, 4);
  writer.writeBytes(bytes);
  return writer;
}
function writeStts(box) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const entryCountSize = 4;
  const entriesSize = box.entryCount * 8;
  const writer = new IsoBoxWriteView("stts", headerSize + fullBoxSize + entryCountSize + entriesSize);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.entryCount, 4);
  for (const entry of box.entries) {
    writer.writeUint(entry.sampleCount, 4);
    writer.writeUint(entry.sampleDelta, 4);
  }
  return writer;
}
function writeTfdt(box) {
  const size2 = box.version === 1 ? 8 : 4;
  const headerSize = 8;
  const fullBoxSize = 4;
  const baseMediaDecodeTimeSize = size2;
  const writer = new IsoBoxWriteView("tfdt", headerSize + fullBoxSize + baseMediaDecodeTimeSize);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.baseMediaDecodeTime, size2);
  return writer;
}
function writeTfhd(box) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const trackIdSize = 4;
  const baseDataOffsetSize = box.flags & 1 ? 8 : 0;
  const sampleDescriptionIndexSize = box.flags & 2 ? 4 : 0;
  const defaultSampleDurationSize = box.flags & 8 ? 4 : 0;
  const defaultSampleSizeSize = box.flags & 16 ? 4 : 0;
  const defaultSampleFlagsSize = box.flags & 32 ? 4 : 0;
  const writer = new IsoBoxWriteView("tfhd", headerSize + fullBoxSize + trackIdSize + baseDataOffsetSize + sampleDescriptionIndexSize + defaultSampleDurationSize + defaultSampleSizeSize + defaultSampleFlagsSize);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.trackId, 4);
  if (box.flags & 1)
    writer.writeUint(box.baseDataOffset ?? 0, 8);
  if (box.flags & 2)
    writer.writeUint(box.sampleDescriptionIndex ?? 0, 4);
  if (box.flags & 8)
    writer.writeUint(box.defaultSampleDuration ?? 0, 4);
  if (box.flags & 16)
    writer.writeUint(box.defaultSampleSize ?? 0, 4);
  if (box.flags & 32)
    writer.writeUint(box.defaultSampleFlags ?? 0, 4);
  return writer;
}
function writeTkhd(box) {
  const size2 = box.version === 1 ? 8 : 4;
  const headerSize = 8;
  const fullBoxSize = 4;
  const timesSize = size2 * 3;
  const writer = new IsoBoxWriteView("tkhd", headerSize + fullBoxSize + timesSize + 4 + 4 + 8 + 2 + 2 + 2 + 2 + 36 + 4 + 4);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.creationTime, size2);
  writer.writeUint(box.modificationTime, size2);
  writer.writeUint(box.trackId, 4);
  writer.writeUint(box.reserved1, 4);
  writer.writeUint(box.duration, size2);
  writer.writeArray(box.reserved2, UINT, 4, 2);
  writer.writeUint(box.layer, 2);
  writer.writeUint(box.alternateGroup, 2);
  writer.writeTemplate(box.volume, 2);
  writer.writeUint(box.reserved3, 2);
  writer.writeArray(box.matrix, TEMPLATE, 4, 9);
  writer.writeTemplate(box.width, 4);
  writer.writeTemplate(box.height, 4);
  return writer;
}
function writeTrex(box) {
  const writer = new IsoBoxWriteView("trex", 32);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.trackId, 4);
  writer.writeUint(box.defaultSampleDescriptionIndex, 4);
  writer.writeUint(box.defaultSampleDuration, 4);
  writer.writeUint(box.defaultSampleSize, 4);
  writer.writeUint(box.defaultSampleFlags, 4);
  return writer;
}
function writeTrun(box) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const sampleCountSize = 4;
  const dataOffsetSize = box.flags & 1 ? 4 : 0;
  const firstSampleFlagsSize = box.flags & 4 ? 4 : 0;
  let sampleSize = 0;
  if (box.flags & 256)
    sampleSize += 4;
  if (box.flags & 512)
    sampleSize += 4;
  if (box.flags & 1024)
    sampleSize += 4;
  if (box.flags & 2048)
    sampleSize += 4;
  const samplesSize = sampleSize * box.sampleCount;
  const writer = new IsoBoxWriteView("trun", headerSize + fullBoxSize + sampleCountSize + dataOffsetSize + firstSampleFlagsSize + samplesSize);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.sampleCount, 4);
  if (box.flags & 1)
    writer.writeUint(box.dataOffset ?? 0, 4);
  if (box.flags & 4)
    writer.writeUint(box.firstSampleFlags ?? 0, 4);
  for (const sample of box.samples) {
    if (box.flags & 256)
      writer.writeUint(sample.sampleDuration ?? 0, 4);
    if (box.flags & 512)
      writer.writeUint(sample.sampleSize ?? 0, 4);
    if (box.flags & 1024)
      writer.writeUint(sample.sampleFlags ?? 0, 4);
    if (box.flags & 2048)
      writer.writeUint(sample.sampleCompositionTimeOffset ?? 0, 4);
  }
  return writer;
}
function writeUrl(box) {
  const headerSize = 8;
  const fullBoxSize = 4;
  const locationSize = box.location.length + 1;
  const writer = new IsoBoxWriteView("url ", headerSize + fullBoxSize + locationSize);
  writer.writeFullBox(box.version, box.flags);
  writer.writeTerminatedString(box.location);
  return writer;
}
function writeVmhd(box) {
  const writer = new IsoBoxWriteView("vmhd", 20);
  writer.writeFullBox(box.version, box.flags);
  writer.writeUint(box.graphicsmode, 2);
  writer.writeArray(box.opcolor, UINT, 2, 3);
  return writer;
}

// ../../../../tmp/moq-dev/js/hang/src/container/cmaf/decode.ts
var INIT_READERS = {
  avc1: readAvc1,
  avc3: readAvc1,
  hvc1: readHvc1,
  hev1: readHev1,
  mp4a: readMp4a,
  stsd: readStsd,
  mdhd: readMdhd,
  tkhd: readTkhd
};
var DATA_READERS = {
  mfhd: readMfhd,
  tfhd: readTfhd,
  tfdt: readTfdt,
  trun: readTrun,
  mdat: readMdat
};
function findBox(boxes, predicate) {
  for (const box of boxes) {
    if (predicate(box)) {
      return box;
    }
    const children = box.boxes;
    if (children && Array.isArray(children)) {
      const found = findBox(children, predicate);
      if (found)
        return found;
    }
  }
  return;
}
function toArrayBuffer(data) {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return buffer;
}
function isBoxType(type) {
  return (box) => box.type === type;
}
function decodeInitSegment(init) {
  const boxes = readIsoBoxes(toArrayBuffer(init), { readers: INIT_READERS });
  const mdhd = findBox(boxes, isBoxType("mdhd"));
  if (!mdhd) {
    throw new Error("No mdhd box found in init segment");
  }
  const tkhd = findBox(boxes, isBoxType("tkhd"));
  const trackId = tkhd?.trackId ?? 1;
  const stsd = findBox(boxes, isBoxType("stsd"));
  if (!stsd?.entries || stsd.entries.length === 0) {
    throw new Error("No stsd box found in init segment");
  }
  const entry = stsd.entries[0];
  const description = extractDescription(entry);
  return {
    description,
    timescale: mdhd.timescale,
    trackId
  };
}
function extractDescription(entry) {
  if (!entry.boxes || !Array.isArray(entry.boxes)) {
    return;
  }
  for (const box of entry.boxes) {
    if (box instanceof Uint8Array) {
      if (box.length > 8) {
        const typeBytes = String.fromCharCode(box[4], box[5], box[6], box[7]);
        if (typeBytes === "avcC" || typeBytes === "hvcC" || typeBytes === "esds" || typeBytes === "dOps") {
          return new Uint8Array(box.slice(8));
        }
      }
      continue;
    }
    const boxType = box.type;
    if (boxType === "avcC" || boxType === "hvcC" || boxType === "esds" || boxType === "dOps") {
      if (box.view) {
        const view = box.view;
        const headerSize = 8;
        const payloadOffset = view.byteOffset + headerSize;
        const payloadLength = box.size - headerSize;
        return new Uint8Array(view.buffer, payloadOffset, payloadLength);
      }
      if (box.data instanceof Uint8Array) {
        return new Uint8Array(box.data);
      }
      if (box.raw instanceof Uint8Array) {
        return new Uint8Array(box.raw.slice(8));
      }
    }
  }
  return;
}
function decodeTimestamp(segment, timescale) {
  const boxes = readIsoBoxes(toArrayBuffer(segment), { readers: DATA_READERS });
  const tfdt = findBox(boxes, isBoxType("tfdt"));
  const baseDecodeTime = tfdt?.baseMediaDecodeTime ?? 0;
  return baseDecodeTime * 1e6 / timescale;
}
function decodeDataSegment(segment, timescale) {
  const boxes = readIsoBoxes(toArrayBuffer(segment), { readers: DATA_READERS });
  const tfdt = findBox(boxes, isBoxType("tfdt"));
  const baseDecodeTime = tfdt?.baseMediaDecodeTime ?? 0;
  const tfhd = findBox(boxes, isBoxType("tfhd"));
  const defaultDuration = tfhd?.defaultSampleDuration ?? 0;
  const defaultSize = tfhd?.defaultSampleSize ?? 0;
  const defaultFlags = tfhd?.defaultSampleFlags ?? 0;
  const trun = findBox(boxes, isBoxType("trun"));
  if (!trun) {
    throw new Error("No trun box found in data segment");
  }
  const mdat = findBox(boxes, isBoxType("mdat"));
  if (!mdat) {
    throw new Error("No mdat box found in data segment");
  }
  const mdatData = mdat.data;
  if (!mdatData) {
    throw new Error("No data in mdat box");
  }
  const samples = [];
  let dataOffset = 0;
  let decodeTime = baseDecodeTime;
  for (let i = 0;i < trun.sampleCount; i++) {
    const sample = trun.samples[i] ?? {};
    const sampleSize = sample.sampleSize ?? defaultSize;
    const sampleDuration = sample.sampleDuration ?? defaultDuration;
    if (sampleSize <= 0) {
      throw new Error(`Invalid sample size ${sampleSize} for sample ${i} in trun`);
    }
    if (sampleDuration <= 0) {
      throw new Error(`Invalid sample duration ${sampleDuration} for sample ${i} in trun`);
    }
    if (dataOffset + sampleSize > mdatData.length) {
      throw new Error(`Sample ${i} would overflow mdat: offset=${dataOffset}, size=${sampleSize}, mdatLength=${mdatData.length}`);
    }
    const sampleFlags = i === 0 && trun.firstSampleFlags !== undefined ? trun.firstSampleFlags : sample.sampleFlags ?? defaultFlags;
    const compositionOffset = sample.sampleCompositionTimeOffset ?? 0;
    const data = new Uint8Array(mdatData.slice(dataOffset, dataOffset + sampleSize));
    dataOffset += sampleSize;
    const pts = decodeTime + compositionOffset;
    const timestamp = Math.round(pts * 1e6 / timescale);
    const keyframe = sampleFlags === 0 || (sampleFlags & 65536) === 0;
    samples.push({
      data,
      timestamp,
      keyframe
    });
    decodeTime += sampleDuration;
  }
  return samples;
}
// ../../../../tmp/moq-dev/js/hang/src/util/hex.ts
function toBytes2(hex) {
  hex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (hex.length % 2) {
    throw new Error("invalid hex string length");
  }
  const matches = hex.match(/.{2}/g);
  if (!matches) {
    throw new Error("invalid hex string format");
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

// ../../../../tmp/moq-dev/js/hang/src/container/cmaf/encode.ts
var IDENTITY_MATRIX = [65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824];
var WRITERS = {
  ftyp: writeFtyp,
  mvhd: writeMvhd,
  tkhd: writeTkhd,
  mdhd: writeMdhd,
  hdlr: writeHdlr,
  vmhd: writeVmhd,
  smhd: writeSmhd,
  "url ": writeUrl,
  dref: writeDref,
  stsd: writeStsd,
  stts: writeStts,
  trex: writeTrex,
  mfhd: writeMfhd,
  tfhd: writeTfhd,
  tfdt: writeTfdt,
  trun: writeTrun,
  mdat: writeMdat
};
function writeBoxes2(boxes) {
  return writeIsoBoxes(boxes, { writers: WRITERS });
}
function createFullBox(type, version2, flags, content) {
  const size2 = 8 + 4 + content.length;
  const box = new Uint8Array(size2);
  const view = new DataView(box.buffer);
  view.setUint32(0, size2, false);
  box[4] = type.charCodeAt(0);
  box[5] = type.charCodeAt(1);
  box[6] = type.charCodeAt(2);
  box[7] = type.charCodeAt(3);
  view.setUint32(8, version2 << 24 | flags, false);
  box.set(content, 12);
  return box;
}
function createEmptyStsc() {
  const content = new Uint8Array(4);
  return createFullBox("stsc", 0, 0, content);
}
function createEmptyStsz() {
  const content = new Uint8Array(8);
  return createFullBox("stsz", 0, 0, content);
}
function createEmptyStco() {
  const content = new Uint8Array(4);
  return createFullBox("stco", 0, 0, content);
}
function createAvc1Box(width, height, avcC) {
  const avcCSize = 8 + avcC.length;
  const avc1ContentSize = 6 + 2 + 2 + 2 + 12 + 2 + 2 + 4 + 4 + 4 + 2 + 32 + 2 + 2 + avcCSize;
  const avc1Size = 8 + avc1ContentSize;
  const box = new Uint8Array(avc1Size);
  const view = new DataView(box.buffer);
  let offset = 0;
  view.setUint32(offset, avc1Size, false);
  offset += 4;
  box[offset++] = 97;
  box[offset++] = 118;
  box[offset++] = 99;
  box[offset++] = 49;
  offset += 6;
  view.setUint16(offset, 1, false);
  offset += 2;
  view.setUint16(offset, 0, false);
  offset += 2;
  view.setUint16(offset, 0, false);
  offset += 2;
  offset += 12;
  view.setUint16(offset, width, false);
  offset += 2;
  view.setUint16(offset, height, false);
  offset += 2;
  view.setUint32(offset, 4718592, false);
  offset += 4;
  view.setUint32(offset, 4718592, false);
  offset += 4;
  view.setUint32(offset, 0, false);
  offset += 4;
  view.setUint16(offset, 1, false);
  offset += 2;
  offset += 32;
  view.setUint16(offset, 24, false);
  offset += 2;
  view.setUint16(offset, 65535, false);
  offset += 2;
  view.setUint32(offset, avcCSize, false);
  offset += 4;
  box[offset++] = 97;
  box[offset++] = 118;
  box[offset++] = 99;
  box[offset++] = 67;
  box.set(avcC, offset);
  return box;
}
function createVideoInitSegment(config2) {
  const { codedWidth, codedHeight, description, container: container2 } = config2;
  if (!codedWidth || !codedHeight || !description) {
    throw new Error("Missing required fields to create video init segment");
  }
  const timescale = container2.kind === "cmaf" ? container2.timescale : 1e6;
  const trackId = container2.kind === "cmaf" ? container2.trackId : 1;
  const ftyp = {
    type: "ftyp",
    majorBrand: "isom",
    minorVersion: 512,
    compatibleBrands: ["isom", "iso6", "mp41"]
  };
  const mvhd = {
    type: "mvhd",
    version: 0,
    flags: 0,
    creationTime: 0,
    modificationTime: 0,
    timescale,
    duration: 0,
    rate: 65536,
    volume: 256,
    reserved1: 0,
    reserved2: [0, 0],
    matrix: IDENTITY_MATRIX,
    preDefined: [0, 0, 0, 0, 0, 0],
    nextTrackId: trackId + 1
  };
  const tkhd = {
    type: "tkhd",
    version: 0,
    flags: 3,
    creationTime: 0,
    modificationTime: 0,
    trackId,
    reserved1: 0,
    duration: 0,
    reserved2: [0, 0],
    layer: 0,
    alternateGroup: 0,
    volume: 0,
    reserved3: 0,
    matrix: IDENTITY_MATRIX,
    width: codedWidth * 65536,
    height: codedHeight * 65536
  };
  const mdhd = {
    type: "mdhd",
    version: 0,
    flags: 0,
    creationTime: 0,
    modificationTime: 0,
    timescale,
    duration: 0,
    language: "und",
    preDefined: 0
  };
  const hdlr = {
    type: "hdlr",
    version: 0,
    flags: 0,
    preDefined: 0,
    handlerType: "vide",
    reserved: [0, 0, 0],
    name: "VideoHandler"
  };
  const vmhd = {
    type: "vmhd",
    version: 0,
    flags: 1,
    graphicsmode: 0,
    opcolor: [0, 0, 0]
  };
  const urlBox = {
    type: "url ",
    version: 0,
    flags: 1,
    location: ""
  };
  const dref = {
    type: "dref",
    version: 0,
    flags: 0,
    entryCount: 1,
    entries: [urlBox]
  };
  const dinf = {
    type: "dinf",
    boxes: [dref]
  };
  const avc1Box = createAvc1Box(codedWidth, codedHeight, toBytes2(description));
  const stsd = {
    type: "stsd",
    version: 0,
    flags: 0,
    entryCount: 1,
    entries: [avc1Box]
  };
  const stts = {
    type: "stts",
    version: 0,
    flags: 0,
    entryCount: 0,
    entries: []
  };
  const stsc = createEmptyStsc();
  const stsz = createEmptyStsz();
  const stco = createEmptyStco();
  const stbl = {
    type: "stbl",
    boxes: [stsd, stts, stsc, stsz, stco]
  };
  const minf = {
    type: "minf",
    boxes: [vmhd, dinf, stbl]
  };
  const mdia = {
    type: "mdia",
    boxes: [mdhd, hdlr, minf]
  };
  const trak = {
    type: "trak",
    boxes: [tkhd, mdia]
  };
  const trex = {
    type: "trex",
    version: 0,
    flags: 0,
    trackId,
    defaultSampleDescriptionIndex: 1,
    defaultSampleDuration: 0,
    defaultSampleSize: 0,
    defaultSampleFlags: 0
  };
  const mvex = {
    type: "mvex",
    boxes: [trex]
  };
  const moov = {
    type: "moov",
    boxes: [mvhd, trak, mvex]
  };
  const buffers = writeBoxes2([ftyp, moov]);
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), offset);
    offset += buf.byteLength;
  }
  return result;
}
function createAudioInitSegment(config2) {
  const { sampleRate, numberOfChannels, description, codec, container: container2 } = config2;
  const timescale = container2.kind === "cmaf" ? container2.timescale : 1e6;
  const trackId = container2.kind === "cmaf" ? container2.trackId : 1;
  const ftyp = {
    type: "ftyp",
    majorBrand: "isom",
    minorVersion: 512,
    compatibleBrands: ["isom", "iso6", "mp41"]
  };
  const mvhd = {
    type: "mvhd",
    version: 0,
    flags: 0,
    creationTime: 0,
    modificationTime: 0,
    timescale,
    duration: 0,
    rate: 65536,
    volume: 256,
    reserved1: 0,
    reserved2: [0, 0],
    matrix: IDENTITY_MATRIX,
    preDefined: [0, 0, 0, 0, 0, 0],
    nextTrackId: trackId + 1
  };
  const tkhd = {
    type: "tkhd",
    version: 0,
    flags: 3,
    creationTime: 0,
    modificationTime: 0,
    trackId,
    reserved1: 0,
    duration: 0,
    reserved2: [0, 0],
    layer: 0,
    alternateGroup: 0,
    volume: 256,
    reserved3: 0,
    matrix: IDENTITY_MATRIX,
    width: 0,
    height: 0
  };
  const mdhd = {
    type: "mdhd",
    version: 0,
    flags: 0,
    creationTime: 0,
    modificationTime: 0,
    timescale,
    duration: 0,
    language: "und",
    preDefined: 0
  };
  const hdlr = {
    type: "hdlr",
    version: 0,
    flags: 0,
    preDefined: 0,
    handlerType: "soun",
    reserved: [0, 0, 0],
    name: "SoundHandler"
  };
  const smhd = {
    type: "smhd",
    version: 0,
    flags: 0,
    balance: 0,
    reserved: 0
  };
  const urlBox = {
    type: "url ",
    version: 0,
    flags: 1,
    location: ""
  };
  const dref = {
    type: "dref",
    version: 0,
    flags: 0,
    entryCount: 1,
    entries: [urlBox]
  };
  const dinf = {
    type: "dinf",
    boxes: [dref]
  };
  const sampleEntry = createAudioSampleEntry(codec, sampleRate, numberOfChannels, description);
  const stsd = {
    type: "stsd",
    version: 0,
    flags: 0,
    entryCount: 1,
    entries: [sampleEntry]
  };
  const stts = {
    type: "stts",
    version: 0,
    flags: 0,
    entryCount: 0,
    entries: []
  };
  const stsc = createEmptyStsc();
  const stsz = createEmptyStsz();
  const stco = createEmptyStco();
  const stbl = {
    type: "stbl",
    boxes: [stsd, stts, stsc, stsz, stco]
  };
  const minf = {
    type: "minf",
    boxes: [smhd, dinf, stbl]
  };
  const mdia = {
    type: "mdia",
    boxes: [mdhd, hdlr, minf]
  };
  const trak = {
    type: "trak",
    boxes: [tkhd, mdia]
  };
  const trex = {
    type: "trex",
    version: 0,
    flags: 0,
    trackId,
    defaultSampleDescriptionIndex: 1,
    defaultSampleDuration: 0,
    defaultSampleSize: 0,
    defaultSampleFlags: 0
  };
  const mvex = {
    type: "mvex",
    boxes: [trex]
  };
  const moov = {
    type: "moov",
    boxes: [mvhd, trak, mvex]
  };
  const buffers = writeBoxes2([ftyp, moov]);
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), offset);
    offset += buf.byteLength;
  }
  return result;
}
function createAudioSampleEntry(codec, sampleRate, channelCount, description) {
  if (codec.startsWith("mp4a")) {
    return createMp4aBox(sampleRate, channelCount, description);
  } else if (codec === "opus") {
    return createOpusBox(sampleRate, channelCount, description);
  }
  throw new Error(`Unsupported audio codec: ${codec}`);
}
function createMp4aBox(sampleRate, channelCount, description) {
  const esds = createEsdsBox(sampleRate, channelCount, description);
  const mp4aContentSize = 6 + 2 + 8 + 2 + 2 + 2 + 2 + 4 + esds.length;
  const mp4aSize = 8 + mp4aContentSize;
  const box = new Uint8Array(mp4aSize);
  const view = new DataView(box.buffer);
  let offset = 0;
  view.setUint32(offset, mp4aSize, false);
  offset += 4;
  box[offset++] = 109;
  box[offset++] = 112;
  box[offset++] = 52;
  box[offset++] = 97;
  offset += 6;
  view.setUint16(offset, 1, false);
  offset += 2;
  offset += 8;
  view.setUint16(offset, channelCount, false);
  offset += 2;
  view.setUint16(offset, 16, false);
  offset += 2;
  view.setUint16(offset, 0, false);
  offset += 2;
  view.setUint16(offset, 0, false);
  offset += 2;
  view.setUint32(offset, sampleRate * 65536, false);
  offset += 4;
  box.set(esds, offset);
  return box;
}
function createOpusBox(sampleRate, channelCount, description) {
  const dOps = createDOpsBox(channelCount, sampleRate, description);
  const opusContentSize = 6 + 2 + 8 + 2 + 2 + 2 + 2 + 4 + dOps.length;
  const opusSize = 8 + opusContentSize;
  const box = new Uint8Array(opusSize);
  const view = new DataView(box.buffer);
  let offset = 0;
  view.setUint32(offset, opusSize, false);
  offset += 4;
  box[offset++] = 79;
  box[offset++] = 112;
  box[offset++] = 117;
  box[offset++] = 115;
  offset += 6;
  view.setUint16(offset, 1, false);
  offset += 2;
  offset += 8;
  view.setUint16(offset, channelCount, false);
  offset += 2;
  view.setUint16(offset, 16, false);
  offset += 2;
  view.setUint16(offset, 0, false);
  offset += 2;
  view.setUint16(offset, 0, false);
  offset += 2;
  view.setUint32(offset, sampleRate * 65536, false);
  offset += 4;
  box.set(dOps, offset);
  return box;
}
function generateAudioSpecificConfig(sampleRate, channelCount) {
  const sampleRateIndex = {
    96000: 0,
    88200: 1,
    64000: 2,
    48000: 3,
    44100: 4,
    32000: 5,
    24000: 6,
    22050: 7,
    16000: 8,
    12000: 9,
    11025: 10,
    8000: 11,
    7350: 12
  };
  const freqIndex = sampleRateIndex[sampleRate] ?? 4;
  const audioObjectType = 2;
  const byte0 = audioObjectType << 3 | freqIndex >> 1;
  const byte1 = (freqIndex & 1) << 7 | channelCount << 3;
  return new Uint8Array([byte0, byte1]);
}
function createEsdsBox(sampleRate, channelCount, description) {
  const audioSpecificConfig = description ? toBytes2(description) : generateAudioSpecificConfig(sampleRate, channelCount);
  const decSpecificInfoSize = audioSpecificConfig.length;
  const decConfigDescSize = 13 + 2 + decSpecificInfoSize;
  const esDescSize = 3 + 2 + decConfigDescSize + 3;
  const esdsSize = 12 + 2 + esDescSize;
  const esds = new Uint8Array(esdsSize);
  const view = new DataView(esds.buffer);
  let offset = 0;
  view.setUint32(offset, esdsSize, false);
  offset += 4;
  esds[offset++] = 101;
  esds[offset++] = 115;
  esds[offset++] = 100;
  esds[offset++] = 115;
  view.setUint32(offset, 0, false);
  offset += 4;
  esds[offset++] = 3;
  esds[offset++] = esDescSize;
  view.setUint16(offset, 0, false);
  offset += 2;
  esds[offset++] = 0;
  esds[offset++] = 4;
  esds[offset++] = decConfigDescSize;
  esds[offset++] = 64;
  esds[offset++] = 21;
  esds[offset++] = 0;
  esds[offset++] = 0;
  esds[offset++] = 0;
  view.setUint32(offset, 0, false);
  offset += 4;
  view.setUint32(offset, 0, false);
  offset += 4;
  esds[offset++] = 5;
  esds[offset++] = decSpecificInfoSize;
  esds.set(audioSpecificConfig, offset);
  offset += decSpecificInfoSize;
  esds[offset++] = 6;
  esds[offset++] = 1;
  esds[offset++] = 2;
  return esds;
}
function createDOpsBox(channelCount, sampleRate, description) {
  if (description) {
    const opusHead = toBytes2(description);
    const dOpsSize2 = 8 + opusHead.length;
    const dOps2 = new Uint8Array(dOpsSize2);
    const view2 = new DataView(dOps2.buffer);
    view2.setUint32(0, dOpsSize2, false);
    dOps2[4] = 100;
    dOps2[5] = 79;
    dOps2[6] = 112;
    dOps2[7] = 115;
    dOps2.set(opusHead, 8);
    return dOps2;
  }
  const dOpsSize = 8 + 11;
  const dOps = new Uint8Array(dOpsSize);
  const view = new DataView(dOps.buffer);
  let offset = 0;
  view.setUint32(offset, dOpsSize, false);
  offset += 4;
  dOps[offset++] = 100;
  dOps[offset++] = 79;
  dOps[offset++] = 112;
  dOps[offset++] = 115;
  dOps[offset++] = 0;
  dOps[offset++] = channelCount;
  view.setUint16(offset, 312, false);
  offset += 2;
  view.setUint32(offset, sampleRate, false);
  offset += 4;
  view.setInt16(offset, 0, false);
  offset += 2;
  dOps[offset++] = 0;
  return dOps;
}
function encodeDataSegment(opts) {
  const { data, timestamp, duration: duration2, keyframe, sequence, trackId = 1 } = opts;
  const sampleFlags = keyframe ? 33554432 : 16842752;
  const mfhd = {
    type: "mfhd",
    version: 0,
    flags: 0,
    sequenceNumber: sequence
  };
  const tfhd = {
    type: "tfhd",
    version: 0,
    flags: 131072,
    trackId
  };
  const tfdt = {
    type: "tfdt",
    version: 1,
    flags: 0,
    baseMediaDecodeTime: timestamp
  };
  const trun = {
    type: "trun",
    version: 0,
    flags: 1 | 256 | 512 | 1024,
    sampleCount: 1,
    dataOffset: 0,
    samples: [
      {
        sampleDuration: duration2,
        sampleSize: data.byteLength,
        sampleFlags
      }
    ]
  };
  const traf = {
    type: "traf",
    boxes: [tfhd, tfdt, trun]
  };
  const moof = {
    type: "moof",
    boxes: [mfhd, traf]
  };
  const moofBuffers = writeBoxes2([moof]);
  let moofSize = 0;
  for (const buf of moofBuffers) {
    moofSize += buf.byteLength;
  }
  trun.dataOffset = moofSize + 8;
  const moofBuffersFinal = writeBoxes2([moof]);
  moofSize = 0;
  for (const buf of moofBuffersFinal) {
    moofSize += buf.byteLength;
  }
  const mdatBuffer = new ArrayBuffer(data.byteLength);
  const mdatData = new Uint8Array(mdatBuffer);
  mdatData.set(data);
  const mdat = {
    type: "mdat",
    data: mdatData
  };
  const mdatBuffers = writeBoxes2([mdat]);
  let mdatSize = 0;
  for (const buf of mdatBuffers) {
    mdatSize += buf.byteLength;
  }
  const result = new Uint8Array(moofSize + mdatSize);
  let offset = 0;
  for (const buf of moofBuffersFinal) {
    result.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), offset);
    offset += buf.byteLength;
  }
  for (const buf of mdatBuffers) {
    result.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), offset);
    offset += buf.byteLength;
  }
  return result;
}
// ../../../../tmp/moq-dev/js/hang/src/container/legacy.ts
var exports_legacy = {};
__export(exports_legacy, {
  Producer: () => Producer,
  Consumer: () => Consumer
});
class Producer {
  #track;
  #group;
  constructor(track3) {
    this.#track = track3;
  }
  encode(data, timestamp, keyframe) {
    if (keyframe) {
      this.#group?.close();
      this.#group = this.#track.appendGroup();
    } else if (!this.#group) {
      throw new Error("must start with a keyframe");
    }
    this.#group?.writeFrame(Producer.#encode(data, timestamp));
  }
  static #encode(source, timestamp) {
    const timestampBytes = exports_varint.encode(timestamp);
    const payloadSize = source instanceof Uint8Array ? source.byteLength : source.byteLength;
    const data = new Uint8Array(timestampBytes.byteLength + payloadSize);
    data.set(timestampBytes, 0);
    if (source instanceof Uint8Array) {
      data.set(source, timestampBytes.byteLength);
    } else {
      source.copyTo(data.subarray(timestampBytes.byteLength));
    }
    return data;
  }
  close(err) {
    this.#track.close(err);
    this.#group?.close();
  }
}

class Consumer {
  #track;
  #latency;
  #groups = [];
  #active;
  #notify;
  #buffered = new Signal([]);
  buffered = this.#buffered;
  #signals = new Effect;
  constructor(track3, props) {
    this.#track = track3;
    this.#latency = Signal.from(props?.latency ?? exports_time.Milli.zero);
    this.#signals.spawn(this.#run.bind(this));
    this.#signals.cleanup(() => {
      this.#track.close();
      for (const group2 of this.#groups) {
        group2.consumer.close();
      }
      this.#groups.length = 0;
    });
  }
  async#run() {
    for (;; ) {
      const consumer = await this.#track.recvGroup();
      if (!consumer)
        break;
      if (this.#active === undefined) {
        this.#active = consumer.sequence;
      }
      if (consumer.sequence < this.#active) {
        console.warn(`skipping old group: ${consumer.sequence} < ${this.#active}`);
        consumer.close();
        continue;
      }
      const group2 = {
        consumer,
        frames: []
      };
      this.#groups.push(group2);
      this.#groups.sort((a, b) => a.consumer.sequence - b.consumer.sequence);
      this.#signals.spawn(this.#runGroup.bind(this, group2));
    }
  }
  async#runGroup(group2) {
    try {
      let keyframe = true;
      for (;; ) {
        const next = await group2.consumer.readFrame();
        if (!next)
          break;
        const { data, timestamp } = Consumer.#decode(next);
        const frame = {
          data,
          timestamp,
          keyframe
        };
        keyframe = false;
        group2.frames.push(frame);
        if (group2.latest === undefined || timestamp > group2.latest) {
          group2.latest = timestamp;
        }
        this.#updateBuffered();
        if (group2.consumer.sequence === this.#active) {
          this.#notify?.();
          this.#notify = undefined;
        } else {
          this.#checkLatency();
        }
      }
    } catch (_err) {} finally {
      group2.done = true;
      if (group2.consumer.sequence === this.#active) {
        this.#active += 1;
      }
      this.#updateBuffered();
      this.#notify?.();
      this.#notify = undefined;
      group2.consumer.close();
    }
  }
  #checkLatency() {
    if (this.#active === undefined)
      return;
    let skipped = false;
    while (this.#groups.length >= 2) {
      const threshold = exports_time.Micro.fromMilli(this.#latency.peek());
      let min;
      let max;
      for (const group2 of this.#groups) {
        if (group2.latest === undefined)
          continue;
        const frame = group2.frames.at(0)?.timestamp ?? group2.latest;
        if (min === undefined || frame < min)
          min = frame;
        if (max === undefined || group2.latest > max)
          max = group2.latest;
      }
      if (min === undefined || max === undefined)
        break;
      const latency = max - min;
      if (latency <= threshold)
        break;
      const first = this.#groups.shift();
      if (!first)
        break;
      this.#active = this.#groups[0]?.consumer.sequence;
      console.warn(`skipping slow group: ${first.consumer.sequence} -> ${this.#active}`);
      first.consumer.close();
      first.frames.length = 0;
      skipped = true;
    }
    if (skipped) {
      this.#updateBuffered();
      this.#notify?.();
      this.#notify = undefined;
    }
  }
  async next() {
    for (;; ) {
      if (this.#groups.length > 0 && this.#active !== undefined && this.#groups[0].consumer.sequence <= this.#active) {
        const frame = this.#groups[0].frames.shift();
        if (frame) {
          this.#updateBuffered();
          return { frame, group: this.#groups[0].consumer.sequence };
        }
        if (this.#active > this.#groups[0].consumer.sequence || this.#groups[0].done) {
          if (this.#groups[0].consumer.sequence === this.#active) {
            this.#active += 1;
          }
          const group2 = this.#groups.shift();
          if (group2) {
            this.#updateBuffered();
            return { frame: undefined, group: group2.consumer.sequence };
          }
        }
      }
      if (this.#notify) {
        throw new Error("multiple calls to decode not supported");
      }
      const wait = new Promise((resolve) => {
        this.#notify = resolve;
      }).then(() => true);
      if (!await Promise.race([wait, this.#signals.closed])) {
        this.#notify = undefined;
        return;
      }
    }
  }
  static #decode(buffer) {
    const [timestamp, data] = exports_varint.decode(buffer);
    return { timestamp, data };
  }
  #updateBuffered() {
    const ranges = [];
    let prev;
    for (const group2 of this.#groups) {
      const first = group2.frames.at(0);
      if (!first || group2.latest === undefined)
        continue;
      const start = exports_time.Milli.fromMicro(first.timestamp);
      const end = exports_time.Milli.fromMicro(group2.latest);
      const last = ranges.at(-1);
      const contiguous = prev?.done && prev.consumer.sequence + 1 === group2.consumer.sequence;
      if (last && (last.end >= start || contiguous)) {
        last.end = exports_time.Milli.max(last.end, end);
      } else {
        ranges.push({ start, end });
      }
      prev = group2;
    }
    this.#buffered.set(ranges);
  }
  close() {
    this.#signals.close();
    for (const group2 of this.#groups) {
      group2.consumer.close();
      group2.frames.length = 0;
    }
    this.#groups.length = 0;
  }
}
export {
  exports_src3 as Moq
};
