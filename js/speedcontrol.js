'use strict';
$(function () {

    var playerContainers = new Array(0);


    var speedcontrolBundle = 'nodecg-speedcontrol';
    // JQuery selector initialiation ###
    var $timerInfo = $('#timer');
    var $runnerInfoElements = $('div.runnerInfo');
    var $runnerTimerFinishedElements = $('.runnerTimerFinished')
    var $runnerTimerFinishedContainers = $('.runnerTimerFinishedContainer');
    var $runInformationSystem = $('#runInformationGameSystem');
    var $runInformationCategory = $('#runInformationGameCategory');
    var $runInformationEstimate = $('#runInformationGameEstimate');
    var $runInformationName = $('#runInformationGameName');
    var $twitchLogos = $('.twitchLogo');
    var $gameCaptures = $('.gameCapture');

    var $comingUpGame = $('#comingUpGame');
    var $comingUpCathegory = $('#comingUpCathegory');
    var $comingUpSystem = $('#comingUpSystem');
    var $comingUpPlayer = $('#comingUpPlayer');

    var $justMissedGame = $('#justMissedGame');
    var $justMissedCathegory = $('#justMissedCathegory');
    var $justMissedSystem = $('#justMissedSystem');
    var $justMissedPlayer = $('#justMissedPlayer');

    var currentTime = '';
    var displayTwitchforMilliseconds = 15000;
    var intervalToNextTwitchDisplay = 120000;
    var timeoutTwitch = null;
    var isInitialized = false;

    var fadedOut;

    // sceneID must be uniqe for this view, it's used in positioning of elements when using edit mode
    // if there are two views with the same sceneID all the elements will not have the correct positions
    var sceneID = $('html').attr('data-sceneid');

    var sceneIDReplicant = nodecg.Replicant("sceneID",speedcontrolBundle, {defaultValue: sceneID});
    sceneIDReplicant.on('change', function(oldValue, newValue) {

            // if( $('#window-container').css("display") != "none") {
            //     setTimeout(function() {this(oldValue, newValue)},500);
            //     return;
            //   }
                //
                if( oldValue == newValue )
                {
                  return;
                }
                sceneID = newValue;
                if( oldValue ) {
                toggleStylesheets(false, oldValue);
                }
                loadCSS(sceneID, "/graphics/nodecg-speedcontrol/css/editcss/"+sceneID+".css");
                toggleStylesheets(false, sceneID);
                toggleStylesheets(true, sceneID);
              //$('#window-container').fadeIn(1500);


    });

    // NodeCG Message subscription ###
    nodecg.listenFor("resetTime", resetAllPlayerTimers);
    nodecg.listenFor('timerReset', resetTimer);
    nodecg.listenFor('timerSplit', splitTimer);
    nodecg.listenFor("displayMarqueeInformation", displayMarquee);
    nodecg.listenFor("removeMarqueeInformation", removeMarquee);

    var runDataArrayReplicant = nodecg.Replicant("runDataArray",speedcontrolBundle);

    var stopWatchesReplicant = nodecg.Replicant('stopwatches',speedcontrolBundle);
    stopWatchesReplicant.on('change', function(oldVal, newVal) {
        if (!newVal) return;
        var time  = newVal[0].time || '88:88:88';
        if( oldVal )
        {
          $timerInfo.toggleClass('timer_'+oldVal[0].state,false);
        }
        $timerInfo.toggleClass('timer_'+newVal[0].state,true);
        setTime(time);
    });

    var runDataActiveRunReplicant = nodecg.Replicant("runDataActiveRun",speedcontrolBundle);
    runDataActiveRunReplicant.on("change", function (oldValue, newValue) {
        if(typeof newValue == 'undefined' || newValue == "") {
            return;
        }
        if(timeoutTwitch != null) {
            clearTimeout(timeoutTwitch);
        }
        console.log(newValue);

        $('#window-container').stop(true,false);
        $('#window-container').fadeOut(1000,function() {
        updatePlayerContainers(newValue.players.length);

        $runnerInfoElements.each( function( index, element ) {
            animation_setGameFieldAlternate($(this),getRunnerInformationName(newValue,index));
        });


        timeoutTwitch = setTimeout(displayTwitchInstead, 2000);

        updateGameCaptures(newValue.players.length, newValue.system);
        sceneIDReplicant.value = generateSceneID(newValue.players.length, getAspectRatioString( newValue.system));
        updateSceneFields(newValue);

        updateNextRun(newValue);
        $('#window-container').fadeIn(1000);
        });
      });


    function updatePlayerContainers(count) {
      var importNode = document.querySelector('link[rel="import"]').import;
      var template = importNode.querySelector('template');

      $('.playerContainer').remove();

      for( var i=1; i <= count; i++ ) {
        var player = document.importNode(template.content,true);
        player.querySelector('.playerContainer').setAttribute('id','player'+i+'Container');
        document.querySelector('#window-container').appendChild(player);
      }
      $runnerInfoElements = $('div.runnerInfo');
    }

    function updateNextRun(newValue) {
        var indexOfNextRun = findIndexInDataArrayOfRun(newValue, runDataArrayReplicant.value);
        var indexOfPrevRun = Number(indexOfNextRun) + Number(-1);
        var prevRun = undefined;

        if(indexOfPrevRun < 0) {
        }
        else {
            prevRun = runDataArrayReplicant.value[indexOfPrevRun];
        }

        updateMissedComingUp( prevRun, newValue);
    }
        function findIndexInDataArrayOfRun(run, runDataArray) {
        var indexOfRun = -1;
        $.each(runDataArray, function (index, value) {
            if(value.runID == run.runID) {
                indexOfRun = index;
            }
        });
        return indexOfRun;
    }

    function updateMissedComingUp(currentRun, nextRun) {
        changeComingUpRunInformation(nextRun);
        changeJustMissedRunInformation(currentRun);
    }

    // Replicant functions ###
    function changeComingUpRunInformation(runData) {
        var game = "END";
        var category = "";
        var system = "";

        if(typeof runData !== "undefined") {
            game = runData.game;
            category =  runData.category;
            system = runData.system;
        }

        animation_setGameField($comingUpGame,game);
        animation_setGameField($comingUpCathegory,category);
        animation_setGameField($comingUpSystem,system);
    }

    function changeJustMissedRunInformation(runData) {
        var game = "BEGIN";
        var category = "";
        var system = "";

        if(typeof runData !== "undefined") {
            game = runData.game;
            category =  runData.category;
            system = runData.system;
        }

        animation_setGameField($justMissedGame,game);
        animation_setGameField($justMissedCathegory,category);
        animation_setGameField($justMissedSystem,system);
    }

    function displayMarquee(text) {
        $('#informationMarquee').html(text);
        var tm = new TimelineMax({paused: true});
        tm.to($('#informationMarquee'), 1.0, {opacity: '1', height: "50px",  ease: Quad.easeOut },'0');
        tm.play();
    }

    function removeMarquee() {
        var tm = new TimelineMax({paused: true});
        tm.to($('#informationMarquee'), 1.0, {opacity: '0', height: "0px",  ease: Quad.easeOut },'0');
        tm.play();
    }

    var runDataActiveRunRunnerListReplicant = nodecg.Replicant("runDataActiveRunRunnerList",speedcontrolBundle);
    runDataActiveRunRunnerListReplicant.on("change", function (oldValue, newValue) {
        if(typeof newValue === 'undefined' || newValue == '') {
            return;
        }
        // updatePlayerContainers(newValue.length)
        //
        // $runnerInfoElements.each( function( index, element ) {
        //     animation_setGameFieldAlternate($(this),getRunnerInformationName(newValue,index));
        // });
        //
        // if(timeoutTwitch != null) {
        //     clearTimeout(timeoutTwitch);
        // }
        //
        // timeoutTwitch = setTimeout(displayTwitchInstead, 2000);
    });



    function toggleStylesheets(enable, title) {

      $('link[title="'+title+'"]').each( function( index, element) {
        element.disabled = !enable;
      });

      /*setTimeout( function() {
        toggleStylesheets(!enable,title);
      },5000);*/
    }
    setTimeout(function() { toggleStylesheets(true,'intermission');}, 5000);
    // Replicant functions ###

    // Changes the Game information text from the replicant, such as System, Category, Estimate and Game name
    function updateSceneFields(runData) {
        var runInfoGameName = runData.game;
        var runInfoGameEstimate = runData.estimate;
        var runInfoGameSystem = runData.system;
        var runInfoGameCategory = runData.category;



        animation_setGameField($runInformationSystem,runInfoGameSystem);
        animation_setGameField($runInformationCategory,runInfoGameCategory);
        animation_setGameField($runInformationEstimate,runInfoGameEstimate);
        animation_setGameField($runInformationName,runInfoGameName);
    }

    // Sets the current time of the timer.
    function setTime(timeHTML) {
        $timerInfo.html(timeHTML);
        currentTime = timeHTML;
    }

    // Gets the runner with index 'index' in the runnerarray's nickname from the rundata Replicant
    function getRunnerInformationName(runnerDataArray, index) {
        if(typeof runnerDataArray[index] === 'undefined') {
            console.log("Player nonexistant!");
            return "";
        }
        return runnerDataArray[index].names.international;
    }

    // Gets the runner with index 'index' in the runnerarray's twitch URL from the rundata Replicant
    function getRunnerInformationTwitch(runnerDataArray, index) {
        if(typeof runnerDataArray[index] === 'undefined') {
            console.log("Player nonexistant!");
            return "";
        }

        var twitchUrl = "";
        if (runnerDataArray[index].twitch != null &&
            runnerDataArray[index].twitch.uri != null) {
            twitchUrl = runnerDataArray[index].twitch.uri.replace("http://www.twitch.tv/","");
        }
        else {
            twitchUrl = "---";
        }
        return twitchUrl;
    }

    // Timer functions ###

    function resetTimer(index) {
        $runnerTimerFinishedElements.eq(index).html("");
        hideTimerFinished(index);
    }

    function resetAllPlayerTimers() {
        $runnerTimerFinishedElements.each( function( index, element) {
          $(this).html("");
          hideTimerFinished(index);
        });
    }

    function splitTimer(index) {
        $runnerTimerFinishedElements.eq(index).html(currentTime);
        animation_fadeInOpacity($runnerTimerFinishedContainers.eq(index));
    }

    function displayTwitchInstead() {
        var indexesToNotUpdate = [];
        $runnerInfoElements.each(function(index,element) {
            if(getRunnerInformationTwitch(runDataActiveRunRunnerListReplicant.value,index) == '---') {
                indexesToNotUpdate.push(index);
            }
            else {
                animation_setGameFieldAlternate($(this), getRunnerInformationTwitch(runDataActiveRunRunnerListReplicant.value, index));
            }
        });

        var tm = new TimelineMax({paused: true});
        $twitchLogos.each( function(index, element) {
            if($.inArray(index, indexesToNotUpdate) == -1) {
                animation_showZoomIn($(this));
            }
        });

        tm.play();
        timeoutTwitch = setTimeout(hideTwitch,displayTwitchforMilliseconds);
    }

    function hideTwitch() {
        var indexesToNotUpdate = [];
        $runnerInfoElements.each( function(index,element) {
            if(getRunnerInformationTwitch(runDataActiveRunRunnerListReplicant.value,index) == '---') {
                indexesToNotUpdate.push(index);
            }
            else {
                animation_setGameFieldAlternate($(this), getRunnerInformationName(runDataActiveRunRunnerListReplicant.value, index));
            }
        });

        $twitchLogos.each( function(index, element) {
            if($.inArray(index, indexesToNotUpdate) == -1) {
                animation_hideZoomOut($(this));
            }
        });

        timeoutTwitch = setTimeout(displayTwitchInstead,intervalToNextTwitchDisplay);
    }

    function hideTimerFinished(index) {
        $runnerTimerFinishedContainers.eq(index).css("opacity","0");
    }

    function loadCSS (sceneID, href) {
        var cssLink = $("<link rel='alternate stylesheet' title='"+sceneID+"' type='text/css' href='"+href+"'>");
        $("head").append(cssLink);
    };

    function convertToTrueAspectRatio(aspectRatioString) {
        var numbers = aspectRatioString.split(':');
        var realNumber = Number(numbers[0])/Number(numbers[1]);
        return realNumber;
    }

    function addCssRule(rule, css) {
        css = JSON.stringify(css).replace(/"/g, "").replace(/,/g, ";");
        $("<style>").prop("type", "text/css").html(rule + css).appendTo("head");
    }

    function getAspectRatioString(input) {
        switch(input.toUpperCase()) {
            case 'GB':
            case 'GBC':
                return "10:9"
                break;
            case 'HD':
            case 'PC':
            case 'XBOXONE':
            case 'PS4':
            case 'PS3':
            case 'Wii U':
                return "16:9";
                break;
            case '3DSBottom':
            case 'SD':
            case 'DS':
            case 'NES':
            case 'SNES':
            case 'GENESIS':
            case 'MEGADRIVE':
            case 'MEGA DRIVE':
            case 'Super NES':
            case 'AMIGA':
            case 'PLAYSTATION':
            case 'XBOX':
            case 'GCN':
            case 'GAMECUBE':
                return "4:3";
                break;
            case '3DSTop':
                return "5:3";
                break;
            case 'SMS':
            case 'GBA':
                return "3:2";
                break;
            default:
                return input;

        }
    }

    function getAspectRatio(input) {
        return convertToTrueAspectRatio(getAspectRatioString(input));
    }


    //
    // Layout initialization (runs once when the overlay loads)
    //

    $runnerTimerFinishedElements.each( function( index, e ){
        hideTimerFinished(index);
    });

    $twitchLogos.each( function(index, element) {
        $(this).css('transform', 'scale(0)');
    });

    function generateSceneID(count, aspectRatio) {
      return count + "_" + aspectRatio.replace(':','-');
    }

    function updateGameCaptures(count, console_, aspectRatio ) {
      $('.gameCapture').remove();


      for( var i=1; i <= count; i++ ) {
          var capture = $(document.createElement('div'));
          capture.attr('id','gameCapture'+i);
          capture.attr('class',"gameCapture positionable");
          capture.attr("aspect-ratio", getAspectRatioString(aspectRatio ? aspectRatio : console_));
          $('#window-container').append(capture);
          capture.trigger("create");
      }



      // $('.gameCapture').each(function () {
      //     var aspectRatioMultiplier = getAspectRatio($(this).attr('aspect-ratio'));
      //     var height = 200;
      //     var width = height * aspectRatioMultiplier;
      //     $(this).css('width',width+"px");
      //     $(this).css('height',height+"px");
      //     // addCssRule("#"+$(this).attr('id'), {
      //     //     width: width+"px",
      //     //     height: height+"px"
      //     // });
      // });
    //  toggleStylesheets(false, sceneID);

      //  toggleStylesheets(false, sceneID);
      //  toggleStylesheets(true, sceneID);

    //   $('.gameCapture').each( function() {
    //     if( $(this).width() == 0 ) {
    //
    //         var capture = $(this);
    //         console.log(capture.width());
    //         var aspectRatioMultiplier = getAspectRatio(capture.attr('aspect-ratio'));
    //         var height = 200;
    //         var width = height * aspectRatioMultiplier;
    //         capture.css('width',width+"px");
    //         capture.css('height',height+"px");
    //     }
    // });
    }
});
