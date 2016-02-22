var express = require('express');
var router = express.Router();
var mysql = require('./mysql').pool;


var monitor_handler = function(conn,monitors,res){
	var monitor_list = [];
	var handled = 0;
	for (var index = 0; index< monitors.length; index++) {
		(function(i,monitors){
		conn.query("select * from trade_last_tick where symbol=? limit 1",[monitors[i].symbol], function(err, rows) {
			if(err != null){
				conn.release();
			}else{
				console.log(monitors[i].symbol);
				var params = JSON.parse(monitors[i].params);
				var last_tick = rows[0];
				if(monitors[i].vaildator == 'higher'){
					if(last_tick.bid > params.bid){
						monitors[i].status = 2;
					}
					
				}else{
					console.log('Unsupported monitor validator: '+ monitors[i].validator);
					monitors[i].status = 0;
				}
				console.log(monitors[i].monitor_id);
				if(++handled == monitors.length){
					console.log("list "+monitors.length);
					res.json(monitors);
					conn.release();
				}
			}
		});
		})(index,monitors);
	}
}

/* GET home page. */
router.get('/', function(req, res, next) {
	mysql.getConnection(function(err, conn){
		conn.query("select * from trade_monitor", function(err, monitor_rows) {
			if(err != null){
				conn.release();
			}else{
				monitor_handler(conn,monitor_rows,res);
			}
    	});
	});
});



module.exports = router;