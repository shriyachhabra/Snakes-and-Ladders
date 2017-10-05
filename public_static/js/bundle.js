(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr((len * 3 / 4) - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0; i < l; i += 4) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value)) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (isArrayBufferView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (isArrayBufferView(string) || isArrayBuffer(string)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
  return obj instanceof ArrayBuffer ||
    (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
      typeof obj.byteLength === 'number')
}

// Node 0.10 supports `ArrayBuffer` but lacks `ArrayBuffer.isView`
function isArrayBufferView (obj) {
  return (typeof ArrayBuffer.isView === 'function') && ArrayBuffer.isView(obj)
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":1,"ieee754":7}],4:[function(require,module,exports){
module.exports = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Unordered Collection",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "451": "Unavailable For Legal Reasons",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
  "511": "Network Authentication Required"
}

},{}],5:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":require("../../is-buffer/index.js")})
},{"../../is-buffer/index.js":9}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],7:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],8:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],9:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],10:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],11:[function(require,module,exports){
(function (process){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = nextTick;
} else {
  module.exports = process.nextTick;
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}

}).call(this,require('_process'))
},{"_process":12}],12:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],13:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],14:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],15:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],16:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":14,"./encode":15}],17:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  processNextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

Duplex.prototype._destroy = function (err, cb) {
  this.push(null);
  this.end();

  processNextTick(cb, err);
};

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}
},{"./_stream_readable":19,"./_stream_writable":21,"core-util-is":5,"inherits":8,"process-nextick-args":11}],18:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":20,"core-util-is":5,"inherits":8}],19:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var processNextTick = require('process-nextick-args');
/*</replacement>*/

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

// TODO(bmeurer): Change this back to const once hole checks are
// properly optimized away early in Ignition+TurboFan.
/*<replacement>*/
var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/BufferList');
var destroyImpl = require('./internal/streams/destroy');
var StringDecoder;

util.inherits(Readable, Stream);

var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') {
    return emitter.prependListener(event, fn);
  } else {
    // This is a hack to make sure that our error handler is attached before any
    // userland ones.  NEVER DO THIS. This is here only because this code needs
    // to continue to work with older versions of Node.js that do not include
    // the prependListener() method. The goal is to eventually remove this hack.
    if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
  }
}

function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});

Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  this.push(null);
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      stream.emit('error', er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) stream.emit('error', new Error('stream.unshift() after end event'));else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        stream.emit('error', new Error('stream.push() after EOF'));
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
    }
  }

  return needMoreData(state);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    stream.emit('data', chunk);
    stream.read(0);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    processNextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('_read() is not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = { hasUnpiped: false };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, unpipeInfo);
    }return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;

  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this, unpipeInfo);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        processNextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    processNextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], self.emit.bind(self, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = Buffer.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    processNextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":17,"./internal/streams/BufferList":22,"./internal/streams/destroy":23,"./internal/streams/stream":24,"_process":12,"core-util-is":5,"events":6,"inherits":8,"isarray":10,"process-nextick-args":11,"safe-buffer":26,"string_decoder/":31,"util":2}],20:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function TransformState(stream) {
  this.afterTransform = function (er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
  this.writeencoding = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) {
    return stream.emit('error', new Error('write callback called multiple times'));
  }

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined) stream.push(data);

  cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(this);

  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.once('prefinish', function () {
    if (typeof this._flush === 'function') this._flush(function (er, data) {
      done(stream, er, data);
    });else done(stream);
  });
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('_transform() is not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  var _this = this;

  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
    _this.emit('close');
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);

  if (data !== null && data !== undefined) stream.push(data);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length) throw new Error('Calling transform done when ws.length != 0');

  if (ts.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":17,"core-util-is":5,"inherits":8}],21:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

/*<replacement>*/

var processNextTick = require('process-nextick-args');
/*</replacement>*/

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/
var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
/*</replacement>*/

var destroyImpl = require('./internal/streams/destroy');

util.inherits(Writable, Stream);

function nop() {}

function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function (object) {
      if (realHasInstance.call(this, object)) return true;

      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function (object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
    return new Writable(options);
  }

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;

    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  processNextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;

  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    processNextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = _isUint8Array(chunk) && !state.objectMode;

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    processNextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    processNextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequestCount = 0;
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('_write() is not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      stream.emit('error', err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function') {
      state.pendingcb++;
      state.finalCalled = true;
      processNextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) processNextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }
  if (state.corkedRequestsFree) {
    state.corkedRequestsFree.next = corkReq;
  } else {
    state.corkedRequestsFree = corkReq;
  }
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  get: function () {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});

Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  this.end();
  cb(err);
};
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":17,"./internal/streams/destroy":23,"./internal/streams/stream":24,"_process":12,"core-util-is":5,"inherits":8,"process-nextick-args":11,"safe-buffer":26,"util-deprecate":35}],22:[function(require,module,exports){
'use strict';

/*<replacement>*/

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Buffer = require('safe-buffer').Buffer;
/*</replacement>*/

function copyBuffer(src, target, offset) {
  src.copy(target, offset);
}

