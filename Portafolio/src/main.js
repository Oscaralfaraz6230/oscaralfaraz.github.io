import { GetCodeExamples } from './application/use-cases/GetCodeExamples.js';
import { StaticCodeExamplesRepository } from './infrastructure/adapters/StaticCodeExamplesRepository.js';
import { createSpaceScene } from './infrastructure/adapters/ThreeSpaceScene.js';
import { CodeExamplesController } from './presentation/CodeExamplesController.js';

lucide.createIcons();

const codeExamplesRepository = new StaticCodeExamplesRepository();
const getCodeExamples = new GetCodeExamples(codeExamplesRepository);
new CodeExamplesController({ getCodeExamples });

document.querySelectorAll('.cosmos-card').forEach(card => {
  card.addEventListener('mousemove', event => {
    const bounds = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${event.clientX - bounds.left}px`);
    card.style.setProperty('--mouse-y', `${event.clientY - bounds.top}px`);
  });
});

createSpaceScene(document.getElementById('space-canvas'), window.THREE);