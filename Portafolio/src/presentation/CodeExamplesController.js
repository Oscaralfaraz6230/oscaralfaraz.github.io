export class CodeExamplesController {
  constructor({ getCodeExamples, root = document }) {
    this.examples = getCodeExamples.execute();
    this.root = root;
    this.buttons = [...root.querySelectorAll('[data-code-example]')];
    this.filename = root.getElementById('code-filename');
    this.language = root.getElementById('code-language');
    this.code = root.getElementById('code-content');

    this.buttons.forEach(button => {
      button.addEventListener('click', () => this.show(button.dataset.codeExample));
    });
    this.show('react');
  }

  show(exampleName) {
    const selected = this.examples[exampleName];
    const activeClass = 'px-4 py-1.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 transition-all font-medium';
    const inactiveClass = 'px-4 py-1.5 rounded-full text-slate-400 hover:text-white transition-all font-medium';

    this.buttons.forEach(button => {
      button.className = button.dataset.codeExample === exampleName ? activeClass : inactiveClass;
    });
    this.filename.textContent = selected.fileName;
    this.language.textContent = selected.language;
    this.code.textContent = selected.source;
  }
}