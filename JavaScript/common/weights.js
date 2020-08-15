weights = {}; // placeholder for dynamic weights loading

if (typeof module !== 'undefined') {
	weights['v1.0.0'] = require('../howl-models/hey_firefox');
  module.exports = weights;
}