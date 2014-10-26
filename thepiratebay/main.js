/********************* engine config *************************
**************************************************************/

var tpb = {};
tpb.engine_name = 'Thepiratebay';
tpb.type="video";

/********************* Node modules *************************/

var http = require('http');
var $ = require('jquery');
var path = require('path');
var os = require('os');
var i18n = require("i18n");
var fs = require('fs');
var piratebay = require('thepiratebay');
var _ = i18n.__;

/****************************/

// module global vars
var searchType = 'search';

// init module
tpb.init = function(gui,ht5) {
	$('#pagination').hide();
    tpb.gui = ht5;
    loadEngine();
    //play videos
    $(ht5.document).off('click','.preload_tpb_torrent');
    $(ht5.document).on('click','.preload_tpb_torrent',function(e){
        e.preventDefault();
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        var link = obj.link;
        var id = ((Math.random() * 1e6) | 0);
		$('.highlight').removeClass('highlight well');
		$(this).closest('li').addClass('highlight well');
        $.get(link, function(res) {
            var title = $("#title", res).html();
            var table = $(".nfo", res).html();
            var img = 'http:'+$(".torpicture", res).find('img').attr('src');
            var showImg = 'block';
            if (img === "http:undefined") {
				img='';
				showImg = 'none';
			}
            var name = obj.title;
            obj.torrent = obj.magnet;
            
            $('#fbxMsg').empty();
            $('#fbxMsg').append('<div id="fbxMsg_header"><h3>'+obj.title+'</h3><a href="#" id="closePreview">X</a></div><div id="fbxMsg_downloads" class="well"></div><div class="nano"><div id="fbxMsg_content" class="nano-content"></div></div>');
            $('#preloadTorrent').remove();
			$('.mejs-overlay-button').hide();
            $('.download-torrent').remove();
            // add play button
			$('#fbxMsg_downloads').append('<button type="button" id="tpb_play_'+id+'" data="" class="play_tpb_torrent btn btn-success" style="margin-right:20px;"> \
											<span class="glyphicon glyphicon-play-circle"><span class="fbxMsg_glyphText">'+_("Start playing")+'</span></span>\
										  </button>');
			$('#tpb_play_'+id).attr('data',encodeURIComponent(JSON.stringify(obj)));
			// downloads buttons
			$('#fbxMsg_downloads').append('<button type="button" class="download_tpb_torrentFile downloadText btn btn-info" href="'+obj.torrent+'" id="tpb_downlink_'+obj.id+'" data="'+encodeURIComponent(JSON.stringify(obj))+'" title="'+ _("Download")+'"><span class="glyphicon glyphicon-download"><span class="fbxMsg_glyphText">'+_("Download")+'</span></span></button>');
			if(tpb.gui.freeboxAvailable) {
				$('#fbxMsg_downloads').append('<button type="button"  href="'+obj.torrent+'" class="download_tpb_torrentFile_fbx downloadText btn btn-info" id="tpb_downlinkFbx_'+obj.id+'" data="'+encodeURIComponent(JSON.stringify(obj))+'" title="'+ _("Download")+'"><span class="glyphicon glyphicon-download-alt"><span class="fbxMsg_glyphText">'+_("Télécharger avec freebox")+'</span></span></button>');
			}
			// clean preview
			$('#fbxMsg_content').append('<div><img src="'+img+'"style="margin:0 10px 10px 0;display:'+showImg+';float:left;width:150px;height:200px;" />'+table+'</div>"');
			// show
            $('#fbxMsg').slideDown('slow',function() { setTimeout(function() {t411.gui.updateScroller() },1000); $('#fbxMsg_content a').css('color','black') });
        })
    });
    
    $(ht5.document).off('click','.play_tpb_torrent');
    $(ht5.document).on('click','.play_tpb_torrent',function(e){
        e.preventDefault();
        var obj = JSON.parse(decodeURIComponent($(this).attr("data")));
        tpb.gui.getTorrent(obj.torrent);
        $('#fbxMsg').slideUp();
        $('#playerToggle')[0].click();
    });
    
    $(ht5.document).off('click','.download_tpb_torrentFile');
    $(ht5.document).on('click','.download_tpb_torrentFile',function(e){
        e.preventDefault();
        console.log('download torrent clicked')
        tpb.gui.getAuthTorrent($(this).attr("href"),false,false);
    });
    
    $(ht5.document).off('click','.download_tpb_torrentFile_fbx');
    $(ht5.document).on('click','.download_tpb_torrentFile_fbx',function(e){
        e.preventDefault();
        console.log('download torrent clicked')
        tpb.gui.getAuthTorrent($(this).attr("href"),false,true);
    });
}

function loadEngine() {
/********************* Configure locales *********************/
var localeList = ['en', 'fr'];
i18n.configure({
	defaultLocale: 'en',
    locales:localeList,
    directory: tpb.gui.pluginsDir + 'thepiratebay/locales',
    updateFiles: true
});

if ($.inArray(tpb.gui.settings.locale, localeList) >-1) {
	console.log('Loading thepiratebay engine with locale' + tpb.gui.settings.locale);
	i18n.setLocale(tpb.gui.settings.locale);
} else {
	i18n.setLocale('en');
}

// menus needed by the module and menu(s) loaded by default
tpb.menuEntries = ["orderBy"];
tpb.defaultMenus = ["orderBy"];
// orderBy filters and default entry
tpb.orderBy_filters = JSON.parse('{"'+_("Name desc")+'":"1","'+_("Name asc")+'":"2","'+_("Date desc")+'":"3","'+_("Date asc")+'":"4","'+_("Size desc")+'":"5","'+_("Size asc")+'":"6","'+_("Seeds desc")+'":"7","'+_("Seeds asc")+'":"8","'+_("Leeches desc")+'":"9","'+_("Leeches asc")+'":"10"}');
tpb.defaultOrderBy = '3';
// others params
tpb.has_related = false;
tpb.orderFiltersLoaded = false;
tpb.search_type_changed();

}

