"use strict";
var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('less-middleware')(path.join(__dirname, 'public')));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);

var server = http.createServer(app);

var mongoose = require('mongoose');

//localhostのnode_memo_demoのデータベースに接続。
var db = mongoose.connect('mongodb://localhost/node_memo_demo');
//メモのスキーマを宣言。
var MemoSchema = new mongoose.Schema({
	text:{type:String}
	,position:{
		left:Number
		,top:Number
	}
});
//スキーマからモデルを生成。
var Memo = db.model('memo',MemoSchema);

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var io = require('socket.io').listen(server);

io.sockets.on('connection',function(socket){
	Memo.find(function(err,items){
		if(err){console.log(err);}
		//接続したユーザにメモのデータを送る。
		socket.emit('create',items);
	});
	//createイベントを受信した時、データベースにMemoを追加する。
	//memoDataは{text:String,position:{left:Number,top:Number}}の型
	socket.on('create',function(memoData){
		//モデルからインスタンス作成
		var memo = new Memo(memoData);
		//データベースに保存。
		memo.save(function(err){
			if(err){ return; }
			socket.broadcast.json.emit('create',[memo]);
			socket.emit('create',[memo]);
		});
	});
	//moveイベントを受信した時、Memoのpositionをアップデートする。
	socket.on('move',function(data){
		//データベースから_idが一致するデータを検索
		Memo.findOne({_id:data._id},function(err,memo){
			if(err || memo === null){return;}
			memo.position = data.position;
			memo.save();
			//他のクライアントにイベントを伝えるためにbroadcastで送信する。
			socket.broadcast.json.emit('move',data);
		});
	});
	//update-textイベントを受信した時、Memoのtextをアップデートする。
	socket.on('update-text',function(data){
		Memo.findOne({_id:data._id},function(err,memo){
			if(err || memo === null){return;}
			memo.text = data.text;
			memo.save();
			socket.broadcast.json.emit('update-text',data);
		});
	});
	//removeイベントを受信した時、データベースから削除する。
	socket.on('remove',function(data){
		Memo.findOne({_id:data._id},function(err,memo){
			if(err || memo === null){return;}
			memo.remove();
			socket.broadcast.json.emit('remove',data);
		});
	});
});
