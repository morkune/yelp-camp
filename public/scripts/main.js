function initializeTextAreaListener() {
  const $textArea = $('textarea');

  if (!$textArea) {
    return;
  }

  $textArea
    .each(function () {
      this.setAttribute(
        'style',
        'height:' + this.scrollHeight + 'px;overflow-y:hidden;',
      );
    })
    .on('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
}

initializeTextAreaListener();