// search videos
tpb.search = function (query, options,gui) {
    tpb.gui = gui;
    tpb.itemsByPage = 30;
    videos_responses = new Array();
    var page = options.currentPage - 1;
    if(isNaN(page)) {
      page = 0;
      tpb.gui.current_page = 1;
    }
    var videos = {};
	piratebay.search(query, {
		category: '0',
		page: page,
		orderBy: options.orderBy
	}).then(function(results){
		if(results.length === 0 ) {
            $('#loading').hide();
            $("#search_results p").empty().append(_("No results found..."));
            $("#search").show();
            $("#pagination").hide();
            return;
        }
		tpb.itemsByPage = results[0].byPage;
		videos.totalItems = results[0].total;
		$("#search_results p").empty().append(_("%s results found for %s",videos.totalItems,query));
		analyseResults(videos,results);
	}).catch(function(err){
		$('#loading').hide();
        $("#search_results p").empty().append(_("No results found..."));
        $("#search").show();
        $("#pagination").hide();
        return;
	});
}

function analyseResults(videos,list) {
  videos.total = list.length;
  videos.items = [];
  $.each(list,function(index,item) {
      var infos = {};
      infos.link = item.link;
      infos.magnet = item.magnetLink;
      infos.title = item.name.replace(/\./g,' ');
      infos.size = item.size;
      infos.seeders = item.seeders;
      infos.leechers = item.leechers;
      infos.date = item.uploadDate;
      storeVideosInfos(videos,infos,index);
  });
}

tpb.search_type_changed = function() {
	if(tpb.orderFiltersLoaded === false) {
		$('#orderBy_select').empty();
        $.each(tpb.orderBy_filters, function(key, value){
			$('#orderBy_select').append('<option value="'+value+'">'+key+'</option>');
        });
        tpb.orderFiltersLoaded = true;
    }
	$("#searchTypesMenu_label").hide();
	$("#searchTypes_select").hide();
	$("#searchTypes_label").hide();
	$("#dateTypes_select").hide();
	$("#searchFilters_label").hide();
	$("#searchFilters_select").hide();
	$("#categories_label").hide();
	$("#categories_select").hide();
	$("#orderBy_label").show();
	$("#orderBy_select").show();
	$('#video_search_query').prop('disabled', false);
}

tpb.play_next = function() {
	try {
		$("li.highlight").next().find("a.start_media").click();
	} catch(err) {
		console.log("end of playlist reached");
		try {
			tpb.gui.changePage();
		} catch(err) {
			console.log('no more videos to play');
		}
	}
}

// store videos and return it in the right order...
function storeVideosInfos(video,infos,num) {
    video.items.push(infos); 
    videos_responses[num]=video;
    if (videos_responses.length == video.total) {
        print_videos(videos_responses);
        videos_responses = new Array();
    }
}


// functions
function print_videos(videos) {
	$('#loading').hide();
	$("#loading p").empty().append(_("Loading videos..."));
	$("#search").show();
	$("#pagination").show();
	
	// init pagination if needed
  var totalItems = parseInt(videos[0].totalItems);
  var totalPages = 1;
  if (totalItems > 30) {
    totalPages = Math.round(videos[0].totalItems / 30);
  }
  console.log(tpb.gui.current_page,totalItems,totalPages)
  if (tpb.gui.current_page === 1) {
		tpb.gui.init_pagination(totalItems,30,false,true,totalPages);
		$("#pagination").show();
  }
    
    // load videos in the playlist
	$('#items_container').empty().append('<ul id="tpb_cont" class="list" style="margin:0;"></ul>').show();
	$.each(videos[0].items,function(index,video) {
		video.id = ((Math.random() * 1e6) | 0);
		var html = '<li class="list-row" style="margin:0;padding:0;"> \
							<div class="mvthumb"> \
								<img src="images/tpb.gif" style="float:left;width:100px;height:100px;" /> \
							</div> \
							<div style="margin: 0 0 0 105px;"> \
								<a href="#" class="preload_tpb_torrent item-title" data="'+encodeURIComponent(JSON.stringify(video))+'">'+video.title+'</a> \
								<div class="item-info"> \
									<span><b>'+_("Uploaded: ")+'</b>'+video.date+'</span> \
								</div> \
								<div class="item-info"> \
									<span><b>'+_("Size: ")+'</b>'+video.size+'</span> \
								</div> \
								<div class="item-info"> \
									<span><b>'+_("Seeders: ")+'</b>'+video.seeders+'</span> \
								</div> \
								<div class="item-info"> \
									<span><b>'+_("Leechers: ")+'</b>'+video.leechers+'</span> \
								</div> \
							</div>  \
							<div id="torrent_'+video.id+'"> \
							</div> \
						</li>';					
		$("#tpb_cont").append(html);
	});
}

module.exports = tpb;
