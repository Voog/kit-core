import _ from 'lodash';

export let functions = {
  fn1: (foo, bar) => {console.log(foo, bar)}, 
  fn2: (foo, bar) => {console.log(foo, bar)}
};

export default () => {
  var o = {};
  
  Object.keys(functions).forEach(fn => {
    o[fn] = _.curry(functions[fn])('foo')
  });
  
  return Object.assign({}, o);
};
