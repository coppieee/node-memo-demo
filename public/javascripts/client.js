jQuery(function($) {
	"use strict";
	var socket = io.connect('http://'+location.host + '/');
	
	//createイベントを受信した時、html上にメモを作成する。
	socket.on('create',function(memoData){
		memoData.forEach(function(data){
			createMemo(data);
		});
	});
	//update-textイベントを受信した時、メモのテキストを更新する。
	socket.on('update-text',function(data){
		$('#'+data._id).find('.text').val(data.text);
	});
	//moveイベントを受信した時、メモの位置をアニメーションさせる。
	socket.on('move',function(data){
		$('#'+data._id).animate(data.position);
	});
	//removeイベントを受信した時、メモを削除する。
	socket.on('remove',function(data){
		removeMemo(data._id);
	});
	//createボタンが押された時
	$('#create-button').click(function(){
		var memoData = {
			text:''
			,position:{
				left:50
				,top:200
			}
		};
		socket.emit('create',memoData);
	});
	//memoDataを元にメモをhtml上に生成
	//memoDataは{_id:String,text:String,position:{left:Number,top:Number}}の型
	var createMemo = function(memoData){
		var id = memoData._id;
		var old = $('#'+id);
		if(old.length !== 0){
			return;
		}
		
		var element =
			$('<div class="memo"/>')
			.attr('id',id)
			.append($('<div class="settings">')
				.append('<a href="#" class="remove-button">☓</a>')
			)
			.append($('<div/>')
				.append($('<textarea class="text"/>')
					.val(memoData.text)
				)
			).css({
				left:memoData.position.left
				,top:memoData.position.top
			});
		element.hide().fadeIn();
		$('#field').append(element);
		
		//メモをドラッグした時、moveイベントを送る。
		//(jQuery UIを使用)
		element.draggable({stop:function(e,ui){
			var pos = {
				left:ui.position.left
				,top:ui.position.top
			};
			socket.emit('move',{_id:id,position:pos});
		}});
		//テキストが変更された場合、update-textイベントを送る。
		var $text = element.find('.text');
		$text.keyup(function(){
			socket.emit('update-text',{_id:id,text:$text.val()});
		});
		//☓ボタンを押した場合removeイベントを送る
		element.find('.remove-button').click(function(){
			socket.emit('remove',{_id:id});
			removeMemo(id);
			return false;
		});
	};
	var removeMemo = function(id){
		$('#'+id).fadeOut('fast').queue(function(){
			$(this).remove();
		});
	};
});