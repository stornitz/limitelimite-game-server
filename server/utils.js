// random in [min,max[
exports.random = (min, max) => Math.floor((Math.random() * max) + min);

exports.randomInArray = (array) => array[this.random(0, array.length)];

exports.removeById = (array, elementId) => {
  let index = array.find(element => element.id == elementId);
  
  if(index != undefined) {
    array.splice(index, 1);
  }
}

exports.shuffle = function(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}