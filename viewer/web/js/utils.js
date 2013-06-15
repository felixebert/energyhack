'use strict';
(function(hdv, _) {
	hdv.array = {
		remove: function(array, valueToReject) {
			var indexToReject = _.indexOf(array, valueToReject);
			array.splice(indexToReject, 1);
		}
	};

	hdv.serialize = {
		toLiteral: function(array) {
			var literal = {};
			_.each(array, function(element) {
				literal[element.name] = element.value;
			});
			return literal;
		}
	};

	hdv.formatter = {
		currency: function(number) {
			var thousand = '.';
			var negative = number < 0 ? "-" : "";
			var absNumber = Math.abs(+number || 0) + "";
			var thousands = (absNumber.length > 3) ? absNumber.length % 3 : 0;
			return negative + (thousands ? absNumber.substr(0, thousands) + thousand : "")
					+ absNumber.substr(thousands).replace(/(\d{3})(?=\d)/g, "$1" + thousand);
		}
	};

	hdv.calc = {
		safeLog10: function(number) {
			return number === 0 ? 0 : Math.log(Math.abs(number)) / Math.LN10;
		}
	};
})(hdv, _);