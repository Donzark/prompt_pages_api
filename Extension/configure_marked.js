// Configure Marked to use highlight.js for code blocks
marked.setOptions({
  highlight: function (code, lang) {
    // Check if hljs is loaded before using it
    if (window.hljs) {
      return hljs.highlightAuto(code).value;
    }
    return code; // fallback
  },
});
