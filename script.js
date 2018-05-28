var EXAMPLE = [
  '- [x] this is a complete item',
  '- [ ] this is an incomplete item',
  '- [ ] a bigger project',
  '  - [ ] first subtask',
  '  - [ ] follow up subtask',
  '  - [ ] final subtask',
  '- [ ] a separate task',
].join('\n');

var $html;
var $md;
var $history;

var renderer = new marked.Renderer();
var linkRenderer = renderer.link;
renderer.link = function (href, title, text) {
    const html = linkRenderer.call(renderer, href, title, text);
    return html.replace(/^<a /, '<a target="_blank" ');
};

$(function() {
  autosize($('textarea'));

  $html = $('.js-html');
  $md = $('.js-md');
  $history = $('.js-history');

  $md.val(loadLatestHistory());
  showHTML();

  if (location.hash) {
    $('a[href="' + location.hash + '"]').tab('show')
  } else {
    location.hash = '#show'
  }
});

$(document).on('input', '.js-md', _.throttle(function() {
  showHTML();
  addHistory();
}, 1000));

$(document).on('change', '.js-checkbox', function() {
  var $this = $(this);
  var index = $this.data('index');
  var checked = $this.prop('checked');
  var i = -1;
  var replaced = $md.val().replace(/\[(:? |x)]/g, function(replacement) {
    i++;
    if (i != index) {
      return replacement;
    }
    return checked ? '[x]' : '[ ]';
  });
  $md.val(replaced);
  addHistory();
});

$(document).on('shown.bs.tab', function(e) {
  autosize.update($md.get(0));
  var tab = $(e.target).attr('href')
  location.hash = tab;

  if (/#edit/.test(tab)) {
    $('textarea').focus();
    $('html, body').scrollTop(0);
  } else if (/#history/.test(tab)) {
    showHistories();
    $('html, body').scrollTop(0);
  }
  return false;
});

function showHTML() {
  var rendered = renderMarkdown($md.val(), false);
  $html.html(rendered);
}

function showHistories() {
  var histories = loadHistories();
  var fragment = document.createDocumentFragment();
  for (var i = 0; i < histories.length - 1; i++) {
    var history = histories[i];
    var newText = history.content;
    var baseText = histories[i + 1].content;
    var timestamp = formatTime(new Date(history.timestamp));
    var diff = diffUsingJS(baseText, newText)
    var $div = $('<div class="mb-3"><h5>' + timestamp + '</h5></div>');
    $div.append(diff);
    fragment.appendChild($div.get(0));
  }
  $history.html(fragment);
}

function renderMarkdown(markdown, readonly) {
  var rendered = marked(markdown, { renderer });
  var i = 0;
  var replaced = rendered.replace(/<li>\[(:? |x)]/g, function(replacement) {
    var checked = /x/.test(replacement) ? ' checked ' : '';
    var disabled = readonly ? ' disabled ' : '';
    var checkbox = '<li class="checkbox-container"><input type="checkbox" '+ checked + disabled + 'class="js-checkbox" data-index="' + i + '">';
    i++;
    return checkbox;
  });
  return replaced;
}

function addHistory() {
  var histories = loadHistories();
  histories.unshift({
    timestamp: new Date().getTime(),
    content: $md.val()
  });
  if (histories.length > 100) {
    histories.pop();
  }
  localStorage.histories = JSON.stringify(histories);
}

function loadHistories() {
  return JSON.parse(localStorage.histories || '[]');
}

function loadLatestHistory() {
  var histories = loadHistories();
  if (histories.length) {
    return histories[0].content;
  } else {
    return EXAMPLE;
  }
}

function formatTime(date) {
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDay();
  var hour = date.getHours();
  var min = date.getMinutes();
  var sec = date.getSeconds();
  return year + '-' + padZero(month) + '-' + padZero(day) + ' ' + padZero(hour) + ':' + padZero(min) + ':' + padZero(sec);
}

function padZero(num) {
  return ('0' + num).slice(-2);
}

function diffUsingJS(baseText, newText) {
  var baseLines = difflib.stringAsLines(baseText);
  var newLines = difflib.stringAsLines(newText);
  var matcher = new difflib.SequenceMatcher(baseLines, newLines);

  var opcodes = matcher.get_opcodes();

  return diffview.buildView({
      baseTextLines: baseLines,
      newTextLines: newLines,
      opcodes: opcodes,
      baseTextName: 'Base Text',
      newTextName: 'New Text',
      contextSize: null,
      viewType: 0
  });
}

Mousetrap.bindGlobal('command+s', function() {
  if (location.hash != '#edit') {
    return true;
  }
  addHistory();
  showHTML();
  $('a[href="#show"]').tab('show')
  return false;
});

Mousetrap.bind('e', function() {
  if (location.hash != '#show') {
    return true;
  }
  $('a[href="#edit"]').tab('show')
  return false;
});
