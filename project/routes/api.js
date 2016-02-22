var express = require('express');
var router = express.Router();
var mysql = require('./mysql').pool;

var price_handler = function(monitor, handled, monitors, monitor_list,conn, res){
	if(monitor === undefined || monitor == null || monitor.type != 'price'){
		monitor.status = 0;
		monitor_list.push(monitor);
		console.log('Invalid monitor type for price handler.');
		if(monitor_list.length == monitors.length){
			res.json(monitors);
			conn.release();
		}
		return;
	}
	conn.query("select * from trade_last_tick where symbol=?",[monitor.symbol], function(err, tick_rows) {
		if(err != null){
			conn.release();
			res.status(500).send('Database Error!'+err.code);
		}else{

			var params = JSON.parse(monitor.params);
			var last_tick = tick_rows[0];

			if(monitor.validator == 'bid-higher'){
				if(params.bid === undefined){
					console.log('Cannot find param bid.');
					monitor.status = 0;
				}else if(last_tick.bid > params.bid){
					monitor.status = 2;
				}
			}else if(monitor.validator == 'bid-lower'){
				if(params.bid === undefined){
					console.log('Cannot find param bid.');
					monitor.status = 0;
				}else if(last_tick.bid < params.bid){
					monitor.status = 2;
				}
			}else if(monitor.validator == 'ask-lower'){
				if(params.ask === undefined){
					console.log('Cannot find param ask.');
					monitor.status = 0;
				}else if(last_tick.ask < params.ask){
					monitor.status = 2;
				}
			}else if(monitor.validator == 'ask-higher'){
				if(params.ask === undefined){
					console.log('Cannot find param ask.');
					monitor.status = 0;
				}else if(last_tick.ask > params.ask){
					monitor.status = 2;
				}
			}else{
				console.log('Unsupported monitor validator: '+ monitor.validator);
				monitor.status = 0;
			}
			monitor_list.push(monitor);
			if(monitor_list.length == monitors.length){
				res.json(monitors);
				conn.release();
			}
		}
	});
};

var handlers = {};
handlers['price'] = price_handler;

var monitor_handler = function(conn,monitors,res){
	var handled = 0;
	var monitor_list = [];
	for (var index = 0; index< monitors.length; index++) {
		if(typeof handlers[monitors[index].type] === 'function'){
			(function(i){
				// skip disabled monitor
				if(monitors[index].status == 0){
					monitor_list.push(monitors[index]);
					if(monitor_list.length == monitors.length){
						res.json(monitors);
						conn.release();
					}
				}else{
					price_handler(monitors[i],handled,monitors,monitor_list,conn,res);
				}
			})(index);
		}
		
	};
};

/* list monitors */
router.get('/monitor', function(req, res, next) {
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

/* add monitor */
router.post('/monitor', function(req, res, next) {
	mysql.getConnection(function(err, conn){
		var query = conn.query('INSERT INTO trade_monitor SET ?', req.body, function(err, result) {
			var res_json = {};
			res_json['action'] = 'add';
			if( err != null){
				res_json['result'] = 'failed';
				res_json['code'] = err.code;
				res.status(500).json(res_json);
			}else{
				res_json['result'] = 'success';
				res_json['monitor_id'] = result.insertId;
				res.json(res_json);
			}
			

		});
		console.log(query.sql);
	});
});

/* update monitor */
router.put('/monitor/:monitor_id', function(req, res, next) {
	mysql.getConnection(function(err, conn){
		var query = conn.query('UPDATE trade_monitor SET ? WHERE monitor_id=?', [req.body,req.params.monitor_id] , function(err, result) {
			var res_json = {};
			res_json['action'] = 'update';
			if( err != null){
				res_json['result'] = 'failed';
				res_json['code'] = err.code;
				res.status(500).json(res_json);
			}else{
				res_json['result'] = 'success';
				res_json['monitor_id'] = req.params.monitor_id;
				res.json(res_json);
			}
			

		});
		console.log(query.sql);
	});
});

/* delete monitor */

router.delete('/monitor/:monitor_id', function(req, res, next) {
	mysql.getConnection(function(err, conn){
		var query = conn.query('DELETE FROM trade_monitor WHERE monitor_id=?', [req.params.monitor_id] , function(err, result) {
			var res_json = {};
			res_json['action'] = 'delete';
			if( err != null){
				res_json['result'] = 'failed';
				res_json['code'] = err.code;
				res.status(500).json(res_json);
			}else{
				res_json['result'] = 'success';
				res_json['monitor_id'] = req.params.monitor_id;
				res.json(res_json);
			}
			

		});
		console.log(query.sql);
	});
});

/* ticks */
router.get('/tick', function(req, res, next) {
	mysql.getConnection(function(err, conn){
		conn.query("select tick_id,symbol,CONVERT_TZ(tick_time,'+08:00','+00:00') as tick_time,CONVERT_TZ(tick_time_msc,'+08:00','+00:00') as tick_time_msc, bid, ask, update_time from trade_last_tick", function(err, rows) {
			if( err != null){
				res.status(500).json("Database Error!");
			}
			res.json(rows);
			conn.release();
    	});
	});
});



module.exports = router;