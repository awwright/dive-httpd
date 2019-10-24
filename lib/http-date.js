'use strict';

// String#match will return an array with:
// [full, day_name, day, month_name, year, hour, minute, second]
const IMF_fixdate = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/;

// [full, day_name, day, month_name, year, hour, minute, second]
const rfc850_date = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{2}) (\d\d):(\d\d):(\d\d) GMT$/;

// [full, day_name, month_name, day, hour, minute, second, year]
const asctime_date = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([ 0-9][0-9]) (\d\d):(\d\d):(\d\d) (\d{4})$/;

const Months0 = {
	Jan: 0,
	Feb: 1,
	Mar: 2,
	Apr: 3,
	May: 4,
	Jun: 5,
	Jul: 6,
	Aug: 7,
	Sep: 8,
	Oct: 9,
	Nov: 10,
	Dec: 11,
}

module.exports.parseHTTPDate = parseHTTPDate;
function parseHTTPDate(str){
	if(typeof str !== 'string') return null;
	{
		const m = IMF_fixdate.exec(str);
		if(m) return [parseInt(m[4]), Months0[m[3]], parseInt(m[2]), parseInt(m[5]), parseInt(m[6]), parseInt(m[7])];
	}
	{
		const m = rfc850_date.exec(str);
		if(m) return [parseInt(m[4]), Months0[m[3]], parseInt(m[2]), parseInt(m[5]), parseInt(m[6]), parseInt(m[7])];
	}
	{
		const m = asctime_date.exec(str);
		if(m) return [parseInt(m[7]), Months0[m[2]], parseInt(m[3]), parseInt(m[4]), parseInt(m[5]), parseInt(m[6])];
	}
	return null;
}

// Determine if `b` is an HTTP-date that occurs after `a`
module.exports.compareHTTPDateSince = compareHTTPDateSince;
function compareHTTPDateSince(a, b){
	if(typeof a !== 'string') return null;
	if(!b) return null;
	const am = parseHTTPDate(a);
	if(am===null) return null;
	const bm = [
		b.getUTCFullYear(),
		b.getUTCMonth(),
		b.getUTCDate(),
		b.getUTCHours(),
		b.getUTCMinutes(),
		b.getUTCSeconds(),
	];
	if(bm[0] > am[0]) return true;
	if(bm[0] < am[0]) return false;
	if(bm[1] > am[1]) return true;
	if(bm[1] < am[1]) return false;
	if(bm[2] > am[2]) return true;
	if(bm[2] < am[2]) return false;
	if(bm[3] > am[3]) return true;
	if(bm[3] < am[3]) return false;
	if(bm[4] > am[4]) return true;
	if(bm[4] < am[4]) return false;
	if(bm[5] > am[5]) return true;
	if(bm[5] < am[5]) return false;
	return false;
}
