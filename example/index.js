const omit = require('lodash/omit');

const obj = {
  a: 1,
  b: 2,
  c: 3,
};

function helloWorld() {
  console.log('Hello World');
  console.log(omit(obj, 'a'));
}

helloWorld();