module.exports = function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  BufferList.prototype.push = function push(v) {
    var entry = { data: v, next: null };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  BufferList.prototype.unshift = function unshift(v) {
    var entry = { data: v, next: this.head };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  BufferList.prototype.shift = function shift() {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  BufferList.prototype.clear = function clear() {
    this.head = this.tail = null;
    this.length = 0;
  };

  BufferList.prototype.join = function join(s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;
    while (p = p.next) {
      ret += s + p.data;
    }return ret;
  };

  BufferList.prototype.concat = function concat(n) {
    if (this.length === 0) return Buffer.alloc(0);
    if (this.length === 1) return this.head.data;
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;
    while (p) {
      copyBuffer(p.data, ret, i);
      i += p.data.length;
      p = p.next;
    }
    return ret;
  };

  return BufferList;
}();
},{"safe-buffer":26}],23:[function(require,module,exports){
'use strict';

/*<replacement>*/

var processNextTick = require('process-nextick-args');
/*</replacement>*/

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
      processNextTick(emitErrorNT, this, err);
    }
    return;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      processNextTick(emitErrorNT, _this, err);
      if (_this._writableState) {
        _this._writableState.errorEmitted = true;
      }
    } else if (cb) {
      cb(err);
    }
  });
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy
};
},{"process-nextick-args":11}],24:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":6}],25:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":17,"./lib/_stream_passthrough.js":18,"./lib/_stream_readable.js":19,"./lib/_stream_transform.js":20,"./lib/_stream_writable.js":21}],26:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":3}],27:[function(require,module,exports){
(function (global){
var ClientRequest = require('./lib/request')
var extend = require('xtend')
var statusCodes = require('builtin-status-codes')
var url = require('url')

var http = exports

http.request = function (opts, cb) {
	if (typeof opts === 'string')
		opts = url.parse(opts)
	else
		opts = extend(opts)

	// Normally, the page is loaded from http or https, so not specifying a protocol
	// will result in a (valid) protocol-relative url. However, this won't work if
	// the protocol is something else, like 'file:'
	var defaultProtocol = global.location.protocol.search(/^https?:$/) === -1 ? 'http:' : ''

	var protocol = opts.protocol || defaultProtocol
	var host = opts.hostname || opts.host
	var port = opts.port
	var path = opts.path || '/'

	// Necessary for IPv6 addresses
	if (host && host.indexOf(':') !== -1)
		host = '[' + host + ']'

	// This may be a relative url. The browser should always be able to interpret it correctly.
	opts.url = (host ? (protocol + '//' + host) : '') + (port ? ':' + port : '') + path
	opts.method = (opts.method || 'GET').toUpperCase()
	opts.headers = opts.headers || {}

	// Also valid opts.auth, opts.mode

	var req = new ClientRequest(opts)
	if (cb)
		req.on('response', cb)
	return req
}

http.get = function get (opts, cb) {
	var req = http.request(opts, cb)
	req.end()
	return req
}

http.Agent = function () {}
http.Agent.defaultMaxSockets = 4

http.STATUS_CODES = statusCodes

http.METHODS = [
	'CHECKOUT',
	'CONNECT',
	'COPY',
	'DELETE',
	'GET',
	'HEAD',
	'LOCK',
	'M-SEARCH',
	'MERGE',
	'MKACTIVITY',
	'MKCOL',
	'MOVE',
	'NOTIFY',
	'OPTIONS',
	'PATCH',
	'POST',
	'PROPFIND',
	'PROPPATCH',
	'PURGE',
	'PUT',
	'REPORT',
	'SEARCH',
	'SUBSCRIBE',
	'TRACE',
	'UNLOCK',
	'UNSUBSCRIBE'
]
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./lib/request":29,"builtin-status-codes":4,"url":33,"xtend":36}],28:[function(require,module,exports){
(function (global){
exports.fetch = isFunction(global.fetch) && isFunction(global.ReadableStream)

exports.blobConstructor = false
try {
	new Blob([new ArrayBuffer(1)])
	exports.blobConstructor = true
} catch (e) {}

// The xhr request to example.com may violate some restrictive CSP configurations,
// so if we're running in a browser that supports `fetch`, avoid calling getXHR()
// and assume support for certain features below.
var xhr
function getXHR () {
	// Cache the xhr value
	if (xhr !== undefined) return xhr

	if (global.XMLHttpRequest) {
		xhr = new global.XMLHttpRequest()
		// If XDomainRequest is available (ie only, where xhr might not work
		// cross domain), use the page location. Otherwise use example.com
		// Note: this doesn't actually make an http request.
		try {
			xhr.open('GET', global.XDomainRequest ? '/' : 'https://example.com')
		} catch(e) {
			xhr = null
		}
	} else {
		// Service workers don't have XHR
		xhr = null
	}
	return xhr
}

function checkTypeSupport (type) {
	var xhr = getXHR()
	if (!xhr) return false
	try {
		xhr.responseType = type
		return xhr.responseType === type
	} catch (e) {}
	return false
}

// For some strange reason, Safari 7.0 reports typeof global.ArrayBuffer === 'object'.
// Safari 7.1 appears to have fixed this bug.
var haveArrayBuffer = typeof global.ArrayBuffer !== 'undefined'
var haveSlice = haveArrayBuffer && isFunction(global.ArrayBuffer.prototype.slice)

// If fetch is supported, then arraybuffer will be supported too. Skip calling
// checkTypeSupport(), since that calls getXHR().
exports.arraybuffer = exports.fetch || (haveArrayBuffer && checkTypeSupport('arraybuffer'))

// These next two tests unavoidably show warnings in Chrome. Since fetch will always
// be used if it's available, just return false for these to avoid the warnings.
exports.msstream = !exports.fetch && haveSlice && checkTypeSupport('ms-stream')
exports.mozchunkedarraybuffer = !exports.fetch && haveArrayBuffer &&
	checkTypeSupport('moz-chunked-arraybuffer')

// If fetch is supported, then overrideMimeType will be supported too. Skip calling
// getXHR().
exports.overrideMimeType = exports.fetch || (getXHR() ? isFunction(getXHR().overrideMimeType) : false)

exports.vbArray = isFunction(global.VBArray)

function isFunction (value) {
	return typeof value === 'function'
}

xhr = null // Help gc

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],29:[function(require,module,exports){
(function (process,global,Buffer){
var capability = require('./capability')
var inherits = require('inherits')
var response = require('./response')
var stream = require('readable-stream')
var toArrayBuffer = require('to-arraybuffer')

var IncomingMessage = response.IncomingMessage
var rStates = response.readyStates

function decideMode (preferBinary, useFetch) {
	if (capability.fetch && useFetch) {
		return 'fetch'
	} else if (capability.mozchunkedarraybuffer) {
		return 'moz-chunked-arraybuffer'
	} else if (capability.msstream) {
		return 'ms-stream'
	} else if (capability.arraybuffer && preferBinary) {
		return 'arraybuffer'
	} else if (capability.vbArray && preferBinary) {
		return 'text:vbarray'
	} else {
		return 'text'
	}
}

var ClientRequest = module.exports = function (opts) {
	var self = this
	stream.Writable.call(self)

	self._opts = opts
	self._body = []
	self._headers = {}
	if (opts.auth)
		self.setHeader('Authorization', 'Basic ' + new Buffer(opts.auth).toString('base64'))
	Object.keys(opts.headers).forEach(function (name) {
		self.setHeader(name, opts.headers[name])
	})

	var preferBinary
	var useFetch = true
	if (opts.mode === 'disable-fetch' || 'timeout' in opts) {
		// If the use of XHR should be preferred and includes preserving the 'content-type' header.
		// Force XHR to be used since the Fetch API does not yet support timeouts.
		useFetch = false
		preferBinary = true
	} else if (opts.mode === 'prefer-streaming') {
		// If streaming is a high priority but binary compatibility and
		// the accuracy of the 'content-type' header aren't
		preferBinary = false
	} else if (opts.mode === 'allow-wrong-content-type') {
		// If streaming is more important than preserving the 'content-type' header
		preferBinary = !capability.overrideMimeType
	} else if (!opts.mode || opts.mode === 'default' || opts.mode === 'prefer-fast') {
		// Use binary if text streaming may corrupt data or the content-type header, or for speed
		preferBinary = true
	} else {
		throw new Error('Invalid value for opts.mode')
	}
	self._mode = decideMode(preferBinary, useFetch)

	self.on('finish', function () {
		self._onFinish()
	})
}

inherits(ClientRequest, stream.Writable)

ClientRequest.prototype.setHeader = function (name, value) {
	var self = this
	var lowerName = name.toLowerCase()
	// This check is not necessary, but it prevents warnings from browsers about setting unsafe
	// headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
	// http-browserify did it, so I will too.
	if (unsafeHeaders.indexOf(lowerName) !== -1)
		return

	self._headers[lowerName] = {
		name: name,
		value: value
	}
}

ClientRequest.prototype.getHeader = function (name) {
	var header = this._headers[name.toLowerCase()]
	if (header)
		return header.value
	return null
}

ClientRequest.prototype.removeHeader = function (name) {
	var self = this
	delete self._headers[name.toLowerCase()]
}

ClientRequest.prototype._onFinish = function () {
	var self = this

	if (self._destroyed)
		return
	var opts = self._opts

	var headersObj = self._headers
	var body = null
	if (opts.method !== 'GET' && opts.method !== 'HEAD') {
		if (capability.blobConstructor) {
			body = new global.Blob(self._body.map(function (buffer) {
				return toArrayBuffer(buffer)
			}), {
				type: (headersObj['content-type'] || {}).value || ''
			})
		} else {
			// get utf8 string
			body = Buffer.concat(self._body).toString()
		}
	}

	// create flattened list of headers
	var headersList = []
	Object.keys(headersObj).forEach(function (keyName) {
		var name = headersObj[keyName].name
		var value = headersObj[keyName].value
		if (Array.isArray(value)) {
			value.forEach(function (v) {
				headersList.push([name, v])
			})
		} else {
			headersList.push([name, value])
		}
	})

	if (self._mode === 'fetch') {
		global.fetch(self._opts.url, {
			method: self._opts.method,
			headers: headersList,
			body: body || undefined,
			mode: 'cors',
			credentials: opts.withCredentials ? 'include' : 'same-origin'
		}).then(function (response) {
			self._fetchResponse = response
			self._connect()
		}, function (reason) {
			self.emit('error', reason)
		})
	} else {
		var xhr = self._xhr = new global.XMLHttpRequest()
		try {
			xhr.open(self._opts.method, self._opts.url, true)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}

		// Can't set responseType on really old browsers
		if ('responseType' in xhr)
			xhr.responseType = self._mode.split(':')[0]

		if ('withCredentials' in xhr)
			xhr.withCredentials = !!opts.withCredentials

		if (self._mode === 'text' && 'overrideMimeType' in xhr)
			xhr.overrideMimeType('text/plain; charset=x-user-defined')

		if ('timeout' in opts) {
			xhr.timeout = opts.timeout
			xhr.ontimeout = function () {
				self.emit('timeout')
			}
		}

		headersList.forEach(function (header) {
			xhr.setRequestHeader(header[0], header[1])
		})

		self._response = null
		xhr.onreadystatechange = function () {
			switch (xhr.readyState) {
				case rStates.LOADING:
				case rStates.DONE:
					self._onXHRProgress()
					break
			}
		}
		// Necessary for streaming in Firefox, since xhr.response is ONLY defined
		// in onprogress, not in onreadystatechange with xhr.readyState = 3
		if (self._mode === 'moz-chunked-arraybuffer') {
			xhr.onprogress = function () {
				self._onXHRProgress()
			}
		}

		xhr.onerror = function () {
			if (self._destroyed)
				return
			self.emit('error', new Error('XHR error'))
		}

		try {
			xhr.send(body)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}
	}
}

/**
 * Checks if xhr.status is readable and non-zero, indicating no error.
 * Even though the spec says it should be available in readyState 3,
 * accessing it throws an exception in IE8
 */
function statusValid (xhr) {
	try {
		var status = xhr.status
		return (status !== null && status !== 0)
	} catch (e) {
		return false
	}
}

ClientRequest.prototype._onXHRProgress = function () {
	var self = this

	if (!statusValid(self._xhr) || self._destroyed)
		return

	if (!self._response)
		self._connect()

	self._response._onXHRProgress()
}

ClientRequest.prototype._connect = function () {
	var self = this

	if (self._destroyed)
		return

	self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode)
	self._response.on('error', function(err) {
		self.emit('error', err)
	})

	self.emit('response', self._response)
}

ClientRequest.prototype._write = function (chunk, encoding, cb) {
	var self = this

	self._body.push(chunk)
	cb()
}

ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function () {
	var self = this
	self._destroyed = true
	if (self._response)
		self._response._destroyed = true
	if (self._xhr)
		self._xhr.abort()
	// Currently, there isn't a way to truly abort a fetch.
	// If you like bikeshedding, see https://github.com/whatwg/fetch/issues/27
}

ClientRequest.prototype.end = function (data, encoding, cb) {
	var self = this
	if (typeof data === 'function') {
		cb = data
		data = undefined
	}

	stream.Writable.prototype.end.call(self, data, encoding, cb)
}

ClientRequest.prototype.flushHeaders = function () {}
ClientRequest.prototype.setTimeout = function () {}
ClientRequest.prototype.setNoDelay = function () {}
ClientRequest.prototype.setSocketKeepAlive = function () {}

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
var unsafeHeaders = [
	'accept-charset',
	'accept-encoding',
	'access-control-request-headers',
	'access-control-request-method',
	'connection',
	'content-length',
	'cookie',
	'cookie2',
	'date',
	'dnt',
	'expect',
	'host',
	'keep-alive',
	'origin',
	'referer',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'user-agent',
	'via'
]

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":28,"./response":30,"_process":12,"buffer":3,"inherits":8,"readable-stream":25,"to-arraybuffer":32}],30:[function(require,module,exports){
(function (process,global,Buffer){
var capability = require('./capability')
var inherits = require('inherits')
var stream = require('readable-stream')

var rStates = exports.readyStates = {
	UNSENT: 0,
	OPENED: 1,
	HEADERS_RECEIVED: 2,
	LOADING: 3,
	DONE: 4
}

var IncomingMessage = exports.IncomingMessage = function (xhr, response, mode) {
	var self = this
	stream.Readable.call(self)

	self._mode = mode
	self.headers = {}
	self.rawHeaders = []
	self.trailers = {}
	self.rawTrailers = []

	// Fake the 'close' event, but only once 'end' fires
	self.on('end', function () {
		// The nextTick is necessary to prevent the 'request' module from causing an infinite loop
		process.nextTick(function () {
			self.emit('close')
		})
	})

	if (mode === 'fetch') {
		self._fetchResponse = response

		self.url = response.url
		self.statusCode = response.status
		self.statusMessage = response.statusText
		
		response.headers.forEach(function(header, key){
			self.headers[key.toLowerCase()] = header
			self.rawHeaders.push(key, header)
		})


		// TODO: this doesn't respect backpressure. Once WritableStream is available, this can be fixed
		var reader = response.body.getReader()
		function read () {
			reader.read().then(function (result) {
				if (self._destroyed)
					return
				if (result.done) {
					self.push(null)
					return
				}
				self.push(new Buffer(result.value))
				read()
			}).catch(function(err) {
				self.emit('error', err)
			})
		}
		read()

	} else {
		self._xhr = xhr
		self._pos = 0

		self.url = xhr.responseURL
		self.statusCode = xhr.status
		self.statusMessage = xhr.statusText
		var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
		headers.forEach(function (header) {
			var matches = header.match(/^([^:]+):\s*(.*)/)
			if (matches) {
				var key = matches[1].toLowerCase()
				if (key === 'set-cookie') {
					if (self.headers[key] === undefined) {
						self.headers[key] = []
					}
					self.headers[key].push(matches[2])
				} else if (self.headers[key] !== undefined) {
					self.headers[key] += ', ' + matches[2]
				} else {
					self.headers[key] = matches[2]
				}
				self.rawHeaders.push(matches[1], matches[2])
			}
		})

		self._charset = 'x-user-defined'
		if (!capability.overrideMimeType) {
			var mimeType = self.rawHeaders['mime-type']
			if (mimeType) {
				var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
				if (charsetMatch) {
					self._charset = charsetMatch[1].toLowerCase()
				}
			}
			if (!self._charset)
				self._charset = 'utf-8' // best guess
		}
	}
}

inherits(IncomingMessage, stream.Readable)

IncomingMessage.prototype._read = function () {}

IncomingMessage.prototype._onXHRProgress = function () {
	var self = this

	var xhr = self._xhr

	var response = null
	switch (self._mode) {
		case 'text:vbarray': // For IE9
			if (xhr.readyState !== rStates.DONE)
				break
			try {
				// This fails in IE8
				response = new global.VBArray(xhr.responseBody).toArray()
			} catch (e) {}
			if (response !== null) {
				self.push(new Buffer(response))
				break
			}
			// Falls through in IE8	
		case 'text':
			try { // This will fail when readyState = 3 in IE9. Switch mode and wait for readyState = 4
				response = xhr.responseText
			} catch (e) {
				self._mode = 'text:vbarray'
				break
			}
			if (response.length > self._pos) {
				var newData = response.substr(self._pos)
				if (self._charset === 'x-user-defined') {
					var buffer = new Buffer(newData.length)
					for (var i = 0; i < newData.length; i++)
						buffer[i] = newData.charCodeAt(i) & 0xff

					self.push(buffer)
				} else {
					self.push(newData, self._charset)
				}
				self._pos = response.length
			}
			break
		case 'arraybuffer':
			if (xhr.readyState !== rStates.DONE || !xhr.response)
				break
			response = xhr.response
			self.push(new Buffer(new Uint8Array(response)))
			break
		case 'moz-chunked-arraybuffer': // take whole
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING || !response)
				break
			self.push(new Buffer(new Uint8Array(response)))
			break
		case 'ms-stream':
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING)
				break
			var reader = new global.MSStreamReader()
			reader.onprogress = function () {
				if (reader.result.byteLength > self._pos) {
					self.push(new Buffer(new Uint8Array(reader.result.slice(self._pos))))
					self._pos = reader.result.byteLength
				}
			}
			reader.onload = function () {
				self.push(null)
			}
			// reader.onerror = ??? // TODO: this
			reader.readAsArrayBuffer(response)
			break
	}

	// The ms-stream case handles end separately in reader.onload()
	if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
		self.push(null)
	}
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":28,"_process":12,"buffer":3,"inherits":8,"readable-stream":25}],31:[function(require,module,exports){
'use strict';

var Buffer = require('safe-buffer').Buffer;

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return -1;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// UTF-8 replacement characters ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd'.repeat(p);
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd'.repeat(p + 1);
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd'.repeat(p + 2);
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character for each buffered byte of a (partial)
// character needs to be added to the output.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd'.repeat(this.lastTotal - this.lastNeed);
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":26}],32:[function(require,module,exports){
var Buffer = require('buffer').Buffer

module.exports = function (buf) {
	// If the buffer is backed by a Uint8Array, a faster version will work
	if (buf instanceof Uint8Array) {
		// If the buffer isn't a subarray, return the underlying ArrayBuffer
		if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
			return buf.buffer
		} else if (typeof buf.buffer.slice === 'function') {
			// Otherwise we need to get a proper copy
			return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
		}
	}

	if (Buffer.isBuffer(buf)) {
		// This is the slow version that will work with any Buffer
		// implementation (even in old browsers)
		var arrayCopy = new Uint8Array(buf.length)
		var len = buf.length
		for (var i = 0; i < len; i++) {
			arrayCopy[i] = buf[i]
		}
		return arrayCopy.buffer
	} else {
		throw new Error('Argument must be a Buffer')
	}
}

},{"buffer":3}],33:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":34,"punycode":13,"querystring":16}],34:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}],35:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],36:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],37:[function(require,module,exports){
(function (Buffer){
const http = require('http');
const querystring = require('querystring');
let inputs=[];
let ind=0;
let imcq;
let ans=[
    ["511 255 1023 255 1023 1023 1023 1023 127 1023","1023 1023 63 511 1023 511 127 511 511 1023"],
    ["591173943","52214480"],
    ["4","250500","260610"],
    ["36","171996372","406148933"]
];
let ques_inp=[
    ["10 41 467 334 500 169 724 358 478 464 962 145 705 281 827 491 961 942 995 436 827","10 41 667 478 690 594 625 742 878 434 610 555 825 807 833 201 491 67 372 96 923"],
    ["9353128450084217070979726742256491725590790132841138030726943782057736005049445550563735342922140823625229374849805470135347651865147860019693703563578012999377802600802763063619167190381410220600683871497778987896046198332312572081220918028700324955980331591911033356359121374081580813194286319844591623762361531714033774337413182264860298362453968458881744053209787909867203511686484568966496684396272095578656215861879448028678527949698553394072351327349217081975864631160597924158893036954043539112239280182718619912507121476480623743773074038149312246384224219705003420025831084408056671314284716258470985203645661330684202893520360480100796252587865287697241477635676645280761449280169883952916483249997065301449468368883175915261350276809955113970758385078514642999772889410727925773473524101310399599433635449126483737470701952802967230095909869365102394480782171806127837715851383712270468878960572255147744082475812959948954933170794689289448130347453359944581552230351217220276222579683031298613740081703051875042110734075946432552622249538053476641249755508753937452527422981757892779441248752719172836025492171570515861756128237610342083412571843521616421474138362582023302406951032977044659498666091423883508821210934502543531130494783053035359672224491944187149647142477102289714173270880896770687844586907998335852042244911172878446339048071589005239840079466220975070879257150693789906844469676196383308235215785675551119097726366898911444132801378481410383131030823299623115442512673903438532526065040371027298655267701674048654451408502241309045828105500685242302274428850755259069841801526766104566543530286382286568711509331987754237355996334213006379402523318741679480033656986613786930261155242182186763361245713306355560204744972549907243714276901679800574983440350276577194907384276425014458405624293125847576113065566922962647168401185934565861340934351815724594802597945742076091546848512993374755642216426247513298279668028613389503467201155496233202224087315397653573681322056596718328179820685154724879076635428462270472433258822320229814577323642889055572454606840843291153639818033792937310104309948065548431255724919962994344231359803978013797100298507944687713625932836317347379449335794587041764260813547406342596077648664930678650924896740990729703589984242029014713387407671761010130754956189552883743622799990125100518326471879154416996807012622695648207385500963754534567721100676696455907113409964510304435792383228718421982098751983426917355677760724913142117207742353200899765839223757060900977104635734602485530805722742032962327092683843698801373779274460813624082398958738887484501049021303011462377152153811371677691732055393621558063357404763442517932692056322120677337906260742457926341976300468123936782758114908554953503741765179747132053666411808371675943550446162567023886289218395982237594320578482980608531560378504473806865825024084057106353205852133941523037455162895630071556081585658153928636138601620975793943428446958833648428792702281876338204091095381124225495645842678410911213761105527289975559938970981115403713287226123690583502591924684958388001835194364814194488047632682594877318966350889449443128699848327270167714712876722234393209033950288982373761553788310950875262481591748016364852915902189625876145212333172579960650861743552366819063672859766033032316781110011149406603890495728951849980984218160040321581065170257275485016844049203452780299417354824525430834966522992931092730312896531515233885276489788281215614477640365673312960851879092574123087214893124412698795697164576096727306630391762732521230809509391333916066342637881126318380410745066883419892891933666614756722248038390481781074552224619404928743803843131230898132513683277361641146469705896809072330689316692817675555254834933289447498059250118695210805518836782423448486607686100110863647427881157215875746476699675160824714841582382066623584464072286859244614843079831481037454872570416077564081976215330087686153124722690218507240974194882690922516978109272996204615213694686867577597416626348922445015475181059700661333980972137730287717112294251586894893126012032933764185823973753364698410615808396014516023491729300341332934974677248950491783833069102516005684518503764862367874786267089548111983559957404181771397215281294392667754514134202563387025265616992879541156698064595209046729319726872989760866446988984756608592381591678656390111929317177159307686843810460773885936645660513481065668604893193816493279240580818474437946478861620948894143334293636342210296358573572008543164440286527548396343600021175483147167739503532179459581890550884592396468814233190248549597795175626462263618928074049020790417991737954525339358863985154397218301107771424562468976683224267008230927269835073880641975611311336348266250959568544661322576819566592239247195159635997447040116777212137066503569258094910932529540785683563831957958560655837982172660118791817504681646129019229405736507798661029105037140184234727590289345650780284908136551945895013960725795714326131086192901404903195867458093806925766956217829148726681480763677143958671386490284843113400769694091051209848087483994335523493014211353259077927538964616087580102239555682596240068422340218321764632392641486692556983134169237991132319477248614524837443578368693826783539312964467132781519598882672027189477036859247591452450628042870910623220364316671818990996174487651993251682269542451641580949806017532720166323588765815009991714568752078802172249740453364647093081280370787204398535084448379777026075263106535691199766593682686405924444018879910886668148409249834288801881772082840665505642547965978156454652038124676331505324011048783368792504083838910742164470269617686038656140151227455094142203181897854578784008974493127369988089964433402024913383817864952962878314866269772200713510905303581532940867734987250501591343694779283460155855791741023357739336476813050755326411715262037180937531036121853516899535951669954637952585690142943818404560658143038317876012408999859227485211544475375198548359434576427948002761418948994849785252894799611089232246245841811356565036118428363788334018111447023748670412460830663287218353057541608661017092070618339164691567628606709600819890823732323471464246047007010019203899031590636271985607520822972351276346501259569249991296493820147891643780836770692011650132368249524802988785844065322657884900855467977745442168803368069679967403112886451667669995824781899732063254119497155355057447847722149594107246971608313279054956160039649365173545396726621238867970057015745091830422206639416125432353820359432594727480543186621976450415650822524284450778552669235398053348512952597564422608831383108634685090269028682862947297528491872481608822690096283212965726133373656638819811769282491193726355833406588691787927167206890645230590361132522214052992772746481451789024277610017407794160900175444568007968180922814220543570336982702490418422904548514071004815085447680452964310382891193804302078736903399740899290319699242461466058699583885904955036252419757382443394992485072886401963030788924586975314011319961077572843657125912475879000198325294578066798582929518639640594246793711500458853924789845115569350923083149146438006912524292337529849175299854685478740381514288363502021239617366151381533153000550784127081947572832085592812080088790610706674067267918310820848819802094762388236949780962267048240460938186109716614622940674690736922750361554115708192171750746530706844110521313122531707991545627421854806259561044336025402186828223635551429645288103845053667689162719082168786797003501097757773167165571341023943223342220917523251900047361655199534978171825361651775401596206471898807911467534721484655497235536416309576221913263848389133886448280237072185613997958881369026064089008417178587492200538732339969880643353121193513696662917005985149507811140604983841252954772288458152498558176473798104571721767892233009918775066978326618796475918211322302008616540322301940651404737079479463237382532828084144729448308544899727990174274608272348278245624528417456873455494748588602387731794459058595246611589560998884955411516486100873943010201312709461524283895092388811034265655504656194675195625436632070738498875487046686140683567784758529506377073631265556802593280262113962689055191966558927246382715214492499139245192185911762153684044505410564393504217685890180805455127475804484806786268206308046578415926364066835473293045141709562264010638513080522156663855921149673836980208562777533830322547624909898848896063837320455629511103105189188896199021389853924247577088116997736739087184577193872890611423206891912930308219728908181523843654946131291214316206224379655230625460509843374914858485372917192848918004331945620471228639458654446478823127802141283259396371838675677901891008126763892421704583240251342742586172751115388766103328462859009838005326956744575817975160262356178610427312769470260996224479299172124175343410756746380759978088222659385646911508356551541549383568698275066449294059425571639285076114612458598005947794877898305038619857716738242913521300352077858966859522548852304456701901906702307459815712943310981291384286436484565158344895905255505923597235683319175777387804565159418353014445574044972985331868031866277833500005604894340656559658577272832834594095652617382477427164347552003625490653302771615331088963483748409486037406577022321149487071024982586428077892236540418136538928397141049940173820873986531545384298413517526109118606272346894426387638501213344126943397099641291074826160516149845395396282501628213041013757653183834772925307340655858343208849342710234787413508286030453439363867882470311781721356612957094572270637690061353798379567586935184347216234560931998146814607335760403336982198217023825207233901162415215727578492984624447769875247960532409269689041686574481105004079512450518433613461821153965562415880951704085443747073369917381969954336956510086804342456184270378823610382592493829264892220559553844073242581085911390524792849143640997345664155484658139515451818027753539964602287312266811114916613166072654072024250853164588161489208673072375920127545193110270120987497746258461335854467617649669600394939898121636295258112098151200624825638713652177180309427549721323908989265494303335499343548670281071217758308653423379923713931251372260000088420767852243736883131467689898652848625061335145458516575666423737719516641375813794364020874167838001875904796285611245422940846946223046435055736860423839123738352958503228704302664178082557504890862286256819095702522979650051238676304187016688052541426421675652484825528306131387529191350036476168633473206546299128475578327955039378818564385418257925959774277326309477815458403198815982321263016153846502344973766254717055688294588238694081579215808713471393761706787107464408108989426877144416005015783445256266220008014456288702570814451289821842845381131901150364909249121528732463776886124250652776910264057395674273095430617887698826321250819257768221592492182164798044327265161905056428956372964798122148664975482346152981179558582717875284954489014405732799760041921669084524647217781272158152566623741495071802771890235342518492777038536616195295220056428387756679543116925467109126870629596264138641335093714826605787849487090966211810191776666137113271980998739833852041607442375695785094869063548964047091420299789280898714068055571290545566656775774547953978627867031709564233720376081501585282997288144760252482102454523141542261005793728188590847419723979326428199683422471677529413023965709741709073233602376428840356839725895022548820187729725851636738238030496291209001174779045610463469600539672592611209405166104472533588547797188420360876708175621989956647357390358338128265928038223007764795750506348264978981723226912381978939783621228138232856458608998813981264598323446622389349341144432671242274538203653588614750393672916135599511076446429804036315727532081164463009862842447291883739967395742364251457894645946419327377871207724079951335149792846674363683377896994047754625019997523803333032751156031416149130884384817113408515340784508633613061444367828699433404076839392898154580374154297869466071120311326704033461882788827626758701834634359695905294286161746837942305930822514133583392476151065206011223677000658110357184380032836078547248525366592232881984399996762597541097959392582892221342239408354583278300778969203547061901949317636798765761602178974286570421317986774540622032849268127180521431218664948351558504518247499554895663270007482252803748699767156734261284142487679263224391028791349580104563422360884325647439573523755101644092273627181925004576843473549168695950698903605052858115671508569374353155635162548581168441499327852399153691167125254398447372077538446925251065510140906935165030996510236534315329521135943668677248262045576021285318024580348184933337186918038560392943087018621964695486599347508893313034808196685344993039781683136440042883543098687182173453967623849037503922790600138405992856131356018600091174389349949326162217010090101439067022918062978129023134364527436338541577864896891306742416359904969018916607406559325786423333031155976736478053108686428774377484991866606531843631575573902843362449121774061546793252742039585741875063681745517954130655503298585004562666419125560527399618688408867023766699345329258131209049945640116706832596413439559675689365377279052413375620575644323479039976871234662356303099443991916803602945422857409900175466779351811037870077938040159826693551854967846865878873808800682159434922838714213191603604962198043658931722456785065425013443469834629712159759555297019363800785167130578643518040741897488658195020097854105201295385345100111813932827257079119959683115126539822306254253185290350861305950052585130557987617662851181808923174897864772735412897127217202619228107506772333735457378300584406538288877000694331278320370712365283291013293828977009236310766387818131751245252052188039005836547352547863599814242045968753307265439338787660014519237222675313056201079958989352475207686137444265362570368413682404382006760298946313369102490952381603409640437068505637886191322604944108341068110673363272525995400832779875887866224543816517257431720639110006940316718369296151424407440460256398969918059664817479313370625256262265260139532499423952934769306824340675738997831339642010251035482649214024039362249770795018679033957481884731267154343956933837442300400104222957481998691996853183354464808015975095956267153483718156758770269898505142859197790728403473421620472087482324293265027677939291348768606938557876508367271192446422282097964864624772499728063807147549555962326795966038956448372048196792146928436049055619448862882453887771537133238911075853131308686555728431786779886561897027807783257111401378278127226121033821348079341498537341094926031513740769905046190856055468283644930106116823532537155911942206819831663347890065081792008240824927303659339565265356856882984388219794640716534079974752061611554623217280033462379847245517684047588438434882019213168611509005983926970378591635041034184007795007706955935098795818346969630141113728511031012516360267120364477969810934247718377313047173740539610936372243092733257085589852716901550775306591927647315290764586834831363215329213244796064632216691057370023954470169785140471233358217419914573680558395352777023864505408156634692723278647361647219881819472161555075859788872796696007964392567266761932739100992514200930106953541955140281472833275360581398862070584522870275702259509830648046014589996115695932084160344158759427326130601416637165390705502645579202464507190828657620390556203145481054895097954816047022644169629045624155041442259973149777669664328953459596011108634504390478000915450631252384347099448497297408176331656804450359294355094057064619974576111349398926425041959333230800641078927919573308495558893906960287072775843475436991973563171320249448023580024633052501030162387333135606708384809271374490648573818678260211611749876417404551862922768880971265373216166514910104300480499738375816622305999121581721980156905406070520019124392484672889470930747099012236665023483891731756040741975310098790351630905202909195582045044835080143166908318237808202828423222248874487428243143175579531956100189840582528935472221186592124332418466820933492815955504938361723571375368900101898370983721116495742381393324713562881375586345820070101563934403781828597121905122365411726286557851600544736468794437501140917695785931526172261806879903997988476192344983421501480300692500447268413923465627786016297458694612483778214778576397117862823586754343175544613242056964168617214768275742403950455063472253176562691188340945902608067202742618879218244238028490318251527708718939775199213264515332607377478263350882903351702556946676415251608896089434536883697265028546626635336499872672932970482438223986639279456833158545503949791081665892750533068814384971870170266747212288784868218906003212268852675013091579511303904427765751030554163432483716036691489166461737165610858321946816974080758824530291298222447028837335500692267498637662926628631384857116554503389145337911974004610343199641109013569470660280743907219175215318794833019067354644665505046689478174477403330714173923639497356463811773306309837149604545501169760039362102007732992569131477343646595905307100311769873910876132001501233143194473350874051676896168402818328067312501907276075913753154098094747197398037846337825140541360934646675690376121104818884030245939599258408130261844835458495988159076026851998282867312472192928047641456566586884527085496808604688925691451030604422163753735113115794839254217879088553848570893582987102725423643491995943124472690321715588042304413000524182353507808656650082433856808238665136828703568868013618210253021655469259705583514975996032536713459596467137498107698591975746004253810725584594384135342018838253864038587048696201035258342169745369229145124857152798722968135663705911454131848237012228333029392105270883980925738171106428560790517527137330823732043607555554708570483216228793919479247914496263402745687678071939175877236854396781369237336441559158891698239809936981816470538643643922945828023631714372547333917419603417439794987534909664955896779232275156866511011197512293991034454199975528621951722153762886421850947692576882974391787165729134128199368949366097185903696609243372420515471072801313782565681938480453190499792053341719470583543518127179340545899282339308762233348085111287988126361394380733368186809949837642408639288251789717597481567343593578496434702604455124572409778345196039411871417059626069958783404209162342495390254152258048510132178503764303540255472409370315642694171523897815684026954115799150699941253954612127734155846974053947382608261775459886692201607923972332350528265375134555747451748101539601450189602359843789985717171033378509461898893193283875582805444414560642543062380780260461107558906193567963314684620687919666579318664470913594056237138117984825684041264613230886719822521903793110446129645743544629893985274888854468322818384046935426975654631097841255083780593337956431096195072497115406465991706361792521330591204965513122414270349592847096118714487710951578604776950870483466925606612079832301929906177513305877759956041491605796333006537326013129725094476945598000974608439761645364903507377309498871616582878305825175105065106983064834111944446085798414926536062445958272819637238279893468074419926973157242185903002548467809913802138062370072392756894574695275408216664863022417298678037774226369935334868109039198923691243099084748324154189299083364408727928304136574282103223551021093008840255032470802134602704035436410457152429620965525708101764327562289741826012596188901297640318538624017610079608710831717748813876377058077047038213384080861141970698705421244265814214510646946205077549783121902555906183789501121875063585796943733563831793125225721201770586871337733032646168853075144422002465158451817653738255772134556792237395608463939854523756314003438488968704320205670075808229874612620411165387874071854606785148510674900431148747144534304949792071482625959756660135766250331759817072699764552685352997142319400300589787332610158367384735975908988056802063308155005488275787705602483611241077777447266955755437776267581700607543371169854507376912860153113097644753668218147850057364698907861358844866982880985834293003791047941329139627618391933345834040934089122186867618012348841547530251395705401394495641626770556793024516057318859333595385552133757338056997792625996644300735022765661250121503295879211485997283949086218360989689730970491330726857598537647706699886147280475150009064748510382282097827064591714922596667697036347049948529611003284043022738562388474448400732270684907472258606645011973946386446066905140922789480579985723587105905511733021190169270754004944534208483905114343460437830224999320360650283837185440155199589541779746987280128665890319288354421597287928130218799740899824299640381393119350322216397480829785044175488333665888638478660551275884452287663361235294050228545036491811598054299918335659616339900081263260609810873430513149069289607944936018095550711127053172034821434035056722903035030560963668721157854457647170775921949308370405383828512429418113427377106476904208271514675508043782613252874415444618277748862132396833030592248629448435211645986780095365781563439472996170880459680216986032595632833661941107075216806429970453938424710921650373185747836801396430033126403432940435330930269025138460222585071016749852890095528576718998695798594471870871544593166175934606475014191109573133441289894267024536947189237540006426526974676339146874099975175939682209668413628235837744253947005445524495750593378262609913616462117776551520879695057978451297531200855120307289986693649760715056053886818759667349603709073590398776550335212246139629728007356146793958590936769622706528254188980277346330916171573325273803891039765419630449516841680160471874953496379515796571659668835912607948505757226185263351336857119024194661516326162619755450381395904583666418026589484140178429911682178719744394254978108150164422651623897248895302113120256801286459950697676126469973119791041788873052712324182090403505629797696103674838469770933285767659538350610213359448433961439425390337410441979013979475630774404549400544653756364213996966638002944198885151809420711530193213427939917554837799083156197618972965889754339028226563372063051269947834499312136902332758175212118114563794930740296473481122355469847338923118239096356670126664760413317629664684421380593181870841494177245724388438790020327311552180014608238092063085028051328646649229264084292591323140475251035050196605044205559063123848962469609361065407162160492978865233393449547308026354396815614137788033209930964799440021792127896921441357575966000125206738440034370725404111721736478041115118577742204915087372922726937661538404654045865792016409214083358399786302888569780441564162417569637269468416316450726135608555610339395339180927911754436581054209158903032226930235670548645198005198691814727740430484461290200732793907391288523581129269481786155447398546598866191047988256861638369235886962774888896622200583522765264950350738539291634812286454901518643649692534919500941886298559436710691167570440764844686743608471660898748702090694385951431280366545531334833895543038393413660536210443046337082307357790079024755710216069979309146017235147634125346065152194220923647163146558312938645854506590975813127794525940905412962731821502834705158942952603911105589632035406923930145617108339009965368929743058272853565611711638166051147652479876253914088241287005339096354433178671099036176986619528273838346225554550377985549613650153990532087755702492268129607812113368899766257698815649800581922571370458193864648312315565659127266401211717183916467915603635551114557629539052791604264547094437882744810915406576994649360003701085688880522199988444501521994014802882066395294350700072484815217698904553174729701021269840681373165730169552734056173189340777015580719694869464104612746735638307490369967916546927393199774515456502619422086898739240118699356908499532752531524449562543479081020975362517769134202756015133336325182333102047687854465178523387895029651865724639097717769097798301486584359712833804592411483235593451888979352734103456714050719056356153289674095532125850021158884421841939558213647142267582462024121234319332609633870530998290605748301335707682060243232053245731871925697565883827363560004580689891362038518090846394395065035914262486359351635267928625148831257595340205361909691455189962219961617857693904885243761778109117400105966458068683951240282394256266075820728706294320468609224051778250445325147501867647670077364281456180794676752437496625352992069877869528115488320982439829347234233385307847679889042256302025469717549425114292129544374578335438383345878398720696023692527280020554131982964123757219681422454509114533749263758502480725990360494949223141619581941124635693932327449775148217501615081760073506262362076819769122650929956329165591710391299302687881778620758219680840261121589469669641919750738722961073153399257141532420693495981211746075123159222786746015825146413032844372206695281002786320163498775322742403141252722354693152021583777219543798981118899115339487755678553824912245025238781641638396361875268484007722713087361190929216752502024917300628456767760883480852074567429681546315113393661847176725787647012675388610296370287961431318011408236029248896126034499521542794738632568467291004545619794285658613091838679779445139100748235219528923700809846579681678613234118103493673779557617885866182713823182461849794665465962772964248779945329211889347133522928365442358080024304468193645839696352809600922355713742008583772529709870882310001398598369636180071260268691613042893849715545663781907979050557956241334890456945035944040317005821174563520214939443179320222726844512894137722988497449673146750303502135017406347202279505370512983128729691446266485567095178568090985854098836695443154881839741939436038031703447772160546430535798324327719055723261415079234923875410301509093539682200355747224887027179091654514055080574409809601330562627090796296464806996976221577739669850470338739330147969039004182277336569353206210128332254863192845592629950793736869006482913127998351258229622220322183304938827755000024908440674183445058131828348543263028307718274709614919773840168490420214243633596108087681690459603846260624195826836594873830790274922106715318193764153636635974566806470201211707134418283790349029896839052323258710730009253378267160267611146017082004949487223151398269375176896098605655399815964992120647549378231998447320047738942936983812855947983748942815612925713216402216917401295409260472176697247661374014345805724983290070726784811232868379143762003301573341745888267124230526746378446772047525672506929193097827761359775430217667271380609393069416384039050738655985246197723664312917824817802592216858520008459942626320020371505402484686452548923657880839101642002460325791796073051254165551752920173942211848245360099564651845182496610024048696697766331538246585378390796778547534179222049819356487487354130884411555061943808748406334047057610975671888380356126872478103087086765143991129743540780610118838605111421833927483471634677770543056421526819857114580969736990418352424215112045793910803494768795958379012416986597577048716507092842963126817686534268231181802198504828621380033671414524815246096690452592515174236908389003624583529890273880225815975077649099643742779279492905612110076905061338527744885297858080289899597720592488878597394322342553604498448988987849798220687134414154920911821505486529787612063779383384686839507471341213431900038396954650732671725848102494408339136812007266358032174313965711626329729667292025434886374975259882974833554776411999759166681782179855120518251563538464242322739916428689626875148905529983157060603693757354061971646734341048220789257912611728005608235659474652670391754847947437452917175542921970267753448301348540559005497516833700164924278042299219951932535008016628265390711753658741114747768353279908182359636410844410186221561451591726680343547191321065311689858922800056531462506923456826921933136333906055425117684288972068671407797624187690570908015233090432134098506488635747768592813177382791563401284770557508701119077468526886907574549401294425342281335933843592977119460803659078103609983255542475521723288296208770668213760129691066394413054023119132708732813210879212837451762887177162444967944077252198586966773499954340067764611142910718488949936562798467040354568749807691505173352290107132719505487348519226581003235948231392050797568603551873106612755886284575231211568878180771167967596145680922200187108195233129998714274397717747557569212546435506156805576461338385208652226798625205974711074903625403645416598219826400507217771233507268838761866408680302299313675593409475773515385437666718207958318477954428168701487151101896848787692335153943001038148440034023804238945251761085191138151885385709725461549767478593320608356939003579625712471252505677623516438715890473811966236915688131995886567724106224867459037052141649427290802644020897711616022117271990183647272553244327121454372483621988907154488032976011568708080480471108566562979572648630468728765097963731948098272238294366164965653236340251298621462099617203781004840087127981237539620362842963579699311229374340204450636055502481524869806450672019194999470618092479571126305716847338285469568935005149979670456100230796865660460904814783040681806095982440606898590190694672784584172538719300470489640229729178707971042904941101267400492331302121426636120462680330590943185517851414247415693648909114644115100263790633122686598400066408118134705989291461231193320960781716409997017375700831363370550843504405329068738933169427694880251893545653546541970812701381626727082749115979168362562892255047867244355842070807073284702226103147574260568560478718488620263579447865931917956958798753099376212128632943930535526403903850693817892296782837519279769046226627506855425621582529695821445007789664329911061433305087121834522600142053372515865363296471045206230657094247945501822669985505149334253899584034346525623196622755270759728343777340004613295672219406670624993957957310859326569600489442061356064917995827795677616672878105021412323805796283046623022942646809231644313241568440743259423325248402866382558592596012974426952015411041216266447360567120927148889915057985729456424356540484265386983891366303166523398446084742533932269891200074313379198674049332868960200220881210359316731696874781701954132273218241025386293681753968584721272317611171910278555164114506723154028157578595672300713373068575209237184965644174376705223202022966874282066494133923466798992408097637953703138420066857668809800795401773216078296973859750832023563863106713733542850845021443892388618411887343748722346690992322113256555281885650104965284419850395043771851539569288908461546597292561968023990130130998044913835091108902321537560751775186671192512525777022798985054785552961114467154869250259976375840238652010926624569506496143857873858061175937385465324958433333628626754247198664316702847371663727303949761749180972358197473746608992160457385504730561200695465276405560219969334503835915653372935401525631597149434025702239623373748203572287232656446661843382856876223474319794558126420850035744569926589470836868612897912406164079827764769366329728411982790497391267855813665547501619098059988026903404783437489771672607797709391864352826586655715995866536688066491693463138609128824509387184925115651064857081095745674412007538225444049949278842322965487141185629053160197191643042500416545229156783794433797293463706582005242810302745234055521911569892516717757943678095747858037136389970867782241072646554677380940859845833260387543328785616800887981585003051908560558149921131821290900226548396564398480713808027237452206167915375113297797511334281403239133780403944614397621261533957092580522916380931725841104412131591863056914100272778880333767048124620233943963330141296564468270955178465771007341460238684523710227366865188812178393161734207230286864573384594553961264885610638436985225897252860986675358513576186820410357553573232987730088816699752909655934479767450550551312400690878561938806741918963206649638936984277079866957746288844939842630259278154749735355350755759932259396211807072529354351828931179218851152051234161716110904333456233669064187715986597897442787420786884322293804683464300698553633412166315998376832574553409984257664215006853467816263523614049805456159956492395914286850276158813628715666895618059856073601502075168626338899916892429982052369098050783592603205449457865013232037028479839269925860748471794198110950045983096572769818907428439647841451750327815996717671416390086321418452355947718675738587595349691658813607390369854812583328409574575837787915090493752206046925673388177098590769156576301195772212020941890888993663293532022543967161240548350918260513945111427143289435591582528572868581645461900975626796248205604462728386607696478059775797368726120971831522389304273975703795309516692764992122762169851120672625497683005419988116291303590972413104724277367399930083332521884304777114062803798906251415713245644375984364855645273534017631115653363929306970619193516271612399848140272889173084565305466927001845865175282781369999668250152268847574024314650560628463670196993842276608185333515383662973593079326988916651903643929139510017161060873740831307811855726747656874081557651713696791285079047644042119177240721501749257473137533064174018003463559696533866721240977381301649196386931348132586573421774968098726521675689837406050327735665637409566137212183908932836414177817065890532842334147532393700603302111167561997321384535115176738969278954346000130884595134927913953958504104437438899324816729115622482014557401282444845517641305563997362304655899275946833165724233999421806305445951834371865488989843223885629344440177455923913927442840504550124131079581172484458655805453575908317287594765420405987743092594547466117703467617327192611062436294805508144817860571733131387226609479205818895062148673803725397457377178959456992959451826587322081998086953762170215610278122520631632457825242285047284096460543837072956482821425344965534708081999386236439793320918681051980099159072638517142155116323611633778777130113129354066610083346845832548869193120746338536882778251736534643977153706761562039866051804461970887170878144368456371473139428408237234051607454281540853997767703526141204079419875873474160140494200433052913092500847373309648271336631044344816800759200266295520105409955537139304234473192656968430445191004135550207536913702755719448750283940982655467859226799854831879165353630196091215804882287364490037592621433854355035274922372575446628971258904609147759006255992574371718501161108873794611323570019303453592804683273656999466769621187736938508845301012168937111239904717789583125447855840553686798191961820254718695371359739518629938140187578549076131007978032156960198865811711644956663489906592713719220693777174953421311161354627569729098025611965116234589171947820941844517825339984334451548540746823494488112030685330486251427131470030854277245098039984249152211435540969815314430328964072213669113329400053497441468967119675508850092297649303679468299178838635834284940092459527568476479434930458064075232486142001878913316353350979412952598811998889330097344541403890351132443243289488232818079568715920375919257107143624441519690105234727873803529003468829980210736320037310882794150152252374569114437178176577983010435784342275619538365242952473529217741189770625484100695865419330026266333318176586747255996822046662597058887438202249748642857635187892970645667903089144349222833542931115884594094008464587960234629853533102613236194542251506161166622932315648477843391641279386060455687473212226777033351391918153634571824268135868296527630647010680772310225911031685569735458617606037070871976056622797232195085601338317606231013382227759257019152105176711122472994860717619646078685467591958149758949712898615476234183298005900794887066840697213621961963473675175082988947880144550658118787214712103219108214860947988758499981323845857698087293101088049058312698375055185026346764561568599781518046754256802578157403375443516630417854667134161811460924407061304209987610037410558860200038380702893656889723798777027242370363844322912906407475179125352600186539932142782542261373828201239015108344814288626855350272516427137991595135208885433672824478183104473199719719452730022661602914651172065937074378570738118309987206702227926673420605436369477399962314028786048300073921880720918179572560177227426018117211402219489655894516571374298139271614852737446119967004745558697751158524498309298128694361440137463317776708650462443801945178926477146037894042207797803520512151087780690096246137028390453860278969020221845669483422487966903901003245421109068500060758569089101435179389216268485460339247159402919868711539488946179213141183374353354409369374911935479588815561898450317346747053590778571028329187428174760785067234083108140171033842248336052775375906742771075351797540475844603194968355564219590367524310770101729757425866927976628251350563955820765241135042837754089167452134332856281798271966377303268573106414252623441759398228766513156919354838175440409243320973500301457850690336496541995104455507844720011064806762071581949699304078271398980558755003210181211639758088888153930552073083217590486394394100605670098528941693661212942374536213315367353712000341637094469190643170007371891857233934490521615942155984064371094589940003186970197806324971090451545567805495706496228737036391446192902663134705529512247976230841351720153755408361785492225222577951987272014060151990134977124011401158551159284575718225150751994221398613653223094036861848150774806699154598899403089365390370852421356908707847167315055184189543779581372168095046553262690845334295622850880584459787968245988527082587577547083161179914424388287437416161989227537428073621541497158866175219082934953247392733460266076527426831528852881256715753563135989782834649920247119606952276786654058512426672485565150407297882487431805482640198636996817617056021303852138378253844637518335937260855088837873377732415449252171158878981689928714185729664081119906794155257040458943809439643763352089506430698592095148124692948368239974163912434140172533827854607797123746189593521976279276668359292566174255829946766885561327348704333980663577345934502854789571106714772029964579149354845902035806384708706154280117512004527010660230100737355689340563935938924940972258103964000078572165159664671018839447849867624852669525104516591635439515287884061945658129700866521483123113530634211044114312165325847158422697030255888410858581067894856227142287965729936886194893270022839077084768871450081680929231637536335933710166386455467382755429254747049157907742201259446089134501535642352028570695730430543126299953380504551530116359526130789694134186762915946573757561731690223654420611438207872548813994016593946127582313092547330942365225531175124357878124089274420044708835549106883698118047689784356159836946556118149973634524160997902797554165972989444017555744656926871219908118284785632307974669248589670691439820503836733111257105082243607789730135700241366298706122782462558761354390728568458272743101476255582132126083848887253593833578248463676394690698426795380657671417907538118197231031589766423786776651462204247342612708342632322187335777191157330610666950184393246825537942807968127832070401938730305010402110222928145397682465618219479682625017044593383541312155212293475179105557005589732167980329696406536083904464459685673616695457001631022698233111691184765401413598811090015548928048634104247819690722925680592596352782336317278470685255424675522790943774612481749284726315867058045634296634700749113044720545371034575141711786829246610765424829476000172472254470042030794179048749778137483022128343343852786552641785423927231287621929317284470848500005728849521915878598955131082082776852735028525576382195294424892699964668430287847057698262844033220686542560556273153099485808242212087255502352787007157637752195425360033378546449154037025446908437430789753629536160864508298253119219107769634340556906047892404347467154019544519211816815057602350185796663014157560142849532767777466132656273029253450605801791447170536375799824461621123295349378343180870752390455867317863990756286393561922980668429308629814445194662954245231275426200181845576142337074517846488228258352100716071971322206866680606461974145964081135668444135195961150767453973017673419042584370407775422919332019373287735185355025767950083385434782558266911535001917917448191689056084775048660951665639460729956554044550637824213796832127214879394941124018551820623038959348397904018621696898873476272308257147740624793494471719458818654560447409190439189272318119274842888550560723733881014036975550030895961936429007311716533308501512328632276297120223878121171354586649879618321575172917024471859716613576630987415816510278363536117696259240081762546563311866470339054980100398742590152458306331237857069018812163190346476001145042948842643079611665204026240966160146332630811989400832458645271487220406687977930133398474191451173446204104917923272210841189228862485897208292539973957368210298538239180101377464982930771990765589617629858524114307496586872343414397494266980332372152750206559109058595385348898005280420377200115286915471250270710782011732775493186843980119381489880075472933463047656667607965845063722215572988844422304190897695998311869077963525768497697358169990289108094569347106065703839929069981701469515225822524027011117227320688639171773127539453564209233201066993280794569604952602528068166975296487854024432992366162990789528168874276939121567176595766638647454893686811967896467236899654521900491392401382951974556431095106257586748078583672049895214736573223017046995254779660181754633955389283972629096174114502165562212131620084915823466936343091242575840060561266724317261563897064760767835163955399235602983881459757431169464995848408816396654529264590436138832974775626481854982332405230214623003585326531921167327142175538160438172725118244986892021807613676685867470215813694826008769248827405364405986448050850748864766428167527016972777972948934521383391043866453622410824739301639090394771336921184387872913378497537926250164284612510831160920775697214421049432786961097299489948689334430503972580600521779665653588124294583941221203572459116486308749397613736076325680793531183977009782155954716296485730849438159229455142515354992665779814649774719456807463054341018291675874246301983949457801904923012819235085386970835717038422955256391900650249552243058011218855684896882828775920427348689686155736434817806498652306365545150833596179859510598828485139747952303110327291540325193828014919369673827776820975606918930321357436911688472589261872865099126099982051090260106403799498433252440667769787718560859791856101348506503493395343430501607419863645295755186820383336426360246720371046757351489912786633669454781895783620769872252936414359740051849301379457774169720167352369463393522477366995877005831289125666938397255845554354050378203969774603528135880237843072123431519991446379859093789286510854107016462210117217707637389386999620288709730653534299249109918882122992185173728379294326217227730941452999461298239881605347110334472881737178113111271937641894553741816746567879918211177286832108581356922901012835043793676016886133735127248723247728008629429232537041995768002086888670712866111047236714735235043902906482213329063956559275779181301942383717835141908125604733883209437920913628940754234909408920883706799253257244797387320312513883672599926841332070024077428726295664676463796915119536208291022588068614105006510795335465769927924907347849713782445081778682594196020836928218452252341329509118042047939762728245480834714828822156061237420444014290861355330565391416470425046785763890326592243514154418932700496798852604838281826269253445487356351514927067169017934488246994521903597215151372068536552242816906458191836063462235092536917500457287372278736960689832623405640389218455230948117012485947401759882648373387210134372088748015993478407767608911360778562576067605667333223016363352328795394176833588900423351808050039881298092552463605253533459462642782701168424787422786141209663853234640482972827095821241128713236693863271755476161205310301736516004441716473081101965195280862664008392939560892208910658746123555585700978178390482479443178623171871180118947288647513140902231540970981708726703454760952197453740731131925595052641638868803199274307699160877231326222205724663013072101408123587120642116792313632152294227575597553984655886470607148560238989854354919410359321235083238047154781182326551405520241574590435904022554302462237253322972245737159526058424849786140338774457262327042004788667391326324761689943647069538306235589421018188292678375528580123804748169997916473233985035068640036842753754394937257952778734757352557824475889524421698464059885252134693182254808989057452530075290852280617099118013050224553292587726989608639642949982537986334308198079832098204225490108941473484382487807739371831961957116664194335015908165248556952883549970625139641557204371988376723810193608774942684231450287159462672952931647826251316535242308675083408662546161514178614957934734074850216844296615696303006679097774915612051824504436756415544413904488813017470013701542106749152720501103872895485540972848774956206539026227766332531737705320962816720542441074449734507049257638222499743042616681051777893568603052946441604484510907617185247572768414797165718729510420167814310153843579242125298450469142593810114461588010731576742678938219542998368160335405089246051804959140196005230771299315041143868794714534050349479502226563849618181554161396355425640506880953983158786125772214979941729936236763632266033476995000384478123999374521326884495915143893625116044616760440080501036615999600427890667821922972205887598459791400689371784993315803772629791853111070148739161863260644615712024321467432460756274258919601923368626569728713532087871831124672454000275066520928807902337704962572712230102394197099223913629878241696706137867586620923407606642811403118896764537541091773537810180712513290843529820127491294212505957296200774769771520860203753240172712099465333607985135603149168350571747292763671104966471309444614788437625992324730479530696259620483247768293666926091050885849897333229160439041841978178853754409831948203109415722642427905567460686606119070552038291193849696874556389286453976716055331312101776304254012421003828563715925312944681203445677150118409913644860540660935714449652694516072488634693916409045930491872670948921492705565662157116225783779571810202058514942673595084553422625875170943447624176704352806169646255459015998607297843233949825661118231820880520334659165268726057002185365438661248455973978673583813551015893130275995204061641145590893304917937648378777931275726905265879864749588555461718282084622319497162230007756027077275950111152080203403400003910637445466793192122685925045538522468924715125339797402126972744192006487019762853703916825000619811681302270676946449042642825907087417656713527163297673055647565206991784036965304271678154900443354422147745275812172199580846172744159823372073593902862068796960375479928126775087475871660456415152374109776495254733920165838346873213103052790385697616219065845196526843214243832793336263847366119795337763068538071717012968671772225191729573392765487885843932174715087256518904643551137632861432962988751561027502816771977033521711798044168138311180499222775868149946584598641782821965254931947953701362129519713812637043139045417775209351222535798712038952696493913149281636237229724539701560871487305690515257141595597663850999841320573101815097748424701710896249296826930639325367839922233057998873486451503049924838273588470557828483745049163747774144192149943902278994920297166890219625839129566367059098737316657542325250416264061971066729584558782438471317714913239803773329419664623775556169602704172424568754118716283099051421950322971766309270018319436581698640030116746785986038973843902788092003889770288982901286898067186386876945964874284532111030948579376272760360808461994218202352499216405661662700099521361719150173933401887250289333482875791720016588786404444677127304993267489039027997351910652504913531209305417106052345420893304858000150603635262698252441792299211259419094720002849393484826847182056155629842056087546238015723250867540736951571356999992466001288064237825272327936037294994245241764648165420333246966377021745813488216950994518106966988252056316357065284637469367955972399932767786214877745671688398627740019907528926892481749898672556870760425537129389475554532719696682624170102252119887230631512170455092025440874052778943314531898397729285592997387173424807186038702950429730668388640332060963966151315508776626611646962179767394655326195957638704311748817566943575305802766658001375269117932301032532000867697926662596591941044427849826507491150531380496591945829833603552869812052293973269973078339604082173490832229767856173208188507926285588903891779416737667618320940618701200380441116092765517733715807928988922255055233906609291971666666478624229954467037078366642230870962504619358073970728392835045053203786813610920102953437963668990488282575668688895431357613634892823070636416428961296970333914416724709561423239560257402905346010600576818352418455396586032935917094876733174141670450274469963862341134444170269504732398514892029132809418454305800239280960182228708641486139639854785873002434206282342055139034614113514779301941185503018932695236689276328433561211714637018531191210862705071304696071772725957290387577377609188986273448155885935602539221151269886322338148633313589613948084964728953987960293842725019018426010838126943182767939453556519412495230924254621536772059621764034779761308893946716133125214837214383625504811684208532373757600038502352955016568511968233193127297424921422298062158184713037977819401576895804239377941266263964815264063775119166050106724213714452859138949856661893695318680045423566350558316615074508468683357605260517340101621303140120475248784055981013386436862076223067858253974275705378176574118714691439846463945794531400822813275328425063379149524984968149587239083781148075149537035869039752882153269296700866581087183258736942280319980278846176005332208812263594494613418247147880020824350609068631094848773453555767194176375130551955024579847533272909538053229414919666562215562953828853277319932891469891449864348235773506699080347336692798135170767237898026073928509078083522799432314238045558318236356630901054208821657403266289016709710917537342509241787338439121022233189923395432512365111223445870289393844389760297720042408117256387864214110431303310772503328178054498139172524857044395849959786446259198540927751382087274152717534663417622597655155873400781636022485357529214921509069239315147305032795836238400506642675109051555046531374316386150539361466631336981038762310257402658706460793504629516757992735910090658627289842715582581777468767932817755751133601951058997865780262939625730200416733632531009127530693198310451255530983203138801173602443501826599509839465475582863209679763512692577634171951357687767633906365815590938225372062838503093651434984909923460986160232553148281772384286544753471697864198026315546984850226785164842282386939795303900954525231636184514127298741031256621156330148799121063937253378260375929155127051468971617146982012736662486104262059242156957470643432870780109314458684471118294747926114427350795873220534573957962583226153125802144310767184071449881698920603939371567395904041149221243304899756805854356073199232566116798663373051606503834988134945836604951458519361767367192719492052567804786814103041770053992109477378848649262588665960270782841688685449567946704310549537914094152618776580361794940823737166574755724493429710206280864792359746528980422326566207285854011106750878812274840761611119720952750759732979486652915347211428893888753053111798291945688921802311286703024116135231919833133366607587881523138881975878101649520270180332868668055555585861714953171226624680405272722229622030359793575045008825010362424820075966423927720502036062524126135842496808772743256874048460295982341923921217552332756714754554788003397618486819087958554121591611143034073676805592549983232613740243952439019760227135580944518763250493595773995621399413066832379538980679970752094955251056393448556516433620821216953051800376124077632194196349136764866003835254019220960716721597196898301127540775761934526908817499259663318585083378733645426378493379702783281748733297730499430998880258599885758288273432378367365490469357844764782025375131060509757804798187657072729252651601598479940960647464837962428580650519604602688544927625189139114366348920109953556430048971112541395480410306753506523530641028379118189112709059923277453885815728536750942870082302269667349821775562758067065417664840575689876525900726524068054438607375272147639821795121128583544383022536211303675189401371635285780933775805464994046374459107975991468159897209703352997829719528674401592534406761150063036989948518787131673461677883308097103956745768048586766456986907817224009597693443210877687288161804516665546802336333204024040143796574229829162716248842266573874422074957985376122908234084581045442040950488100310235863213517174588773823653805040636158511449817896378955256952015853624080991870439526061887300887179778987166321575102300230440277376364292135284014267402656894843489129334884385922884169740325675807733141771285673189275338017797462996263514093503450205227996855054773236855118473793415126821538126461078889657948482124727072986754071852019923783915607514923590117393516601901213875528210781702454925886178219717371315483775010432930749561562411744202889383648051157225571832119639037277751559884516066261682568561480255523601072981727807165132272510292555764172446427155768117569508063751188632475100897620488558354841080843182824006998956704639216434420950352755356441241626849483847054089384031678902084860709205101511661185464256675251344476989262628758204949516033487024645781943929761355238032390395789257552166044392845740100331021977924130956586790286598743056265157583790651420678249315612439964915214479534791515648439675571265906365528997270957792889558976486225997988827815784984940939678212921619791694172860276279238079273554643713342548778417532459598946300993448692691453308566727534186478712792263320860919581264872512315585901265241535403751339782913774266512059422983450603782193560109770205148558094074444664932263152372006061963372939697002428953203413319628957470339051296211734275628791508247270397539170453872555434706551390532505413670969335070662327477642892655912120084783950204141827219474186410638217624864280562495352872633617740622029469635876614811376657523507009165028738499090329916861441142370875948709800055146754018224651668175167260365892667070112570958975603439465164322241274751747756226569627133777114541916302078810488640375964876242643475792793931717774460947594758217708177462734421879085954341363053063729215659958076563207535062668962083560777574441763528224583591809377446103669936200034785034134274118740206110730965435951384023436401523335330626181776836458811453727183816890739828723588461739103031335924219311105764722995028333567081622653964552134325120975423141235690009674087441153163607222565136138016516270487923204026484197902713586403464486728141989410300683951694160500393217528489420680297577995265226547592352414694616673584001755329390727970639023802250653940472522796495651875165500767081228783152721508688116666844562897865172466717695427205881458739427136594278937690532111278264126031691130925804067390639486818624003318322812410361527475076160561014847040403530882541071987935036732636696141131685712000715420213478258064389440233443734408529098113140578744969203599141213332246552531525111134603539652296632480663837350765125400688809692932900404351327831503582564453867359319964097972342610079534820777600526227144370651860714318595457439254968597572980973535584251096141559311280798796169629264566280555518839808709516690536285823080751655537527598159132953457957022107873635587612547032387294017439437710470131605300850780281146082753922937218778854824064478087254856062093880887492898236164001408135536814193042243179705307668591244855486982317724816368224096110515285174335029600458270980713795515042485109099234084392563852506032592213232367887416662178640475625968481829528361140677633890482179919213267215359319274654612121234165703427072115034599183595611049519063782193629090208557230335406304882394888787809874607852302252662194772570273150732620852299685916386753970207591953950172130841791366865005756853348687812897186215891391099874130198871073981603304456755654069378177594894976408943730425821070817867446955705611984226721128139137871689169640950374276381396509208687515499686624261891140993825786637397455039655956091380894382147976833538705213122250431989303312197561533184696833098209341972383159235763122027546467301410840358471969201603377016768029223459408715645707244268054059191439589650346019765301126823732097977035369962050580624426911311118013569687982942224698589621954957234392000424769348296180475873616057450402198044084804961650932759794736167182580192581966161556445110747757938147627913741809443957951829634660342235502982828336051435518976121646327517912845452718269079683968602575276472237400226445326842804052571348663523657493045829211736116442408762247988202907130225156911153141365176998401314368875766893307755462083143277823822390199451326065295729268942446678809764096795236908844840204893673679270141684476270676697208585842990906087624262221101821899376867077697359075419521825904141949648507262369022175267770306410594346284430554762408497428089059405226789937433696637370370376436989579763428907761520558707343041110086549541318682639630464980294204879935188147522495454142362784281306034840793032707111449649287517210816997293683506842728646519532724433354632184768252036788833117570007692000508523846617600013980003962264434398893554226449839059577794439880779027661507600618765566109008395419105457130411299967579692421193203950985927048154103074239678998415606198815820433760205162174915795314317809145443483112629033724455099799805341801442606700092530231100283049320564924626645098243373601927850026621285869589515862124518226428312630128097158656199762684259282545779679396371900086347984022298875932883433843071707617040489288983161736013310502485209440588476715188901434407855698732783640243951763017579266925990271757991398685096963801715417554821510941712231029621792345010614986972355598822785054208001082571398525397379667164505607736285336308139896954660033795598318061794707706593079205574345396204594966957716116236915460199011490009794495228862665221230354703705875336088986352894130165735238837563171181718017620659234959753709038348449560222518433040026316412568322370523096059353357900853029854301385884481337964885962264461894132710360513421839545963522701126518566739074167333039484854988631600493511159082387546923544609782941313638538976921513067429629815147620493410104475974946020002738401660211421960478864776798161233390511965053310327714505541864296467555282516548231801355751192939904422975559592682939707046532422097506051001489994865791446801220970607709869958667138472074106394354256154070136061801008628258815432278795728524606926880616619264483453147910500395073066820966414972498202282413913549341348101818069080228681085351205561573655773683825893013540883359718276763253538227648114292747610648236881335169045076417881865831856554890528432131703681888571678244735907752988288546747596853608293983950169989943838587185467496906591739849743126196804561232024694979853859363272072739872286668265362747805242442717814234021869505892774398562954637171795881951732910361337532197906286786001477660816049712232144864653275512200281887088223637135790230791931960260988030396129801126125219617855854757988511723037649481544249936323234197289782468407753390493127450861609799036096982513562097752740922091016848436880256657322728930132455339105903941716449723516851217742974495981262909091354951073969277838356774967866113808937226463157104771290998710112107950798025938307746758731762272987158060773536502398163269486975890718706361131362180626576464945138218066179408646600589125732447488386193334110900950982665022870829538864475485782771259761948242196104544312000399415393607723953575241692802952095546827791199668382444934149540326908800231117948302797331488410232314337440356197486329760533756100653510655466125087955108596308364945922661385083998410589330198782596753801401790863811067276076527112405765055131444840769388150872234732337061337911109057163162585160314130483176486301019355704342393908266593431283695540322778128640467038574822183850884373185969007921970352690176186714044861983776865823102311159822457833121590198600912364589683928621146495627687900156506674088841277836598258140166038607325321648343902940064072898788630262539483905290296825307195168306751610210751991775527257765717394576519714803182637472361032763133984875468976461100556659147471971479145934790002067644778546835972018702283484712698176140923433964936374745316597504140332908216821461135666435188824879361304907253366844607437439847775926316253591397769605468542431243006822281530318290756812076290592285625978109059044927157778048288742439372279393088903692716547531987834253312733745034208074727137832468791186450173615422896709703941930271038158639291491383254570686933238243038077136465892469450263586603918035748417198354519747015878191994680741452417889055778556577688076241408649647564261017866546363289321317374240768069777521287728970201238884050959856800948940757998313311828816711593610626791600634275379450052101684656247528893432189127124556945300056928729362701715648005699122349943036984464535292212873997142268661252618183812035412713548976732079231269552976449710087096689018251380437754598482512432022123949299464159609649010554776180597646584909181266179225814425694350229649859975704728429884355083005191278185968332275373938559859598917736322377596033448493391550541336980318077672139008358605861214803134931811324226282062750871571886471882915559277406871988037436295473666341369229808996921766586025414248476528608420332600578183846260020672634506750932980910404022355532708370047250641852804407754407699636832577833929329871769109889872657916899283316415583693603700166079688728151993663933415985093813773765592881169774035735456737224591260441789757370945480175029598826081361356283479049078870740844472508855494941847964844848025662944922591987291280686290392881275889058469198538519348479677796475402449370323494338197074875613173449596531872427336256733226734090169814111363318134729051747378385486990256687692075292366093144612202229007978297917375197501162314737669356498101038658320637968543221287028059264021053318025081523761695691717241368991714414798165444205389225351363444888469395051471121043591947293892840791498558960277848953892283687686927702519838532328837257618596280970433319182537540565428289029136171724652818582558203243155060790062528911781967089513848556746742097090388404305278852829593170599210449309961688485977026455426577613764880140119608502369921588362858238443754836688015929087135510565421796391951973465695520172340982074903011218775436098227451640159540863104074727348160838112129375382692312986610748943765097127775964316506180354471747468283952668299071700747304471349289794952074981371347277747071919988585884292541677405399098100298278758290664824584225346286408235322143339813284838582100743798240457910893433836685017304685409676367378613218898599540100860739568325308929738689754966945238396148891683766747912531327861802538527606284878581834179857169313185177797375153459166243969112433160859688313858784521147258793001206164115703593256560405476876198825248038508845693633181788590492128141014098788043381671553792126230351973841667925385650921245888136235712098082531206291317825938771254673572757077929072984697667804471841238967959879087748606306755931255041758935863537399130705518655351637422128473323358520094069715880724046805269794768788386377055230856656372263859857687436432977154739669085683578556420165573490884740671439708576348354921460461057124487370427051018422560826932866304253297214515657835938743929759304646387841328301816890105082112689417311453506607598709237540928882623980532323272144299964958067441759003235764190619727335231177272193638116727808980714259589208447900021616496416780327276316170091195478238189779901740581110429750418261271340260537507818172069323179496852878153803517526045177404576151650685268739493319827779446083341329146921080333236115159977503656560374773708352983490517369646415572140432367556017070928002656103417682839806628527839639194736290150353455137191894757888371190127183628152063142739628577889901611104219628152538490469457369643863406360376841682851796624688186426084113997258453522316776687449149571162880655920381150038784618688996385342966114250255223606685494132869277880325340084447237777202680708498721277576132065833773944136905079198066681189683152768182792599620557337647616943312240641813977142096762723330863088264447956671172978140793772082029665371060377586490669259469881750307603652510272438676512422799740522088549788921081652096476462435665411509322722808227966725168854417598540914116960978741279164708757721715358144131917057283665650325798443258783074002720006771925496330887675273895067187954359818564554531050540048757754181263319996340467421646523490820057580671327564228692466707882009779068310168702761909809500700800706557585355642944144094095375357104883330015431945546075705450362762216319062178825442232799925321662415313840825391515984899523889241804109283922095513214377677702882592432946256729360799677457857008464868583378224404483328204926983379449776799231899124266879479926860969638774075110536434373495394590555543942773736379929268099458623379895163436185289327349306168725606212567396036178825755374366126760038769582191284771438866479357371169048457695285338414084131960296112978759478933974694017325346179477462302325632393794748474312251117649803367796098762722253600713477557906675404272745182442634973859841409169698884593859035624029123265302461261940427340014538441889329565814908142896009654598699731789490802828020932019560540423793734945247271266488534619651132627111658585823591347908085390584396673443128477823526544286556905794158672430314788553183958541220655614980111502457797082069183358131729731993331220240646587814647022995206631963989144024707192894005836611809397324928310029230851436007107138060655406719634949283885715448257434905878951365285785257911038704314893608035785556081793198168502101694517205951561950462208370513874245287783059344603833882133431085506274701858318893301514950258928567969345176978308469176393187145851086515133163121250809310046653954505138456961398399532557332637007610677376427256301679302577498151349378930675418875708177116944098125938197968765457284997801231045769770466354809648269040363489255125163099481667483389527885000734251670730896757115269078790064491578843843710443172199180386737004080494986122551780899839624455055196504328874962244349201746454983856218397785109535485850617025600251282151683749207782955877538873991428586072913693000518361349860903973573074335666917765890996286593072379005581374263874864604274781938130610940376875354714152540835649820116175952507170597761955531644857686294464474433221346092476071931670229866221546700521780387682960282180912389971135224282962368388717728056164279791119626884714515489205133551652766940738302773423366079447722920515608630829163710329486178360443923988990828290444394121069225639120039211353517178581889913796600623576904275182253551444715506760049851298006443798133726396165189194213335980379385669591129658767310866476623762228499711696475308696253816182536596669928897540301148429069434395151056037801854168903031194623131558363043148574666989091453099366392698124981569357577634155281930191224634080945994857263893987218331904325339028403451750260982845937579023157998455640876965161854633756071082058512519108834942625992521820325178549772567171553253527639663370346533701421876301656539425954190744134496596238595378230938549825258899759392163600644767513615132122099140376956911507470834547851282398355942834114052057612419739289014828003614112547200661866904827400432096629895848024402022705477432932506406002814457779141810674869211162984167522412336737715123345473863379053595750523595237583221517867982331028080332857725157400118027270673473718913897322265396100848107675948751232166404934776772785762278245588806466952549338517085423269718710568273647770523453097343237218464203787654719274875509153876822565843601294321929591406904598044748229358902106056316039680406890923070072382907731654514577166370878075325547512678221699527284263270903479320608622794646384933252552091954914977268834485108643898290385708497333318989419273855674825525564210841639582629206795398050528259233518798951193782342149303148083535324221533821357782614948048513056690045347675443827241248019324105121656643100682526742764698330843210894306386648414902564597501824123753492276139741097469121223955232873090826920022988892937422175654976058862884294185591265792257754571559859489917468516186521318965320208246157005078908561892901433785529337057776867633744234390668330465182881760425909544174152186324843241439691183157574101429274660106440329740055824265609546124165001064138135939365047991834262964380905711424362966688063609826256546030372828237905923283165982636261490793726438120440076597052890040031503258260536536205100391497610771318136409064605115346707489568819624285493873314160933701859830715353094302653261385655952937928655085417802321559236931126838805323087777209377292085119713795257877574497524266566298289751478175822563225863439160108093333160963311755242607735845676229545752285451107589353859628461415180510176486144091577759505668378531668209033632711487539225254137295335258514987255100052770203952587202373983608321348627848133303055404792074106431213997902255772212801038740383627116019556254497688981957917299132835983508167925716023716466579774565845654546330932426162939839487981769113949952405033427522460280556467074971331856498162511759726394091600833148889816169436308937558640724038118229035190720835782846830464477219144853837032700087890938585229443048433358639859758044814646502007062607482569545561943509271471308560528984950626721293311480612698663451068320924244885123107668444981010042156501981795226184959349772776184864154243777586001157024394132710328762251012632947662313756127261257483886069455331563150792710836896374990857312669196175648843643272664861712081190737593390764284670259430658760853704143339770137462307582460666136762015292228986336396552610226092314055579380143772527008042653107702450300314901166168183650962632970122186876904712651118304599908112440049862335790821654205305118674679885010700812170720452994953431539252234435945947984403890356629747190633129615534074575603475360089244757740295894451234573029257373871745984596933376925439574514891987477146762299802567414167556866534248134555457823765473140027670226159506363075443103447742421653260330187496152483747713975230878824932893408878163036344979159051467648201098124430066673690596652539451582595158156824303654239694750128379084021703333690234123510722781689091283719370396928291474662732951299670729770372314563129522730959838100088135576944459401874881895607927751418222799639918507808588372068121155544427511683563321151577310627281643626986232566893961902966606993455045888056937253545954614423760286764789575420896591974436912052658146206740749320619073674071256281111787764818989807396795940769872160158760570470311103617995075213221197364501562995286975695316750889735187465955473082641104971970043774610205942470836166575864860457811853340707902518485173671816817913469432142326364091571662246257714869094556304713181259695232203611733188710313742069148694014575769289073216680808712791112861538658675106786768751920141548993761540252940738603798024308397965039254560763643115937577328314819867413789063687192051004835549425186756883243172379590903657511052629527043370730781991258212537721973870229412602091149262435317626105149191573873119037490243105816550581839318839754403549859651218486689713506573925599497652995743301493745592916687647304794388830289575237448308282935436067860088158673347379190615378176873991907766200959171352801910707018428326946264193228628731913814677409125941370604687680871165842715827333590772261921128566061432116061312610036340453521147490803619063244257083130683717488461754650177522422735015389227185450845055737179475176727849578015311847512251498107999676643657180384248683724836736715590057995045489440732138013604354371072776336482476719712092629067484663398158406099162461845053712378829646586305413671986483854003086162710662305763053601908508928734928184325813311683793775567532026835289960503681983250938681005680338446698057345682875656956447490444104901848526816591199055724768391991197152735584725821393781811932261076261720394996027515698701937356993185316725529272764734959804515823577169814753949325012912683188737664547135539681304526986515300267821655120010443825635386037065749125857888025329892543266164661673351259353817716172418327703882417542699972864591944078768259492168527636914384600029815830971209073038642192552776677180479791728024108310587075634652692883955889490443494211905362823021329127268402853495587233617930392204122992179638108852313139368508112321750715756651092525453223236788073365842427726078743367812580588134820064766666450008799067238241923942448206043064963881804659943550794744540877283763865340444990981377922021979447754208364955975322026421518654441861817513002654066920001868404601792763266441879562562968921481582958597133410488864252265305773990049954216356152877224956746245369456977725360660584101876492948093600375001189349759058618822623103442945273127015222086898373893439626165778699313624223270761104288824493453594978511830036468889991550997466875926222255191971080147356195992585307552263573781915752581071349082759285534824228993241350405605070918694296738537054301371831530642403024718561588910057150415479831344815684932944961796939788882028401189795081678767583553331753715833022522800698658923279574948633035400780972937841160237922797012552542839034918246290082473176344728104109512438057077534043990382302934887240157875848275866817047440040775982681368415991792498352379646154514671414925294665790157013628271750001613165541010235136400449735837190526271394537141903247343046758000820971635369670996930254052052137356419947115126731057682887312247818025738242946063721132883100001103887623837443038153351783913024304288662338933960226516807101751381248693408794816667267289575913059018379140824602459377546039544647404539813204449398242968812578240914097317963015041538331781537820220173991493927172107298561245369586095237759686098737593838386456167883578638237202183567527363299989456429264194404773645403723633588340277608248948202964236512862996935816860756797183609480689878794277863150741659232180348258327746654261255443566796921878802598353871927783039830524821601050898295309277593686658131211619890619471319198678243076317590680643702846975032858277011080068225615011638133610658461761767891572275448471835820666934023724871200864804289791959674277579979009307907328317614691211978167299329012774528289768099108115156080083460832683759578719522238066287623828316683761652726172178028780282033794290357749656096098868886282871200457153011930539535333153331773918943256541514469112640085373866651208054215873814278298845124911051879210909400020179954788179206684535747899194101228896725865526191887676588990212003897474148970068827695616730142743480027114122126186877542778163413635567291413143720696066992435721377297340674146226024616151653983702458615021863698371989074464756111272796985464293482311979365976016495205942593954305494320019731392012638087372702443805008093142356739537387787224536338358764119904869818708642225851706775318309995998980745977754844632173025936625633620147814411974193617101883549121145046499589010591323421907819045542483543464435567022322005229905165611987543029022266688101223759222412397619811259818640962238382845294986869285388143261605665061680088886826564571817009785491550570688261939588692512780241696866844892185055944195565719990777353932152878462093640123332309266659896174112322608832165528644221430068671925185991229981748192335333320514045854996096283222475220562815231737146057676910157879955338974057982887776389324204211754861288187387256015967699211308984022142090928649165026167290088603137336630697523247953804802994208151936297969495101681093402824850245865871712342603902442956353597106685957201682974341738563823835413108841211609063338194778251714035031352535661196935305242516239734872345803913508358094255878963662816596907489215236653362378837130710602560503226804250409583498479651907959593103540780759210089264355372222632116486454577607524279728950336749587455804784568988050965100777635672175743211209016123835912697376805382823266177809302815277236037667869385924826757258998833746624320459153835432177288092368120574519626902675884704623079083030411576298455146518993510411034097255096033867431442794065169768505224039315378615814412048137107720145186833994497848162198808871017545320619259065093522314112415289913097114230741214447978321869950471192638814255801518542648556795836210013638118481335791646438911844865139162211364936210976997273652187293516654260883191700627284404123697374700900312402695513955360849577979169413673832385990648653622541450391679264613224491556830284422483761687170613272327121251814072448519448429946101133450561168503456510382478218322789735152922460033281449370324512715222635983109639894743985357728272735445976041020417705252127164357192619413517858540277409128753585956019671378223442204346114762279081940297339685005439371749169189495424158238758413642736854982822386811856643684941434041731125555156431295556072116732125449097512476507355152385180393137256939277049994402840370611947862687604529418089265522585971658036898262325233372024402091178171953781114759206421873294321148536834967335487320637956598624670275871827375229282970741603283230737112861593611930104286514059153066265334697902913333916612747055993456035938229765076959134051542887601304146114832427552158222523483525939860266628684891844116457919724603959532510121305916572295367840335200482694844538417838394291224967015494891454495471220941093609302042741818279818160157478738891397762045974876784919858641540670346773460969759172059845119479425222560757844753159055596735697131498485372867385202761534015029180138987166826346644919620125053296105013815472158749703947443874604325718475800687879163910419871213906946556714693630923964861904514301956859411894896304712022593133441048091171772302995198569804349655474603772124533165111013748813372832321633098424135456822605163348771856367129534272056437045579368664392024297636832585402951008074626840260133839287949154354183747332678613199217924049497125699454614695226159061477616348810955638017739344253590351908889806561362256380827179306607407507373401946576758586438000940722459021315283850721584314401693968060213931229593662095737807115911252578990861127558222024937448786163954151285142086408891558526362877594833359657298399445419157335384767224109940979825587592257908394326738943130144893562919909761313288093318444824382893784972013333333674738130770052342930151404849326791735902009243459674735331363155328828241187642511207740099306851835979009773126367231432392298383873973860375021747092241661611298505883142645931652999257529660411191605981684769278106070946207548601411779276393425225229061917978031219356105767201925041232932957198235848516267551166201516932661786263216952600718560731326702170728049754137330386371715586813095912889523476416364455015897118909310264521362019486107888790700933969531670991051881689461651945253406775786101489660538893008735096865663295435592575376977762481097755274730399768426015904144453428978641692769821632342768225760687641703091174437891269002680668342614936163529408746959339317241624340976449581376261196257993075609616360410570316648265974291054925873035384347101137624273470882561994645079909022907534891091348659113632722626119062463774828884917271643936769668024313717826419147223818414572384035539331172008931314375043283708451386493906791844301007327817765013785277868975325625667361339840310859746653115697355292325201554540716391604384019860292944110586759589761392723721741237848026612672769890072664750074960984656035201300439815501530928227604207949001344245096179363205177517214314460994696423571992621472395949395506267811389470863900452956805667284087137095383693630855756414264884797426956436991008774337953351923677384937728928707353170626028585236839723518610545874947569317153938800374135199979363039992907212094221665176363202705624836757978393669198925347719291994761778520096125020776440389771179547311522355179146702740910047991852006262979086876072365380271588781627044944731430686216454504602766460077450715894617373953315781549849586557256640697184435225379553403271906780969979344166616661124543655254540650894220181740062617094539186471472814825119127480309965973712051553955679681541892910407091298444969648509885265476628329660525113207150060588245009853920094728248173379357373983089403402074890608247192132442842982242651230203227058481855050540765240363605939857695000505751859573529080895790681281454259336383858878058559537855023448593243738537455402375151875331192437702787722264413940258781002365268656320768109624649449861298036891646612445507173239236367381980345928363035752378291839689787913425373887372809831136314202005569119497356557732845477027349096207179006681554750510212166195918645767345402077340362708537020006782537089508433561751704736939617060980831704253340711104007180886087182472097551625757177087186996826184385362624392121042870671455063624470634373707803001388645454938575548997469340772823807544968917473582458485674078358135541542381652907967627024862795469525976331543469323036534925461535132788852490543958721314850126931109914455429914788919516759342475398955417619289193244921055425974779430291122251578280387139847246381301735162439250418443320246074227512220496511584628970126723468319734073636704266284398990557380476073338219657595125946991841908716069182259929733227036122433206824053490492565809622456791211026443983922370062944489050291595369758072402618022462590539801669534551814097099458609672874130015460863462181246018197375088089658854291601826659768428928049106911450712816601570414436230343946001272474144493636099824151655277304561195765020950834361428146078454766362086071267813076802600467135961160997135028327127699655589077204405330932986721482469118017850492135140650422590958969973878810043759734889238533349338817608622100273971807652108231134806989329568158230115525351686188799651709815860892556201371080059944037238716996341071320748956840575499480190736053308472269874043684542751726643984943262371797277641027211076496080328767857584241473316414255853016984699549296353884445873570981792171237276803183528235582692981119444261063471945780441920139550696032340609995694738822065912274897343325337896461464670483602013047599122033872948307546038259575235367762142336398365970915173618154142378703562691108191828190107513971741129580610642824863074757164441773723714098492888486083719255322817198719559957897617998035680061792763738824705687498401089007186474967061632102062802102222962722110037290632838049471606112516747053772935211245384576308551155050349832376400130607239205332967111194554394339690515566091207149450825467810879052508320542276313416164865045960442474420777528981707304810529763910375364026035425157758011189482610176590225967492190291501661925962731073561321760781053419503019495892349591697667992234304636877358512664823701512737388841640578359715119691842037875879156123950044585646740976873372587199616710190857551760359886034946017800131119864242497408023520143033246477366902141183916288494717033691629239653984377915986357162642726660527125754447935783419885258944199021716172067855199207724718448342414243670357087909891393139184447062349576396218197228743971315033497566396939768713509996020853114971702326494365846735350337978387450712551900784579016262959097754745111533504151274801018119815501023396766173410992226037040791015354920759092381705311335326627362776951073221604337480124908744134051358601883218167191791587211618953715013357465194263541563846631125738284922452990474822308961376869899204759969106800030138287884965195582678701581515720568576962693161430421589750434401258866226662907040120297532993210019931517919936168309054373814847932106019202810640778107488082987117719839033219388398058857347088071965080512760590495493149877875083781764930209440112428435312012381569972292339450814679211614973241130572915072256713856920439953088256447274691282878662825712030965701448018138535324506280403411184548349375230982363283253715935580334594217207563084529092705355311960383225291791165277549295028344374826346717054691547497111945395979605278903363639670391687246933816333153701294354403763509195796322869239578205665144614624393148336271428460047751122606238742705344487455570245569949782559039783254199666602450364342790813993318920086877014161715016098597040952952731654161464165787756652667054357614141289615495180957114041496350766007998639168353186700849595763374085950886823153023009278966205824319529101648940463580399029521185239259335459496956206100082390826763916451601418038841841302506182494159211553586461777009270990339746998065525484771473490601645731322159903443812189640701867530785100210757060478364634932617806318349616544584640005710171971715561642498959535557028047254547014170630647790245940976613167098627700777446691387386167496305169830127883662903751579339171807793727626082284570829074901282163457421029469148143240853071497953897911867073808142428747806892371065171070452298632607407089416635164471618057010282923943097870309766029146849167581898497176336222036140746772632033872782345969392908105772157451758249475183012523533022549207372417576085318863316841095935694136003624375451784560681105884399119683030576846523583723402833965035330318114886367659099495983686312465488887713678597658356714557713253151042302371249094687244915460898992443670916818496210624480689480946205416309168781075433492562756398031683590590617352812080475226221480951902083930213641680332174214231623841446488862142297605328771136410856426422836175045570667772345623265937112040556325381281417179427110842146323956406724088795869672887293945432092766396168754831131060376911340619248986773358662868025718862125072060657202061447279942849053870078065785102278097111618733011110916506229646567208661655956260383154878964513253331496913852880127726512265503058108911216497639501482600472778580593615586261144484846803270250429812562389713151537130677604647548796056127654927852819871236100192717321086490385766945090600929193035156925973472268767758960071396124736445002228217004890019350062457211711053086786387308435433898510693719219819447307242998377331590193014105062902846037887820991100422034850040446250050752964074337742148164409226223511907337860736162198658781525077177100808093919121006894167796423336638440851965068779388257919473238172179476194181122949851708241150588547366795929113211393337665925990628497100033665916251938620231293264175108786478295308173396438956483905993650671122161490345332990402003588847950366437683119508669081449225230498233901332414273191435389805044187479625066715024190928030536144111276792583288927931734710326937066856334855869752947510765458386084817204981866271244223780810439812762253361900224778266240313415691136464775727114031857800242733046604373845576299587469586779275065492776345185133009150749867365826093849468993213328524500448142752258196105526081133503849856123568380010785493708079553741355602652673752213583300258842999651826206671094362822049846255123427357935256683885201398133777212949854579239737257518322911852269154502645519456419264677983209146519983735802445684271969282416097985551231407085604791941103904622490715075795455957241373863247788979479268736521245594800324315104372290283837153603283247971683010451580083809181610134143201715850928939319447510744350691894379584407558494367442099061360799969329076017454410619735871062159101229942619050013007714110338448863777148143376799460071236092179466382217746635573593628327557613553774641424174723097042917609074363039392719382903609892662789336631762963191383873955133421554330618904416866163751274737802466649559103781610987226791672040804770992480741762784374533969940549758997183381750189735121037291268287196744811839003537661502920778788552946241141617493753948137005053269085122583245730246069962567006114848097633107331157055423444057651561244777420637552306640067723171417096758931796126802018003532876585352156247051951184285538738386013540164082177217735400493253876420458157386217002744004331938773040056904627549825226871984084588585185847794796440029140848296044784288170561315330554530371997567085095271402166113768715824670390121848901447270558529031610862094170273517254429274199470658878285324677512954173702869036813664418896649855564857333438322608269150934819588093729282116309325452445859927726310269670320455190437934826601434570439683728449484397780662707376419508992938998338326584774612275345334637449372306157544127366101636311265115567275929534390902086939067698156093587553184104624218326107134833193169479009462003047857660244683119078078937337763448227453833344253270183029795351194041424968605952063385456901343747001409462057475733470091425911812954192319087770029248302093276491003256374044248482425724264905225762409023679417771444090403927604864988255398186222851191616398706394241973883438613044305147939798434522002465259573906740655534577040252491236185697281447010679493638099112942412232509200489548923933164389642085247389458502615910246976851079725554619471733446470269167284378144515674747202861019027767394201874531038958365466580276935658735381406203139808658686499156941771042662197397373153994012608996190578918649477902402803295107916186977943900690852255786396000818606320610891198323891442342355118970953142453205617951408833476265481797164484265983243029586424962254960338077787201633784546943288687832831519439514105559175614792475851934877931441119026619088445120233831846902213327108028862596649124409011263797717539647896550695335267503884557421387096964123678494377855232276517238844466944885434110865282935851655003810498244675861381694391477279580542688075751112293723890710860944125942619840279564063344522538140656020024043219646192744918824012934938364787861490866357352985178784510100918077363110948358875863246459440477125636722578357063589355299448470944618086833559100035784920788884467465070447379302072567765745103842571715463323822099995761403887264337086330812344233921271772498143043607880334770262309778147971496088768792489408868038844851910718505406645705503608414091183386457197773253023586447846256516352083953208720371915820647418145553061391383412724208282033067634133272500064336969707922430313029376548755300098169071536567162291865860310631447356729398304526624112464627874721413552385059812445983556255829981446796211314788277624469951862916787521854232171053492587695806684658946361878994335584475975865441335181261260816486023533219865918626963089390938552107441527030094690110249452219641686758454675036070094042483457517302449826521248248864032599462102548640294638475463886167206546712688809363132670089895817481263643443372817194114203907745063549884431844574105637147811649913923567663330740225240943329241853101089312506851375361996840125655765817077954001740059635679135831612321216717003000273732976479530982335928828359376961158998861980313925939884921530865967765853016529214292886059248936622400931683714136314030176171753295298577848473026742769598694915454323209266599363551701562175730382704622591437902394672881375513786368510775677129786066114865235881835022511543411017658236759459663167540794036257132268833081169697443432947782416954767287595664421764270148612429815733515271935033653787740182165649212931245748035323318536045529660875090786719263795778474128097296716906677714195862829234255176858660228221630119613559174812519595510532717930891466305786139008862815209904903241871372287118214417138040450975154401822663484025730744709006733173588744282886571555948048831150420214652032880057761568341678912963648853333358036384340527539835311498944379392051487559213318069200007454486801151827060321347460692357015806113227125177422480641809520202016558272009771139495777649989312960917319208541600479145354485703794637778654714071997742381053342027707762335753974848376494928141143839074740057643472331725752086569486163388054593948032730138795955763092117788373196699605406193782291425193023562323384044865153374746458972240782032459037764103597435222659747942417330016428797732275642516422665319510274273249466120301144612164027265684208174988048355936252856502261603630239155102606441948518847127491716623363525191285137113825894166740076521160480213957431910626412431394620860884199852056230172335566148327505947842369192121375123758802565259965412323835992627014095261798804665029303014486387009525826629385087037551909759659523305170020629324370682579647719060889881865928677838205161835833033132220732719792512250633339854268402607979868332769842398473992952122832938062260146595564174361595078292290416642214770489817186785724953016880304701941844552343827512034742972344638732300834136880393789176532097090340325959669690188118961282193248492088146025165176184223744288227545552184810329140784078608441397963373974208134313832804749000717046534956890243726016683503874500355753654878171794654134611283219914279658565856432045608746367288807992760566109506268053801629600699895161973055673500881963156117216922212527206576575891208019751645067231153001678367707500595859387220347947027863835787856334572494758444269165648128824477026296763709445351838842844211216847633905840597971977162783024810573096690850769057885275598181458789569866832969849366135965203001257135930156230198701418030350696501095020745976846119134282441294415138124822528339554992336567100614646140592536783192437003015098664399348811481901366086687118274623569641701113449068626569387869327583875906342249223171031738962612011512466603735345448641639893014397533414719443989963048028541980755099680736246263787602658956022743832007633379868720906001625011406807572021007072092894976688040622599991013013242623140920926998247349760064588752288571773462209243339336796783231089156594945881314369160951374404519381887585828476382698747317961809109858530597227608693424310422652569512591436398288742176340605871835204659400248012522168128625020551138078213144597905719791394561674493546850429341814794145592881423777374626550764333749518718051320288642519705149635789850686710060026298170704898566644712505723826467486577978944811204674347741518258905824638011353730477361412250062744300431769162301037490846862149799734133249699804763847654060951157580804763865243628505101108313263273842138972256216729069112630057334769676022765569485598761868713192279973360826764546514712793324573461017011800254015409690224871249540461642889292954024066546882836004488866707293607223199780985785323101901721003935247335343933468078160354675160806549093588154971989037614323313969099549376763064289941383614231152216246042648068973211694039355598412046403521339662921645782251215519361613066952146221901348570241399482789574080625745071940984216454642721329683187807191280833471057259381462892772414832037384402237387754135305776151654384055290120895400053730365422882587026231232083000575502266664914636571625825345604156502260854349197379053717477805665003081417656385402773412213779479977041906556218585848189478535434350650227050808505533493246909467422776671783756219851107918156828217877245740561769891592520104245944689363411780889940492614050545913041505905984000161524229294907533686396986596524876318249650305973523113784656246977993989139628171604005480306995897205330413322613033591821433242964417658982465778248542696910328961846847103872717561942565797715890586416795066934238704206277966136977767285071426396738356274987586552401920272821715572199500480035577680819193484143473535593506355034215146415121488943513895720245898525296900069865238737221458957911430042349247980753796833820721986910246383091269558364848922211922168896315633519645051063386479897697220984465541266464993632713472316425071547873719129482976245777331850105892165197248655279849784880122601849579495250089986056556768949145292341088286206023691269164298910176474205147749329465391710824831470820534220252119858042224800169271226951998420505529772454671518930747866700951405502960429790705780786578663925487775937829899399568137994486256144739612513762620654475034851575160021484850234300767260848997623655993390624056244960276068730295797348500137751170397215008220011765728831738167128049541485689775257251526452364288344505263153798423777333691210146716264879168132600365844267494077613213129132495651155891733132913235569785926681719298694907111666313301823683064906965377389675208559851321627138726486114073714679575819971904998736377076358737984687595885275050907607542535245805674355892529610592246610134847326052553937198360596258493077939654002315126152131877818137932017717969493019442649522347252553226233394697762126291447462619264887317898574988819973612005921301364044013711714722283403297358786102723096499861081651173928998530704236175071289366573086075040013666275774812050620248846542664122979648052579553577673237415029436593498845722070737272943667710469921705497697880600016692375634726819650332222505506188545100592383440595727979442370324856026486922991485484348797822229922762356568836496021120805047250628876424217176771083395819537791899661084811691791240724907899978034245846227329443748158037947852498974697549413889814619534431770777259903874374355939982537624893738621228867312005115580262744027100422410161384005556602097491221466809937265667245805204175290656459362291759793295926555206281128075494581551092604452982520834631100550928037210957165530513979019286479274227214940793766253176215152002624367753942418065394025732954136762650964108104853277940447870778935131661483869316101147156323239952118478857788590837542494917832065102109898859954610070663356872505825727714929302409468915614875579163044436588828986980463942609736052795563468488178344639111006801072538175133942096481592894485504989898522038238986257746186669357258100325159169784678599375202938760993520648538106055102835020026337601865611433050760063568792327208384168203738706924590369791433271987720013085898247494665939378468452453973672417466845538665434279437944224775633239983751514963028724467836599142032339501117519593030735587411826071043364238387782975425187481398413869484212103390065695544675436932882203724075281963717176619413813065557157995291564491074237711039504541430959217876983526319634585951294209442120030594445308078786807228384809802053699151178948528363391993893391852889196092864912464583983414722220330051249953399767156629013235379594830747086253980744956291840999595879597415733908415244341632702289460102697089041585121206576707843875264984981059763813661253137436182590288305292693951006511486194574694627268620145267821169770437018692519493407124126232132397190179433392853667070895220669390500563012209765785966401779828980957450870778446934897964056866071936016203149964643352959757474577490010544440026573760857595174813034081745749616194499151860273776406572268149760320435743782262802651877602890822867541930368568735834824003285673329733971727","3675356291270936062618792023759228973612931947845036106320615547656937452547443078688431492068926649504871727226106159490917711597767365639481293908850963856115984810304444763175962178574185975388318964333860488897764303092540594692247754812893680210511085064625862847240629908131103403919693380566400462675698728299602761321599149107587048042961042220552902838040919625449936050294351743146942264128892888683833380476890687903337326526587960410487086247939283017891549257499459357081997825349020196212073119056774064748582606646289607010137726452029099451037886046760975978533837937874190988584371380979932437122021751741711170408516621964808102297564637974917060853941541554983852227034636334439725890247657133385108763508041135934150835659907637615065081226910427403280370034927425244386089223183422451757169813337986704848168521996064990893148967737122150904013741130321756542217241657859273647972216302156500346602589506083782105855073823077769119089880370692177976271588456568488387524505732721349419574122162022974356140312779810760102519713120687492445912896064094546639952130991345857338955386033618705110300454249994981639334615617229281247863772372537681364035850998024901200639083873100503180179103594846929030337949919420659561143727339244499383295439495573907272905041793621253918870527919636846672741006443734721795689552159916210532197682064336904851297380923187416385501264856252691331526944607437900226903558717060413029609354364319109456259177411913874931387938840086823850592685283678726629703723517894164354873350145707899394645556062699296553867360269308765240068549468323622470496546425161377121089013485822063610574200339043342453811315813397544967210137763910411864347707453072993027995208359656302074730167578890780310367322153382858086933743713964202957464912318138924510013300022247985478600643758109302643867081981648501597062895027281779798898052024373001580004753142013004822024584084254275752286600912694828278677094542239657439440602284311190002576919876511485766914367697609076687766537697264075401280152071649535110070816414986225232739015069792899893636044966419804905501602884983449175762425505297768120328746380497975137809521327332386160919150949682465347471404833461554669675643002538505667340808153511401185785160912490144325132606968086754460553915049674309660458286853401778089783972502480626566341713082901081678821389354122779140478768086145259388435059346253200098096721448498441968093638950171982675939979735041941436422761851130644753827353748001645831229554631206519446810812988682024981564686357424027201619499694202368928673535959799052102063694840844824277993984080590918287684898370719630148666617829659437828876049122246023986869726889881680484429645547057643537328308669719371235702607371847689639697560527663243604363749429382454322474161687049695160222273610072310748018734713442464984257274405600403208699235481072499236677469609951730854394623862707674312475580773779320782071461128871010790769336498469978014359438552831827052611788677490027162048223327245416804883524747565769703238052515115893367862510008288701508071513394823609070200040811993991264793287560469689685987078587805285725791739699877365284064966596288757022913813761492018634205944919934125726014153577332074768189372706470291638285920347716554681051891810973912626650543198776873254357565958331996171402580169705132999606430541458519967905976681892954627671718680786696185966175563025982386166134096826423050728023543071887422121726360887089984268785983647159442000081719909347317825312129264696994095107233287161912146073652243964674629967875267471180666090587046600626524142010340406227275190062024999503704948900822562181307721411363866352372656802232482385728877353908165522125658899347011018753066182854396851852907600732707133763969598175380773465558939664150766816825373551817682477333778964645420977544656514952717006102586320319266741314911102125735015867190239803157770980314890513019920073976493380371512213274596490417905566104152435756275745386347139817429855220715632108856492327228262160892885548989764535769511559066277675132920008751450403778774313071786108300296543705072842573891199709662881657937455749199490511782868058415110956642551600973062450275239070067844019181491797144284939836054048440380749838754493888791698092939997963066833572073872133953248359267563179528928205410025362397514282829991985735498493249489332973255364764237007066381341486875193839425941841779408754092800311626668375461738999986388668821183860807365569350449377156938078655835791347494468598523119136913498179303265923784736369272084535542594040535023406232171499064511062676941456716541970011137618737194080147739585872896911894787499099034827906685097608099487248148063665477256967647446396230166185451111936724419155016659767396853276581353896922425192261010826365933068569251604315533654938586079576332478530963418904499448165015860107170398651451090056064577273285913142909174275571377856574124618152545572929579608505465077450295742219611780663713271970626767431675838116492765215402474263906396879680420818549002369917209158735816150332198390526647360495381072888913344194348922971922651770268251507017663656965277464732770795075898754211020667515089488458167866853476789747718219377234240148723261841917708732889505249456348865171284155050238311837093627416143473981606621684969769241194729278688749523603100098913344948067845939801394726945948492006915691207307748130725231280680371063305036002835909642760751900306856362184388898955423418738860466314532960772867300871744542890442897203402601453632707481862926327040580070137490783643931443295011081288491162351635940284513236355773515943178463077006779224979448721215544590898810487519927061835986453032133916975828830738033621489792927419126821824090825308548629031704638311613215417047013895891973656407560993636332234543345654919560418429983538754330784449851727960823911285352997985521426798616710003351009598208050112813876747760125425396328125358739147713700732406136770504249015041944214200640555342315739830357641072512708753289730225308566220337701171966406399531061149762727799816904774304287386610686088750831643010643081011893851679766741005308494912015395692062138823125758717408622463143549764666198683667307482628952219387765574363929681529904799240191097547905299377441641033157486585432152671830576950056373212982628843022325585470696255678066250056381633111850912747204203040055703869100585796962884326821836508185017067767553864296999292044854575274260927403844753872279664214763380392334648116693133091634000460419845219242803436737800222568522706249375778011805507739906078261005034702525706476141043861989080505086250921780695721327617515578178913928206568052184046727276205018631451207224453959721471313825708845188010476963958205556930420206737538885694989731486392334677470144924783304497647477622300057061686076608048924873557088203931299006968783577156432252075588627839627515074702457872291769523526490442941631078777108474359601562706122486805693605462999871148428252502382061523079560460694638684936184680745342210568547103063656296856042579920176940952479754593370905252376383209497754622291821811558885426066107872554783065168224124888404225924170768276904836460869731353856365344381981566404403596733238067613041359635577110491284600416390616864947794637698826487440301564162766658211002004744611661919346524389112432732327880146259183957596629974167692570587322263778539314201649508758828751999466519441863149029116918785084921672749047682506517329407927622789175082040290064726668471135305542262468400706180966804147890366592031801894704710411047926955534039131220812286347662364152637230445789870219845802058675058703967538437568663345561550157137545299262930897323800957962787654273321514813748230445164634319958380464145430455409215670234129178246852315582042066745860295314358935189849343560346143184835372387126000936415469175615098825264076898004647313241922421326854473252154738471715019472806413070305732108167550263201603264664694469899835580828141201838414876234346221901283298348743784374119653496516636977731805196823466321763314179986669061792377813557843196505613371497877224918285969488250721170430239961554502019989706980017153396202380832263171254962975902232054502708934461898205614104549754426697482040229261723155710607249910878284227443546073654835561674672692014970354152639112888967444823037646671109572406606795659152657531201333482924504396861077454118438583131345897247055274119542585566871925626472377894225381650316995219772539866548280940106137958679577720807783504798020855560520507271484352904395398373840102154094332797189510160999494406933352797186804957083072124584370635026845645142041460874253982177870574048774978236326761071508298245869736146279803672701152171907503676510159059629819924163455126415266573499671552477083550165936452321692750807364085530568271849271550835017963483139317135329268323628142138497020953877501447471855679085944669874461113487327522019219706382290736069427150824155277449098249214030072919192627154010011035988302529942852016753354575791281131306490705109706353711380601736089630820633525150453703066359958843145100454180257727123758675671986626684102349012926294283742943705393923477391783405043519725096757149688647715277771244249948525452512376068795485739255160124989142570208077746239476982126735661118338156952795833653087760446570505421216605181668068956093860041683926708418504500696217526820900492062815885267229060024609619659077478959775417325629201162147244981898965437361845875981415331839138027780418713212710074707802927049739900774225418725116026330036220110417831303277780382236241984997138014274591281241765501699008014827264815956290488938200122126710556947754385324337357580812495643257124572024459416164346807561808713280493150011758384187845126009328589096128413443962868382102156907016648409956564740790910425238931617687874420016088109343188983064922620184388296028174483491717101476604253092996723264523895717074636154483873647184558138829536211028486883340068634549322407228523371270706722696262397557471523872199371066445063504279148290579081140546181819161509613434601501825899700801919189240783143416500389459451772682526516040481251282159295374734916589193353678099226345094468851629558805364483507161660118115489334446975433986792080311125763618352972635024615023054486954246073580953478039633950499286920759000397854669824319679529312487509550245821725169326298141509462337383166240076900741886936184338296602448448338533713506316862811471835970705788251522455254435594607494687355402556713549984466046785365200942398991365456012618209935467751993904152817620083933846394382693913541722614815100484345973135656222326507299929990344933478135958182862583476685611224591507122133319799138996679792363725457881114203339120708779136400147925268600044178159148171913127832558320544972089905912325639613860814060787186098701933626507085188786856584385176281543123043773754631200940458086253775399897262627957941009817654923473662380763450176576479354779116694844812370397166805950427551312017428756717445247742906952005209151048839596210984194981104934841167940119730740250850281696292609305439304679816823144223845005167700852232323027533975552064790762760093247742727015880208688756143164708605877690199319289076883129790652161820852983103020731063144301537631938137449864057173697229604569773788454430856793074007169615703083848403589378687307015199679199704544995022012742766297154394464030540244667143311150978329967570645881248252515920919973880549623303647465848330644743121307289719074942426281566152464596534407627221485335481217455127970443105829168711261602577001999253573277293265303465614544636751228776417033763022785259815410835612453156644266446981164635819592769297061408242850188641354204600649357497241629867724071523985140075846760155031925532806295729949423321336030342027307928620615789011164879004216066771665828316317646123025678476366442134965618582117611408247174730943542225073416170530384394969954520742469002642695643392980887259443689882058439003555043043898732303401628672594149665979578362894166248317566993859578425374755381936767535325622871813463050589774350223777449748821480985964031488620198864950932193103609022492254596572197182514824216131670007556326537445619001744358435647414246019755517449713260214790531167888963516470343682605284458586464262735492627007288718353133990628893452826546384377105620939191903468642226074501412996989101213769825077776146319708329439770078153750629366117189111076156473298583768794335065978305130770009877453225870596005857571848850958893337816885607203960244141337118642555156826667973909535968801685062898482040757269332821601991797977935341338366499904084385455464168814177125767657057785252999627608035947716491329097834053915877790484457017369290275690213992961930677591227376595175318717126319598279513350121959690483195749890847799146368574435693224709800994864798336483848307820422504613002671534372778729723967140501103373448177564448510028832004335764038867514150923135130632266934359355327734947270913996114918445501133829215153146655286907744416529123076581007684132022998330114227544192424183526028419574587119885407749389631453407354022735944486170218294369901666060456040618248479390926817095893948565746760507458543156056555861939403281232209274509216081590983844462507947976547688288567557953519972688697242902941029996701053242630490236639845149049631037573756907141006980405421594619567952764788888699651313464055001918395863663724609961229934435846677155641115598784828711266960528365049282931709302485721417682630444362678970903341825286164558592240629426737083387027646291272698851825410330988681667288335716704008549702792670936854609491273673457529900188193779451511660927292267369497238527664046302326067504242383026099987381114546464135771909523142030070181567306019519629774298412711739107867461632514602223184576651781589235310783243697906353910080459382135333759238020875378699654594920453940173197294921883978329041009505532043762187587074829023343295848243831259127924529621966507202158654979911825577442750522373780765154265577027083250235482952940667384063067765202447995302527783533149448136677011832363645515069375539544121052237684160611410577021197500817250010637618770747741070722923650854919692462666331638623927402799382241600876529894676180151320550794956963718897276015120454601600217823494275113736448405868928141953492131644137784744333145182297536941237660560935660996404823599385420187443458117326099673233183638746602150983826547624949458043837690127115609273156642710534819898800533205244769546819892493372375548890615283247040929169698028572671654385821525837745604728587946322782264548021717409871821735460860006662664766606515899072731717737693852548100971453352737828523584081237247356693141324008080330939082709654426830994517525670893993294359703509690261915695884273712140342892773709110600180529103539563953142444356618856021131414483988494768113977772674710051419917979447288878575955328523687880777634362461210905659431012792971655293659872064651594916305594680301676775993358530141772541929162249028537995740754153309611639054988931622326314921271142527425033826201445378971010334786548051555396460197006308333803677774020661227448168090845326615583087245388124962061065890673121421448986919527743071852019321494730540261316090517692893728087462716752186705756738937502330098260045576146832607401453686806742948615241145315077314794386970467240895109632450391083611330376292391011996232493591054107144986215318738373712283591021747258899553428455956476735038424161961126680447132972575170112559665999759713727116373003014561648347335416801712371771002670037061914467369431668857179446649368651309235270359354272238894050015167390019167012639872664089282899540851767680943053519947067466521508694564778375629735451300152234215693260390852728283613631074607386933164160644485766341661243981676182529785245714568727041349628337781669303176525317012468330263131429379888633194118354199135661903950051914253865610341256032122619824918653931602956093996120602516209064587669056886177980962323166262612699794472201910126460796324807086185824046257470218509361044764482166682428287438280136530119577085665910958691611647390523400309865678663442805970601974224356462122080545825542524932566113779183301468960616991584932545132041481747555817626786299675288484544928893477349139779648366326701295094634380493461347375927507828548223672621160214144656426310487409967141587700146701463226365025114050128891025607764386934656477072214195428180886436040615274074495126688499609262978151688305745259048907079996305310500330907642748559576485238779029072364040427392242810534531535652981507679509945146210673928485696976753605799313135112606446026643418890379520835576938502207081522523582436730299102982424324479841399654228479381899231965324228667723267214344444477766398743601595831852209753112088818714276325839116657544075383167158797321126267825799117845483111190045159875789278290196636168479575213190980818959968742478428577098329638621616524498855697646477202485259532194756533293289026869207744798929694467798236438237159134725538619056957890635769494329901575546464261940126994835298288557201978596612844434839468207272905312363946323776370318150099519060498902637924763917944154127023382374639541149452157684296920278605089935249497622502922716753513112227772913697078280664239711324767454847128945796972327398422098764340285191880470812863628129905552600339417786787165657460472139399342486374044971548284441664615779010657254641917748182570154721844809826213524300139508825297392704989722094744770830612353105595185087408973550535828053683153693313264051308664146063324951430962388795045903329128672068401600858829524136668672662888621093090002256882458538994172267588007009425223470323334952170048848640785207854008452849276480264040328860567279034430368128154771905983260989102755883806631230341041467675586763461863429764928022288148796584832118772669051883322338108076479992789247163263795158061868638827017231969487787294392491464268161887103044842781113552600026065243165480886254486941303438254798306875053681341937088623478860810527245735061256974939476574566538572067573618426841781338886661610037806189021805984239130996159164044872774176694210243445050188514112391909788411456790217547318820251363231274439210253127888982107235561808342485702017025013323266034115161530202526448959403749544257996249471743380177237701878215124759696962510549282154433275897262354160314368207414868487988835162788730378211182580521339124851221314553377407955910263495800122254909468328035658674916726730288878936971776451331954526310458237222119409054408593177808064009934165308205845814333234152773866292044884391874437852489676964784180589218317960966104162788458079047161912710906536245443480489384100414605707570495951419469499021263655147895136642783851791815034509033844558134323908099390993545471955322335899381100261251727564671305569268198228444581853621288631187223034856910378755038488264572207720118709958726551519535995237931142944132116761932088889524437542068491802500813312312264827681089848931481662215449867270938236430225583652073838716453648483226571021696815398381036512661903850963044925475515638500768868446654978582139800385436612610654241631419844844093636419673940384750811705209808184025115401559146128220940820961585296748016220865887883887193441973869672494590081961271981527836313202443112310427744964238133875195361673006159043431076090377008554731034641745101428129386086061754878234539141204238266087793068765710363299612045882780471987776469495045108304902191338528417053925729431291783113448593544362886350495534822443988739293942140905946429922368758732673269493483178922834261256121511837797035663457852208546258509604673308064321209641705341113304761193991653995860930564895125503932424601902580703771353085867152617077397548830327554052730575937656485351334396063669934901704669409067192831457823939549739398560666396871146948451506579631489765306106210126971341191286544410152884416648237382693941596149474853316970915964355849201017954640193903994601256062982086991457686976288950298094292512113479437227175160382181522976309776839553482090250468641830693560145210861062187154210513784050274718094122352367700772252757906678499001266495287275612887809467408601947888308255916127107063935897901881634469152774486305808589299578953319427696366996406456505774769010052924570161731697457046613614630144591729024284141065636199675889459723655175500806389108288766724898153980452432363293321199981380227516851025553875327438339667609360146360015394827782637596476432448295296938432311596368905740015054584299234485746492203977090706356995811589053714134454453443279870472722657249654321766022670759716181376392277821099822181376240080317148388390492494824951797725859775626455626865268855125929604793378915687285711718331045927506154967427446939310165481994666373989651417200133371919018675424715680941663999426639760620374966436642930549681247323405654061836610815889748184818178835564667238411029995923427254340018474117071373394089441177723724773206123263512212177404388670259790304730003445652303953720067946197662884229796148644138234150860728939551442379165578594239215400513460734263199677628041974534785244247865394351234048457023593218654550099526849265321233703146134589518682266315969004386611546994867727966899587687127708072663379063071673521212126918926402731967465622997238442233157798161557205787098931786921236225062119131631650644814628764686104547753836213487880444310771511285952466089527237491045114295534121377195150095864169692331896409858579386308886424384617928680766745875725526368728382194174261035544016780316388248450087424729473896674625586500667667320902962473152725595145301289921133440899124498149674326647561874239430552911848725378234902082627561518931135129688621311531714572646649774486364156489734836405961545614254803518378541146916404878559074674927984750167968620007962081748163151758884572535567273693768706013388188656021579516096482464065326436214026294347057815251770202065719311950317312013730107159578269192290541274695978181898965782603142399436096505513814610488870105636590399942613907588528627847320279408524788300058033815691353672513667265095093196497158513072343822558059888399130068819228454037402429327356461468279393150675515758600436274443260321936916769257047303122566805067172086654580204234548727629137844063620100341986533335097002907405990920076365910263972794984845636650877405116264753042463967623480487359860608084400868375139690658583482644572134331278904063041199658014563996430777769185791820905918487976831800786617388480682393331051934235325106837695875105430865158571223943628399076806352558185154587091655604614214141318328064434133491061624265971223377173526952321429703252941184413131785500754118289826020138792125295977962693424326928153232445186873680049693045669595818374804413893090159755241213914944524977476796703871625966257742396905742333116515677375990886217917483939250803481310909108831522562056981183721882874984967141518835655984258536935534922938011095672360706879665210822238149460149387477256344867869383319465490530297115749157833983417555114369588291788813518017678336867414464484884666147940620753359020686126724101915911994981417349507331026466758241662071124078151086289035602659917234568998003311950055737204197830489508300851968195869809230014282134986061378419917898721825443688398916155118000791783987424914943955562293113314485875738341757142611062374805543043548575870787260366515115662268742710209597415663324057824062858120352221163649993509283881186918965389517092101753601181410013020880732551762039411542983106431419504951249653816963373986759892962578804869340169418007682783900379169848772080152952832201613840786760559950287482885317478772740636802029048708108839798585982247820222448430462246215086884028922957313357313630453184764186198695346683534118155695061401233192648536082593521090818980304615000053951123677708980098040622244259746859338110920122956211655072146753807910114227444287343140357244534246459973839267911245582407870226061151554672496730580742420672270698763323882467638702155134561642610963443801674465672315763147500627161452811257934177964290051213921186587634528167975595510843157387136919583509498048711907233961807410569929080906977267201519809760029913031222839768508852752958150063387701907075045122309514521837185057467197691306536409161246277902941870559982537398226552299981375462639827072704746303742933082858214296916298883445819204512017031452354995973237939861234735649984211622121465288366410905669560203568892130678725598788366424664212091217296189848838684438914536835158800530636410498833745128722559541714899450691597063505499865941114793768727998605977738615319420892180164074956665359122873727029267475884499058803717925599211357397887526451431824536288139365296904659214569661314165978106838440115038416592626262779782485239242948909658833479656627885528664950950837612160047929620192269676763946928166162875037259495554240746450468007284908925894541986162707945865586906991670026415041433327825493215804193195858574617960854314835437056488183233616403600031646181108947785321682245705731095635045832532364644889361154266949445138303751115806754069705392456971922509631213000419389131396903316568631773073316266179200120452228081268785218935572715727892016844262053876862329892387266669273891316614202456557886522381220811942626248613369269832362615698782166700573120248132580041702593909582539141385100570694966415706856039946294006286365972815506193796912751374202858565949509130432343730168700905963658500733708952445554524535243510581756138143698165718483128491459725650494853889362322734776833737493434939417675007390969565848609152568421188991640739895391352289737579818729883078169719056475548218201073173691419400525173849971991210529008149001354893397384475798962872607839165566005854413285071370731636654320932637278818327474740015690025238511240342376135709702363585030082328472811624115295544014647847200267440504236757221832318293023249115287600295948223774503027544457195068009823866135515019873231970678681685181797368061048584691988768048566955603630736807276586553489435123803266261044761419286726792406787325161575943206335109878028619561108255041382015525425329312269679624320450671325998642573720809761395553540875484268417019099175526084358647188724586289408327170990355311349113584322465327036247282035161394672005553005920555475798417646023536203703315582022711862546369714556836389037369531639183949033680283831937663638922832346459919047340746404788792997421096280386340316159647619038771890730971505558473359230135002104397584634310159484509622344674006974440071018158730614848205927525181380411429202563977810504376016345316550400879166067220779590225758525585862791527241410499411109951520208778822776130179140472377549782551556753668676702959188052121308556151639418289474484200712052820635910851909848408838009304706791482490500484445240052084676555616167117387921655670870440115696404138886580847635814960991671423937745515720783466874183241515920896568150148686494902427700292373921936163141892202447327346795097103021336637957321075910501212043547692466173005233726906129344890580848685987720023813645602081061266024734707729202779539759077203827421091784834303258343453473777739830139532264702656121660957920826949012251833019743819126811123919833278553964031532644258380973076313470786401555911538396305802666903293833008791056905767540916528047353655645742454130987198752557494771365051417832142851846094955332480106347042476653737668054719979299823549807664250136053626744663547013193881508512137412186764238159671971223074400453682470894609768076310610380527887224323985073900731925953007787511163553252662838230927449129892908475701987263288490137249140450498060368204725564890514441406656472620440124892473426181243018677149306610299567001730054385445179319193314260193586584932778418361470901440689937887290680421277546538972940055933675835800147801655444950156761229932514539439624361976094860905008551926882744490590399777087797744838727993333504545634352123017723595486812382948404869094497389648308001430826788364493855683779600420666850449295934441902599451424702389545464078622834083131293885333297035635427800421834175664119458352027589271515810428906519574300714782811285786021011895742193396764247587065987281560036365806692039097715505443509704351133792026147018889335785888513829100324158852730893384164935410520884299306592571129757161832887085416546215464799886513806306215758334255913405585157669219130808851498991451129736402343476778556895804971083157919265715682650239812429647973866903704262627672855017991818396017387925107094491995804105947768698382814835474885567978784450429479880485042420078995763120184242320580084459478467945479517131395544554299166905929468639355704488055577685587099158913970461001036604562032731969960277333636939519967481686075183100153638423387495434724543051381399864807467126662234618915053403511913851566452678249252767220773064652720365845881906194126193602267459718214993285995529230710948606877828419747558201146120414404004986749845792813929751795347067467251145914197601607978412131877712928632151014294993756279378279464527754068407098484023272099065410187805655376215849167386384025265046723352996690608566397811567383157683804484666412353057103151668427919579146807234851574009366120013191105705651136403825854686690229331804599604366858655015896819962345724606232849804325007710607053525106721207187631342233315011393904708829659535771194425128287870460264329305092103748452200089245262806958457867433291411731855493893690555243288527689952260909309880935681001873644751187199329438443101503611297662992714668801865178520811932810320793189069145974727930145536668630958056982699084987111666422508513510120382210828549908550003874326538769902016060073030050539081636602704125824043346573726624709390782404186703147994379151634785983123733434740631368204589957455089365728312377406546104019986785811303334583556100910332440138841172417088553163256401657883687096459370125644189722019099387286841878812378796981312213361081867165148305296005356579905225601338044806448248784553466118671026031631395121191577133754733058751026176808919396002597282718585807516116128059979130078441209881732665278205113248265301451652747206955777518034880533678053439170967566217133711884143169604543559207930863136434061477550116481514527525168704232390247478237600052936442413838187333090125885803296830393889619362682896596076517320359939892728209600250877631363528611610004124086021008083110464257538538943563176496217628887224977920937203632474205988088701310005098941324764186704702794825927448442796264603275865234646350014870351998470917495138594349540128253372339322281796847291245459497734187241469760346085121896038713341295534430666296721010613604951370825488647466158251234704219548552092986624451498632014755800755176484269704054937330925615802310250687779296809735847310190352579859538678358224928761991028407582557314341494088874275590330080455218865006606414133682637837873516602123785346951249624317317698450682172727324568653186017998835023332705467135110441054044849473927299767670184238535952548705017939125882122565511106562332154859962442874120883914862015520937023270777180470783361592245558272621899507766945273334850307355537916868545259988433911943798271162741517052140296587694065802210606768483720941591380987489703973661610104118479527635576468767344407639050819073736504142148972334208105316315808558185301490843383396047870460236346096137123671202007786924979725425230262749181583274168767739291746064231469728165772550345265661267902069941977747994128676334470163689703010984696200277902350688947039430639318949168978115394200104067232184290306116157788128330757782110531761495010988911746944634845021199559070080071167061426831535674840749968165204100544149493962446632548554196706752396336834090855029886417387975424057850471658171271044774583225653550608965803120236803272794271737817805385890133735155326974369042922483064270753261915624251355540918234954929467560342780817664655600295607565421477745956614292972993465331905042039524415834051442790426636360666518951667262516707852635261449091108464103556436133596335679601931970612968503346717542011071184474635921994250021996109226656213687391583128122211041985760312972813183495429660896104983934343526864105879736737577265571917280976508397261066715533201592340539302331169485069814155216640995826059387326032915420173737828332950118841646049501810184168123439440236510126098479410048950494338583335679278116269263178120773653189846793627445571801815894479900894463025782239531824305062963942610115903147290304755353779064447568250564485737103858235354708474491667237000733048181817419378929105038830004330468749490540352264099092195750716780651905961389900919121898889457734845651901802913027138916083858435910203493804308043835645140985407727088560113917592276782903445337338386498919661880779969425989912763524315573863850968011629712100463914684282597883696979042253521814495013292193772371475722074377737440861202570907076548067496280134332752939922839505501572112325770248661673066139689938179301101347103283889412592788595557889913934474755626076344126871551772087625100682492048750357605794122986418697168364151406188878490680544303211260605746376484223413467817441569759345105743185626964676632708885810540016354116734491054247235838082215842254857298616230955450279692276494091940001626843481438598937609208322524889683943016968963643584638000580668953284192180466844409409479635443991520830098792354397254210986295559734736825063594410053273915670645240823649910353569188699166343869953437521578856965746984718027134477429578373071766556037831574113855924884301577343946831008642029742240670929673180975397351556550994973168245784773202049317982971588916730238806158374508206414574566151174267094851503323967534002817946484184599849193781466086269155794422893997818309465063809736208640142431434264120628108291924700915160504920443627540589971364585093143768924488254413302759127638065551545193039472904291303298216781046557170029419859981420353942156723631655518696706959184578705590055331804974566171011661751421426082362779328045366554821963238136364552794590249914596794037042698156345916232144503374798704964091647368181398748395764754253852139865873122908737425901546043376452931463665630303095161975222869274510196652902403941238782180217668879764156597803128016445568246346212949590490714635271927773627261655535774957330058172041303040107770448035868883892399441056286954018824502301810162026123742669261265617947020238651575862248464792253969883939794043650874833202629118226539429135412692375616090102926679741874415806055636437447861421315502165745552135978735423665728498804371138361950925697976640509589239364100415628119926792762632555602014077631652567138326789957627021458312599967670424294209963678733876247153842006637057165522528027641378872093656353069733207009763012099318673400729622143945832455677808686228213175611107682049616317377910043571234344212419392943880694818165401835258712641868146327709725568673391462649925751514386488137994345484668763250631080628733632288727103281729784982176969424642436377995067136546955561503187451080979607612277064641711322287515503673336673592976079401620301053520055734004401228188563513820392600175696048382221279543027176536553135951789901258402736444099976489994065077322465638574195082752841359077729065550529938659944330587686359477924196081159263898866636484531346765686793819210209984722187332120688480763805937047419839884217295245212802517231993078278699518362806288539274663972710779653689169790563601269558749739794082190089057638954802798892763381792812947702797399581670868108579970274166435367525882889611668586505231894630304884382266524572344868977532884484912358902469896382191056354995486842752110300930369586331031571157545866818003059008861066313641605103786616914136122448171456716526006787591904616860779037618461063933812905466254543647330278504090571793230175521197020068838439688987302330012323028144140183074882614868081515827853567577894473656165163417921606954823532271749575003645339411229601974192468327847403956097111071480890268092907649955756688797036137365185685569464151829818743557505033593240118743847821825472142855325751784589063868952699826001535222691069177576581742846448713366527844963932502878072848619167749526142637887266083487241357151026830015715633251691535662679901586717208773098379452139698598769540360369961720985301280331328204430786675979067799847193227277612983770469367349245254786623497805174421359305230775165920589279908440708638453642378961131250151117287062009483620737842168295308026044257215777840744960909430254079506447916913987605895840088695767323217928447107986682903974440404745630574414324183695982359599983659628061413124483974429370468935899925068671031559113041087192882876592452777854965399499329619018669027494281890429580723806707765688337077357391252524004696562040885802738677812266688247815220220020223082886204183909981605859852074604883425934454345625112197527187587059665200656128939161113023701626504024290022937054185680952314187619250465658653091571796129850531468704299057658925126938116369435428949064941765577381414043906758744662267353822862106520811608674050578224718114526198282544534939189021614445109939877223896202422347400165677690778612994844286432374401190879048001511997315288417978287484490410661973616354118025044912553515593983264891502337033434981263912503849439781136830205695831355527002065135240955175836530767449141369072728733560046791988824768095904396191747943535743728194115607337176340236610186679680292882518445071224985115772660782160543387097139829350159315604832096545256189262129134388860464765319866475623035970401407454040574580149801207924086126083497747197331414834536154788587136000932685848422897702390278103705908188883727137809251490200892394423231726539439556696838818379713236638283148295866640553500471927680600234053651228495845004496376548561168624076015711221880718364432568643062663337471769932980323501667164340696353429514733787247525333769948505967821596894710792227693780840358150402003484755977758259235460395556776044711201278023146615644492099813584635974878113076740181300504854349036616557074640870912283868212216809474171855833146384662594917717766393590283790528115466079950748578947997568543554212839936020870884803752626993525720823745743953433908182992364038040416101606061353492883010615541782415787503650999380901975649819270760612178297327338727211394234430792911750785448413354485120563533936121191867920265825537586969454067306604697613415961921537675193043806365259592209593766435164588060619434303735605171746454002011192238688163624363737305007218548063842858232878144174696327491499773168904481295824484148007447336754764122474958427033833799434321710252699217179072377847912346519754926949656775904808791155729794388193070848350741832957729618279188618892850926229426291172011120903792277482004158877906328732953244481420842267166077921795180406075237412630666275187357087258857370331506783302040797697432418377301673441993117386277030274023075132498799020860607420679291598003463432544542605567834774133156522066222898378837732409812350902200042444291296979112115540562902008445884206003016449925071271793739447160760283020922449888159553699625693612136120394593500777249121881144578492443112495664688590670906484425869473832328886857116136894456935074388712510327038863562107093522950934107349064153429930651903221436856602719246500693669071515689264946127263034093681701852620569153797733048468028198203767934841432106732798793534574942845249485825418880969432892306582317277751522523511774165395264495344331403988431529145976492864590125396604649812746235887283664879400290854737101727525255731129281200288851574968631376841283301433771569838226100237044382714077647913808821731977893231622149806707207112485575454707861276486058981992132809376046955172712538658749154354493010905434806181166950867293834455467901313143351146442183688226962755016320975011757165753576172660163717925638723631126604233791909270983648430795908790333603913833951418481471183162196788070565070434274531660288619289309585084349986341407647619839780638368913803637798782463549529505543534044409100190637191265236982257861424334553638549875418228444122584939386869614603346288224856004699647224417097323961995393123785661314957776600019328159461952418661268155917930872807845130301488726631324138347647543166118556538113447071017991848156097843718749105805136025219247846552043817947559062877518634339986310691518283409608359314877988729780043881123313168322929719781870076484799120448590982075945122152990569474640799787287771586711122188348932903071911610061654977105151944154454777838134210629359075261807564161867772394368414423169461110846132822171739773117445691925909744028456729706230986465750272446869906589671496604362050087541148230900067138790446854872528962786978097920801066963352727513703503402395397605291746219962253713075306058718469535456562707080589031936728766641189935126036386410605270246820050943678491041792954491427329546652129961075466851313465419364229443630769407102433701442491013169525711853583939209675014138744618101486957540492559072695482045086146062718777144162523371577087892510983750596102574001351181060432422700979509768469704834933206649821038998086943825428143483040142255266377961263908912370886812269086613311757259043490600282710638492955240167174435605744137100161368802121830493055540153085204430440952057228524170316614444800066251778490372982935796450832059684954015042552955447282598793681398790206772969523242491472850182071221898086158575944203481721941063444474100159665386854128332458995364794902998649244968791238020776145867056032967353342467579566102688385289407152496853502650260748708529689304565351801279317502484456316446115660752199043703163508361005838505592823928228856336284307190142824026611465460093832392023030524946509845303403998347849363517921504788221881192956930869322235415885829907339554447645589023566264976987610795151016696798247885272961854025660962741342468376815324609013899808282536795524315960320423904115933398288940373089031396698129835366104990228556752881650584687116926446660415383591658928396329942508364637368637814827788512506976735198024819712495183144596483278707502113086525056380941701228100050293714368164714720090143953950109771139946519004005319624132362331644740591513945478452085414869044620771023439106063281032619533907195399853775591839934318271863502054231720279375468990749027497822447619838885323333509411272174440121306106939294765638977284648982013943559680156821618359923031234541108086014698071827721344689344656474376757555667331685054000467204633428274960615886301901969889275517655243234914565885194082029501468985428931397097817215437407755763217021172181864788221282179755276008138366672142996215642519349149274021680016225878533014940854971493754977590309152653359357856116781399040270118673100168043676266695729769002069592608624993510191865764884080239412474885337568945441041459692834291890425384190856961206175450091370512342761947663785524289480538599924412728686177749187327390161185728111981891585404358000226456948872960261310972507529553490004181390526650667030992967228359969319361146133936937346368315211444392427240553468392141082725161592855581756214155360680962671840048516883415822670661659016112427298887140854013199274178999333075155081076499708945575386529026753453652412414409258717589483289724282535796358476369017177415508238683172008057604507435298959992852169689696376958791433430329726964823082631556546981224289351957351851245410064854078616544959814092126867083671298352138544627126560166097556605732147921584418166193092779359044479273341993029659950349395491949088334435957913010065294966072170923688183197698616338844651860884342472981640614369164521809007463601999266527973082454537537493865175293847755163321906672611119726458754632160712804471655866731678463036262233716183360846640729586181737251524164691677353535403214397134487023504693548991454885416149588412962343897786032432095800870821019473873743478813232722922004327386684160527521946310812032466395083699661443739383464869325967485846905369834892159737860368228722624173058457682776554512535337791108626561242529395766019742633843817665000274103609422498851257768726249266889161213474471517315387204150930879992461808082933463303738834011932178261361574812143646721143446655701039186787194478342476912788378473601299200877802061883153100179431570690697579998186413924151094161143302170271089840234849960576800332860097117101344020936005885940327328231941007601816416907611945607620747169039210084994687973453318384210123067367758336243588111172593537133082759503427788891900372725630059424305649637618730067250725741605335021985968751050777969745825551373473169054352351148212014772829168606504259696721564966665847985065647083244816174683249945645342926854398771510079513408984510924519148948099118269521549110305876782876898921740822996019249746524023605697084268477390217411065767059538556174141090134075303972899872828757161560794111851460640547931928734802184515820266223497182484270852162734226544386637665035754962190464086852290075732465232628057195514399530738321799432614720431285634780875620999934325097252570053733733215227330772573499746972547812353905859858305846712639085986124434919014866551344609727316120563186107794441785368350002844893111941712379449187912035429808341635029276131251964467901814840013718855599816912559441644029042545520199271884059105569983008452916246365646041183639729159997390114762538334652035910125034985998595968791258452275287902500119990686465803848087527418670803012081749449735856538572361541844352649783666364117066412589895222786677933889402121764235114838128785400900040554842465996382394185655865991146622881680230671300877573062388942341409552731962961818135663479915056123506793909203016793260153979583033624136156480259587814101271677161675402160196266247680009369085462923131260017853511732770690336541084223426301774878067348374248376918252894984463499123172596625426364775483041382414932103966510166753212516947100895206504375303281702184090701780503185512352892965283604874963015343025272651959499979358757270027329046403710759846892877516818550676228790887772671850732535382560384173352151518615908353883159387717072487530311923958368873823797414764639970285692448337819480132720103012242702068891804745850222254556892272490392672378873897212689488617056106595722509080921380250231049871620212684884876027242285681570632775143823202124860219977324300897311915258560967000907859589569222615330107205126118093941010164525070191031545176977484607843217925954077323862679629001987329013708135089375555619739939881782064897506555212996879784662943161672522398841332949019508994430517862203207533827950902714167138116366809662147032044515923667690246127005419114549992785063722868670571022156610729999625199595385432566974557729641703424396934479825715390065151421975425030697501394823040757829218953676656536665169483680362504521881576321197825766254200553135415584437548540018633064331866508268704678423436412840493799441467439897959414068264403794838096942143839970608444096386791713309533919038098955556204893186417390904809620735292814415023676527617297380353074275836331800652434175103338837376870725805873236866476902017945642817317116441248885708909615379873516248184208219889891952492399842586596949960860949036597756830309150866763961168081631608211344451430128634740561954215036382727973105961335612709120843672854663173669915796166000084373778456765333245914523323523182550595292927361063435970442860218267808200957253516315350758089807700640637582033984432637435518500565750428634122668851716379329398883925700112691696977726650501519021613857138298007971838808261163545830763604424311416208224453909494660940302936297839963529819080449743996419039944130484596796950824426287102298701972641412017012776394234655546865029361764765135784127715269065599745021410125696120091537746415409903364586067899900074040693334244693041979659641878295456801225805111408484540837876323125248048761823782338313303155779215019187470068492425857195862783217345184100169514191020526917558282792223449690021335607208953974165400954035130485245997004501930770787390825084500329020592895885153882984695245397409671870460195473981552099628370557645803812551860127428581340415371073554902108330295043309360117426893495605751970477017963094948648189779446553800503212511137013022991047612994146768931274297590901007989278805593389616135804006226924063145615145038643344974598300738243024731264120466053614547742686900575801434692509862539413673484453145308970120028392253732270837251984071005229079496980137313150478077179891819960571594547875842841780669962870938209653553257651749708806104317139015692110885170152154785128052085744978956765990108606338144542118725542330920132914868682258681665339792886810233710598745704892325504904688601174123117700189543095785345326645050693364594448067756392045811418697933584050877842693808589642702427097492501486645225006160553907626666036296880504324933108428100869674414092064496981421263304502661122721148589398450788330980158380554988959880826016949157292242317907812700904516122030079403754447248630731184926441449599066620365438621952356110377426324988145600762089234057304048892403217909997395349946978394473615948850759509035151941790338801317403470440576203307498752734875617177131300121483344219683072755782418748083121685027087504791269620427525859917639539309971119202366210715628691747797897900920379190184876655922613622314529678780918395070775136518942606586356568409107494917781895057807464111171093734147115297912923661394422731226860691333026338827158511706040826805240763318490125988278002187797533522053995127947765877007976941223421832555241017716648338222374719014289715039820684518532799483586905908601505693266210501649997699101984246725241874045101001982114222848530057436060570702010421073259302539295091070340562806103741673136277787004130316518448714802417054054957582525396131134534977603308795644918447173486859557217547548102713569496756331586230104060893284732891476222372215246844945483058357494317576798514199705264771507268910869668631142033579148390239040249117170286509086192041266193217158066016667767396793821630974709707328284952602473977163350943025878896504786156765491739045359057838581181998565134429324971886769830168269318841295428837945734817844890023808147681665471164558352963165465490170349006115772529035343901650888934836667146518513079660747855849444021945696460077935901806400546969265926883880705297500240417125253745326606896538598514755687402779531114703677426499894375215593448779161729483225324953485056512381207472532075507195745260011269501260415942694536002748741087237374647131693048878044040148063022606311770007804830234271299793953615784086787360385022144213601982682182770608658270604037697988356584773945700540530153834725552320997281774020095201804209774919108959226641960493575295195786608713838622731070557298027518100171776530933253200149041994724941230104117742264288103414897303636746377061480000830371882735018884413330798791904934232727248229682146117207397702328510435357238452285005734636868642985413358125544064550113721805096757295127681000785797291391191786617120000412400992631780191289052084295438670789974262472510647946567002061059166583822294480494042972190206132013517739397538952149551891416837388173233988704130396477738333371301724232024658787526219374601833927540954410208153786813273679981938153696819824112095313990811106911490373265696197639928221531153392342768457367022146288333760090454643608436360794314379846965120716077030688758301850946532367538247961131029051157451026552217233920255657554692539651407840663987122680357026271167229134112622545003061783602730675890421615969662180268740213400901144227015994312530314338890990024676570161722978239684673684887276123351423943766844213791482329953281353949237012455846184319224843900416639332797491112745698174486647200345515266597762531340908664305639302040791698841197307365827300452866157216222353294120604356592708315136980416765177440095775945908433241385981418374384973687379134471801319471210960577855784719387669891758091388337113893385233101180277286415448372661011554074182320040603369409665988053652182534751741278210396887802370608054539623951994924624327754736641014179584685279851583280854438559278126704442337488928903567512651483375910343303315115481344602770328819876306658361001365028217469252451211896834155391095838775802169282682497924673984687465147373523783142035594882543211727487939229663067718227673994299057752896772089952896563075506421318798365685783162830338000664815686624202792008503549549738319898662002573703876342228291254134922122591873470207439270695001623837217694951271916863822643715010761623018358749347759916489102498562084121918042839952592434974740070684975790275170642815304778997175674144363900967148898285397014871288844234422169968717566489866217091634308516433306272010027848769825455518351604421655757653639733209952889970314709476332697780210107586505558148387930311080133345106956623458588202535846079323935542306672622542996402001943557201554311703059261021451567932864139563843360308610777034827225738817193659601464752455859881376459179436526682157504002182449004213179943521737689209410876706427956040392768448361434632212874789595744212058006179633066265863912417030256058695851379197693187448343388103262969016947706246900936284024643831063857640476186309049651337633939424201440078610735812245928222166806160180161256747964676400839439048356593618404312970832827761995743594075937580889862246943054840391700413361369465682388803407436728789218366503271421404764420394183306133703232494746334086215643175801181606968564497895738403812593621893602470819621396236730991254555145582596658909642418439674052766436685462463327881836793118586329009756212576454537308739519441364361982359996571503397570416865291301756967524997226173146823364695782579251940864404018812168629399567494788966628240233440422354230191599507462286409866808256601930011282920379031130730868648753984103517556670085089287043039447879320107764963583411337640706404348678347845314675700664866409865922758654285662352311097649747239437394713599725268568444528364419168852101204922090836288215868794871202352966367360000034712513193313760189917674674899273444065318886914006763142821958213811542332243645431775157364398891956301727013556833360397738737934787861762048643289219104987772141047235431216554787699297186612728641186530105775657598518399863847278823053821388268011860046332359352687962292128141250254089236164522548989111228543568288302040613889677599931986244263095411573073931612525913759177699460510037423786160653128357046902255288142433249226530587291101549189105468712834419668319729076104026583574759310579302474583194628296753340381538688828298819291231018342592655415409249242281304607652903168922674610745963016606462852191283440024098784307977536911442562027321751541172861846457793060274107394648758154430076957374591933862428315330994003818567917232738182935468550170453530243978362182577125192100347792927436372700188892501741975967151806455726734735987071371967895987742336931504024921368476376866530786579649061666894831788576121320979044262338139532801850664828038144760015830804294590768262086090476779272375706375353499617229466235282632322951718057039983829455195658890207378485101299581748269927708948676736456597475842888872564358137901758329176870050037483010054864141176005712937043901315310718442752362055249265565698342543408695853358885901479230095241881850355783791483850775894549829906132922223564849048527091175085711105347794370294258159586086858968625414044083708715763594271080042505001639901074563122749869863244966029939239715047213399408742348042165381272976917268400205659673091522669059642579631651139016615769955151027294359524839760421118135840164984549593177153317548571065091782166237644371814569536734454824050883540197598146019984352734252450824035704820641632279464101356558153626228492578997063494541396103787320369736537235804258399121491143179273028873353079820052194520868085399396641240154359580133221249790829704828155780741974498512701795986568596174160458927771241342930709750367805843835834951207510702887934836420926401098120892084272288681425438298300334445643092512391435099048878034678154775928277342864968867870237272740454374228534122928817953880374519149573348951165246954244493846053130666583819335251677226522147450649499770826441720442017451119403542441623488552699010757199059525789044314360641555742753670722410617278606881258754122589574017091718780461786571195365532936845937717075144913124860436649425221912811345748350758091665720344455839973667694870799057820876212915822209960659648565540547381582187507626783869735480456295343771634618288794669100355096543010385947787576134367304803777090220024914891724153083495964883927921613002476002312871379779262084148660807739960350709886825223869625638501519746937827529044320412975955226293896590442466811852279866598230711590637893795872009106857890863944200909279958270110796697684290610600850947967088279048828448431412617803620320167073058994959091474367749973909826423234829858998554220117429601265689073078060035667690544406743523652979877001567436682054621193558755955655701666525922604744099186873568050426290782945619240378058536631693524513039713637666683646222403955439952823186064845211033293611376281465905721435958274505086335963222724418551348386738368191797232616057933289118913769571860813076604319839842853121391487660180840491584481666271322462420448444684734472758577830178511685641119504163338318291420384442126239300716262293024387417873205029079243089211715273115812133637755771282123426943356857262746723411731965217903438135081576148609784070621514979905513662499459357977059312929910463759110067012912617560762954912209311529220711904851959146757297148490534608918405712828423144078847191773777537320504666190690494425703090775609879337956235274839301630827517497520247880520203156249221082944606922810162184610234188588993383295478787917689604222090182420969428597210978059573794002266452325374097304111280750152491036388027448279812032217225766892640744401348439855076920419118372546218343106383082674647578526772593429769517015295979656508107579913801874597326036191963993651744147426906658573182271780145441076710402279248556995063190836043834075594618585384982492607201505224976349318046654806086838100822310966897611477169789582503585739945537418686594682733003553249143918662640219697162482959483319901789953996085793152349409841953024141430248739154508671677962494808174290075002675752819525776377496035054776045511994867536283124727443920544117408884557196700193149453607338070180536375148179683648131166184292257806630460338915928056776396713625388544579680185180777308190664192146605564892522712542582548189393153931332704175342800076094946263858101491001865045265064778316613533894215391897633149718569423796387720450751435741814690854124974856811898252736030401606018408885486777693886689641701504676454923592353831601787987239796334046525971256518687597420310245862434921246199177827581822068747900313449279188193061145563547439591057984014123422756325609644513619339930445909185039599474057419572487624144354857929986593255304562547981518216908017988233965343897507858671294395004039325081360212018077428858370973826626752095296225067042099196498252857259770322940846156267126154459386275337721826431289991828466306143676470553118446337730778300935304141298530574439323590433426176890132007056699551003146410240921144564269941096408733596712725861237685899990752547096890164850196884563674662136848747753130442040618977563796672447112658994311374382030539198435368743534265512960166339458313849633099637281477716549496447723807328291019378069616877411405785620649762891720801481352493183955912010410504794155290459977364058479510781162777298254371327724571642910048415146282621753447826900391515459993813075162609303013063416152073356973409961013314840383099428755544814922243597171311632774562018411025469018748071134513089292055289725926710739844405726847262782687371963146243795467053779278458195301847462931489384684603648687118494450876914074752114499457280251698875489086571985446512452477758557105006873994430101546905992748578290078677232264610232021297265214332391234461044087289531279902656087101769863583222477714836391199821197205755197556228831562691895914954439061936651654922191470983371026142255932299882091350548108222838283997116297418764910040862068886175008759690498881986164661461281903778658809607716354813159299380779555537417401066647974993853842817392035995011887574166671157358007403922544832601240807124850780643947411016479503503427925915189695338530379251702356068770280259905858018953333560388365306523543041042859182750989827377152408822146533464759950054701726168962197942298886891006496760677685997881032012612932773450419398189880183416890013483848011160171179110673452665024320341688897907938195462820423077222480471384277209965257212739554912171210659680578093746911167750188311596456606527001913041919037080132997860432354548052166261081294413211476602376173510138457588129762009790129739380325381061973040350449653646597741489785895221478612889166035700060148940462529692870006601391390316400669031192301602482612973924566844748857319471619973390682361945412417348317479688917108534640403646583634391452565275238815855310090353704050206846399470188611810845338843065861420380698451563849503309607384538786967922108685537077159997562353159844274134817536452363211546073150577103584359114340693769666971159969240877789445626022988698935821067266935091863487777757750254652378093793891349338006981928586743744134633769892803493715686280756289842330330722283566347165152973877013068250689257001719444934231134462308576611314415372065481724262613490253494057515733574866284558817042303901754457726302943410411115545165433890784526910274215647303139674175344716509857290755695000187824550951721706426623184804845549196113486656411285815226902488517138579154926266747579362522373206356281805642246293321595924365910751141625051790222601195624145333449731538627752132343028434297754637702685552795141544519958824289179437195386000176529534538988096151982631231458022097650548370187396559895150962382049315172381130918099515523083409531070320634647658621306824166210339561627213978953103705313946199276430351661758089371803329930887622777055323241399499923019307061358283018352404373566899921640795725327154515974522321225400409173727632016723375609953596756665238913444017376037124773360936652463009401350073997367893806683052652595850858169915616918876301568018505780728639310123120860138050000500794787638853365363609424647817988556330337663412794666122813723570425468146689061447251454948226260728733513721886733899395117965037032384958056629211360893819335130398986781476599627826207342076005123793052831715408340274581104816307635118419071005033703015417249222736509606827342812325986832754220090952536490674038526309596218419605060621899492276106085729780743441623824974393905735427315601947011394801432923498030993754848861912312675969438234443710126202393637094601544689223727759379518093915475752330455929614542615736037777362797932426397061234907520409155526219684235131476868833083010774417587121664004810796096517716158028842928521912283002676367074096072285347658898190559115034434131570026083083114370303016559184463666286895126555708011688799335903742323055732403434514613568050327781287970242785369720276094348226367066200779407379598217661685322240890967027966817650537607451676677685587475077954908690635794571250900760269175867656619380749884086354392239916793354504778779387214665908001670127597074064914855243853853042257016935653075452186461967361796419124880209964172830957685976827752430673569909484499387975759754997177423413353723971880566433824831583046694988275564610465767362412948507996945511975111809536999283063075871322730263546411003041579999676700975113769310632959318227106976186809176009262588611435175784522302349161090268221584013704176418864091192330384434165635052815793192433887025680016582287570269691064462376037048918147016034113241808335150876968794697490834258368393820117726795185826119757705744046259933525143845678645516002608424449711247722591378121942104969523404849543994141955249471990042314991065664070286902970281287718129236794311431233440488738501534769350991057370616984959809983551406697812549723331958951069524686555236502676902097902218162751306821691068650089790113241616746541620928704714903146660721427273565859659242653187745729081921287964849874051570464968986281329247723820458607675061972722874900693077242205962780898270477179150478224644362530632661808737955992936323751936211477570565350852267109497710331490469615161268494124364255280521787648185421282714342967607652740607525269317888233731694489674646590239160860713286566906163757328451380576569807774576185470402269618867635627514961871338571929901989643307068476853908856150040338312865761720308808604219435470203709277569590572452005940497619981828574455602860260974033995985068137704367753792799213502211029855725271958248649682152384608883377895982038012970186546106906433213933338150449478244866677220664157682597753622646054712444620057915366232724980895489645207432145804529901510511369243975618055535909919263246574419906589504070790704820154023476368138398716997267649686389828764590629420211937612802430534322802864906150345237617872837560760966658493420263936615028777743740527468932959442223827894591987149005998113059281883565226334060960672593010040348917439084680798966135436752798880545664024294092625190066437317381847441983394556295211057980639943600098349715336187404105460566047046191264908538478118657603329036865102604677426237314096549464052882042620564119940541296152789968164449695008112176497023593609417171050750662091942666137407368298393391679079165553187859505535566127284104230987318293163636315027747479802092843664192467318810716654534935330618228496127221412179542157683864789548370094345574640855835121519485412434070747111118891305686726277733160136079101190443031805554420736961868779800144467770245989982798876955835849406473429117027497494089585261132979431364366027989489558276409628781147775499397235202231872054844278155915846671311636735152769286013806511170223586481917293133934537188217459730578769600133459002913764620603670668721856391223517813475437917173278353105337800501041816528247864611922677367619743026799725421984296466114077971573363237789099418366198525214482920264162063934082694646289828022368786105428028509973513496420856926557019013863770223693455640434101012113422719064345802366501132255468000404520976666192774180515072874114776984570181570189152959167570249858407635082013938326352221247252294967487888301435062485731656876484144822882028744005778835734592106500788202006628397190665014226078377319639411352064352054708528457398273414769296643840430395350081020362760789565040095344899019412460836926092699828354035156199545720615246708600635250775505479943107651523383368084051703240354987654726256502320927219563510208165557374944388570224170651892800676505010660519751181366545947904766589745716893221367933649550158706672164965289317222786632647639298726312851982725195861247111052025658054174669378056191904029442909035444020957085694787101356568661328752740548217808540977544522965950136103924706782771547190306091216926220813601978044875816617948853677770030329356753234018824801370067062215242017352083087668707723631872518711456876374153123815370458811603970757496821135636465622605886175140001893928691457919181769578005225606191070117108036424573495147807518615856568582424884423957739481362049715574936434878373369227556082954523926789489216864716684282587151463231379223001474153581951866922566895047567636362632927103717263854558307280918391593225716435732197229949153984235757221064558777691705931421845612357455131928819901494758142605052729352447428330692097803285983167092558292245204623403741532848549716735971423885447941394570546638203991235533290994243892868421461852195640162171517098474238304681890576884021372003842275227695796953534936265685962101825804394281754169987565273603787387926566831277367015762022522271185941544893720453929334506833161667732321795960273218688481790056849203593081108441220068450667262304753253365320564793550518354706391637185620898567814095942513264328256018229075079478284445981415462085107026823793711177895159897095727539134703296503504019118030702457690082521173623356287190361538599519881191573800559480716089030091191302470962239197368967170391702855112330555785411528257496866264775008283851314467404373951890277790810197548115877514801201220129302332006129627578080301445479511845277089064711539771837605558732471189387759824091107167612408845085113980084486826534415878672490111521740288082835298985763202245699983922022208027045612134588349238652075217212026509733283239264249466108931135987880321844782208154065078303993603955042612153990698316348650122537253437742261442273000985199362297853547965109558950968690626875853107014826983891807989943750555887789383083364466455569864931619680728246694261928477555268331319383329089637929086933470215566416048169052946844659097030586359175182219603210875875770741596603123544417858045543232507678239763029762668464148461913872617583015004260227631609993470652332935435883105091351270519804257441216796329028155282456538073920241132785697605255690476273887813129317086849584075012861440143755608316213163760284770836042317099930771089657696065258874018917922109529484256072529327730543556776720889526125577520425491747524318418561175633607661321495179702744690920415977953085146985076352934146189806593013738446143790285609430420291604977933758149368928893835055337856742129153002096005488916649546421655782082492112652775352416170435923144595906382651306559286421213548119819549925067632870424845111133016180395891784062226700443858182710940441729447882452628906836227212468850796775912376496099613355703888078765279636377176359605187467586355092965614521458329057705673501000208089452899651557459118768880012932070479464712687710589587690083583532498162530401482530599729370845004110385528896069311213242426926330588133942548672723269601295121379305699065955327873735884598647878569668173807584058756317191198146223040523301929706539271380417039565610162264356012139299350273131913929367923646859980837057580773087133137491097187460387035205525269874513932662308548261994446292399762057414666612459758114035484653878812490072539614648063812477775658890827273456010837218467334812911905844109710096737795431032224636122653754055649538171497629085819194479076550603532872566786277309746965512684158457633424061991867675336516023089964506922221529497922505429948834487099211366505219671133227033771483326783335077156361603618986246578266711418333161242825815469238357148312367983229624315853707834549592758446981153584292682367733893288134942059420059217466351762081016410638890807728696422690810112775040040022814895540921123146534030134368561140916928251777440056289817683790781496421790455552370453233702703164726008143811040298711084286794286086811414519750521721379940388999690932505481433726153249398319298382754402568160996412364305224174569911488296405248505155689019685596757778529045015521201424384863739428292399910675917250680096661525564825717996617635625624502676233837420139700466148722173660205788422436628896402474714292412010055520183964714954347966137358656328336842215921387074697544429054017694047630968685246193555773176057461226232090746656913601118714782806749960254010803295306309977179745863909300593032562312511449643129719672841174542005458613579011285164340689234656403264734657877593147137173748588806401867764415740765492786636619379667354007572760211709564255304260928528377774715085944389019457769521571248639130924374495550248210367691454697881430899347561503669320796357337492771827593746002964053880515484651735694189781997612913284724481575336754844043925418757339898947673470054470872516301036235232911260466913112483233569282907319567703396919179513061189601332408189730323542413930070130266518548412576022383609626741989530695458825539768340212006395270531297089634522557590810641398443765463648222570239233419558614100679135177425460505848005066577764879498351817068774674172042928507668403504513502989608825217069046886268831382590652764287915019618456369499858936302822535346220275821981878781312716990526348597171290577567710182701975729880518759916865556587989298770950921997800788256834722652421716918120010281206809504969133227010942163301433336486884719161865879288628983317967767149175473971191175974327035902738647316823934344861495418100573350203895301837443584245268217755995286017112856425841667409106615443067970276810527785426558149985401300448221203971535391125035687919053098128737082633946479159043240560582575276551846605810946263339319766416281466256750944592827078965608436574199886073642856753641321166925354554153418613490956009237029657022748009891332539239174886043768152964163407652595625015831327135551087529207476239952457509444911219073913880523610877548682203427526949249593876153827808058610565351405457754482974757782563739487529384261620819506296644947085760818436618802974596250866667365548411072174561132759045624570036897116425091215482408172542575476397052551992643805914199566003844669837946402914408937093616102680563478130341813609520881413871859297202267668920072072243723918059772218994918917126560833146151340581573164175809655761297814141119469775185785843439750451987090946813633321006361439584893894808510095429521380723673064543026097208960834292265722140526141940892688694213539003437719323610719177256679924045310081235508799606443201415812563693718588369322186539870354710099582431477421852405384641014043294437706648844286947321624148680055025691795316902854136642631856450949310863675860274050545821668682835811409985234852026608967757230733173094719314519399408383026211729340931894467307547377691233507454449748397147891720581624186942518483544258938200471563973788939009353998703546883951469837853953000499481045845350596491376683993154213319093530789549778347756291712276377652822786876702697428710139766743928218005695857819680895993867151992724483090991859061550836773885287727048337415613988984753051789672676420273957247256623141521408867710959244160987779085339400286079064918524715482312048098038838834245198781422873189188102187963497129117360549077987097416104463407511247413611331331074806353813866901874136489612721321978489967670957362910092466590908756964823818756969078414095288073889474755532429348281802632450968005403276610757575958113670666679439956520795472289293750737624787875649610189527549836820584172159823786926978624727412680020455339828612329314086929180402449994996969312263661566476617071973382190121568056302962635333632182401435883888418937390845120549701064762142915008957933476522624720107533944446351247614488640035267110504141896123884424500523249962132648728360640212862834160278491856740796781702118593139157008103979048636929330389794630552362882788642466390530722185360518006496271629378553525956492665785327074358288253637122793152720485302057898815398233702049234574034431330323973906278694847297610253388542830342199050654675336571002856161397516434619177802570872280896127998753115142035484682912113737646511052769082722110521735220984557862350258443684838231775773149837362300246724100925292761096101039569703377009212733902133963098947817367287109372995120416035821524571291902069550282245848652724473792815031288406722439314506246717008522842695489622575156092664366438815296734708176791510778325980864393989551598169430607542230439080698546625453406686652898063962121078650325687248005507313629044243229451939975976446197680886220544601924011620265006064243887862424546149401448150876493771577912588292135399336333172471848751109920265797840573082351435500843837073664558525026473646198472776603082437301003843127948807297057677820570892188611317317138843701485654833263037188829734530100460947340869262900902087630762900096740038975387597095771047240561156451260910679470167462418464591339665879848905933980321169738892750549443245959247471509472583759925889405111065905065125475762875583526037163976604316876574854312884409447935595926834601088631829280444169610334017698918982166016253689772705228107199017423044871150237509042964676597239653240478601553450866335905630716050399179426772750503116871862479609638771468865818449249335594684769636793779282247263396868326902167737226366890536867763716338744639581417098161979766039882878452310653675483882778593583960816269456913474072251320678097290018173766336733170203292313232263270659482077686809148671916252780067107334212894738798809545743961673326947149522693405350046542629061857891763125485942146700983801198879066570019723947819830330651750676235356451745628831885050227205130685540617191176375882026746251241095258180397127825027803741075294919039088993685300010684783222646741869650148971902162550175551127203380426436526734109436991025977407449392966561174017808121638570225276662318446847840654938985029566332585629235139314819807300576301669324569092033636617567737677735989337267660145806784658315110808834570258482985753420274705997792349396154473140484622014505404631770307064571731204605288828211580721547997260402065795599330799761017036774737233734285149218104418133900596219882423047960792335368858120753832376670588759912540337440615990327007055143044590543509562264296199826631955306382935801329749350464129415167715100610044918066132744785211102715906202615721354520990631951345855677868532967512621887294528013793609552748701985285904386309989269116311383673111634264824014931062615963422736919537939352867163556162614189792647353518795523078785158686756012768019910684901070797575142945441445556716116216487336060287721987635426039870420375984202986294179611336213587715333755143784391464717351829802335820336906356794185912015197540144307299846635053766089799465692052971077641348644462333499271496683982866993977315768219456595153463841560057790286219154923430998473529546417456099226618271262129674748382149951873457476725957017681512946033112778615209794725485737943857180450433164155527186681576173811059012420838310141929088896197594607069145996120412542423244114596492328039874815379734350781352191326359536940499662219297342563815452606290459337759870724992204069421072219373160250424846386782657954105034561686828234063633118026456159636916591534042327850752397934897680359425029473369356788691292260217279974833361496186945285403634371460863499560278884402143408855191109648794733743303719251058768090974045639203553946071498276097094618271193650164783823852471182763581812399307976378655013143419960063593443441070056657982223322340712086522849946503412856490847838058710996181951325700341426331337228449170267519282328481216441184150267405277325559417760507637262200152992644321382270322007735276213504788312440879921144117636287739127271417796608842256111969934858875136808570574891625711904311410924804871830531693167279910271365966545958901180409346359586935441298885605015275312067117002558898878368069689320546577470947736716672670850794768518485490365068845005280251748791541100349065849661180325790571845078002100614772900932604873067785585728709386596701264671179847308190190040809699918395704690642472683607909889082834524115172439898170061259379575947658365508509537743880017186600465212074045098764272395224994952793192526225314933284916327932304933197839562966406899751467909393802607764070822423498767457488980141827444648881242248903843632968072938502401747971882378954342161655437777062951359718506152681748411100126314641712894409888964025165477021687859230792601619111857494316686482507577769820932127088739509267410387255168253685515381433459312370395813651011762590636993837084015728383404502053219828403122745437368620300507920032872406692336364137187439141244453993572808634069907643557994561950429929705311301297565574130227262356247988110431210767370614553780405123136391534720489740195473536248773504878342510584794363816452421771251285448516186734025882234323768889535406016890214904147782058137002742375156308790434302519442345539966694334125368709252116642115223194547972408598416859614047760271647434604653717312275899867887141807269854327078217726802800516697535410864771715497097477620311264717013410882333254102086019138739432795094449964396795618524397452953453817706455037718663022780175422723725380085766845149317345089283557205306004988692545209909857422154705527915776120672765670412829319062755243057216503070211415447543739375871704475772995256713479863910498798237724135650424771777261222001026718321808141540837755879101205906938340175449422317006016157769584638647111275417319032857546694157923956084825788602889765324932654249867442112092472558001606881425614558992191551828848908819971734112101542997091085895978896189690823907198018118619309208026187481791622423456438460301325145883952334578143988746077329833333650083651465965750359282487911396316971030728413471611850573805456064269454225764826223400782250156795632074853257070412610957963734200529904250057211482699406971503576568113131152492873713523785052828741274309840248621174662199392468515068162497271500977386545784537253090531478520547498042830405133654807944998074914940144386119495887772393112604208432872503662342330769092352994740149519805231564752861019408192129270170816984550758871723654066185212495284751929706880165563383026465915580772865463579247897199838529309378854310889915614625528502632761568910190281774337801881364543991713944075344809701899226892383784271678314714685886908719948316933023056557135833456427443497002534032689522208873415371810533816419800752284063327054238413714578568555973571923650296037630087055021618178380845984510475695301103287006034310828591738298950060609301134567762731907746743761841994007675541745937622408096191580903880547611326180352352981032342643897588811421776903102527752136428376467722899710040494280423287225863837039920136196616878329141859354257162387016898497539466763698215151301023704774429665431712535040383585076443015993638929174790728299898463986685160962071442446566667425914594200298696952128897453316919389739971842638872951616149752983876973079335312529680426392882180789006039762935095057899279588778898494582776497013904843013880869621079379118830152536838138117309429356469355580745541366490120282340988133684870334682324358307731759665143521776264499024976640745821337911280826295399086643639141476187408502151983881758033957217855898668083274772049863478191006888664662001671885884123143263143909395618975055854266592041555848777558357072650098858372437931930686613310896895602632895700003181954208407209099454663153265794901543384316235373749274712393703857198741464191487505278427097393334108266687945907626489488120653263202880594286948617755789756074604802082602309380277045920640202702100393845773922626110295425618820189465933445609410552096757561699755360604384228493895672340709686212494942587526138697051122282925194680058732645427342456806099528108115908264928653820400119284224235958076489556838001134272614130845644312469245347470009280915101886437893849395033255373585017197933622908037652177807155877708522884206301086315297934713695467866208038169910430353726207845531374109215116372537021751657202562992113646586939641938093936292601815309259863929034155449280442844386423409911036441115036282587137779031922225880901624274724437305428513955436648922679041506436970041338071867652919845215858777771126945331219420336857555322229533149772806948001808664118562417932821321928940120108530686849834046171583579501722695874688564088697967214167549920608068114732723610361970646738800826659225617978104504588164946948724848322219152704152288874488470876938352267669076514391051000107910046294150260833265580692823514811650285503586825373652834118811977117668018823370738943676477566478264288260507893687166804782442268806634604683164080683053397736528303794274781301681916468133987818109746226556834925781724114017058942586134937442120514146659376371829465058813257200715592659388663539036130655307598060425675434797812528583235994712785442008487160535385909690393581235536596404478938549600831112335000859491140953727800985206450150166225531629903984194644381327355987731015115526137591242374239729715846359101916678012440073167131635290203514493294451650176902265704946227967288924011028830056849245167073901816437531635840725661179907297670233118291975049726845755695554590821672869566558354851411178720732819216274042877574636945829012204425264860077047400207701702142707525914011935687929601793908488133844267581049033113384687627752036465113249365776225995659324529387001347583072815504061116580749441505255772076736355478247311467537284851271844771240085938276042970477795801479815833537676291490639420910079150844419378928267452394407625640646288317239278123352914786242427157101824063875103504992516079706616721327725437709218481389479243037179161806588509567718875999405132260340120992041032830531793217433690622921147241726709071492357616899283527344618208415574909682572692154001464307160717327595964124651253501231968951814565251795370495777892189196397745261552089220717718938067796682221576795819811884699526415374718066757459362642121093866414087094681627553949151473869620040841419591469953860207505677891896239118574479957999840429128538153266234673788690586729651724759078991571861821809573640713400500319769867950252109683766226279212409507214440652621119051878721061131853527584968009904084186204419514068739235035257876284014677520239022945771418295046647234908123056342031382302906762607298020635482685045275687455715636469722480840646196754602293959627519957163120031626296437023987658743659193397471190965768278934720208417758617846042630657462054396138035818793327882847805030789395310011983235115321223926996055788919107641154806928213124749520313343007134614408551863439683825171474319773335180486932810294901261692681114645783578759890480836997175488852342999977178139412201031779686030320429156269103355659728706512664808743562674109764649631584760341235701990400578254327498964999234735024086264189513552360960805508223633479807080336684872883633655130778680688831419909187662159762931921009883254364295163578465860274374383800256907613973839527747296624126372962725214718782668587262884513939323067540539795773499879543838080396262315207774233342597890891050898129661350773239588280489586766570647992972597467587535603589359325214733985841590265755023151283736209799294445662159671206336809649820749105961178265386131731998872178009895125041571386489870878085015997709204383634202181188107808629399210860223663093121943644626557508706920206805317733010482250922912507559330083056368528873066487850535560778274920984981200048023006775742561173383873903129924544111607083193731219621143358704348628336866151382466572028098544507330228054102548117440241216968622846663074420254218452506392254630496725369417858894064823148723064856495558235114730342658642140536497142197600095229706761075240889796905867888430300098317041140221032520401264406427459153389331437819151408040614371498927970033946872214210493841992984673808412021442065104401712902592072933347501919521181482695954153567003875966130271611080597105571473950479382529681791860582059416724063913375336635933901138279861460773010666421914426659678875923191722780542655299974043920632974246636690075504612038320685002426290051068730403807669840340612231447565648608081949823077038584620508064144962258162480493443028008906532039276394553514160462294205858353401232707289697835284706412449801126397235314099627290951197297401051706438067041962157487116079274576112148162250598238171878716385228432448696845688527807798549061026561542138818980670341496314437083348773564473432596837680143062308395853390836007810570784000462212007338633236917186357777943265685320303648451181816585479818576020250544581629720590030231001823141115865929113164290413534636243384083795709245786729274668504034452724596620198080900498448863328700170834865963965124960946299071180383971480996410126120842959089018507865874437640262568753671574544222919473147385531608985364910663856815359288863124234982486642149743370428406830476074334990315409759901043648786515948659682343548430737201092643359114302536080946139859260646982015445829629736359435673639547941487269332225070016793069933920088707732186685708578096999501529512407615486176046045646596840912362144694203127721487156952254480814485828150843293921836053614805345058885990411923008736097409236751749358591684196989781551676461745772721102713321309676735302678465649079242574624783459109376133899996010489942520988818777380892701335573560942932733820571862034197865233227622017599677955158789576019354316739589446353888966815636881214817966822668948734647300081304805701504892886682366098399451854626786365566444670401453518713175975503389944523785820181973200099562990004658026738848147489708687898099666481054158174135005993892624582452577985724237730441020212863008277266940383078213337488867199117955749999228242705563540481612520096288120256446192577737898241452193927144789420879743444569836045557364954816903879325874977773458306793285095692556335742412777709508828349001586111985348515407377251216236384125235969942682349187400243994508341039023284748876718943352925779085987328714701392398845338825943433486457849999338212747741345888227864761750893635021726050550575473150245226601306498295460518067574518332192544115934482454472221802957169613024830270745384728838223152013448021061235785350253295610814358182380634104660885105886969507535785748351847047569248056008772240947874978873551497205127995339625323732812369438370884603138293847321702951014143134614127249743477559064175700215696038074141488265164873363586058671678384452498006685941292007866154984329868881541255495807505320710472571671748073815397267799093052501888953780363014732623624139302480478776924225890052435040090458407474276618309327682397518754514263980554606748429778629496867405894071451227399286040109997658437846101434265103027037248926769765376721169899191826760852451527175949075156286560166361708852680376296903542390328954354332690640469272656088240158503246608882841878055874690705786000880660154431456033625695165787965152187622969664126885403193910427645527913890334113975296687820516088909209452973461902780564737358148090136523981271672620294241056077010665173493850034085409806605326313020492979175573043125785439160675834221258907221755225968897976469083128130852229941759741458016117621655650075991267433508529262926091576806595643588858803949151782050950501295745550633159065165680876026165932417792209106834312692294033848081970312354150711171312017391110329583018443414623964166917041295453756710063726034562353287527184451322358942545112369819764472040194649635982615062243121781097026400674184346974399823901022927587846284831428979053575877199040924664258310320425872362191217220906333185427462161407838951604894747086740588715875858865055436023851627875668176851838453198003508680580046083680876831363385637415563589399750959554780029582254920499520715711666057251121666250419572545138497212130252439256390257623436297928253288643760612647529065896508526864938226588744496513294964919525110153801678039811350749460532255363863143168159487683529675092840147661978805943611065144876050167823142143639020349173560165473378692026591513549457033269009336117340191342808864589815938863707451670725107085634537030038400176255439969660243899522727588615432987894980907506450825593555290500200608910660427501080538269532552744738914157029147423441594779265840631359053190152498540947063669633060187418423664731745473939914432442314256745210385842357240784140401847613354484180335262250667929003796222662273226044271450162275764498877226549465084432668095582123000752329465096459617518297601922099451518319984067938867720822244101362396404800714592584778994535663914754156327999167834856309897308775180912633740545130761862592589017000483060216749827125306554685305574172393967161876626291951402289896047533462859434055341513751850476120686883028644100273660945082616895785208164796923509513113304006796226254943537989861274526229018642469873339329205542225849941825263243796628670145667373267561297833102797556780267996242191222105437906673244470382938467711923676588445982349689092859722934493351197987142222123609791905556903214023939371593155046337082794027540035193242779473018738108532306501010357524684185188091074426076379416380758388806926243685404031192941948778568272096576216632763258542339307446647514137090298513369712945609576227751652773754102085572052101733721886276651281709258674916081653954501188226697744604215045223718160508341202186569900604226527536686640763071849769821466138093872438716035311297392430264095472847810413147288217672601200769163944905511269280940320452649665972682334570690906968905390258067245481050212402018101660807805540310615666809330363449639532116349303889671726052327482545778602554055112316111463304770457339506211724175798054686054099924004647712129910715275892412526928602395737740914753263504969773834095668552876241567830548645921540108186663207553569533397081166378286864184842318461012912138767506484013719970918219432847734406267798260357360384427623498068607376212449395523967839391197079917550715844319815510659960688871526717293944827591666754843822995768618904507556614212618112403171932944414360143864057088220559674188522078093571298997031007064472557756777246465486189501228877244119808533291931671722144943867500681554093398575667073587096846006171791232189865675943942746359186286509739825604118423797544455103975851955615128971462417884394802489594058780509847181099440930390269886675945039860961805010041069177754469974170368468180484503532409976085612840608446686336809051960789240427609463031687469384772750896940800777170468306364953428618324306493123399321977592837990924384145558007951069010493104399747161938730645961064015546087952890185970154640979572038856664045255764779155362412837722508104629197584611467838011905185197569490170751098701724125633454100372509606906908290702498955387634897979589381301493634649180943342231100360492752127702920916260795827055025510744627019200848019502529053505899453384206493394476829024304005260508241092343800494599141753279541568697823223494943060155484530787776450993442958456462120575665532390589855242309955169347823477826077282708238153962826528987879478396599314249738920792503480559481262115859733747926497747794853101332818813387089821795586184404737029022350050254335805614086459473575702939055480280763171939196446216419636194114393622045155991533206369090622153637851366088433753591610674009365342601329362630201562839230498943103457384679810966141277216322652108858235216405019248981713991321316252993634365401392485095147480208499873409979300560081715773903765762205322454622841944412004500099539263620082469573014436898897760908260580738805129764643455241454580539824834449545902567083359707072156569126072882038959216186085413169281000280406591622233043785013163264294555124288722248526240666982533089591132024449203047005824179679540963186722844149179651281158023011629401605121038116546671606907082124214928343175941608978781519944575189015552067129248019180394943682505250487311337349279229915493663489657580734470599542455995381820705665731398359205662252702096086772547697424566332559940141951648094853715194727192096222529784585283554385757489898630814882453973239967455213194150351839276774117205152893224839866160099968390230955134676061168786705994725769856389047845053051644433818584462020247121629146310754255203772194118842225349972967304837424635267071294940137545387982644209828745096600615579229030204947029816525105377826870973915620334216890500149024821848131714947390199352486380765069874268672533743980348198196892901620407850247757781790739319731093033010236922690982055108291300805127352047236427644365204364647189014511234006961409941597254992013587620232849981097256172583984355237252767675985622431891181839352200576253963645889170200406331763932759367631232359571532187585878355282065308535683868279927736563103520060016606102122036909667990362560584344274496811512690481637885963310939308182233402662726426134766771801910165427893065838761130927310403619472151579264251664889710972365402639908134571850538431620856308782602417187292248201565641473343725988997648884834980544893349811421211197187580981155556002183446699929649597615722409309520964725638592473234927287119391380974538399756071595434167096446643219268235035404149575587141007528474419015575192069719453875520677018011789210636610575152634691315336507658612293452988343012365809771436298637184492439752188690567720541515525184429596705576644536692965410138691742413182766122903199761776555839172480877481871102170468025528637895072942021362891838832404480289989203627065264567352714472492591433915911459116861344701243412787078882157160767093695739092490390478693521698519070543675834975115996548629670897843422936345858547111904863043759394507331836692526926524839326555935660975556919503155850713568051710907472183245572250341617614807097766996512080507534695569961663559140713021273127708556444720075102193417756170060815771153470192302973649358574688355562000349571788153200050638473241644878955124951473790764521065131511316140738007397365739036769922275089275075824762457382158062502000030557252848205945351389652852077245280467487993521881966163683517036374213924399477593329607968983730153456105065736068149067977441758025635433126744759857564338605407092737149935400598266819679342361556582685247496433116294220458733382542066735670181710354510305733189306191858887980917590520013523575384482262150364023295209773221751412848054112534064506603028325687861768379545241821483908930528204390320506021305665056859803844493628698590622118615490692978337990981733917148909478739128081991181374667391203360453396216505825952530289321767703352173755437934109138280356258784113688224917649552393648465365976444568971855712261525574120837593169279354957174546295629812884110338295880619083815497580860492427266056018218719251219417558911669364985908880907040193860952010946664357455457354693179286607604280817553210277636946084645527965158124677694359066684261713430167071438319854772530056350695811711976908103700055272107199892175284994907487482120532561441660308719300048708232496644809187119181011048038054313189589697508538631965789816248776626515267230095113782883609476250801540285487028318797079149784097343572130834895666594528606225952311744920409987648211073815610863957341581402486207326827380688973738888258496238190973613972961354365102261084993101664071479527253785921239840450748148485357274564077392206443637743503259188535162894244800473349919234342218726137751364301857748893347760752397163409831148813804358247222751488730815939831343970704626994242235229834737061579579233825479794426522915924071158272676123213677531742434864271020487111654934889973449825442574714547812528938848382274731210883358241795508383111560034357345893819908750510043409423070724505099909997970976216280789781454953845035742731375213483461528915421224910383433174423881153276738952563693169496940428556073656764912574812751665609775374661437049398709977033824791429107260076108978187803185786940050786905535344354155473163758753943735318863500916475081377364951424057064334627294914063909694738356164517171812403030320201876612448891521722965588532773052635889868042314522270243532037203881999013246711948265738052984284573774220992008026520627037465035404038147540364926180904842445108713649595541253893105589946678651937006582708207819367572149106329020988150170052910768192004756869077004021329540736545947633241368078692027991174948664320846982701891093705012406482134121711113312411911434606564778400593816147401794967347094693434603084810670752168014036605960532952533693888014027541301817072487633112403424038802934238157495370684154498021903318053068709446405012473385697228243642632678241944112762241065090676830017143258891067283500111370953977901228217335"],
    ["2 1 4","1000 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92 93 94 95 96 97 98 99 100 101 102 103 104 105 106 107 108 109 110 111 112 113 114 115 116 117 118 119 120 121 122 123 124 125 126 127 128 129 130 131 132 133 134 135 136 137 138 139 140 141 142 143 144 145 146 147 148 149 150 151 152 153 154 155 156 157 158 159 160 161 162 163 164 165 166 167 168 169 170 171 172 173 174 175 176 177 178 179 180 181 182 183 184 185 186 187 188 189 190 191 192 193 194 195 196 197 198 199 200 201 202 203 204 205 206 207 208 209 210 211 212 213 214 215 216 217 218 219 220 221 222 223 224 225 226 227 228 229 230 231 232 233 234 235 236 237 238 239 240 241 242 243 244 245 246 247 248 249 250 251 252 253 254 255 256 257 258 259 260 261 262 263 264 265 266 267 268 269 270 271 272 273 274 275 276 277 278 279 280 281 282 283 284 285 286 287 288 289 290 291 292 293 294 295 296 297 298 299 300 301 302 303 304 305 306 307 308 309 310 311 312 313 314 315 316 317 318 319 320 321 322 323 324 325 326 327 328 329 330 331 332 333 334 335 336 337 338 339 340 341 342 343 344 345 346 347 348 349 350 351 352 353 354 355 356 357 358 359 360 361 362 363 364 365 366 367 368 369 370 371 372 373 374 375 376 377 378 379 380 381 382 383 384 385 386 387 388 389 390 391 392 393 394 395 396 397 398 399 400 401 402 403 404 405 406 407 408 409 410 411 412 413 414 415 416 417 418 419 420 421 422 423 424 425 426 427 428 429 430 431 432 433 434 435 436 437 438 439 440 441 442 443 444 445 446 447 448 449 450 451 452 453 454 455 456 457 458 459 460 461 462 463 464 465 466 467 468 469 470 471 472 473 474 475 476 477 478 479 480 481 482 483 484 485 486 487 488 489 490 491 492 493 494 495 496 497 498 499 500 501 502 503 504 505 506 507 508 509 510 511 512 513 514 515 516 517 518 519 520 521 522 523 524 525 526 527 528 529 530 531 532 533 534 535 536 537 538 539 540 541 542 543 544 545 546 547 548 549 550 551 552 553 554 555 556 557 558 559 560 561 562 563 564 565 566 567 568 569 570 571 572 573 574 575 576 577 578 579 580 581 582 583 584 585 586 587 588 589 590 591 592 593 594 595 596 597 598 599 600 601 602 603 604 605 606 607 608 609 610 611 612 613 614 615 616 617 618 619 620 621 622 623 624 625 626 627 628 629 630 631 632 633 634 635 636 637 638 639 640 641 642 643 644 645 646 647 648 649 650 651 652 653 654 655 656 657 658 659 660 661 662 663 664 665 666 667 668 669 670 671 672 673 674 675 676 677 678 679 680 681 682 683 684 685 686 687 688 689 690 691 692 693 694 695 696 697 698 699 700 701 702 703 704 705 706 707 708 709 710 711 712 713 714 715 716 717 718 719 720 721 722 723 724 725 726 727 728 729 730 731 732 733 734 735 736 737 738 739 740 741 742 743 744 745 746 747 748 749 750 751 752 753 754 755 756 757 758 759 760 761 762 763 764 765 766 767 768 769 770 771 772 773 774 775 776 777 778 779 780 781 782 783 784 785 786 787 788 789 790 791 792 793 794 795 796 797 798 799 800 801 802 803 804 805 806 807 808 809 810 811 812 813 814 815 816 817 818 819 820 821 822 823 824 825 826 827 828 829 830 831 832 833 834 835 836 837 838 839 840 841 842 843 844 845 846 847 848 849 850 851 852 853 854 855 856 857 858 859 860 861 862 863 864 865 866 867 868 869 870 871 872 873 874 875 876 877 878 879 880 881 882 883 884 885 886 887 888 889 890 891 892 893 894 895 896 897 898 899 900 901 902 903 904 905 906 907 908 909 910 911 912 913 914 915 916 917 918 919 920 921 922 923 924 925 926 927 928 929 930 931 932 933 934 935 936 937 938 939 940 941 942 943 944 945 946 947 948 949 950 951 952 953 954 955 956 957 958 959 960 961 962 963 964 965 966 967 968 969 970 971 972 973 974 975 976 977 978 979 980 981 982 983 984 985 986 987 988 989 990 991 992 993 994 995 996 997 998 999 1000","10201 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92 93 94 95 96 97 98 99 100 101 102 103 104 105 106 107 108 109 110 111 112 113 114 115 116 117 118 119 120 121 122 123 124 125 126 127 128 129 130 131 132 133 134 135 136 137 138 139 140 141 142 143 144 145 146 147 148 149 150 151 152 153 154 155 156 157 158 159 160 161 162 163 164 165 166 167 168 169 170 171 172 173 174 175 176 177 178 179 180 181 182 183 184 185 186 187 188 189 190 191 192 193 194 195 196 197 198 199 200 201 202 203 204 205 206 207 208 209 210 211 212 213 214 215 216 217 218 219 220 221 222 223 224 225 226 227 228 229 230 231 232 233 234 235 236 237 238 239 240 241 242 243 244 245 246 247 248 249 250 251 252 253 254 255 256 257 258 259 260 261 262 263 264 265 266 267 268 269 270 271 272 273 274 275 276 277 278 279 280 281 282 283 284 285 286 287 288 289 290 291 292 293 294 295 296 297 298 299 300 301 302 303 304 305 306 307 308 309 310 311 312 313 314 315 316 317 318 319 320 321 322 323 324 325 326 327 328 329 330 331 332 333 334 335 336 337 338 339 340 341 342 343 344 345 346 347 348 349 350 351 352 353 354 355 356 357 358 359 360 361 362 363 364 365 366 367 368 369 370 371 372 373 374 375 376 377 378 379 380 381 382 383 384 385 386 387 388 389 390 391 392 393 394 395 396 397 398 399 400 401 402 403 404 405 406 407 408 409 410 411 412 413 414 415 416 417 418 419 420 421 422 423 424 425 426 427 428 429 430 431 432 433 434 435 436 437 438 439 440 441 442 443 444 445 446 447 448 449 450 451 452 453 454 455 456 457 458 459 460 461 462 463 464 465 466 467 468 469 470 471 472 473 474 475 476 477 478 479 480 481 482 483 484 485 486 487 488 489 490 491 492 493 494 495 496 497 498 499 500 501 502 503 504 505 506 507 508 509 510 511 512 513 514 515 516 517 518 519 520 521 522 523 524 525 526 527 528 529 530 531 532 533 534 535 536 537 538 539 540 541 542 543 544 545 546 547 548 549 550 551 552 553 554 555 556 557 558 559 560 561 562 563 564 565 566 567 568 569 570 571 572 573 574 575 576 577 578 579 580 581 582 583 584 585 586 587 588 589 590 591 592 593 594 595 596 597 598 599 600 601 602 603 604 605 606 607 608 609 610 611 612 613 614 615 616 617 618 619 620 621 622 623 624 625 626 627 628 629 630 631 632 633 634 635 636 637 638 639 640 641 642 643 644 645 646 647 648 649 650 651 652 653 654 655 656 657 658 659 660 661 662 663 664 665 666 667 668 669 670 671 672 673 674 675 676 677 678 679 680 681 682 683 684 685 686 687 688 689 690 691 692 693 694 695 696 697 698 699 700 701 702 703 704 705 706 707 708 709 710 711 712 713 714 715 716 717 718 719 720 721 722 723 724 725 726 727 728 729 730 731 732 733 734 735 736 737 738 739 740 741 742 743 744 745 746 747 748 749 750 751 752 753 754 755 756 757 758 759 760 761 762 763 764 765 766 767 768 769 770 771 772 773 774 775 776 777 778 779 780 781 782 783 784 785 786 787 788 789 790 791 792 793 794 795 796 797 798 799 800 801 802 803 804 805 806 807 808 809 810 811 812 813 814 815 816 817 818 819 820 821 822 823 824 825 826 827 828 829 830 831 832 833 834 835 836 837 838 839 840 841 842 843 844 845 846 847 848 849 850 851 852 853 854 855 856 857 858 859 860 861 862 863 864 865 866 867 868 869 870 871 872 873 874 875 876 877 878 879 880 881 882 883 884 885 886 887 888 889 890 891 892 893 894 895 896 897 898 899 900 901 902 903 904 905 906 907 908 909 910 911 912 913 914 915 916 917 918 919 920 921 922 923 924 925 926 927 928 929 930 931 932 933 934 935 936 937 938 939 940 941 942 943 944 945 946 947 948 949 950 951 952 953 954 955 956 957 958 959 960 961 962 963 964 965 966 967 968 969 970 971 972 973 974 975 976 977 978 979 980 981 982 983 984 985 986 987 988 989 990 991 992 993 994 995 996 997 998 999 1000 1001 1002 1003 1004 1005 1006 1007 1008 1009 1010 1011 1012 1013 1014 1015 1016 1017 1018 1019 1020"],
    ["3 3 1 2 3 2 3 1 1 3 2","50 300 5 11 23680 10 12 27750 38 26 32338 47 46 1156 50 45 12151 26 8 97837 22 45 73031 38 14 3059 33 26 85400 22 2 19739 21 20 90349 35 42 29699 39 18 23590 22 15 37766 50 21 52397 47 37 7637 41 5 14532 5 6 58446 44 25 65302 3 6 41586 27 23 17980 36 42 24031 24 47 32060 9 27 44225 48 49 51838 20 11 48103 32 7 61116 5 24 24241 33 34 95348 1 5 29337 37 3 82028 13 5 75076 46 42 55514 12 45 39013 33 18 99147 5 14 8654 46 12 18823 13 6 84134 33 39 46245 27 2 49355 29 26 29315 42 18 94770 10 26 23830 19 26 48196 41 47 43317 24 41 33572 24 36 70049 5 50 36937 25 10 72172 43 16 61515 23 16 55719 25 27 89818 50 35 38979 32 15 5101 42 31 31347 8 28 53377 24 43 21362 37 10 92039 34 2 27519 1 42 35345 3 21 90267 3 19 12590 1 3 3447 45 5 72327 49 28 34576 19 31 76888 42 7 9988 13 9 97957 37 5 56143 45 7 1674 1 19 62326 31 10 22251 20 30 78297 29 5 95073 45 26 86567 44 22 99845 19 18 52939 8 33 53074 19 45 77081 4 11 14118 36 20 78792 46 41 11139 9 28 80656 29 42 87240 46 34 97091 50 32 34420 49 1 80348 25 46 18210 9 16 5237 27 11 82757 17 43 89665 8 9 32519 3 24 64926 22 28 18267 13 44 15273 44 20 22527 20 1 13052 28 40 470 6 18 29689 32 21 40536 17 23 57503 44 31 96097 4 32 84501 36 23 51109 49 27 32264 34 39 75864 29 44 65996 50 17 88507 4 38 1807 19 34 3856 22 6 56539 16 20 16330 11 2 19975 35 5 27593 7 19 91886 24 31 51918 1 37 55237 16 8 3848 24 16 60999 41 7 67378 43 1 41505 25 41 99761 26 36 78688 30 17 2006 8 21 77908 11 33 49354 30 19 9868 15 7 98235 34 45 68355 26 28 54747 44 19 75970 46 36 80747 20 34 44744 44 33 68100 18 16 32249 37 16 30418 18 38 60360 37 19 75237 29 49 54524 31 36 66134 46 16 66146 26 4 74880 13 47 13887 4 22 97193 42 11 29946 2 24 36897 11 46 53943 38 3 26436 44 39 41115 49 23 21631 14 41 75473 30 4 71095 36 8 39616 37 49 998 26 1 63951 21 37 72585 18 30 65809 49 36 37421 30 44 49196 22 3 72115 32 49 76770 8 11 6566 30 10 83086 12 13 13432 14 24 9689 5 48 43238 29 46 21961 47 44 95341 12 39 86872 31 14 26312 18 29 91207 15 33 69740 40 13 25506 32 29 56686 7 43 18216 11 45 56963 30 6 5080 49 25 45806 26 21 96643 2 29 94519 49 22 30505 27 38 28481 9 40 43061 49 42 65377 7 47 16682 28 11 57558 2 32 42929 26 13 45705 47 22 86742 9 48 7334 3 20 92023 11 47 55585 43 30 70240 15 48 77295 14 19 80014 21 36 97669 13 1 14911 50 30 58400 5 47 52149 12 30 65521 19 27 58809 28 15 96238 9 50 53633 4 3 47287 25 40 84371 48 3 95743 12 14 35205 18 27 99936 44 38 916 43 22 33037 3 36 60439 36 27 9172 22 30 94633 47 9 71197 28 25 29113 39 49 32508 50 49 17109 18 15 46313 19 46 60414 40 5 82902 45 31 37640 24 17 89694 20 38 80234 10 18 29458 16 26 71093 48 40 50651 18 40 23935 17 5 87845 12 49 92381 1 22 93618 17 15 97092 2 16 58062 45 2 36628 7 21 11066 9 12 51972 44 4 99575 4 6 95964 35 28 5552 46 1 35347 45 36 98519 18 4 3117 4 23 89335 5 7 3601 38 23 39737 42 2 56276 32 44 65269 39 42 44486 5 27 37187 34 17 9717 19 40 65470 47 43 21685 8 46 20380 38 49 70837 39 29 22863 4 37 70315 1 34 48125 10 23 81734 3 29 61998 48 26 18959 45 28 61247 17 46 82193 20 18 12791 35 25 79741 32 28 91106 27 44 13789 44 40 171 30 33 65183 35 45 85982 8 19 95257 34 12 88907 42 12 20372 4 34 34843 9 15 61669 49 18 37686 48 23 41037 28 48 47329 33 42 7 7 37 9979 31 38 62760 6 25 35028 7 17 48759 24 32 6063 15 50 29014 35 40 85834 27 15 29877 18 9 41166 50 34 24555 48 17 7000 25 3 42937 21 49 6824 31 27 17411 28 12 29551 1 36 94909 45 39 76251 27 32 33759 27 4 2880 39 40 78234 9 34 83002 9 38 2535 18 36 32759","50 300 32 6 81230 9 32 16191 33 1 64719 14 50 19094 38 44 94913 15 43 73359 35 29 28704 41 27 71494 16 32 24634 8 48 31907 7 25 70592 25 46 13236 3 48 61003 11 40 34490 6 34 95378 42 6 8190 32 3 3698 30 39 58072 18 32 9393 38 12 24057 15 12 8659 16 4 4381 31 23 44120 19 1 11645 33 7 46353 1 12 42281 48 19 79624 6 7 58804 25 27 59508 16 3 26089 38 26 3490 39 41 95670 8 20 75733 3 49 69232 49 25 96319 12 41 62498 49 32 78250 46 4 70106 29 47 95760 16 9 94977 9 41 91596 29 46 18914 29 41 31390 36 20 7365 22 10 43157 38 1 42628 39 5 85649 11 18 44630 21 10 63434 1 4 24758 6 46 42414 3 18 75788 25 9 32650 11 12 61538 26 8 92279 47 7 44160 39 36 10722 50 7 82470 33 29 43642 47 45 44633 43 19 16409 28 7 63696 8 25 3970 5 6 56050 30 41 1297 36 13 57173 17 20 21973 47 20 58505 45 15 20423 9 47 19718 27 26 21271 15 35 91169 5 41 68287 21 3 60098 23 7 43724 3 25 77869 26 1 42283 45 10 89449 9 44 7018 4 6 73323 27 35 16345 10 25 50923 5 8 5371 37 44 72753 47 50 74988 36 32 94327 12 34 9945 2 10 78238 5 18 51364 33 11 51500 14 4 89830 43 35 37784 39 33 12168 27 39 73598 31 13 83578 33 32 77692 7 22 21285 13 18 80657 13 7 3728 24 48 62299 48 12 12851 10 1 61925 27 31 38175 36 5 90936 17 24 91393 7 19 7254 9 19 37770 17 2 75098 18 24 66124 41 38 36096 23 13 74942 34 42 89241 19 37 67437 15 40 58866 49 27 89007 30 7 9910 40 5 82382 6 25 61600 17 43 79987 12 37 61190 17 41 56184 38 6 88213 4 40 45616 25 36 24384 49 50 90248 31 15 12024 27 33 42816 31 46 12830 5 3 61471 16 46 74195 9 50 19562 37 23 5587 49 5 29707 20 1 88619 34 28 90806 2 20 13913 3 7 23247 20 39 66401 46 28 7245 3 22 6296 47 21 28947 42 14 71714 30 37 42986 32 31 93153 13 27 63786 7 44 97955 5 16 18134 9 10 20317 10 50 39047 23 10 23216 34 45 68559 2 12 16568 10 42 49305 23 4 73145 32 28 49831 35 22 62110 14 49 612 4 44 94854 47 31 69050 48 49 96185 47 14 98549 24 13 41268 48 23 88437 32 37 16843 26 40 6177 22 25 51067 9 39 25522 7 16 84047 43 45 87696 11 44 85231 24 33 73881 41 16 80140 37 9 34555 25 18 50376 18 40 28753 47 41 97977 48 13 78757 20 48 58793 12 35 1951 44 32 94988 3 31 57438 21 30 76640 22 50 30641 36 29 97425 50 8 49729 10 6 23026 15 42 39300 29 6 57603 5 33 52405 11 19 16454 20 5 20361 36 10 51222 23 33 26072 36 35 80239 19 2 33801 8 18 28873 21 36 90526 3 9 50217 16 49 31993 21 7 87978 37 29 48087 22 24 35998 34 3 15330 50 26 243 33 49 87895 24 19 38409 42 31 49279 30 13 80959 8 19 7202 36 18 3197 6 23 75621 32 47 33888 50 4 30332 30 44 42208 4 25 59070 17 3 100 20 22 86457 2 40 55140 29 12 18307 38 5 18273 22 33 9518 44 21 52103 40 14 59608 21 8 26129 8 38 39713 44 24 40583 31 11 33142 45 19 81073 27 9 39973 2 18 36325 4 17 26200 17 45 44198 38 23 82362 27 14 17346 4 15 76581 14 20 17242 33 31 41179 46 9 14532 37 31 92655 29 25 7611 24 1 61986 29 19 71870 44 36 40844 18 46 79412 5 21 46283 30 1 3547 11 2 36185 29 3 59715 8 7 2511 2 9 28877 50 11 75001 41 4 10899 31 12 24034 37 16 83468 5 35 42464 13 37 27963 35 25 46854 10 19 83194 41 44 80337 45 44 16629 29 48 31603 11 43 23999 5 4 58066 9 24 47245 10 44 37260 18 37 88049 21 39 6147 8 29 66400 45 48 39906 18 7 84970 6 37 84527 36 31 60862 27 44 98369 39 17 87973 1 13 44348 16 34 6927 9 15 50391 27 12 78966 4 36 64203 27 45 22457 19 12 48933 11 20 58010 42 49 20040 31 8 16268 13 19 59377 44 33 47825 41 43 40429 37 24 11379 38 39 24148 22 13 32961 47 8 70514 35 16 6267 1 2 76723 45 35 19524 38 50 60519 13 14 87758 4 22 91047 21 22 43496 34 24 91343 48 17 56322"]
];

let input_ques=[
    "Given two integers L and R find the maximum xor which can be achieved by selecting two numbers a and b such that L <= a,b <= R<br>"+
    "Input Format:<br>"+
"First line consists of number of test cases T <= 10 then follow T lines each containing two space seperated integers L and R.<br>"+
"Constraints:<br>"+
    "1 <= L,R, <= 1000<br>"+
"Output Format:<br>"+
    "maximum xor for every test case in same line separated by space<br>"+
"Sample Input:<br>"+
    "1<br>"+
"10 15<br>"+
"Sample Output:<br>"+
    "7<br>"+
"Time Limit: 1 sec"
    ,
    "You are given a string s consisting of digits only (from '0' to '9'). Your task is to count in how many ways you can partition the given string to sub-strings such that each sub-string is a good string.<br>" +
    "A good string b, contains unique digits only (i.e. each digit from '0' to '9' can exist at most one time).<br>"+
"Input Format:<br>"+
    "First line contains a string s consisting of digits only.<br>"+
    "Constraints:<br>"+
"1 ≤ |s| ≤ 10^5<br>"+
"Output Format:<br>"+
    "Print the answer modulo 10^9+7.<br>"+
"Sample Input:<br>"+
    "5112516<br>"+
"Sample Output:<br>"+
    "28<br>"+
"Time Limit: 1 sec",

    "Piyush and Nimit are playing a coin game. They are given n coins with values x1, x2 .... xn where 'n' is always even. They take alternate terms. In each turn, a player picks either the first coin or the last coin from the row and removes it from the row. The value of coin is received by that player. Determine the maximum value that piyush can win if he moves first. Both the players play optimally.<br>"+
    "Input Format:<br>"+
"First line contains the number of coins 'n'. Second line contains n space separated integers which is the value of ith coin.<br>"+
    "Constraints:<br>"+
"N <= 10000<br>"+
"Output Format:<br>"+
    "Print a single line with the maximum possible value.<br>"+
    "Sample Input:<br>"+
    "4<br>"+
"1 2 3 4<br>"+
"Sample Output:<br>"+
    "6<br>"+
"Explanation: Piyush will pick the coin 4. Then nimit can pick either 1 or 3. " +
    "In both the cases piyush picks coin 2 and wins with a total of 6.",

    "Naagina lives in Naagaland which consists of N cities(numbered from 1 to N) that are connected by M bidirectional roads.<br> The roads are designed" +
    "such that there is atmost only one road between any two city, although there may be more than one path between them.Each road had it's own cost Ci.<br> " +
    "It is also known that there is atleast one path between any two city, i.e., Naagaland is completely connected.There is a war about to happen between" +
    "the cities. Damage when two cities fight is described as follows:<br>" +
    "When city A and B are at war the damage cost is the minimum sum of cost of roads which if destroyed the city will no longer remain connected.<br>" +
    "Naagina must estimate the product of damage over all unordered pair of cities. Help Naagina to solve the problem.<br>" +
    "Since the answer can be very large print the answer modulo 10^9 + 7.<br>" +
    "Input Format:<br>" +
    "First line ocontains two integers N and M, separated by a single space.<br>" +
    "M lines follow. Each of these lines consist of three integers Xi, Yi, Ci denoting that road between the city Xi and the city Yi has cost Ci.<br>" +
    "Output Format:<br>" +
    "Print a single line consiting of an integer which denotes the answer.<br>" +
    "Constraints:<br>" +
    "3 ≤ N ≤ 500<br>" +
    "3 ≤ M ≤ 10^4<br>" +
    "1 ≤ Ci ≤ 10^5<br>" +
    "Sample Input:<br>" +
    "3 3<br>" +
    "1 2 3<br>" +
    "2 3 1\n<br>" +
    "1 3 2\n<br>" +
    "Sample Output:<br>" +
    "36<br>"+
    "Explanation:<br>" +
    "Three unordered pairs: (1, 2), (1, 3) and (2, 3).<br>" +
    "For 1 and 2 we have to remove the first and the second roads. Damage is 4.<br>" +
    "For 1 and 3 we have to remove the second and the third roads. Damage is 3.<br>"+
    "For 2 and 3 we have to remove the second and the third roads. Damage is 3.<br>" +
    "Answer is 4x3x3 = 36."
];

let max_scr=0;

$(function () {
    let time;
    let lbl = $("#time");
    let myVar = setInterval(timer, 1000);
    //for the purpose of showing
    let score = $("#score");
    let submit = $("#submit");
    let moveon = $("#moveon");
    let test = $('#test');
    let next = $("#nxt");
    let Dbox = $("#Dbox");
    let whiteBG = $("#white-background");
    let rightans = $("#right");
    let guy = $("#guy");
    let input = $("#input");
    let report = $('#report');
    let loader = $("#loader");
    let wholeQues = $('#wholeQues');
    let instruc=$('#instruc');
    disabler();


    $.post('/detail',function (data) {
        score.text(data.score);
        time=data.timeLeft;
        ind=data.level;
        wholeQues.html(input_ques[(ind/4)-1]);
        imcq=data.mcq;
        enabler();
    });


    instruc.click(function () {
        window.open('instr2.html');
    });

    var code = $("#text")[0];
    var editor = CodeMirror.fromTextArea(code, {
        mode: "clike",
        theme: "eclipse",
        tabSize: 0,
        lineNumbers: true,
        extraKeys: {"Ctrl-Space": "autocomplete"}
    });

    var langCode = 3;
    let language = $("#language");

    var Cpp = "#include<iostream>\n#include<cmath>\n#include<cstdio>\n#include<vector>\n#include<algorithm>\nusing namespace std;\n\nint main(){\n  \n/*Write your code*/\n\nreturn 0;\n}";

    var C = "#include <math.h>\n" +
        "#include <stdio.h>\n" +
        "#include <string.h>\n" +
        "#include <stdlib.h>\n\n" +
        "int main(){\n/*Write your code*/\n\nreturn 0;\n}";


    var Java = "import java.io.*;\n" +
        "import java.util.*;\n" +
        "import java.text.*;\n" +
        "import java.math.*;\n" +
        "import java.util.regex.*;\n\n" + "public class Solution {\n" + "  public static void main(String[] args) {\n" +
        "    Scanner scn = new Scanner(System.in);\n     //Write your code\n    }\n" +
        "}";
    var Python = "#Write your code here";

    var JS = "function processData(input){\n//Enter your code here\n}\nprocess.stdin.resume();\n" +
        "\n" +
        "process.stdin.setEncoding('ascii');\nvar input_stdin = \"\";\nprocess.stdin.on('data', function (data) {\n" +
        "\n" +
        "    input_stdin += data;\n" +
        "\n" +
        "});\nprocess.stdin.on('end', function () {\n" +
        "\n" +
        "  processData(input_stdin);" +
        "\n" +
        "});\n"

    editor.setValue(Java);
    language.on('change', function () {
        langCode = $(this).val();
        console.log(langCode);
        if (langCode == 1) {
            editor.setValue(C);
        } else if (langCode == 2) {
            editor.setValue(Cpp);
        } else if (langCode == 3) {
            editor.setValue(Java);
        } else if (langCode == 5) {
            editor.setValue(Python);
        } else if (langCode == 20) {
            editor.setValue(JS);

        }


    });

    var response = $("#response");
    var returnContent = "";
    var codeVal;
    var one = $("#one");

    test.click(function () {
        disabler();
        inputs=[];
        codeVal = editor.getValue();
        inputs.push(input.val());
        inputs=JSON.stringify(inputs);
        console.log(inputs);
        result1();
        response.val(JSON.parse(returnContent).result.stdout[0]);
        inputs=[];
    });

    submit.click(function () {
        disabler();
        inputs=[];
        codeVal=editor.getValue();
        inputs=JSON.stringify(ques_inp[(ind/4)-1]);
        console.log(inputs);
        result1();
        console.log(returnContent);
        codearray=JSON.parse(returnContent).result.stdout;
        console.log(codearray);
        let count=0;
        for(let t=0;t<ans[(ind/4)-1].length;t++){
            if(ans[(ind/4)-1][t]===codearray[t].trim())
            count++;
        }
        max_scr=Math.floor((count*4)/codearray.length);
        report.text(count+" out of "+codearray.length+" testcases passed");
        inputs=[];
    });
    var result1 = function codeChecker() {

        var jsonToSend = querystring.stringify({
            'request_format': 'json',
            'source': codeVal,
            'lang': langCode,
            'wait': true,
            'callback_url': '',
            'api_key': "hackerrank|1519194-1545|25d6fbfd1d3a849eaf98463723fd7120a28f244c",
            'testcases': inputs
        });


        var HRoptions = {
            hostname: 'api.hackerrank.com',
            path: '/checker/submission.json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(jsonToSend)
            }
        };
        var HRrequest = http.request(HRoptions, function (HRresponse) {
            HRresponse.setEncoding('utf8');
            HRresponse.on('data', function (data) {
                enabler();
                try {
                    returnContent = data;
                } catch (e) {
                    returnContent = "Error: " + e;
                }
            });
        });

        HRrequest.on('error', function (e) {
            enabler();
            returnContent = "Error: " + e.message;
        });

        HRrequest.write(jsonToSend);

        HRrequest.end();
    };

    next.click(function () {
        whiteBG.hide();
        Dbox.hide();
        rightans.hide();
    });

    function content() {
        var s = JSON.parse(returnContent);
        console.log(s);
        var output1 = s.result.stdout;

        response.text(output1[0]);
        loader.hide();
    }

    function timer() {
        time--;
        if(time===0)
            endgame();
        lbl.text(Math.floor(time/60)+":"+time%60);
    }

    moveon.click(function () {
        if(max_scr===0)
            max_scr=-2;
        $.post('/update', {
            lvl: ind+1,
            scr: parseInt(score.text())+max_scr,
            g_time: time,
            mcq: imcq
        },function (data) {
            window.close();
            window.open("quesPage.html");
        })
    });

    function disabler() {
        loader.show();
        moveon.attr("disabled",true);
        test.attr("disabled",true);
        submit.attr("disabled",true);
    }

    function enabler() {
        loader.hide();
        moveon.attr("disabled",false);
        test.attr("disabled",false);
        submit.attr("disabled",false);
    }

});

















}).call(this,require("buffer").Buffer)
},{"buffer":3,"http":27,"querystring":16}]},{},[37]);
