SELECT * FROM trade.trade_monitor
where (start_time is null or start_time > now())
and (end_time is null or end_time < now())
and status = 1
