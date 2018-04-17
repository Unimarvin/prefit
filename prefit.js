(function($){

var ctx = {
  input : null,
  ineq : null,
  npsteps : []
};

function parse() {
  var val = $('#pf-input').val();
  cpnXml = $($.parseXML(val));
  // TODO: catch XML error

  // parse places
  places = [];
  cpnXml.find("place").each(function(i, p) {
    var text = $(p).children("text").text();
    var id = $(p).attr("id");
    places[places.length] =  { id :  id, text : text };
  });

  // parse transitions
  transitions = [];
  cpnXml.find("trans").each(function(i, t) {
    var text = $(t).children("text").text();
    var id = $(t).attr("id");
    transitions[transitions.length] =  { id :  id, text : text };
  });

  // parse Arcs
  transitions.forEach(function(t) {

    // post arcs for each transition
    var post = {};
    cpnXml.find("arc[orientation='TtoP'] transend[idref='"+t.id+"']").each(function(i,a) {
      var arc = $(a).parent();
      var place = $(arc).find("placeend").attr("idref");
      var text = $(arc).find("annot text").text();
      post[place] = text;
    });
    t.post = post;

    // pre arcs for each transition
    var pre = {};
    cpnXml.find("arc[orientation='PtoT'] transend[idref='"+t.id+"']").each(function(i,a) {
      var arc = $(a).parent();
      var place = $(arc).find("placeend").attr("idref");
      var text = $(arc).find("annot text").text();
      pre[place] = text;
    });
    t.pre = pre;
  });
  
  // TODO: sanity checks?
  ctx.input = { places : places, transitions : transitions };
} 

function showOptionDialog(callback) {
  // read from context
  var places = ctx.input.places;

  // create modal with option table
  s = '<table class="table table-striped">';
  var curOption = "";
  for(var i=0;i<places.length;++i) {
    var id = places[i].id;
    var text = places[i].text;
    curOption = "";
    curOption += '<tr><th>';
    curOption += text + "&nbsp;&nbsp;<small>(" + id +")</small>:</th><td>";
    curOption += '<div class="btn-group" data-toggle="buttons">';
    curOption += '<label class="btn active">';
    curOption += '<input type="radio" name="'+id+'" id="ignore" autocomplete="off" checked>';
    curOption += ' ignore</label>';
    curOption += '<label class="btn btn-primary">';
    curOption += '<input class="pf-opt-minus" type="radio" name="'+id+'" autocomplete="off">';
    curOption += 'foreign  </label>';
    curOption += '<label class="btn btn-primary">';
    curOption += '<input class="pf-opt-plus" type="radio" name="'+id+'" autocomplete="off">';
    curOption += ' primary  </label></div></td>';
    curOption += '<td><label for="'+id+'-prj">project to:</label>';
    curOption += '<input type="number" class="form-control projectInput" value="1" style="width:100px;" data-id="'+id+'"></td></tr>';
    s += curOption;
  }
  s += "</table>";
  s += '<button class="btn pull-right btn-success" id="opt-ok">Compute Non-Preserving Steps &gt;&gt;</button>';
  s += '<div style="clear:both">&nbsp;</div>';
  $('#optionModal .modal-body').html(s);

  // now define return function
  $('#opt-ok').click(function(){
    
    // read plus/minus and prj
    minus = [];
    plus = [];
    prj = {};

    $('#optionModal .modal-body .pf-opt-minus:checked').each(function(i,cur) {
      minus[minus.length] = $(cur).attr("name");
      var prjVal = $( '#' + $(cur).attr('name') + '-prj').val();
      prj[$(cur).attr("name")] = prjVal;
    });
    $('#optionModal .modal-body .pf-opt-plus:checked').each(function(i,cur) {
      plus[plus.length] = $(cur).attr("name");
    });

    // read projection values
    var project = {};
    $('#optionModal .modal-body input.projectInput').each(function(i, cur) {
      var id = $(cur).data("id");
      project[id] = $(cur).val();
    });

    // TODO: sanity checks
    // 1) is ineq mixed??

    // write result to context
    ctx.ineq = { minus: minus, plus:plus, projection:project };

    $('#optionModal').modal('hide');
    
    callback();
  });
  
  // show modal
  $('#optionModal').modal({backdrop: 'static', keyboard:false});
}

function projectTerm(term,place) {
  if(!term) return undefined;
  var prjTo = ctx.ineq.projection[place];
  var re = /\((\w+,\s*)*(\w+)\s*\)\s*/;
  if(term.match(re)) {
    var trim = RegExp['$'+prjTo].replace(/(^,)|(,$)/g, "")
    return trim;
  } else {
    return term;
  }
}

function compute() {

  // TODO: some sanity checks

  ctx.npsteps = [];
  ctx.input.transitions.some(function(t) {
    var haveToCheck = false;
    // check for post-minus arcs
    ctx.ineq.plus.some(function(plus) {
      if(t.pre[plus]) {
         haveToCheck = true;
         return true;
      }
    });
    // check for pre-plus arcs
    if(!haveToCheck) {
      ctx.ineq.minus.some(function(minus) {
        if(t.post[minus]) {
           haveToCheck = true;
           return true;
        }
      });
    }
    // only check if necessary
    if(haveToCheck) {
        checkTransition(t);
    }
  });
  console.log(ctx);
}

function checkTransition(t) {
  
  // go through all  terms, compute delta
  var terms = {};
  ctx.ineq.plus.forEach(function(p) {
    var prjPreTerm = projectTerm(t.pre[p], p);
    if(prjPreTerm && !terms[prjPreTerm]) {
      terms[prjPreTerm] = 0;
    }
    var prjPostTerm = projectTerm(t.post[p], p);
    if(prjPostTerm && !terms[prjPostTerm]) {
      terms[prjPostTerm] = 0;
    }
    if(prjPreTerm) {
      terms[prjPreTerm]--;
    }
    if(prjPostTerm) {
      terms[prjPostTerm]++;
    }
  });
  ctx.ineq.minus.forEach(function(p) {
    var prjPreTerm = projectTerm(t.pre[p], p);
    if(prjPreTerm && !terms[prjPreTerm]) {
      terms[prjPreTerm] = 0;
    }
    var prjPostTerm = projectTerm(t.post[p], p);
    if(prjPostTerm && !terms[prjPostTerm]) {
      terms[prjPostTerm] = 0;
    }
    if(prjPreTerm) {
      terms[prjPreTerm]++;
    }
    if(prjPostTerm) {
      terms[prjPostTerm]--;
    }
  });

  for(term in terms) {
    if(terms[term] < 0) {
      ctx.npsteps[ctx.npsteps.length] = { transition : t, term : term };
    }
  }

  if(!ctx.toCheck) ctx.toCheck = [];
  ctx.toCheck[ctx.toCheck.length] = t;
}

function showResult() {
  var npsteps = ctx.npsteps;

  if(npsteps.length == 0) {
    $('#validModal').modal();
  }
  else {
    // clean potential old rows
    $('#npsteps-table .removeRow').remove();
    npsteps.forEach(function(step) {
      var tname = step.transition.text + ' <small>('+step.transition.id+')</small>';
  
      // check precon, if satisfying
      var t = step.transition;
      var terms = {};
      ctx.ineq.plus.forEach(function(p) {
        var prjPreTerm = projectTerm(t.pre[p], p);
        if(prjPreTerm && !terms[prjPreTerm]) {
          terms[prjPreTerm] = 0;
        }
        if(prjPreTerm) {
          terms[prjPreTerm]++;
        }
      });
      ctx.ineq.minus.forEach(function(p) {
        var prjPreTerm = projectTerm(t.pre[p], p);
        if(prjPreTerm && !terms[prjPreTerm]) {
          terms[prjPreTerm] = 0;
        }
        if(prjPreTerm) {
          terms[prjPreTerm]--;
        }
      });

      // compute needed fixes
      // these will be added to pre condition
      var fix = {};
      var fixNeeded = false;
      for(term in terms) {
        if(terms[term] < 0) {
          fixNeeded = true;
          fix[term] = -terms[term];
        }
      }

      // convert transition to pre/post condition
      var preCondition = {};
      var postCondition = {};

      for(id in step.transition.pre) {
        preCondition[id] = {};
        preCondition[id][step.transition.pre[id]] = 1;
      }
      for(id in step.transition.post) {
        postCondition[id] = {};
        postCondition[id][step.transition.post[id]] = 1;
      }
      // now add fixes to preCondition
      // first compute fix
      // simply take first "plus" place
      var firstP = ctx.ineq.plus[0];
      var posPrj = ctx.ineq.projection[firstP]-0;
      function makeTerm(t) {
         if(posPrj == 1) return t;
         var r = "(";
         for(var i=0; i < posPrj; ++i) {
           r += '_, ';
         }
         return r + t + ")";
      }
      if(!preCondition[firstP]) {
        preCondition[firstP] = {};
      }
      for(term in fix) {
        preCondition[firstP][makeTerm(term)] = fix[term];
      }

      // if not:
      //    compute delta for satisfaction
      //    add pre conditions such that satisfying
      // display step

     function conditionToTable(c) {
        var r = '<table class="table table-hover">';
        for(p in c) {
          if($.isEmptyObject(c[p])) continue;

          // get place name
          var placeName = p;
          for(place in ctx.input.places) {
             if(ctx.input.places[place].id == p) {
                placeName = ctx.input.places[place].text; // + '<small>(' + p + ')</small>';
             }
          }

          // show term list as multiset
          var multiset = '[ ';
          for(term in c[p]) {
            for(var i=0; i< c[p][term]; ++i) {
              multiset+= term + ', ';
            }
          }
          multiset = multiset.substring(0, multiset.length - 2);
          multiset += ' ]';
          r += '<tr><th>'+placeName+':</th><td>' + multiset + '</td></tr>';
        }
        r += '</table>';
        return r;
     }
   
      var preConTab = conditionToTable(preCondition);
      var postConTab = conditionToTable(postCondition);
   
      // create output
      var row = '<tr class="removeRow"><td>'+tname+'</td>';
      row += '<td>'+preConTab+'</td><td>'+postConTab+'</td></tr>';
      $('#npsteps-table').append(row);
    });
    
    // number of counterexamples
    $('#nonpsteps').text(npsteps.length);
    $('#npstepsModal').modal();
  }
}

function init() {
  // onclick perform the computation
  $('#pf-parse').click(function() { 
    parse();
    showOptionDialog(function() {
      compute();
      showResult();
    });
  });
} 

// start with initialization
$(init);

})(jQuery);
