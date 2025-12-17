"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/scmp";
exports.ids = ["vendor-chunks/scmp"];
exports.modules = {

/***/ "(action-browser)/./node_modules/scmp/index.js":
/*!************************************!*\
  !*** ./node_modules/scmp/index.js ***!
  \************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\n\nconst crypto = __webpack_require__(/*! crypto */ \"crypto\")\nconst scmpCompare = __webpack_require__(/*! ./lib/scmpCompare */ \"(action-browser)/./node_modules/scmp/lib/scmpCompare.js\")\n\n/**\n * Does a constant-time Buffer comparison by not short-circuiting\n * on first sign of non-equivalency.\n *\n * @param {Buffer} a The first Buffer to be compared against the second\n * @param {Buffer} b The second Buffer to be compared against the first\n * @return {Boolean}\n */\nmodule.exports = function scmp (a, b) {\n  // check that both inputs are buffers\n  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {\n    throw new Error('Both scmp args must be Buffers')\n  }\n\n  // return early here if buffer lengths are not equal since timingSafeEqual\n  // will throw if buffer lengths are not equal\n  if (a.length !== b.length) {\n    return false\n  }\n\n  // use crypto.timingSafeEqual if available (since Node.js v6.6.0),\n  // otherwise use our own scmp-internal function.\n  if (crypto.timingSafeEqual) {\n    return crypto.timingSafeEqual(a, b)\n  }\n\n  return scmpCompare(a, b)\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFjdGlvbi1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9zY21wL2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaLGVBQWUsbUJBQU8sQ0FBQyxzQkFBUTtBQUMvQixvQkFBb0IsbUJBQU8sQ0FBQyxrRkFBbUI7O0FBRS9DO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVyxRQUFRO0FBQ25CLFdBQVcsUUFBUTtBQUNuQixZQUFZO0FBQ1o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXFNtb290aCBLaW5nXFxEb3dubG9hZHNcXE5ldyBmb2xkZXIgKDIpXFxzbXNcXHNtc1xcZnJvbnRlbmRcXG5vZGVfbW9kdWxlc1xcc2NtcFxcaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG5cbmNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpXG5jb25zdCBzY21wQ29tcGFyZSA9IHJlcXVpcmUoJy4vbGliL3NjbXBDb21wYXJlJylcblxuLyoqXG4gKiBEb2VzIGEgY29uc3RhbnQtdGltZSBCdWZmZXIgY29tcGFyaXNvbiBieSBub3Qgc2hvcnQtY2lyY3VpdGluZ1xuICogb24gZmlyc3Qgc2lnbiBvZiBub24tZXF1aXZhbGVuY3kuXG4gKlxuICogQHBhcmFtIHtCdWZmZXJ9IGEgVGhlIGZpcnN0IEJ1ZmZlciB0byBiZSBjb21wYXJlZCBhZ2FpbnN0IHRoZSBzZWNvbmRcbiAqIEBwYXJhbSB7QnVmZmVyfSBiIFRoZSBzZWNvbmQgQnVmZmVyIHRvIGJlIGNvbXBhcmVkIGFnYWluc3QgdGhlIGZpcnN0XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNjbXAgKGEsIGIpIHtcbiAgLy8gY2hlY2sgdGhhdCBib3RoIGlucHV0cyBhcmUgYnVmZmVyc1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCb3RoIHNjbXAgYXJncyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgLy8gcmV0dXJuIGVhcmx5IGhlcmUgaWYgYnVmZmVyIGxlbmd0aHMgYXJlIG5vdCBlcXVhbCBzaW5jZSB0aW1pbmdTYWZlRXF1YWxcbiAgLy8gd2lsbCB0aHJvdyBpZiBidWZmZXIgbGVuZ3RocyBhcmUgbm90IGVxdWFsXG4gIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIHVzZSBjcnlwdG8udGltaW5nU2FmZUVxdWFsIGlmIGF2YWlsYWJsZSAoc2luY2UgTm9kZS5qcyB2Ni42LjApLFxuICAvLyBvdGhlcndpc2UgdXNlIG91ciBvd24gc2NtcC1pbnRlcm5hbCBmdW5jdGlvbi5cbiAgaWYgKGNyeXB0by50aW1pbmdTYWZlRXF1YWwpIHtcbiAgICByZXR1cm4gY3J5cHRvLnRpbWluZ1NhZmVFcXVhbChhLCBiKVxuICB9XG5cbiAgcmV0dXJuIHNjbXBDb21wYXJlKGEsIGIpXG59XG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(action-browser)/./node_modules/scmp/index.js\n");

/***/ }),

/***/ "(action-browser)/./node_modules/scmp/lib/scmpCompare.js":
/*!**********************************************!*\
  !*** ./node_modules/scmp/lib/scmpCompare.js ***!
  \**********************************************/
/***/ ((module) => {

eval("\n\nmodule.exports = function scmpCompare (a, b) {\n  const len = a.length\n  let result = 0\n  for (let i = 0; i < len; ++i) {\n    result |= a[i] ^ b[i]\n  }\n  return result === 0\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFjdGlvbi1icm93c2VyKS8uL25vZGVfbW9kdWxlcy9zY21wL2xpYi9zY21wQ29tcGFyZS5qcyIsIm1hcHBpbmdzIjoiQUFBWTs7QUFFWjtBQUNBO0FBQ0E7QUFDQSxrQkFBa0IsU0FBUztBQUMzQjtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxTbW9vdGggS2luZ1xcRG93bmxvYWRzXFxOZXcgZm9sZGVyICgyKVxcc21zXFxzbXNcXGZyb250ZW5kXFxub2RlX21vZHVsZXNcXHNjbXBcXGxpYlxcc2NtcENvbXBhcmUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2NtcENvbXBhcmUgKGEsIGIpIHtcbiAgY29uc3QgbGVuID0gYS5sZW5ndGhcbiAgbGV0IHJlc3VsdCA9IDBcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIHJlc3VsdCB8PSBhW2ldIF4gYltpXVxuICB9XG4gIHJldHVybiByZXN1bHQgPT09IDBcbn1cbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(action-browser)/./node_modules/scmp/lib/scmpCompare.js\n");

/***/ })

};
;