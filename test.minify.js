import { minify } from 'https://cdn.skypack.dev/terser';
// import {FS} from 'https://jsv.max.pub/2021/fs/mod.js'
// let code = await fetch(`https://jsv.max.pub/fs/2021/deno/file.sync.js`).then(x => x.text())
let code = await fetch(`https://jsv.max.pub/idbkv/2020/raw.js`).then(x => x.text())
console.log(code)
// console.log('terser',terser)
// var code = "function add(first, second) { return first + second; }";
// let code = `import wiki from 'https://js.max.pub/wiki/raw.js';class AAA{add(first, second) { return first + second; }}`
var result = await minify(code)//, { sourceMap: true });
console.log(result.code);  // minified output: function add(n,d){return n+d}
console.log(result.map);  // source map
console.log('size', result.code.length)