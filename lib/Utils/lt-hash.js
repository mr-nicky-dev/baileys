"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LT_HASH_ANTI_TAMPERING = void 0;
const crypto_1 = require("./crypto.js");
/**
 * LT Hash is a summation based hash algorithm that maintains the integrity of a piece of data
 * over a series of mutations. You can add/remove mutations and it'll return a hash equal to
 * if the same series of mutations was made sequentially.
 */
const LT_HASH_ANTI_TAMPERING_LENGTH = 128;
class LTHash {
    constructor(salt) {
        this.salt = salt;
    }
    add(e, t) {
        for (const item of t) {
            e = this._addSingle(e, item);
        }
        return e;
    }
    subtract(e, t) {
        for (const item of t) {
            e = this._subtractSingle(e, item);
        }
        return e;
    }
    subtractThenAdd(e, toSubtract, toAdd) {
        return this.add(this.subtract(e, toSubtract), toAdd);
    }
    _addSingle(e, t) {
        const n = new Uint8Array((0, crypto_1.hkdf)(Buffer.from(t), LT_HASH_ANTI_TAMPERING_LENGTH, { info: this.salt }));
        return this.performPointwiseWithOverflow(e, n, (e1, t1) => e1 + t1);
    }
    _subtractSingle(e, t) {
        const n = new Uint8Array((0, crypto_1.hkdf)(Buffer.from(t), LT_HASH_ANTI_TAMPERING_LENGTH, { info: this.salt }));
        return this.performPointwiseWithOverflow(e, n, (e1, t1) => e1 - t1);
    }
    performPointwiseWithOverflow(e, t, r) {
        const bufOf = (x) => x instanceof ArrayBuffer ? x : x.buffer instanceof ArrayBuffer ? x.buffer : new Uint8Array(x).buffer;
        const n = new DataView(bufOf(e)), i = new DataView(bufOf(t)), a = new ArrayBuffer(n.byteLength), s = new DataView(a);
        for (let e1 = 0; e1 < n.byteLength; e1 += 2) {
            s.setUint16(e1, r(n.getUint16(e1, true), i.getUint16(e1, true)), true);
        }
        return a;
    }
}
exports.LT_HASH_ANTI_TAMPERING = new LTHash('WhatsApp Patch Integrity');
