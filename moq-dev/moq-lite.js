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

// js/lite/src/path.ts
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

// js/lite/src/ietf/version.ts
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

// js/lite/src/varint.ts
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

// js/lite/src/stream.ts
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

// js/lite/src/ietf/namespace.ts
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

// js/lite/src/ietf/message.ts
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

// js/lite/src/ietf/parameters.ts
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

// js/lite/src/ietf/properties.ts
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

// js/lite/src/ietf/publish_namespace.ts
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

// js/lite/src/ietf/subscribe.ts
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

// js/lite/src/index.ts
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

// js/signals/src/index.ts
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
// js/lite/src/announced.ts
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
// js/lite/src/bandwidth.ts
function createBandwidth() {
  return new Signal(undefined);
}
// js/lite/src/group.ts
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

// js/lite/src/track.ts
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

// js/lite/src/broadcast.ts
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
// js/lite/src/connection/index.ts
var exports_connection = {};
__export(exports_connection, {
  connect: () => connect,
  accept: () => accept,
  Reload: () => Reload
});

// node_modules/.bun/async-mutex@0.5.0/node_modules/async-mutex/index.mjs
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

// js/lite/src/ietf/adapter.ts
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

// js/lite/src/ietf/connection.ts
init_stream();

// js/lite/src/ietf/goaway.ts
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

// js/lite/src/ietf/object.ts
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

// js/lite/src/ietf/publish.ts
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

// js/lite/src/ietf/connection.ts
init_publish_namespace();

// js/lite/src/ietf/publisher.ts
init_stream();

// js/lite/src/util/error.ts
function error(err) {
  return err instanceof Error ? err : new Error(String(err));
}

// js/lite/src/ietf/publisher.ts
init_publish_namespace();

// js/lite/src/ietf/request.ts
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

// js/lite/src/ietf/publisher.ts
init_subscribe();

// js/lite/src/ietf/subscribe_namespace.ts
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

// js/lite/src/ietf/track.ts
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

// js/lite/src/ietf/publisher.ts
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

// js/lite/src/ietf/connection.ts
init_subscribe();
// js/lite/src/ietf/subscriber.ts
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

// js/lite/src/ietf/connection.ts
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

// js/lite/src/ietf/setup.ts
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
// js/lite/src/lite/message.ts
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

// node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/core.js
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
var globalConfig = {};
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}

// node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/util.js
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
var propertyKeyTypes = new Set(["string", "number", "symbol"]);
var primitiveTypes = new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
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

// node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/errors.js
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

// node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/parse.js
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

// node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/regexes.js
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
var bigint = /^-?\d+n?$/;

// node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/checks.js
var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a = inst._zod).onattach ?? (_a.onattach = []);
});

// node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 3,
  patch: 6
};

// node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/schemas.js
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

// node_modules/.bun/zod@4.3.6/node_modules/zod/v4/core/api.js
function _bigint(Class, params) {
  return new Class({
    type: "bigint",
    ...normalizeParams(params)
  });
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
// node_modules/.bun/zod@4.3.6/node_modules/zod/v4/mini/schemas.js
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
var ZodMiniBigInt = /* @__PURE__ */ $constructor("ZodMiniBigInt", (inst, def) => {
  $ZodBigInt.init(inst, def);
  ZodMiniType.init(inst, def);
});
function bigint2(params) {
  return _bigint(ZodMiniBigInt, params);
}
var ZodMiniCustom = /* @__PURE__ */ $constructor("ZodMiniCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodMiniType.init(inst, def);
});
function refine(fn, _params = {}) {
  return _refine(ZodMiniCustom, fn, _params);
}

// js/lite/src/lite/origin.ts
var OriginSchema = bigint2().check(refine((value) => value >= 0n && value < 1n << 62n, "Origin must be a non-negative 62-bit integer")).brand("Origin");
function randomOrigin() {
  const buf = new BigUint64Array(1);
  crypto.getRandomValues(buf);
  const raw = buf[0] & 0x3fff_ffff_ffff_ffffn;
  return OriginSchema.parse(raw === 0n ? 1n : raw);
}

// js/lite/src/lite/version.ts
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

// js/lite/src/lite/announce.ts
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

// js/lite/src/lite/connection.ts
init_stream();

// js/lite/src/lite/goaway.ts
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

// js/lite/src/lite/group.ts
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

// js/lite/src/lite/publisher.ts
init_stream();

// js/lite/src/lite/probe.ts
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
// js/lite/src/lite/subscribe.ts
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

// js/lite/src/lite/publisher.ts
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

// js/lite/src/lite/session.ts
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

// js/lite/src/lite/stream.ts
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

// js/lite/src/lite/subscriber.ts
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

// js/lite/src/lite/connection.ts
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

// js/lite/src/connection/accept.ts
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
// node_modules/.bun/@moq+qmux@0.0.6/node_modules/@moq/qmux/credit.js
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

// node_modules/.bun/@moq+qmux@0.0.6/node_modules/@moq/qmux/varint.js
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

// node_modules/.bun/@moq+qmux@0.0.6/node_modules/@moq/qmux/stream.js
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

// node_modules/.bun/@moq+qmux@0.0.6/node_modules/@moq/qmux/frame.js
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

// node_modules/.bun/@moq+qmux@0.0.6/node_modules/@moq/qmux/session.js
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

// node_modules/.bun/@moq+qmux@0.0.6/node_modules/@moq/qmux/index.js
var qmux_default = Session;

// js/lite/src/connection/connect.ts
init_stream();

// js/lite/src/util/hex.ts
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

// js/lite/src/connection/connect.ts
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
// js/lite/src/connection/reload.ts
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
// js/lite/src/time.ts
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

// js/lite/src/index.ts
init_varint();
export {
  exports_src2 as Moq
};
