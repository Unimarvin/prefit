var fs = require('fs');

// ignore projection
function projectTerm(x,y) { return x; }

function checkTransition(ineq, t) {
  
  // go through all  terms, compute delta
  var terms = {};
  ineq.plus.forEach(function(p) {
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
  ineq.minus.forEach(function(p) {
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
       return true;
    //  ctx.npsteps[ctx.npsteps.length] = { transition : t, term : term };
    }
  }

  // if(!ctx.toCheck) ctx.toCheck = [];
  // ctx.toCheck[ctx.toCheck.length] = t;
  return false;
}

function runTest(noTerms, noPlaces) {
  // var noTerms = 10;

  // var noPlaces = 1000000;
  var amPrePlaces = 0.5;
  
  var chP = Math.random();
  var chM = Math.random();
  if(chP > chM) {
    var swap = chP;
    chP = chM;
    chM = swap;
  }

  var i;
  
  // create terms
  var terms = [];
  for(i=0;i<noTerms;++i) {
    terms[i] = "T"+i;
  }

  // create transition and ineq
  var bound = Math.round(noPlaces * amPrePlaces);
  var transition = { pre: {}, post:{} };
  var ineq = { minus: [], plus: [] };
  var cond = transition.pre;
  for(i=0;i<noPlaces; ++i) {
    var pName ="P"+i;
    if(i===bound) {
       cond = transition.post;
    }
    cond[pName] = terms[getRandomInt(noTerms)];
    var rand = Math.random(); //getRandomInt(3);
    if(rand > chM) continue;
    else if(rand > chP) ineq.plus.push(pName);
    else ineq.minus.push(pName);
  }
  // console.log(transition);
  // console.log(ineq);
  
  //console.time("x:<"+noPlaces+'>');
  var start = new Date().getTime();
  checkTransition(ineq, transition);
  var end = new Date().getTime();
  return end-start;
  //console.timeEnd("x:<"+noPlaces+'>');
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function testSeq(noTerms) {
  var s = '';
  for(var i = 990; i<1000; ++i) {
    var a=runTest(noTerms, i*i);
    var b=runTest(noTerms, i*i);
    var c=runTest(noTerms, i*i);
    var d=runTest(noTerms, i*i);
    var e=runTest(noTerms, i*i);
    var f=runTest(noTerms, i*i);
    var g=runTest(noTerms, i*i);
    s = s + i*i + " " + Math.max(a,b,c,d,e,f,g) + '\n';
    //if(i % 10 == 0) {
//        console.log(noTerms + ' -- ' + i*i);
    //}
  }
  fs.writeFile("draw"+noTerms, s);
}

testSeq(1);
testSeq(100);
testSeq(500);
testSeq(20000);
testSeq(1000000);

function maxRun()
{
  var max =0;
  var s='';
  for(var i=0;i<1000;++i) {
    var cur = runTest(500, 500000);
    //if(cur > max) max = cur;
    s += '1 ' + cur + '\n';
    //if(i%10 == 9) console.log(i + ' - ' + max);
  }
  console.log(max);
  fs.writeFile("boxplot", s);
}
maxRun();
